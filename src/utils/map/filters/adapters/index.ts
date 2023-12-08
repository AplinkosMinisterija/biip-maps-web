import _ from 'lodash';
import { BaseAdapter } from './base';
import { WMSAdapter } from './wms';
import { OGCAdapter } from './ogc';
import { ECQLAdapter } from './ecql';

export const Adapters: any = {
  Base: BaseAdapter,
  WMS: WMSAdapter,
  OGC: OGCAdapter,
  ECQL: ECQLAdapter,
};

export function getByName(name: string) {
  if (!name) return null;

  const n = Object.keys(Adapters).find((n) => n.toLowerCase() == name.toLowerCase());
  if (n) return Adapters[n];
}

export function resolve(opt: any) {
  if (opt instanceof Adapters.Base) {
    return opt;
  } else if (_.isString(opt)) {
    const AdapterClass = getByName(opt);
    if (AdapterClass) {
      return new AdapterClass();
    }

    throw new Error(`Invalid Adapter type '${opt}'.`);
  }

  return new Adapters.Base();
}
