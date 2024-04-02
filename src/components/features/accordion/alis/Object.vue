<template>
  <UiTabs v-if="tabs.length" :tabs="tabs" :active="tabs[0].type" :hide-on-one="true">
    <template #default="{ activeTab }">
      <UiTable class="text-xs">
        <UiTableRow v-for="item in tableContent(activeTab)" :key="item.key">
          <UiTableCell class="w-1/2">
            {{ item.key }}
          </UiTableCell>
          <UiTableCell class="w-1/2">
            {{ item.value() }}
          </UiTableCell>
        </UiTableRow>
      </UiTable>
    </template>
  </UiTabs>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { getWaterBodyInfo } from "@/utils/requests/alis";

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

const alisWaterBody = ref(await getWaterBodyInfo(cadastralId.value));

const tabs = [
  { type: "info", name: "Bendra info" },
  { type: "fishstocking", name: "Žuvų įveisimas" },
];

getWaterBodyInfo;
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
  { key: "Savivaldybė", value: () => alisWaterBody.value.savivaldybe?.pavadinimas },
  {
    key: "Centro X koordinatė (LKS-94), m",
    value: () => getFeatureProp("Centro X koordinatė (LKS-94), m"),
  },
  {
    key: "Centro Y koordinatė (LKS-94), m",
    value: () => getFeatureProp("Centro Y koordinatė (LKS-94), m"),
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
    value: () =>
      `${alisWaterBody.value?.isnuomotas ? "Išnuomotas" : "Neišnuomotas"} telkinys`,
  },
  {
    key: "Limituota žvejyba?",
    value: () => (alisWaterBody.value?.licencija ? "Taip" : "Ne"),
  },
];

function tableContent(activeTab: string) {
  if (activeTab === "info") {
    return basicInfo.filter((i) => !!i.value());
  }

  return [
    {
      key: "Ruošiama",
      value: () => "Informacija ruošiama",
    },
  ];
}
</script>
