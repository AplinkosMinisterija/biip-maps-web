import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import LayerGroup from 'ol/layer/Group';
import { Text, Fill } from 'ol/style';
import { useConfigStore } from '@/stores/config';
import { getCopyrightLabel } from '../utils';
import { qgisServerUrl, rusysApiHost } from '../../config';
import { getVectorLayer, getWMSImageLayer } from './utils';
import { PakmapsLayer, PakmapsLayerType } from '@/libs/pak-maps';

const config = () => {
  return useConfigStore();
};

const biipCopyright = getCopyrightLabel(
  'Biologinės įvairovės informacinė platforma',
  'https://www.biip.lt',
);
const aaaCopyright = getCopyrightLabel('Aplinkos apsaugos agentūra', 'https://aaa.lrv.lt');
const vsttCopyright = getCopyrightLabel(
  'Valstybinė saugomų teritorijų tarnyba',
  'https://vstt.lrv.lt',
);
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

export const stvkService = new PakmapsLayer({
  id: 'stvkService',
  description: vsttCopyright,
  name: 'Saugomų teritorijų valstybės kadastras',
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'botaniniai_gpo_t,geomorfologiniai_gpo_t,geologiniai_gpo_t,hidrogeologiniai_gpo_t,hidrografiniai_gpo_t,zoologiniai_gpo_t,botaniniai_gpo_p,geomorfologiniai_gpo_p,geologiniai_gpo_p,hidrogeologiniai_gpo_p,hidrografiniai_gpo_p,zoologiniai_gpo_p,sunyke_botaniniai_gpo_t,sunyke_geomorfologiniai_gpo_t,sunyke_geologiniai_gpo_t,sunyke_hidrogeologiniai_gpo_t,sunyke_hidrografiniai_gpo_t,sunyke_zoologiniai_gpo_t,sunyke_botaniniai_gpo_p,sunyke_geomorfologiniai_gpo_p,sunyke_geologiniai_gpo_p,sunyke_hidrogeologiniai_gpo_p,sunyke_hidrografiniai_gpo_p,sunyke_zoologiniai_gpo_p,valstybiniai_rezervatai,kpfz_rezervatai,valstybiniai_draustiniai,savivaldybiu_draustiniai,kpfz_draustiniai,nac_parkai,np_rezervatai,np_draustiniai,np_ekolog_aps_fpz,np_rekreac_fpz,np_zem_uk_fpz,np_misk_uk_fpz,np_bendr_naud_vand_uk_fpz,np_kitos_uk_fpz,np_gyv_pask_fpz,np_kitos_pask_fpz,reg_parkai,rp_rezervatai,rp_draustiniai,rp_ekolog_aps_fpz,rp_rekreac_fpz,rp_zemes_uk_fpz,rp_misku_uk_fpz,rp_bendr_naud_vand_uk_fpz,rp_kitos_uk_fpz,rp_gyv_fpz,rp_kitos_fpz,bio_rezervatai,biosferos_rez_rezervatai,biosferos_poli_draustiniai,eko_fpz,zemes_fpz,misku_fpz,ekosistem_fpz,bio_poligonai,vandens_fpz,kitos_paskirties_fpz,atkuriamieji_sklypai,genetiniai_sklypai,buf_apsaugos_zonos,past,bast,pajurio,direkciju_teritorijos',
    vsttCopyright,
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

const srisPrivateServiceImageLayer = getWMSImageLayer(
  `${rusysApiHost}/maps/qgisserver`,
  'radavietes,stebejimai_interpretuojami',
  biipCopyright,
  () => srisPrivateService.getHeaders(),
);
srisPrivateServiceImageLayer.setVisible(false);
export const srisPrivateService = {
  id: 'srisPrivateService',
  authEndpoint: `${rusysApiHost}/maps/auth/me`,
  queryKey: 'sris',
  getHeaders: () => {
    return config().srisHeaders || {};
  },
  layer: srisPrivateServiceImageLayer,
};

export const rusysGridService = {
  id: 'rusysGridService',
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
  layer: getVectorLayer(`${rusysApiHost}/maps/hexagons`, {
    stroke: {
      color: 'rgba(0,70,80,0.8)',
      width: 1,
    },
  }),
};

export const srisAccessService = {
  id: 'srisAccessService',
  layer: getVectorLayer(`${rusysApiHost}/maps/access/my`, {
    stroke: {
      color: 'rgba(20,100,60,0.8)',
      width: 1,
    },
    queryOptions: () => ({
      headers: srisPrivateService.getHeaders(),
    }),
  }),
};

export const rusysRequestService = {
  id: 'rusysRequestService',
  layer: getVectorLayer('', {
    stroke: {
      color: 'rgba(20,100,60,0.8)',
      width: 2,
    },
    showOnUrlChange: true,
  }),
};

export const srisService = {
  id: 'srisService',
  title: 'SRIS',
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
    layers: [srisPrivateService.layer, srisAccessService.layer],
  }),
};

export const invaService = {
  id: 'invaService',
  title: 'Invazinės rūšys',
  queryKey: 'inva',
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
};

rusysGridService.layer.set('id', 'rusysGridService');
rusysGridService.layer.set('type', 'geojson');
srisAccessService.layer.set('id', 'srisAccessService');
srisPrivateService.layer.set('id', 'srisPrivateService');
rusysRequestService.layer.set('id', 'rusysRequestService');
srisService.layer.set('id', 'srisService');
invaService.layer.set('id', 'invaService');

export const rusysService = {
  id: 'rusysService',
  title: 'Rūšys',
  description: biipCopyright,
  sublayers: [
    {
      name: 'Saugomos rūšys',
      layer: srisService.layer,
      id: srisService.id,
    },
    {
      name: 'Invazinės rūšys',
      layer: invaService.layer,
      id: invaService.id,
    },
  ],
  layer: new LayerGroup({
    layers: [
      rusysGridService.layer,
      invaService.layer,
      srisService.layer,
      rusysRequestService.layer,
    ],
  }),
};

// https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities

export const gamtotvarkaAtliktiDarbai = new PakmapsLayer({
  id: 'gamtotvarkaAtliktiDarbai',
  name: 'Atlikti tvarkymo darbai',
  sublayers: [
    { value: 'tvarkymo_darbu_pateikimo_busena', name: 'Tvarkymo darbų pateikimo būsena' },
    { value: 'tvarkymo_darbai', name: 'Atlikti tvarkymo darbai' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tvarkymo_darbai,tvarkymo_darbu_pateikimo_busena',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaPlanuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaPlanuPlotai',
  name: 'Gamtotvarkos planų tvarkymo plotai',
  sublayers: [
    { value: 'gamtotvarkos_plotai_negalioja', name: 'Negalioja' },
    { value: 'gamtotvarkos_plotai_rengiamas', name: 'Rengiami' },
    { value: 'gamtotvarkos_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'gamtotvarkos_plotai_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaPlanuTeritorijos = new PakmapsLayer({
  id: 'gamtotvarkaPlanuTeritorijos',
  name: 'Gamtotvarkos planų teritorijos',
  sublayers: [
    { value: 'gamtotvarkos_teritorijos_negalioja', name: 'Negalioja' },
    { value: 'gamtotvarkos_teritorijos_rengiamas', name: 'Rengiamos' },
    { value: 'gamtotvarkos_teritorijos_patvirtintas', name: 'Patvirtintos' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'gamtotvarkos_teritorijos_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaPlanai = new PakmapsLayer({
  id: 'gamtotvarkaPlanai',
  name: 'Gamtotvarkos planai',
  sublayers: [
    { name: 'Plotai', pakmapsLayer: gamtotvarkaPlanuPlotai },
    { name: 'Teritorijos', pakmapsLayer: gamtotvarkaPlanuTeritorijos },
  ],
  hidden: true,
});

export const gamtotvarkaProgramuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaProgramuPlotai',
  name: 'Tvarkymo programų plotai',
  sublayers: [
    { value: 'tvarkymo_programu_plotai_negalioja', name: 'Negalioja' },
    { value: 'tvarkymo_programu_plotai_rengiamas', name: 'Rengiami' },
    { value: 'tvarkymo_programu_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tvarkymo_programu_plotai_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaProgramuTeritorijos = new PakmapsLayer({
  id: 'gamtotvarkaProgramuTeritorijos',
  name: 'Tvarkymo programų teritorijos',
  sublayers: [
    { value: 'tvarkymo_programu_teritorijos_negalioja', name: 'Negalioja' },
    { value: 'tvarkymo_programu_teritorijos_rengiamas', name: 'Rengiamos' },
    { value: 'tvarkymo_programu_teritorijos_patvirtintas', name: 'Patvirtintos' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tvarkymo_programu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaTvarkymoProgramos = new PakmapsLayer({
  id: 'gamtotvarkaTvarkymoProgramos',
  name: 'Tvarkymo programos',
  sublayers: [
    { name: 'Plotai', pakmapsLayer: gamtotvarkaProgramuPlotai },
    { name: 'Teritorijos', pakmapsLayer: gamtotvarkaProgramuTeritorijos },
  ],
  hidden: true,
});

export const gamtotvarkaTiksliniuProgramuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaTiksliniuProgramuPlotai',
  name: 'Tikslinių programų plotai',
  sublayers: [
    { value: 'tikslines_programos_plotai_negalioja', name: 'Negalioja' },
    { value: 'tikslines_programos_plotai_rengiamas', name: 'Rengiami' },
    { value: 'tikslines_programos_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tikslines_programos_plotai_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaTiksliniuProgramuTeritorijos = new PakmapsLayer({
  id: 'gamtotvarkaTiksliniuProgramuTeritorijos',
  name: 'Tikslinių programų teritorijos',
  sublayers: [
    { value: 'tiksliniu_programu_teritorijos_negalioja', name: 'Negalioja' },
    { value: 'tiksliniu_programu_teritorijos_rengiamas', name: 'Rengiamos' },
    { value: 'tiksliniu_programu_teritorijos_patvirtintas', name: 'Patvirtintos' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tiksliniu_programu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaTikslinesProgramos = new PakmapsLayer({
  id: 'gamtotvarkaTikslinesProgramos',
  name: 'Tikslinės programos',
  sublayers: [
    { name: 'Plotai', pakmapsLayer: gamtotvarkaTiksliniuProgramuPlotai },
    { name: 'Teritorijos', pakmapsLayer: gamtotvarkaTiksliniuProgramuTeritorijos },
  ],
  hidden: true,
});

export const gamtotvarkaVeiksmuPlanuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaVeiksmuPlanuPlotai',
  name: 'Rūšių apsaugos veiksmų planų plotai',
  sublayers: [
    { value: 'rusiu_veiksmu_planu_plotai_negalioja', name: 'Negalioja' },
    { value: 'rusiu_veiksmu_planu_plotai_rengiamas', name: 'Rengiami' },
    { value: 'rusiu_veiksmu_planu_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'rusiu_veiksmu_planu_plotai_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaVeiksmuPlanuTeritorijos = new PakmapsLayer({
  id: 'gamtotvarkaVeiksmuPlanuTeritorijos',
  name: 'Rūšių apsaugos veiksmų planų teritorijos',
  sublayers: [
    { value: 'rusiu_apsaugos_veiksmu_teritorijos_negalioja', name: 'Negalioja' },
    { value: 'rusiu_apsaugos_veiksmu_teritorijos_rengiamas', name: 'Rengiamos' },
    { value: 'rusiu_apsaugos_veiksmu_teritorijos_patvirtintas', name: 'Patvirtintos' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'rusiu_apsaugos_veiksmu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaVeiksmuPlanai = new PakmapsLayer({
  id: 'gamtotvarkaVeiksmuPlanai',
  name: 'Rūšių apsaugos veiksmų planai',
  sublayers: [
    { name: 'Plotai', pakmapsLayer: gamtotvarkaVeiksmuPlanuPlotai },
    { name: 'Teritorijos', pakmapsLayer: gamtotvarkaVeiksmuPlanuTeritorijos },
  ],
  hidden: true,
});

export const gamtotvarkaStTvarkymoPlanuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaStTvarkymoPlanuPlotai',
  name: 'ST tvarkymo planų plotai',
  sublayers: [
    { value: 'st_tvarkymo_planu_plotai_negalioja', name: 'Negalioja' },
    { value: 'st_tvarkymo_planu_plotai_rengiamas', name: 'Rengiami' },
    { value: 'st_tvarkymo_planu_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'st_tvarkymo_planu_plotai_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaStTvarkymoPlanuTeritorijos = new PakmapsLayer({
  id: 'gamtotvarkaStTvarkymoPlanuTeritorijos',
  name: 'ST tvarkymo planų teritorijos',
  sublayers: [
    { value: 'st_tvarkymo_planu_teritorijos_negalioja', name: 'Negalioja' },
    { value: 'st_tvarkymo_planu_teritorijos_rengiamas', name: 'Rengiamos' },
    { value: 'st_tvarkymo_planu_teritorijos_patvirtintas', name: 'Patvirtintos' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'st_tvarkymo_planu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaStTvarkymoPlanai = new PakmapsLayer({
  id: 'gamtotvarkaStTvarkymoPlanai',
  name: 'ST tvarkymo planai',
  sublayers: [
    { name: 'Plotai', pakmapsLayer: gamtotvarkaStTvarkymoPlanuPlotai },
    { name: 'Teritorijos', pakmapsLayer: gamtotvarkaStTvarkymoPlanuTeritorijos },
  ],
  hidden: true,
});

export const gamtotvarkaInvaVeiksmuPlanuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaInvaVeiksmuPlanuPlotai',
  name: 'Invazinių rūšių veiksmų planų plotai',
  sublayers: [
    { value: 'invaziniu_rusiu_veiksmu_plotai_negalioja', name: 'Negalioja' },
    { value: 'invaziniu_rusiu_veiksmu_plotai_rengiamas', name: 'Rengiami' },
    { value: 'invaziniu_rusiu_veiksmu_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'invaziniu_rusiu_veiksmu_plotai_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaInvaVeiksmuPlanuTeritorijos = new PakmapsLayer({
  id: 'gamtotvarkaInvaVeiksmuPlanuTeritorijos',
  name: 'Invazinių rūšių veiksmų planų teritorijos',
  sublayers: [
    { value: 'invaziniu_rusiu_veiksmu_planu_teritorijos_negalioja', name: 'Negalioja' },
    { value: 'invaziniu_rusiu_veiksmu_planu_teritorijos_rengiamas', name: 'Rengiamos' },
    { value: 'invaziniu_rusiu_veiksmu_planu_teritorijos_patvirtintas', name: 'Patvirtintos' },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'invaziniu_rusiu_veiksmu_planu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaInvaVeiksmuPlanai = new PakmapsLayer({
  id: 'gamtotvarkaInvaVeiksmuPlanai',
  name: 'Invazinių rūšių reguliavimo veiksmų planas',
  sublayers: [
    { name: 'Plotai', pakmapsLayer: gamtotvarkaInvaVeiksmuPlanuPlotai },
    { name: 'Teritorijos', pakmapsLayer: gamtotvarkaInvaVeiksmuPlanuTeritorijos },
  ],
  hidden: true,
});

export const gamtotvarkaService = new PakmapsLayer({
  id: 'gamtotvarkaService',
  name: 'Gamtotvarkos duomenų žemėlapis',
  description: vsttCopyright,
  sublayers: [
    {
      name: 'Invazinių rūšių reguliavimo veiksmų planas',
      pakmapsLayer: gamtotvarkaInvaVeiksmuPlanai,
    },
    { name: 'Saugomų teritorijų tvarkymo planai', pakmapsLayer: gamtotvarkaStTvarkymoPlanai },
    { name: 'Rūšių apsaugos veiksmų planai', pakmapsLayer: gamtotvarkaVeiksmuPlanai },
    { name: 'Tikslinės programos', pakmapsLayer: gamtotvarkaTikslinesProgramos },
    { name: 'Tvarkymo programos', pakmapsLayer: gamtotvarkaTvarkymoProgramos },
    { name: 'Gamtotvarkos planai', pakmapsLayer: gamtotvarkaPlanai },
    { name: 'Atlikti tvarkymo darbai', pakmapsLayer: gamtotvarkaAtliktiDarbai },
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

export const gamtotvarkaNatura2000 = new PakmapsLayer({
  id: 'gamtotvarkaNatura2000',
  name: 'Natura 2000 teritorijų apsaugos tikslai',
  sublayers: [
    { value: 'at_web_viesinimui_materiali', name: 'BAST apsaugos tikslų vertybės (D1-317)' },
    {
      value: 'vietoviu_web_viesinimui_materiali',
      name: 'BAST vietovėse esančios vertybės (D1-210)',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/apsaugos_tikslai_wfs',
    'at_web_viesinimui_materiali,vietoviu_web_viesinimui_materiali',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});

function getStvkLayerData(sublayers: string) {
  return {
    description: vsttCopyright,
    layer: getWMSImageLayer('https://services.stvk.lt/wms/stvk-services', sublayers, vsttCopyright),
    type: PakmapsLayerType.WMS,
  };
}

export const stvkGpoService = new PakmapsLayer({
  id: 'stvkGpoService',
  name: 'Gamtos paveldo objektai',
  ...getStvkLayerData(
    'botaniniai_gpo_t,geomorfologiniai_gpo_t,geologiniai_gpo_t,hidrogeologiniai_gpo_t,hidrografiniai_gpo_t,zoologiniai_gpo_t,botaniniai_gpo_p,geomorfologiniai_gpo_p,geologiniai_gpo_p,hidrogeologiniai_gpo_p,hidrografiniai_gpo_p,zoologiniai_gpo_p,sunyke_botaniniai_gpo_t,sunyke_geomorfologiniai_gpo_t,sunyke_geologiniai_gpo_t,sunyke_hidrogeologiniai_gpo_t,sunyke_hidrografiniai_gpo_t,sunyke_zoologiniai_gpo_t,sunyke_botaniniai_gpo_p,sunyke_geomorfologiniai_gpo_p,sunyke_geologiniai_gpo_p,sunyke_hidrogeologiniai_gpo_p,sunyke_hidrografiniai_gpo_p,sunyke_zoologiniai_gpo_p',
  ),
});

export const stvkRezervataiService = new PakmapsLayer({
  id: 'stvkRezervataiService',
  name: 'Valstybiniai rezervatai',
  ...getStvkLayerData('valstybiniai_rezervatai'),
});

export const stvkDraustiniaiService = new PakmapsLayer({
  id: 'stvkDraustiniaiService',
  name: 'Draustiniai',
  sublayers: [
    { value: 'valstybiniai_draustiniai', name: 'Valstybiniai draustiniai' },
    { value: 'savivaldybiu_draustiniai', name: 'Savivaldybių draustiniai' },
  ],
  ...getStvkLayerData('valstybiniai_draustiniai,savivaldybiu_draustiniai'),
});

export const stvkParkaiService = new PakmapsLayer({
  id: 'stvkParkaiService',
  name: 'Valstybiniai parkai',
  sublayers: [
    { value: 'nac_parkai', name: 'Nacionaliniai parkai' },
    { value: 'reg_parkai', name: 'Regioniniai parkai' },
  ],
  ...getStvkLayerData('nac_parkai,reg_parkai'),
});

export const stvkBioStebesenosService = new PakmapsLayer({
  id: 'stvkBioStebesenosService',
  name: 'Biosferos stebėsenos (monitoringo) teritorijos',
  sublayers: [
    { value: 'bio_rezervatai', name: 'Biosferos rezervatai' },
    { value: 'bio_poligonai', name: 'Biosferos poligonai' },
  ],
  ...getStvkLayerData('bio_rezervatai,bio_poligonai'),
});

export const stvkGenetiniaiSklypaiService = new PakmapsLayer({
  id: 'stvkGenetiniaiSklypaiService',
  name: 'Genetiniai sklypai',
  ...getStvkLayerData('genetiniai_sklypai'),
});

export const stvkAtkuriamiejiSklypaiService = new PakmapsLayer({
  id: 'stvkAtkuriamiejiSklypaiService',
  name: 'Atkuriamieji sklypai',
  ...getStvkLayerData('atkuriamieji_sklypai'),
});

export const stvkBufApsZonosService = new PakmapsLayer({
  id: 'stvkBufApsZonosService',
  name: 'Buferinės apsaugos zonos',
  ...getStvkLayerData('buf_apsaugos_zonos'),
});

export const stvkNatura2000Service = new PakmapsLayer({
  id: 'stvkNatura2000Service',
  name: 'Natura 2000',
  sublayers: [
    { value: 'past', name: 'Paukščių apsaugai svarbios teritorijos' },
    { value: 'bast', name: 'Buveinių apsaugai svarbios teritorijos' },
  ],
  ...getStvkLayerData('past,bast'),
});

export const stvkPajurioJuostaService = new PakmapsLayer({
  id: 'stvkPajurioJuostaService',
  name: 'Pajūrio juosta',
  ...getStvkLayerData('pajurio'),
});

export const gamtotvarkaStvkService = new PakmapsLayer({
  id: 'gamtotvarkaStvkService',
  description: vsttCopyright,
  name: 'Saugomų teritorijų valstybės kadastras',
  sublayers: [
    { name: 'Pajūrio juosta', pakmapsLayer: stvkPajurioJuostaService },
    { name: 'Natura 2000', pakmapsLayer: stvkNatura2000Service },
    { name: 'Buferinės apsaugos zonos', pakmapsLayer: stvkBufApsZonosService },
    { name: 'Genetiniai sklypai', pakmapsLayer: stvkGenetiniaiSklypaiService },
    { name: 'Atkuriamieji sklypai', pakmapsLayer: stvkAtkuriamiejiSklypaiService },
    {
      name: 'Biosferos stebėsenos (monitoringo) teritorijos',
      pakmapsLayer: stvkBioStebesenosService,
    },
    { name: 'Valstybiniai parkai', pakmapsLayer: stvkParkaiService },
    { name: 'Draustiniai', pakmapsLayer: stvkDraustiniaiService },
    { name: 'Valstybiniai rezervatai', pakmapsLayer: stvkRezervataiService },
    { name: 'Gamtos paveldo objektai', pakmapsLayer: stvkGpoService },
  ],
});

export const tourismService = new PakmapsLayer({
  id: 'tourismService',
  description: vsttCopyright,
  name: 'Turizmo objektai',
  layer: getWMSImageLayer(`${qgisServerUrl}/tourism`, 'forms', biipCopyright),
  type: PakmapsLayerType.WMS,
});
