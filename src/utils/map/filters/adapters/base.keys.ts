import type { GenericObject } from '@/types';

export class BaseAdapterKeys {
  $eq(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $ne(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $and(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $not(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $or(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $nor(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $gt(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $gte(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $lt(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $lte(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $exists(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $in(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $nin(_field: string, _value: any) {
    throw new Error(`Method is not implemented.`);
  }

  $raw(_field: string, value: any) {
    return value;
  }

  mergeQueries(_queriesByLayer: GenericObject<any>) {
    throw new Error(`Method is not implemented.`);
  }
}
