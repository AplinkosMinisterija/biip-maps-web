<template>
  <div
    v-if="index"
    class="rounded border border-gray-300 bg-white px-2 py-1 focus-within:ring-2 focus-within:ring-blue-700 focus-within:ring-offset-2"
    :class="isMobile ? 'min-h-[48px]' : ''"
  >
    <UiDropdown
      :model-value="value"
      label="Savivaldybė"
      aria-label="Savivaldybė"
      @change="onChange"
    >
      <UiDropdownItem value="">Visa Lietuva</UiDropdownItem>
      <UiDropdownItem v-for="item in index.list" :key="item.code" :value="`${item.code}`">
        {{ item.name }}
      </UiDropdownItem>
    </UiDropdown>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, shallowRef } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { loadMunicipalityIndex, type MunicipalityIndex } from '@/utils/hunting/municipalities';

const ctx = inject(WOLVES_CTX)!;
const { state } = ctx;
const mapLayers: any = inject('mapLayers');

const isMobile = computed(() => ctx.isMobile.value);

// Hidden when the boundaries archive cannot be read (§9: no error banner).
const index = shallowRef<MunicipalityIndex | null>(null);
onMounted(async () => {
  try {
    index.value = await loadMunicipalityIndex();
  } catch (err) {
    index.value = null;
  }
});

const value = computed(() => (state.sav.value === null ? '' : `${state.sav.value}`));

function onChange(selected: string) {
  const code = selected ? Number(selected) : null;
  state.sav.value = code;

  const info = code !== null ? index.value?.byCode[code] : null;
  if (!mapLayers) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (info) {
    mapLayers.zoomToExtent(info.extent3857, { animate: !reduceMotion, maxZoom: 12 });
  } else if (code === null) {
    mapLayers.centerMap();
  }
}
</script>
