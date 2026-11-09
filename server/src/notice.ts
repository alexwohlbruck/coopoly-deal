import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ServerNotice } from "./models/types.ts";

/**
 * How long a notice sticks around past its scheduled moment before the server
 * drops it on its own.
 *
 * The banner is meant to be cleared by whatever performs the maintenance —
 * scripts/maintenance.sh does it once the new process answers. This is the
 * backstop for the other cases: maintenance called off, the announcement made
 * by hand and forgotten. Without it a cancelled window leaves every player
 * staring at "starting now" indefinitely.
 */
const GRACE_MS = 10 * 60 * 1000;

/** setTimeout truncates past this, firing immediately instead of far later. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Free-text notices are shown verbatim, so bound what one can be. */
export const MAX_MESSAGE_LENGTH = 200;

interface NoticeFile {
  version: number;
  notice: ServerNotice;
}

const NOTICE_FILE_VERSION = 1;

/**
 * The one banner every connected client sees, and the only piece of global
 * state the server broadcasts that isn't derived from a room.
 *
 * It is written to disk because the thing it announces is a restart: a notice
 * that lived only in memory would vanish at exactly the moment players need it
 * to explain what just happened.
 */
export class NoticeService {
  private notice: ServerNotice | null = null;
  private readonly subscribers = new Set<() => void>();
  private expiryTimer: Timer | null = null;

  /** Pass null to keep notices in memory only (tests). */
  constructor(private readonly path: string | null) {}

  /** Read back a notice written before the restart it was announcing. */
  load(): void {
    if (!this.path || !existsSync(this.path)) return;

    let parsed: NoticeFile | null = null;
    try {
      parsed = JSON.parse(readFileSync(this.path, "utf8")) as NoticeFile;
    } catch {
      console.warn("[notice] ignoring malformed notice file");
      this.erase();
      return;
    }

    if (parsed?.version !== NOTICE_FILE_VERSION || !isPlausibleNotice(parsed.notice)) {
      this.erase();
      return;
    }

    if (expiresAt(parsed.notice) <= Date.now()) {
      this.erase();
      return;
    }

    this.notice = parsed.notice;
    this.scheduleExpiry();
  }

  get(): ServerNotice | null {
    return this.notice;
  }

  set(notice: ServerNotice): void {
    this.notice = notice;
    if (this.path) {
      const file: NoticeFile = { version: NOTICE_FILE_VERSION, notice };
      mkdirSync(dirname(this.path), { recursive: true });
      // Write-then-rename, as with the room snapshot: a crash mid-write leaves
      // the previous notice rather than a truncated file.
      const tmp = `${this.path}.tmp`;
      writeFileSync(tmp, JSON.stringify(file));
      renameSync(tmp, this.path);
    }
    this.scheduleExpiry();
    this.notifyChange();
  }

  clear(): void {
    const had = this.notice !== null;
    this.notice = null;
    this.erase();
    if (had) this.notifyChange();
  }

  /** Called whenever the notice changes, so it can be pushed to clients. */
  subscribe(fn: () => void): void {
    this.subscribers.add(fn);
  }

  destroy(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    this.subscribers.clear();
  }

  private notifyChange(): void {
    for (const fn of this.subscribers) fn();
  }

  private erase(): void {
    if (!this.path) return;
    rmSync(this.path, { force: true });
    rmSync(`${this.path}.tmp`, { force: true });
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    if (!this.notice) return;

    const delay = expiresAt(this.notice) - Date.now();
    if (delay <= 0) {
      this.clear();
      return;
    }
    // A notice scheduled further out than setTimeout can express is left to
    // load() on a later boot — it cannot expire before then anyway.
    if (delay > MAX_TIMEOUT_MS) return;

    this.expiryTimer = setTimeout(() => this.clear(), delay);
    this.expiryTimer.unref?.();
  }
}

function isPlausibleNotice(notice: unknown): notice is ServerNotice {
  if (!notice || typeof notice !== "object") return false;
  const n = notice as Partial<ServerNotice>;
  if (typeof n.id !== "string" || !n.id) return false;
  if (n.kind !== "maintenance" && n.kind !== "custom") return false;
  if (typeof n.scheduledAt !== "number" || !Number.isFinite(n.scheduledAt)) return false;
  if (n.message != null && typeof n.message !== "string") return false;
  if (n.expiresAt != null && (typeof n.expiresAt !== "number" || !Number.isFinite(n.expiresAt))) return false;
  if (n.showCountdown != null && typeof n.showCountdown !== "boolean") return false;
  return true;
}

function expiresAt(notice: ServerNotice): number {
  return notice.expiresAt ?? notice.scheduledAt + GRACE_MS;
}
