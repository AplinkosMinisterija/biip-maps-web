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

// Rūšis apskaitoma vienetais, kilogramais arba (sumuojant savivaldybėje) abiem.
const formatSpeciesAmount = ({ count, countKg }: { count?: number; countKg?: number }) => {
  if (count && countKg) return count + ' + ' + countKg + ' kg';
  if (countKg) return countKg + ' kg';
  return count || 0;
};

const rows: any[] = [
  { key: 'municipality', translate: 'Savivaldybė', fn: (municipality: any) => municipality.name },
  { key: 'count', translate: 'Individų skaičius' },
  // Kilogramais apskaitomos rūšys į individų skaičių neįtraukiamos (gyvūnų API, #85).
  {
    key: 'countKg',
    translate: 'Kilogramais apskaitomų gyvūnų',
    hideEmpty: true,
    fn: (countKg: number) => countKg + ' kg',
  },
  { key: 'permitsCount', translate: 'Viso išduotų leidimų' },
  { key: 'zoosCount', translate: 'Zoologijos sodų' },
  { key: 'aviariesCount', translate: 'Aptvarų / Voljerų statinių' },
  { key: 'forestsCount', translate: 'Aptvarų / Voljerų statinių esančių miško teritorijoje' },
  {
    key: 'protectedTerritoriesCount',
    translate: 'Aptvarų / Voljerų statinių esančių saugomoje teritorijoje',
  },
  { key: 'fencedAreaSum', translate: 'Aptvertas plotas' },
  {
    key: 'speciesClassifier',
    translate: '',
    subitemsFn: (items: any) =>
      items.map((i: any) => ({
        name: `${i.name} (lot. <i>${i.nameLatin}</i>)`,
        value: formatSpeciesAmount(i),
      })),
  },
];

const filteredRows = (feature: any) => {
  return rows.filter((r) => {
    return typeof feature[r.key] !== 'undefined' && !(r.hideEmpty && !feature[r.key]);
  });
};
</script>
