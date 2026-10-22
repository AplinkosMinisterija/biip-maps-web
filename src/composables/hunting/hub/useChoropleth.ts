// Municipality choropleth of the hunting data hub (SPEC2 §8.5).
// One vector layer of the 60 municipality polygons of the public municipalities PMTiles
// archive, styled from the current TopicView's ChoroplethDef with fixed classes. The source is
// built once; a data or selection change only calls `layer.changed()`. The layer is hidden (not
// removed) while a topic without a choropleth (Vilkai, Apžvalga) is active, and removed on
// unmount.
//
// Not a vector tile layer: OpenLayers clips the fills of every tile to the tile's extent, and
// at the hub's fractional zoom the tile edges fall between pixels, so the anti-aliased clip
// edges let the background through as thin light lines across the fills. The polygons are
// merged per municipality from the z7 tiles instead (the tiles loadMunicipalityIndex reads
// anyway) and drawn untiled. The tiled layer only covers the moment until they are ready, or
// stays if the merge fails.
import { computed, inject, onBeforeUnmount, onMounted, provide, ref, toRaw, watch } from 'vue';
import type { ComputedRef, InjectionKey, Ref } from 'vue';
import { useRoute } from 'vue-router';
import { Feature } from 'ol';
import type { Map, MapBrowserEvent } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import { GeoJSON, MVT } from 'ol/format';
import type { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style } from 'ol/style';
// @ts-expect-error ol-pmtiles has no types
import { PMTilesVectorSource } from 'ol-pmtiles';
import { feature as turfFeature, featureCollection, union } from '@turf/turf';
import { boundariesHost } from '@/config';
import { projection3857 } from '@/utils/constants';
import { loadMunicipalityIndex, type MunicipalityIndex } from '@/utils/hunting/municipalities';
import { S } from '@/utils/hunting/hub/strings';
import type { ChoroplethDef } from '@/utils/hunting/hub/types';
import { atCountryFit } from '@/utils/hunting/hub/mapFit';
import {
  CHOROPLETH_NO_DATA_FILL,
  CHOROPLETH_OUTLINE,
  CHOROPLETH_RAMPS,
  CHOROPLETH_ZERO_FILL,
  DOT_FILL,
  HATCH_LINE,
  MAP_LAND,
  SELECTION_HALO,
  SELECTION_INK,
} from '@/utils/hunting/hub/colors';
import type { HubContext } from './context';

export const HUB_CHOROPLETH_LAYER_ID = 'huntingHubChoropleth';
export const HUB_CHOROPLETH_SELECTION_LAYER_ID = 'huntingHubChoroplethSelection';

export type ChoroplethPalette = ChoroplethDef['palette'];

// The colours live in utils/hunting/hub/colors.ts (one source for the map, the legend and the
// class helpers); re-exported here for the legend component.
export {
  CHOROPLETH_NO_DATA_FILL,
  CHOROPLETH_OUTLINE,
  CHOROPLETH_RAMPS,
  CHOROPLETH_ZERO_FILL,
  DOT_FILL,
  HATCH_LINE,
};
// The white under the hatch and the dots ("Nėra MPV", "Neskelbiama").
export const CHOROPLETH_EMPTY_FILL = CHOROPLETH_ZERO_FILL;

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
  | { kind: 'none' } // light grey, no value ("Duomenų nėra")
  | { kind: 'hatched' }
  | { kind: 'special'; fill: string | 'dotted' };

// Colour of class `index`. With white zero and a first break of 1 (wolves: 1–2 · 3–5 · …)
// the class below the first break holds only the white 0, so the colours start at class 1.
export function colorIndex(def: ChoroplethDef, index: number) {
  const skip = def.zeroIsWhite && def.breaks.length > 0 && def.breaks[0] <= 1 ? 1 : 0;
  return Math.max(0, Math.min(index - skip, CHOROPLETH_RAMPS[def.palette].length - 1));
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
  if (fill.kind === 'zero') {
    return cachedStyle(
      'zero',
      () => new Style({ stroke: outline, fill: new Fill({ color: CHOROPLETH_ZERO_FILL }) }),
    );
  }
  if (fill.kind === 'none') {
    return cachedStyle(
      'none',
      () => new Style({ stroke: outline, fill: new Fill({ color: CHOROPLETH_NO_DATA_FILL }) }),
    );
  }
  const colors = CHOROPLETH_RAMPS[def.palette];
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

export interface LegendModel {
  /** Integer counts (Žala, Vilkai): a label under every swatch ("<3", "3–5", …, "> 20"). */
  counts: boolean;
  /** One swatch per class; `label` is the class's full, non-overlapping text. */
  classes: LegendItem[];
  /** Continuous metrics: the break values, printed under the joins between the swatches. */
  joins: string[];
  /** Fills outside the scale: "0", "Nėra MPV", pooled, … and "Duomenų nėra". */
  specials: LegendItem[];
}

// Class bounds are plain numbers: the unit is already in the legend title, and `format` may
// append it ("15 / 1 000 ha–19 / 1 000 ha" would not read).
const boundFormat = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 1 });
const numberLabel = (v: number) => boundFormat.format(v);
const countFormat = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 0 });

/**
 * Legend of a choropleth: one swatch per class, then "0", "Nėra MPV", the special fills and
 * "Duomenų nėra" when such municipalities exist among `codes`. Classes are < b1, b1–b2, …,
 * ≥ bn; their labels never share a bound ("15–18,9", "19–20,9"; whole-number metrics
 * "40–49"). Count maps (`zeroIsWhite`, integer breaks) read as 0 · 1–2 · 3–5 · … · > 20.
 */
export function legendModel(def: ChoroplethDef, codes: number[]): LegendModel {
  const colors = CHOROPLETH_RAMPS[def.palette];
  const b = def.breaks;
  const counts = def.zeroIsWhite && b.length > 0 && b.every((v) => Number.isInteger(v) && v > 0);
  const classes: LegendItem[] = [];
  const specials: LegendItem[] = [];
  if (counts) specials.push({ key: 'zero', label: '0', fill: CHOROPLETH_ZERO_FILL });
  // count classes use plain integers: `format` may mask small values (e.g. '<3')
  const int = (v: number) => countFormat.format(v);
  const range = (lo: number, hi: number) => (lo === hi ? int(lo) : `${int(lo)}–${int(hi)}`);
  // Whole-number values (percent of a limit) end one below the next break, others 0,1 below.
  const wholeValues = [...def.values.values()].every((v) => v == null || Number.isInteger(v));
  const step = wholeValues && b.every((v) => Number.isInteger(v)) ? 1 : 0.1;
  const upper = (v: number) => numberLabel(Math.round((v - step) * 10) / 10);
  for (let i = 0; i <= b.length; i++) {
    // a first class with no counts in it (only 0, drawn white) gets no swatch
    if (counts && i === 0 && b[0] <= 1) continue;
    let label: string;
    if (counts) {
      // the first class holds the "<3" cells of the damages counts
      if (i === 0) label = b[0] === 3 ? S.suppressed : range(1, b[0] - 1);
      else if (i === b.length) label = `> ${int(b[i - 1] - 1)}`;
      else label = range(b[i - 1], b[i] - 1);
    } else if (i === 0) label = `< ${numberLabel(b[0])}`;
    else if (i === b.length) label = `≥ ${numberLabel(b[i - 1])}`;
    else label = `${numberLabel(b[i - 1])}–${upper(b[i])}`;
    classes.push({ key: `c${i}`, label, fill: colors[colorIndex(def, i)] });
  }
  if (codes.some((code) => def.hatched.has(code))) {
    specials.push({ key: 'hatched', label: S.legendNoMpv, fill: 'hatched' });
  }
  (def.special || []).forEach((s) => {
    if (codes.some((code) => s.codes.has(code)))
      specials.push({ key: `s:${s.key}`, label: s.label, fill: s.fill });
  });
  const missing = codes.some((code) => {
    if (def.hatched.has(code)) return false;
    if (def.special?.some((s) => s.codes.has(code))) return false;
    const v = def.values.get(code);
    return v === null || v === undefined;
  });
  if (missing) specials.push({ key: 'none', label: S.legendNoData, fill: CHOROPLETH_NO_DATA_FILL });
  return { counts, classes, joins: counts ? [] : b.map(numberLabel), specials };
}

/** Every legend row in one list: the classes, then the fills outside the scale. */
export function legendItems(def: ChoroplethDef, codes: number[]): LegendItem[] {
  const model = legendModel(def, codes);
  const zero = model.specials.filter((s) => s.key === 'zero');
  return [...zero, ...model.classes, ...model.specials.filter((s) => s.key !== 'zero')];
}

// A dark line on a white halo: it reads on the lightest and the darkest class alike.
const selectedStyle = [
  new Style({ stroke: new Stroke({ color: SELECTION_HALO, width: 6 }) }),
  new Style({ stroke: new Stroke({ color: SELECTION_INK, width: 2.5 }) }),
];
// Land and sea that are not one of the 60 municipalities (the territorial sea wedge): drawn
// in the land colour without an outline, so it does not compete with the data.
const landStyle = new Style({ fill: new Fill({ color: MAP_LAND }) });

interface MergedMunicipality {
  code: number;
  name: string;
  geometry: Geometry;
}

// One polygon per municipality from its tile pieces (the pieces overlap in the tile buffers).
async function mergeMunicipalities(index: MunicipalityIndex): Promise<MergedMunicipality[]> {
  const pieces = new globalThis.Map<number, any[]>();
  Object.values(index.tiles).forEach((list) =>
    list.forEach((piece) => {
      const parts = pieces.get(piece.code) || [];
      parts.push(turfFeature(piece.geometry));
      pieces.set(piece.code, parts);
    }),
  );
  const geoJson = new GeoJSON();
  const out: MergedMunicipality[] = [];
  let done = 0;
  for (const [code, parts] of pieces) {
    // about 250 ms for all 60: yield now and then, so the merge is no long task
    if (++done % 8 === 0) await new Promise((resolve) => setTimeout(resolve));
    const merged = parts.length === 1 ? parts[0] : union(featureCollection(parts));
    if (!merged) continue;
    const name = index.byCode[code]?.name || '';
    out.push({ code, name, geometry: geoJson.readGeometry(merged.geometry) as Geometry });
  }
  if (!out.length) throw new Error('No municipality polygons merged');
  return out;
}

// Memoised per page load, like the index; a failed attempt can be retried.
let mergedPromise: Promise<MergedMunicipality[]> | null = null;
function loadMergedMunicipalities() {
  if (!mergedPromise) {
    mergedPromise = loadMunicipalityIndex()
      .then(mergeMunicipalities)
      .catch((err) => {
        mergedPromise = null;
        throw err;
      });
  }
  return mergedPromise;
}

export interface ChoroplethHover {
  code: number;
  name: string;
  text: string; // '{name}: {value with its unit}'
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

  const fill = (feature: FeatureLike) => {
    const code = featureCode(feature);
    // the territorial sea and anything else that is not one of the 60 municipalities
    if (!styleCodes.has(code)) return styleDef ? landStyle : undefined;
    return fillStyle(styleDef, code);
  };
  const outlineSelected = (feature: FeatureLike) =>
    selected !== null && featureCode(feature) === selected ? selectedStyle : undefined;

  const tileSource = new PMTilesVectorSource({
    url: `${boundariesHost}/tiles/municipalities.pmtiles`,
    overlaps: false,
    projection: projection3857,
    format: new MVT({ featureClass: Feature as any, idProperty: 'code' }),
  });
  const mergedSource = new VectorSource<Feature>();

  // The merged layers once their polygons are there, the tiled ones until then.
  const tiled = {
    fill: new VectorTileLayer({
      renderMode: 'vector',
      zIndex: 10,
      visible: false,
      source: tileSource,
      style: fill,
    }),
    // Separate layer for the selection, so neighbouring fills never paint over its outline.
    selection: new VectorTileLayer({
      renderMode: 'vector',
      zIndex: 11,
      visible: false,
      source: tileSource,
      style: outlineSelected,
    }),
  };
  const merged = {
    fill: new VectorLayer({ zIndex: 10, visible: false, source: mergedSource, style: fill }),
    selection: new VectorLayer({
      zIndex: 11,
      visible: false,
      source: mergedSource,
      style: outlineSelected,
    }),
  };
  let mergedReady = false;
  const fillLayers = [tiled.fill, merged.fill];
  fillLayers.forEach((l) => l.set('id', HUB_CHOROPLETH_LAYER_ID));
  [tiled.selection, merged.selection].forEach((l) =>
    l.set('id', HUB_CHOROPLETH_SELECTION_LAYER_ID),
  );
  const allLayers = [tiled.fill, tiled.selection, merged.fill, merged.selection];

  let map: Map | null = null;
  let mounted = false;
  let clickEntry: any = null;
  let previousPadding: number[] | undefined;

  // The basemap's labels and its sea wedge compete with the classes: while a choropleth is
  // shown the basemap is hidden and the map shows a flat land colour around Lithuania.
  const baseLayer = () => mapLayers.visibleBaseLayer?.layer as { setVisible(v: boolean): void };
  function setBasemap(on: boolean) {
    if (!map) return;
    baseLayer()?.setVisible(on);
    map.getViewport().style.background = on ? '' : MAP_LAND;
  }

  // While a snapshot topic loads, the municipality outlines alone show where data will be.
  const loadingOutlines = computed(
    () =>
      ctx.topic.value.kind === 'snapshot' &&
      (ctx.data.phase.value === 'loading' || ctx.data.phase.value === 'slow'),
  );

  function refresh() {
    setBasemap(!def.value);
    styleDef = def.value;
    styleCodes = municipalityCodes.value;
    selected = active.value ? selectedSav() : null;
    const shown = active.value || loadingOutlines.value;
    tiled.fill.setVisible(shown && !mergedReady);
    tiled.selection.setVisible(active.value && !mergedReady);
    merged.fill.setVisible(shown && mergedReady);
    merged.selection.setVisible(active.value && mergedReady);
    allLayers.forEach((l) => l.changed());
    if (!active.value) hover.value = null;
  }

  watch([def, active, municipalityCodes, selectedSav, loadingOutlines], refresh, {
    immediate: true,
  });

  // Pointer cursor over municipalities only while the choropleth is shown; the Vilkai map
  // sets its own list on mount and restores ours on unmount.
  watch(active, (on) => {
    if (on && map) mapLayers.pointerCursor([HUB_CHOROPLETH_LAYER_ID]);
  });

  // The live topic keeps its own view padding and zoom (useWolvesMap).
  // Untouched since the country fit, the country is fitted again into the new free area.
  function applyPadding() {
    if (!map || !active.value || live.value) return;
    const view = map.getView();
    const refit = atCountryFit(view);
    const center = view.getCenter();
    view.padding = [...ctx.layout.mapPadding.value];
    if (refit) mapLayers.centerMap();
    else if (center) view.setCenter(center);
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
    // Phones: the selection raises the sheet to half the frame (its card); fit above it, one
    // zoom step wider, so the neighbours stay in view (MOBILE-10).
    if (ctx.isMobile.value) padding[2] = Math.round(window.innerHeight / 2) + 16;
    map.getView().fit(info.extent3857, {
      padding,
      duration: prefersReducedMotion() ? 0 : 400,
      maxZoom: ctx.isMobile.value ? SELECTED_MAX_ZOOM - 1 : SELECTED_MAX_ZOOM,
    });
  }

  watch(
    () => ctx.sel.value.sav,
    (code, old) => {
      if (code !== null && code !== old && active.value && !live.value) fitTo(code);
    },
  );
  // The map follows the place filter also when it arrives before the data, and when the
  // view has a map message instead of classes (J-23).
  watch(active, (on, was) => {
    const code = ctx.sel.value.sav;
    if (on && !was && code !== null && !live.value && (!route.query.x || !route.query.y))
      fitTo(code);
  });

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
      { layerFilter: (l) => fillLayers.includes(l as any), hitTolerance: 0 },
    );
    // The selected municipality's card already shows its value.
    if (code === undefined || code === selectedSav()) {
      hover.value = null;
      return;
    }
    const name = nameOf(code);
    const value = def.value ? valueText(code) : '';
    hover.value = {
      code,
      name,
      text: value ? `${name}: ${value}` : name,
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
    allLayers.forEach((l) => map!.addLayer(l));
    setBasemap(!def.value);
    loadMergedMunicipalities()
      .then((list) => {
        if (!mounted) return;
        mergedSource.addFeatures(
          list.map(({ code, name, geometry }) => {
            const feature = new Feature({ geometry, code, name });
            feature.setId(code);
            return feature;
          }),
        );
        mergedReady = true;
        refresh();
      })
      .catch(() => {
        // the tiled layer stays (with its seams at fractional zooms)
      });

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
    allLayers.forEach((l) => map!.removeLayer(l));
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
    setBasemap(true);
    map = null;
  });

  const api: HubChoroplethApi = { active, def, hover, nameOf, valueText, fitTo };
  provide(HUB_CHOROPLETH_CTX, api);
  return api;
}
