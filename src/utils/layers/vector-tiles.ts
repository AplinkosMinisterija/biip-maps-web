import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { Feature } from 'ol';
import { projection3857 } from '../constants';
import { qgisTilesUrl, smalsuolisApiHost } from '@/config';
import { vectorTileStyles } from './styling';
import LayerGroup from 'ol/layer/Group';
// @ts-expect-error pmtiles doesn't have types :(
import { PMTilesVectorSource } from 'ol-pmtiles';

function getVectorTilesUrl(type: string, source: string, baseUrl?: string) {
  return `${baseUrl || qgisTilesUrl}/${type}/${source}/{z}/{x}/{y}`;
}

function getVectorTileLayer(
  type: string,
  source: string,
  opts?: { idProperty?: string; declutter?: boolean; tileSize?: number; baseUrl?: string },
) {
  const tileSize = opts?.tileSize || 512;
  return new VectorTileLayer({
    renderMode: 'vector',
    declutter: !!opts?.declutter,
    source: new VectorTileSource({
      overlaps: false,
      projection: projection3857,
      format: new MVT({
        featureClass: Feature,
        idProperty: opts?.idProperty,
      }),

      tileSize: [tileSize, tileSize],
      url: getVectorTilesUrl(type, source, opts?.baseUrl),
    }),
    style: vectorTileStyles({ layerPrefix: type }),
  });
}

export const municipalitiesServiceVT = {
  id: 'municipalitiesServiceVT',
  name: 'Savivaldybės',
  layer: new VectorTileLayer({
    declutter: true,
    source: new PMTilesVectorSource({
      url: 'https://boundaries.startupgov.lt/pmtiles/municipalities.pmtiles',
      attributions: ['© VĮ Registrų centras'],
      overlaps: false,
    }),
    style: vectorTileStyles({ layerPrefix: 'boundaries' }),
  }),
};

export const municipalitiesCentroidServiceVT = {
  id: 'municipalitiesCentroidServiceVT',
  name: 'Savivaldybės',
  layer: getVectorTileLayer('boundaries', 'municipalities_centroid', {
    idProperty: 'code',
    declutter: true,
  }),
};

export const eldershipsServiceVT = {
  id: 'eldershipsServiceVT',
  name: 'Seniūnijos',
  layer: new LayerGroup({
    layers: [
      getVectorTileLayer('boundaries', 'elderships'),
      getVectorTileLayer('boundaries', 'elderships_centroid'),
    ],
  }),
};

export const countiesServiceVT = {
  id: 'countiesServiceVT',
  name: 'Apskritys',
  layer: new LayerGroup({
    layers: [
      getVectorTileLayer('boundaries', 'counties'),
      getVectorTileLayer('boundaries', 'counties_centroid'),
    ],
  }),
};

export const residentialAreasServiceVT = {
  id: 'residentialAreasServiceVT',
  name: 'Gyvenamosios vietovės',
  layer: new LayerGroup({
    layers: [
      getVectorTileLayer('boundaries', 'residential_areas'),
      getVectorTileLayer('boundaries', 'residential_areas_centroid'),
    ],
  }),
};

export const uetkMergedCentroidServiceVT = {
  id: 'uetkMergedCentroidServiceVT',
  name: 'UETK',
  layer: getVectorTileLayer('uetk', 'uetk_merged.1', {
    idProperty: 'cadastral_id',
  }),
};

export const zuvinimasServiceVT = {
  id: 'zuvinimasServiceVT',
  name: 'Įžuvinimas',
  layer: getVectorTileLayer('zuvinimas', 'fish_stockings', {
    idProperty: 'id',
  }),
};

export const smalsuolisServiceVT = {
  id: 'smalsuolisServiceVT',
  name: 'Smalsuolis',
  layer: getVectorTileLayer('tiles', 'events', {
    idProperty: 'id',
    baseUrl: smalsuolisApiHost,
  }),
};

smalsuolisServiceVT.layer.set('type', 'vt');
