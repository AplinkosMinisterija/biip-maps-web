// Choropleth classes of the hunting data hub (SPEC2 §6.3–§6.5, §8.5). Breaks are fixed
// per topic and metric (stored in the topic modules), so colours mean the same in every
// season. Five classes: < b1, b1–b2, b2–b3, b3–b4, ≥ b4.
import type { ChoroplethDef } from './types';

export type Palette = ChoroplethDef['palette'];

// Light → dark (§8.5); legend shows text labels next to every swatch.
export const PALETTES: Record<Palette, string[]> = {
  green: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
  blue: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
  orange: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
};
export const OUTLINE_COLOR = '#6b7280';
export const SELECTED_COLOR = '#111827';
export const ZERO_FILL = '#ffffff';

/** Class index 0…breaks.length of a value: the number of breaks ≤ value. */
export function classIndex(value: number, breaks: number[]) {
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i++;
  return i;
}

/** Fill colour of a value, or null when the value has no class (null, or 0 drawn white). */
export function classColor(
  value: number | null | undefined,
  breaks: number[],
  palette: Palette,
  zeroIsWhite = false,
): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (zeroIsWhite && value === 0) return ZERO_FILL;
  const colors = PALETTES[palette];
  return colors[Math.min(classIndex(value, breaks), colors.length - 1)];
}

export interface ClassLabelOptions {
  format?: (v: number) => string;
  // Integer counts: ranges end one below the next break ('3–5'), the last class reads '> 20'.
  integer?: boolean;
  // Integer counts with a separate zero class (damages): the first class starts here ('1–2').
  min?: number;
  // Last class as '> {b4 - 1}' instead of '≥ {b4}' (integer only).
  lastGreater?: boolean;
  unit?: string; // appended to every label ('%')
}

/**
 * Legend labels, one per class:
 * continuous [15, 19, 21, 24] → '< 15', '15–19', '19–21', '21–24', '≥ 24';
 * integer [40, 50, 60, 80] → '< 40', '40–49', '50–59', '60–79', '≥ 80';
 * integer { min: 1, lastGreater } [3, 6, 11, 21] → '1–2', '3–5', '6–10', '11–20', '> 20'.
 */
export function classLabels(breaks: number[], options: ClassLabelOptions = {}) {
  const format = options.format || ((v: number) => String(v).replace('.', ','));
  const unit = options.unit ? ` ${options.unit}` : '';
  const labels: string[] = [];
  const last = breaks.length - 1;
  for (let i = 0; i <= breaks.length; i++) {
    let label: string;
    if (i === 0) {
      label =
        options.integer && options.min !== undefined
          ? range(options.min, breaks[0] - 1, format)
          : `< ${format(breaks[0])}`;
    } else if (i === breaks.length) {
      label =
        options.integer && options.lastGreater
          ? `> ${format(breaks[last] - 1)}`
          : `≥ ${format(breaks[last])}`;
    } else if (options.integer) {
      label = range(breaks[i - 1], breaks[i] - 1, format);
    } else {
      label = `${format(breaks[i - 1])}–${format(breaks[i])}`;
    }
    labels.push(label + unit);
  }
  return labels;
}

const range = (from: number, to: number, format: (v: number) => string) =>
  from === to ? format(from) : `${format(from)}–${format(to)}`;
