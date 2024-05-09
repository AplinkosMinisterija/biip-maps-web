import type { Feature } from 'ol';
import { LineString, Point, Polygon } from 'ol/geom';
import { getArea, getLength } from 'ol/sphere';
import { Fill, RegularShape, Style, Text } from 'ol/style';

const labelStyle = new Style({
  text: new Text({
    font: '14px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    padding: [3, 3, 3, 3],
    textBaseline: 'bottom',
    offsetY: -15,
  }),
  image: new RegularShape({
    radius: 8,
    points: 3,
    angle: Math.PI,
    displacement: [0, 10],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
  }),
});

const segmentStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
    padding: [2, 2, 2, 2],
    textBaseline: 'bottom',
    offsetY: -12,
  }),
  image: new RegularShape({
    radius: 6,
    points: 3,
    angle: Math.PI,
    displacement: [0, 8],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
  }),
});

const segmentStyles = [segmentStyle];

const formatLength = function (line: LineString) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' km';
  } else {
    output = Math.round(length * 100) / 100 + ' m';
  }
  return output;
};

const formatArea = function (polygon: Polygon) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' km\xB2';
  } else {
    output = Math.round(area * 100) / 100 + ' m\xB2';
  }
  return output;
};

export function getMeasurementStyles(
  feature: Feature,
  opts?: {
    showSegments?: boolean;
    showLength?: boolean;
    showArea?: boolean;
  },
) {
  const geometry = feature?.getGeometry();
  const type = geometry?.getType() as string;

  const styles: any[] = [];

  if (!geometry) return styles;

  let point, label, line;
  if (type === 'Polygon' && opts?.showArea) {
    point = (geometry as Polygon).getInteriorPoint();
    label = formatArea(geometry as Polygon);
    line = new LineString((geometry as Polygon).getCoordinates()[0]);
  } else if (type === 'LineString' && opts?.showLength) {
    point = new Point((geometry as LineString).getLastCoordinate());
    label = formatLength(geometry as LineString);
    line = geometry;
  }

  if (opts?.showSegments && line) {
    let count = 0;
    (geometry as LineString)?.forEachSegment?.(function (a, b) {
      const segment = new LineString([a, b]);
      const label = formatLength(segment);
      if (segmentStyles.length - 1 < count) {
        segmentStyles.push(segmentStyle.clone());
      }
      const segmentPoint = new Point(segment.getCoordinateAt(0.5));
      segmentStyles[count].setGeometry(segmentPoint);
      (segmentStyles[count] as any).getText().setText(label);
      styles.push(segmentStyles[count]);
      count++;
    });
  }

  if (label) {
    labelStyle.setGeometry(point as Point);
    (labelStyle as any).getText().setText(label);
    styles.push(labelStyle);
  }

  return styles;
}
