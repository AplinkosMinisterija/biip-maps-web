<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="(feature, index) in features"
      :key="index"
      :is-open="true"
      :title="`${feature?.uetk?.name}`"
    >
      <UiTable class="text-xs">
        <template v-for="item in filteredRows(feature)" :key="item.key">
          <UiTableRow v-if="!item.subitemsFn">
            <UiTableCell class="w-1/2">
              {{ item.translate }}
            </UiTableCell>
            <UiTableCell class="w-1/2">
              {{
                item.fn
                  ? item.fn(_.get(feature, item.key), feature)
                  : _.get(feature, item.key)
              }}
            </UiTableCell>
          </UiTableRow>

          <template v-else>
            <UiTableRow
              v-for="(subitem, subindex) in item.subitemsFn(feature[item.key], feature)"
              :key="subindex"
            >
              <UiTableCell class="w-1/2" v-html="subitem.key" />
              <UiTableCell class="w-1/2">
                {{ subitem.value }}
              </UiTableCell>
            </UiTableRow>
          </template>
        </template>
      </UiTable>

      <template v-if="feature?.byYear">
        <template v-for="item in getInfoByYear(feature)" :key="item.group">
          <div class="mt-3 mb-1 text-xs">{{ item.group }}</div>
          <UiTable class="text-xs">
            <UiTableRow v-for="subitem in item.items" :key="subitem.key">
              <UiTableCell class="w-1/2" v-html="subitem.key" />
              <UiTableCell class="w-1/2">
                {{ subitem.value }}
              </UiTableCell>
            </UiTableRow>
          </UiTable>
        </template>
      </template>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { getFishStockingInfoByYear } from '@/utils';
import _ from 'lodash';

defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

function getInfoByYear(feature:any) {
  return getFishStockingInfoByYear(feature.byYear)
}

const rows: any[] = [
  { key: 'uetk.municipality', translate: 'Savivaldybė' },
  { key: 'uetk.id', translate: 'UETK kadastro ID' },
  { key: 'count', translate: 'Bendras kiekis, vnt.', fn: (value: any) => `${value}` },
  {
    key: 'byFishes',
    translate: '',
    subitemsFn: (items: any) =>
      items.map((i: any) => ({
        name: i.fishType?.label,
        value: `${i.count || 0} vnt.`,
      })),
  },
];

const filteredRows = (feature: any) => {
  return rows.filter((r) => {
    return typeof _.get(feature, r.key) !== 'undefined';
  });
};
</script>
