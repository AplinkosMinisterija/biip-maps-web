<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getTitle(feature)"
      :badge="`${feature.Sukurta.split('T')[0] || 'Objektas'}`"
    >
      <UiTable class="text-xs">
        <UiTableRow v-for="item in getSorted(feature)" :key="item.id">
          <UiTableCell class="w-1/2">
            {{ item.name }}
          </UiTableCell>
          <UiTableCell
            v-if="
              ['Sukurta', 'Laikas', 'Atnaujinta'].includes(item.name) &&
              item.value
            "
            class="w-1/2"
          >
            {{ formatTime(item.value) }}
          </UiTableCell>
          <UiTableCell v-else class="w-1/2">
            {{ item.value }}
          </UiTableCell>
        </UiTableRow>
      </UiTable>
      <div
        v-if="['Stebėti gyvūnai', 'Padaryta žala'].includes(getTitle(feature))"
      >
        <UiButton class="mt-2" size="sm">
          <a target="_blank" :href="getLink(feature) + feature.Id"
            >Peržiūrėti visus duomenis</a
          >
        </UiButton>
      </div>
    </UiAccordionItem>
  </UiAccordion>
</template>

<script setup lang="ts">
import { isInteger } from 'lodash';
import moment from 'moment';

function formatTime(timeString: any) {
  const formattedTime = moment(timeString).format('YYYY-MM-DD HH:mm:ss');
  return formattedTime;
}

defineProps({
  features: {
    type: Array<any>,
    default: [],
  },
});

function getTitle(feature: any) {
  const translates: any = {
    observations: 'Stebėti gyvūnai',
    wolfs: 'Sumedžioti vilkai',
    damages: 'Padaryta žala',
  };

  const objectType = translates[feature.featureId?.split('.')?.[0]];

  return `${objectType || 'Objektas'}`;
}

function getLink(feature: any): string {
  const featureTitle = getTitle(feature);
  const urlMap: Record<string, string> = {
    'Stebėti gyvūnai': 'https://medziokle.biip.lt/stebeti-gyvunai/',
    'Padaryta žala': 'https://medziokle.biip.lt/padaryta-zala/',
  };
  return urlMap[featureTitle] || '';
}

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
