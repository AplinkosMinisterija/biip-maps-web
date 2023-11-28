import type { Feature } from 'ol';
import { Fill, Stroke, Text, Circle, Icon } from 'ol/style';
import Style from 'ol/style/Style';
import { renderIconHtml } from '../utils';

const LAYER_TYPE = {
  BOUNDARIES_MUNICIPALITIES: 'boundaries.municipalities',
  BOUNDARIES_MUNICIPALITIES_LABEL: 'boundaries.municipalities_centroid',
  BOUNDARIES_ELDERSHIPS: 'boundaries.elderships',
  BOUNDARIES_ELDERSHIPS_LABEL: 'boundaries.elderships_centroid',
  BOUNDARIES_COUNTIES: 'boundaries.counties',
  BOUNDARIES_COUNTIES_LABEL: 'boundaries.counties_centroid',
  BOUNDARIES_RESIDENTIAL_AREAS: 'boundaries.residential_areas',
  BOUNDARIES_RESIDENTIAL_AREAS_LABEL: 'boundaries.residential_areas_centroid',
  ZVEJYBA_FISHINGS: 'zvejyba.fishings',
};

const FONT_FAMILY = '"Open Sans", "Arial Unicode MS"';

const COLORS = {
  GRAY: '#0f0f0f',
  WHITE: '#ffffff',
  BLACK: '#000000',
};

function getFont(
  size: number,
  type: 'normal' | 'bold' = 'bold',
  fontFamily: string = FONT_FAMILY,
) {
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
      fill: fill,
      stroke: stroke,
    }),
  });

  const styles: any[] = [];

  return (feature: Feature, resolution: number) => {
    let length = 0;
    const statsFn = feature.get('statsFn');
    const layerPrefix = options?.layerPrefix ? `${options.layerPrefix}.` : '';
    const layer = `${layerPrefix}${feature.get('layer')}`;

    if (statsFn && typeof statsFn === 'function') {
      const stats = statsFn();
      stroke.setColor(getColorWithOpacity(COLORS.GRAY, 0.3));
      fill.setColor(getFillColorByStats(stats?.count, stats?.maxValue || 0));
      styles[length++] = strokedPolygon;
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
      text.getText().setText(feature.get('name'));
      fill.setColor(COLORS.GRAY);
      text.getText().setFont(getFont(11));
      stroke.setColor(getColorWithOpacity(COLORS.WHITE, 0.3));
      stroke.setWidth(2);
      styles[length++] = text;
    } else if ([LAYER_TYPE.ZVEJYBA_FISHINGS].includes(layer)) {
      fill.setColor(getColorWithOpacity(COLORS.GRAY, 0.6));
      styles[length++] = getIcon('pin-water', { align: 'top' });
    }

    styles.length = length;
    return styles;
  };
}
