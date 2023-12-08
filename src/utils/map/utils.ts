import { extend, getCenter } from 'ol/extent';
import { GeoJSON } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import { projection } from '../constants';
import { serializeQuery } from '../requests';
import type { Feature } from 'ol';
import { Geometry, LineString, Point } from 'ol/geom';

export function dataToFeatureCollection(data: any) {
  if (!data) return data;

  if (!Array.isArray(data)) {
    if (data.type === 'FeatureCollection') return data;
    data = [data];
  }
  const bbox = data.reduce(
    (acc: any, item: any) => (acc ? extend(acc, item.bbox) : item.bbox),
    null,
  );

  return {
    features: data,
    bbox,
    type: 'FeatureCollection',
  };
}

export function getGeometriesFromFeaturesArray(data: any[]) {
  return data.map((item) => item.geometry).filter((item) => !!item);
}

export function getPropertiesFromFeaturesArray(data: any[], _layerTitle?: string) {
  return data
    .map((item) => ({ ...item.properties, featureId: item.id, _layerTitle }))
    .filter((item) => !!item);
}

export function featureCollectionToExtent(
  data: any,
  featureProjection?: any,
  dataProjection = projection,
) {
  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(data, {
      dataProjection,
      featureProjection,
    }),
  });

  const vectorSourceExtent = vectorSource.getExtent();

  return {
    source: vectorSource,
    extent: vectorSourceExtent,
  };
}

export function WMSFeatureQuery(query: string, layers: string | string[]) {
  if (!Array.isArray(layers)) {
    layers = layers.split(',');
  }
  layers = layers.filter((layer) => query.includes(`${layer}:`)).join(',');
  return serializeQuery({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    QUERY_LAYERS: layers,
    LAYERS: layers,
    FILTER: query,
    INFO_FORMAT: 'application/json',
    SRS: projection,
    WIDTH: 10000,
    HEIGHT: 10000,
    WITH_GEOMETRY: true,
    FEATURE_COUNT: 100,
  });
}

export function WMSLegendRequest(layers: string | string[], proj: string = projection) {
  if (Array.isArray(layers)) {
    layers = layers.join(',');
  }

  return serializeQuery({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetLegendGraphic',
    LAYERS: layers,
    FORMAT: 'application/json',
    SRS: proj,
    STYLE: 'default',
  });
}

export function parseRouteParams(params: any, items: string[]) {
  const parsed: any = {};

  const parseValue = (key: string) => {
    const tryParsing = (value: any) => {
      try {
        return JSON.parse(value);
      } catch (err) {
        return value;
      }
    };

    if (params[key]) {
      return tryParsing(params[key]);
    } else if (params[`${key}[]`]) {
      const result = tryParsing(params[`${key}[]`]);

      if (result && !Array.isArray(result)) {
        return [result];
      }
      return result;
    }
  };

  items.forEach((item) => {
    const value = parseValue(item);
    if (!value) return;

    parsed[item] = value;
  });

  return parsed;
}

function toPointCoordsByExtent(geometry: Geometry) {
  const extent = geometry?.getExtent();
  let coords = getCenter(extent as any);
  if (Array.isArray(coords?.[0])) {
    coords = coords[0];
  }
  return coords;
}

function toPointByLineCenter(lineString: Geometry) {
  let coords = (lineString as LineString).getCoordinateAt(0.5);
  if (Array.isArray(coords?.[0])) {
    coords = coords[0];
  }
  return coords;
}

export function featureToPoint(feature: Feature) {
  const geometry = feature?.getGeometry();
  const type = geometry?.getType() || '';

  if (!geometry || !type) return;

  if (['Polygon', 'MultiPolygon', 'MultiPoint'].includes(type)) {
    return new Point(toPointCoordsByExtent(geometry));
  } else if (['LineString', 'MultiLineString'].includes(type)) {
    return new Point(toPointByLineCenter(geometry));
  }
}

export function convertFeaturesToPoints(features: Feature[], types?: string[]) {
  const resultFeatures: Feature[] = [];

  if (!types?.length) return features;

  for (const feature of features) {
    const type = feature?.getGeometry()?.getType() || '';

    if (!type) continue;

    // for now - convert to points only!
    if (!types.includes(type) && types.includes('Point')) {
      const point = featureToPoint(feature);
      if (!point) {
        throw new Error(`Geometry type ${type} is not supported`);
      }

      feature.setGeometry(point);
    }

    resultFeatures.push(feature);
  }

  return resultFeatures;
}
