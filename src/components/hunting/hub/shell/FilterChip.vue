<template>
  <!-- The trigger of every filter in the bar and the phone header (controls.ts §1):
       "Name: value", the name regular and muted, the value semibold, one 16 px chevron. -->
  <button
    ref="el"
    type="button"
    :disabled="disabled"
    :aria-label="srLabel || undefined"
    :class="[
      CHIP,
      // Phones: 12 px padding, so season, place and Filtrai share one 358 px row.
      touch ? `${CHIP_TOUCH} !px-3` : '',
      active ? CHIP_ACTIVE : open ? CHIP_OPEN : CHIP_IDLE,
      'max-w-full disabled:cursor-default disabled:border-line disabled:text-ink-muted disabled:hover:bg-white',
    ]"
  >
    <span class="min-w-0 truncate">
      <span v-if="name" :class="[CHIP_NAME, nameClass]">{{ name }}: </span>
      <span :class="CHIP_VALUE">{{ value }}</span>
    </span>
    <span
      v-if="badge"
      aria-hidden="true"
      class="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-brand px-1 text-xs font-bold text-white"
    >
      {{ badge }}
    </span>
    <UiIcon
      v-if="!disabled && chevron"
      name="chevron-down"
      :size="16"
      aria-hidden="true"
      :class="[CHIP_CHEVRON, open ? 'rotate-180' : '']"
    />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CHIP,
  CHIP_ACTIVE,
  CHIP_CHEVRON,
  CHIP_IDLE,
  CHIP_NAME,
  CHIP_OPEN,
  CHIP_TOUCH,
  CHIP_VALUE,
} from './controls';

defineProps({
  // "Vieta"; empty on phones, where the chip shows the value alone (the name stays in srLabel).
  name: { type: String, default: '' },
  value: { type: String, required: true },
  // A value other than the default is set.
  active: { type: Boolean, default: false },
  // Its popover or sheet is open (rotates the chevron).
  open: { type: Boolean, default: false },
  // Phones: 44 px.
  touch: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  chevron: { type: Boolean, default: true },
  // Teal count after the text ("Filtrai 2").
  badge: { type: [Number, String], default: 0 },
  // Extra classes of the name (tablets hide it: 'sr-only lg:not-sr-only').
  nameClass: { type: String, default: '' },
  srLabel: { type: String, default: '' },
});

const el = ref<HTMLButtonElement | null>(null);
defineExpose({ focus: () => el.value?.focus(), el });
</script>
