import { Overlay, type Map, Feature, Geolocation } from 'ol';
import {
  checkAuth,
  loadWFSLayer,
  loadWMSLayer,
  splitUrlIfNeeded,
  MapFilters,
  projection,
  dataToFeatureCollection,
  featureCollectionToExtent,
  getGeometriesFromFeaturesArray,
  getPropertiesFromFeaturesArray,
  WMSFeatureQuery,
  WMSLegendRequest,
  convertCoordinates,
  convertCoordinatesToProjection,
  convertFeatureCollectionProjection,
} from '@/utils';
import { MapDraw } from '.';
import type { Type as DrawType } from 'ol/geom/Geometry';
import _ from 'lodash';
import LayerGroup from 'ol/layer/Group';
import { getCenter } from 'ol/extent';
import { Queues } from './queues';
import { GeoJSON } from 'ol/format';
import { Point, Circle } from 'ol/geom';
import type BaseEvent from 'ol/events/Event';

type LayerOptions = {
  opacity?: number;
  isHidden?: boolean;
  isBaseLayer?: boolean;
  group?: any;
};

type EventTypes = 'zoom:change';

const LayerType = {
  WMS: 'WMS',
  VT: 'vt',
  ARCGIS: 'ARCGIS',
  WFS: 'WFS',
  GEOJSON: 'geojson',
};

const vectorsLayerId = 'vectorsLayer';
const fixedHighlightLayerId = 'fixedHighlightLayer';
const highlightLayerId = 'highlightLayer';
const drawLayerId = 'drawLayer';
const myLocationLayerId = 'myLocationLayer';

export class MapLayers extends Queues {
  map: Map | undefined;
  private _visibleBaseLayerId: string = '';
  private _overlayLayer: Overlay | undefined;
  private _baseLayersIds: string[] = [];
  private _filtersByLayer: { [id: string]: MapFilters } = {};
  private _clickCallbacks: { cb: Function; opts: any }[] = [];
  private _hoverCallbacks: Function[] = [];
  private _eventsCallbacks: { [key: string]: Function[] } = {};
  private _layers: { [id: string]: any } = {};
  private _draw: MapDraw | undefined;
  private _geolocation: Geolocation | undefined;

  private _timeouts: {
    hover?: any;
    zoom?: any;
  } = {};

  private _callbacksProjection: string = projection;

  waitForLoaded: Promise<void> = new Promise(async (resolve) => {
    const waitForMap = async () => {
      return new Promise<void>((resolve) => {
        const mapInterval = setInterval(() => {
          if (this.map) {
            clearInterval(mapInterval);
            resolve();
          }
        }, 100);
      });
    };

    await waitForMap();

    this.map?.once('loadend', () => {
      resolve();
    });
  });

  constructor(map?: Map) {
    super();
    this.setMap(map);
  }

  setLayers(layers: { [id: string]: any }) {
    this._layers = layers;
  }

  setMap(map: Map | undefined) {
    this.map = map;
    if (this._draw) {
      this._draw.setMap(this.map);
    }
    if (map) {
      // zoom to LT extent
      this.centerMap();

      this._processQueue();
      map.getViewport().addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const pixel = map.getEventPixel(e);
        const coordinate = map.getCoordinateFromPixel(pixel);
        this._clickCallbacks
          .filter((i) => !!i?.opts?.right)
          .map((item) => item.cb({ pixel, coordinate }));
      });

      map.on('singleclick', (e: any) => {
        const features = map.getFeaturesAtPixel(e.pixel);
        e.features = features;
        this._clickCallbacks
          .filter((i) => !i?.opts?.right)
          .map((item) => {
            if (item?.opts?.layers) {
              return item.cb({
                ...e,
                features: map.getFeaturesAtPixel(e.pixel, {
                  layerFilter: (layer) => item.opts?.layers.includes(layer.get('id')),
                  hitTolerance: 10,
                }),
              });
            }
            return item.cb(e);
          });
      });
      map.on('pointermove', (e: any) => {
        clearTimeout(this._timeouts.hover);
        this._timeouts.hover = setTimeout(() => {
          const features = map.getFeaturesAtPixel(e.pixel);
          e.features = features;
          this._hoverCallbacks.map((fn) => fn(e));
        }, 50);
      });

      map.getView()?.on('change:resolution', () => {
        clearTimeout(this._timeouts.zoom);
        this._timeouts.zoom = setTimeout(() => {
          this._triggerEventCallbacks('zoom:change', {
            current: this?.map?.getView()?.getZoom(),
            maxAutoZoom: this._getZoomLevel(),
          });
        }, 50);
      });

      // initial change
      this._triggerEventCallbacks('zoom:change', {
        current: this?.map?.getView()?.getZoom(),
        maxAutoZoom: this._getZoomLevel(),
      });
    }

    return this;
  }

  centerMap() {
    let extent = [306000, 5975000, 680000, 6258000];
    const viewProjection = this.map?.getView()?.getProjection();
    if (viewProjection && projection != viewProjection.getCode()) {
      extent = convertCoordinates(extent, projection, viewProjection.getCode());
    }
    this.zoomToExtent(extent, { padding: 0 });
  }

  getVectorLayer(id: string) {
    if (!this.isAdded(vectorsLayerId)) {
      this.add(vectorsLayerId);
    }

    return this.getLayer(id);
  }

  setOverlayElement(el: HTMLElement) {
    if (!el) return this;
    const element = this.appendOverlayElement(el);
    if (!element) return;
    this._overlayLayer = element;
    return this;
  }

  appendOverlayElement(el: HTMLElement) {
    if (!el) return;
    const overlayElement = new Overlay({
      element: el,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });
    this.map?.addOverlay(overlayElement);

    return overlayElement;
  }

  get overlayLayer() {
    return this._overlayLayer;
  }

  allFilters() {
    return Object.keys(this._filtersByLayer).reduce((acc: any, key: string) => {
      return {
        ...acc,
        [key]: this._filtersByLayer[key].toJson(),
      };
    }, {});
  }

  getLegendData(id: string) {
    const layer = this.getLayer(id);

    if (!layer) return;

    const sublayers = this.getAllSublayers(id);

    const type = layer.get('type');
    const url = layer?.getSource()?.getUrl();

    const options = this._getRequestOptions(id);

    let query: any;
    if (type === LayerType.WMS) {
      query = WMSLegendRequest(sublayers, this.getMapProjection());
    }

    if (!query) return;

    const { method, body, headers, url: requestUrl } = splitUrlIfNeeded(`${url}?${query}`);

    function mapItems(items: any[]): any[] {
      return items.map((i) => ({
        title: i.title,
        icon: i.icon,
        children: mapItems(i.symbols || []),
      }));
    }
    const requestOptions = _.merge({}, options, {
      method,
      body,
      headers,
    });

    return fetch(requestUrl, requestOptions)
      .then((response) => response.json())
      .then((data) => data.nodes || [])
      .then(mapItems);
  }

  updateLayerQuery(id: string, parentFilter?: MapFilters, fieldsToSet?: string[]): any {
    const layer = this.getLayer(id);
    if (!layer) return;

    const filter = this.filters(id);

    if (parentFilter) {
      filter.setJson(parentFilter.toJson(true), false, fieldsToSet);
    }

    const isGroup = this._isGroup(layer);

    if (isGroup) {
      return layer.getLayers().forEach((layer: any) => {
        this.updateLayerQuery(layer.get('id'), filter, fieldsToSet);
      });
    }

    const type = layer.get('type');
    if (!id) return;

    if (type === LayerType.GEOJSON) {
      return this.loadStats(id, filter);
    } else if (type === LayerType.WMS) {
      const source = layer.getSource();
      source.updateParams({
        ...source.getParams(),
        FILTER: `${filter.toWMS()}`,
      });
    } else if (type === LayerType.WFS) {
      const url = layer.getSource().getUrl();
      loadWFSLayer(url, filter.toWFS(), this._getRequestOptions(id)).then((data) => {
        if (!this.map) return;
        this.highlightFeatures(data);
      });
    } else if (type === LayerType.VT) {
      const source = layer.getSource();
      const query = filter.toQuery(true);

      if (!source.get('originalUrls')) {
        source.set('originalUrls', source.getUrls());
      }

      const urls = source.get('originalUrls').map((u: string) => {
        return `${u}?${query}`;
      });

      source.setUrls(urls);
    }
  }

  updateLayersQueries() {
    const filters = this.allFilters();
    Object.keys(filters).forEach((id) => {
      this.updateLayerQuery(id);
    });
  }

  filters(id: string) {
    this._filtersByLayer[id] = this._filtersByLayer[id] || new MapFilters();

    return this._filtersByLayer[id];
  }

  all(target = this.map) {
    if (!target) return [];

    return target.getLayers().getArray() || [];
  }

  get(id: string) {
    return this._layers[id] || {};
  }

  getDraw(id: string = drawLayerId) {
    if (!this._draw) {
      this._draw = new MapDraw(this.map);
      this.getVectorLayer(id);
      this._draw.setLayer(this.getLayer(id));
      this._handleDrawColors();
    }
    return this._draw;
  }

  toggleMeasuring(type: DrawType = 'LineString', opts?: any, value?: boolean, id?: string) {
    return this.getDraw(id)
      .enableContinuousDraw(opts?.continuousDraw)
      .enableMeasurements(opts)
      .toggle(type, value);
  }

  getLayer(id: string) {
    const layer = this.get(id)?.layer;
    if (!layer) return;
    return layer;
  }

  isAdded(id: string, target?: any): any {
    return this.all(target).some((item) => item.get('id') === id);
  }

  get visibleBaseLayerId() {
    return this._visibleBaseLayerId;
  }

  set visibleBaseLayerId(value) {
    this._visibleBaseLayerId = value;
    this.baseLayers.forEach((layer) => {
      this.toggleVisibility(layer.id, this._visibleBaseLayerId === layer.id);
    });

    this._handleDrawColors();
  }

  get visibleBaseLayer() {
    return this.get(this.visibleBaseLayerId);
  }

  get baseLayers() {
    return this._baseLayersIds.map((id) => this.get(id));
  }

  toggleVisibility(id: string, value?: boolean) {
    const layer = this.getLayer(id);
    if (!layer) {
      throw new Error('No layer');
    }

    if (typeof value === 'undefined') {
      value = !this.isVisible(id);
    }

    layer.setVisible(value);
    return this;
  }

  setOpacity(id: string, value?: number) {
    const layer = this.getLayer(id);
    if (!layer) {
      throw new Error('No layer');
    }

    layer.setOpacity(value || 1);

    return this;
  }

  addBaseLayer(id: string, options?: LayerOptions) {
    options = options || {};
    options.isBaseLayer = true;
    if (this._baseLayersIds.length) {
      options.isHidden = true;
    } else {
      this.visibleBaseLayerId = id;
    }
    this._baseLayersIds.push(id);
    return this.add(id, options);
  }

  add(id: string, options?: LayerOptions) {
    if (!this.map) {
      return this._addToQueue('add', id, options);
    }

    const layer = this.getLayer(id);
    if (!layer) {
      throw new Error('Layer not found');
    }

    if (!layer.get('id')) {
      layer.set('id', id);
    }

    const parentGroup = options?.group;

    if (!this.isAdded(id, parentGroup)) {
      this._add(id, parentGroup);
    }

    this.toggleVisibility(id, !options?.isHidden);
    this.setOpacity(id, options?.opacity || 1);

    return this;
  }

  private _add(id: string, parentGroup?: any) {
    if (!this.map) return;

    const layer = this.getLayer(id);
    let filters: MapFilters | undefined;
    if (parentGroup) {
      parentGroup.getLayers().push(layer);
      filters = this.filters(parentGroup.get('id'));
    } else {
      this.map.addLayer(layer);
      filters = this.filters(id);
    }

    if (!filters?.isEmpty) {
      this.updateLayerQuery(id, filters);
    }
  }

  getCenter(feature: Feature) {
    const geometry = feature.getGeometry();
    if (!geometry) return;
    return getCenter(geometry.getExtent());
  }

  async loadStats(id: string, filter?: any) {
    const layer = this.get(id);
    if (!layer?.stats?.url) return;

    const source = layer.layer.getSource();

    const filters = (filter || this.filters(id)).toQuery();
    const { method, body, url, headers } = splitUrlIfNeeded(`${layer.stats.url}?${filters}`);

    const options = _.merge({}, this._getRequestOptions(id), {
      headers,
      body,
      method,
    });

    const data = await fetch(url, options).then((data) => data.json());

    const styleItems = () => {
      const styleFn = layer.stats.styleFn(data);
      source.forEachFeature((feature: any) => {
        let matchingConfig: any;
        if (layer?.stats?.applyToFeatureFn) {
          matchingConfig = layer.stats.applyToFeatureFn(data, feature);
        } else {
          if (!Array.isArray(data)) return;
          matchingConfig = data.find((data: any) => data.id === feature.get('id'));
        }
        feature.set('stats', matchingConfig || {});
        feature.setStyle(styleFn);
      });
    };

    let hasFeatures = !!source.getFeatures().length;

    if (hasFeatures) {
      return styleItems();
    }

    source.on('change', () => {
      if (!hasFeatures) {
        hasFeatures = true;
        styleItems();
      }
    });
  }

  private _isGroup(layer: any) {
    return layer instanceof LayerGroup;
  }

  applyZoomLevel(
    visibleLayersToLevel: string | string[], // -Infinity --> level
    visibleLayersFromLevel: string | string[], // level --> +Infinity
    level?: number, // if not defined - both layer groups will be visible
  ) {
    const applyZoomLevelForLayers = (layers: string | string[], max?: number, min?: number) => {
      layers = Array.isArray(layers) ? layers : [layers];
      layers
        .map((id) => this.get(id))
        .forEach((layer) => {
          layer.layer.setMaxZoom(max);
          layer.layer.setMinZoom(min);
        });
    };

    /*
      FROM: -Infinity
      TO: level or +Infinity;
    */
    applyZoomLevelForLayers(
      visibleLayersToLevel,
      level || Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    );

    /*
      FROM: level or -Infinity
      TO: +Infinity;
    */
    applyZoomLevelForLayers(
      visibleLayersFromLevel,
      Number.POSITIVE_INFINITY,
      level || Number.NEGATIVE_INFINITY,
    );
  }

  async zoom(
    id: string,
    options: {
      addStroke?: boolean;
      filters?: any;
      cb?: Function;
      zoomFn?: Function;
      zoomEmptyFilters?: boolean;
    } = {},
  ): Promise<any> {
    const filters = options?.filters || this.filters(id);

    const layer = this.getLayer(id);

    if (!layer) {
      throw new Error('Layer not exists');
    }

    if (this._isGroup(layer)) {
      return Promise.all(this.all(layer).map((layer: any) => this.zoom(layer.get('id'), options)));
    }

    if (filters.isEmpty && !options?.zoomEmptyFilters) return;

    const queryPromise: any = this._getZoomRequest(id, filters, options);

    if (!queryPromise) return;

    const result = await queryPromise;

    if (!result.length) return;

    this.zoomToFeatureCollection(result, { addStroke: options?.addStroke, cb: options?.zoomFn });

    return result;
  }

  on(type: EventTypes, cb: Function) {
    this._eventsCallbacks[type] = this._eventsCallbacks[type] || [];
    this._eventsCallbacks[type].push(cb);
    return this;
  }

  async getFeatureInfo(
    id: string,
    coordinate: number[],
    cb: Function,
    parentLayerId?: string,
  ): Promise<null | undefined> {
    const layer = this.getLayer(id);
    if (!layer || !this.map) return;

    const filters = this.filters(id);

    const isVisible = this.isVisible(id, true);
    if (!isVisible) return;

    if (this._isGroup(layer)) {
      layer
        .getLayers()
        .forEach(async (layer: any) => this.getFeatureInfo(layer.get('id'), coordinate, cb, id));
    }

    const result = await this._getFeatureInfoRequest(id, coordinate, filters);
    if (!result || !cb) return;

    const mapProjection = this.getMapProjection();

    const transformResponse = (data: any) => {
      if (mapProjection !== this._callbacksProjection) {
        data = convertFeatureCollectionProjection(data, mapProjection, this._callbacksProjection);
      }
      const properties = getPropertiesFromFeaturesArray(
        data.features,
        this.get(id)?.title || (parentLayerId && this.get(parentLayerId).title),
      );

      const geometries = getGeometriesFromFeaturesArray(data.features);

      const response = {
        properties,
        geometries,
      };

      return response;
    };

    cb(transformResponse(result));
  }

  click(callback: Function, opts: { layers?: string[]; right?: boolean } = {}) {
    this._clickCallbacks.push({
      cb: callback,
      opts,
    });
    return this;
  }

  hover(callback: Function) {
    this._hoverCallbacks.push(callback);
    return this;
  }

  async validateLayer(id: string) {
    const layer = this.get(id);
    const url = layer.authEndpoint || layer.layer.getSource()?.getUrl();
    if (!url) return;

    const isValid = await checkAuth(url, this._getRequestOptions(id));

    return isValid;
  }

  zoomToCoordinate(
    x: number,
    y: number,
    opts?: {
      zoom?: number;
      projection?: string;
      defaultToMapProjection?: boolean;
    },
  ) {
    if (!this.map) {
      return this._addToQueue('zoomToCoordinate', x, y, opts);
    }

    const projection = opts?.defaultToMapProjection ? this.getMapProjection() : opts?.projection;

    const coords = convertCoordinatesToProjection([x, y], projection, this.getMapProjection());

    this.map.getView().setCenter(coords);
    this.map.getView().setZoom(opts?.zoom || this._getZoomLevel());
  }

  zoomToExtent(extent: any, opts: { padding?: number; animate?: boolean } = {}) {
    if (!extent || !this.map) return;

    const width = this.map.getViewport().clientWidth;

    let padding = typeof opts.padding === 'undefined' ? 50 : opts.padding;

    if (padding === 50) {
      if (width < 480) padding = 10;
      else if (width < 640) padding = 15;
      else if (width < 768) padding = 25;
      else if (width < 1280) padding = 40;
    }

    this.map.getView().fit(extent, {
      padding: [padding, padding, padding, padding],
      duration: opts?.animate ? 500 : 0,
      maxZoom: this._getZoomLevel(),
    });
  }

  cleanHighlighs() {
    [fixedHighlightLayerId, highlightLayerId].forEach((layerId) => {
      const layer = this.getVectorLayer(layerId);
      const source = layer?.getSource();
      if (!source) return;

      source.clear?.();
    });
  }

  zoomToFeatureCollection(
    data: any,
    options: {
      addStroke?: boolean;
      cb?: Function;
      animate?: boolean;
      dataProjection?: string;
    } = {},
  ) {
    if (_.isEmpty(data)) return;

    if (!this.map) {
      this._addToQueue('zoomToFeatureCollection', data, options);
      return;
    }

    data = dataToFeatureCollection(data);
    data = convertCoordinatesToProjection(data);

    const { extent } = featureCollectionToExtent(data, this.map.getView().getProjection(), {
      applyBuffers: true,
      dataProjection: options?.dataProjection,
    });

    if (options.addStroke) {
      this.highlightFeatures(data, { layer: fixedHighlightLayerId });
    }

    this.zoomToExtent(extent, { animate: options?.animate });

    if (options?.cb && typeof options?.cb === 'function') {
      options.cb();
    }
  }

  getMapProjection() {
    return this.map?.getView()?.getProjection().getCode() || '';
  }

  highlightFeatures(
    data: any,
    options: {
      dataProjection?: string;
      layer?: string;
      merge?: boolean;
    } = {},
  ) {
    if (!this.map) return;

    const layerName = options?.layer || highlightLayerId;

    if (!data && !options?.merge) {
      this.getVectorLayer(layerName).setSource();
      return;
    }

    data = dataToFeatureCollection(data);
    data = convertCoordinatesToProjection(data, options?.dataProjection, this.getMapProjection());
    const { source } = featureCollectionToExtent(data, this.map.getView().getProjection(), {
      dataProjection: options?.dataProjection,
    });

    const layer = this.getVectorLayer(layerName);
    const oldSource = layer.getSource();

    if (oldSource && options?.merge) {
      source.addFeatures(oldSource.getFeatures());
    }

    layer.setSource(source);
  }

  getSublayers(id: string) {
    const layer = this.getLayer(id);
    if (this._isGroup(layer)) {
      return layer
        .getLayers()
        .getArray()
        .map((layer: any) => this.getSublayers(layer.get('id')))
        .reduce((acc: any, item: any) => [...acc, ...(item || [])], []);
    }
    const type = layer.get('type');

    if (type === LayerType.WMS) {
      return layer
        .getSource()
        .getParams()
        .LAYERS.split(',')
        .filter((l: string) => !!l);
    } else if (type === LayerType.ARCGIS) {
      const data = layer.getSource().getParams().LAYERS.split(':');
      let layers = data[1];
      if (!layers) {
        layers = data[0];
      }
      return layers.split(',').filter((l: string) => !!l);
    }

    return [];
  }

  getAllSublayers(id: string) {
    const layer = this.get(id);
    if (!layer?.sublayers?.length) return [];

    function computeSublayers(sublayers: any[]) {
      return sublayers
        .reduce((acc: any[], item): string[] => {
          if (item.sublayers?.length) {
            return [...acc, ...computeSublayers(item.sublayers)];
          }
          if (item?.virtual) return acc;
          return [...acc, item?.value];
        }, [])
        .filter((i) => !!i);
    }

    return computeSublayers(layer.sublayers);
  }

  setActiveFeatures(id: string, query: any, options?: { property?: string }) {
    const layer = this.getLayer(id);
    layer.getSource()?.on('tileloadend', ({ tile }: any) => {
      tile?.getFeatures()?.forEach((feature: any) => {
        const propertyValue = options?.property ? feature.get(options.property) : feature.getId();
        if (['number', 'string'].includes(typeof query)) {
          feature.set('isActive', propertyValue === query);
        } else if (query?.$in?.length) {
          feature.set('isActive', query.$in.includes(propertyValue));
        }
      });
    });
  }

  setAllSublayers(id: string) {
    const layer = this.get(id);
    if (!layer?.sublayers?.length) return;

    return this.setSublayers(id, this.getAllSublayers(id).join(','));
  }

  setSublayers(id: string, layers: string | string[]) {
    layers = Array.isArray(layers) ? layers : [layers];
    const layer = this.getLayer(id);

    if (!layer) return;

    if (this._isGroup(layer)) {
      return layer.getLayers().forEach((layer: any) => this.setSublayers(layer.get('id'), layers));
    }
    const type = layer.get('type');

    if (type === LayerType.WMS) {
      layer.getSource().updateParams({
        LAYERS: layers.join(','),
      });
    } else if (type === LayerType.GEOJSON) {
      this.filters(id).on('all').set('layers', this.getInnerVisibleLayers(id));
    } else if (type === LayerType.ARCGIS) {
      let prefix = layer.getSource().getParams().LAYERS.split(':')[0];
      if (prefix) {
        prefix += ':';
      }
      layer.getSource().updateParams({
        LAYERS: `${prefix}${layers.join(',')}`,
      });
    }
  }

  isVisible(id: string, inMap: boolean = false) {
    const layer = this.getLayer(id);

    if (!layer?.getVisible) return false;

    const result = layer.getVisible();

    if (!inMap || !layer.isVisible || !this.map) return result;

    return result && layer.isVisible(this.map?.getView());
  }

  getInnerVisibleLayers(id: string) {
    const layer = this.get(id);

    if (!layer) return {};

    if (layer?.sublayers?.length && layer?.layer?.getVisible && !layer.layer.getVisible()) {
      return {};
    }

    if (layer?.layer && this._isGroup(layer.layer)) {
      return layer.layer
        .getLayers()
        .getArray()
        .reduce(
          (acc: any, layer: any) => _.merge(acc, this.getInnerVisibleLayers(layer.get('id'))),
          {},
        );
    }

    if (!layer.queryKey) return {};

    return {
      [layer.queryKey]: this.getSublayers(id),
    };
  }

  onChange(id: string, key: string, cb: Function) {
    const layer = this.getLayer(id);
    if (!layer) return;

    layer.on('propertychange', (event: any) => {
      if (event.key !== key) return;
      cb({ value: layer.get(key), oldValue: event.oldValue });
    });

    cb({ value: layer.get(key) });
  }

  get zoomToUserLocationEnabled() {
    return !!this._geolocation;
  }

  updateMyLocationPoint(position: number[], accuracy?: number) {
    const point = new Feature({ geometry: new Point(position) });
    const source = this.getVectorLayer(myLocationLayerId).getSource();
    source.clear();
    source.addFeature(point);
    if (accuracy) {
      const accuracyFeature = new Feature({
        geometry: new Circle(position, accuracy),
        isAccuracy: true,
      });
      source.addFeature(accuracyFeature);
    }
  }

  zoomToUserLocation() {
    if (!this._geolocation) return;

    const positionCoords = this._geolocation.getPosition() as number[];
    const accuracy = this._geolocation.getAccuracy();

    if (!positionCoords || positionCoords.length !== 2) return;

    this.zoomToCoordinate(positionCoords[0], positionCoords[1], {
      // Coordinates are in map projection
      defaultToMapProjection: true,
    });

    this.toggleVisibility(myLocationLayerId, true);
    this.updateMyLocationPoint(positionCoords, accuracy);
    return true;
  }

  enableLocationTracking() {
    if (!this.map) {
      return this._addToQueue('enableLocationTracking');
    }

    this._geolocation = new Geolocation({
      tracking: true,
      trackingOptions: {
        enableHighAccuracy: true,
      },
      projection: this.map?.getView().getProjection(),
    });

    //TODO: add current location layer and make it hidden
    this.add('myLocationLayer', { isHidden: true });
    const eventHandler = (event: BaseEvent) => {
      const visile = this.isVisible(myLocationLayerId);
      if (visile) {
        const values = event.target?.values_;
        const position = values?.position;
        const accuracy = values?.accuracy;
        this.updateMyLocationPoint(position, accuracy);
      }
    };
    this._geolocation.on('change:position', eventHandler);
    this._geolocation.on('change:accuracy', eventHandler);
    return this;
  }

  private _triggerEventCallbacks(event: EventTypes, ...data: any[]) {
    if (!this._eventsCallbacks?.[event]?.length) return;

    this._eventsCallbacks[event].forEach((cb) => cb(...data));
  }

  private _getZoomRequest(id: string, filters: MapFilters, zoomOptions?: any) {
    const layer = this.getLayer(id);
    const type = layer.get('type');
    const url = layer?.getSource()?.getUrl();

    const options = this._getRequestOptions(id);

    if (type === LayerType.WFS) {
      return loadWFSLayer(url, filters.toWFS(), options);
    } else if (type === LayerType.WMS) {
      const query = WMSFeatureQuery(filters.toWMS(), filters.getLayersNames());
      return loadWMSLayer(`${url}?${query}`, options);
    } else if (type === LayerType.GEOJSON) {
      return new Promise((resolve) => {
        function getFeaturesCollection() {
          const features = layer?.getSource().getFeatures();
          if (!features?.length) return;
          return new GeoJSON().writeFeaturesObject(features);
        }

        const featureCollection = getFeaturesCollection();

        if (featureCollection) {
          return resolve(featureCollection);
        }

        layer.getSource().once('featuresloadend', () => {
          // TODO: find a way to trigger this properly
          this.zoomToFeatureCollection(getFeaturesCollection(), {
            addStroke: zoomOptions?.addStroke,
            cb: zoomOptions?.zoomFn,
          });
        });

        // Needs to be resolved straight away in this case
        return resolve('');
      });
    }
  }

  private _getFeatureInfoRequest(id: string, coordinate: number[], filters?: MapFilters) {
    if (!this.map) return;

    const layer = this.getLayer(id);

    const type = layer.get('type');

    if (type === LayerType.WMS) {
      const url = layer
        .getSource()
        .getFeatureInfoUrl(
          coordinate,
          this.map.getView().getResolution(),
          this.map.getView().getProjection(),
          {
            FILTER: filters?.toWMS(),
            INFO_FORMAT: 'application/json',
            LAYERS: layer.getSource().getParams().LAYERS,
            FEATURE_COUNT: 1000,
            FI_POINT_TOLERANCE: 10,
            FI_LINE_TOLERANCE: 10,
            FI_POLYGON_TOLERANCE: 10,
            WITH_GEOMETRY: true,
          },
        );
      return loadWMSLayer(url, this._getRequestOptions(id), false);
    }
  }

  private _getRequestOptions(id: string) {
    const layer = this.get(id);
    if (!layer.getHeaders) return;

    return { headers: layer.getHeaders?.() };
  }

  private _handleDrawColors() {
    if (!this._draw) return;

    const colors = { primary: '', secondary: '' };

    const isTemporary = !!this.visibleBaseLayer.invertColors;

    if (isTemporary) {
      colors.primary = '#ffd154';
      colors.secondary = '#ffbe0b';
    }

    this._draw.setColors(colors.primary, colors.secondary, isTemporary);
  }

  private _getZoomLevel() {
    if (!this.map) return 16;

    const projectionCode = this.map.getView()?.getProjection()?.getCode();

    if (projectionCode === projection) {
      return 10;
    }

    return 16;
  }
}
