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
  // Optional explicit ordering for legend items by title. Items present
  // in the array sort by their index here; anything QGIS emits that the
  // caller didn't anticipate falls to the end in QGIS-native order.
  // Used by the extract-PDF route to lock the print legend into the
  // stakeholder-approved 4-4-3 column layout regardless of what the
  // uetk_print project happens to emit.
  legendOrder: {
    type: Array as () => string[],
    default: () => [],
  },
});

const mapLayers: any = inject('mapLayers');

const legendData = ref([] as any);

// Screenshot legend renders multi-column. Without an explicit order
// (legendOrder prop empty), push grouped items first so they fill the
// leftmost columns and singles pack into a tidy trailing block.
const sortGroupedFirst = (arr: any[]) =>
  [...arr].sort((a, b) => (b?.children?.length ? 1 : 0) - (a?.children?.length ? 1 : 0));

const sortByExplicitOrder = (arr: any[], order: string[]) => {
  const rank = new Map(order.map((title, i) => [title, i]));
  const fallback = order.length;
  return [...arr].sort((a, b) => {
    const ai = rank.has(a?.title) ? (rank.get(a.title) as number) : fallback;
    const bi = rank.has(b?.title) ? (rank.get(b.title) as number) : fallback;
    return ai - bi;
  });
};

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
  });
  if (result && typeof result.then === 'function') {
    result
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : [];
        if (!props.inline) {
          legendData.value = arr;
        } else if (props.legendOrder.length) {
          legendData.value = sortByExplicitOrder(arr, props.legendOrder);
        } else {
          legendData.value = sortGroupedFirst(arr);
        }
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
