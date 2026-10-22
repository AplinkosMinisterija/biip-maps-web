<template>
  <!-- Loading: a chip at the top centre of the free map area (DATAVIZ-22). -->
  <div
    v-if="loading"
    class="pointer-events-none absolute z-20 flex justify-center"
    :style="{ ...areaStyle, bottom: 'auto', paddingTop: '12px' }"
  >
    <p
      class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow-[0_2px_8px_rgba(18,25,38,0.12)]"
    >
      {{ S.loading }}
    </p>
  </div>
  <div
    v-else-if="failed || message"
    class="pointer-events-none absolute z-20 flex items-center justify-center"
    :style="areaStyle"
  >
    <!-- The load error where the data would be; the panel has the same alert and retry. -->
    <div
      v-if="failed"
      aria-hidden="true"
      class="pointer-events-auto mx-4 flex max-w-[360px] flex-col gap-3 rounded-lg border border-[#B42318] bg-[#FEF3F2] p-4 text-sm font-semibold text-[#7A271A] shadow-[0_2px_8px_rgba(18,25,38,0.08)]"
    >
      <p>{{ S.loadError }}</p>
    </div>
    <div
      v-else-if="message"
      role="status"
      class="pointer-events-auto mx-4 flex max-w-[360px] flex-col gap-3 p-4 text-sm text-ink"
      :class="FLOAT_CARD"
    >
      <p>{{ message.text }}</p>
      <button
        v-if="message.action"
        type="button"
        class="self-start"
        :class="[BTN_SECONDARY, ctx.isMobile.value ? 'h-11' : '']"
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
import { S } from '@/utils/hunting/hub/strings';
import { BTN_SECONDARY, FLOAT_CARD } from '../shell/controls';

// Map message (SPEC2 §8.5): when the topic view has no choropleth (species without classes,
// current season), the map keeps the outlines and this card is centred over the free map area.
// It also shows the snapshot's loading chip and load error over the map (DATAVIZ-22).
const ctx = inject(HUB_CTX)!;

const snapshotTopic = computed(() => ctx.topic.value.kind === 'snapshot');
const loading = computed(
  () =>
    snapshotTopic.value && (ctx.data.phase.value === 'loading' || ctx.data.phase.value === 'slow'),
);
const failed = computed(() => snapshotTopic.value && ctx.data.phase.value === 'error');

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
