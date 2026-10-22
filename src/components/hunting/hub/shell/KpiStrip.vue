<template>
  <div v-if="kpis.length">
    <div class="grid items-stretch gap-2" :class="kpis.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
      <!-- Two columns at every width; with three tiles the headline tile spans both, so the
           secondary tiles get a readable measure and share one height (VISUAL-09). -->
      <HuntingHubShellKpiTile
        v-for="(kpi, i) in kpis"
        :key="kpi.id"
        :kpi="kpi"
        :large="large"
        :size="size"
        :tip-open="openTip === kpi.id"
        :tip-id="tipId(kpi.id)"
        :class="kpis.length >= 3 && i === 0 ? 'col-span-2' : ''"
        @toggle-tip="openTip = openTip === kpi.id ? null : kpi.id"
        @close-tip="openTip = null"
      />
    </div>
    <!-- The open ⓘ text, in the flow under the whole row: as wide as the strip, so the panel
         edge can never clip it (a clipped "… perduotas seniūnijai. faktas." read as the
         opposite of the text). Announced when it opens. -->
    <div role="status">
      <p
        v-if="tipKpi"
        :id="tipId(tipKpi.id)"
        class="mt-2 rounded-md bg-band px-3 py-2 text-[13px] leading-[18px] text-ink"
      >
        {{ tipKpi.tooltip }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch, type PropType } from 'vue';
import type { KpiDef } from '@/utils/hunting/hub/types';

// At most three tiles (§6.3): the first across the row, the other two side by side.
const props = defineProps({
  kpis: { type: Array as PropType<KpiDef[]>, default: () => [] },
  large: { type: Boolean, default: false },
});

const uid = `hub-kpi-${getCurrentInstance()?.uid ?? 0}`;
const tipId = (id: string) => `${uid}-tip-${id}`;
// At most one ⓘ text is open; it closes when its tile goes (another place or season).
const openTip = ref<string | null>(null);
const tipKpi = computed(() => props.kpis.find((k) => k.id === openTip.value && k.tooltip) || null);
watch(tipKpi, (kpi) => {
  if (!kpi) openTip.value = null;
});

// The numbers of one row share a size that fits the longest one ("129 485" in half of the
// panel); text values (> 9 characters) have their own smaller size.
const size = computed<'lg' | 'md' | 'sm'>(() => {
  const longest = Math.max(0, ...props.kpis.map((k) => k.value.length).filter((n) => n <= 9));
  if (longest <= 8) return 'lg';
  return longest <= 9 ? 'md' : 'sm';
});
</script>
