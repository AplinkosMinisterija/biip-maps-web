import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { Feature } from 'ol';
import { projection3857 } from '../constants';
import { qgisTilesUrl } from '@/config';
import { vectorTileStyles } from './styling';
import LayerGroup from 'ol/layer/Group';

function getVectorTilesUrl(type: string, source: string) {
  return `${qgisTilesUrl}/${type}/${source}/{z}/{x}/{y}`;
}

function getVectorTileLayer(type: string, source: string) {
  return new VectorTileLayer({
    renderMode: 'vector',
    declutter: true,
    source: new VectorTileSource({
      overlaps: false,
      projection: projection3857,
      format: new MVT({
        featureClass: Feature,
        idProperty: 'code',
      }),

      tileSize: [256, 256],
      url: getVectorTilesUrl(type, source),
    }),
    style: vectorTileStyles({ layerPrefix: type }),
  });
}

export const municipalitiesServiceVT = {
  id: 'municipalitiesServiceVT',
  name: 'Savivaldybės',
  layer: getVectorTileLayer('boundaries', 'municipalities'),
};

export const municipalitiesCentroidServiceVT = {
  id: 'municipalitiesCentroidServiceVT',
  name: 'Savivaldybės',
  layer: getVectorTileLayer('boundaries', 'municipalities_centroid'),
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
