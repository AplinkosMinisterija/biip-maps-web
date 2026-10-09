// Municipality choropleth of the hunting data hub (SPEC2 §8.5).
// One vector tile layer over the public municipalities PMTiles archive, styled from the
// current TopicView's ChoroplethDef with fixed classes. The source is built once; a data or
// selection change only calls `layer.changed()`. The layer is hidden (not removed) while a
// topic without a choropleth (Vilkai, Apžvalga) is active, and removed on unmount.
import { computed, inject, onBeforeUnmount, onMounted, provide, ref, toRaw, watch } from 'vue';
import type { ComputedRef, InjectionKey, Ref } from 'vue';
import { useRoute } from 'vue-router';
import { Feature } from 'ol';
import type { Map, MapBrowserEvent } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import { MVT } from 'ol/format';
import VectorTileLayer from 'ol/layer/VectorTile';
import { Fill, Stroke, Style } from 'ol/style';
// @ts-expect-error ol-pmtiles has no types
import { PMTilesVectorSource } from 'ol-pmtiles';
import { boundariesHost } from '@/config';
import { projection3857 } from '@/utils/constants';
import { loadMunicipalityIndex } from '@/utils/hunting/municipalities';
import { S } from '@/utils/hunting/hub/strings';
import type { ChoroplethDef } from '@/utils/hunting/hub/types';
import type { HubContext } from './context';

export const HUB_CHOROPLETH_LAYER_ID = 'huntingHubChoropleth';
export const HUB_CHOROPLETH_SELECTION_LAYER_ID = 'huntingHubChoroplethSelection';

export type ChoroplethPalette = ChoroplethDef['palette'];

// Light → dark, 5 classes (ColorBrewer Greens / Blues / Oranges).
export const CHOROPLETH_PALETTES: Record<ChoroplethPalette, string[]> = {
  green: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
  // Blues one step up: the first class must not read as white ("no data").
  blue: ['#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  orange: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
};
export const CHOROPLETH_OUTLINE = '#6b7280';
export const CHOROPLETH_SELECTED = '#111827';
export const CHOROPLETH_EMPTY_FILL = '#ffffff';
export const HATCH_LINE = '#9ca3af';
export const DOT_FILL = '#4b5563';

// Neighbouring municipalities stay in view around a selected one.
const SELECTED_MAX_ZOOM = 9;
const AREA_CARD_W = 360 + 16;

/** Class index 0…breaks.length of `value`: classes are < b1, b1–b2, …, ≥ bn. */
export function classOf(value: number, breaks: number[]) {
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i++;
  return i;
}

export type ChoroplethFill =
  | { kind: 'class'; index: number }
  | { kind: 'zero' } // white, value 0 and `zeroIsWhite`
  | { kind: 'none' } // white, no value
  | { kind: 'hatched' }
  | { kind: 'special'; fill: string | 'dotted' };

// Colour of class `index`. With white zero and a first break of 1 (wolves: 1–2 · 3–5 · …)
// the class below the first break holds only the white 0, so the colours start at class 1.
export function colorIndex(def: ChoroplethDef, index: number) {
  const skip = def.zeroIsWhite && def.breaks.length > 0 && def.breaks[0] <= 1 ? 1 : 0;
  return Math.max(0, Math.min(index - skip, CHOROPLETH_PALETTES[def.palette].length - 1));
}

/** How one municipality is drawn (pure; shared by the layer style and the legend). */
export function fillOf(def: ChoroplethDef, code: number): ChoroplethFill {
  if (def.hatched.has(code)) return { kind: 'hatched' };
  const special = def.special?.find((s) => s.codes.has(code));
  if (special) return { kind: 'special', fill: special.fill };
  const value = def.values.get(code);
  if (value === null || value === undefined) return { kind: 'none' };
  if (value === 0 && def.zeroIsWhite) return { kind: 'zero' };
  return { kind: 'class', index: classOf(value, def.breaks) };
}

let hatchPattern: CanvasPattern | string | null = null;
let dotPattern: CanvasPattern | string | null = null;

// Grey dots on white: "neskelbiama" (pooled), distinct from white "no data" and the hatch.
function getDotPattern(): CanvasPattern | string {
  if (dotPattern) return dotPattern;
  const size = 6;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  if (!c) return (dotPattern = '#d1d5db');
  c.fillStyle = CHOROPLETH_EMPTY_FILL;
  c.fillRect(0, 0, size, size);
  c.fillStyle = DOT_FILL;
  c.beginPath();
  c.arc(size / 2, size / 2, 1.3, 0, Math.PI * 2);
  c.fill();
  dotPattern = c.createPattern(canvas, 'repeat') || '#d1d5db';
  return dotPattern;
}

// 45° grey lines on white, the "Nėra MPV" fill (also used as the legend swatch).
function getHatchPattern(): CanvasPattern | string {
  if (hatchPattern) return hatchPattern;
  const size = 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  if (!c) return (hatchPattern = '#e5e7eb');
  c.fillStyle = CHOROPLETH_EMPTY_FILL;
  c.fillRect(0, 0, size, size);
  c.strokeStyle = HATCH_LINE;
  c.lineWidth = 1.5;
  c.beginPath();
  // main diagonal plus the two corner pieces, so the tiles join seamlessly
  c.moveTo(0, size);
  c.lineTo(size, 0);
  c.moveTo(-size / 2, size / 2);
  c.lineTo(size / 2, -size / 2);
  c.moveTo(size / 2, size + size / 2);
  c.lineTo(size + size / 2, size / 2);
  c.stroke();
  hatchPattern = c.createPattern(canvas, 'repeat') || '#e5e7eb';
  return hatchPattern;
}

const outline = new Stroke({ color: CHOROPLETH_OUTLINE, width: 0.5 });
// near-transparent fill keeps the polygons hit-detectable
const transparentFill = new Fill({ color: 'rgba(255,255,255,0.01)' });
const styleCache = new globalThis.Map<string, Style>();

function cachedStyle(key: string, make: () => Style) {
  let style = styleCache.get(key);
  if (!style) {
    style = make();
    styleCache.set(key, style);
  }
  return style;
}

function fillStyle(def: ChoroplethDef | null, code: number): Style {
  if (!def) {
    return cachedStyle('outline', () => new Style({ stroke: outline, fill: transparentFill }));
  }
  const fill = fillOf(def, code);
  if (fill.kind === 'hatched') {
    return cachedStyle(
      'hatched',
      () => new Style({ stroke: outline, fill: new Fill({ color: getHatchPattern() }) }),
    );
  }
  if (fill.kind === 'special') {
    return cachedStyle(
      `special:${fill.fill}`,
      () =>
        new Style({
          stroke: outline,
          fill: new Fill({ color: fill.fill === 'dotted' ? getDotPattern() : fill.fill }),
        }),
    );
  }
  if (fill.kind === 'none' || fill.kind === 'zero') {
    return cachedStyle(
      'empty',
      () => new Style({ stroke: outline, fill: new Fill({ color: CHOROPLETH_EMPTY_FILL }) }),
    );
  }
  const colors = CHOROPLETH_PALETTES[def.palette];
  const index = colorIndex(def, fill.index);
  return cachedStyle(
    `${def.palette}:${index}`,
    () => new Style({ stroke: outline, fill: new Fill({ color: colors[index] }) }),
  );
}

export interface LegendItem {
  key: string;
  label: string;
  fill: string | 'hatched' | 'dotted';
}

// Class bounds are plain numbers: the unit is already in the legend title, and `format` may
// append it ("15 / 1 000 ha–19 / 1 000 ha" would not read).
const boundFormat = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 1 });
const numberLabel = (v: number) => boundFormat.format(v);
const countFormat = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 0 });

/**
 * Legend rows of a choropleth: one per class, then "Nėra MPV" (hatched) and "Duomenų nėra"
 * when such municipalities exist among `codes`. Classes are < b1, b1–b2, …, ≥ bn. Count maps
 * (`zeroIsWhite`, integer breaks) read as 0 · 1–2 · 3–5 · … · > 20 instead.
 */
export function legendItems(def: ChoroplethDef, codes: number[]): LegendItem[] {
  const colors = CHOROPLETH_PALETTES[def.palette];
  const b = def.breaks;
  const counts = def.zeroIsWhite && b.length > 0 && b.every((v) => Number.isInteger(v) && v > 0);
  const items: LegendItem[] = [];
  if (counts) {
    items.push({ key: 'zero', label: '0', fill: CHOROPLETH_EMPTY_FILL });
  }
  // count classes use plain integers: `format` may mask small values (e.g. '<3')
  const int = (v: number) => countFormat.format(v);
  const range = (lo: number, hi: number) => (lo === hi ? int(lo) : `${int(lo)}–${int(hi)}`);
  for (let i = 0; i <= b.length; i++) {
    // a first class with no counts in it (only 0, drawn white) gets no row
    if (counts && i === 0 && b[0] <= 1) continue;
    let label: string;
    if (counts) {
      // the first class holds the "<3" cells of the damages counts
      if (i === 0) label = b[0] === 3 ? S.suppressed : range(1, b[0] - 1);
      else if (i === b.length) label = `> ${int(b[i - 1] - 1)}`;
      else label = range(b[i - 1], b[i] - 1);
    } else if (i === 0) label = `< ${numberLabel(b[0])}`;
    else if (i === b.length) label = `≥ ${numberLabel(b[i - 1])}`;
    else label = `${numberLabel(b[i - 1])}–${numberLabel(b[i])}`;
    items.push({ key: `c${i}`, label, fill: colors[colorIndex(def, i)] });
  }
  if (codes.some((code) => def.hatched.has(code))) {
    items.push({ key: 'hatched', label: S.legendNoMpv, fill: 'hatched' });
  }
  (def.special || []).forEach((s) => {
    if (codes.some((code) => s.codes.has(code)))
      items.push({ key: `s:${s.key}`, label: s.label, fill: s.fill });
  });
  const missing = codes.some((code) => {
    if (def.hatched.has(code)) return false;
    if (def.special?.some((s) => s.codes.has(code))) return false;
    const v = def.values.get(code);
    return v === null || v === undefined;
  });
  if (missing) items.push({ key: 'none', label: S.legendNoData, fill: CHOROPLETH_EMPTY_FILL });
  return items;
}

const selectedStyle = new Style({
  stroke: new Stroke({ color: CHOROPLETH_SELECTED, width: 3 }),
});

export interface ChoroplethHover {
  code: number;
  name: string;
  text: string; // '{name} · {formatted value}'
  x: number; // px, relative to the map viewport
  y: number;
}

export interface HubChoroplethApi {
  /** True while the active topic draws on the map (choropleth or message). */
  active: ComputedRef<boolean>;
  /** The current choropleth definition, null for a map message or a live topic. */
  def: ComputedRef<ChoroplethDef | null>;
  /** Desktop hover tooltip state; null when the pointer is not over a municipality. */
  hover: Ref<ChoroplethHover | null>;
  /** Municipality name by code (snapshot meta). */
  nameOf(code: number): string;
  /** Text of one municipality's value: formatted value, 'Nėra MPV' or 'Duomenų nėra'. */
  valueText(code: number): string;
  /** Fits the map to a municipality (or does nothing if the polygons are not loaded). */
  fitTo(code: number): void;
}

export const HUB_CHOROPLETH_CTX: InjectionKey<HubChoroplethApi> = Symbol('huntingHubChoropleth');

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Adds the hub choropleth to the shared map on mount and removes it on unmount. Call it once
 * from the route's setup() with the hub context (as `useWolvesMap(ctx)` is called), before or
 * after `provide(HUB_CTX, ctx)`. Provides HUB_CHOROPLETH_CTX for the legend and the tooltip.
 */
export function useChoropleth(ctx: HubContext): HubChoroplethApi {
  const mapLayers: any = inject('mapLayers');
  const route = useRoute();

  // A live topic's own choropleth (the Vilkai snapshot fallback), drawn while it asks for it.
  const live = computed(() => (ctx.topic.value.kind === 'live' ? ctx.liveMap.value : null));
  const active = computed(() => {
    if (live.value) return true;
    const map = ctx.view.value?.map;
    return ctx.topic.value.kind === 'snapshot' && !!map && map.kind !== 'live';
  });
  const def = computed<ChoroplethDef | null>(() => {
    if (live.value) return live.value.def;
    const map = ctx.view.value?.map;
    return active.value && map?.kind === 'choropleth' ? map : null;
  });
  const selectedSav = () => (live.value ? live.value.sav : ctx.sel.value.sav);
  const hover = ref<ChoroplethHover | null>(null);

  const municipalityCodes = computed(
    () => new Set((ctx.data.snapshot.value?.meta.municipalities || []).map((m) => m.code)),
  );
  const names = computed(() => {
    const out = new globalThis.Map<number, string>();
    ctx.data.snapshot.value?.meta.municipalities.forEach((m) => out.set(m.code, m.name));
    return out;
  });
  const nameOf = (code: number) => names.value.get(code) || '';

  function valueText(code: number) {
    const d = def.value;
    if (!d) return '';
    if (d.hatched.has(code)) return S.legendNoMpv;
    const label = d.labels?.get(code);
    if (label) return label;
    const value = d.values.get(code);
    if (value === null || value === undefined) return S.legendNoData;
    return d.format(value);
  }

  // Plain variables read by the OL style functions (reactive reads there would be wasted).
  let styleDef: ChoroplethDef | null = null;
  let styleCodes = new Set<number>();
  let selected: number | null = null;

  const featureCode = (feature: FeatureLike) => Number(feature.getId() ?? feature.get('code'));

  const source = new PMTilesVectorSource({
    url: `${boundariesHost}/tiles/municipalities.pmtiles`,
    overlaps: false,
    projection: projection3857,
    format: new MVT({ featureClass: Feature as any, idProperty: 'code' }),
  });

  const layer = new VectorTileLayer({
    renderMode: 'vector',
    zIndex: 10,
    visible: false,
    source,
    style: (feature) => {
      const code = featureCode(feature);
      // the territorial sea and anything else that is not one of the 60 municipalities
      if (!styleCodes.has(code)) return undefined;
      return fillStyle(styleDef, code);
    },
  });
  layer.set('id', HUB_CHOROPLETH_LAYER_ID);

  // Separate layer for the selection, so neighbouring fills never paint over its outline.
  const selectionLayer = new VectorTileLayer({
    renderMode: 'vector',
    zIndex: 11,
    visible: false,
    source,
    style: (feature) =>
      selected !== null && featureCode(feature) === selected ? selectedStyle : undefined,
  });
  selectionLayer.set('id', HUB_CHOROPLETH_SELECTION_LAYER_ID);

  let map: Map | null = null;
  let mounted = false;
  let clickEntry: any = null;
  let previousPadding: number[] | undefined;

  function refresh() {
    styleDef = def.value;
    styleCodes = municipalityCodes.value;
    selected = active.value ? selectedSav() : null;
    layer.setVisible(active.value);
    selectionLayer.setVisible(active.value);
    layer.changed();
    selectionLayer.changed();
    if (!active.value) hover.value = null;
  }

  watch([def, active, municipalityCodes, selectedSav], refresh, { immediate: true });

  // Pointer cursor over municipalities only while the choropleth is shown; the Vilkai map
  // sets its own list on mount and restores ours on unmount.
  watch(active, (on) => {
    if (on && map) mapLayers.pointerCursor([HUB_CHOROPLETH_LAYER_ID]);
  });

  // The live topic keeps its own view padding and zoom (useWolvesMap).
  function applyPadding() {
    if (!map || !active.value || live.value) return;
    const view = map.getView();
    const center = view.getCenter();
    view.padding = [...ctx.layout.mapPadding.value];
    if (center) view.setCenter(center);
  }
  watch([() => ctx.layout.mapPadding.value.join(','), active], applyPadding);

  async function fitTo(code: number) {
    let index;
    try {
      index = await loadMunicipalityIndex();
    } catch (err) {
      return; // the polygons are optional for fitting; the selection still applies
    }
    const info = index.byCode[code];
    if (!info || !map) return;
    // The area card (360 px, top right) covers the map on desktop: keep the place clear of it.
    const padding = [...ctx.layout.mapPadding.value].map((p) => p + 16);
    if (!ctx.isMobile.value && window.innerWidth >= 1024) padding[1] += AREA_CARD_W;
    map.getView().fit(info.extent3857, {
      padding,
      duration: prefersReducedMotion() ? 0 : 400,
      maxZoom: SELECTED_MAX_ZOOM,
    });
  }

  watch(
    () => ctx.sel.value.sav,
    (code, old) => {
      if (code !== null && code !== old && active.value && !live.value) fitTo(code);
    },
  );

  function onClick(e: MapBrowserEvent<any> & { features: FeatureLike[] }) {
    if (!mounted || !active.value) return;
    const feature = e.features?.find((f) => styleCodes.has(featureCode(f)));
    if (!feature) return;
    const code = featureCode(feature);
    if (live.value) {
      if (code !== live.value.sav) live.value.select(code);
    } else if (code !== ctx.sel.value.sav) ctx.setSav(code);
  }

  function onPointerMove(e: MapBrowserEvent<PointerEvent>) {
    if (!map || !active.value || e.dragging || ctx.isMobile.value) {
      hover.value = null;
      return;
    }
    if (e.originalEvent && e.originalEvent.pointerType && e.originalEvent.pointerType !== 'mouse') {
      return;
    }
    const code = map.forEachFeatureAtPixel(
      e.pixel,
      (f) => {
        const c = featureCode(f);
        return styleCodes.has(c) ? c : undefined;
      },
      { layerFilter: (l) => l === layer, hitTolerance: 0 },
    );
    if (code === undefined) {
      hover.value = null;
      return;
    }
    const name = nameOf(code);
    const value = def.value ? valueText(code) : '';
    hover.value = {
      code,
      name,
      text: value ? `${name} · ${value}` : name,
      x: e.pixel[0],
      y: e.pixel[1],
    };
  }
  const onPointerOut = () => {
    hover.value = null;
  };

  onMounted(async () => {
    mounted = true;
    await mapLayers.waitForLoaded;
    if (!mounted || !mapLayers.map) return;
    map = toRaw(mapLayers.map) as Map;
    map.addLayer(layer);
    map.addLayer(selectionLayer);

    mapLayers.click(onClick, { layers: [HUB_CHOROPLETH_LAYER_ID] });
    const callbacks: any[] = (mapLayers as any)._clickCallbacks || [];
    clickEntry = callbacks.find((c) => c.cb === onClick) || null;

    if (active.value) mapLayers.pointerCursor([HUB_CHOROPLETH_LAYER_ID]);
    map.on('pointermove', onPointerMove);
    map.getViewport().addEventListener('pointerout', onPointerOut);

    previousPadding = map.getView().padding;
    applyPadding();
    const code = ctx.sel.value.sav;
    if (code !== null && active.value && !live.value && (!route.query.x || !route.query.y))
      fitTo(code);
  });

  onBeforeUnmount(() => {
    mounted = false;
    if (!map) return;
    map.removeLayer(layer);
    map.removeLayer(selectionLayer);
    // MapLayers has no API to remove a click callback; drop ours so it does not outlive the route
    const callbacks: any[] = (mapLayers as any)._clickCallbacks;
    if (clickEntry && Array.isArray(callbacks)) {
      const idx = callbacks.indexOf(clickEntry);
      if (idx >= 0) callbacks.splice(idx, 1);
    }
    if ((mapLayers as any)._pointerCursorLayers?.includes(HUB_CHOROPLETH_LAYER_ID)) {
      mapLayers.pointerCursor([]);
    }
    map.un('pointermove', onPointerMove);
    map.getViewport()?.removeEventListener('pointerout', onPointerOut);
    if (previousPadding) map.getView().padding = previousPadding;
    map = null;
  });

  const api: HubChoroplethApi = { active, def, hover, nameOf, valueText, fitTo };
  provide(HUB_CHOROPLETH_CTX, api);
  return api;
}
