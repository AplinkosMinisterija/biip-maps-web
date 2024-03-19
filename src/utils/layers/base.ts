import TileGrid from 'ol/tilegrid/TileGrid';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { getCopyrightLabel } from '../utils';
import { projection, projection3857 } from '../constants';
import ImageLayer from 'ol/layer/Image';
import ImageArcGISRest from 'ol/source/ImageArcGISRest';
import { MapboxVectorLayer } from 'ol-mapbox-style';

const geoportalUrl = (type: string) => {
  return `https://www.geoportal.lt/mapproxy/${type}`;
};

const geoportalCopyright = (type: string) => {
  return getCopyrightLabel('geoportal.lt', `${geoportalUrl(type)}/MapServer`);
};

const geoportalTileUrl = (type: string) => {
  return `${geoportalUrl(type)}/MapServer/tile/{z}/{y}/{x}`;
};

const nztCopyright = getCopyrightLabel(
  'Nacionalinė žemės tarnyba prie Aplinkos ministerijos',
  'https://www.nzt.lt/',
);

const nztUrl = (type: string) => {
  return `${geoportalUrl(type)}/MapServer/tile/{z}/{y}/{x}`;
};

const kpdCopyright = getCopyrightLabel('Kultūros paveldo departamentas', 'https://kvr.kpd.lt');

const crossOrigin = 'Anonymous';

export const vectorProtonLight = {
  id: 'vectorProtonLight',
  title: 'Vektorinis šviesus',
  layer: new MapboxVectorLayer({
    declutter: true,
    styleUrl: 'https://cdn.biip.lt/tiles/proton/styles/light.json',
  }),
};

export const vectorProtonDark = {
  id: 'vectorProtonDark',
  title: 'Vektorinis tamsus',
  layer: new MapboxVectorLayer({
    declutter: true,
    styleUrl: 'https://cdn.biip.lt/tiles/proton/styles/dark.json',
  }),
};

export const vectorProtonWhite = {
  id: 'vectorProtonWhite',
  title: 'Vektorinis baltas',
  layer: new MapboxVectorLayer({
    declutter: true,
    styleUrl: 'https://cdn.biip.lt/tiles/proton/styles/white.json',
  }),
};
export const vectorProtonBlack = {
  id: 'vectorProtonBlack',
  title: 'Vektorinis juodas',
  layer: new MapboxVectorLayer({
    declutter: true,
    styleUrl: 'https://cdn.biip.lt/tiles/proton/styles/black.json',
  }),
};

export const geoportalTopo = {
  id: 'geoportalTopo',
  title: 'Topografinis',
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: geoportalCopyright('gisc_pagrindinis'),
      url: geoportalTileUrl('gisc_pagrindinis'),
      tileGrid: new TileGrid({
        extent: [-3868431.3448, 3787209.7969000004, 3227425.9922, 9284025.053],
        origin: [-5122000, 10000100],
        resolutions: [
          1322.9193125052918, 793.7515875031751, 529.1677250021168, 264.5838625010584,
          132.2919312505292, 66.1459656252646, 26.458386250105836, 13.229193125052918,
          6.614596562526459, 2.6458386250105836, 1.3229193125052918, 0.5291677250021167,
          0.26458386250105836, 0.13229193125052918,
        ],
        tileSize: [512, 512],
      }),
      projection,
    }),
  }),
};

export const geoportalTopo3857 = {
  id: 'geoportalTopo3857',
  title: 'Topografinis',
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: geoportalCopyright('gisc_pagrindinis_wm'),
      url: geoportalTileUrl('gisc_pagrindinis_wm'),
      tileGrid: new TileGrid({
        extent: [-2337708.2691449076, 3105406.5486537516, 7681044.112130543, 18383409.96838039],
        origin: [-20037508.342787, 20037508.342787],
        resolutions: [
          2445.98490512499, 1222.992452562495, 611.4962262813797, 305.74811314055756,
          152.87405657041106, 76.43702828507324, 38.21851414253662, 19.10925707126831,
          9.554628535634155, 4.77731426794937, 2.388657133974685, 1.1943285668550503,
          0.5971642835598172,
        ],
        tileSize: [256, 256],
      }),
      projection: projection3857,
    }),
  }),
};

export const geoportalOrto = {
  id: 'geoportalOrto',
  title: 'Ortofoto',
  invertColors: true,
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: nztCopyright,
      url: nztUrl('nzt_ort10lt_recent'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          793.7515875031751, 529.1677250021168, 264.5838625010584, 132.2919312505292,
          66.1459656252646, 26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836, 1.3229193125052918, 0.5291677250021167, 0.26458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalTopoGray = {
  id: 'geoportalTopoGray',
  title: 'Topografinis, pilkas',
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: geoportalCopyright('gisc_pilkas'),
      url: geoportalTileUrl('gisc_pilkas'),
      tileGrid: new TileGrid({
        extent: [1845.9797000000253, 5718306.1807, 1017848.0116999997, 6527932.799900001],
        origin: [-5122000, 10000100],
        resolutions: [
          1322.9193125052918, 793.7515875031751, 529.1677250021168, 264.5838625010584,
          132.2919312505292, 66.1459656252646, 26.458386250105836, 13.229193125052918,
          6.614596562526459, 2.6458386250105836, 1.3229193125052918, 0.5291677250021167,
          0.26458386250105836,
        ],
        tileSize: [512, 512],
      }),
      projection,
    }),
  }),
};

export const geoportalOrto1995 = {
  id: 'geoportalOrto1995',
  title: 'ORT10LT 1995-2001',
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: nztCopyright,
      url: nztUrl('nzt_ort10lt_1995_2001_public'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          793.7515875031751, 529.1677250021168, 264.5838625010584, 132.2919312505292,
          66.1459656252646, 26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalOrto2005 = {
  id: 'geoportalOrto2005',
  title: 'ORT10LT 2005-2006',
  layer: new TileLayer({
    source: new XYZ({
      attributions: nztCopyright,
      url: nztUrl('nzt_ort10lt_2005_2006_public'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          793.7515875031751, 529.1677250021168, 264.5838625010584, 132.2919312505292,
          66.1459656252646, 26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalOrto2009 = {
  id: 'geoportalOrto2009',
  title: 'ORT10LT 2009-2010',
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: nztCopyright,
      url: nztUrl('nzt_ort10lt_2009_2010_public'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          793.7515875031751, 529.1677250021168, 264.5838625010584, 132.2919312505292,
          66.1459656252646, 26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalOrto2012 = {
  id: 'geoportalOrto2012',
  title: 'ORT10LT 2012-2013',
  layer: new TileLayer({
    source: new XYZ({
      attributions: nztCopyright,
      url: nztUrl('nzt_ort10lt_2012_2013_public'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          793.7515875031751, 529.1677250021168, 264.5838625010584, 132.2919312505292,
          66.1459656252646, 26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalOrto2015 = {
  id: 'geoportalOrto2015',
  title: 'ORT10LT 2015-2017',
  layer: new TileLayer({
    source: new XYZ({
      attributions: nztCopyright,
      url: nztUrl('nzt_ort10lt_2015_2017_public'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          793.7515875031751, 529.1677250021168, 264.5838625010584, 132.2919312505292,
          66.1459656252646, 26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalOrto2018 = {
  id: 'geoportalOrto2018',
  title: 'ORT10LT 2018-2020',
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: nztCopyright,
      url: nztUrl('nzt_ort10lt_2018_2020_public'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          793.7515875031751, 529.1677250021168, 264.5838625010584, 132.2919312505292,
          66.1459656252646, 26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalHybrid = {
  id: 'geoportalHybrid',
  title: 'Mišrus',
  layer: new TileLayer({
    source: new XYZ({
      attributions: geoportalCopyright('gisc_misrus_public'),
      url: geoportalTileUrl('gisc_misrus_public'),
      tileGrid: new TileGrid({
        extent: [236725.44661756046, 5930813.423926848, 717678.0543561094, 6291634.374735416],
        origin: [-5122000, 10000100],
        resolutions: [
          1322.9193125052918, 793.7515875031751, 529.1677250021168, 264.5838625010584,
          132.2919312505292, 66.1459656252646, 26.458386250105836, 13.229193125052918,
          6.614596562526459, 2.6458386250105836,
        ],
        tileSize: [512, 512],
      }),
      projection,
    }),
  }),
};

export const geoportalGrpk = {
  id: 'geoportalGrpk',
  title: 'GRPK',
  layer: new TileLayer({
    source: new XYZ({
      crossOrigin,
      attributions: geoportalCopyright('gisc_misrus_pugisc_grpkblic'),
      url: geoportalTileUrl('gisc_grpk'),
      tileGrid: new TileGrid({
        extent: [125559.50331997534, 5922338.972788963, 846285.9447728583, 6303868.902515489],
        origin: [-5122000, 10000100],
        resolutions: [
          1322.9193125052918, 793.7515875031751, 529.1677250021168, 264.5838625010584,
          132.2919312505292, 66.1459656252646, 26.458386250105836, 13.229193125052918,
          6.614596562526459, 2.6458386250105836, 1.3229193125052918, 0.5291677250021167,
          0.26458386250105836,
        ],
        tileSize: [256, 256],
      }),
      projection,
    }),
  }),
};

export const geoportalForests = {
  id: 'geoportalForests',
  title: 'Miškai',
  layer: new ImageLayer({
    source: new ImageArcGISRest({
      attributions: geoportalCopyright('vmt_mkd'),
      ratio: 1,
      params: {
        LAYERS: 'show:0,1,2,4,5,7,8,9',
      },
      url: `${geoportalUrl('vmt_mkd')}/MapServer`,
    }),
  }),
  sublayers: [
    {
      name: 'VMU urėdijos regioniniai padaliniai',
      value: '0',
    },
    {
      name: 'Urėdijos',
      value: '1',
    },
    {
      name: 'Girininkijos',
      value: '2',
    },
    {
      name: 'Girininkijos iki 2022-12-31',
      value: '3',
    },
    {
      name: 'Kertinės miško buveinės',
      value: '4',
    },
    {
      name: 'Kvartalai',
      value: '5',
    },
    {
      name: 'Kvartalai iki 2022-12-31',
      value: '6',
    },
    {
      name: 'Valstybinės reikšmės miškų plotų ribos',
      value: '7',
    },
    {
      name: 'Miškų pogrupiai',
      value: '8',
    },
    {
      name: 'Miško sklypai',
      value: '9',
    },
  ],
};

geoportalForests.layer.set('type', 'ARCGIS');

export const geoportalKvr = {
  id: 'geoportalKvr',
  title: 'Kultūros vertybių registras',
  description: kpdCopyright,
  layer: new ImageLayer({
    source: new ImageArcGISRest({
      attributions: geoportalCopyright('kpd_kvr'),
      ratio: 1,
      params: {
        LAYERS: 'show:0,1,2',
      },
      url: `${geoportalUrl('kpd_kvr')}/MapServer`,
    }),
  }),
  sublayers: [
    {
      name: 'Kultūros vertybių apsaugos zonos',
      value: '2',
    },
    {
      name: 'Plotiniai objektai',
      value: '1',
    },
    {
      name: 'Taškiniai objektai',
      value: '0',
    },
  ],
};

geoportalKvr.layer.set('type', 'ARCGIS');
