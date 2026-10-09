<template>
  <!-- A topic may ship its own control (Laimikiai species, Žala presets); otherwise every
       dimension is a labelled select chip. -->
  <component :is="custom" v-if="custom" :large="large" :stacked="large" />
  <div
    v-else-if="chips.length"
    class="flex min-w-0 items-center gap-2"
    :class="large ? 'flex-col items-stretch' : ''"
  >
    <div
      v-for="chip in chips"
      :key="chip.key"
      class="flex min-w-0 items-center gap-1"
      :class="large ? 'flex-col items-stretch' : ''"
    >
      <label
        :for="`hub-dim-${chip.key}${large ? '-m' : ''}`"
        class="font-semibold text-gray-900"
        :class="large ? 'text-sm' : 'sr-only'"
      >
        {{ chip.label }}
      </label>
      <select
        :id="`hub-dim-${chip.key}${large ? '-m' : ''}`"
        :value="chip.value"
        class="rounded-full border bg-white font-semibold text-gray-900 cursor-pointer"
        :class="[
          focusRing,
          large
            ? 'h-12 rounded-md border-gray-400 px-3 text-base'
            : 'h-9 px-3 text-sm border-gray-500',
          !large && chip.value !== chip.fallback ? 'bg-gray-100' : '',
        ]"
        @change="onChange(chip, ($event.target as HTMLSelectElement).value)"
      >
        <template v-for="group in chip.groups" :key="group.label">
          <optgroup v-if="group.label" :label="group.label">
            <option v-for="o in group.options" :key="o.value" :value="o.value">
              {{ large ? o.label : `${chip.label}: ${o.label}` }}
            </option>
          </optgroup>
          <template v-else>
            <option v-for="o in group.options" :key="o.value" :value="o.value">
              {{ large ? o.label : `${chip.label}: ${o.label}` }}
            </option>
          </template>
        </template>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, inject } from 'vue';
import _ from 'lodash';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { useDimChips, type DimChip } from './useDimChips';
import { focusRing } from './shell';

const props = defineProps({
  large: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const chips = useDimChips(ctx);

const components = getCurrentInstance()?.appContext.components || {};
// Topic controls shipped by the topic task (§8.1), then the generic convention
// HuntingHubTopics<Topic>Filters.
const CUSTOM: Record<string, string[]> = {
  laimikiai: ['HuntingHubTopicsLaimikiaiSpeciesSelect'],
  zala: ['HuntingHubTopicsZalaPresetControl'],
};
const custom = computed(() => {
  const topic = ctx.sel.value.topic;
  const names = [...(CUSTOM[topic] || []), `HuntingHubTopics${_.upperFirst(topic)}Filters`];
  // In the 48 px filter bar the topic controls fit only on wide screens; narrower bars use
  // the generic select chips.
  if (!props.large && !ctx.isWide.value) return null;
  return names.find((name) => name in components) || null;
});

function onChange(chip: DimChip, value: string) {
  ctx.setDim(chip.key, value === chip.fallback ? null : value);
}
</script>
