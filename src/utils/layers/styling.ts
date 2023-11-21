import type { Feature } from 'ol';
import { Fill, Stroke, Text } from 'ol/style';
import Style from 'ol/style/Style';

const LAYER_TYPE = {
  BOUNDARIES_MUNICIPALITIES: 'boundaries.municipalities',
};

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

const COLORS = {
  GRAY: '#0f0f0f',
};

export function vectorTileStyles(options?: { layerPrefix: string }): any {
  const fill = new Fill({ color: '' });
  const stroke = new Stroke({ color: '', width: 1 });
  const polygon = new Style({ fill: fill });
  const strokedPolygon = new Style({ fill: fill, stroke: stroke });
  const line = new Style({ stroke: stroke });
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
    } else if (layer === LAYER_TYPE.BOUNDARIES_MUNICIPALITIES) {
      stroke.setColor(getColorWithOpacity(COLORS.GRAY, 0.3));
      stroke.setWidth(2);
      styles[length++] = line;
    }

    styles.length = length;
    return styles;
  };
}
