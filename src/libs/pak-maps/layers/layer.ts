import type { Layer } from 'ol/layer';
import { PakmapsSublayer, type PakmapsSublayerOpts } from './sublayer';

export enum PakmapsLayerType {
  WMS = 'WMS',
  WFS = 'WFS',
  GeoJSON = 'GeoJSON',
  VectorTiles = 'VectorTiles',
  ARCGIS = 'ARCGIS',
}

export type PakmapsLayerOpts = {
  id: string;
  name?: string;
  description?: string | string[];
  sublayers?: PakmapsSublayer[];
  layer?: Layer;
  type?: PakmapsLayerType;
};

export class PakmapsLayer {
  id: string;
  name: string;
  layer: Layer | undefined;
  description: string | string[] | undefined;
  type: PakmapsLayerType | undefined;
  sublayers: PakmapsSublayer[] = [];

  constructor(opts: PakmapsLayerOpts) {
    this.id = opts.id;
    this.name = opts.name || opts.id;
    this.description = opts.description;

    if (opts.layer) {
      if (!opts.type) {
        throw new Error(`Type for "${this.id}" layer not set!`);
      }

      this.type = opts.type;
      this.layer = opts.layer;
      this.layer.set('id', this.id);
      this.layer.set('type', this.type);
    }

    if (opts.sublayers?.length) {
      this.addSublayers(opts.sublayers);
    }
  }

  addSublayer(opts: PakmapsSublayerOpts) {
    const sublayer = new PakmapsSublayer(opts);
    this.sublayers.push(sublayer);

    return this;
  }

  addSublayers(items: PakmapsSublayerOpts[]) {
    items.forEach((item) => this.addSublayer(item));
    return this;
  }

  // temp
  get title() {
    return this.name;
  }
}
