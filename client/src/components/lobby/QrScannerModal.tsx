import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X } from "lucide-react";
import { useI18n } from "../../i18n";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
}

/**
 * Extract a 6-digit room code from a scanned QR value.
 * Accepts:
 *   - Full URLs like https://coopoly.deal/join/123456
 *   - Bare 6-digit codes like "123456"
 */
function extractRoomCode(value: string): string | null {
  // Try URL path first: /join/123456
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/join\/(\d{6})$/);
    if (match) return match[1];
  } catch {
    // not a URL — fall through
  }

  // Try bare 6-digit code
  const bare = value.trim();
  if (/^\d{6}$/.test(bare)) return bare;

  return null;
}

export function QrScannerModal({
  isOpen,
  onClose,
  onCodeScanned,
}: QrScannerModalProps) {
  const { t } = useI18n();

  const handleScan = useCallback(
    (result: { rawValue: string }[]) => {
      if (!result.length) return;
      const code = extractRoomCode(result[0].rawValue);
      if (code) {
        onCodeScanned(code);
        onClose();
      }
    },
    [onCodeScanned, onClose],
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
          className="relative w-full max-w-sm"
          style={{
            background:
              "linear-gradient(180deg, rgba(28,22,20,0.95) 0%, rgba(16,10,8,0.98) 100%)",
            border: "1px solid rgba(245,234,208,0.12)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow:
              "0 24px 48px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 800,
                color: "#f5ead0",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {t.lobby.scanQrTitle ?? "Scan QR Code"}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
                color: "rgba(245,234,208,0.7)",
                display: "flex",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scanner */}
          <div
            style={{
              padding: "8px 20px 20px",
            }}
          >
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "#000",
                aspectRatio: "1",
              }}
            >
              <Scanner
                onScan={handleScan}
                formats={["qr_code"]}
                sound={false}
                components={{
                  torch: false,
                }}
                styles={{
                  container: {
                    width: "100%",
                    height: "100%",
                  },
                  video: {
                    objectFit: "cover",
                  },
                }}
              />
            </div>
            <p
              style={{
                marginTop: 12,
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "rgba(245,234,208,0.5)",
                textTransform: "uppercase",
              }}
            >
              {t.lobby.scanQrHint ?? "Point your camera at a room QR code"}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
