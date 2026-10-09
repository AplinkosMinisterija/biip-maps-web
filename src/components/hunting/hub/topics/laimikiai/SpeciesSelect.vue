<template>
  <!-- Native select with option groups: keyboard and screen-reader friendly, ≥ 44 px on mobile. -->
  <div
    class="flex min-w-0 items-center gap-2"
    :class="stacked ? 'flex-col items-stretch gap-1' : ''"
  >
    <label :for="id" class="text-sm font-semibold text-gray-900">{{ speciesDim.label }}</label>
    <select
      :id="id"
      :value="value"
      class="block min-w-0 rounded-md border border-gray-400 bg-white px-2 text-sm text-gray-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      :class="large ? 'h-12 w-full' : 'h-9'"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in ungrouped" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
      <optgroup v-for="group in groups" :key="group.label" :label="group.label">
        <option v-for="option in group.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </optgroup>
    </select>
  </div>
</template>

<script setup lang="ts">
// Laimikiai "Rūšis" filter (SPEC2 §6.3): Visos + the species present in the selected season,
// grouped (Kanopiniai, Plėšrūnai, Kiti žinduoliai, Paukščiai), each group by national bag.
import { computed, getCurrentInstance, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { ALL_SPECIES, speciesDim } from '@/utils/hunting/hub/topics/laimikiai';

defineProps({
  large: { type: Boolean, default: false }, // mobile: 48 px control
  stacked: { type: Boolean, default: false }, // label above the control
});

const ctx = inject(HUB_CTX)!;
const id = `hub-rusis-${getCurrentInstance()?.uid ?? 0}`;

const options = computed(() => {
  const snapshot = ctx.data.snapshot.value;
  return snapshot ? speciesDim.options(snapshot, ctx.sel.value) : [];
});
const ungrouped = computed(() => options.value.filter((o) => !o.group));
const groups = computed(() => {
  const list: { label: string; options: { value: string; label: string }[] }[] = [];
  options.value.forEach((o) => {
    if (!o.group) return;
    let group = list.find((g) => g.label === o.group);
    if (!group) {
      group = { label: o.group, options: [] };
      list.push(group);
    }
    group.options.push(o);
  });
  return list;
});

const value = computed(() => ctx.sel.value.dims[speciesDim.key] || ALL_SPECIES);

function onChange(selected: string) {
  ctx.setDim(speciesDim.key, selected === ALL_SPECIES ? null : selected);
}
</script>
