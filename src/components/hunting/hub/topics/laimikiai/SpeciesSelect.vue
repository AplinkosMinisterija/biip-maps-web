<template>
  <!-- Filter bar: chip "Rūšis: visos" with a searchable, grouped list (as Vieta); the phone
       Filtrai sheet: the same search and list in the flow, 48 px rows. -->
  <HuntingHubShellComboPopover
    :class="large ? '' : 'max-w-[22rem]'"
    :mode="large ? 'inline' : 'popover'"
    :name="speciesDim.label"
    :items="options"
    :model-value="value"
    :default-value="ALL_SPECIES"
    :value-text="valueText"
    :placeholder="S.speciesSearch"
    @update:model-value="onChange"
  />
</template>

<script setup lang="ts">
// Laimikiai "Rūšis" filter (SPEC2 §6.3): Visos + the species present in the selected season,
// grouped (Kanopiniai, Plėšrūnai, Kiti žinduoliai, Paukščiai), each group by national bag.
import { computed, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { chipValue, S } from '@/utils/hunting/hub/strings';
import { ALL_SPECIES, speciesDim } from '@/utils/hunting/hub/topics/laimikiai';

defineProps({
  large: { type: Boolean, default: false }, // the phone Filtrai sheet
  stacked: { type: Boolean, default: false }, // kept for FilterChips (the sheet stacks anyway)
});

const ctx = inject(HUB_CTX)!;

const options = computed(() => {
  const snapshot = ctx.data.snapshot.value;
  return snapshot ? speciesDim.options(snapshot, ctx.sel.value) : [];
});

const value = computed(() => ctx.sel.value.dims[speciesDim.key] || ALL_SPECIES);
// "Rūšis: visos", "Rūšis: briedis".
const valueText = computed(() => {
  if (value.value === ALL_SPECIES) return S.speciesAll;
  const label = options.value.find((o) => o.value === value.value)?.label;
  return label ? chipValue(label) : value.value;
});

function onChange(selected: string | number) {
  ctx.setDim(speciesDim.key, selected === ALL_SPECIES ? null : String(selected));
}
</script>
