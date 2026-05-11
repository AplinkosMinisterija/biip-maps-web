<template>
  <div class="text-xs">
    <p class="text-sm font-semibold mb-3">{{ title }}</p>
    <UiMapLegendItems v-if="legendData.length" :items="legendData" />
    <UiIcon v-else name="spinner" />
  </div>
</template>

<script lang="ts" setup>
import { inject, onUnmounted, ref } from 'vue';

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
  visibleOnly: {
    type: Boolean,
    default: false,
  },
});

const mapLayers: any = inject('mapLayers');

const legendData = ref([] as any);

const setReadyFlag = (value: 'true' | 'false') => {
  if (typeof document === 'undefined') return;
  document.body.dataset.legendReady = value;
};

if (props.layer) {
  setReadyFlag('false');
  const result = mapLayers.getLegendData(props.layer, {
    visibleOnly: props.visibleOnly,
  });
  if (result && typeof result.then === 'function') {
    result
      .then((data: any) => {
        legendData.value = data || [];
      })
      .finally(() => setReadyFlag('true'));
  } else {
    setReadyFlag('true');
  }
}

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    delete document.body.dataset.legendReady;
  }
});
</script>
