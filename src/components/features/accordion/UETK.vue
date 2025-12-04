<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getFeatureTitle(feature)"
      :subtitle="getSubtitle(feature)"
    >
      <UiTable class="text-xs">
        <UiTableRow v-for="item in getSorted(feature)" :key="item.id">
          <UiTableCell class="w-1/2">
            {{ item.name }}
          </UiTableCell>
          <UiTableCell class="w-1/2">
            {{ item.value }}
          </UiTableCell>
        </UiTableRow>
      </UiTable>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { isInteger } from 'lodash';

defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

function getSubtitle(feature: any) {
  const cadastralId = getValue(feature, [
    '2. Kadastro identifikavimo kodas',
    '2. Hidrostatinio unikalus identifikatorius',
  ]);
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

  const objectType = translates[feature.featureId?.split('.')?.[0]];
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

const getSorted = (properties: any) => {
  return Object.entries(properties)
    .reduce((acc: any, [key, value]) => {
      let id: number | string = parseInt(key.split('.')[0]);
      if (isNaN(id)) id = key;
      return [...acc, { name: key, value, id }];
    }, [])
    .sort((a: any, b: any) => {
      if (isInteger(a.id)) return a.id - b.id;
      return a.id.localeCompare(b.id);
    })
    .filter((item: any) => !['featureId', '_layerTitle'].includes(item.name));
};

const getFeatureTitle = (feature: any) => {
  return feature['1. Pavadinimas'] || feature['_layerTitle'] || 'Žemės sklypas';
};
</script>
