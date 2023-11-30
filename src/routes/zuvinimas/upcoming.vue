<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857">
      <template #sidebar>
        <UiSidebarFeatures
          :features="selectedFeatures"
          :is-open="!!selectedFeatures?.length"
          :title="selectedFeatures?.[0]?.munipality?.name"
          type="zvejyba"
          @close="selectFeatures"
        />
      </template>
    </UiMap>

    <FeaturesPopupHover @click="selectFeatures">
      <template #title="{ data }">
        {{ data?.location?.name || "" }} ({{ data?.location?.municipality?.name || "" }})
      </template>
      <template #content="{ data }">
        <div class="text-xxs">
          {{ moment(data?.event_time).format("YYYY-MM-DD HH:mm") }}
        </div>
        <template v-if="data?.fishes?.length">
          <div
            v-for="fish in data?.fishes"
            :key="fish.id"
            class="text-xs flex justify-between py-1 text-gray-600"
          >
            <div>{{ fish.fish_type?.label }}</div>
            <div class="font-semibold">{{ fish.fish_type?.count || 0 }} vnt.</div>
          </div>
        </template>
      </template>
    </FeaturesPopupHover>
  </div>
</template>
<script setup lang="ts">
import { inject, ref } from "vue";
import { projection3857, geoportalTopo3857, zuvinimasServiceVT } from "@/utils";
import moment from "moment";

const mapLayers: any = inject("mapLayers");
const events: any = inject("events");

const selectedFeatures = ref([] as any);

function selectFeatures(feature: any) {
  if (!feature?.count) {
    selectedFeatures.value = [];
  } else {
    selectedFeatures.value = [feature];
  }
}

events.on("zoom", (data: any) => {
  mapLayers.zoomToFeatureCollection(data);
});

mapLayers.addBaseLayer(geoportalTopo3857.id).add(zuvinimasServiceVT.id);
</script>
