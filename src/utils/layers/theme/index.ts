import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import LayerGroup from 'ol/layer/Group';
import { Text, Fill } from 'ol/style';
import { useConfigStore } from '@/stores/config';
import { getCopyrightLabel } from '../../utils';
import { qgisServerUrl, rusysApiHost } from '../../../config';
import { getVectorLayer, getWMSImageLayer } from '../utils';
import { PakmapsLayer, PakmapsLayerType } from '@/libs/pak-maps';
import type { Layer } from 'ol/layer';

export * from './stvk';
export * from './biomon';

const config = () => {
  return useConfigStore();
};

const biipCopyright = getCopyrightLabel(
  'Biologinės įvairovės informacinė platforma',
  'https://www.biip.lt',
);
const aaaCopyright = getCopyrightLabel('Aplinkos apsaugos agentūra', 'https://aaa.lrv.lt');
const zudcCopyright = getCopyrightLabel(
  'VĮ Žemės ūkio duomenų centras, VĮ Registrų centras',
  'https://www.zudc.lt',
);
const rcCopyright = getCopyrightLabel(
  'Adresų registras, VĮ Registrų centras',
  'https://www.registrucentras.lt',
);

export const huntingService = new PakmapsLayer({
  id: 'huntingService',
  description: biipCopyright,
  layer: getWMSImageLayer(
    `${qgisServerUrl}/medziokle_mpv`,
    'mpv_info_geom,mpv_info_geom_50k,mpv_info_geom_250k',
    biipCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const administrativeBoundariesService = new PakmapsLayer({
  id: 'administrativeBoundariesService',
  name: 'Administracinės ribos',
  description: biipCopyright,
  layer: getWMSImageLayer(`${qgisServerUrl}/administrative_boundaries`, '', biipCopyright),
  sublayers: [
    { value: 'municipalities', name: 'Savivaldybės' },
    { value: 'counties', name: 'Apskritys' },
    { value: 'elderships', name: 'Seniūnijos' },
    { value: 'residential_areas', name: 'Gyvenamosios vietovės' },
  ],
  type: PakmapsLayerType.WMS,
});

export const administrativeBoundariesLabelsService = new PakmapsLayer({
  id: 'administrativeBoundariesLabelsService',
  name: 'Administracinės ribos',
  description: biipCopyright,
  layer: getWMSImageLayer(`${qgisServerUrl}/administrative_boundaries`, '', biipCopyright),
  sublayers: [
    { value: 'residential_areas_labels', name: 'Gyvenamosios vietovės' },
    { value: 'elderships_labels', name: 'Seniūnijos' },
    { value: 'municipalities_labels', name: 'Savivaldybės' },
    { value: 'counties_labels', name: 'Apskritys' },
  ],
  type: PakmapsLayerType.WMS,
});

export const huntingTracksService = new PakmapsLayer({
  id: 'huntingTracksService',
  description: biipCopyright,
  layer: getWMSImageLayer(
    `${qgisServerUrl}/hunting_footprint_tracks`,
    'footprint_tracks',
    biipCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const zuvinimasService = new PakmapsLayer({
  id: 'zuvinimasService',
  description: biipCopyright,
  layer: getWMSImageLayer(`${qgisServerUrl}/zuvinimas`, 'fish_stockings', biipCopyright),
  type: PakmapsLayerType.WMS,
});

export const uetkService = new PakmapsLayer({
  id: 'uetkService',
  name: 'UETK',
  description: [aaaCopyright, biipCopyright],
  sublayers: [
    { value: 'upiu_baseinu_rajonai', name: 'Upių baseinų rajonai' },
    { value: 'upiu_baseinai', name: 'Upių baseinai' },
    { value: 'upiu_pabaseiniai', name: 'Upių pabaseiniai' },
    { value: 'upes', name: 'Upės' },
    { value: 'ezerai_tvenkiniai', name: 'Ežerai ir tvenkiniai' },
    { value: 'vandens_matavimo_stotys', name: 'Vandens matavimo stotys' },
    { value: 'vandens_tyrimu_vietos', name: 'Vandens tyrimų vietos' },
    { value: 'zemiu_uztvanka', name: 'Žemių užtvanka' },
    { value: 'vandens_pertekliaus_pralaida', name: 'Vandens pertekliaus pralaida' },
    { value: 'zuvu_pralaida', name: 'Žuvų pralaida' },
    { value: 'hidroelektrines', name: 'Hidroelektrinės' },
  ],
  layer: getWMSImageLayer(
    `${qgisServerUrl}/uetk_public`,
    'upes,ezerai_tvenkiniai,vandens_matavimo_stotys,vandens_tyrimu_vietos,zemiu_uztvanka,vandens_pertekliaus_pralaida,zuvu_pralaida,hidroelektrines',
    `${aaaCopyright} ${biipCopyright}`,
  ),
  type: PakmapsLayerType.WMS,
});

export const sznsUetkService = new PakmapsLayer({
  id: 'sznsUetkService',
  name: 'Paviršinių vandens telkinių apsaugos zonos ir juostos',
  description: [aaaCopyright, biipCopyright],
  sublayers: [
    {
      value: 'apsaugos_juostos',
      name: 'Paviršinių vandens telkinių pakrančių apsaugos juostos (projektas)',
    },
    { value: 'apsaugos_zonos', name: 'Paviršinių vandens telkinių apsaugos zonos (projektas)' },
  ],
  layer: getWMSImageLayer(
    `${qgisServerUrl}/uetk_szns`,
    'apsaugos_juostos,apsaugos_zonos,apreptis',
    `${aaaCopyright} ${biipCopyright}`,
  ),
  type: PakmapsLayerType.WMS,
});

export const inspireParcelService = new PakmapsLayer({
  id: 'inspireParcelService',
  description: zudcCopyright,
  name: 'Kadastriniai sklypai (INSPIRE duomenų rinkinys)',
  layer: getWMSImageLayer(
    'https://www.geoportal.lt/mapproxy/gisc_inspire_geoserver/cp/wms',
    'CP.CadastralParcel,CP.CadastralZoning',
    zudcCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const municipalitiesService = new PakmapsLayer({
  id: 'municipalitiesService',
  description: rcCopyright,
  name: 'Savivaldybės (Adresų registras)',
  layer: getWMSImageLayer(`${qgisServerUrl}/uetk_zuvinimas`, 'municipalities', rcCopyright),
  type: PakmapsLayerType.WMS,
});

export const srisPrivateService = new PakmapsLayer({
  id: 'srisPrivateService',
  props: {
    authEndpoint: `${rusysApiHost}/maps/auth/me`,
    queryKey: 'sris',
    getHeaders: () => {
      return config().srisHeaders || {};
    },
  },
  layer: getWMSImageLayer(
    `${rusysApiHost}/maps/qgisserver`,
    'radavietes,stebejimai_interpretuojami',
    biipCopyright,
    () => srisPrivateService.props.getHeaders(),
  ),
  visible: false,
  type: PakmapsLayerType.WMS,
});

export const rusysGridService = new PakmapsLayer({
  id: 'rusysGridService',
  isHidden: true,
  props: {
    getHeaders: () => {
      return config().srisHeaders || {};
    },
    stats: {
      url: `${rusysApiHost}/maps/hexagons/stats`,
      styleFn: (data: any) => {
        if (!Array.isArray(data)) return;
        const maxValue = Math.max(...data.map((item: any) => item.count));

        const colorPalette = [
          'rgba(178,226,226,0.5)',
          'rgba(102,194,164,0.5)',
          'rgba(44,162,95,0.5)',
          'rgba(0,109,44,0.5)',
        ];

        return (feature: any) => {
          const matchingConfig = feature.get('stats');

          let featureFillColor = 'rgba(237,248,251,0.5)';

          const count = matchingConfig?.count || 0;
          if (count) {
            const colorIndex = Math.round((count / maxValue) * (colorPalette.length - 1));
            featureFillColor = colorPalette[colorIndex];
          }

          let text;

          if (count > 0) {
            text = new Text({
              text: `${count}`,
            });
          }

          return new Style({
            fill: new Fill({
              color: featureFillColor,
            }),
            text,
            stroke: new Stroke({
              color: 'rgba(15,15,15,0.3)',
              width: 1,
            }),
          });
        };
      },
    },
  },

  layer: getVectorLayer(`${rusysApiHost}/maps/hexagons`, {
    stroke: {
      color: 'rgba(0,70,80,0.8)',
      width: 1,
    },
  }),
  type: PakmapsLayerType.GeoJSON,
});

export const srisAccessService = new PakmapsLayer({
  id: 'srisAccessService',
  layer: getVectorLayer(`${rusysApiHost}/maps/access/my`, {
    stroke: {
      color: 'rgba(20,100,60,0.8)',
      width: 1,
    },
    queryOptions: () => ({
      headers: srisPrivateService.props.getHeaders(),
    }),
  }),
  type: PakmapsLayerType.GeoJSON,
});

export const rusysRequestService = new PakmapsLayer({
  id: 'rusysRequestService',
  layer: getVectorLayer('', {
    stroke: {
      color: 'rgba(20,100,60,0.8)',
      width: 2,
    },
    showOnUrlChange: true,
  }),
  isHidden: true,
  type: PakmapsLayerType.GeoJSON,
});

export const srisService = new PakmapsLayer({
  id: 'srisService',
  name: 'Saugomos rūšys',
  description: biipCopyright,
  sublayers: [
    {
      name: 'Radavietės',
      value: 'radavietes',
    },
    {
      name: 'Radavietės (pavieniai stebėjimai)',
      value: 'stebejimai_interpretuojami',
    },
  ],
  layer: new LayerGroup({
    layers: [srisPrivateService.layer as Layer, srisAccessService.layer as Layer],
  }),
  type: PakmapsLayerType.WMS,
});

export const invaService = new PakmapsLayer({
  id: 'invaService',
  name: 'Invazinės rūšys',
  props: {
    queryKey: 'inva',
  },
  description: biipCopyright,
  layer: getWMSImageLayer(`${qgisServerUrl}/inva`, 'radavietes_invazines', biipCopyright),
  sublayers: [
    {
      name: 'Radavietės',
      value: 'radavietes_invazines',
    },
    {
      name: 'Radavietės (svetimžemės)',
      value: 'radavietes_svetimzemes',
    },
  ],

  type: PakmapsLayerType.WMS,
});

// rusysGridService.layer.set('id', 'rusysGridService');
// rusysGridService.layer.set('type', PakmapsLayerType.GeoJSON);
// srisAccessService.layer.set('id', 'srisAccessService');
// srisPrivateService.layer.set('id', 'srisPrivateService');
// rusysRequestService.layer.set('id', 'rusysRequestService');
// srisService.layer.set('id', 'srisService');
// invaService.layer.set('id', 'invaService');

export const rusysService = new PakmapsLayer({
  id: 'rusysService',
  name: 'Rūšys',
  description: biipCopyright,
  sublayers: [
    { pakmapsLayer: rusysRequestService },
    { pakmapsLayer: srisService },
    { pakmapsLayer: invaService },
    { pakmapsLayer: rusysGridService },
  ],
});

export const huntingPublicService = new PakmapsLayer({
  id: 'huntingPublicService',
  name: 'Medžioklė',
  description: [biipCopyright],
  sublayers: [
    { value: 'damages', name: 'Padaryta žala' },
    { value: 'wolfs', name: 'Sumedžioti vilkai' },
    { value: 'observations', name: 'Stebėti gyvūnai' },
  ],

  layer: getWMSImageLayer(
    `${qgisServerUrl}/hunting_public`,
    'wolfs,observations,damages',
    `${biipCopyright}`,
  ),
  type: PakmapsLayerType.WMS,
});

export const tourismService = new PakmapsLayer({
  id: 'tourismService',
  name: 'Turizmo objektai',
  layer: getWMSImageLayer(`${qgisServerUrl}/tourism`, 'forms', biipCopyright),
  type: PakmapsLayerType.WMS,
});
