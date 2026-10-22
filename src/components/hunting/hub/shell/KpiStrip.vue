<template>
  <div
    v-if="kpis.length"
    class="grid items-start gap-2"
    :class="large && kpis.length >= 3 ? 'grid-cols-2' : COLS[Math.min(kpis.length, 3)]"
  >
    <!-- Phones (large): two columns, the first tile across both, so numbers fit. -->
    <HuntingHubShellKpiTile
      v-for="(kpi, i) in kpis"
      :key="kpi.id"
      :kpi="kpi"
      :large="large"
      :size="size"
      :class="large && kpis.length >= 3 && i === 0 ? 'col-span-2' : ''"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { KpiDef } from '@/utils/hunting/hub/types';

// At most three tiles (§6.3); one row, except on phones (see above). Tiles keep their own
// height (items-start): a short tile is not stretched to the tallest one.
const COLS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'];
const props = defineProps({
  kpis: { type: Array as PropType<KpiDef[]>, default: () => [] },
  large: { type: Boolean, default: false },
});

// The numbers of one row share a size that fits the longest one ("129 485" in a third of
// the panel); text values (> 9 characters) have their own smaller size.
const size = computed<'lg' | 'md' | 'sm'>(() => {
  const longest = Math.max(0, ...props.kpis.map((k) => k.value.length).filter((n) => n <= 9));
  const narrow = props.kpis.length >= 3 && !props.large;
  if (longest <= (narrow ? 5 : 8)) return 'lg';
  return longest <= (narrow ? 7 : 9) ? 'md' : 'sm';
});
</script>
