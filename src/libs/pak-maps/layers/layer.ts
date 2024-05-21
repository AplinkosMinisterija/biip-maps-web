import type { Layer } from 'ol/layer';
import LayerGroup from 'ol/layer/Group';

export enum PakmapsLayerType {
  WMS = 'WMS',
  WFS = 'WFS',
  GeoJSON = 'GeoJSON',
  VectorTiles = 'VectorTiles',
  ARCGIS = 'ARCGIS',
}

export interface PakmapsLayerOpts {
  id?: string;
  name?: string;
  description?: string | string[];
  sublayers?: PakmapsLayerOpts[];
  value?: string;
  hidden?: boolean;
  layer?: Layer | LayerGroup;
  type?: PakmapsLayerType;
  pakmapsLayer?: PakmapsLayer;
}

export class PakmapsLayer {
  id?: string;
  name?: string;
  layer?: Layer | LayerGroup;
  description?: string | string[];
  type?: PakmapsLayerType;
  sublayers: PakmapsLayer[] = [];
  value?: string;

  constructor(opts: PakmapsLayerOpts) {
    if (!opts?.name && !opts?.id) {
      throw new Error('Name or ID should be initialized');
    }

    this.id = opts.id || opts.name;
    this.name = opts.name || opts.id;
    this.description = opts.description;
    this.value = opts.value;

    if (opts.layer) {
      if (!opts.type) {
        throw new Error(`Type for "${this.id}" layer not set!`);
      }

      opts.layer.set('id', this.id);
      opts.layer.set('type', opts.type);

      this.type = opts.type;
      this.layer = opts.layer;
    }

    if (opts.sublayers?.length) {
      this.addSublayers(opts.sublayers);
    }

    if (opts.hidden && this.layer) {
      this.layer.setVisible(false);
    }
  }

  addSublayer(opts: PakmapsLayerOpts) {
    if (opts?.pakmapsLayer) {
      this.sublayers.push(opts.pakmapsLayer);
      return this;
    }

    const sublayer = new PakmapsLayer(opts);
    this.sublayers.push(sublayer);

    return this;
  }

  addSublayers(items: PakmapsLayerOpts[]) {
    items.forEach((item) => this.addSublayer(item));

    const withLayers: Layer[] = this.sublayers
      .filter((item) => !!item.layer)
      .map((item) => item.layer as Layer);

    if (withLayers?.length) {
      this.layer = new LayerGroup({
        layers: withLayers.reverse(),
      });
    }

    return this;
  }

  // temp
  get title() {
    return this.name;
  }
}