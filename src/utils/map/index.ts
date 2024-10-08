import _ from 'lodash';
import { View } from 'ol';
import { defaults, MousePosition, ScaleLine } from 'ol/control';
import { format } from 'ol/coordinate';
import Map from 'ol/Map';
import { get, Projection } from 'ol/proj';
import { projection } from '../constants';
import { Link } from 'ol/interaction';

export * from './coordinates';
export * from './draw';
export * from './filters';
export * from './layers';
export * from './utils';

export function createMap(
  target: any,
  options?: {
    showAttribution?: boolean;
    addCoordinatesToUrl: boolean;
    attributionOptions?: { [key: string]: any };
    showZoom?: boolean;
    showScaleLine?: boolean;
    showCoordinates?: boolean;
    centerView?: number[];
    zoomView?: number;
    projection?: string;
    constrainResolution?: boolean;
  },
) {
  const proj = get(options?.projection || projection);

  const map = new Map({
    target,
    view: new View({
      center: options?.centerView || [495074.61, 6116454.53],
      projection: proj as Projection,
      zoom: options?.zoomView || 9,
      constrainResolution: options?.constrainResolution,
    }),
    controls: defaults({
      attribution: !!options?.showAttribution,
      zoom: !!options?.showZoom,
      zoomOptions: {
        target: 'mapControlsRB',
        zoomInTipLabel: 'Artinti',
        zoomOutTipLabel: 'Tolinti',
      },
      attributionOptions: _.merge(
        {
          target: 'mapControlsRB',
          tipLabel: 'Duomenų šaltiniai',
        },
        options?.attributionOptions || {},
      ),
    }),
  });

  if (options?.showCoordinates) {
    const mousePositionControl = new MousePosition({
      coordinateFormat: function (coordinate) {
        return format(coordinate as number[], '{y}, {x}', 2);
      },
      projection: projection,
      target: 'mapControlsLB',
    });
    map.addControl(mousePositionControl);
  }

  if (options?.showScaleLine) {
    const scaleControl = new ScaleLine({
      units: 'metric',
      minWidth: 100,
      maxWidth: 160,
      target: 'mapControlsLB',
    });
    map.addControl(scaleControl);
  }

  if (options?.addCoordinatesToUrl) {
    const link = new Link({ replace: true, params: ['x', 'y', 'z'], animate: false });
    map.addInteraction(link);
  }

  return map;
}
