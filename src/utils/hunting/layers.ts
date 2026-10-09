import { Feature } from 'ol';
import { MVT } from 'ol/format';
import { Point } from 'ol/geom';
import type { FeatureLike } from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import { transform } from 'ol/proj';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
// @ts-expect-error ol-pmtiles has no types
import { PMTilesVectorSource } from 'ol-pmtiles';
import { boundariesHost } from '@/config';
import { projection, projection3857 } from '@/utils/constants';
import type { WolfRecord } from './types';

// Layer ids (set with layer.set('id', ...)); used by mapLayers.click / pointerCursor.
export const WOLVES_MUNICIPALITIES_LAYER_ID = 'huntingWolvesMunicipalities';
export const WOLVES_CLUSTER_LAYER_ID = 'huntingWolvesCluster';
export const WOLVES_SELECTION_LAYER_ID = 'huntingWolvesSelection';

export const WOLF_COLOR = '#B45309';
export const WOLF_STROKE_COLOR = '#ffffff';
export const SELECTION_COLOR = '#1D4ED8';
export const MUNICIPALITY_OUTLINE_COLOR = 'rgba(55,65,81,0.45)';
export const MUNICIPALITY_SELECTED_COLOR = '#1f2937';

const SINGLE_RADIUS = 7;

/** Circle radius of a cluster of `n` wolves (n = 1 is a single wolf). */
export function clusterRadius(n: number) {
  if (n <= 1) return SINGLE_RADIUS;
  return Math.min(26, 10 + 4 * Math.log2(n));
}

/** Map feature of one record: the 1 km cell centre in EPSG:3857, id = record id. */
export function createWolfFeature(record: WolfRecord) {
  const feature = new Feature({
    geometry: new Point(transform([record.x, record.y], projection, projection3857)),
  });
  feature.setId(record.id);
  feature.set('record', record);
  return feature;
}

/** Records behind a cluster feature, newest first (day desc, then id). */
export function clusterRecords(clusterFeature: FeatureLike): WolfRecord[] {
  const members: Feature[] = clusterFeature.get('features') || [];
  return members
    .map((f) => f.get('record') as WolfRecord)
    .filter(Boolean)
    .sort((a, b) => (a.day === b.day ? a.id.localeCompare(b.id) : a.day < b.day ? 1 : -1));
}

/** True when every record sits in the same 1 km cell. */
export function sameCell(records: WolfRecord[]) {
  return records.every((r) => r.x === records[0]?.x && r.y === records[0]?.y);
}

// Styles are cached: one per cluster size (the label differs per n).
const clusterStyleCache = new Map<number, Style>();

function clusterStyle(n: number) {
  let style = clusterStyleCache.get(n);
  if (style) return style;

  style = new Style({
    image: new Circle({
      radius: clusterRadius(n),
      fill: new Fill({ color: WOLF_COLOR }),
      stroke: new Stroke({ color: WOLF_STROKE_COLOR, width: 2 }),
    }),
    text:
      n > 1
        ? new Text({
            text: `${n}`,
            font: '600 12px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            overflow: true,
          })
        : undefined,
  });
  clusterStyleCache.set(n, style);
  return style;
}

const selectionStyleCache = new Map<number, Style>();

function selectionStyle(n: number) {
  let style = selectionStyleCache.get(n);
  if (style) return style;

  style = new Style({
    image: new Circle({
      radius: clusterRadius(n) + 4,
      stroke: new Stroke({ color: SELECTION_COLOR, width: 3 }),
    }),
  });
  selectionStyleCache.set(n, style);
  return style;
}

const municipalityStyle = new Style({
  stroke: new Stroke({ color: MUNICIPALITY_OUTLINE_COLOR, width: 1 }),
  // near-transparent fill keeps the polygons hit-detectable
  fill: new Fill({ color: 'rgba(255,255,255,0.01)' }),
});

const municipalitySelectedStyle = new Style({
  stroke: new Stroke({ color: MUNICIPALITY_SELECTED_COLOR, width: 2.5 }),
  fill: new Fill({ color: 'rgba(255,255,255,0.01)' }),
});

export interface WolvesLayers {
  municipalities: VectorTileLayer<any>;
  cluster: VectorLayer<any>;
  selection: VectorLayer<any>;
  /** Plain source holding one feature per visible record; the cluster reads it. */
  wolvesSource: VectorSource;
  clusterSource: Cluster<Feature>;
  selectionSource: VectorSource;
  /** P1: highlight one municipality outline (null = none). */
  setSelectedMunicipality(code: number | null): void;
  all(): (VectorTileLayer<any> | VectorLayer<any>)[];
}

/** Creates new layer objects on every call; nothing is shared with src/utils/layers. */
export function createWolvesLayers(): WolvesLayers {
  let selectedMunicipality: number | null = null;

  const municipalities = new VectorTileLayer({
    renderMode: 'vector',
    zIndex: 10,
    source: new PMTilesVectorSource({
      url: `${boundariesHost}/tiles/municipalities.pmtiles`,
      overlaps: false,
      projection: projection3857,
      format: new MVT({ featureClass: Feature as any, idProperty: 'code' }),
    }),
    style: (feature) =>
      selectedMunicipality !== null && Number(feature.getId()) === selectedMunicipality
        ? municipalitySelectedStyle
        : municipalityStyle,
  });
  municipalities.set('id', WOLVES_MUNICIPALITIES_LAYER_ID);

  const wolvesSource = new VectorSource();
  const clusterSource = new Cluster({ distance: 40, minDistance: 16, source: wolvesSource });
  const cluster = new VectorLayer({
    zIndex: 20,
    source: clusterSource,
    style: (feature) => clusterStyle((feature.get('features') || []).length),
  });
  cluster.set('id', WOLVES_CLUSTER_LAYER_ID);

  const selectionSource = new VectorSource();
  const selection = new VectorLayer({
    zIndex: 21,
    source: selectionSource,
    style: (feature) => selectionStyle(feature.get('size') || 1),
  });
  selection.set('id', WOLVES_SELECTION_LAYER_ID);

  return {
    municipalities,
    cluster,
    selection,
    wolvesSource,
    clusterSource,
    selectionSource,
    setSelectedMunicipality(code) {
      if (selectedMunicipality === code) return;
      selectedMunicipality = code;
      municipalities.changed();
    },
    all: () => [municipalities, cluster, selection],
  };
}
