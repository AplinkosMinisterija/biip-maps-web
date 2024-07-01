<template>
  <div
    v-if="isOpen"
    class="absolute right-0 top-0 h-screen overflow-y-scroll p-4 w-full sm:w-96 max-w-screen-sm z-40 shadow-md bg-white"
  >
    <div class="flex items-center justify-between gap-3 w-full mb-3">
      <span class="font-semibold">{{ title }}</span>
      <UiButton type="ghost" icon="close" @click="close" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
const eventBus: any = inject('eventBus');
const mapLayers: any = inject('mapLayers');
const emit = defineEmits(['close']);

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  isOpen: Boolean,
});

const isOpen = ref(props.isOpen || false);
const isOpenPropRef = computed(() => props.isOpen);

watch(isOpenPropRef, (value) => {
  isOpen.value = value;
});
const open = () => {
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
  mapLayers.highlightFeatures([]);
  emit('close');
};

eventBus.on('uiSidebar', ({ open }: any) => {
  isOpen.value = !!open;
});

defineExpose({ close, open });
</script>
