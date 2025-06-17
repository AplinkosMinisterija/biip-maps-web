<template>
  <div v-if="visibleWarning" class="absolute top-8 right-8 z-10 ml-8">
    <UiAlert type="warning">Priartinkite žemėlapį, kad pamatytumėte duomenis</UiAlert>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed } from "vue";

const props = defineProps({
  maxZoom: {
    type: Number,
    default: 100,
  },
  minZoom: {
    type: Number,
    default: 0,
  },
});

const mapLayers: any = inject("mapLayers");

const maxZoom = computed(() => props.maxZoom);
const minZoom = computed(() => props.minZoom);

const visibleWarning = ref(false);

mapLayers.on("zoom:change", (data: any) => {
  visibleWarning.value = data.current >= minZoom.value && data.current <= maxZoom.value;
});
</script>
