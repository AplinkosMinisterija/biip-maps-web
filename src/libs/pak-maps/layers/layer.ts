import type { Layer } from 'ol/layer';

export enum PakmapsLayerType {
  WMS = 'WMS',
  WFS = 'WFS',
  GeoJSON = 'GeoJSON',
  VectorTiles = 'VectorTiles',
  ARCGIS = 'ARCGIS',
}

export type PakmapsLayerOpts = {
  id?: string;
  name?: string;
  description?: string | string[];
  sublayers?: PakmapsLayerOpts[];
  layer?: Layer;
  type?: PakmapsLayerType;
  value?: string;
  [key: string]: any;
};

export class PakmapsLayer {
  id: string;
  name: string;
  layer: Layer | undefined;
  description: string | string[] | undefined;
  type: PakmapsLayerType | undefined;
  sublayers: PakmapsLayer[] = [];

  constructor(opts: PakmapsLayerOpts) {
    if (!opts?.name && !opts?.id) {
      throw new Error('Name or ID should be initialized');
    }

    this.id = opts.id || opts.name || '';
    this.name = opts.name || opts.id || '';
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

  addSublayer(opts: PakmapsLayerOpts) {
    const sublayer = new PakmapsLayer(opts);
    this.sublayers.push(sublayer);

    return this;
  }

  addSublayers(items: PakmapsLayerOpts[]) {
    items.forEach((item) => this.addSublayer(item));
    return this;
  }

  // temp
  get title() {
    return this.name;
  }
}
