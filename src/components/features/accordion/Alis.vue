<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getValue(feature, ['Pavadinimas'])"
      :subtitle="getSubtitle(feature)"
    >
      <UiTabs v-if="tabs.length" :tabs="tabs" :active="tabs[0].type" :hide-on-one="true">
        <template #default="{ activeTab }">
          <UiTable class="text-xs">
            <UiTableRow v-for="item in tableContent(activeTab, feature)" :key="item.key">
              <UiTableCell class="w-1/2">
                {{ item.key }}
              </UiTableCell>
              <UiTableCell class="w-1/2">
                {{ item.value(feature) }}
              </UiTableCell>
            </UiTableRow>
          </UiTable>
        </template>
      </UiTabs>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

const tabs = [
  { type: 'info', name: 'Bendra info'},
  { type: 'fishstocking', name: 'Žuvų įveisimas'}
]

function getCadastralId(feature: any) {
  return getValue(feature, [
    'Kadastro identifikavimo kodas',
    'Hidrostatinio unikalus identifikatorius',
  ]);
}

function getCategory(feature: any) {
  const translates: any = {
    upes: 'Upės',
    ezerai_tvenkiniai: 'Ežerai tvenkiniai',
    vandens_matavimo_stotys: 'Vandens matavimo stotys',
    vandens_tyrimu_vietos: 'Vandens tyrimų vietos',
    zemiu_uztvanka: 'Žemių užtvanka',
    vandens_pertekliaus_pralaida: 'Vandens pertekliaus pralaida',
    zuvu_pralaida: 'Žuvų pralaida',
    hidroelektrines: 'Hidroelektrinės',
    upiu_pabaseiniai: 'Upių pabaseiniai',
    upiu_baseinu_rajonai: 'Upių baseinų rajonai',
    upiu_baseinai: 'Upių baseinai',
  };

  return translates[feature.featureId?.split('.')?.[0]];
}

const basicInfo = [
  {key: 'Pavadinimas', value: (feature: any) => getValue(feature, 'Pavadinimas')},
  {key: 'UETK kadastro ID', value: (feature: any) => getValue(feature, [
    'Kadastro identifikavimo kodas',
    'Hidrostatinio unikalus identifikatorius',
  ])},
  {key: 'Kategorija', value: (feature: any) => getCategory(feature)},
  {key: 'Centro X koordinatė (LKS-94), m', value: (feature: any) => getValue(feature, 'Centro X koordinatė (LKS-94), m')},
  {key: 'Centro Y koordinatė (LKS-94), m', value: (feature: any) => getValue(feature, 'Centro Y koordinatė (LKS-94), m')},
  {key: 'Vandens paviršiaus be salų plotas, ha', value: (feature: any) => getValue(feature, 'Vandens paviršiaus be salų plotas, ha')},
  {key: 'Kranto linijos ilgis, km', value: (feature: any) => getValue(feature, 'Kranto linijos ilgis, km')},
]

const features = computed(() => props.features.map(f => {
  return Object.keys(f).reduce((acc: any, key: string) => {
    const newKey = key.replace(/^\d+\.\s*/gi, '')
    acc[newKey] = f[key]
    return acc;
  }, {})
}))

function getSubtitle(feature: any) {
  const cadastralId = getCadastralId(feature);
  const objectType = getCategory(feature)
  if (!cadastralId) return objectType || '';

  return `${objectType || 'Objektas'} (${cadastralId})`;
}
const getValue = (item: any, props: string | string[], translates?: any) => {
  if (!Array.isArray(props)) {
    props = [props];
  }
  const prop = props.find((p) => !!item[p]);
  if (!prop) return '';
  const value = item[prop];
  if (!value) return '';
  if (translates) {
    return translates[value] || '';
  }
  return value;
};

function tableContent(activeTab: string, feature: any) {
  if (activeTab === 'info') {
    return basicInfo.filter(i => !!i.value(feature))
  }

  return [{
    key: 'Ruošiama', value: () => 'Informacija ruošiama'
  }]
}
</script>
