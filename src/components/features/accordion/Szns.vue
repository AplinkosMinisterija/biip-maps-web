<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getFeatureTitle(feature)"
      :subtitle="getFeatureSubtitle(feature)"
    >
      <UiTable class="text-xs">
        <UiTableRow v-for="item in getSorted(feature)" :key="item.id">
          <UiTableCell class="w-1/2">
            {{ item.name }}
          </UiTableCell>
          <UiTableCell class="w-1/2">
            <div>
              {{ formatValue(item) }}
            </div>
          </UiTableCell>
        </UiTableRow>
      </UiTable>
      <div>
        <UiButton v-if="feature[urlAttribute]" class="mt-2 text-left" size="sm">
          <a target="_blank" :href="feature['Papildoma informacija']">
            Specialiosios žemės naudojimo sąlygos (draudimai ir apribojimai)
          </a>
        </UiButton>
      </div>
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

const urlAttribute = 'Papildoma informacija';
const valueToRoundAttributes = [
  'Paviršinių vandens telkinių apsaugos zonos plotas (ha)',
  'Paviršinių vandens telkinių pakrančių apsaugos juostos plotas (ha)',
  'Specialiosios sąlygos plotas (ha)',
];

const attributeOrder = [
  // SZNS
  'Specialioji sąlyga',
  'Specialiosios sąlygos plotas (ha)',
  'Paviršinio vandens telkinio pavadinimas',
  'Paviršinio vandens telkinio UETK kodas',
  'SŽNS teritorijos ID',
  'Papildoma informacija',
  // UETK
  '1. Pavadinimas',
  '2. Kadastro identifikavimo kodas',
  '3. Kategorija',
  '4. Upės pabaseinis',
  '5. Centro X koordinatė (LKS-94), m',
  '6. Centro Y koordinatė (LKS-94), m',
  '7. Vandens paviršiaus be salų plotas, ha',
  '8. Kranto linijos ilgis, km',
  '9. Kadastro objekto registravimo data',
  '10. Kita informacija',
  // Parcels
  'Unikalus ID',
  'Kadastro Nr.',
  'Savivaldybė',
  'Seniūnija',
  'Paviršinių vandens telkinių apsaugos zonos plotas (ha)',
  'Paviršinių vandens telkinių pakrančių apsaugos juostos plotas (ha)',
];

const getSorted = (properties: any) => {
  const items = Object.entries(properties)
    .map(([key, value]) => ({ name: key, value, id: key }))
    .filter((item: any) => !['featureId', '_layerTitle', urlAttribute].includes(item.name));

  return items.sort((a: any, b: any) => {
    const positionA = attributeOrder.indexOf(a.name);
    const positionB = attributeOrder.indexOf(b.name);

    if (positionA !== -1 && positionB !== -1) {
      return positionA - positionB;
    }

    if (positionA !== -1) return -1;

    if (positionB !== -1) return 1;

    return a.name.localeCompare(b.name);
  });
};

const getFeatureTitle = (feature: any) => {
  return (
    feature['Paviršinio vandens telkinio pavadinimas'] ||
    feature['1. Pavadinimas'] ||
    'Žemės sklypas'
  );
};

const getFeatureSubtitle = (feature: any) => {
  return feature['Specialioji sąlyga'] || feature['3. Kategorija'] || feature['Unikalus ID'];
};

const formatValue = (item: any) => {
  if (valueToRoundAttributes.includes(item.name)) {
    if (item.value == 0) {
      return 'Teritorija nenustatyta';
    }
    return Number(item.value).toFixed(4);
  }
  return item.value;
};
</script>
