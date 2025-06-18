<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="(feature, index) in features"
      :key="index"
      :is-open="true"
      :title="`Sklypas: ${feature?.cadastral_number}`"
      :subtitle="feature?.municipality?.name"
    >
      <UiTable class="text-xs">
        <template
          v-for="(item, innerIndex) in filteredRows(feature)"
          :key="`${item.key}-${innerIndex}`"
        >
          <UiTableRow>
            <UiTableCell class="w-1/2">
              {{ item.translate }}
            </UiTableCell>
            <UiTableCell class="w-1/2">
              {{ item.fn ? item.fn(feature[item.key], feature) : feature[item.key] }}
            </UiTableCell>
          </UiTableRow>
        </template>
      </UiTable>

      <div
        v-for="permit in feature?.permits || []"
        :key="permit.id"
        class="my-2 bg-gray-100 p-4 rounded flex items-start justify-between"
      >
        <div>
          <div class="text-sm font-semibold">
            <span>Leidimas Nr. {{ permit.permitNumber }}</span>
          </div>
          <div class="text-xxs">
            Išduotas:
            {{ getPermitIssuedTo(permit) }}
          </div>
        </div>
        <UiIcon
          v-if="permit.doPostMessage"
          name="chevron-right"
          class="flex-shrink-0 cursor-pointer"
          :size="28"
          @click="postMessage('selectedPermit', { id: permit.id })"
        />
      </div>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { getUniqueValues } from '@/utils';
defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

const postMessage: any = inject('postMessage');

function getPermitIssuedTo(permit: any) {
  if (permit.issuedToTenant?.name) return permit.issuedToTenant.name;
  else if (permit.issuedToUser?.firstName || permit.issuedToUser?.lastName) {
    return [permit.issuedToUser?.firstName, permit.issuedToUser?.lastName]
      .filter(Boolean)
      .join(' ');
  }
  return 'Nenurodyta';
}

const rows: any[] = [
  { key: 'unique_number', translate: 'Sklypo unikalus numeris' },
  { key: 'cadastral_number', translate: 'Sklypo kadastrinis numeris' },
  { key: 'area_ha', translate: 'Plotas, ha' },
  {
    key: 'purpose',
    translate: 'Sklypo paskirtis',
    fn: (purpose: any) => purpose?.purpose_group?.full_name || purpose?.name,
  },
  { key: 'municipality', translate: 'Savivaldybė', fn: (municipality: any) => municipality.name },
  {
    key: 'permits',
    translate: 'Leidžiama laikyti laukinius gyvūnus',
    fn: (permits: any[]) =>
      getUniqueValues(
        permits.map((p) => p.permitSpecies?.map((ps: any) => ps.speciesClassifier?.name)).flat(),
      )
        .sort()
        .join(', '),
  },
  {
    key: 'permits',
    translate: 'Išduota leidimų',
    fn: (permits: any[]) => permits.length || 0,
  },
];

const filteredRows = (feature: any) => {
  return rows.filter((r) => {
    return typeof feature[r.key] !== 'undefined';
  });
};
</script>
