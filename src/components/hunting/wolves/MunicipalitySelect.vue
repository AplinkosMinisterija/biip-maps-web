<template>
  <!-- Native select: UiDropdown has no focus ring and a low-contrast, unbound label (§12). -->
  <div v-if="index" class="flex flex-col gap-1">
    <label :for="id" class="text-sm font-semibold text-gray-900">Savivaldybė</label>
    <select
      :id="id"
      :value="value"
      class="block w-full rounded-md border border-gray-400 bg-white px-2 text-sm text-gray-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      :class="isMobile ? 'h-12' : 'h-9'"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="">Visa Lietuva</option>
      <option v-for="item in index.list" :key="item.code" :value="`${item.code}`">
        {{ item.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, onMounted, shallowRef } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { loadMunicipalityIndex, type MunicipalityIndex } from '@/utils/hunting/municipalities';

const ctx = inject(WOLVES_CTX)!;
const { state } = ctx;
const mapLayers: any = inject('mapLayers');

const isMobile = computed(() => ctx.isMobile.value);
const id = `wolves-sav-${getCurrentInstance()?.uid ?? 0}`;

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
