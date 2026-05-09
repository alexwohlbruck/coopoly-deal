import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface RoomQrCodeProps {
  roomCode: string;
  size?: number;
}

/**
 * Generates and displays a QR code linking to the join URL for a room.
 */
export function RoomQrCode({ roomCode, size = 160 }: RoomQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/join/${roomCode}`;
    QRCode.toDataURL(url, {
      width: size * 2, // 2x for retina
      margin: 2,
      color: {
        dark: "#f5ead0",
        light: "#00000000", // transparent background
      },
      errorCorrectionLevel: "M",
    }).then(setDataUrl);
  }, [roomCode, size]);

  if (!dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt={`QR code for room ${roomCode}`}
      width={size}
      height={size}
      style={{
        imageRendering: "pixelated",
        borderRadius: 8,
      }}
    />
  );
}
