import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export type ModalKind = "settings" | "rules" | "credits" | "share" | "qr-scan";

const VALID_MODALS: readonly ModalKind[] = [
  "settings",
  "rules",
  "credits",
  "share",
  "qr-scan",
];

export function useModalParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("modal");
  const modal: ModalKind | null = VALID_MODALS.includes(raw as ModalKind)
    ? (raw as ModalKind)
    : null;

  const open = (kind: ModalKind) => {
    const next = new URLSearchParams(searchParams);
    next.set("modal", kind);
    setSearchParams(next);
  };

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!modal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modal, close]);

  return { modal, open, close };
}
