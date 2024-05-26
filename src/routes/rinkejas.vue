<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-coordinates="true"
      :add-coordinates-to-url="true"
    >
      <template #filters>
        <UiButtonIcon icon="measure" @click="mapLayers.toggleMeasuring()" />
      </template>
    </UiMap>

    <FeaturesPopupClickMulti
      :layers="[rinkejasRibosVT.id]"
      :filter="(features) => features.filter((f) => f.layer === 'bustines')"
    >
      <template #content="{ current }">
        <div class="mr-8">{{ current?.pav }} apylinkė Nr. {{ current?.id }}</div>
      </template>
    </FeaturesPopupClickMulti>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { rinkejasRibosVT, projection3857, vectorBright, vectorPositron } from "@/utils";

const mapLayers: any = inject("mapLayers");

mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .add(rinkejasRibosVT.id);
</script>
