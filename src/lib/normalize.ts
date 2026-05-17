// biome-ignore lint/suspicious/noMisleadingCharacterClass: stripping combining marks (U+0300–U+036F) is intentional NFD cleanup
const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(s: string): string {
  return s.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim();
}
