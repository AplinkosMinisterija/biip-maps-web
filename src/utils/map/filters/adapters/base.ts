import _ from 'lodash';
import type { GenericObject } from '@/types';
import { BaseAdapterKeys } from './base.keys';

export class BaseAdapter extends BaseAdapterKeys {
  _callQueryKey(key: string, field?: string, value?: any, fallbackFn?: string) {
    let fn = (this as any)[key];

    if (!fn && fallbackFn) {
      fn = (this as any)[fallbackFn];
    }

    if (fn) {
      return fn.call(this, field, value);
    }

    throw new Error(`${key} method is not implemented.`);
  }

  _processQuery(query: GenericObject<any>, field?: string) {
    const items: any[] = Object.entries(query).map(([key, value]: any) => {
      if (['$or', '$nor', '$in', '$nin', '$and'].includes(key)) {
        if (!Array.isArray(value)) {
          throw new Error(`Value is not an array - ${value} (${key})`);
        }

        if (['$or', '$nor', '$and'].includes(key)) {
          if (value.length < 2) {
            throw new Error(
              `Array should have at least 2 items - ${value} (${key})`,
            );
          }

          value = value.map((query) => this._processQuery(query, field));
        }

        return this._callQueryKey(key, field, value);
      } else if (key === '$raw') {
        return this.$raw(field as string, value);
      } else if (key === '$not') {
        return this.$not(field as string, this._processQuery(value, field));
      }

      if (_.isObject(value)) {
        return this._processQuery(value, key);
      }

      return this._callQueryKey(key, field || key, value, '$eq');
    });

    return this.$and(field as string, items);
  }

  toQuery(query: GenericObject<any>) {
    return this._processQuery(query);
  }
}
