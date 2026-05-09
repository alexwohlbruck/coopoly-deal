// Shared drop-zone detection utilities.
// Used by both DragPeekHand (hand cards) and PropertySetDisplay (wildcard
// rearrangement) so the two drag systems target the same DOM zones.

/** Spec parsed from a [data-touch-drop] attribute on a drop zone. */
export type TouchDropSpec =
  | { kind: "bank" }
  | { kind: "set"; color: string }
  | { kind: "new-set" };

/**
 * Walk the elementsFromPoint z-stack to find the topmost element (or
 * ancestor) carrying a [data-touch-drop] attribute, and parse the spec.
 *
 * Uses `elementsFromPoint` (plural) so that overlay elements without
 * the attribute (e.g. the drag ghost at z-index 9999) don't block the
 * hit-test from reaching the actual drop zones beneath.
 */
export function findDropZoneAt(
  clientX: number,
  clientY: number,
): { el: HTMLElement; spec: TouchDropSpec } | null {
  const stack =
    typeof (document as unknown as { elementsFromPoint?: unknown })
      .elementsFromPoint === "function"
      ? (
          document as Document & {
            elementsFromPoint: (x: number, y: number) => Element[];
          }
        ).elementsFromPoint(clientX, clientY)
      : ([document.elementFromPoint(clientX, clientY)].filter(
          Boolean,
        ) as Element[]);
  for (const hit of stack) {
    let el: HTMLElement | null = hit as HTMLElement;
    while (el) {
      const raw = el.getAttribute?.("data-touch-drop");
      if (raw) {
        if (raw === "bank") return { el, spec: { kind: "bank" } };
        if (raw === "new-set") return { el, spec: { kind: "new-set" } };
        if (raw.startsWith("set:")) {
          return { el, spec: { kind: "set", color: raw.slice(4) } };
        }
        // Found a [data-touch-drop] but unknown spec — try the next
        // element down the stack rather than bailing.
        break;
      }
      el = el.parentElement;
    }
  }
  return null;
}

/**
 * Set the `data-touch-drop-active` attribute on the given drop-zone
 * element and clear it from the previously-active element.  CSS in
 * index.css provides the visual highlight when this attribute is present.
 */
export function setActiveDropZone(
  current: HTMLElement | null,
  next: HTMLElement | null,
): void {
  if (current === next) return;
  if (current) current.removeAttribute("data-touch-drop-active");
  if (next) next.setAttribute("data-touch-drop-active", "true");
}
