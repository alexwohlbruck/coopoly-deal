import { useSearchParams } from "react-router-dom";

export type ModalKind = "settings" | "rules";

export function useModalParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("modal");
  const modal: ModalKind | null =
    raw === "settings" || raw === "rules" ? raw : null;

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
