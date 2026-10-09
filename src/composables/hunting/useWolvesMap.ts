import { inject, onBeforeUnmount, onMounted, provide, ref, toRaw, watch } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import { useRoute } from 'vue-router';
import { Feature } from 'ol';
import type { Map, MapBrowserEvent } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import type { Point } from 'ol/geom';
import { boundingExtent } from 'ol/extent';
import { transform, transformExtent } from 'ol/proj';
import { projection, projection3857, vectorPositron } from '@/utils';
import type { WolfRecord } from '@/utils/hunting/types';
import {
  WOLVES_CLUSTER_LAYER_ID,
  clusterRecords,
  createWolfFeature,
  createWolvesLayers,
  sameCell,
} from '@/utils/hunting/layers';
import type { WolvesContext } from './context';

const MAX_ZOOM = 13; // at 1 km precision deeper zoom only suggests accuracy that is not there
const CLUSTER_ZOOM_LIMIT = 11; // below this zoom a multi-cell cluster click zooms in
const CLUSTER_FIT_MAX_ZOOM = 12;
const RECORD_ZOOM = 11; // "Rodyti žemėlapyje" centres the wolf at this zoom

export interface WolvesMapApi {
  /** Bumped after each completed map render; read it in computeds that query rendered tiles. */
  renderTick: Ref<number>;
  /** P0 fallback: name of the rendered municipality tile feature under the record (null if not rendered). */
  municipalityNameOf(record: WolfRecord): string | null;
  /** Centre on one cell at zoom 11, or fit several cells. */
  zoomToRecords(ids: string[]): void;
  /** Move focus to the map container (used when the card closes without another opener). */
  focusMap(): void;
}

export const WOLVES_MAP_CTX: InjectionKey<WolvesMapApi> = Symbol('huntingWolvesMap');

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Map area covered by the route's panels (§7): left panel on desktop/tablet, top bar and
// collapsed sheet on phones. [top, right, bottom, left] in px.
function panelPadding(): number[] {
  const width = window.innerWidth;
  if (width >= 1024) return [0, 0, 0, 416];
  if (width >= 768) return [0, 0, 0, 376];
  return [150, 0, 180, 0];
}

/**
 * Wolves map: adds the route's own layers on mount and removes them on unmount, keeps the
 * cluster source in sync with `ctx.derived.filtered`, handles clicks without network
 * requests and draws the selection ring. Call it once from the route's setup().
 */
export function useWolvesMap(ctx: WolvesContext): WolvesMapApi {
  const mapLayers: any = inject('mapLayers');
  const layers = createWolvesLayers();
  const renderTick = ref(0);

  // features are built once per dataset and reused on every filter change
  let featuresDataset: unknown = null;
  let featureById = new globalThis.Map<string, Feature>();
  let visibleIds = new Set<string>();

  // a selection made by a map click must not move the map; any other (table) does
  let mapSelectionKey: string | null = null;

  let map: Map | null = null;
  let mounted = false;
  let previousMaxZoom: number | undefined;
  let previousPadding: number[] | undefined;
  const route = useRoute();
  let previousPointerLayers: string[] = [];
  let clickEntry: any = null;

  // one base layer, added only if the route has not added it already
  if (!mapLayers.baseLayers?.some((l: any) => l?.id === vectorPositron.id)) {
    mapLayers.addBaseLayer(vectorPositron.id);
  }

  function ensureFeatures() {
    const dataset = ctx.data.dataset.value;
    if (dataset === featuresDataset) return;
    featuresDataset = dataset;
    featureById = new globalThis.Map();
    dataset?.records.forEach((record) => featureById.set(record.id, createWolfFeature(record)));
  }

  function syncFeatures(records: WolfRecord[]) {
    ensureFeatures();
    const features: Feature[] = [];
    visibleIds = new Set();
    records.forEach((record) => {
      const feature = featureById.get(record.id);
      if (!feature) return;
      features.push(feature);
      visibleIds.add(record.id);
    });
    layers.wolvesSource.clear(true);
    layers.wolvesSource.addFeatures(features);
  }

  function currentSelectedId() {
    const sel = ctx.state.selection.value;
    return sel?.ids[sel.index] ?? null;
  }

  function updateSelectionRing() {
    layers.selectionSource.clear(true);
    const id = currentSelectedId();
    if (!id || !visibleIds.has(id)) return;
    const member = featureById.get(id);
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

  function zoomToRecords(ids: string[]) {
    if (!map) return;
    ensureFeatures();
    const records = ids
      .map((id) => featureById.get(id)?.get('record') as WolfRecord | undefined)
      .filter((r): r is WolfRecord => !!r);
    if (!records.length) return;

    const animate = !prefersReducedMotion();
    if (sameCell(records)) {
      const center = transform([records[0].x, records[0].y], projection, projection3857);
      const view = map.getView();
      if (animate) {
        view.animate({ center, zoom: RECORD_ZOOM, duration: 500 });
      } else {
        view.setCenter(center);
        view.setZoom(RECORD_ZOOM);
      }
      return;
    }

    const extent = boundingExtent(
      records.map((r) => transform([r.x, r.y], projection, projection3857)),
    );
    mapLayers.zoomToExtent(extent, { padding: 64, animate, maxZoom: CLUSTER_FIT_MAX_ZOOM });
  }

  function focusMap() {
    const el = map?.getTargetElement() as HTMLElement | undefined;
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  function municipalityNameOf(record: WolfRecord): string | null {
    if (record.municipalityName) return record.municipalityName;
    if (!map) return null;
    const size = map.getSize();
    const pixel = map.getPixelFromCoordinate(
      transform([record.x, record.y], projection, projection3857),
    );
    if (!size || !pixel || pixel[0] < 0 || pixel[1] < 0 || pixel[0] > size[0] || pixel[1] > size[1])
      return null;
    const name = map.forEachFeatureAtPixel(pixel, (f: FeatureLike) => f.get('name'), {
      layerFilter: (l) => l === layers.municipalities,
      hitTolerance: 0,
    });
    return typeof name === 'string' && name ? name : null;
  }

  // P1: municipality toggle on click only once the P1 attribution has filled the records
  function hasMunicipalityAttribution() {
    const first = ctx.data.dataset.value?.records[0];
    return !!first && first.municipalityCode !== undefined;
  }

  function onClick(e: MapBrowserEvent<any> & { features: FeatureLike[] }) {
    if (!mounted || !map) return;
    const cluster = e.features?.[0];

    if (!cluster) {
      ctx.state.clearSelection();
      if (hasMunicipalityAttribution()) {
        const code = map.forEachFeatureAtPixel(e.pixel, (f: FeatureLike) => f.getId(), {
          layerFilter: (l) => l === layers.municipalities,
        });
        if (code !== undefined && code !== null) {
          const num = Number(code);
          ctx.state.sav.value = ctx.state.sav.value === num ? null : num;
        }
      }
      return;
    }

    const records = clusterRecords(cluster);
    if (!records.length) return;
    const zoom = map.getView().getZoom() ?? 0;

    if (records.length > 1 && zoom < CLUSTER_ZOOM_LIMIT && !sameCell(records)) {
      const extent = boundingExtent(
        records.map((r) => transform([r.x, r.y], projection, projection3857)),
      );
      mapLayers.zoomToExtent(extent, {
        padding: 64,
        animate: !prefersReducedMotion(),
        maxZoom: CLUSTER_FIT_MAX_ZOOM,
      });
      return;
    }

    const ids = records.map((r) => r.id);
    mapSelectionKey = ids.join('|');
    ctx.state.select(ids, { zoom: false });
  }

  const onClusterChange = () => updateSelectionRing();
  const onRenderComplete = () => {
    renderTick.value++;
  };
  const onMoveEnd = () => {
    if (!map) return;
    const size = map.getSize();
    if (!size) return;
    const extent = transformExtent(
      map.getView().calculateExtent(size),
      projection3857,
      projection,
    ) as [number, number, number, number];
    ctx.state.mapExtent3346.value = extent;
  };

  watch(
    () => ctx.derived.filtered.value,
    (records) => {
      syncFeatures(records || []);
      const id = currentSelectedId();
      if (id && !visibleIds.has(id)) {
        ctx.state.clearSelection();
      }
      updateSelectionRing();
    },
    { immediate: true },
  );

  watch(
    () => {
      const sel = ctx.state.selection.value;
      return sel ? `${sel.ids.join('|')}#${sel.index}` : '';
    },
    (key, oldKey) => {
      updateSelectionRing();
      const idsKey = key.split('#')[0];
      const oldIdsKey = (oldKey || '').split('#')[0];
      if (idsKey && idsKey !== oldIdsKey) {
        if (idsKey !== mapSelectionKey) {
          zoomToRecords(idsKey.split('|'));
        }
      }
      mapSelectionKey = null;
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
    // mapLayers lives in a Pinia store, so its map is a reactive proxy; work on the raw OL map
    // (layer identity checks in layerFilter and per-frame calls would otherwise go through the proxy)
    map = toRaw(mapLayers.map) as Map;

    layers.all().forEach((layer) => map!.addLayer(layer));

    previousPointerLayers = (mapLayers as any)._pointerCursorLayers || [];
    mapLayers.pointerCursor([WOLVES_CLUSTER_LAYER_ID]);

    mapLayers.click(onClick, { layers: [WOLVES_CLUSTER_LAYER_ID] });
    const callbacks: any[] = (mapLayers as any)._clickCallbacks || [];
    clickEntry = callbacks.find((c) => c.cb === onClick) || null;

    const view = map.getView();
    previousMaxZoom = view.getMaxZoom();
    view.setMaxZoom(MAX_ZOOM);

    // Keep Lithuania clear of the floating panels: the view centres and fits inside the
    // uncovered area. The URL's x/y/z (App.vue) still wins.
    previousPadding = view.padding;
    view.padding = panelPadding();
    if (!route.query.x || !route.query.y) mapLayers.centerMap();

    layers.clusterSource.on('change', onClusterChange);
    map.on('rendercomplete', onRenderComplete);
    map.on('moveend', onMoveEnd);
    onMoveEnd();
    updateSelectionRing();
  });

  onBeforeUnmount(() => {
    mounted = false;
    if (!map) return;

    layers.all().forEach((layer) => map!.removeLayer(layer));

    // MapLayers has no API to remove a click callback; drop ours so it does not outlive the route
    const callbacks: any[] = (mapLayers as any)._clickCallbacks;
    if (clickEntry && Array.isArray(callbacks)) {
      const idx = callbacks.indexOf(clickEntry);
      if (idx >= 0) callbacks.splice(idx, 1);
    }
    mapLayers.pointerCursor(previousPointerLayers);
    const viewport = map.getViewport();
    if (viewport) viewport.style.cursor = '';

    if (previousMaxZoom !== undefined) map.getView().setMaxZoom(previousMaxZoom);
    map.getView().padding = previousPadding || [0, 0, 0, 0];

    layers.clusterSource.un('change', onClusterChange);
    map.un('rendercomplete', onRenderComplete);
    map.un('moveend', onMoveEnd);
    map = null;
  });

  const api: WolvesMapApi = { renderTick, municipalityNameOf, zoomToRecords, focusMap };
  provide(WOLVES_MAP_CTX, api);
  return api;
}
