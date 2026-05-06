import { useSearchParams } from "react-router-dom";

export type ModalKind = "settings" | "rules" | "credits";

const VALID_MODALS: readonly ModalKind[] = ["settings", "rules", "credits"];

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

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    setSearchParams(next);
  };

  return { modal, open, close };
}
