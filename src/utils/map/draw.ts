import type { Feature, Map } from 'ol';
import type Layer from 'ol/layer/Layer';
import VectorSource from 'ol/source/Vector';
import { Draw, Modify, Snap, Interaction, Select } from 'ol/interaction';
import type { Type as DrawType } from 'ol/geom/Geometry';
import { GeoJSON } from 'ol/format';
import { projection } from '../constants';
import { Queues } from './queues';
import { click } from 'ol/events/condition';
import _ from 'lodash';
import { GeometryType, getFeatures, parse } from 'geojsonjs';
import { getLayerStyles } from '../layers';
import { convertFeaturesToPoints } from './utils';

type CallbackType = 'change' | 'select' | 'remove';

export class MapDraw extends Queues {
  map: Map | undefined;
  private _layer: Layer | undefined;
  private _draw: Draw | undefined;
  private _isMulti: boolean = false;
  private _defaultColors = {
    primary: '#326a72',
    secondary: '#002a30',
  };
  private _enabledContinuousDraw: boolean = false;
  private _enabledBufferSize: boolean = false;
  private _defaultBufferSizeValue: number = 1;
  private _source = new VectorSource({
    wrapX: false,
    format: new GeoJSON({
      dataProjection: projection,
    }),
  });
  private _snap: Snap = new Snap({ source: this._source });
  private _styles = getLayerStyles({
    colors: this._defaultColors,
  });
  private _select: Select = new Select({
    condition: click,
    multi: false,
    style: this._styleFn('secondary'),
  });
  private _modifySelect: Modify = new Modify({
    features: this._select?.getFeatures(),
    style: this._styleFn(),
  });
  private _callbacks: { [key: string]: Function[] } = {};
  activeType: DrawType | undefined;

  constructor(map?: Map) {
    super();
    this.setMap(map);
    this._setup();

    this._select.on('select', (event) => {
      this._setSelectedFeature(event.selected?.[0]);
    });

    this._modifySelect.on('modifyend', () => {
      this._triggerCallbacks('change');
    });
  }

  setMap(map: Map | undefined) {
    this.map = map;
    this._processQueue();
    return this;
  }

  setFeatures(
    features: { [key: string]: any },
    options: {
      append?: boolean;
      types?: string[];
      dataProjection?: string;
    } = {},
  ) {
    if (_.isEmpty(features)) return;

    try {
      const readFeaturesOptions: any = {};

      if (options?.dataProjection) {
        readFeaturesOptions.dataProjection = options?.dataProjection;
        readFeaturesOptions.featureProjection = this?.map?.getView().getProjection().getCode();
      }

      let data = new GeoJSON().readFeatures(features, readFeaturesOptions);

      if (options?.types?.length) {
        data = convertFeaturesToPoints(data, options?.types || []);
      }

      if (!options?.append) {
        this.remove();
      }

      if (this._enabledBufferSize) {
        data?.forEach((feature) => {
          const bufferSize =
            this.getProperties(feature, 'bufferSize') || this._defaultBufferSizeValue;
          this.setProperties(feature, { bufferSize });
        });
      }

      this._source.addFeatures(data);
      this._triggerCallbacks('change');
    } catch (err) {
      console.error('Cannot read features');
    }

    return this;
  }

  setIcon(name: string, opts?: any) {
    return this.setStyles({
      ...this._styles.opts,
      icon: name,
      width: opts.size,
      opts,
    });
  }

  enableMeasurements(
    opts: { length?: boolean; area?: boolean; segments?: boolean } = {
      length: true,
      area: true,
      segments: true,
    },
  ) {
    return this.setStyles({
      ...this._styles.opts,
      showMeasurements: {
        length: opts?.length,
        area: opts?.area,
        segments: opts?.segments,
      },
    });
  }

  setColors(primary: string, secondary: string, isTemporary: boolean = false) {
    primary = primary || this._defaultColors.primary;
    secondary = secondary || this._defaultColors.secondary;

    if (!isTemporary) {
      this._defaultColors.primary = primary;
      this._defaultColors.secondary = secondary;
    }

    return this.setStyles({
      ...this._styles.opts,
      colors: {
        primary,
        secondary,
      },
    });
  }

  setStyles(opts: {
    colors?: { primary: string; secondary: string };
    width?: number;
    icon?: string;
    [key: string]: any;
  }) {
    this._styles = getLayerStyles(opts);

    this._layer?.getSource()?.changed();

    return this;
  }

  setLayer(layer: Layer) {
    this._layer = layer;
    this._layer.setSource(this._source);
    (this._layer as any)?.setStyle?.(this._styleFn());
    this._setup(this._layer.getSource() as VectorSource);
    return this;
  }

  setMulti(value: boolean = false) {
    this._isMulti = value;
    return this;
  }

  enableBufferSize(value: boolean = false, defaultValue: number = 1) {
    this._enabledBufferSize = !!value;
    this._defaultBufferSizeValue = defaultValue;
    return this;
  }

  enableContinuousDraw(value: boolean = true) {
    this._enabledContinuousDraw = value;
    return this;
  }

  enableSelect(value: boolean = true) {
    if (value) {
      this._addEditInteractions();
    } else {
      this._removeEditInteractions();
    }
    return this;
  }

  remove(feature?: Feature) {
    this._setSelectedFeature();

    if (!feature) {
      this._source.clear();
      this._triggerCallbacks('remove');
      return this;
    }

    this._source.removeFeature(feature);
    this._triggerCallbacks('remove');

    return this;
  }

  start(type?: DrawType) {
    if (!this.map) {
      return this._addToQueue('start', type);
    }

    this.end();
    this._setActiveType(type);
    if (type) {
      this._draw = new Draw({
        source: this._source,
        stopClick: true,
        type,
        style: this._styleFn(),
      });
    }

    this._addInteractions();
    this._addEditInteractions();

    return this;
  }

  edit(enable: boolean = true) {
    if (enable) {
      this._addEditInteractions();
    }

    return this;
  }

  end() {
    this._setActiveType();
    this._setSelectedFeature();
    this._removeInteractions();

    return this;
  }

  on(types: CallbackType | CallbackType[], cb: Function) {
    if (!Array.isArray(types)) {
      types = [types];
    }
    types.forEach((type) => {
      this._callbacks[type] = this._callbacks[type] || [];
      this._callbacks[type].push(cb);
    });

    return this;
  }

  enablePan(value: boolean = true) {
    if (!this.map) {
      return this._addToQueue('enablePan', value);
    }

    const sendLocation = () => {
      const featureCollection = parse({
        type: GeometryType.POINT,
        coordinates: this.map?.getView().getCenter(),
      });

      const feature = new GeoJSON().readFeature(getFeatures(featureCollection)[0]);

      this._triggerCallbacks('change', {
        feature,
        features: JSON.stringify(featureCollection),
      });
    };

    this.map.on('moveend', () => {
      sendLocation.call(this);
    });

    return this;
  }

  private _styleFn(type: string = 'primary') {
    return (...args: any) => {
      return this._styles[type]?.(...args) || this._styles.primary?.(...args);
    };
  }

  private _addInteractions() {
    if (!this.map) {
      return this._addToQueue('_addInteractions');
    }

    this._addInteractionIfNotAdded(this._draw);
    this._addDrawListeners();
  }

  private _addEditInteractions(onlySelect: boolean = false) {
    if (!this.map) {
      return this._addToQueue('_addEditInteractions', onlySelect);
    }

    this._addInteractionIfNotAdded(this._select);
    if (!onlySelect) {
      this._addInteractionIfNotAdded(this._modifySelect);
    }
    this._addInteractionIfNotAdded(this._snap);
  }

  private _removeInteractions(interaction?: Interaction) {
    if (!this.map) {
      return this._addToQueue('_removeInteractions', interaction);
    }

    if (interaction) {
      return this._removeInteractionIfAdded(interaction);
    }

    if (this._draw) {
      this._removeInteractionIfAdded(this._draw);
    }
    this._removeInteractionIfAdded(this._snap);
  }

  private _removeEditInteractions() {
    if (!this.map) {
      return this._addToQueue('_removeEditInteractions');
    }

    this._removeInteractionIfAdded(this._select);
    this._removeInteractionIfAdded(this._modifySelect);
    this._removeInteractionIfAdded(this._snap);
  }

  private _addInteractionIfNotAdded(interaction?: Interaction) {
    if (!interaction) return;

    if (!this.map) {
      return this._addToQueue('_addInteractionIfNotAdded', interaction);
    }

    const hasInteraction = this.map
      ?.getInteractions()
      .getArray()
      .find((el) => {
        return el == interaction;
      });

    if (!hasInteraction) {
      this.map?.addInteraction(interaction);
    }
  }

  private _removeInteractionIfAdded(interaction?: Interaction) {
    if (!interaction) return;

    if (!this.map) {
      return this._addToQueue('_removeInteractionIfAdded', interaction);
    }

    const hasInteraction = this.map
      ?.getInteractions()
      .getArray()
      .find((el) => {
        return el == interaction;
      });
    if (!hasInteraction) return;

    this.map?.removeInteraction(interaction);
  }

  private _addDrawListeners() {
    if (!this._draw) {
      return this._addToQueue('_addDrawListeners');
    }

    this._draw?.on('drawstart', () => {
      this._handleDrawStart.call(this);
    });

    this._draw?.on('drawend', (event) => {
      const { feature } = event;
      if (!feature) return;

      if (this._enabledBufferSize) {
        const bufferSize =
          this.getProperties(feature, 'bufferSize') || this._defaultBufferSizeValue;
        this.setProperties(feature, { bufferSize });
      }

      if (!this._enabledContinuousDraw) {
        this._draw?.setActive(false);
        this._setActiveType();
      }

      this._setSelectedFeature(feature);
      this._triggerCallbacks('change', event);
    });
  }

  setProperties(feature: Feature, props: any) {
    if (!feature) return;
    feature.setProperties(props);
    this._triggerCallbacks('change');
    return this;
  }

  getProperties(feature: Feature, key?: string) {
    if (!feature) return;
    const properties = feature.getProperties();
    if (!key) return properties;
    return properties[key];
  }

  hasFeatures() {
    return !!this._source.getFeatures().length;
  }

  private _triggerCallbacks(types: CallbackType | CallbackType[], event?: any) {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    if (!Array.isArray(types)) {
      types = [types] as CallbackType[];
    }

    setTimeout(() => {
      const features = event?.features
        ? event.features
        : new GeoJSON().writeFeatures(this._source.getFeatures());

      const feature = event?.feature ? new GeoJSON().writeFeatureObject(event.feature) : null;

      let featuresJSON = features;
      try {
        featuresJSON = JSON.parse(features);
      } catch (err) {}
      (types as CallbackType[]).forEach((type: CallbackType) => {
        this._callbacks[type]?.forEach((cb) => {
          cb({
            source: this._source,
            features,
            feature,
            featuresJSON,
            featureObj: event?.feature,
          });
        });
      });
    });
  }

  private _setActiveType(type?: DrawType) {
    this.activeType = type;
  }

  private _setSelectedFeature(feature?: Feature) {
    const featuresCollection = this._select?.getFeatures();
    featuresCollection?.clear();
    this._modifySelect.setActive(!!feature);

    this._triggerCallbacks('select', { feature });

    if (!feature) return;
    featuresCollection?.push(feature);
  }

  private _setup(source?: VectorSource | null) {
    if (!source) {
      source = new VectorSource({
        wrapX: false,
        format: new GeoJSON({
          dataProjection: projection,
        }),
      });
    }

    this._removeInteractions();
    this._removeInteractions(this._select);
    this._removeInteractions(this._modifySelect);

    this._source = source;
    this._snap = new Snap({ source: this._source });
  }

  private _handleDrawStart() {
    if (!this._isMulti) {
      this.remove();
    }
    this._modifySelect.setActive(false);
  }
}
