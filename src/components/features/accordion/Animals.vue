<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="(feature, index) in features"
      :key="index"
      :is-open="true"
      :title="`${feature?.municipality?.name}`"
    >
      <UiTable class="text-xs">
        <template v-for="item in filteredRows(feature)" :key="item.key">
          <UiTableRow v-if="!item.subitemsFn">
            <UiTableCell class="w-1/2">
              {{ item.translate }}
            </UiTableCell>
            <UiTableCell class="w-1/2">
              {{ item.fn ? item.fn(feature[item.key], feature) : feature[item.key] }}
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

defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

const rows: any[] = [
  {key: 'municipality', translate: 'Savivaldybė', fn: (municipality: any) => municipality.name},
  {key: 'amount', translate: 'Individų skaičius'},
  {key: 'permitCount', translate: 'Viso išduotų leidimų'},
  {key: 'zooCount', translate: 'Zoologijos sodų'},
  {key: 'aviaryCount', translate: 'Aptvarų / Voljerų statinių'},
  {key: 'forestCount', translate: 'Aptvarų / Voljerų statinių esančių miško teritorijoje'},
  {key: 'protectedTerritoryCount', translate: 'Aptvarų / Voljerų statinių esančių saugomoje teritorijoje'},
  {key: 'fencedAreaSum', translate: 'Aptvertas plotas'},
  {key: 'speciesClassifier', translate: '', subitemsFn: (items: any) => items.map((i: any) => ({
    name: `${i.name} (lot. <i>${i.nameLatin}</i>)`,
    value: i.count || 0
  }))},
]

const filteredRows = (feature: any) => {
  return rows.filter((r) => {
    return typeof feature[r.key] !== "undefined";
  });
};
</script>
