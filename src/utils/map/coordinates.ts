import { boundingExtent, getCenter } from 'ol/extent';
import { GeoJSON } from 'ol/format';
import { Geometry, LineString, Point, Polygon } from 'ol/geom';
import { dataToFeatureCollection } from './utils';
import { getArea, getLength } from 'ol/sphere';
import { transform } from 'ol/proj';
import _ from 'lodash';
import { projection, projection4326 } from '../constants';
import wkx from 'wkx';

const singleCoordPattern = '(-?\\d+(\\.\\d+)?)';

const joinCoordsPattern = '\\s*[,\\s]\\s*';

const coordPairPattern = `${singleCoordPattern}${joinCoordsPattern}${singleCoordPattern}`;

const coordPatternRegex = new RegExp(`^${coordPairPattern}$`, 'gi');
const coordPatternMultiRegex = new RegExp(`^(${coordPairPattern}(${joinCoordsPattern})?)+$`, 'gi');
const coordPairRegex = new RegExp(coordPairPattern, 'gi');

const fixCoordinatesText = (text: string) => {
  return `${text.trim().replace(/\[|\]/gi, '')}`;
};

const coordinatesToString = (coordinates: any[]): string => {
  const allItemsAreNumbers = coordinates.every((i) => !isNaN(i));
  let text = '';
  if (allItemsAreNumbers) {
    text = coordinates.join(' ');
  } else {
    text = `[${coordinates.map(coordinatesToString).join(', ')}]`;
  }

  return text;
};

export function convertCoordinatesToProjection(
  coordinates: any[] | any,
  dataProjection = '',
  featureProjection = projection,
) {
  if (dataProjection === featureProjection) return coordinates;

  if (coordinates?.type === 'FeatureCollection') {
    const options: any = {};
    if (dataProjection) {
      options.dataProjection = dataProjection;
    }

    if (coordinates.bbox?.length && !isWGSCoordinates(coordinates.bbox[0], coordinates.bbox[1])) {
      options.featureProjection = featureProjection;
    }

    const features = new GeoJSON().readFeatures(_.cloneDeep(coordinates), options);

    try {
      const transformedCoordinates = JSON.parse(
        new GeoJSON().writeFeatures(features, {
          decimals: 2,
        }),
      );

      return transformedCoordinates;
    } catch (err) {
      console.error('parsing error', err);
      return {};
    }
  }

  const transformCoordinates = (coordinates: any[]): any => {
    const allItemsAreArray = coordinates.some((i) => Array.isArray(i));
    if (allItemsAreArray) return coordinates.map(transformCoordinates);

    const firstEl = coordinates[0];
    const lastEl = coordinates[1];

    if (
      !firstEl ||
      !lastEl ||
      isWGSCoordinates(firstEl, lastEl) ||
      isWGSCoordinates(lastEl, firstEl)
    ) {
      return coordinates;
    }

    let data = [firstEl, lastEl];
    // TODO: hack for changing places
    if (firstEl > lastEl) {
      data = [lastEl, firstEl];
    }

    return transform(data, dataProjection || projection4326, featureProjection || projection);
  };

  return transformCoordinates(coordinates);
}

export function convertCoordinates(
  coordinates: any[] | any,
  sourceProjection = '',
  resultProjection = '',
) {
  const result: number[] = [];

  for (let i = 0; i < coordinates.length / 2; i++) {
    const coordinatesPair = transform(
      [coordinates[i * 2], coordinates[i * 2 + 1]],
      sourceProjection || projection4326,
      resultProjection,
    );

    result.push(...coordinatesPair);
  }

  return result;
}

export function getElementFromCoordinates(
  type: string,
  coordinates: any[],
): {
  item: Point | LineString | Polygon;
  coordinates: number[][];
  extent: number[];
  center: number[];
  geom: object;
} {
  let item: any;
  let transformedCoordinates: number[][];

  coordinates = convertCoordinatesToProjection(coordinates);

  if (type === 'Point') {
    transformedCoordinates = [coordinates];
    item = new Point(coordinates);
  } else if (type === 'Polygon') {
    transformedCoordinates = coordinates.reduce((acc, item) => [...acc, ...item], []);
    item = new Polygon(coordinates);
  } else {
    transformedCoordinates = coordinates;
    item = new LineString(coordinates);
  }

  return {
    item,
    coordinates: transformedCoordinates,
    geom: toGeoJSON(item),
    ...parseCoordinatesArray(transformedCoordinates),
  };
}

function toGeoJSON(data: Geometry) {
  return dataToFeatureCollection(new GeoJSON().writeGeometryObject(data));
}

const formatLength = function (line: LineString) {
  let length = getLength(line);
  let unit = 'm';

  if (length > 1000) {
    length = length / 1000;
    unit = 'km';
  }

  return `${Math.round(length * 100) / 100} ${unit}`;
};

const formatArea = function (polygon: Polygon) {
  let length = getArea(polygon);
  let unit = 'm';

  if (length > 10000) {
    length = length / 10000;
    unit = 'km';
  }

  return `${Math.round(length * 100) / 100} ${unit}<sup>2</sup>`;
};

export function isCoordinate(input: string, multi: boolean = false) {
  input = fixCoordinatesText(input);

  if (!multi) {
    return !!input.match(coordPatternRegex); //.test(input);
  }

  return !!input.match(coordPatternMultiRegex); //.test(input);
}

export function isWGSCoordinates(x: number, y: number) {
  const coordLength = (coordinate: number) => Math.floor(coordinate).toString().length;

  return coordLength(x) == 6 && coordLength(y) == 7;
}

export function parseCoordinates(input: string) {
  input = fixCoordinatesText(input);
  const coordinates =
    input
      .match(coordPairRegex)
      ?.map((item) =>
        item
          .split(/,|\s/gi)
          .map((item) => item.trim())
          .filter((item) => !!item)
          .map((item) => parseFloat(item)),
      )
      .map((item) => (!isWGSCoordinates(item[0], item[1]) ? [item[1], item[0]] : item)) || [];

  if (!coordinates.length) return [];

  if (coordinates.length < 1) return coordinates;
  return coordinates;
}

export function parseCoordinatesArray(data: number[][]) {
  const extent = boundingExtent(data as number[][]);

  return {
    extent,
    center: getCenter(extent),
  };
}

export function parseGeomFromString(input: string) {
  input = fixCoordinatesText(input);
  const coordinatesPairs =
    input
      .match(coordPairRegex)
      ?.map((item) =>
        item
          .split(/,|\s/gi)
          .map((item) => item.trim())
          .filter((item) => !!item)
          .map((item) => parseFloat(item)),
      )
      .map((item) => (!isWGSCoordinates(item[0], item[1]) ? [item[1], item[0]] : item)) || [];

  const results: Array<{
    type: 'LineString' | 'Point' | 'Polygon';
    geometry: Geometry;
    coordinates: number[] | number[][] | number[][][];
    center: number[];
    content?: string;
    extent?: number[];
    geom?: any;
    properties?: any;
  }> = [];

  const getElement = (
    type: 'LineString' | 'Point' | 'Polygon',
    geometry: Geometry,
    coordinates: number[] | number[][] | number[][][],
    properties: any = {},
  ) => {
    return {
      type,
      geometry,
      geom: toGeoJSON(geometry),
      content: coordinatesToString([coordinates]),
      properties,
      coordinates,
    };
  };
  if (!coordinatesPairs.length) return results;
  else if (coordinatesPairs.length < 2) {
    const {
      item: point,
      coordinates: pointCoordinates,
      extent,
      center,
    } = getElementFromCoordinates('Point', coordinatesPairs[0]);
    results.push({
      ...getElement('Point', point, pointCoordinates),
      extent,
      center,
    });
  } else {
    const {
      item: lineString,
      extent,
      center,
    } = getElementFromCoordinates('LineString', coordinatesPairs);

    const startMatchEnd = coordinatesPairs[0] === coordinatesPairs[coordinatesPairs.length - 1];

    if (!startMatchEnd) {
      results.push({
        ...getElement('LineString', lineString, coordinatesPairs, {
          distance: formatLength(lineString as LineString),
        }),
        center,
        extent,
      });
    }

    if (coordinatesPairs.length > 2) {
      const polygonCoordinates = _.cloneDeep(coordinatesPairs);
      if (!startMatchEnd) {
        polygonCoordinates.push(coordinatesPairs[0]);
      }

      const {
        item: polygon,
        extent,
        center,
      } = getElementFromCoordinates('Polygon', [polygonCoordinates]);

      results.push({
        ...getElement('Polygon', polygon, [polygonCoordinates], {
          area: formatArea(polygon as Polygon),
        }),
        center,
        extent,
      });
    }
  }

  return results;
}

export function convertFeatureCollectionProjection(data: any, from: string, to: string) {
  if (from === to) return data;

  const dataIsString = typeof data === 'string';

  if (dataIsString) {
    try {
      data = JSON.parse(data);
    } catch (err) {}
  }

  const features = new GeoJSON().readFeatures(_.cloneDeep(data), {
    dataProjection: from,
    featureProjection: to,
  });

  const options: any = {};

  if (to === projection4326) {
    options.decimals = 7;
  } else if (to === projection) {
    options.decimals = 2;
  }

  if (dataIsString) {
    return new GeoJSON().writeFeatures(features, options);
  }

  return new GeoJSON().writeFeaturesObject(features, options);
}

export const wkbToGeoJSON = (wkbString: string) => {
  const geometry = wkx.Geometry.parse(wkbString).toGeoJSON();
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: geometry,
      },
    ],
  };
};
