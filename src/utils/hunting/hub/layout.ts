// Shell geometry of the hunting data hub (SPEC2 §4). These constants are the single source:
// the shell writes them to its root element as CSS variables (`hubCssVars`), and the map
// padding is computed from the same numbers (`mapPadding`), so CSS and OpenLayers agree.

export type HubLayoutMode = 'mobile' | 'tablet' | 'desktop' | 'wide';

export const MOBILE_MAX = 767; // < 768 px: mobile header + bottom sheet
export const DESKTOP_MIN = 1024; // 768–1023 px: tablet
export const WIDE_MIN = 1280; // ≥ 1280 px: wider panel, table as a drawer next to a rail

export const HUB_TOP = 104; // 56 px top bar + 48 px filter bar
export const HUB_TOP_EMBED = 48; // embedded in the WP page (SPEC §5.11): filter bar only
export const HUB_PANEL_W = 360;
export const HUB_PANEL_W_WIDE = 380; // ≥ 1280 px
export const HUB_PANEL_W_TABLET = 320;
export const HUB_RAIL_W = 56;
export const HUB_DRAWER_W = 560;
export const HUB_GAP = 8;

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

export function panelWidth(width: number) {
  const mode = layoutMode(width);
  if (mode === 'wide') return HUB_PANEL_W_WIDE;
  if (mode === 'desktop') return HUB_PANEL_W;
  if (mode === 'tablet') return HUB_PANEL_W_TABLET;
  return 0;
}

// The panel collapses to the rail only when the table drawer is open at ≥ 1280 px. Between
// 768 and 1279 px the table replaces the map instead; below 768 px it lives in the sheet.
// Embedded, there is no rail: the table replaces the map at every width from 768 px.
export const isRailed = (width: number, tableOpen: boolean, embed = false) =>
  !embed && tableOpen && layoutMode(width) === 'wide';

// The table hides the map (visibility: hidden, not unmounted) between 768 and 1279 px
// (embedded: from 768 px).
export const tableReplacesMap = (width: number, tableOpen: boolean, embed = false) =>
  embed
    ? tableOpen && layoutMode(width) !== 'mobile'
    : tableOpen && (layoutMode(width) === 'tablet' || layoutMode(width) === 'desktop');

/** CSS variables for the shell root element (SPEC2 §4.1; embedded: SPEC §5.11). */
export function hubCssVars(width: number, embed = false): Record<string, string> {
  return {
    '--hub-top': `${hubTop(embed)}px`,
    // Top of the filter bar: below the 56 px top bar, or at the top when embedded.
    '--hub-bar-top': embed ? '0px' : `${HUB_TOP - HUB_TOP_EMBED}px`,
    '--hub-mobile-header': `${mobileHeader(embed)}px`,
    '--hub-panel-w': `${panelWidth(width) || HUB_PANEL_W}px`,
    '--hub-rail-w': `${HUB_RAIL_W}px`,
    '--hub-drawer-w': `${HUB_DRAWER_W}px`,
    '--hub-gap': `${HUB_GAP}px`,
  };
}

/**
 * Map area covered by the shell, as OpenLayers view padding [top, right, bottom, left] in px.
 * Rail + drawer at 1440 px: [104, 568, 0, 64], leaving 1440 − 56 − 560 = 824 px of map.
 */
export function mapPadding(width: number, tableOpen: boolean, embed = false): number[] {
  const mode = layoutMode(width);
  if (mode === 'mobile') return [mobileHeader(embed), 0, HUB_MOBILE_PEEK, 0];
  if (isRailed(width, tableOpen, embed)) {
    return [hubTop(embed), HUB_DRAWER_W + HUB_GAP, 0, HUB_RAIL_W + HUB_GAP];
  }
  // Floating panel on the left (desktop/tablet). When the table replaces the map the
  // padding is irrelevant; the same value keeps the view stable when the map returns.
  return [hubTop(embed), 0, 0, HUB_GAP + panelWidth(width) + HUB_GAP];
}
