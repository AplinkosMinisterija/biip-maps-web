import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import LayerGroup from 'ol/layer/Group';
import { Fill, Circle, Icon } from 'ol/style';
import VectorSource from 'ol/source/Vector';
import { GeoJSON } from 'ol/format';
import { projection } from '../constants';
import { renderIconHtml } from '../utils';
import { vectorLayerStyles } from './styling';
import { getMeasurementStyles } from './styles/measurements';

const color = 'rgba(0,70,80,0.8)';
const colorFill = 'rgba(0,70,80,0.2)';

const fill = new Fill({ color: color });
const fillColor = new Fill({ color: colorFill });
const stroke = new Stroke({ color, width: 2 });

export function getLayerStyles(opts: {
  colors?: { primary: string; secondary: string };
  width?: number;
  icon?: string;
  opts?: any;
  showMeasurements?: {
    length: boolean;
    area: boolean;
    segments: boolean;
  };
}) {
  const primaryColor = opts?.colors?.primary || '#326a72';
  const secondaryColor = opts?.colors?.secondary || '#002a30';
  function getStyle(
    color: string,
    icon?: string,
    options?: {
      align?: 'top';
      width?: number;
    },
  ) {
    const brightColor = `${color}bb`;
    const lightColor = `${color}33`;
    const width = options?.width || opts?.width || 3;

    const stroke = new Stroke({ color: brightColor, width });
    const fill = new Fill({ color: lightColor });

    let image: any = new Circle({
      radius: width * 2,
      fill: new Fill({ color: brightColor }),
    });

    if (icon) {
      const iconHtml = renderIconHtml(icon, {
        style: `color: ${color};`,
      });

      let anchor = [0.5, 0.5];
      if (options?.align === 'top') {
        anchor = [0.5, 1];
      }
      image = new Icon({
        scale: width / 2,
        anchor,
        opacity: 0.8,
        src: `data:image/svg+xml;utf8,${iconHtml}`,
      });
    }

    return new Style({
      stroke,
      fill,
      image,
    });
  }

  const primaryStyle = getStyle(primaryColor, opts?.icon, opts?.opts);
  const secondaryStyle = getStyle(secondaryColor, opts?.icon, opts?.opts);

  function getStyleByFeature(defaultStyle: Style) {
    return function (feature: any, resolution: number) {
      const color = feature.get('color');
      const radius = feature.get('radius');
      const icon = feature.get('icon');
      const bufferSize = feature.get('bufferSize');

      if (color) {
        return getStyle(color, icon, { ...(opts?.opts || {}), width: radius });
      }

      if (bufferSize) {
        const styleClone = defaultStyle.clone();
        const circle = styleClone.getImage() as Circle;
        const lightColor = styleClone.getFill()?.getColor()?.toString();

        const width = (bufferSize * 2) / resolution;

        if (width > 4000) return styleClone;

        const bufferStroke = new Stroke({
          color: lightColor,
          width,
        });

        circle.setStroke(bufferStroke);
        return styleClone;
      }

      const measurementStyles = getMeasurementStyles(feature, {
        showSegments: opts?.showMeasurements?.segments,
        showLength: opts?.showMeasurements?.length,
        showArea: opts?.showMeasurements?.area,
      });

      return [defaultStyle, ...measurementStyles];
    };
  }
  const styles: any = {
    opts,
    primary: getStyleByFeature(primaryStyle),
    secondary: getStyleByFeature(secondaryStyle),
  };

  return styles;
}

export const highlightLayer = {
  id: 'highlightLayer',
  layer: new VectorLayer({
    style: vectorLayerStyles('highlightLayer', { color: '#004650' }),
  }),
};
export const highlightLayerRusys = {
  id: 'highlightLayerRusys',
  layer: new VectorLayer({
    style: vectorLayerStyles('highlightLayerRusys', { color: '#004650' }),
  }),
};

export const fixedHighlightLayer = {
  id: 'fixedHighlightLayer',
  layer: new VectorLayer({
    style: new Style({
      stroke: stroke,
      image: new Circle({
        stroke,
        radius: 7,
      }),
    }),
  }),
};

export const drawLayer = {
  id: 'drawLayer',
  layer: new VectorLayer({
    renderBuffer: 2000,
    style: function (feature) {
      const color = feature.get('color');
      const radius = feature.get('radius') || 3;
      const featureStroke = color ? new Stroke({ color, width: 2 }) : stroke;
      const featureFill = color ? new Fill({ color }) : fill;
      const featureFillColor = color ? new Fill({ color }) : fillColor;
      return new Style({
        stroke: featureStroke,
        image: new Circle({
          radius,
          fill: featureFill,
          stroke: featureStroke,
        }),
        fill: featureFillColor,
      });
    },
    source: new VectorSource({
      format: new GeoJSON({
        dataProjection: projection,
      }),
    }),
  }),
};

export const markerLayer = {
  id: 'markerLayer',
  layer: new VectorLayer({
    style: function () {
      // default style
      const markerIconHtml = renderIconHtml('pin-water');
      return new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: `data:image/svg+xml;utf8,${markerIconHtml}`,
        }),
      });
    },
    source: new VectorSource({
      format: new GeoJSON({
        dataProjection: projection,
      }),
    }),
  }),
};

export const vectorsLayer = {
  id: 'vectorsLayer',
  layer: new LayerGroup({
    layers: [
      fixedHighlightLayer.layer,
      drawLayer.layer,
      highlightLayer.layer,
      markerLayer.layer,
      highlightLayerRusys.layer,
    ],
  }),
};
