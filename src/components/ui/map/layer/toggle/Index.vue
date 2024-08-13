<template>
  <div class="flex flex-col gap-3">
    <span class="text-sm font-semibold">Sluoksniai</span>
    <div :key="stateCount">
      <div v-for="l in layers" :key="l.id">
        <UiMapLayerToggleItem :layer="l" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayersToggle } from "@/composables/useLayersToggle";
const layersToggle = useLayersToggle();

const props = defineProps({
  layers: {
    type: Array,
    default: () => [],
  },
});

const stateCount = ref(0);

const emit = defineEmits(["change"]);

layersToggle.on("change", (...args: any[]) => {
  stateCount.value++;
  emit("change", ...args);
});

const layers = computed(() =>
  (props.layers as any[]).map((layer) => ({
    ...layer,
    sublayers: layersToggle.mapSublayers(layer),
  }))
);
</script>
