// Display helpers for table and card text; the Stebėjimai CSV uses `mpvName` too, so the file
// spells an MPV as the screen does (REGRESS-08).

const QUOTED_MPV = /^["„“”](.*)["“”]\s*MPV$/;

/** MPV names in Lithuanian quotes: '"Verybė" MPV' → '„Verybė“ MPV' (DATAVIZ-26). */
export function mpvName(name: string | null | undefined): string | null {
  if (!name) return name ?? null;
  const match = QUOTED_MPV.exec(name.trim());
  return match ? `„${match[1].trim()}“ MPV` : name;
}
