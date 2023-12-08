<template>
  <UiAccordion>
    <UiAccordionItem
      v-for="feature in features"
      :key="feature.featureId"
      :title="getTitle(feature)"
      :badge="getBadge(feature)"
    >
      <UiTable class="text-xs">
        <template v-for="item in getSorted(feature)" :key="item.id">
          <UiTableRow v-if="item?.name !== 'animals'">
            <UiTableCell class="w-1/2">
              {{ getTranslate(item.name) }}
            </UiTableCell>
            <UiTableCell class="w-1/2">
              <template
                v-if="['Sukurta', 'Laikas', 'Atnaujinta'].includes(item.name) && item.value"
              >
                {{ formatTime(item.value) }}
              </template>
              <template v-else-if="['municipality'].includes(item.name)">
                {{ item.value?.name }}
              </template>
              <template v-else>
                {{ item.value }}
              </template>
            </UiTableCell>
          </UiTableRow>
          <template v-else>
            <UiTableRow v-for="i in item.value" :key="i.id">
              <UiTableCell class="w-1/2">
                {{ i.name }}
              </UiTableCell>
              <UiTableCell class="w-1/2">
                {{ i.count }}
              </UiTableCell>
            </UiTableRow>
          </template>
        </template>
      </UiTable>
      <div v-if="['Stebėti gyvūnai', 'Padaryta žala'].includes(getTitle(feature))">
        <UiButton class="mt-2" size="sm">
          <a target="_blank" :href="getLink(feature) + feature.Id"> Peržiūrėti visus duomenis </a>
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

function hasFeatureId(feature: any) {
  return !!feature?.featureId;
}

function getTranslate(key?: string) {
  const translates: any = {
    observations: 'Stebėti gyvūnai',
    wolfs: 'Sumedžioti vilkai',
    damages: 'Padaryta žala',
    count: 'Viso',
    municipality: 'Savivaldybė',
  };

  if (!key) return;

  return translates[key] || key;
}

function getTitle(feature: any) {
  if (!hasFeatureId(feature)) {
    return feature.municipality.name;
  }

  const objectType = getTranslate(feature?.featureId?.split('.')?.[0]);

  return objectType || 'Objektas';
}

function getBadge(feature: any) {
  if (!hasFeatureId(feature)) {
    return 'Savivaldybė';
  }

  return feature.Sukurta?.split('T')?.[0] || 'Objektas';
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
      let id: number | string = parseInt(key?.split('.')[0]);
      if (isNaN(id)) id = key;
      return [...acc, { name: key, value, id }];
    }, [])
    .sort((a: any, b: any) => {
      if (!a.id || !b.id) return 0;
      if (isInteger(a.id)) return a.id - b.id;
      return a.id.localeCompare(b.id);
    })
    .filter(
      (item: any) => !['featureId', '_layerTitle', 'municipalityId', 'seasons'].includes(item.name),
    );
};
</script>
