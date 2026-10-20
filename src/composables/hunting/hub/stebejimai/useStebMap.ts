// Map of the Stebėjimai topic (STEB-SPEC §3.4): adds the topic's layers on mount and removes
// them on unmount (with the click callback, the pointer cursor and the view padding), keeps
// the point source in sync with the filtered rows, opens the card on a click without any
// request, draws the selection ring, centres on a record from the table and fits the
// points when the user picks a place.
import { inject, nextTick, onBeforeUnmount, onMounted, provide, toRaw, watch } from 'vue';
import type { InjectionKey } from 'vue';
import { useRoute } from 'vue-router';
import { Feature } from 'ol';
import type { Map, MapBrowserEvent } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import type { Point } from 'ol/geom';
import { boundingExtent } from 'ol/extent';
import { transform } from 'ol/proj';
import { projection, projection3857, vectorPositron } from '@/utils';
import type { StebRecord } from '@/utils/hunting/hub/stebejimai/model';
import {
  STEB_CLUSTER_LAYER_ID,
  clusterMembers,
  createStebFeature,
  createStebLayers,
  samePoint,
} from '@/utils/hunting/hub/stebejimai/layers';
import type { StebContext } from './useStebState';

// A cluster of more records than this, below CLUSTER_FIT_BELOW_ZOOM and not at one spot,
// zooms in; any other cluster opens the "1 iš N" card (§3.4).
const CLUSTER_PAGER_MAX = 10;
const CLUSTER_FIT_BELOW_ZOOM = 12;
const CLUSTER_FIT_MAX_ZOOM = 14;
const RECORD_ZOOM = 14; // "Rodyti žemėlapyje"
const PLACE_FIT_MAX_ZOOM = 12; // a place picked by the user
const FIT_PADDING = 64;

export interface StebMapApi {
  /** Centre on one record at zoom 14 (animated unless reduced motion). */
  zoomToRecord(record: StebRecord): void;
  /** Move focus to the map container (the card closed without another opener). */
  focusMap(): void;
}

export const STEB_MAP_CTX: InjectionKey<StebMapApi> = Symbol('huntingStebMap');

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface StebMapOptions {
  /** View padding [top, right, bottom, left] in px; read reactively (drawer, rail, resize). */
  padding: () => number[];
}

export function useStebMap(ctx: StebContext, options: StebMapOptions): StebMapApi {
  const mapLayers: any = inject('mapLayers');
  const route = useRoute();
  const layers = createStebLayers();

  let featuresFor: unknown = null;
  let featureByKey = new globalThis.Map<string, Feature>();
  let visibleKeys = new Set<string>();

  let map: Map | null = null;
  let mounted = false;
  let previousPadding: number[] | undefined;
  let previousPointerLayers: string[] = [];
  let clickEntry: any = null;

  // One base layer, added only if the route has not added it already.
  if (!mapLayers.baseLayers?.some((l: any) => l?.id === vectorPositron.id)) {
    mapLayers.addBaseLayer(vectorPositron.id);
  }

  function ensureFeatures() {
    const records = ctx.data.records.value;
    if (records === featuresFor) return;
    featuresFor = records;
    featureByKey = new globalThis.Map();
    records.forEach((record) => {
      const feature = createStebFeature(record);
      if (feature) featureByKey.set(record.key, feature);
    });
  }

  function syncFeatures(records: StebRecord[]) {
    ensureFeatures();
    const features: Feature[] = [];
    visibleKeys = new Set();
    records.forEach((record) => {
      const feature = featureByKey.get(record.key);
      if (!feature) return;
      features.push(feature);
      visibleKeys.add(record.key);
    });
    layers.pointSource.clear(true);
    layers.pointSource.addFeatures(features);
  }

  function currentKey() {
    const sel = ctx.state.selection.value;
    return sel?.keys[sel.index] ?? null;
  }

  function updateSelectionRing() {
    layers.selectionSource.clear(true);
    const key = currentKey();
    if (!key || !visibleKeys.has(key)) return;
    const member = featureByKey.get(key);
    if (!member) return;
    const cluster = layers.clusterSource
      .getFeatures()
      .find((f: Feature) => (f.get('features') as Feature[] | undefined)?.includes(member));
    const geometry = (cluster || member).getGeometry() as Point | undefined;
    if (!geometry) return;
    const ring = new Feature({ geometry: geometry.clone() });
    ring.set('size', (cluster?.get('features') || [member]).length);
    layers.selectionSource.addFeature(ring);
  }

  const toView = (r: StebRecord) => transform([r.x!, r.y!], projection, projection3857);

  function zoomToRecord(record: StebRecord) {
    if (!map || record.x === null || record.y === null) return;
    const view = map.getView();
    const center = toView(record);
    if (prefersReducedMotion()) {
      view.setCenter(center);
      view.setZoom(RECORD_ZOOM);
    } else {
      view.animate({ center, zoom: RECORD_ZOOM, duration: 500 });
    }
  }

  function fitRecords(records: StebRecord[], maxZoom: number) {
    const located = records.filter((r) => r.x !== null && r.y !== null);
    if (!map || !located.length) return;
    mapLayers.zoomToExtent(boundingExtent(located.map(toView)), {
      padding: FIT_PADDING,
      animate: !prefersReducedMotion(),
      maxZoom,
    });
  }

  function focusMap() {
    const el = map?.getTargetElement() as HTMLElement | undefined;
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  function onClick(e: MapBrowserEvent<any> & { features: FeatureLike[] }) {
    if (!mounted || !map) return;
    const cluster = e.features?.[0];
    // An empty spot only closes the card.
    if (!cluster) {
      ctx.state.clearSelection();
      return;
    }
    const records = clusterMembers(cluster);
    if (!records.length) return;
    const zoom = map.getView().getZoom() ?? 0;
    if (
      records.length > CLUSTER_PAGER_MAX &&
      zoom < CLUSTER_FIT_BELOW_ZOOM &&
      !samePoint(records)
    ) {
      fitRecords(records, CLUSTER_FIT_MAX_ZOOM);
      return;
    }
    // A map click never moves the map; only the table's "Rodyti žemėlapyje" does.
    ctx.state.select(records.map((r) => r.key));
  }

  const onClusterChange = () => updateSelectionRing();

  watch(
    () => ctx.derived.filtered.value,
    (records) => {
      syncFeatures(records || []);
      updateSelectionRing();
    },
    { immediate: true },
  );

  watch(
    () => {
      const sel = ctx.state.selection.value;
      return sel ? `${sel.keys.join('|')}#${sel.index}` : '';
    },
    () => updateSelectionRing(),
  );

  // "Rodyti žemėlapyje" (table, card list): centre on the record.
  watch(
    () => ctx.state.zoomRequest.value?.seq,
    async () => {
      const request = ctx.state.zoomRequest.value;
      if (!request) return;
      // The table may have just closed: let the layout settle first.
      await nextTick();
      const record = ctx.data.records.value.find((r) => r.key === request.key);
      if (record) zoomToRecord(record);
    },
  );

  // A place picked by the user: fit its points (or the whole country for "Visa Lietuva").
  watch(
    () => ctx.state.fitRequest.value,
    async () => {
      await nextTick();
      if (!map) return;
      if (ctx.state.sav.value === null) mapLayers.centerMap();
      else fitRecords(ctx.derived.filtered.value, PLACE_FIT_MAX_ZOOM);
    },
  );

  // The view keeps the content in the area the panels leave free.
  watch(
    () => options.padding().join(','),
    () => {
      if (!map) return;
      // OL keeps the picture still when the padding changes; re-apply the centre so the
      // content moves into the uncovered area.
      const view = map.getView();
      const center = view.getCenter();
      view.padding = options.padding();
      if (center) view.setCenter(center);
    },
  );

  watch(
    () => ctx.state.sav.value,
    (code) => layers.setSelectedMunicipality(code ?? null),
    { immediate: true },
  );

  onMounted(async () => {
    mounted = true;
    await mapLayers.waitForLoaded;
    if (!mounted || !mapLayers.map) return;
    // mapLayers lives in a Pinia store: work on the raw OL map.
    map = toRaw(mapLayers.map) as Map;
    layers.all().forEach((layer) => map!.addLayer(layer));

    previousPointerLayers = (mapLayers as any)._pointerCursorLayers || [];
    mapLayers.pointerCursor([STEB_CLUSTER_LAYER_ID]);
    mapLayers.click(onClick, { layers: [STEB_CLUSTER_LAYER_ID] });
    const callbacks: any[] = (mapLayers as any)._clickCallbacks || [];
    clickEntry = callbacks.find((c) => c.cb === onClick) || null;

    const view = map.getView();
    previousPadding = view.padding;
    view.padding = options.padding();
    if (!route.query.x || !route.query.y) mapLayers.centerMap();

    layers.clusterSource.on('change', onClusterChange);
    updateSelectionRing();
  });

  onBeforeUnmount(() => {
    mounted = false;
    if (!map) return;
    layers.all().forEach((layer) => map!.removeLayer(layer));
    // MapLayers has no API to remove a click callback; drop ours.
    const callbacks: any[] = (mapLayers as any)._clickCallbacks;
    if (clickEntry && Array.isArray(callbacks)) {
      const idx = callbacks.indexOf(clickEntry);
      if (idx >= 0) callbacks.splice(idx, 1);
    }
    mapLayers.pointerCursor(previousPointerLayers);
    const viewport = map.getViewport();
    if (viewport) viewport.style.cursor = '';
    map.getView().padding = previousPadding || [0, 0, 0, 0];
    layers.clusterSource.un('change', onClusterChange);
    map = null;
  });

  const api: StebMapApi = { zoomToRecord, focusMap };
  provide(STEB_MAP_CTX, api);
  return api;
}
