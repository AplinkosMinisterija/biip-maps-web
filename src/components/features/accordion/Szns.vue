<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="feature['3. Paviršinio vandens telkinio pavadinimas'] || feature['1. Pavadinimas']"
      :subtitle="feature['1. Specialioji sąlyga'] || feature['3. Kategorija']"
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
      <div>
        <UiButton v-if="feature['6. Papildoma informacija']" class="mt-2" size="sm">
          <a target="_blank" :href="feature['6. Papildoma informacija']">
            Peržiūrėti papildomą informaciją
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
    .filter(
      (item: any) => !['featureId', '_layerTitle', '6. Papildoma informacija'].includes(item.name),
    );
};
</script>
