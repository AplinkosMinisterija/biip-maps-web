<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-search="true"
      @search="filtersStore.search = $event"
    >
    </UiMap>

    <FeaturesPopupClickMulti>
      <template #title="{ current }">
        <template v-if="current?.name">
          <div class="text-xxxs text-gray-600">
            {{ moment(current.start_at).format("YYYY-MM-DD") }}
          </div>
          <div>{{ current.name }}</div>
        </template>
      </template>
      <template #content="{ current }">
        <div v-if="current?.body" class="text-xs">{{ current.body }}</div>
      </template>
    </FeaturesPopupClickMulti>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { projection3857, geoportalTopo3857, smalsuolisServiceVT } from "@/utils";
import { useFiltersStore } from "@/stores/filters";
import moment from "moment";
const filtersStore = useFiltersStore();

const mapLayers: any = inject("mapLayers");

mapLayers.addBaseLayer(geoportalTopo3857.id).add(smalsuolisServiceVT.id);
</script>
