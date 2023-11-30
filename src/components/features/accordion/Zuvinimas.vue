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
              <UiTableCell class="w-1/2" v-html="subitem.name" />
              <UiTableCell class="w-1/2">
                {{ subitem.value }}
              </UiTableCell>
            </UiTableRow>
          </template>
        </template>
      </UiTable>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import _ from 'lodash'

defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

const rows: any[] = [
  {key: 'uetk.municipality', translate: 'Savivaldybė'},
  {key: 'count', translate: 'Bendras kiekis', fn: (value: any) => `${value} vnt.`},
  {key: 'byFishes', translate: '', subitemsFn: (items: any) => items.map((i: any) => ({
    name: i.fishType?.label,
    value: `${i.count || 0} vnt.`
  }))},
  {key: 'uetk.id', translate: 'UETK kadastro ID'},
]

const filteredRows = (feature: any) => {
  return rows.filter((r) => {
    return typeof _.get(feature, r.key) !== "undefined";
  });
};
</script>
