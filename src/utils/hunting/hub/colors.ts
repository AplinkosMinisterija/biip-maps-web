// Data colours of the hunting data hub, in one place (decision D5). Map ramps are derived from
// the medziokle.biip.lt palette (teal #004650, peach #F89572); species keep one colour in every
// view (Žala chart, Stebėjimai points, legend and chart, Vilkai map). Chrome colours (controls,
// text, hairlines) are Tailwind tokens, not here.

// ---- Choropleth: 5 fixed classes, light → dark, one hue each. The first class is clearly off
// white (1.69:1 and 1.55:1), so "0" (white) and "Duomenų nėra" (grey) never read as a class.
export type Ramp = 'teal' | 'warm';
export const CHOROPLETH_RAMPS: Record<Ramp, string[]> = {
  // Laimikiai, Briedžių limitai
  teal: ['#A9CBCF', '#7AAEB4', '#4A8D95', '#1D6871', '#004650'],
  // Žala, Vilkai fallback (anchored on the site's peach accent)
  warm: ['#F9C4AD', '#F89572', '#E0663C', '#B4441D', '#7A2A10'],
};
export const CHOROPLETH_OUTLINE = '#6B7280';
export const CHOROPLETH_ZERO_FILL = '#FFFFFF'; // value 0 of a count map
export const CHOROPLETH_NO_DATA_FILL = '#E5E9EC'; // "Duomenų nėra"
export const CHOROPLETH_UNSET_FILL = '#CBD2D9'; // Limitai "Limitas nenustatytas"
export const HATCH_LINE = '#9CA3AF'; // "Nėra MPV": 45° lines on white
export const DOT_FILL = '#4B5563'; // "Neskelbiama": dots on white
// Land outside the 60 municipalities while a choropleth is shown (the basemap's land colour).
export const MAP_LAND = '#F2F3F0';

// Selection: a dark line on a white halo reads on every class, the darkest teal included.
export const SELECTION_INK = '#121926';
export const SELECTION_HALO = '#FFFFFF';

// ---- Species, keyed by entity (Žala damage groups). Muted to the site's chroma (D17), hue
// order as before; wolves keep the colour of the Vilkai map. Checked (Machado 2009 simulation,
// severity 1): every pair, OTHER_SPECIES_COLOR included, ≥ 12.3 CIEDE2000 under normal,
// protan and deutan vision (≥ 10.2 tritan), and each colour ≥ 3.19:1 on white.
export const SPECIES_COLORS: Readonly<Record<string, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, string>, {
    kanopiniai: '#3954A0',
    stumbrai: '#638353',
    bebrai: '#C16386',
    vilkai: '#B45309',
    lusys: '#7C7CCB',
    lokiai: '#1DA09F',
  }),
);
// Stebėjimai species slugs → the same entities.
const SPECIES_ALIASES: Readonly<Record<string, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, string>, {
    vilkas: 'vilkai',
    lusis: 'lusys',
    'rudasis-lokys': 'lokiai',
    stumbras: 'stumbrai',
  }),
);
export const WOLF_COLOR = SPECIES_COLORS.vilkai;
export const OTHER_SPECIES_COLOR = '#4B5563'; // a species without its own colour

/** Colour of a species (damage group id or Stebėjimai slug), or null if it has none. */
export function speciesColorOf(id: string): string | null {
  return SPECIES_COLORS[id] || SPECIES_COLORS[SPECIES_ALIASES[id]] || null;
}

// ---- Bars: one series = the calendar's teal step (3.8:1 on white); the current or selected
// bar = the accent; a residual "Kitos rūšys" bar = hairline grey. Named non-species series.
export const BAR_COLOR = '#5E8A91';
export const BAR_CURRENT = '#004650';
export const BAR_OTHER = '#CDD5DF';
export const SERIES_COLORS: Readonly<Record<string, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, string>, {
    allocated: '#7FA2A7', // Limitai "Paskirstyta"
    used: '#004650', // Limitai "Sumedžiota"
  }),
);

/** Colour of a chart series: the species colour, a named series colour or the bar teal. */
export const seriesColor = (id?: string) =>
  (id && (speciesColorOf(id) || SERIES_COLORS[id])) || BAR_COLOR;
