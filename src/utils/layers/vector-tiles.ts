import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { Feature } from 'ol';
import { projection3857 } from '../constants';
import { qgisTilesUrl } from '@/config';
import { vectorTileStyles } from './styling';

function getVectorTilesUrl(type: string, source: string) {
  return `${qgisTilesUrl}/${type}/${source}/{z}/{x}/{y}`;
}

export const municipalitiesServiceVT = {
  id: 'municipalitiesServiceVT',
  name: 'Savivaldybės',
  layer: new VectorTileLayer({
    renderMode: 'vector',
    declutter: true,
    source: new VectorTileSource({
      overlaps: false,
      projection: projection3857,
      format: new MVT({
        featureClass: Feature,
        idProperty: 'code',
      }),

      tileSize: [512, 512],
      url: getVectorTilesUrl('boundaries', 'municipalities'),
    }),
    style: vectorTileStyles({ layerPrefix: 'boundaries' }),
  }),
};
