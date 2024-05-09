<template>
  <div class="flex justify-between items-center mb-2">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton v-if="!props.filters?.isEmpty" type="link" @click="clearFilters">
      Valyti
    </UiButton>
  </div>
  <div>
    <UiLoader v-if="appsLoading" type="table" />
    <div v-else>
      <div class="text-xs font-semibold mb-2">Sritis</div>
      <UiButtonRow>
        <UiButton
          v-for="app in apps"
          :key="app.id"
          size="sm"
          :active="smalsuolisFilters?.has('app_id', app.id)"
          @click="smalsuolisFilters?.set('app_id', app.id)"
        >
          {{ app.name }}
        </UiButton>
      </UiButtonRow>
      <div class="text-xs font-semibold mb-2">Data</div>
      <UiButtonRow>
        <UiButton size="sm" @click="applyDateFilter('day')">Šios dienos</UiButton>
        <UiButton size="sm" @click="applyDateFilter('week')">Šios savaitės</UiButton>
        <UiButton size="sm" @click="applyDateFilter('month')">Šio mėnesio</UiButton>
        <UiButton size="sm" @click="applyDateFilter('next')">Būsimi</UiButton>
      </UiButtonRow>
    </div>
  </div>
</template>

<script setup lang="ts">
import moment from "moment";
import { useFetch } from "@vueuse/core";
import { computed } from "vue";
import { getAllAppsUrl } from "@/utils/requests/smalsuolis";

const props = defineProps({
  filters: {
    type: Object,
    default: null,
  },
});
const smalsuolisFilters = computed(() => props.filters);

const clearFilters = () => {
  smalsuolisFilters.value?.clear();
};

const { data: apps, isFetching: appsLoading } = useFetch<any>(getAllAppsUrl()).json();

function applyDateFilter(
  type: "day" | "week" | "month" | "next" | "custom",
  start?: any,
  end?: any
) {
  start = moment(start);
  end = moment(end);

  const query: any = {};
  if (type === "next") {
    query.$gte = start.startOf("day").format();
  } else if (type === "custom") {
    // TODO!
  } else {
    query.$gte = start.startOf(type).format();
    query.$lt = end.endOf(type).format();
  }

  smalsuolisFilters.value?.set("startAt", query);
}
</script>
