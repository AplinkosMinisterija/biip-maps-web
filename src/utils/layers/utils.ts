import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Stroke, Style } from 'ol/style';
import { geosjonLoaderFn, wmsImageLoaderFn } from '../requests';
import { GeoJSON } from 'ol/format';
import { projection } from '../constants';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import type { ServerType } from 'ol/source/wms';

export function getVectorLayer(
  url: string,
  opts?: {
    stroke?: {
      color: string;
      width: number;
    };
    showOnUrlChange?: boolean;
    queryOptions?: Function;
    dataProjection?: string;
  },
) {
  const layer = new VectorLayer({
    style: new Style({
      stroke: new Stroke({
        color: opts?.stroke?.color,
        width: opts?.stroke?.width || 1,
      }),
    }),
  });

  const setFeaturesFn = (data: any) => layer.getSource()?.addFeatures(data);
  const source = new VectorSource({
    loader: geosjonLoaderFn(url, setFeaturesFn, opts?.queryOptions, opts?.dataProjection),
    format: new GeoJSON({
      dataProjection: projection,
    }),
  });

  layer.on('propertychange', (event) => {
    if (event?.key !== 'url') return;
    const url = layer.get('url');
    source.setLoader(geosjonLoaderFn(url, setFeaturesFn, opts?.queryOptions, opts?.dataProjection));
    layer.setVisible(!!opts?.showOnUrlChange && !!url);
  });

  layer.setSource(source);
  layer.setVisible(!!url);
  layer.set('type', 'geojson');
  return layer;
}

export function getWMSImageLayer(
  url: string,
  layers: string,
  attributions: string,
  opts?: {
    serverType?: ServerType;
    requestHeaders?: any;
  },
) {
  const imageLoadFunction = wmsImageLoaderFn(opts?.requestHeaders);

  const layer = new ImageLayer({
    source: new ImageWMS({
      url,
      params: {
        LAYERS: layers,
        VERSION: '1.1.1',
        FILTER: '',
      },
      imageLoadFunction,
      crossOrigin: 'anonymous',
      ratio: 1,
      serverType: opts?.serverType || 'qgis',
      attributions,
    }),
  });

  layer.set('type', 'WMS');
  return layer;
}
