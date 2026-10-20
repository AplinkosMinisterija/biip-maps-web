// Map layers of the Stebėjimai topic (STEB-SPEC §3.4): one exact point per observation,
// coloured by species, clustered only for legibility (OL Cluster, 40 px), a selection ring
// and the outline of the selected municipality. New layer objects on every call; nothing
// is shared with the wolves layers or src/utils/layers.
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
import { clusterRadius, SELECTION_COLOR } from '@/utils/hunting/layers';
import { compareRecords, type StebRecord } from './model';

// Layer ids (layer.set('id', …)); used by mapLayers.click / pointerCursor.
export const STEB_CLUSTER_LAYER_ID = 'huntingStebCluster';
export const STEB_SELECTION_LAYER_ID = 'huntingStebSelection';
export const STEB_MUNICIPALITIES_LAYER_ID = 'huntingStebMunicipalities';

// Species colours by slug (white 2 px stroke); any other species is grey (§3.4).
export const STEB_SPECIES_COLORS: Readonly<Record<string, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, string>, {
    vilkas: '#B45309',
    lusis: '#7E22CE',
    'rudasis-lokys': '#0F766E',
    stumbras: '#4D7C0F',
  }),
);
export const STEB_OTHER_COLOR = '#4B5563';
export const STEB_MIXED_COLOR = '#374151';
export const STEB_STROKE_COLOR = '#ffffff';
export const STEB_MUNICIPALITY_COLOR = '#1f2937';

/** Colour of a species slug. */
export const speciesColor = (slug: string) => STEB_SPECIES_COLORS[slug] || STEB_OTHER_COLOR;
export const isKnownSpecies = (slug: string) => !!STEB_SPECIES_COLORS[slug];

/** Map feature of one record with a point: EPSG:3857, id = record key. */
export function createStebFeature(record: StebRecord): Feature | null {
  if (record.x === null || record.y === null) return null;
  const feature = new Feature({
    geometry: new Point(transform([record.x, record.y], projection, projection3857)),
  });
  feature.setId(record.key);
  feature.set('record', record);
  return feature;
}

/** Records behind a cluster feature, newest first. */
export function clusterMembers(clusterFeature: FeatureLike): StebRecord[] {
  const members: Feature[] = clusterFeature.get('features') || [];
  return members
    .map((f) => f.get('record') as StebRecord)
    .filter(Boolean)
    .sort(compareRecords);
}

/** True when every record sits at the same point. */
export function samePoint(records: StebRecord[]) {
  return records.every((r) => r.x === records[0]?.x && r.y === records[0]?.y);
}

// Styles are cached per size and colour.
const clusterStyleCache = new Map<string, Style>();

function clusterStyle(n: number, color: string) {
  const key = `${n}|${color}`;
  let style = clusterStyleCache.get(key);
  if (style) return style;
  style = new Style({
    image: new Circle({
      radius: clusterRadius(n),
      fill: new Fill({ color }),
      stroke: new Stroke({ color: STEB_STROKE_COLOR, width: 2 }),
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
  clusterStyleCache.set(key, style);
  return style;
}

/** Fill of a cluster: the species colour when all members share one, else dark grey. */
export function clusterColor(records: StebRecord[]) {
  if (!records.length) return STEB_OTHER_COLOR;
  const slug = records[0].speciesSlug;
  return records.every((r) => r.speciesSlug === slug) ? speciesColor(slug) : STEB_MIXED_COLOR;
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

const municipalitySelectedStyle = new Style({
  stroke: new Stroke({ color: STEB_MUNICIPALITY_COLOR, width: 2.5 }),
});

export interface StebLayers {
  municipalities: VectorTileLayer<any>;
  cluster: VectorLayer<any>;
  selection: VectorLayer<any>;
  /** Plain source with one feature per visible record that has a point. */
  pointSource: VectorSource;
  clusterSource: Cluster<Feature>;
  selectionSource: VectorSource;
  /** Outline one municipality (null = none; the layer is hidden then). */
  setSelectedMunicipality(code: number | null): void;
  all(): (VectorTileLayer<any> | VectorLayer<any>)[];
}

export function createStebLayers(): StebLayers {
  let selectedMunicipality: number | null = null;

  // Only the selected municipality is drawn; without one the layer is hidden (no tiles).
  const municipalities = new VectorTileLayer({
    renderMode: 'vector',
    zIndex: 10,
    visible: false,
    source: new PMTilesVectorSource({
      url: `${boundariesHost}/tiles/municipalities.pmtiles`,
      overlaps: false,
      projection: projection3857,
      format: new MVT({ featureClass: Feature as any, idProperty: 'code' }),
    }),
    style: (feature) =>
      selectedMunicipality !== null && Number(feature.getId()) === selectedMunicipality
        ? municipalitySelectedStyle
        : undefined,
  });
  municipalities.set('id', STEB_MUNICIPALITIES_LAYER_ID);

  const pointSource = new VectorSource();
  const clusterSource = new Cluster({ distance: 40, minDistance: 16, source: pointSource });
  const cluster = new VectorLayer({
    zIndex: 20,
    source: clusterSource,
    style: (feature) => {
      const members: Feature[] = feature.get('features') || [];
      const records = members.map((f) => f.get('record') as StebRecord).filter(Boolean);
      return clusterStyle(members.length, clusterColor(records));
    },
  });
  cluster.set('id', STEB_CLUSTER_LAYER_ID);

  const selectionSource = new VectorSource();
  const selection = new VectorLayer({
    zIndex: 21,
    source: selectionSource,
    style: (feature) => selectionStyle(feature.get('size') || 1),
  });
  selection.set('id', STEB_SELECTION_LAYER_ID);

  return {
    municipalities,
    cluster,
    selection,
    pointSource,
    clusterSource,
    selectionSource,
    setSelectedMunicipality(code) {
      if (selectedMunicipality === code) return;
      selectedMunicipality = code;
      municipalities.setVisible(code !== null);
      municipalities.changed();
    },
    all: () => [municipalities, cluster, selection],
  };
}
