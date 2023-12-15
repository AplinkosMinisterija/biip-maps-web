<template>
  <div class="text-xs">
    <p class="text-sm font-semibold mb-3">{{ title }}</p>
    <UiMapLegendItems v-if="legendData.length" :items="legendData" />
    <UiIcon v-else name="spinner" />
  </div>
</template>

<script lang="ts" setup>
import { inject, ref } from 'vue';

const props = defineProps({
  layer: {
    type: String,
    default: '',
    required: true,
  },
  title: {
    type: String,
    default: 'Legenda',
    required: false,
  },
});

const mapLayers: any = inject('mapLayers');

const legendData = ref([] as any);

if (props.layer) {
  mapLayers.getLegendData(props.layer)?.then((data: any) => {
    legendData.value = data || [];
  });
}
</script>
