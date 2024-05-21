import { PakmapsLayer, PakmapsLayerType } from '@/libs/pak-maps';
import { getWMSImageLayer } from '../utils';
import { getCopyrightLabel } from '@/utils/utils';

const vsttCopyright = getCopyrightLabel(
  'Valstybinė saugomų teritorijų tarnyba',
  'https://vstt.lrv.lt',
);

// https://wmsgisservice.biomon.lt/opengisservice/gamtotvarka?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
const biomonGisHost = 'https://wmsgisservice.biomon.lt/opengisservice';
const gamtotvarkaUrl = `${biomonGisHost}/gamtotvarka`;
const apsaugosTikslaiUrl = `${biomonGisHost}/apsaugos_tikslai_wfs`;

export const gamtotvarkaAtliktiDarbai = new PakmapsLayer({
  id: 'gamtotvarkaAtliktiDarbai',
  name: 'Atlikti tvarkymo darbai',
  sublayers: [
    { value: 'tvarkymo_darbu_pateikimo_busena', name: 'Tvarkymo darbų pateikimo būsena' },
    { value: 'tvarkymo_darbai', name: 'Atlikti tvarkymo darbai' },
  ],
  layer: getWMSImageLayer(
    gamtotvarkaUrl,
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
  layer: getWMSImageLayer(gamtotvarkaUrl, 'gamtotvarkos_plotai_patvirtintas', vsttCopyright),
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
  layer: getWMSImageLayer(gamtotvarkaUrl, 'gamtotvarkos_teritorijos_patvirtintas', vsttCopyright),
  type: PakmapsLayerType.WMS,
});

export const gamtotvarkaPlanai = new PakmapsLayer({
  id: 'gamtotvarkaPlanai',
  name: 'Gamtotvarkos planai',
  sublayers: [
    { name: 'Plotai', pakmapsLayer: gamtotvarkaPlanuPlotai },
    { name: 'Teritorijos', pakmapsLayer: gamtotvarkaPlanuTeritorijos },
  ],
  visible: false,
});

export const gamtotvarkaProgramuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaProgramuPlotai',
  name: 'Tvarkymo programų plotai',
  sublayers: [
    { value: 'tvarkymo_programu_plotai_negalioja', name: 'Negalioja' },
    { value: 'tvarkymo_programu_plotai_rengiamas', name: 'Rengiami' },
    { value: 'tvarkymo_programu_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(gamtotvarkaUrl, 'tvarkymo_programu_plotai_patvirtintas', vsttCopyright),
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
    gamtotvarkaUrl,
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
  visible: false,
});

export const gamtotvarkaTiksliniuProgramuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaTiksliniuProgramuPlotai',
  name: 'Tikslinių programų plotai',
  sublayers: [
    { value: 'tikslines_programos_plotai_negalioja', name: 'Negalioja' },
    { value: 'tikslines_programos_plotai_rengiamas', name: 'Rengiami' },
    { value: 'tikslines_programos_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(gamtotvarkaUrl, 'tikslines_programos_plotai_patvirtintas', vsttCopyright),
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
    gamtotvarkaUrl,
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
  visible: false,
});

export const gamtotvarkaVeiksmuPlanuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaVeiksmuPlanuPlotai',
  name: 'Rūšių apsaugos veiksmų planų plotai',
  sublayers: [
    { value: 'rusiu_veiksmu_planu_plotai_negalioja', name: 'Negalioja' },
    { value: 'rusiu_veiksmu_planu_plotai_rengiamas', name: 'Rengiami' },
    { value: 'rusiu_veiksmu_planu_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(gamtotvarkaUrl, 'rusiu_veiksmu_planu_plotai_patvirtintas', vsttCopyright),
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
    gamtotvarkaUrl,
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
  visible: false,
});

export const gamtotvarkaStTvarkymoPlanuPlotai = new PakmapsLayer({
  id: 'gamtotvarkaStTvarkymoPlanuPlotai',
  name: 'ST tvarkymo planų plotai',
  sublayers: [
    { value: 'st_tvarkymo_planu_plotai_negalioja', name: 'Negalioja' },
    { value: 'st_tvarkymo_planu_plotai_rengiamas', name: 'Rengiami' },
    { value: 'st_tvarkymo_planu_plotai_patvirtintas', name: 'Patvirtinti' },
  ],
  layer: getWMSImageLayer(gamtotvarkaUrl, 'st_tvarkymo_planu_plotai_patvirtintas', vsttCopyright),
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
    gamtotvarkaUrl,
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
  visible: false,
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
    gamtotvarkaUrl,
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
    gamtotvarkaUrl,
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
  visible: false,
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
    apsaugosTikslaiUrl,
    'at_web_viesinimui_materiali,vietoviu_web_viesinimui_materiali',
    vsttCopyright,
  ),
  type: PakmapsLayerType.WMS,
});
