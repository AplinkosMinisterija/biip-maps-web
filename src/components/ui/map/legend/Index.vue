<template>
  <div class="text-xs">
    <p class="text-sm font-semibold mb-3">{{ title }}</p>
    <UiMapLegendItems v-if="legendData.length" :items="legendData" :inline="inline" />
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
  inline: {
    type: Boolean,
    default: false,
  },
  useCurrentScale: {
    type: Boolean,
    default: false,
  },
  // Optional override — fetch GetLegendGraphic from this URL instead of
  // the layer's own WMS source. Used by the extract-PDF screenshot
  // route to pull a print-tuned legend from a separate QGIS project.
  legendUrl: {
    type: String,
    default: '',
  },
  // Optional explicit LAYERS list for GetLegendGraphic. When supplied,
  // bypasses the layer's sublayers[] (which doubles as the sidebar
  // toggle list and the live WMS draw stack) so the print-legend
  // order can be chosen independently of how the map renders.
  legendLayersOrder: {
    type: Array as () => string[],
    default: () => [],
  },
});

const mapLayers: any = inject('mapLayers');

const legendData = ref([] as any);

// Screenshot legend renders multi-column. Push grouped items (those with
// children — Ežerai ir tvenkiniai / Upės ir kanalai) to the front so they
// fill the first columns, and let single-symbol items flow as a tidy
// trailing column instead of getting strewn across the top row.
const sortGroupedFirst = (arr: any[]) =>
  [...arr].sort((a, b) => (b?.children?.length ? 1 : 0) - (a?.children?.length ? 1 : 0));

const setReadyFlag = (value: 'true' | 'false') => {
  if (typeof document === 'undefined') return;
  document.body.dataset.legendReady = value;
};

if (props.layer) {
  setReadyFlag('false');
  const result = mapLayers.getLegendData(props.layer, {
    visibleOnly: props.visibleOnly,
    useCurrentScale: props.useCurrentScale,
    legendUrl: props.legendUrl || undefined,
    legendLayersOrder: props.legendLayersOrder.length ? props.legendLayersOrder : undefined,
  });
  if (result && typeof result.then === 'function') {
    result
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : [];
        legendData.value = props.inline ? sortGroupedFirst(arr) : arr;
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
