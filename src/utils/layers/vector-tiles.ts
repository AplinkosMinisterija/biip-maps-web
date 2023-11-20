import { Fill, Stroke, Style } from 'ol/style';

import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { Feature } from 'ol';
import { projection3857 } from '../constants';
import { qgisServerHost } from '@/config';

function getVectorTilesUrl(type: string, source: string) {
  return `${qgisServerHost}/tiles/${type}/${source}/{z}/{x}/{y}`;
}

const country = new Style({
  stroke: new Stroke({
    color: 'gray',
    width: 1,
  }),
  fill: new Fill({
    color: 'rgba(20,20,20,0.3)',
  }),
});

export const municipalitiesServiceVT = {
  id: 'municipalitiesServiceVT',
  name: 'Savivaldybės',
  layer: new VectorTileLayer({
    source: new VectorTileSource({
      projection: projection3857,
      format: new MVT({
        featureClass: Feature,
      }),

      tileSize: [512, 512],
      url: getVectorTilesUrl('boundaries', 'municipalities'),
    }),
  }),
  style: country,
};
