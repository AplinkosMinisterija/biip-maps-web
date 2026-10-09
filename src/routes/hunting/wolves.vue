<template>
  <div>
    <UiMap :show-scale-line="true" :projection="projection3857">
      <template #leftTop>
        <div class="bg-white rounded-lg shadow px-4 py-3 text-sm text-gray-900">Ruošiama</div>
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import { projection3857, vectorPositron } from '@/utils';

const mapLayers: any = inject('mapLayers');

mapLayers.addBaseLayer(vectorPositron.id);
</script>
