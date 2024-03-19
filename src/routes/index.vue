<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857" :show-coordinates="true" />
  </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import { municipalitiesServiceVT, projection3857, vectorProtonLight } from '@/utils';

const mapLayers: any = inject('mapLayers');

mapLayers.addBaseLayer(vectorProtonLight.id).add(municipalitiesServiceVT.id);
</script>
