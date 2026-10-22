<template>
  <!-- Briedžių limitai: what the map colours, a display choice rather than a filter, so a
       segmented control at the right end of the filter bar (map view only); on phones at the
       top of the Filtrai sheet, full width, with a visible label. Hidden while the season
       offers one metric only. -->
  <div
    v-if="options.length > 1 && (large || ctx.sel.value.table === null)"
    :class="large ? 'flex flex-col gap-2' : 'order-last ml-auto shrink-0'"
  >
    <span v-if="large" :id="`${uid}-label`" class="text-base font-semibold text-ink">
      {{ S.metricSwitch }}
    </span>
    <div
      ref="group"
      role="radiogroup"
      :aria-label="large ? undefined : S.metricSwitch"
      :aria-labelledby="large ? `${uid}-label` : undefined"
      :class="[SEG, large ? `${SEG_TOUCH} flex w-full` : '']"
      @keydown="onKeydown"
    >
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        role="radio"
        :aria-checked="o.value === value ? 'true' : 'false'"
        :tabindex="o.value === value ? 0 : -1"
        :class="[SEG_ITEM, o.value === value ? SEG_ITEM_ON : '', large ? 'flex-1 text-base' : '']"
        @click="pick(o.value)"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// "Žemėlapyje rodoma: Panaudota, % | Limitas / 10 000 ha" (CONTROLS-09). Writes `rodiklis`
// through the hub state, as the select it replaces did; the URL values do not change.
import { computed, getCurrentInstance, inject, nextTick, ref } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { SEG, SEG_ITEM, SEG_ITEM_ON, SEG_TOUCH } from '@/components/hunting/hub/shell/controls';
import { S } from '@/utils/hunting/hub/strings';
import { metricDim } from '@/utils/hunting/hub/topics/limitai';

defineProps({
  large: { type: Boolean, default: false }, // the phone Filtrai sheet
  stacked: { type: Boolean, default: false }, // passed by FilterChips; the sheet stacks anyway
});

const ctx = inject(HUB_CTX)!;
const uid = `hub-limitai-metric-${getCurrentInstance()?.uid ?? 0}`;
const group = ref<HTMLElement | null>(null);

const options = computed(() => {
  const snapshot = ctx.data.snapshot.value;
  if (!snapshot) return [];
  try {
    return metricDim.options(snapshot, ctx.sel.value);
  } catch (err) {
    return [];
  }
});
const fallback = computed(() => {
  const meta = ctx.data.snapshot.value?.meta;
  return meta ? metricDim.default(ctx.sel.value, meta) : '';
});
const value = computed(() => ctx.sel.value.dims[metricDim.key] || fallback.value);

function pick(selected: string) {
  if (selected === value.value) return;
  ctx.setDim(metricDim.key, selected === fallback.value ? null : selected);
}

// Radio group keyboard: arrows move and select, focus follows.
function onKeydown(event: KeyboardEvent) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const list = options.value;
  const i = list.findIndex((o) => o.value === value.value);
  const next = list[(i + step + list.length) % list.length];
  pick(next.value);
  nextTick(() => group.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
}
</script>
