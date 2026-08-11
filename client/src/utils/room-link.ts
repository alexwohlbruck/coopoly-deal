// Shared room-sharing helpers.
// The join URL lives here so the QR code and the copy button always
// encode the same link.

/** Deep link that drops the recipient straight into the join gate. */
export function getJoinUrl(roomCode: string): string {
  return `${window.location.origin}/join/${roomCode}`;
}

/**
 * Copies text to the clipboard. Uses the async Clipboard API where it's
 * available (secure contexts only) and falls back to a hidden textarea +
 * execCommand on http:// origins — LAN play over a bare IP is a normal
 * way to use this app, and there the Clipboard API is undefined.
 *
 * Returns false when both paths fail so callers can skip the
 * "Copied!" confirmation.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or a non-secure context that still exposes the
      // API — fall through to the legacy path.
    }
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    // Keep it off-screen and non-focusable-looking so the page doesn't jump.
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-9999px";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
