<template>
  <div
    v-if="message"
    class="pointer-events-none absolute z-20 flex items-center justify-center"
    :style="areaStyle"
  >
    <div
      role="status"
      class="pointer-events-auto bg-white rounded-lg shadow-lg p-4 max-w-[360px] mx-4 text-sm text-gray-900 flex flex-col gap-3"
    >
      <p>{{ message.text }}</p>
      <button
        v-if="message.action"
        type="button"
        class="self-start inline-flex items-center gap-1 min-h-[32px] max-md:min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        @click="apply(message.action.sel)"
      >
        {{ message.action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { HubSelection, MapMessageDef } from '@/utils/hunting/hub/types';

// Map message (SPEC2 §8.5): when the topic view has no choropleth (species without classes,
// current season), the map keeps the outlines and this card is centred over the free map area.
const ctx = inject(HUB_CTX)!;

const message = computed<MapMessageDef | null>(() => {
  const map = ctx.view.value?.map;
  return ctx.topic.value.kind === 'snapshot' && map?.kind === 'message' ? map : null;
});

// Centre over the map area left free by the panels (the same padding OpenLayers uses).
const areaStyle = computed(() => {
  const [top, right, bottom, left] = ctx.layout.mapPadding.value;
  return { top: `${top}px`, right: `${right}px`, bottom: `${bottom}px`, left: `${left}px` };
});

function apply(sel: Partial<HubSelection>) {
  if (sel.topic && sel.topic !== ctx.sel.value.topic) ctx.setTopic(sel.topic);
  if (sel.season !== undefined) ctx.setSeason(sel.season);
  if (sel.sav !== undefined) ctx.setSav(sel.sav);
  if (sel.dims) Object.entries(sel.dims).forEach(([key, value]) => ctx.setDim(key, value));
  if (sel.table !== undefined) ctx.setTable(sel.table);
}
</script>
