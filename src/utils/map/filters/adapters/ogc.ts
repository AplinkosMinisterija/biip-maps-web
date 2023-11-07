import { BaseAdapter } from './base';
import type { GenericObject } from '@/types';

import * as filters from 'ol/format/filter';

export class OGCAdapter extends BaseAdapter {
  $eq(field: string, value: string | number) {
    return filters.equalTo(field, value);
  }

  $ne(field: string, value: string | number) {
    return filters.notEqualTo(field, value);
  }

  $and(_: string, value: any[]) {
    if (value.length <= 1) {
      return value;
    }
    return filters.and(...value);
  }

  $or(_: string, value: any[]) {
    if (value.length <= 1) {
      return value;
    }
    return filters.or(...value);
  }

  $nor(_: string, value: any[]) {
    return this.$not(_, this.$or(_, value));
  }

  $not(_: string, value: any) {
    return filters.not(value);
  }

  $gt(field: string, value: number) {
    return filters.greaterThan(field, value);
  }

  $gte(field: string, value: number) {
    return filters.greaterThanOrEqualTo(field, value);
  }

  $lt(field: string, value: number) {
    return filters.lessThan(field, value);
  }

  $lte(field: string, value: number) {
    return filters.lessThanOrEqualTo(field, value);
  }

  $exists(field: string, value: boolean) {
    const result = filters.isNull(field);
    if (!value) return result;
    return this.$not(field, result);
  }

  $in(field: string, value: any[]) {
    return this.$or(
      field,
      value.map((v) => this.$eq(field, v)),
    );
  }

  $nin(field: string, value: any[]) {
    return this.$not(field, this.$in(field, value));
  }

  mergeQueries(queriesByLayer: GenericObject<any>) {
    return queriesByLayer;
  }
}
