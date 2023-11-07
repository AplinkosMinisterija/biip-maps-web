import _ from 'lodash';
import { BaseAdapter } from './base';
import type { GenericObject } from '@/types';

function parseValue(value: any): any {
  if (Array.isArray(value)) return value.map((v) => parseValue(v));

  if (_.isString(value)) {
    value = `'${value}'`;
  }
  return value;
}

function where(field: string, value?: any, operator?: string) {
  field = _.snakeCase(field);
  if (!operator) return `"${field}" ${value}`;

  return `"${field}" ${operator} ${value}`;
}

export class WMSAdapter extends BaseAdapter {
  $eq(field: string, value: string | number) {
    return where(field, parseValue(value), '=');
  }

  $ne(field: string, value: string | number) {
    return where(field, parseValue(value), '<>');
  }

  $and(_: string, value: any[]) {
    if (!value.length) return '';
    if (value.length <= 1) return value[0];
    return `( ${value.join(' AND ')} )`;
  }

  $or(_: string, value: any[]) {
    if (!value.length) return '';
    if (value.length <= 1) return value[0];
    return `( ${value.join(' OR ')} )`;
  }

  $nor(_: string, value: any[]) {
    value = this.$or(_, value);
    return this.$not(_, value);
  }

  $not(_: string, value: any) {
    return `NOT ${value}`;
  }

  $gt(field: string, value: number) {
    return where(field, parseValue(value), '>');
  }

  $gte(field: string, value: number) {
    return where(field, parseValue(value), '>=');
  }

  $lt(field: string, value: number) {
    return where(field, parseValue(value), '<');
  }

  $lte(field: string, value: number) {
    return where(field, parseValue(value), '<=');
  }

  $exists(field: string, value: boolean) {
    return where(field, `IS${value ? ' NOT' : ''} NULL`);
  }

  $in(field: string, value: any[]) {
    return where(field, `( ${parseValue(value).join(' , ')} )`, 'IN');
  }

  $nin(field: string, value: any[]) {
    return where(field, `( ${parseValue(value).join(' , ')} )`, 'NOT IN');
  }

  mergeQueries(queriesByLayer: GenericObject<any>) {
    return Object.entries(queriesByLayer)
      .map(([key, value]: any[]) => {
        if (!value) return '';
        return `${key}:${value}`;
      })
      .filter((item) => !!item)
      .join(';');
  }
}
