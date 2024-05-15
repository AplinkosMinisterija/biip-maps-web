<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="
        feature._layerTitle
          ? feature._layerTitle
          : feature.featureId.split('.')[0].replace(/_/g, ' ')
      "
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
</script>
