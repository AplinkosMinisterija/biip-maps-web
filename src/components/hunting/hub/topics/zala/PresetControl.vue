<template>
  <div class="flex min-w-0 flex-col gap-2">
    <!-- Presets: a radio group rendered as a segmented control (SPEC2 §6.5). -->
    <div
      role="radiogroup"
      :aria-label="groupDim.label"
      class="inline-flex min-w-0 flex-wrap gap-1 rounded-md border border-gray-400 bg-white p-0.5"
      @keydown="onKeydown"
    >
      <button
        v-for="(preset, i) in presets"
        :key="preset"
        ref="presetButtons"
        type="button"
        role="radio"
        :aria-checked="activePreset === preset ? 'true' : 'false'"
        :tabindex="activePreset === preset ? 0 : -1"
        class="flex flex-col items-start rounded px-2 py-1 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1"
        :class="[
          large ? 'min-h-[44px]' : 'min-h-[32px]',
          activePreset === preset ? 'bg-gray-900 text-white' : 'text-gray-900 hover:bg-gray-100',
        ]"
        @click="select(preset, i)"
      >
        <span class="font-medium">{{ PRESET_LABELS[preset] }}</span>
        <span
          v-if="PRESET_SUBLABELS[preset]"
          class="text-xs"
          :class="activePreset === preset ? 'text-gray-100' : 'text-gray-700'"
        >
          {{ PRESET_SUBLABELS[preset] }}
        </span>
      </button>
    </div>

    <!-- Single groups of the active preset: toggle chips (pressed = only this group). -->
    <div
      v-if="activePreset !== 'visos'"
      class="flex flex-wrap gap-1"
      role="group"
      :aria-label="`${PRESET_LABELS[activePreset]}: grupė`"
    >
      <button
        v-for="group in PRESETS[activePreset]"
        :key="group"
        type="button"
        :aria-pressed="grupe === group ? 'true' : 'false'"
        class="inline-flex items-center rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1"
        :class="[
          large ? 'min-h-[44px]' : 'min-h-[28px]',
          grupe === group
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-400 bg-white text-gray-900 hover:bg-gray-100',
        ]"
        @click="toggleGroup(group)"
      >
        {{ GROUP_LABELS[group] }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Žala presets (SPEC2 §6.5): Visi · Plėšrūnai · Kanopiniai, stumbrai, bebrai, with chips for
// the single groups of the active preset. Writes `grupe` through the hub state.
import { computed, inject, ref } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { DamageGroup } from '@/utils/hunting/hub/types';
import {
  GROUP_LABELS,
  PRESETS,
  PRESET_LABELS,
  PRESET_SUBLABELS,
  groupDim,
  grupeOf,
  presetOf,
  type Preset,
} from '@/utils/hunting/hub/topics/zala';

defineProps({
  large: { type: Boolean, default: false }, // mobile: 44 px targets
});

const ctx = inject(HUB_CTX)!;
const presets = Object.keys(PRESETS) as Preset[];
const presetButtons = ref<HTMLButtonElement[]>([]);

const grupe = computed(() => grupeOf(ctx.sel.value));
const activePreset = computed(() => presetOf(grupe.value));

function setGrupe(value: string) {
  ctx.setDim(groupDim.key, value === 'visos' ? null : value);
}

function select(preset: Preset, index?: number) {
  if (preset !== activePreset.value || grupe.value !== preset) setGrupe(preset);
  if (index !== undefined) presetButtons.value[index]?.focus();
}

// Pressing the active chip again returns to its preset.
function toggleGroup(group: DamageGroup) {
  setGrupe(grupe.value === group ? activePreset.value : group);
}

// Radio group keyboard: arrows and Home/End move and select.
function onKeydown(event: KeyboardEvent) {
  const i = presets.indexOf(activePreset.value);
  let next = -1;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (i + 1) % presets.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
    next = (i - 1 + presets.length) % presets.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = presets.length - 1;
  if (next < 0) return;
  event.preventDefault();
  select(presets[next], next);
}
</script>
