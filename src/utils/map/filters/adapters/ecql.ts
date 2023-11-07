import _ from 'lodash';
import { BaseAdapter } from './base';

function parseValue(value: any): any {
  if (Array.isArray(value)) return value.map((v) => parseValue(v));

  if (_.isString(value)) {
    value = `'${value}'`;
  }
  return value;
}

function where(field: string, value?: any, operator?: string) {
  if (!operator) return `"${field}" ${value}`;

  return `"${field}" ${operator} ${value}`;
}

export class ECQLAdapter extends BaseAdapter {
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
    return where(field, value, '>');
  }

  $gte(field: string, value: number) {
    return where(field, value, '>=');
  }

  $lt(field: string, value: number) {
    return where(field, value, '<');
  }

  $lte(field: string, value: number) {
    return where(field, value, '<=');
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
}
