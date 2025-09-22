<template>
  <div>
    <UiButton
      v-if="alisWaterBody?.id && $route.query.buy"
      icon="chevron-right"
      :icon-right="true"
      type="green"
      class="w-full my-2"
      @click="postMessage('buyPermission', alisWaterBody)"
    >
      Pirkti leidimą
    </UiButton>
    <UiTabs v-if="tabs.length" :tabs="tabs" :active="tabs[0].type" :hide-on-one="true">
      <template #default="{ activeTab }">
        <UiLoader v-if="isLoading(activeTab)" type="table" />
        <template v-for="group in tableContent(activeTab)" v-else :key="group">
          <div v-if="group" class="text-xs mb-1 mt-3">{{ group.group }}</div>
          <UiTable v-if="group.items?.length" class="text-xs">
            <UiTableRow v-for="item in group.items" :key="item.key">
              <UiTableCell class="w-1/2">
                {{ item.key }}
              </UiTableCell>
              <UiTableCell class="w-1/2">
                <template v-if="!item.link">
                  {{ typeof item.value === "function" ? item.value() : item.value }}
                </template>
                <a
                  v-else
                  :href="item.value()"
                  target="_blank"
                  class="border-b border-b-black hover:border-b-gray-700 hover:text-gray-700"
                >
                  {{ item.link }}
                </a>
              </UiTableCell>
            </UiTableRow>
          </UiTable>
        </template>
      </template>
    </UiTabs>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { getWaterBodyInfoUrl } from "@/utils/requests/alis";
import { getFishTypesInfoByYearUrl } from "@/utils/requests/zuvinimas";
import {
  convertCoordinates,
  getFishStockingInfoByYear,
  projection,
  projection4326,
} from "@/utils";
import { useFetch } from "@vueuse/core";

import { useRoute } from "vue-router";

const postMessage: any = inject("postMessage");
// TODO: remove
const $route = useRoute();

const props = defineProps({
  feature: {
    type: Object,
    default: () => ({}),
  },
  getValue: {
    type: Function,
    default: () => {},
  },
  getCategory: {
    type: Function,
    default: () => {},
  },
  getCadastralId: {
    type: Function,
    default: () => {},
  },
});

const feature = computed(() => props.feature);
const cadastralId = computed(() => props.getCadastralId(feature.value));
const hasCadastralId = computed(() => !!cadastralId.value);

function isLoading(activeTab: string) {
  if (activeTab === "info") {
    return alisWaterBodyLoading.value;
  } else if (activeTab === "fishstocking") {
    return zuvinimasInfoLoading.value;
  }

  return false;
}

const { data: alisWaterBody, isFetching: alisWaterBodyLoading } = useFetch<any>(
  getWaterBodyInfoUrl(cadastralId.value),
  { immediate: hasCadastralId.value }
).json();

const { data: zuvinimasInfo, isFetching: zuvinimasInfoLoading } = useFetch<any>(
  getFishTypesInfoByYearUrl({ cadastralId: cadastralId.value }),
  {
    immediate: hasCadastralId.value,
    afterFetch(ctx: any) {
      ctx.data = ctx.data[cadastralId.value] || {};
      return ctx;
    },
  }
).json();

const allTabs = [
  { type: "info", name: "Bendra info" },
  { type: "fishstocking", name: "Žuvų įveisimas" },
];

const tabs = computed(() => {
  return allTabs.filter((t) => {
    return t.type === "info" || (!alisWaterBodyLoading.value && alisWaterBody.value?.id);
  });
});

function getFeatureProp(name: string | string[]) {
  return props.getValue(feature.value, name);
}
const basicInfo = [
  { key: "Pavadinimas", value: () => getFeatureProp("Pavadinimas") },
  {
    key: "UETK kadastro ID",
    value: () => cadastralId.value,
  },
  { key: "Kategorija", value: () => props.getCategory(feature.value) },
  { key: "Savivaldybė", value: () => alisWaterBody.value?.savivaldybe?.pavadinimas },
  {
    key: "Centro X koordinatė (LKS-94), m",
    value: () => getFeatureProp("Centro X koordinatė (LKS-94), m"),
  },
  {
    key: "Centro Y koordinatė (LKS-94), m",
    value: () => getFeatureProp("Centro Y koordinatė (LKS-94), m"),
  },
  {
    key: "Žiočių X koordinatė (LKS-94), m",
    value: () => getFeatureProp("Žiočių X koordinatė (LKS-94), m"),
  },
  {
    key: "Žiočių Y koordinatė (LKS-94), m",
    value: () => getFeatureProp("Žiočių Y koordinatė (LKS-94), m"),
  },
  {
    key: "Vandens paviršiaus be salų plotas, ha",
    value: () => getFeatureProp("Vandens paviršiaus be salų plotas, ha"),
  },
  {
    key: "Kranto linijos ilgis, km",
    value: () => getFeatureProp("Kranto linijos ilgis, km"),
  },
  {
    key: "Statusas",
    value: () => {
      if (!hasCadastralId.value) return "";
      else if (!alisWaterBody.value?.id) return "-";
      return `${
        alisWaterBody.value?.isnuomotas ? "Išnuomotas" : "Neišnuomotas"
      } telkinys`;
    },
  },
  {
    key: "Limituota žvejyba?",
    value: () => {
      if (!hasCadastralId.value) return "";
      else if (!alisWaterBody?.value?.id) return "-";
      return alisWaterBody.value?.licencija ? "Taip" : "Ne";
    },
  },
  {
    key: "Google žemėlapis",
    link: "Nuoroda į Google žemėlapį",
    value: () => {
      const y =
        getFeatureProp("Centro X koordinatė (LKS-94), m") ||
        getFeatureProp("Žiočių X koordinatė (LKS-94), m");
      const x =
        getFeatureProp("Centro Y koordinatė (LKS-94), m") ||
        getFeatureProp("Žiočių Y koordinatė (LKS-94), m");

      if (!x || !y) return "";
      const [newY, newX] = convertCoordinates([x, y], projection, projection4326);
      return `https://www.google.com/maps/place/${newX},${newY}`;
    },
  },
];

function tableContent(
  activeTab: string
): Array<{
  group?: string;
  items?: any[];
}> {
  if (activeTab === "info") {
    return [{ items: basicInfo.filter((i) => !!i.value()) }];
  } else if (activeTab === "fishstocking") {
    const noInfo = [{ group: "Nėra informacijos" }];
    if (!zuvinimasInfo.value?.byYear) return noInfo;

    const data = getFishStockingInfoByYear(zuvinimasInfo.value?.byYear);

    if (!data?.length) return noInfo;

    return data;
  }

  return [];
}
</script>
