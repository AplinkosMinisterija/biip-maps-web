import { PakmapsLayer, PakmapsLayerType } from '@/libs/pak-maps';
import { getWMSImageLayer } from '../utils';
import { getCopyrightLabel } from '@/utils/utils';

const vsttCopyright = getCopyrightLabel(
  'Valstybinė saugomų teritorijų tarnyba',
  'https://vstt.lrv.lt',
);

const stvkServicesUrl = 'https://services.stvk.lt/wms/stvk-services';

function getStvkLayerData(sublayers: string) {
  return {
    description: vsttCopyright,
    layer: getWMSImageLayer(stvkServicesUrl, sublayers, vsttCopyright),
    type: PakmapsLayerType.WMS,
  };
}

export const stvkService = new PakmapsLayer({
  id: 'stvkService',
  name: 'Saugomų teritorijų valstybės kadastras',
  ...getStvkLayerData(
    'botaniniai_gpo_t,geomorfologiniai_gpo_t,geologiniai_gpo_t,hidrogeologiniai_gpo_t,hidrografiniai_gpo_t,zoologiniai_gpo_t,botaniniai_gpo_p,geomorfologiniai_gpo_p,geologiniai_gpo_p,hidrogeologiniai_gpo_p,hidrografiniai_gpo_p,zoologiniai_gpo_p,sunyke_botaniniai_gpo_t,sunyke_geomorfologiniai_gpo_t,sunyke_geologiniai_gpo_t,sunyke_hidrogeologiniai_gpo_t,sunyke_hidrografiniai_gpo_t,sunyke_zoologiniai_gpo_t,sunyke_botaniniai_gpo_p,sunyke_geomorfologiniai_gpo_p,sunyke_geologiniai_gpo_p,sunyke_hidrogeologiniai_gpo_p,sunyke_hidrografiniai_gpo_p,sunyke_zoologiniai_gpo_p,valstybiniai_rezervatai,kpfz_rezervatai,valstybiniai_draustiniai,savivaldybiu_draustiniai,kpfz_draustiniai,nac_parkai,np_rezervatai,np_draustiniai,np_ekolog_aps_fpz,np_rekreac_fpz,np_zem_uk_fpz,np_misk_uk_fpz,np_bendr_naud_vand_uk_fpz,np_kitos_uk_fpz,np_gyv_pask_fpz,np_kitos_pask_fpz,reg_parkai,rp_rezervatai,rp_draustiniai,rp_ekolog_aps_fpz,rp_rekreac_fpz,rp_zemes_uk_fpz,rp_misku_uk_fpz,rp_bendr_naud_vand_uk_fpz,rp_kitos_uk_fpz,rp_gyv_fpz,rp_kitos_fpz,bio_rezervatai,biosferos_rez_rezervatai,biosferos_poli_draustiniai,eko_fpz,zemes_fpz,misku_fpz,ekosistem_fpz,bio_poligonai,vandens_fpz,kitos_paskirties_fpz,atkuriamieji_sklypai,genetiniai_sklypai,buf_apsaugos_zonos,past,bast,pajurio,direkciju_teritorijos',
  ),
});

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
