import _ from 'lodash';
import { WFS } from 'ol/format';
import { and as andFilter } from 'ol/format/filter';
import { projection } from '../../constants';
import { serializeQuery } from '../../requests';
import { resolve } from './adapters';

const FilterEvent = {
  CHANGE: 'change',
  REMOVE: 'remove',
  SET: 'set',
};
export class MapFilter {
  query: any = {};
  _callbacks: { [key: string]: Function[] } = {};
  constructor(query?: any) {
    this.setJson(query || {});
  }

  set(key: string, value: any) {
    this._triggerCallbacks([FilterEvent.CHANGE, FilterEvent.SET], {
      key,
      value,
      prevValue: this.query[key],
    });

    this.query[key] = value;

    return this;
  }

  get(key: string) {
    return this.query[key];
  }

  has(key: string, value: any = '') {
    if (!value) return !!this.query[key];

    return this.query[key] === value;
  }

  toggle(key: string, value: any) {
    if (this.query[key]) {
      return this.remove(key);
    }

    return this.set(key, value);
  }

  on(type: string, callback: Function) {
    if (typeof callback !== 'function') {
      throw new Error('Callback is not a function');
    }

    return this._addCallback(type, callback);
  }

  toggleOrReplace(key: string, value: any) {
    if (_.isEqual(this.query[key], value)) {
      return this.toggle(key, value);
    }

    return this.set(key, value);
  }

  get isEmpty() {
    return !Object.keys(this.query).length;
  }

  remove(key: string, value?: any) {
    if (!!value && this.query[key] !== value) {
      return this;
    }

    this._triggerCallbacks([FilterEvent.CHANGE, FilterEvent.REMOVE], {
      key,
      value: this.query[key],
    });

    delete this.query[key];
    return this;
  }

  clear() {
    Object.keys(this.query).forEach((key) => this.remove(key));
    return this;
  }

  toJson() {
    return _.cloneDeep(this.query || {});
  }

  setJson(data: any, merge: boolean = false, fieldsToSet: string[] = []) {
    if (fieldsToSet?.length) {
      return fieldsToSet.forEach((field) => {
        if (data[field]) {
          this.set(field, data[field]);
        } else {
          this.remove(field);
        }
      });
    }

    if (merge) {
      data = { ...this.query, ...data };
    }
    this.query = _.cloneDeep(data);
  }

  toQuery() {
    return serializeQuery(this.toJson());
  }

  toString() {
    return JSON.stringify(this.toJson());
  }

  toWFS(filterTypes: string | string[]) {
    if (!Array.isArray(filterTypes)) {
      filterTypes = [filterTypes];
    }
    const adapter = resolve('ogc');
    const query: any = adapter.toQuery(this.query);
    if (query.length > 1) {
      return andFilter(...query);
    }
    return query?.[0];
  }

  toWMS(filterType: string) {
    const adapter = resolve('wms');
    const query: any = adapter.toQuery(this.query);
    if (!query) return '';

    return `${filterType}:${query}`;
  }

  _addCallback(type: string, cb: Function) {
    this._callbacks[type] = this._callbacks[type] || [];
    this._callbacks[type].push(cb);
    return this;
  }

  _triggerCallbacks(types: string | string[], data: any) {
    if (!Array.isArray(types)) {
      types = [types];
    }

    types.forEach((type) => {
      this._callbacks[type]?.forEach((cb) => {
        cb({ eventType: type, ...data });
      });
    });
  }
}

export class MapFilters {
  private _layers: any = {};
  private _globalFilter: MapFilter | undefined;
  constructor() {}

  on(layer: string) {
    this._layers[layer] = this._layers[layer] || new MapFilter();
    return this._layers[layer];
  }

  onAll(layers: string | string[]) {
    if (!Array.isArray(layers)) {
      layers = [layers];
    }

    layers.forEach((layer) => {
      this.on(layer);
    });

    if (!this._globalFilter) {
      this._globalFilter = new MapFilter();

      const triggerLayers = (fn: string, ...data: any[]) => {
        Object.keys(this._layers).forEach((key) => {
          this._layers[key][fn](...data);
        });
      };

      this._globalFilter.on(FilterEvent.REMOVE, ({ key, value }: any) =>
        triggerLayers('remove', key, value),
      );

      this._globalFilter.on(FilterEvent.SET, ({ key, value }: any) =>
        triggerLayers('set', key, value),
      );
    }

    return this._globalFilter;
  }

  getLayersNames() {
    return Object.keys(this._layers) || [];
  }

  toWMS() {
    return Object.entries(this._layers)
      .map(([key, value]: any[]) => {
        return value.toWMS(key);
      })
      .filter((item) => !!item)
      .join(';');
  }

  toWFS() {
    const filterTypes = Object.keys(this._layers);

    let query = Object.values(this._layers).map((value: any) => value.toWFS());

    let filter = query[0];
    if (query.length > 1) {
      query = query.slice(1);
      query.forEach((item: any) => {
        filter = andFilter(filter, item);
      });
    }

    const result = new WFS().writeGetFeature({
      srsName: projection,
      featureTypes: filterTypes,
      outputFormat: 'application/json',
      filter: filter,
    } as any);

    return result;
  }

  toJson(withKeys: boolean = false) {
    return Object.entries(this._layers).reduce(
      (acc: any, [key, value]: any[]) => {
        if (!withKeys) return { ...acc, ...value.toJson() };

        return { ...acc, [key]: value.toJson() };
      },
      {},
    );
  }

  toQuery() {
    return serializeQuery(this.toJson());
  }

  clear() {
    return Object.values(this._layers).map((value: any) => value.clear());
  }

  setJson(
    data: { [key: string]: any },
    merge: boolean = false,
    fieldsToSet: string[] = [],
  ) {
    Object.keys(data).forEach((key) => {
      this.on(key).setJson(data[key], merge, fieldsToSet);
    });
  }

  get isEmpty() {
    if (!Object.keys(this._layers).length) return true;

    return Object.values(this._layers).every((filter: any) => filter.isEmpty);
  }

  clone() {
    return _.cloneDeep(this);
  }
}