// P1: municipality attribution for wolf records (SPEC §9).
// Reads the z7 tiles of the public boundaries PMTiles archive once, then assigns each
// record to the municipality polygon that contains its raw (unsnapped) location.
// Pure module: no Vue imports; the caller decides when to run it and how to react.
import { PMTiles } from 'pmtiles';
import { MVT, GeoJSON } from 'ol/format';
import { Feature } from 'ol';
import { createXYZ } from 'ol/tilegrid';
import { transform } from 'ol/proj';
import { createEmpty, extend, type Extent } from 'ol/extent';
import { booleanPointInPolygon } from '@turf/turf';
import { boundariesHost } from '@/config';
import { projection } from '@/utils/constants'; // also registers EPSG:3346 with proj4
import type { WolfRecord } from './types';

const ZOOM = 7;
// Lithuania bounds 19.01,53.88 – 26.83,56.46 at z7 (standard XYZ formula).
const TILE_X = [70, 71, 72, 73];
const TILE_Y = [39, 40, 41];

export interface MunicipalityInfo {
  code: number;
  name: string;
  extent3857: Extent; // union of the municipality's tile features (for map fitting)
}

export interface MunicipalityIndex {
  list: MunicipalityInfo[]; // sorted by name (lt)
  byCode: Record<number, MunicipalityInfo>;
  tiles: Record<string, { code: number; name: string; geometry: any }[]>; // `${x}/${y}`
}

const tileGrid = createXYZ({ tileSize: 512 });
const geoJson = new GeoJSON();

let indexPromise: Promise<MunicipalityIndex> | null = null;

async function buildIndex(): Promise<MunicipalityIndex> {
  const pm = new PMTiles(`${boundariesHost}/tiles/municipalities.pmtiles`);
  const format = new MVT({ featureClass: Feature, layers: ['municipalities'] });

  const coords = TILE_X.flatMap((x) => TILE_Y.map((y) => [x, y]));
  const responses = await Promise.all(coords.map(([x, y]) => pm.getZxy(ZOOM, x, y)));

  const tiles: MunicipalityIndex['tiles'] = {};
  const byCode: Record<number, MunicipalityInfo> = {};

  responses.forEach((response, i) => {
    if (!response?.data) return;
    const [x, y] = coords[i];
    const extent = tileGrid.getTileCoordExtent([ZOOM, x, y]);
    const features = format.readFeatures(response.data, {
      extent,
      featureProjection: 'EPSG:3857',
    }) as Feature[];

    tiles[`${x}/${y}`] = features
      .filter((feature) => feature.getGeometry())
      .map((feature) => {
        const code = Number(feature.get('code'));
        const name = `${feature.get('name') || ''}`;
        const geometry = feature.getGeometry()!;
        const info = byCode[code] || (byCode[code] = { code, name, extent3857: createEmpty() });
        extend(info.extent3857, geometry.getExtent());
        return { code, name, geometry: geoJson.writeFeatureObject(feature).geometry };
      });
  });

  const list = Object.values(byCode).sort((a, b) => a.name.localeCompare(b.name, 'lt'));
  if (!list.length) throw new Error('No municipality polygons found');

  return { list, byCode, tiles };
}

// Memoised: the archive is read once per page load; a failed attempt can be retried.
export function loadMunicipalityIndex(): Promise<MunicipalityIndex> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

function tileOf(coordinate3857: number[]) {
  const [, x, y] = tileGrid.getTileCoordForCoordAndZ(coordinate3857, ZOOM);
  return [x, y];
}

export function findMunicipality(
  index: MunicipalityIndex,
  x3346: number,
  y3346: number,
): MunicipalityInfo | null {
  const point = transform([x3346, y3346], projection, 'EPSG:3857');
  const [tx, ty] = tileOf(point);

  // Own tile first, then the 8 neighbours.
  const candidates = [[tx, ty]];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx || dy) candidates.push([tx + dx, ty + dy]);
    }
  }

  for (const [x, y] of candidates) {
    const polygons = index.tiles[`${x}/${y}`];
    if (!polygons) continue;
    const hit = polygons.find((p) => booleanPointInPolygon(point, p.geometry));
    if (hit) return index.byCode[hit.code] || null;
  }
  return null;
}

// Sets `municipalityCode` / `municipalityName` on every record (null when unassigned).
// Mutates the records in place; returns how many were assigned.
export function assignMunicipalities(records: WolfRecord[], index: MunicipalityIndex): number {
  let assigned = 0;
  for (const record of records) {
    const found = findMunicipality(index, record.rawX, record.rawY);
    record.municipalityCode = found?.code ?? null;
    record.municipalityName = found?.name ?? null;
    if (found) assigned++;
  }
  return assigned;
}

// True once assignMunicipalities() has run on this dataset.
export function hasMunicipalities(records: WolfRecord[]): boolean {
  return records.length > 0 && records[0].municipalityCode !== undefined;
}
