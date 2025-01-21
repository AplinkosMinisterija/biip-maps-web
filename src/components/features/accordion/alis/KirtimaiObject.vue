<template>
  <UiTable class="text-xs break-all">
    <UiTableRow v-for="item in getSorted(feature)" :key="item.id">
      <UiTableCell class="w-1/2">
        {{ item.name }}
      </UiTableCell>
      <UiTableCell class="w-1/2">
        {{ item.value }}
      </UiTableCell>
    </UiTableRow>
  </UiTable>
</template>

<script setup lang="ts">
import { isInteger } from "lodash";

defineProps({
  feature: {
    type: Object,
    default: () => ({}),
  },
});

const getSorted = (properties: any) => {
  return Object.entries(properties)
    .reduce((acc: any, [key, value]) => {
      return [...acc, { name: key, value, id: key }];
    }, [])
    .sort((a: any, b: any) => {
      if (isInteger(a.id)) return a.id - b.id;
      return a.id.localeCompare(b.id);
    })
    .filter((item: any) => !["featureId", "_layerTitle", "_type"].includes(item.name));
};
</script>
