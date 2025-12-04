import { projection4326 } from '@/utils/constants';
import * as turf from '@turf/turf';
import type { Feature } from 'ol';
import { getCenter } from 'ol/extent';
import { Circle, LineString, Point, Polygon } from 'ol/geom';
import { fromCircle } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';
import { getArea, getLength } from 'ol/sphere';
import { Fill, RegularShape, Style, Text } from 'ol/style';

const labelStyle = new Style({
  text: new Text({
    font: '14px Calibri,sans-serif',
    fill: new Fill({ color: 'rgba(255, 255, 255, 1)' }),
    backgroundFill: new Fill({ color: 'rgba(0, 0, 0, 0.7)' }),
    padding: [3, 3, 3, 3],
    textBaseline: 'bottom',
    offsetY: -15,
  }),
  image: new RegularShape({
    radius: 8,
    points: 3,
    angle: Math.PI,
    displacement: [0, 10],
    fill: new Fill({ color: 'rgba(0, 0, 0, 0.7)' }),
  }),
});

const segmentStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({ color: 'rgba(255, 255, 255, 1)' }),
    backgroundFill: new Fill({ color: 'rgba(0, 0, 0, 0.4)' }),
    padding: [2, 2, 2, 2],
    textBaseline: 'bottom',
    offsetY: -12,
  }),
  image: new RegularShape({
    radius: 6,
    points: 3,
    angle: Math.PI,
    displacement: [0, 8],
    fill: new Fill({ color: 'rgba(0, 0, 0, 0.4)' }),
  }),
});

const formatLength = (line: LineString, projection?: string) => {
  const length = getLength(line, { projection });
  return length > 100
    ? (Math.round((length / 1000) * 100) / 100).toFixed(2) + ' km'
    : (Math.round(length * 100) / 100).toFixed(2) + ' m';
};

const formatArea = (polygon: Polygon, projection?: string) => {
  const area = getArea(polygon, { projection });
  return area > 10000
    ? (Math.round((area / 1000000) * 100) / 100).toFixed(2) + ' km²'
    : (Math.round(area * 100) / 100).toFixed(2) + ' m²';
};

export function getMeasurementStyles(
  feature: Feature,
  opts?: {
    showSegments?: boolean;
    showLength?: boolean;
    showArea?: boolean;
    projection?: string;
  },
) {
  const geometry = feature?.getGeometry();
  if (!geometry) return [];

  const type = geometry.getType();
  const styles: Style[] = [];
  let point: Point | undefined;
  let label: string | undefined;
  let line: LineString | undefined;

  if (type === 'Polygon' && opts?.showArea) {
    point = (geometry as Polygon).getInteriorPoint();
    label = formatArea(geometry as Polygon, opts?.projection);
    line = new LineString((geometry as Polygon).getCoordinates()[0]);
  } else if (type === 'LineString') {
    line = geometry as LineString;
    if (opts?.showLength) {
      point = new Point(line.getLastCoordinate());
      label = formatLength(line, opts?.projection);
    }

    const bufferSize = feature.get('bufferSize');
    if (bufferSize && opts?.showArea) {
      const coords4326 = line
        .getCoordinates()
        .map((c) => transform(c, opts?.projection, projection4326));
      const turfLine = turf.lineString(coords4326);

      const turfBuffer = turf.buffer(turfLine, bufferSize, { units: 'meters' });

      const bufferCoords = (turfBuffer?.geometry.coordinates as number[][][]).map((ring) =>
        ring.map((c) => transform(c as [number, number], projection4326, opts?.projection)),
      );

      const bufferPolygon = new Polygon(bufferCoords);
      label = formatArea(bufferPolygon, opts?.projection);
      point = new Point(getCenter(bufferPolygon.getExtent()));
    }
  } else if (type === 'Point' && opts?.showArea) {
    const bufferSize = feature.get('bufferSize');
    if (bufferSize) {
      const circle = new Circle((geometry as Point).getCoordinates(), bufferSize);
      const polygon = fromCircle(circle);
      label = formatArea(polygon, opts?.projection);
      point = new Point(getCenter(polygon.getExtent()));
    }
  }

  if (opts?.showSegments && line) {
    line.forEachSegment((a, b) => {
      const segment = new LineString([a, b]);
      const segLabel = formatLength(segment, opts?.projection);
      const segPoint = new Point(segment.getCoordinateAt(0.5));

      const styleClone = segmentStyle.clone();
      styleClone.setGeometry(segPoint);
      (styleClone as any).getText().setText(segLabel);
      styles.push(styleClone);
    });
  }

  if (label && point) {
    const styleClone = labelStyle.clone();
    styleClone.setGeometry(point);
    (styleClone as any).getText().setText(label);
    styles.push(styleClone);
  }

  return styles;
}
