// Display helpers for table and card text (display only: the CSV keeps the source strings).

const QUOTED_MPV = /^["„“”](.*)["“”]\s*MPV$/;

/** MPV names in Lithuanian quotes: '"Verybė" MPV' → '„Verybė“ MPV' (DATAVIZ-26). */
export function mpvName(name: string | null | undefined): string | null {
  if (!name) return name ?? null;
  const match = QUOTED_MPV.exec(name.trim());
  return match ? `„${match[1].trim()}“ MPV` : name;
}
