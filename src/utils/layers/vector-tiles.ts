import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { Feature } from 'ol';
import { projection3857 } from '../constants';
import { boundariesHost, cdnHost, qgisTilesUrl, smalsuolisApiHost } from '@/config';
import { vectorTileStyles } from './styling';
// @ts-expect-error pmtiles doesn't have types :(
import { PMTilesVectorSource } from 'ol-pmtiles';

function getVectorTilesUrl(type: string, source: string, baseUrl?: string) {
  return `${baseUrl || qgisTilesUrl}/${type}/${source}/{z}/{x}/{y}`;
}

function getVectorTileLayer(
  type: string,
  source: string,
  opts?: {
    idProperty?: string;
    declutter?: boolean;
    tileSize?: number;
    baseUrl?: string;
    tileSourceClass?: any;
    url?: string;
    attributions?: string | string[];
  },
) {
  const tileSize = opts?.tileSize || 512;

  const tileSource: any = opts?.tileSourceClass || VectorTileSource;
  const vtSource = new tileSource({
    overlaps: false,
    projection: projection3857,
    format: new MVT({
      featureClass: Feature,
      idProperty: opts?.idProperty,
    }),
    attributions: opts?.attributions,

    tileSize: [tileSize, tileSize],
    url: opts?.url || getVectorTilesUrl(type, source, opts?.baseUrl),
  });

  return new VectorTileLayer({
    renderMode: 'vector',
    declutter: !!opts?.declutter,
    source: vtSource,
    style: vectorTileStyles({ layerPrefix: type }),
  });
}

export const municipalitiesServiceVT = {
  id: 'municipalitiesServiceVT',
  name: 'Savivaldybės',

  layer: getVectorTileLayer('boundaries', '', {
    idProperty: 'code',
    declutter: true,
    url: `${boundariesHost}/tiles/municipalities.pmtiles`,
    tileSourceClass: PMTilesVectorSource,
  }),
};

export const parcelsServiceVT = {
  id: 'parcelsServiceVT',
  name: 'Kadastriniai sklypai',

  layer: getVectorTileLayer('boundaries', '', {
    idProperty: 'unique_number',
    declutter: true,
    url: `${boundariesHost}/tiles/parcels.pmtiles`,
    tileSourceClass: PMTilesVectorSource,
  }),
};

export const eldershipsServiceVT = {
  id: 'eldershipsServiceVT',
  name: 'Seniūnijos',

  layer: getVectorTileLayer('boundaries', '', {
    idProperty: 'code',
    declutter: true,
    url: `${boundariesHost}/tiles/elderships.pmtiles`,
    tileSourceClass: PMTilesVectorSource,
  }),
};

export const countiesServiceVT = {
  id: 'countiesServiceVT',
  name: 'Apskritys',
  layer: getVectorTileLayer('boundaries', '', {
    idProperty: 'code',
    declutter: true,
    url: `${boundariesHost}/tiles/counties.pmtiles`,
    tileSourceClass: PMTilesVectorSource,
  }),
};

export const residentialAreasServiceVT = {
  id: 'residentialAreasServiceVT',
  name: 'Gyvenamosios vietovės',
  layer: getVectorTileLayer('boundaries', '', {
    idProperty: 'code',
    declutter: true,
    url: `${boundariesHost}/tiles/residential-areas.pmtiles`,
    tileSourceClass: PMTilesVectorSource,
  }),
};

export const uetkMergedCentroidServiceVT = {
  id: 'uetkMergedCentroidServiceVT',
  name: 'UETK',
  layer: getVectorTileLayer('uetk', 'uetk_merged.1', {
    idProperty: 'cadastral_id',
  }),
};

export const zuvinimasServiceVT = {
  id: 'zuvinimasServiceVT',
  name: 'Įžuvinimas',
  layer: getVectorTileLayer('zuvinimas', 'fish_stockings', {
    idProperty: 'id',
  }),
};

export const smalsuolisServiceVT = {
  id: 'smalsuolisServiceVT',
  name: 'Smalsuolis',
  layer: getVectorTileLayer('tiles', 'events', {
    idProperty: 'id',
    baseUrl: smalsuolisApiHost,
  }),
};

smalsuolisServiceVT.layer.set('type', 'vt');

export const huntingServiceVT = {
  id: 'huntingServiceVT',
  layer: getVectorTileLayer('mpv', '', {
    idProperty: 'id',
    declutter: true,
    url: new URL('tiles/medziokle/pmtiles/hunting-areas.pmtiles', cdnHost).toString(),
    tileSourceClass: PMTilesVectorSource,
  }),
};

export const huntingFootprintTracksServiceVT = {
  id: 'huntingFootprintTracksServiceVT',
  layer: getVectorTileLayer('footprintTracks', '', {
    idProperty: 'id',
    declutter: true,
    url: new URL('tiles/medziokle/pmtiles/footprint-tracks.pmtiles', cdnHost).toString(),
    tileSourceClass: PMTilesVectorSource,
  }),
};

export const forestCutsLkmpVT = {
  id: 'forestCutsLkmpVT',
  name: 'Kirtimų leidimai nuo 2024-05',
  layer: getVectorTileLayer('forests', '', {
    idProperty: 'atributai',
    declutter: true,
    url: 'https://lkmp.alisas.lt/maps/kirtimai/{z}/{x}/{y}.pbf',
  }),
};

export const artimaAplinkaVT = {
  id: 'artimaAplinkaVT',
  name: 'Artima aplinka',
  layer: getVectorTileLayer('forests', '', {
    idProperty: 'atributai',
    declutter: true,
    url: 'https://lkmp.alisas.lt/maps/n2k/{z}/{x}/{y}.pbf',
  }),
};
