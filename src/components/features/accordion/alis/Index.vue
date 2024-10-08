<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getTitle(feature)"
      :subtitle="getSubtitle(feature)"
    >
      <FeaturesAccordionAlisUetkObject
        v-if="!isTypeKirtimai(feature)"
        :feature="feature"
        :get-value="getValue"
        :get-cadastral-id="getCadastralId"
        :get-category="getCategory"
      />
      <FeaturesAccordionAlisKirtimaiObject
        v-else
        :feature="feature"
      />
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

const features = computed(() => props.features.map(f => {
  return Object.keys(f).reduce((acc: any, key: string) => {
    // remove numeric prefixes. E.g. `1. title` -> `title`
    const newKey = key.replace(/^\d+\.\s*/gi, '')
    acc[newKey] = f[key]
    return acc;
  }, {})
}))

function isTypeKirtimai(feature: any) {
  return feature?._type === 'kirtimai'
}

function getTitle(feature: any) {
  if (isTypeKirtimai(feature)) {
    return getValue(feature, ['Kirtimo rūšis'])
  }

  return getValue(feature, ['Pavadinimas'])
}

function getSubtitle(feature: any) {
  if (isTypeKirtimai(feature)) {
    return `${getValue(feature, ['Girininkija'])} girininkija, ${getValue(feature, ['VMU Padalinys'])} r.p.`
  }
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
  if (!prop) return "";
  const value = item[prop];
  if (!value) return "";
  if (translates) {
    return translates[value] || "";
  }
  return value;
};
</script>
