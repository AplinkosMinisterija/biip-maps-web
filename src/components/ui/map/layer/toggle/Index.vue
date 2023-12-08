<template>
  <div class="flex flex-col gap-3">
    <span class="text-sm font-semibold">Sluoksniai</span>
    <div :key="stateCount">
      <div v-for="l in layers" :key="l.id">
        <UiMapLayerToggleItem :layer="l" :is-visible="isVisible" :set-visible="setVisible" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';

const mapLayers: any = inject('mapLayers');

const props = defineProps({
  layers: {
    type: Array,
    default: () => [],
  },
});

const stateCount = ref(0);

const emit = defineEmits(['change']);

const setVisible = (layer: any, value: boolean = false, sublayerName: string = '') => {
  let sublayer;
  if (sublayerName) {
    sublayer = layer?.sublayers?.find((sublayer: any) => sublayer.value === sublayerName);
  }

  if (typeof sublayer?.setVisible === 'function') {
    sublayer.setVisible(sublayer, value);
    emit('change', layer, value);
    stateCount.value++;
    return;
  }
  if (layer?.layer && !sublayerName) {
    layer.layer.setVisible(value);
    emit('change', layer, value);
    return;
  }

  const currentSublayers = layer.sublayers
    .filter((s: any) => !s.virtual)
    .map((s: any) => s.value)
    .filter((name: string) => {
      if (name === sublayerName) return value;
      return isVisible(layer, name);
    })
    .join(',');

  mapLayers.setSublayers(layer.id, currentSublayers);
  emit('change', layer, value, currentSublayers);
};

const isVisible = (layer: any, sublayerName: string = '') => {
  let sublayer;
  if (sublayerName) {
    sublayer = layer?.sublayers?.find((sublayer: any) => sublayer.value === sublayerName);
  }

  if (typeof sublayer?.isVisible === 'function') {
    return sublayer?.isVisible(sublayer);
  } else if (layer?.layer && !sublayerName) {
    return mapLayers.isVisible(layer.id);
  }

  return mapLayers.getSublayers(layer.id).includes(sublayerName);
};

const sublayerMapFn = (layer: any) => {
  if (!layer.sublayers?.length) return [];

  function mapSublayer(item: any, parent?: any) {
    if (typeof item === 'string') {
      item = {
        name: item,
        value: item,
      };
    }

    if (item.layer) {
      if (!item.id) throw new Error('No layer ID provided');

      const sublayer = mapLayers.get(item.id);
      if (sublayer?.sublayers?.length) {
        item.sublayers = sublayer.sublayers;
      }
    }

    item.parent = parent;

    if (item.sublayers) {
      item.sublayers = item.sublayers.map((l: any) => mapSublayer(l, item));
    }

    return item;
  }

  return layer.sublayers.map((l: any) => mapSublayer(l, layer));
};

const layers = computed(() =>
  (props.layers as any[]).map((layer) => ({
    ...layer,
    sublayers: sublayerMapFn(layer),
  })),
);
</script>
