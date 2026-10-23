// Shell geometry of the hunting data hub (SPEC2 §4). These constants are the single source:
// the shell writes them to its root element as CSS variables (`hubCssVars`), and the map
// padding is computed from the same numbers (`mapPadding`), so CSS and OpenLayers agree.

export type HubLayoutMode = 'mobile' | 'tablet' | 'desktop' | 'wide';

export const MOBILE_MAX = 767; // < 768 px: mobile header + bottom sheet
export const DESKTOP_MIN = 1024; // 768–1023 px: tablet
export const WIDE_MIN = 1280; // ≥ 1280 px: wider panel; an open table collapses it to the rail

export const HUB_TOP = 112; // 56 px top bar + 56 px filter bar
export const HUB_TOP_EMBED = 56; // embedded in the WP page (SPEC §5.11): filter bar only
export const HUB_PANEL_W = 360;
export const HUB_PANEL_W_WIDE = 380; // ≥ 1280 px
export const HUB_PANEL_W_TABLET = 320;
export const HUB_RAIL_W = 56;
export const HUB_GAP = 8;
// The medziokle.biip.lt content container (decision D3): 1120 px, centred, gutter ≥ 24 px.
export const SITE_CONTAINER = 1120;
export const SITE_GUTTER_MIN = 24;
export const HUB_GUTTER_PHONE = 16;

export const HUB_MOBILE_HEADER = 108; // topic menu row + chip row, incl. padding
export const HUB_MOBILE_HEADER_EMBED = 60; // embedded: chip row only
export const HUB_MOBILE_PEEK = 96; // bottom sheet peek height

export function layoutMode(width: number): HubLayoutMode {
  if (width <= MOBILE_MAX) return 'mobile';
  if (width < DESKTOP_MIN) return 'tablet';
  if (width < WIDE_MIN) return 'desktop';
  return 'wide';
}

// Every `embed` parameter below defaults to false, which keeps the standalone results.
export const hubTop = (embed = false) => (embed ? HUB_TOP_EMBED : HUB_TOP);
export const mobileHeader = (embed = false) =>
  embed ? HUB_MOBILE_HEADER_EMBED : HUB_MOBILE_HEADER;

/**
 * Left and right gutter of the hub's chrome (filter bar, panel, overview, table content).
 * Embedded, it is the site's: max(24 px, (width − 1120 px) / 2), so the iframe rows line up
 * with the WP header above (the iframe is full-bleed). Phones: 16 px. Standalone: 16 px.
 */
export function hubGutter(width: number, embed = false) {
  if (layoutMode(width) === 'mobile') return HUB_GUTTER_PHONE;
  if (!embed) return HUB_GUTTER_PHONE;
  return Math.max(SITE_GUTTER_MIN, Math.round((width - SITE_CONTAINER) / 2));
}

// Left edge of the floating panel: the gutter embedded, 8 px off the map edge standalone.
export const panelLeft = (width: number, embed = false) =>
  embed ? hubGutter(width, embed) : HUB_GAP;

export function panelWidth(width: number) {
  const mode = layoutMode(width);
  if (mode === 'wide') return HUB_PANEL_W_WIDE;
  if (mode === 'desktop') return HUB_PANEL_W;
  if (mode === 'tablet') return HUB_PANEL_W_TABLET;
  return 0;
}

// Table view (decision D14, embedded and standalone alike): ≥ 1280 px the panel collapses to
// the 56 px rail and the table pane spans from the rail to the right gutter; 768–1279 px the
// table replaces the map right of the panel; below 768 px it lives in the sheet. The `embed`
// parameter stays for the callers; the layout no longer depends on it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isRailed = (width: number, tableOpen: boolean, _embed = false) =>
  tableOpen && layoutMode(width) === 'wide';

// Every open table on desktop/tablet covers the map, so the map is hidden (visibility: hidden,
// not unmounted) from 768 px.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const tableReplacesMap = (width: number, tableOpen: boolean, _embed = false) =>
  tableOpen && layoutMode(width) !== 'mobile';

// Left edge of the table pane: right of the rail (≥ 1280 px) or of the panel.
export const tableLeft = (width: number, embed = false) =>
  layoutMode(width) === 'wide'
    ? panelLeft(width, embed) + HUB_RAIL_W + HUB_GAP
    : panelLeft(width, embed) + (panelWidth(width) || HUB_PANEL_W) + HUB_GAP;

/** CSS variables for the shell root element (SPEC2 §4.1; embedded: SPEC §5.11). */
export function hubCssVars(width: number, embed = false): Record<string, string> {
  return {
    // In rem, like the bars' own Tailwind heights (h-14 = 3.5rem): with a larger browser text
    // size the panels, drawers and map controls stay below the grown bars (MOBILE-A11Y-16).
    // The OpenLayers padding (mapPadding) stays in px.
    '--hub-top': `${hubTop(embed) / 16}rem`,
    // Top of the filter bar: below the 56 px top bar, or at the top when embedded.
    '--hub-bar-top': embed ? '0rem' : `${(HUB_TOP - HUB_TOP_EMBED) / 16}rem`,
    '--hub-mobile-header': `${mobileHeader(embed)}px`,
    '--hub-panel-w': `${panelWidth(width) || HUB_PANEL_W}px`,
    '--hub-rail-w': `${HUB_RAIL_W}px`,
    '--hub-gap': `${HUB_GAP}px`,
    '--hub-gutter': `${hubGutter(width, embed)}px`,
    '--hub-panel-left': `${panelLeft(width, embed)}px`,
    // First free x right of the floating panel (legend, table next to the panel).
    '--hub-content-left': `${panelLeft(width, embed) + (panelWidth(width) || HUB_PANEL_W) + HUB_GAP}px`,
    // Left edge of the table pane while a table is open (D14).
    '--hub-table-left': `${tableLeft(width, embed)}px`,
  };
}

/**
 * Map area covered by the shell, as OpenLayers view padding [top, right, bottom, left] in px.
 * The floating panel at 1440 px standalone: [112, 0, 0, 396]. An open table hides the map
 * (D14); the padding stays the panel's, so the view does not jump when the map returns.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mapPadding(width: number, _tableOpen = false, embed = false): number[] {
  const mode = layoutMode(width);
  if (mode === 'mobile') return [mobileHeader(embed), 0, HUB_MOBILE_PEEK, 0];
  return [hubTop(embed), 0, 0, panelLeft(width, embed) + panelWidth(width) + HUB_GAP];
}
