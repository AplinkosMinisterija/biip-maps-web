import { Feature } from 'ol';
import { Fill, Stroke, Text, Circle, Icon } from 'ol/style';
import Style from 'ol/style/Style';
import { renderIconHtml } from '../utils';
import type { Polygon } from 'ol/geom';
import { getPointResolution } from 'ol/proj';
import { projection } from '../constants';
import { featureToPoint } from '../map';

const LAYER_TYPE = {
  BOUNDARIES_MUNICIPALITIES: 'boundaries.municipalities',
  BOUNDARIES_MUNICIPALITIES_LABEL: 'boundaries.municipalities_centroid',
  BOUNDARIES_ELDERSHIPS: 'boundaries.elderships',
  BOUNDARIES_ELDERSHIPS_LABEL: 'boundaries.elderships_centroid',
  BOUNDARIES_COUNTIES: 'boundaries.counties',
  BOUNDARIES_COUNTIES_LABEL: 'boundaries.counties_centroid',
  BOUNDARIES_RESIDENTIAL_AREAS: 'boundaries.residential_areas',
  BOUNDARIES_RESIDENTIAL_AREAS_LABEL: 'boundaries.residential_areas_centroid',
  HUNTING_MPV: 'mpv.hunting_areas',
  HUNTING_FOOTPRINT_TRACKS: 'footprintTracks.footprint_tracks',
  UETK_MERGED_LABEL: 'uetk.uetk_merged.1',
  ZVEJYBA_FISHINGS: 'zvejyba.fishings',
  ZUVINIMAS_FISH_STOCKINGS: 'zuvinimas.fish_stockings',
  SMALSUOLIS_EVENTS: 'tiles.events',
  FOREST_LUMBERING: 'forests.kirtimai',
};

const FONT_FAMILY = '"Open Sans", "Arial Unicode MS"';

const COLORS = {
  GRAY: '#0f0f0f',
  WHITE: '#ffffff',
  BLACK: '#000000',
};

function getFont(size: number, type: 'normal' | 'bold' = 'bold', fontFamily: string = FONT_FAMILY) {
  return `${type ? `${type} ` : ''}${size}px ${fontFamily}`;
}

const iconCache: any = {};
function getIcon(
  iconName: string,
  opts?: { align?: 'top' | 'center'; size?: number; color?: string },
) {
  const cacheKey = iconName + JSON.stringify(opts);
  if (!iconCache[cacheKey]) {
    const styles = [];
    if (opts?.color) {
      styles.push(`color: ${opts.color}`);
    }

    const iconHtml = renderIconHtml(iconName, {
      style: styles.join(';'),
      height: `${opts?.size || 24}px`,
      width: `${opts?.size || 24}px`,
    });

    let anchor = [0.5, 0.5];
    if (opts?.align === 'top') {
      anchor = [0.5, 1];
    }

    iconCache[cacheKey] = new Style({
      image: new Icon({
        src: `data:image/svg+xml;utf8,${iconHtml}`,
        anchor,
      }),
    });
  }
  return iconCache[cacheKey];
}
function getColorWithOpacity(color: string, opacity: number) {
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  const hex = hexToRgb(color);
  if (!hex) return '';

  return `rgba(${hex.r},${hex.g},${hex.b},${opacity})`;
}

function getFillColorByStats(count: number, max: number) {
  let color = '#edf8fb';
  if (count) {
    const colorPalette: any[] = ['#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'];
    const colorIndex = Math.round((count / max) * (colorPalette.length - 1));
    color = colorPalette[colorIndex];
  }
  return getColorWithOpacity(color, 0.5);
}

export function vectorTileStyles(options?: { layerPrefix: string }): any {
  const fill = new Fill({ color: '' });
  const textFill = new Fill({ color: '' });
  const stroke = new Stroke({ color: '', width: 1 });
  const circle = new Circle({
    fill,
    radius: 7,
  });
  const polygon = new Style({ fill });
  const strokedPolygon = new Style({ fill, stroke });
  const line = new Style({ stroke });
  const point = new Style({ image: circle });
  const text = new Style({
    text: new Text({
      text: '',
      font: 'bold 11px sans-serif',
      fill: textFill,
    }),
  });

  const styles: any[] = [];

  return (feature: Feature, resolution: number) => {
    let length = 0;
    const statsFn = feature.get('statsFn');
    const layerPrefix = options?.layerPrefix ? `${options.layerPrefix}.` : '';
    const layer = `${layerPrefix}${feature.get('layer')}`;

    function applyDefaultStyles(opts: {
      color: string;
      strokeColor?: string;
      icon?: string;
      iconAlign?: 'top' | 'center';
    }) {
      const geometry = feature.getGeometry();

      const geometryType = geometry?.getType() as string;

      fill.setColor(opts.color);
      stroke.setColor(opts.strokeColor || '');
      const hasStroke = opts.strokeColor;

      if (['Polygon', 'MultiPolygon'].includes(geometryType)) {
        styles[length++] = hasStroke ? strokedPolygon : polygon;
      } else if (['LineString', 'MultiLineString'].includes(geometryType)) {
        // TODO: setup stroked line
        styles[length++] = line;
      } else if (['Point', 'MultiPoint'].includes(geometryType)) {
        if (opts.icon) {
          styles[length++] = getIcon(opts.icon, {
            color: opts.strokeColor || opts.color,
            align: opts.iconAlign || 'top',
          });
        } else {
          styles[length++] = point;
        }
      }
      // TODO: setup these styles (if needed) - LinearRing, GeometryCollection, Circle
    }

    if (statsFn && typeof statsFn === 'function') {
      const stats = statsFn();
      if (!stats?.hideEmpty || stats?.count > 0) {
        if (stats?.type === 'icon') {
          styles[length++] = getIcon(stats.icon?.name || '', stats.icon?.opts || {});
        } else {
          stroke.setColor(getColorWithOpacity(COLORS.GRAY, 0.3));
          fill.setColor(getFillColorByStats(stats?.count, stats?.maxValue || 0));

          styles[length++] = strokedPolygon;
        }
      }
    } else if (
      [
        LAYER_TYPE.BOUNDARIES_MUNICIPALITIES,
        LAYER_TYPE.BOUNDARIES_ELDERSHIPS,
        LAYER_TYPE.BOUNDARIES_COUNTIES,
        LAYER_TYPE.BOUNDARIES_RESIDENTIAL_AREAS,
      ].includes(layer)
    ) {
      stroke.setColor(getColorWithOpacity(COLORS.GRAY, 0.3));
      stroke.setWidth(2);
      styles[length++] = line;
    } else if (
      [
        LAYER_TYPE.BOUNDARIES_MUNICIPALITIES_LABEL,
        LAYER_TYPE.BOUNDARIES_ELDERSHIPS_LABEL,
        LAYER_TYPE.BOUNDARIES_COUNTIES_LABEL,
        LAYER_TYPE.BOUNDARIES_RESIDENTIAL_AREAS_LABEL,
      ].includes(layer)
    ) {
      text.getText()?.setText(feature.get('name'));
      textFill.setColor(COLORS.GRAY);
      text.getText()?.setFont(getFont(11));
      stroke.setColor(getColorWithOpacity(COLORS.WHITE, 0.3));
      stroke.setWidth(2);
      styles[length++] = text;
    } else if ([LAYER_TYPE.ZUVINIMAS_FISH_STOCKINGS].includes(layer)) {
      const status = feature?.get('status');

      styles[length++] = getIcon(status === 'ONGOING' ? 'pin-water-green' : 'pin-water', {
        align: 'top',
      });
    } else if ([LAYER_TYPE.HUNTING_MPV].includes(layer)) {
      stroke.setColor('#ff0000');
      stroke.setWidth(2);
      styles[length++] = line;

      text.getText()?.setText(feature.get('name'));
      text.getText()?.setFont('bold 14px sans-serif');
      text.getText()?.setStroke(stroke);
      textFill.setColor('#ffffff');
      styles[length++] = text;
    } else if ([LAYER_TYPE.HUNTING_FOOTPRINT_TRACKS].includes(layer)) {
      stroke.setColor('#ff0000');
      stroke.setLineDash([5, 5]);
      stroke.setWidth(2);
      styles[length++] = line;
    } else if ([LAYER_TYPE.FOREST_LUMBERING].includes(layer)) {
      const color = '#ff0000';
      stroke.setColor(color);
      fill.setColor(getColorWithOpacity(color, 0.1));
      stroke.setWidth(2);
      styles[length++] = strokedPolygon;
    } else if ([LAYER_TYPE.SMALSUOLIS_EVENTS].includes(layer)) {
      const isCluster = feature.get('cluster');

      const color = getColorWithOpacity(`#73DC8C`, 0.8);
      const strokeColor = '#2E5838';

      if (!isCluster) {
        applyDefaultStyles({
          color,
          strokeColor,
          icon: 'pin',
        });
      } else {
        const count = feature.get('point_count') || 0;
        if (!count) return;

        fill.setColor(color);
        textFill.setColor(strokeColor);
        text.getText()?.setText(`${count}`);
        circle.setRadius(20);
        styles[length++] = point;
        styles[length++] = text;
      }
    }

    styles.length = length;
    return styles;
  };
}

function getScale(resolution: number, center: number[]) {
  const res = getPointResolution(projection, resolution, center, 'm');
  const dpi = 25.4 / 0.28;
  const inchesPerMeter = 1000 / 25.4;
  return res * inchesPerMeter * dpi;
}

export function vectorLayerStyles(layer: string, options: { color: string }): any {
  const fill = new Fill({ color: getColorWithOpacity(options?.color, 0.2) });
  const stroke = new Stroke({
    color: getColorWithOpacity(options?.color, 0.8),
    width: 1,
  });
  const circle = new Circle({
    fill,
    stroke,
    radius: 4,
  });
  const polygon = new Style({ fill });
  const strokedPolygon = new Style({ fill, stroke });
  const line = new Style({ stroke });
  const point = new Style({
    image: circle,
    stroke,
    fill,
    geometry: function (feature: any) {
      const geometry = feature.getGeometry();
      const geometryType = geometry.getType();

      if (geometryType === 'Polygon') {
        return featureToPoint(feature);
      } else if (geometryType === 'MultiPolygon') {
        const newFeature = new Feature();
        newFeature.setGeometry(geometry.getPolygon(0));
        return featureToPoint(newFeature);
      }

      return geometry;
    },
  });

  const styles: any[] = [];

  return (feature: Feature, resolution: number) => {
    let length = 0;

    const geometry = feature.getGeometry();
    const type = geometry?.getType() as string;

    if (['highlightLayerRusys'].includes(layer)) {
      const centerCoords = featureToPoint(feature)?.getCoordinates() as number[];
      const scale = getScale(resolution, centerCoords);

      if (['Polygon', 'MultiPolygon'].includes(type)) {
        const area = (geometry as Polygon)?.getArea?.() / 10000;

        if (
          (scale > 1000001 && area < 50) ||
          (scale > 250001 && area < 25) ||
          (scale > 100001 && area < 5) ||
          (scale > 50001 && area < 1) ||
          (scale > 25001 && area < 0.1) ||
          (scale > 501 && area < 0.05)
        ) {
          styles[length++] = point;
        } else {
          styles[length++] = strokedPolygon;
        }
      } else {
        styles[length++] = strokedPolygon;
      }
    } else if (['Polygon', 'MultiPolygon'].includes(type)) {
      styles[length++] = strokedPolygon;
    } else if (['LineString', 'MultiLineString'].includes(type)) {
      styles[length++] = line;
    } else if (['Point', 'MultiPoint'].includes(type)) {
      styles[length++] = point;
    }

    styles.length = length;
    return styles;
  };
}
