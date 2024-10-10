<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-coordinates="true"
      :constrain-resolution="false"
    />
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import {
  vectorPositron,
  vectorBright,
  geoportalOrto,
  projection3857,
  huntingService,
  huntingFootprintTracksServiceVT,
  objectPropsToCamel,
} from "@/utils";

const mapLayers: any = inject("mapLayers");
const postMessage: any = inject("postMessage");

await mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(geoportalOrto.id)
  .add(huntingFootprintTracksServiceVT.id)
  .click(
    async ({ features }: any) => {
      const properties = features?.map((i: any) => {
        const props = objectPropsToCamel(i.getProperties());
        delete props.geometry;
        delete props.layer;
        return props;
      });

      postMessage("click", properties);
    },
    { layers: [huntingFootprintTracksServiceVT.id] }
  )
  .zoom(huntingService.id, { addStroke: true });
</script>
