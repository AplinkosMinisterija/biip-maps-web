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
import { SELECTION_HALO, SELECTION_INK, WOLF_COLOR } from './hub/colors';
import type { WolfRecord } from './types';

// Layer ids (set with layer.set('id', ...)); used by mapLayers.click / pointerCursor.
export const WOLVES_MUNICIPALITIES_LAYER_ID = 'huntingWolvesMunicipalities';
export const WOLVES_MUNICIPALITY_OUTLINE_LAYER_ID = 'huntingWolvesMunicipalityOutline';
export const WOLVES_CLUSTER_LAYER_ID = 'huntingWolvesCluster';
export const WOLVES_SELECTION_LAYER_ID = 'huntingWolvesSelection';

// The species colour map (utils/hunting/hub/colors.ts) keeps wolves at #B45309.
export { WOLF_COLOR };
export const WOLF_STROKE_COLOR = '#ffffff';
// Selected point: a dark ring with a white halo outside it, legible on any basemap.
export const SELECTION_COLOR = SELECTION_INK;
export const SELECTION_HALO_COLOR = SELECTION_HALO;
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

const selectionStyleCache = new Map<number, Style[]>();

/** Selection ring of a mark of `n` records: 3 px dark ring, 2 px white halo outside it. */
export function selectionRing(n: number): Style[] {
  let style = selectionStyleCache.get(n);
  if (style) return style;

  const radius = clusterRadius(n) + 4;
  style = [
    new Style({
      image: new Circle({
        radius: radius + 2.5,
        stroke: new Stroke({ color: SELECTION_HALO_COLOR, width: 2 }),
      }),
    }),
    new Style({
      image: new Circle({ radius, stroke: new Stroke({ color: SELECTION_COLOR, width: 3 }) }),
    }),
  ];
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
  /** The selected municipality's outline, on its own layer over `municipalities`. */
  selectedOutline: VectorTileLayer<any>;
  /** P1: highlight one municipality outline (null = none). */
  setSelectedMunicipality(code: number | null): void;
  all(): (VectorTileLayer<any> | VectorLayer<any>)[];
}

/** Creates new layer objects on every call; nothing is shared with src/utils/layers. */
export function createWolvesLayers(): WolvesLayers {
  let selectedMunicipality: number | null = null;

  const municipalitySource = new PMTilesVectorSource({
    url: `${boundariesHost}/tiles/municipalities.pmtiles`,
    overlaps: false,
    projection: projection3857,
    format: new MVT({ featureClass: Feature as any, idProperty: 'code' }),
  });
  const municipalities = new VectorTileLayer({
    renderMode: 'vector',
    zIndex: 10,
    source: municipalitySource,
    style: municipalityStyle,
  });
  municipalities.set('id', WOLVES_MUNICIPALITIES_LAYER_ID);

  // The selection on a layer of its own: with `overlaps: false` OpenLayers strokes the
  // consecutive polygons of a tile as one path with the last feature's stroke, so a selected
  // style among the plain ones also outlined the polygon before it in the tile (Utenos r.
  // sav. outlined Šiaulių m. sav., JOURNEYS-03). Here every other feature has no style.
  const isSelected = (feature: FeatureLike) =>
    selectedMunicipality !== null &&
    Number(feature.getId()) === selectedMunicipality &&
    feature.getGeometry()?.getType() !== 'Point';
  const selectedOutline = new VectorTileLayer({
    renderMode: 'vector',
    zIndex: 11,
    source: municipalitySource,
    style: (feature) => (isSelected(feature) ? municipalitySelectedStyle : undefined),
  });
  selectedOutline.set('id', WOLVES_MUNICIPALITY_OUTLINE_LAYER_ID);

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
    style: (feature) => selectionRing(feature.get('size') || 1),
  });
  selection.set('id', WOLVES_SELECTION_LAYER_ID);

  return {
    municipalities,
    selectedOutline,
    cluster,
    selection,
    wolvesSource,
    clusterSource,
    selectionSource,
    setSelectedMunicipality(code) {
      if (selectedMunicipality === code) return;
      selectedMunicipality = code;
      selectedOutline.changed();
    },
    all: () => [municipalities, selectedOutline, cluster, selection],
  };
}
