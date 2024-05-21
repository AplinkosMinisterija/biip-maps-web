import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { Feature } from 'ol';
import { projection3857 } from '../constants';
import { qgisTilesUrl, smalsuolisApiHost } from '@/config';
import { vectorTileStyles } from './styling';
import LayerGroup from 'ol/layer/Group';
import { PakmapsLayer, PakmapsLayerType } from '@/libs/pak-maps';

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

export const municipalitiesServiceVT = new PakmapsLayer({
  id: 'municipalitiesServiceVT',
  name: 'Savivaldybės',
  layer: getVectorTileLayer('boundaries', 'municipalities', {
    idProperty: 'code',
    declutter: true,
  }),
  type: PakmapsLayerType.VectorTiles,
});

export const municipalitiesCentroidServiceVT = new PakmapsLayer({
  id: 'municipalitiesCentroidServiceVT',
  name: 'Savivaldybės',
  layer: getVectorTileLayer('boundaries', 'municipalities_centroid', {
    idProperty: 'code',
    declutter: true,
  }),
  type: PakmapsLayerType.VectorTiles,
});

export const eldershipsServiceVT = new PakmapsLayer({
  id: 'eldershipsServiceVT',
  name: 'Seniūnijos',
  layer: new LayerGroup({
    layers: [
      getVectorTileLayer('boundaries', 'elderships'),
      getVectorTileLayer('boundaries', 'elderships_centroid'),
    ],
  }),
  type: PakmapsLayerType.VectorTiles,
});

export const countiesServiceVT = new PakmapsLayer({
  id: 'countiesServiceVT',
  name: 'Apskritys',
  layer: new LayerGroup({
    layers: [
      getVectorTileLayer('boundaries', 'counties'),
      getVectorTileLayer('boundaries', 'counties_centroid'),
    ],
  }),
  type: PakmapsLayerType.VectorTiles,
});

export const residentialAreasServiceVT = new PakmapsLayer({
  id: 'residentialAreasServiceVT',
  name: 'Gyvenamosios vietovės',
  layer: new LayerGroup({
    layers: [
      getVectorTileLayer('boundaries', 'residential_areas'),
      getVectorTileLayer('boundaries', 'residential_areas_centroid'),
    ],
  }),
  type: PakmapsLayerType.VectorTiles,
});

export const uetkMergedCentroidServiceVT = new PakmapsLayer({
  id: 'uetkMergedCentroidServiceVT',
  name: 'UETK',
  layer: getVectorTileLayer('uetk', 'uetk_merged.1', {
    idProperty: 'cadastral_id',
  }),
  type: PakmapsLayerType.VectorTiles,
});

export const zuvinimasServiceVT = new PakmapsLayer({
  id: 'zuvinimasServiceVT',
  name: 'Įžuvinimas',
  layer: getVectorTileLayer('zuvinimas', 'fish_stockings', {
    idProperty: 'id',
  }),
  type: PakmapsLayerType.VectorTiles,
});

export const smalsuolisServiceVT = new PakmapsLayer({
  id: 'smalsuolisServiceVT',
  name: 'Smalsuolis',
  layer: getVectorTileLayer('tiles', 'events', {
    idProperty: 'id',
    baseUrl: smalsuolisApiHost,
  }),
  type: PakmapsLayerType.VectorTiles,
});
