// Display helpers for table and card text; the Stebėjimai CSV uses `mpvName` too, so the file
// spells an MPV as the screen does (REGRESS-08).

const QUOTED_MPV = /^["„“”](.*)["“”]\s*MPV$/;

/**
 * MPV names in Lithuanian quotes: '"Verybė" MPV' → '„Verybė“ MPV' (DATAVIZ-26); with
 * `suffix: false` (a column already headed "MPV") → '„Verybė“' (CONTENT-16).
 */
export function mpvName(
  name: string | null | undefined,
  opts: { suffix?: boolean } = {},
): string | null {
  if (!name) return name ?? null;
  const match = QUOTED_MPV.exec(name.trim());
  if (!match) return name;
  return opts.suffix === false ? `„${match[1].trim()}“` : `„${match[1].trim()}“ MPV`;
}
