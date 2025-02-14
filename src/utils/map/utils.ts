import turfBuffer from '@turf/buffer';
import type { Feature } from 'ol';
import { extend, getCenter } from 'ol/extent';
import { GeoJSON } from 'ol/format';
import { Geometry, LineString, MultiLineString, Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { projection, projection4326 } from '../constants';
import { serializeQuery } from '../requests';

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

export function applyBufferSizesToFeatureCollection(data: any, dataProjection: any) {
  const hasBufferSizes = data?.features?.some((i: any) => i?.properties?.bufferSize) || false;
  if (!data?.features?.length || !hasBufferSizes) return data;

  // first we need to reproject feature collection to WGS84
  const dataWGS84 = new GeoJSON().writeFeaturesObject(
    new GeoJSON().readFeatures(data, {
      dataProjection,
      featureProjection: projection4326,
    }),
  );

  // then we need to apply conversions (points/lines to polygons by buffer)
  dataWGS84.features =
    dataWGS84?.features?.map((f: any) => {
      if (!f?.properties?.bufferSize) return f;

      const data = turfBuffer(f, f?.properties?.bufferSize, {
        units: 'meters',
      });
      return data;
    }) || [];

  // lastly - convert to feature collection by initial projection
  return new GeoJSON().writeFeaturesObject(
    new GeoJSON().readFeatures(dataWGS84, {
      dataProjection: projection4326,
      featureProjection: dataProjection,
    }),
  );
}

export function featureCollectionToExtent(
  data: any,
  featureProjection?: any,
  opts: {
    dataProjection?: any;
    applyBuffers?: boolean;
  } = {},
) {
  opts.dataProjection = opts?.dataProjection || projection;
  if (opts?.applyBuffers) {
    data = applyBufferSizesToFeatureCollection(data, opts?.dataProjection);
  }

  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(data, {
      dataProjection: opts.dataProjection,
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

function toPointByLineCenter(lineString: LineString) {
  let coords = lineString.getCoordinateAt(0.5);
  if (Array.isArray(coords?.[0])) {
    coords = coords[0];
  }
  return coords;
}

function toPointByMultiLineCenter(multiLine: MultiLineString) {
  const lineStrings = multiLine.getLineStrings();

  let totalLength = 0;
  lineStrings.forEach((line) => {
    totalLength += line.getLength();
  });

  let traveledLength = 0;

  for (const line of lineStrings) {
    let lineLength = line.getLength();
    traveledLength += lineLength;

    if (traveledLength >= totalLength / 2) {
      return line.getCoordinateAt(0.5);
    }
  }

  return [431194.04, 6115464.68]; // Fallback case if no center is found
}
export function featureToPoint(feature: Feature): Point | undefined {
  const geometry = feature?.getGeometry();
  const type = geometry?.getType() || '';

  if (!geometry || !type) return;

  if (['Polygon', 'MultiPolygon', 'MultiPoint'].includes(type)) {
    return new Point(toPointCoordsByExtent(geometry));
  } else if (['MultiLineString'].includes(type)) {
    return new Point(toPointByMultiLineCenter(geometry as MultiLineString));
  } else if (['LineString'].includes(type)) {
    return new Point(toPointByLineCenter(geometry as LineString));
  } else if (['Point'].includes(type)) {
    return geometry as Point;
  }
}

export function convertFeaturesToPoints(features: Feature[], types?: string[]) {
  const resultFeatures: Feature[] = [];

  if (!types?.length) return features;

  for (const feature of features) {
    const type = feature?.getGeometry()?.getType() || '';

    if (!type) continue;

    // Add features if their type matches, or convert to points if possible; otherwise, skip.
    if (types.includes(type)) {
      resultFeatures.push(feature);
    } else if (!types.includes(type) && types.includes('Point')) {
      const point = featureToPoint(feature);
      if (!point) {
        throw new Error(`Geometry type ${type} is not supported`);
      }

      feature.setGeometry(point);
      resultFeatures.push(feature);
    }
  }

  return resultFeatures;
}
