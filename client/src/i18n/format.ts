
/**
 * Interpolation for translated copy.
 *
 * The rules text used to be assembled in JSX — `Play <Hi>up to 3 cards</Hi>
 * from your hand.` That only works while the sentence is English: Hindi,
 * Tamil, Telugu and Urdu are verb-final, so a translator has to be able to
 * move the emphasised run anywhere in the sentence. So the whole sentence
 * lives in the locale file as one string, with `{name}` slots for dynamic
 * terms and `<b>…</b>` for the emphasis.
 *
 *   "Play <b>up to {n} cards</b> from your hand."
 *   "अपने हाथ से <b>ज़्यादा से ज़्यादा {n} कार्ड</b> खेलें।"
 */
export type Vars = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

/** Substitute `{name}` slots. Unknown slots are left as-is so a missing
 *  variable is visible in review rather than silently rendering "undefined". */
export function fmt(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Uppercase the first character — for languages that have case. Scripts
 *  without capitals (all the Indic ones, Arabic) are unaffected. */
export function capitalize(s: string): string {
  return s.replace(/^./, (c) => c.toUpperCase());
}
