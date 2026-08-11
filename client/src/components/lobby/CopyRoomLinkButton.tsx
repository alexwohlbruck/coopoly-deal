// Copy-the-join-link pill shown next to the room code in the waiting room.
// Copies the same URL the QR code encodes so a texted link works the same
// way as a scan. Flips to a "Copied!" state for a beat after a successful
// write; a failed write leaves the button untouched rather than lying.

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { SecondaryButton } from "../ui/Button";
import { useI18n } from "../../i18n";
import { copyToClipboard, getJoinUrl } from "../../utils/room-link";

const CONFIRM_MS = 1800;

interface CopyRoomLinkButtonProps {
  roomCode: string;
}

export function CopyRoomLinkButton({ roomCode }: CopyRoomLinkButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = () => {
    void copyToClipboard(getJoinUrl(roomCode)).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), CONFIRM_MS);
    });
  };

  return (
    <SecondaryButton
      onClick={handleCopy}
      size="sm"
      title={t.waiting.copyLinkHint}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        // Only override the button's own color while confirming — an
        // undefined color here would wipe out the base style.
        ...(copied ? { color: "#7adb88" } : {}),
      }}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? t.waiting.copied : t.waiting.copyLink}
    </SecondaryButton>
  );
}
