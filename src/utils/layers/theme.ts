import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import LayerGroup from 'ol/layer/Group';
import { Text, Fill } from 'ol/style';
import { useConfigStore } from '@/stores/config';
import { getCopyrightLabel } from '../utils';
import { qgisServerUrl, rusysApiHost } from '../../config';
import { getVectorLayer, getWMSImageLayer } from './utils';

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

export const huntingService = {
  id: 'huntingService',
  description: biipCopyright,
  layer: getWMSImageLayer(
    `${qgisServerUrl}/medziokle_mpv`,
    'mpv_info_geom,mpv_info_geom_50k,mpv_info_geom_250k',
    biipCopyright,
  ),
};

export const administrativeBoundariesService = {
  id: 'administrativeBoundariesService',
  name: 'Administracinės ribos',
  description: biipCopyright,
  layer: getWMSImageLayer(`${qgisServerUrl}/administrative_boundaries`, '', biipCopyright),
  sublayers: [
    {
      value: 'municipalities',
      name: 'Savivaldybės',
    },
    {
      value: 'counties',
      name: 'Apskritys',
    },
    {
      value: 'elderships',
      name: 'Seniūnijos',
    },
    {
      value: 'residential_areas',
      name: 'Gyvenamosios vietovės',
    },
  ],
};

export const administrativeBoundariesLabelsService = {
  id: 'administrativeBoundariesLabelsService',
  name: 'Administracinės ribos',
  description: biipCopyright,
  layer: getWMSImageLayer(`${qgisServerUrl}/administrative_boundaries`, '', biipCopyright),
  sublayers: [
    {
      value: 'residential_areas_labels',
      name: 'Gyvenamosios vietovės',
    },
    {
      value: 'elderships_labels',
      name: 'Seniūnijos',
    },
    {
      value: 'municipalities_labels',
      name: 'Savivaldybės',
    },
    {
      value: 'counties_labels',
      name: 'Apskritys',
    },
  ],
};

export const huntingTracksService = {
  id: 'huntingTracksService',
  description: biipCopyright,
  layer: getWMSImageLayer(
    `${qgisServerUrl}/hunting_footprint_tracks`,
    'footprint_tracks',
    biipCopyright,
  ),
};

export const zuvinimasService = {
  id: 'zuvinimasService',
  description: biipCopyright,
  layer: getWMSImageLayer(`${qgisServerUrl}/zuvinimas`, 'fish_stockings', biipCopyright),
};

export const uetkService = {
  id: 'uetkService',
  title: 'UETK',
  description: [aaaCopyright, biipCopyright],
  sublayers: [
    {
      value: 'upiu_baseinu_rajonai',
      name: 'Upių baseinų rajonai',
    },
    {
      value: 'upiu_baseinai',
      name: 'Upių baseinai',
    },
    {
      value: 'upiu_pabaseiniai',
      name: 'Upių pabaseiniai',
    },
    {
      value: 'upes',
      name: 'Upės',
    },
    {
      value: 'ezerai_tvenkiniai',
      name: 'Ežerai ir tvenkiniai',
    },
    {
      value: 'vandens_matavimo_stotys',
      name: 'Vandens matavimo stotys',
    },
    {
      value: 'vandens_tyrimu_vietos',
      name: 'Vandens tyrimų vietos',
    },
    {
      value: 'zemiu_uztvanka',
      name: 'Žemių užtvanka',
    },
    {
      value: 'vandens_pertekliaus_pralaida',
      name: 'Vandens pertekliaus pralaida',
    },
    {
      value: 'zuvu_pralaida',
      name: 'Žuvų pralaida',
    },
    {
      value: 'hidroelektrines',
      name: 'Hidroelektrinės',
    },
  ],

  layer: getWMSImageLayer(
    `${qgisServerUrl}/uetk_public`,
    'upes,ezerai_tvenkiniai,vandens_matavimo_stotys,vandens_tyrimu_vietos,zemiu_uztvanka,vandens_pertekliaus_pralaida,zuvu_pralaida,hidroelektrines',
    `${aaaCopyright} ${biipCopyright}`,
  ),
};

export const sznsUetkService = {
  id: 'sznsUetkService',
  title: 'Paviršinių vandens telkinių apsaugos zonos ir juostos',
  description: [aaaCopyright, biipCopyright],
  sublayers: [
    {
      value: 'apsaugos_juostos',
      name: 'Paviršinių vandens telkinių pakrančių apsaugos juostos (projektas)',
    },
    {
      value: 'apsaugos_zonos',
      name: 'Paviršinių vandens telkinių apsaugos zonos (projektas)',
    },
  ],
  layer: getWMSImageLayer(
    `${qgisServerUrl}/uetk_szns`,
    'apsaugos_juostos,apsaugos_zonos,apreptis',
    `${aaaCopyright} ${biipCopyright}`,
  ),
};

export const stvkService = {
  id: 'stvkService',
  description: vsttCopyright,
  title: 'Saugomų teritorijų valstybės kadastras',
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'botaniniai_gpo_t,geomorfologiniai_gpo_t,geologiniai_gpo_t,hidrogeologiniai_gpo_t,hidrografiniai_gpo_t,zoologiniai_gpo_t,botaniniai_gpo_p,geomorfologiniai_gpo_p,geologiniai_gpo_p,hidrogeologiniai_gpo_p,hidrografiniai_gpo_p,zoologiniai_gpo_p,sunyke_botaniniai_gpo_t,sunyke_geomorfologiniai_gpo_t,sunyke_geologiniai_gpo_t,sunyke_hidrogeologiniai_gpo_t,sunyke_hidrografiniai_gpo_t,sunyke_zoologiniai_gpo_t,sunyke_botaniniai_gpo_p,sunyke_geomorfologiniai_gpo_p,sunyke_geologiniai_gpo_p,sunyke_hidrogeologiniai_gpo_p,sunyke_hidrografiniai_gpo_p,sunyke_zoologiniai_gpo_p,valstybiniai_rezervatai,kpfz_rezervatai,valstybiniai_draustiniai,savivaldybiu_draustiniai,kpfz_draustiniai,nac_parkai,np_rezervatai,np_draustiniai,np_ekolog_aps_fpz,np_rekreac_fpz,np_zem_uk_fpz,np_misk_uk_fpz,np_bendr_naud_vand_uk_fpz,np_kitos_uk_fpz,np_gyv_pask_fpz,np_kitos_pask_fpz,reg_parkai,rp_rezervatai,rp_draustiniai,rp_ekolog_aps_fpz,rp_rekreac_fpz,rp_zemes_uk_fpz,rp_misku_uk_fpz,rp_bendr_naud_vand_uk_fpz,rp_kitos_uk_fpz,rp_gyv_fpz,rp_kitos_fpz,bio_rezervatai,biosferos_rez_rezervatai,biosferos_poli_draustiniai,eko_fpz,zemes_fpz,misku_fpz,ekosistem_fpz,bio_poligonai,vandens_fpz,kitos_paskirties_fpz,atkuriamieji_sklypai,genetiniai_sklypai,buf_apsaugos_zonos,past,bast,pajurio,direkciju_teritorijos',
    vsttCopyright,
  ),
};

export const inspireParcelService = {
  id: 'inspireParcelService',
  description: zudcCopyright,
  title: 'Kadastriniai sklypai (INSPIRE duomenų rinkinys)',
  layer: getWMSImageLayer(
    'https://www.geoportal.lt/mapproxy/gisc_inspire_geoserver/cp/wms',
    'CP.CadastralParcel,CP.CadastralZoning',
    zudcCopyright,
  ),
};

export const municipalitiesService = {
  id: 'municipalitiesService',
  description: rcCopyright,
  title: 'Savivaldybės (Adresų registras)',
  layer: getWMSImageLayer(`${qgisServerUrl}/uetk_zuvinimas`, 'municipalities', rcCopyright),
};

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

export const sznsPievosPelkesPatvirtinti = {
  id: 'sznsPievosPelkesPatvirtinti',
  title: 'Patvirtinti',
  sublayers: [
    {
      value: 'Naturaliu_pievu_ir_ganyklu_zemelapis__patvirtintas',
      name: 'Natūralių pievų ir ganyklų žemėlapis (patvirtintas)',
    },
    {
      value: 'Pelkiu_ir_saltinynu_zemelapis__patvirtintas',
      name: 'Pelkių ir šaltinynų žemėlapis (patvirtintas)',
    },
  ],
  layer: getWMSImageLayer(
    'https://www.geoportal.lt/mapproxy/vstt_pievos_pelkes',
    'Patvirtinti',
    vsttCopyright,
  ),
};
sznsPievosPelkesPatvirtinti.layer.set('id', 'sznsPievosPelkesPatvirtinti');

export const sznsPievosPelkesRuosiami = {
  id: 'sznsPievosPelkesRuosiami',
  title: 'Ruošiami tvirtinimui',
  sublayers: [
    {
      value: 'Panaikinamis_teritorijos',
      name: 'Panaikinamos teritorijos',
    },
    {
      value: 'Naujos_keiciamos_Naturaliu_pievu_ir_ganyklu_teritorijos',
      name: 'Naujos/keičiamos Natūralių pievų ir ganyklų teritorijos',
    },
    {
      value: 'Naujos_keiciamos_Pelkiu_ir_saltinynu_teritorijos',
      name: 'Naujos/keičiamos Pelkių ir šaltinynų teritorijos',
    },
  ],
  layer: getWMSImageLayer(
    'https://www.geoportal.lt/mapproxy/vstt_pievos_pelkes',
    'Panaikinamis_teritorijos,Naujos_keiciamos_Naturaliu_pievu_ir_ganyklu_teritorijos,Naujos_keiciamos_Pelkiu_ir_saltinynu_teritorijos',
    vsttCopyright,
  ),
};
sznsPievosPelkesRuosiami.layer.set('id', 'sznsPievosPelkesRuosiami');

export const sznsPievosPelkes = {
  id: 'sznsPievosPelkes',
  title:
    'Natūralių pievų ir ganyklų, pelkių ir šaltinynų teritorijos, kuriose nustatomos specialiosios žemės naudojimo sąlygos',
  description: vsttCopyright,
  sublayers: [
    {
      name: 'Patvirtinti',
      layer: sznsPievosPelkesPatvirtinti.layer,
      id: sznsPievosPelkesPatvirtinti.id,
    },
    {
      name: 'Ruošiami tvirtinimui',
      layer: sznsPievosPelkesRuosiami.layer,
      id: sznsPievosPelkesRuosiami.id,
    },
  ],
  layer: new LayerGroup({
    layers: [sznsPievosPelkesPatvirtinti.layer, sznsPievosPelkesRuosiami.layer],
  }),
};
sznsPievosPelkes.layer.set('id', 'sznsPievosPelkes');

// https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities

export const gamtotvarkaAtliktiDarbai = {
  id: 'gamtotvarkaAtliktiDarbai',
  title: 'Atlikti tvarkymo darbai',
  sublayers: [
    {
      value: 'tvarkymo_darbu_pateikimo_busena',
      name: 'Tvarkymo darbų pateikimo būsena',
    },
    {
      value: 'tvarkymo_darbai',
      name: 'Atlikti tvarkymo darbai',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tvarkymo_darbai,tvarkymo_darbu_pateikimo_busena',
    vsttCopyright,
  ),
};
gamtotvarkaAtliktiDarbai.layer.set('id', 'gamtotvarkaAtliktiDarbai');

export const gamtotvarkaPlanuPlotai = {
  id: 'gamtotvarkaPlanuPlotai',
  title: 'Gamtotvarkos planų tvarkymo plotai',
  sublayers: [
    {
      value: 'gamtotvarkos_plotai_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'gamtotvarkos_plotai_rengiamas',
      name: 'Rengiami',
    },
    {
      value: 'gamtotvarkos_plotai_patvirtintas',
      name: 'Patvirtinti',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'gamtotvarkos_plotai_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaPlanuPlotai.layer.set('id', 'gamtotvarkaPlanuPlotai');

export const gamtotvarkaPlanuTeritorijos = {
  id: 'gamtotvarkaPlanuTeritorijos',
  title: 'Gamtotvarkos planų teritorijos',
  sublayers: [
    {
      value: 'gamtotvarkos_teritorijos_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'gamtotvarkos_teritorijos_rengiamas',
      name: 'Rengiamos',
    },
    {
      value: 'gamtotvarkos_teritorijos_patvirtintas',
      name: 'Patvirtintos',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'gamtotvarkos_teritorijos_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaPlanuTeritorijos.layer.set('id', 'gamtotvarkaPlanuTeritorijos');

export const gamtotvarkaPlanai = {
  id: 'gamtotvarkaPlanai',
  title: 'Gamtotvarkos planai',
  sublayers: [
    {
      name: 'Plotai',
      layer: gamtotvarkaPlanuPlotai.layer,
      id: gamtotvarkaPlanuPlotai.id,
    },
    {
      name: 'Teritorijos',
      layer: gamtotvarkaPlanuTeritorijos.layer,
      id: gamtotvarkaPlanuTeritorijos.id,
    },
  ],
  layer: new LayerGroup({
    layers: [gamtotvarkaPlanuTeritorijos.layer, gamtotvarkaPlanuPlotai.layer],
  }),
};
gamtotvarkaPlanai.layer.setVisible(false);
gamtotvarkaPlanai.layer.set('id', 'gamtotvarkaPlanai');

export const gamtotvarkaProgramuPlotai = {
  id: 'gamtotvarkaProgramuPlotai',
  title: 'Tvarkymo programų plotai',
  sublayers: [
    {
      value: 'tvarkymo_programu_plotai_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'tvarkymo_programu_plotai_rengiamas',
      name: 'Rengiami',
    },
    {
      value: 'tvarkymo_programu_plotai_patvirtintas',
      name: 'Patvirtinti',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tvarkymo_programu_plotai_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaProgramuPlotai.layer.set('id', 'gamtotvarkaProgramuPlotai');

export const gamtotvarkaProgramuTeritorijos = {
  id: 'gamtotvarkaProgramuTeritorijos',
  title: 'Tvarkymo programų teritorijos',
  sublayers: [
    {
      value: 'tvarkymo_programu_teritorijos_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'tvarkymo_programu_teritorijos_rengiamas',
      name: 'Rengiamos',
    },
    {
      value: 'tvarkymo_programu_teritorijos_patvirtintas',
      name: 'Patvirtintos',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tvarkymo_programu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaProgramuTeritorijos.layer.set('id', 'gamtotvarkaProgramuTeritorijos');

export const gamtotvarkaTvarkymoProgramos = {
  id: 'gamtotvarkaTvarkymoProgramos',
  title: 'Tvarkymo programos',
  sublayers: [
    {
      name: 'Plotai',
      layer: gamtotvarkaProgramuPlotai.layer,
      id: gamtotvarkaProgramuPlotai.id,
    },
    {
      name: 'Teritorijos',
      layer: gamtotvarkaProgramuTeritorijos.layer,
      id: gamtotvarkaProgramuTeritorijos.id,
    },
  ],
  layer: new LayerGroup({
    layers: [gamtotvarkaProgramuTeritorijos.layer, gamtotvarkaProgramuPlotai.layer],
  }),
};
gamtotvarkaTvarkymoProgramos.layer.setVisible(false);
gamtotvarkaTvarkymoProgramos.layer.set('id', 'gamtotvarkaTvarkymoProgramos');

export const gamtotvarkaTiksliniuProgramuPlotai = {
  id: 'gamtotvarkaTiksliniuProgramuPlotai',
  title: 'Tikslinių programų plotai',
  sublayers: [
    {
      value: 'tikslines_programos_plotai_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'tikslines_programos_plotai_rengiamas',
      name: 'Rengiami',
    },
    {
      value: 'tikslines_programos_plotai_patvirtintas',
      name: 'Patvirtinti',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tikslines_programos_plotai_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaTiksliniuProgramuPlotai.layer.set('id', 'gamtotvarkaTiksliniuProgramuPlotai');

export const gamtotvarkaTiksliniuProgramuTeritorijos = {
  id: 'gamtotvarkaTiksliniuProgramuTeritorijos',
  title: 'Tikslinių programų teritorijos',
  sublayers: [
    {
      value: 'tiksliniu_programu_teritorijos_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'tiksliniu_programu_teritorijos_rengiamas',
      name: 'Rengiamos',
    },
    {
      value: 'tiksliniu_programu_teritorijos_patvirtintas',
      name: 'Patvirtintos',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'tiksliniu_programu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaTiksliniuProgramuTeritorijos.layer.set('id', 'gamtotvarkaTiksliniuProgramuTeritorijos');

export const gamtotvarkaTikslinesProgramos = {
  id: 'gamtotvarkaTikslinesProgramos',
  title: 'Tikslinės programos',
  sublayers: [
    {
      name: 'Plotai',
      layer: gamtotvarkaTiksliniuProgramuPlotai.layer,
      id: gamtotvarkaTiksliniuProgramuPlotai.id,
    },
    {
      name: 'Teritorijos',
      layer: gamtotvarkaTiksliniuProgramuTeritorijos.layer,
      id: gamtotvarkaTiksliniuProgramuTeritorijos.id,
    },
  ],
  layer: new LayerGroup({
    layers: [
      gamtotvarkaTiksliniuProgramuTeritorijos.layer,
      gamtotvarkaTiksliniuProgramuPlotai.layer,
    ],
  }),
};
gamtotvarkaTikslinesProgramos.layer.setVisible(false);
gamtotvarkaTikslinesProgramos.layer.set('id', 'gamtotvarkaTikslinesProgramos');

export const gamtotvarkaVeiksmuPlanuPlotai = {
  id: 'gamtotvarkaVeiksmuPlanuPlotai',
  title: 'Rūšių apsaugos veiksmų planų plotai',
  sublayers: [
    {
      value: 'rusiu_veiksmu_planu_plotai_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'rusiu_veiksmu_planu_plotai_rengiamas',
      name: 'Rengiami',
    },
    {
      value: 'rusiu_veiksmu_planu_plotai_patvirtintas',
      name: 'Patvirtinti',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'rusiu_veiksmu_planu_plotai_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaVeiksmuPlanuPlotai.layer.set('id', 'gamtotvarkaVeiksmuPlanuPlotai');

export const gamtotvarkaVeiksmuPlanuTeritorijos = {
  id: 'gamtotvarkaVeiksmuPlanuTeritorijos',
  title: 'Rūšių apsaugos veiksmų planų teritorijos',
  sublayers: [
    {
      value: 'rusiu_apsaugos_veiksmu_teritorijos_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'rusiu_apsaugos_veiksmu_teritorijos_rengiamas',
      name: 'Rengiamos',
    },
    {
      value: 'rusiu_apsaugos_veiksmu_teritorijos_patvirtintas',
      name: 'Patvirtintos',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'rusiu_apsaugos_veiksmu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaVeiksmuPlanuTeritorijos.layer.set('id', 'gamtotvarkaVeiksmuPlanuTeritorijos');

export const gamtotvarkaVeiksmuPlanai = {
  id: 'gamtotvarkaVeiksmuPlanai',
  title: 'Rūšių apsaugos veiksmų planai',
  sublayers: [
    {
      name: 'Plotai',
      layer: gamtotvarkaVeiksmuPlanuPlotai.layer,
      id: gamtotvarkaVeiksmuPlanuPlotai.id,
    },
    {
      name: 'Teritorijos',
      layer: gamtotvarkaVeiksmuPlanuTeritorijos.layer,
      id: gamtotvarkaVeiksmuPlanuTeritorijos.id,
    },
  ],
  layer: new LayerGroup({
    layers: [gamtotvarkaVeiksmuPlanuTeritorijos.layer, gamtotvarkaVeiksmuPlanuPlotai.layer],
  }),
};
gamtotvarkaVeiksmuPlanai.layer.setVisible(false);
gamtotvarkaVeiksmuPlanai.layer.set('id', 'gamtotvarkaVeiksmuPlanai');

export const gamtotvarkaStTvarkymoPlanuPlotai = {
  id: 'gamtotvarkaStTvarkymoPlanuPlotai',
  title: 'ST tvarkymo planų plotai',
  sublayers: [
    {
      value: 'st_tvarkymo_planu_plotai_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'st_tvarkymo_planu_plotai_rengiamas',
      name: 'Rengiami',
    },
    {
      value: 'st_tvarkymo_planu_plotai_patvirtintas',
      name: 'Patvirtinti',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'st_tvarkymo_planu_plotai_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaStTvarkymoPlanuPlotai.layer.set('id', 'gamtotvarkaStTvarkymoPlanuPlotai');

export const gamtotvarkaStTvarkymoPlanuTeritorijos = {
  id: 'gamtotvarkaStTvarkymoPlanuTeritorijos',
  title: 'ST tvarkymo planų teritorijos',
  sublayers: [
    {
      value: 'st_tvarkymo_planu_teritorijos_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'st_tvarkymo_planu_teritorijos_rengiamas',
      name: 'Rengiamos',
    },
    {
      value: 'st_tvarkymo_planu_teritorijos_patvirtintas',
      name: 'Patvirtintos',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'st_tvarkymo_planu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaStTvarkymoPlanuTeritorijos.layer.set('id', 'gamtotvarkaStTvarkymoPlanuTeritorijos');

export const gamtotvarkaStTvarkymoPlanai = {
  id: 'gamtotvarkaStTvarkymoPlanai',
  title: 'ST tvarkymo planai',
  sublayers: [
    {
      name: 'Plotai',
      layer: gamtotvarkaStTvarkymoPlanuPlotai.layer,
      id: gamtotvarkaStTvarkymoPlanuPlotai.id,
    },
    {
      name: 'Teritorijos',
      layer: gamtotvarkaStTvarkymoPlanuTeritorijos.layer,
      id: gamtotvarkaStTvarkymoPlanuTeritorijos.id,
    },
  ],
  layer: new LayerGroup({
    layers: [gamtotvarkaStTvarkymoPlanuTeritorijos.layer, gamtotvarkaStTvarkymoPlanuPlotai.layer],
  }),
};
gamtotvarkaStTvarkymoPlanai.layer.setVisible(false);
gamtotvarkaStTvarkymoPlanai.layer.set('id', 'gamtotvarkaStTvarkymoPlanai');

export const gamtotvarkaInvaVeiksmuPlanuPlotai = {
  id: 'gamtotvarkaInvaVeiksmuPlanuPlotai',
  title: 'Invazinių rūšių veiksmų planų plotai',
  sublayers: [
    {
      value: 'invaziniu_rusiu_veiksmu_plotai_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'invaziniu_rusiu_veiksmu_plotai_rengiamas',
      name: 'Rengiami',
    },
    {
      value: 'invaziniu_rusiu_veiksmu_plotai_patvirtintas',
      name: 'Patvirtinti',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'invaziniu_rusiu_veiksmu_plotai_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaInvaVeiksmuPlanuPlotai.layer.set('id', 'gamtotvarkaInvaVeiksmuPlanuPlotai');

export const gamtotvarkaInvaVeiksmuPlanuTeritorijos = {
  id: 'gamtotvarkaInvaVeiksmuPlanuTeritorijos',
  title: 'Invazinių rūšių veiksmų planų teritorijos',
  sublayers: [
    {
      value: 'invaziniu_rusiu_veiksmu_planu_teritorijos_negalioja',
      name: 'Negalioja',
    },
    {
      value: 'invaziniu_rusiu_veiksmu_planu_teritorijos_rengiamas',
      name: 'Rengiamos',
    },
    {
      value: 'invaziniu_rusiu_veiksmu_planu_teritorijos_patvirtintas',
      name: 'Patvirtintos',
    },
  ],
  layer: getWMSImageLayer(
    'https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka',
    'invaziniu_rusiu_veiksmu_planu_teritorijos_patvirtintas',
    vsttCopyright,
  ),
};
gamtotvarkaInvaVeiksmuPlanuTeritorijos.layer.set('id', 'gamtotvarkaInvaVeiksmuPlanuTeritorijos');

export const gamtotvarkaInvaVeiksmuPlanai = {
  id: 'gamtotvarkaInvaVeiksmuPlanai',
  title: 'Invazinių rūšių reguliavimo veiksmų planas',
  sublayers: [
    {
      name: 'Plotai',
      layer: gamtotvarkaInvaVeiksmuPlanuPlotai.layer,
      id: gamtotvarkaInvaVeiksmuPlanuPlotai.id,
    },
    {
      name: 'Teritorijos',
      layer: gamtotvarkaInvaVeiksmuPlanuTeritorijos.layer,
      id: gamtotvarkaInvaVeiksmuPlanuTeritorijos.id,
    },
  ],
  layer: new LayerGroup({
    layers: [gamtotvarkaInvaVeiksmuPlanuTeritorijos.layer, gamtotvarkaInvaVeiksmuPlanuPlotai.layer],
  }),
};
gamtotvarkaInvaVeiksmuPlanai.layer.setVisible(false);
gamtotvarkaInvaVeiksmuPlanai.layer.set('id', 'gamtotvarkaInvaVeiksmuPlanai');

export const gamtotvarkaService = {
  id: 'gamtotvarkaService',
  title: 'Gamtotvarkos duomenų žemėlapis',
  description: vsttCopyright,
  sublayers: [
    {
      name: 'Invazinių rūšių reguliavimo veiksmų planas',
      layer: gamtotvarkaInvaVeiksmuPlanai.layer,
      id: gamtotvarkaInvaVeiksmuPlanai.id,
    },
    {
      name: 'Saugomų teritorijų tvarkymo planai',
      layer: gamtotvarkaStTvarkymoPlanai.layer,
      id: gamtotvarkaStTvarkymoPlanai.id,
    },
    {
      name: 'Rūšių apsaugos veiksmų planai',
      layer: gamtotvarkaVeiksmuPlanai.layer,
      id: gamtotvarkaVeiksmuPlanai.id,
    },
    {
      name: 'Tikslinės programos',
      layer: gamtotvarkaTikslinesProgramos.layer,
      id: gamtotvarkaTikslinesProgramos.id,
    },
    {
      name: 'Tvarkymo programos',
      layer: gamtotvarkaTvarkymoProgramos.layer,
      id: gamtotvarkaTvarkymoProgramos.id,
    },
    {
      name: 'Gamtotvarkos planai',
      layer: gamtotvarkaPlanai.layer,
      id: gamtotvarkaPlanai.id,
    },
    {
      name: 'Atlikti tvarkymo darbai',
      layer: gamtotvarkaAtliktiDarbai.layer,
      id: gamtotvarkaAtliktiDarbai.id,
    },
  ],
  layer: new LayerGroup({
    layers: [
      gamtotvarkaAtliktiDarbai.layer,
      gamtotvarkaPlanai.layer,
      gamtotvarkaTvarkymoProgramos.layer,
      gamtotvarkaTikslinesProgramos.layer,
      gamtotvarkaVeiksmuPlanai.layer,
      gamtotvarkaStTvarkymoPlanai.layer,
    ],
  }),
};
gamtotvarkaService.layer.set('id', 'gamtotvarkaService');

export const huntingPublicService = {
  id: 'huntingPublicService',
  title: 'Medžioklė',
  description: [biipCopyright],
  sublayers: [
    {
      value: 'damages',
      name: 'Padaryta žala',
    },
    {
      value: 'wolfs',
      name: 'Sumedžioti vilkai',
    },
    {
      value: 'observations',
      name: 'Stebėti gyvūnai',
    },
  ],

  layer: getWMSImageLayer(
    `${qgisServerUrl}/hunting_public`,
    'wolfs,observations,damages',
    `${biipCopyright}`,
  ),
};

export const gamtotvarkaNatura2000 = {
  id: 'gamtotvarkaNatura2000',
  title: 'Natura 2000 teritorijų apsaugos tikslai',
  sublayers: [
    {
      value: 'at_web_viesinimui_materiali',
      name: 'BAST apsaugos tikslų vertybės (D1-317)',
    },
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
};
gamtotvarkaNatura2000.layer.set('id', 'gamtotvarkaNatura2000');

export const stvkGpoService = {
  id: 'stvkGpoService',
  description: vsttCopyright,
  title: 'Gamtos paveldo objektai',
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'botaniniai_gpo_t,geomorfologiniai_gpo_t,geologiniai_gpo_t,hidrogeologiniai_gpo_t,hidrografiniai_gpo_t,zoologiniai_gpo_t,botaniniai_gpo_p,geomorfologiniai_gpo_p,geologiniai_gpo_p,hidrogeologiniai_gpo_p,hidrografiniai_gpo_p,zoologiniai_gpo_p,sunyke_botaniniai_gpo_t,sunyke_geomorfologiniai_gpo_t,sunyke_geologiniai_gpo_t,sunyke_hidrogeologiniai_gpo_t,sunyke_hidrografiniai_gpo_t,sunyke_zoologiniai_gpo_t,sunyke_botaniniai_gpo_p,sunyke_geomorfologiniai_gpo_p,sunyke_geologiniai_gpo_p,sunyke_hidrogeologiniai_gpo_p,sunyke_hidrografiniai_gpo_p,sunyke_zoologiniai_gpo_p',
    vsttCopyright,
  ),
};
stvkGpoService.layer.set('id', 'stvkGpoService');

export const stvkRezervataiService = {
  id: 'stvkRezervataiService',
  description: vsttCopyright,
  title: 'Valstybiniai rezervatai',
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'valstybiniai_rezervatai',
    vsttCopyright,
  ),
};
stvkRezervataiService.layer.set('id', 'stvkRezervataiService');

export const stvkDraustiniaiService = {
  id: 'stvkDraustiniaiService',
  description: vsttCopyright,
  title: 'Draustiniai',
  sublayers: [
    {
      value: 'valstybiniai_draustiniai',
      name: 'Valstybiniai draustiniai',
    },
    {
      value: 'savivaldybiu_draustiniai',
      name: 'Savivaldybių draustiniai',
    },
  ],
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'valstybiniai_draustiniai,savivaldybiu_draustiniai',
    vsttCopyright,
  ),
};
stvkDraustiniaiService.layer.set('id', 'stvkDraustiniaiService');

export const stvkParkaiService = {
  id: 'stvkParkaiService',
  description: vsttCopyright,
  title: 'Valstybiniai parkai',
  sublayers: [
    {
      value: 'nac_parkai',
      name: 'Nacionaliniai parkai',
    },
    {
      value: 'reg_parkai',
      name: 'Regioniniai parkai',
    },
  ],
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'nac_parkai,reg_parkai',
    vsttCopyright,
  ),
};
stvkParkaiService.layer.set('id', 'stvkParkaiService');

export const stvkBioStebesenosService = {
  id: 'stvkBioStebesenosService',
  description: vsttCopyright,
  title: 'Biosferos stebėsenos (monitoringo) teritorijos',
  sublayers: [
    {
      value: 'bio_rezervatai',
      name: 'Biosferos rezervatai',
    },
    {
      value: 'bio_poligonai',
      name: 'Biosferos poligonai',
    },
  ],
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'bio_rezervatai,bio_poligonai',
    vsttCopyright,
  ),
};
stvkBioStebesenosService.layer.set('id', 'stvkBioStebesenosService');

export const stvkGenetiniaiSklypaiService = {
  id: 'stvkGenetiniaiSklypaiService',
  description: vsttCopyright,
  title: 'Genetiniai sklypai',
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'genetiniai_sklypai',
    vsttCopyright,
  ),
};
stvkGenetiniaiSklypaiService.layer.set('id', 'stvkGenetiniaiSklypaiService');

export const stvkAtkuriamiejiSklypaiService = {
  id: 'stvkAtkuriamiejiSklypaiService',
  description: vsttCopyright,
  title: 'Atkuriamieji sklypai',
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'atkuriamieji_sklypai',
    vsttCopyright,
  ),
};
stvkAtkuriamiejiSklypaiService.layer.set('id', 'stvkAtkuriamiejiSklypaiService');

export const stvkBufApsZonosService = {
  id: 'stvkBufApsZonosService',
  description: vsttCopyright,
  title: 'Buferinės apsaugos zonos',
  layer: getWMSImageLayer(
    'https://services.stvk.lt/wms/stvk-services',
    'buf_apsaugos_zonos',
    vsttCopyright,
  ),
};
stvkBufApsZonosService.layer.set('id', 'stvkBufApsZonosService');

export const stvkNatura2000Service = {
  id: 'stvkNatura2000Service',
  description: vsttCopyright,
  title: 'Natura 2000',
  sublayers: [
    {
      value: 'past',
      name: 'Paukščių apsaugai svarbios teritorijos',
    },
    {
      value: 'bast',
      name: 'Buveinių apsaugai svarbios teritorijos',
    },
  ],
  layer: getWMSImageLayer('https://services.stvk.lt/wms/stvk-services', 'past,bast', vsttCopyright),
};
stvkNatura2000Service.layer.set('id', 'stvkNatura2000Service');

export const stvkPajurioJuostaService = {
  id: 'stvkPajurioJuostaService',
  description: vsttCopyright,
  title: 'Pajūrio juosta',
  layer: getWMSImageLayer('https://services.stvk.lt/wms/stvk-services', 'pajurio', vsttCopyright),
};
stvkPajurioJuostaService.layer.set('id', 'stvkPajurioJuostaService');

export const gamtotvarkaStvkService = {
  id: 'gamtotvarkaStvkService',
  description: vsttCopyright,
  title: 'Saugomų teritorijų valstybės kadastras',
  sublayers: [
    {
      name: 'Pajūrio juosta',
      layer: stvkPajurioJuostaService.layer,
      id: stvkPajurioJuostaService.id,
    },
    {
      name: 'Natura 2000',
      layer: stvkNatura2000Service.layer,
      id: stvkNatura2000Service.id,
    },
    {
      name: 'Buferinės apsaugos zonos',
      layer: stvkBufApsZonosService.layer,
      id: stvkBufApsZonosService.id,
    },
    {
      name: 'Genetiniai sklypai',
      layer: stvkGenetiniaiSklypaiService.layer,
      id: stvkGenetiniaiSklypaiService.id,
    },
    {
      name: 'Atkuriamieji sklypai',
      layer: stvkAtkuriamiejiSklypaiService.layer,
      id: stvkAtkuriamiejiSklypaiService.id,
    },
    {
      name: 'Biosferos stebėsenos (monitoringo) teritorijos',
      layer: stvkBioStebesenosService.layer,
      id: stvkBioStebesenosService.id,
    },
    {
      name: 'Valstybiniai parkai',
      layer: stvkParkaiService.layer,
      id: stvkParkaiService.id,
    },
    {
      name: 'Draustiniai',
      layer: stvkDraustiniaiService.layer,
      id: stvkDraustiniaiService.id,
    },
    {
      name: 'Valstybiniai rezervatai',
      layer: stvkRezervataiService.layer,
      id: stvkRezervataiService.id,
    },
    {
      name: 'Gamtos paveldo objektai',
      layer: stvkGpoService.layer,
      id: stvkGpoService.id,
    },
  ],
  layer: new LayerGroup({
    layers: [
      stvkPajurioJuostaService.layer,
      stvkNatura2000Service.layer,
      stvkBufApsZonosService.layer,
      stvkGenetiniaiSklypaiService.layer,
      stvkAtkuriamiejiSklypaiService.layer,
      stvkBioStebesenosService.layer,
      stvkParkaiService.layer,
      stvkDraustiniaiService.layer,
      stvkRezervataiService.layer,
      stvkGpoService.layer,
    ],
  }),
};
gamtotvarkaStvkService.layer.set('id', 'gamtotvarkaStvkService');

export const tourismService = {
  id: 'tourismService',
  description: vsttCopyright,
  title: 'Turizmo objektai',
  layer: getWMSImageLayer(`${qgisServerUrl}/tourism`, 'forms', biipCopyright),
};
