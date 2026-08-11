import type { ReactNode } from "react";
import { fmt, type Vars } from "./format";

const BOLD = /<b>(.*?)<\/b>/gs;

/**
 * Render a translated string with `{slots}` filled and `<b>…</b>` promoted to
 * `emphasis`. Returns a fragment, so it drops straight into a `<p>`.
 */
export function RichText({
  text,
  vars,
  emphasis,
}: {
  text: string;
  vars?: Vars;
  /** Wrapper for the emphasised run; defaults to a plain <strong>. */
  emphasis?: (children: ReactNode, key: number) => ReactNode;
}) {
  const filled = fmt(text, vars);
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of filled.matchAll(BOLD)) {
    const start = m.index ?? 0;
    if (start > last) parts.push(filled.slice(last, start));
    const inner = m[1];
    parts.push(emphasis ? emphasis(inner, key++) : <strong key={key++}>{inner}</strong>);
    last = start + m[0].length;
  }
  if (last < filled.length) parts.push(filled.slice(last));
  return <>{parts}</>;
}
