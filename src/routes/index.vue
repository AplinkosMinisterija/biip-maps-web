<template>
  <div>
    <UiMap :show-scale-line="true" />
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { geoportalTopoGray } from "@/utils";

const mapLayers: any = inject("mapLayers");

mapLayers.addBaseLayer(geoportalTopoGray.id);
</script>
