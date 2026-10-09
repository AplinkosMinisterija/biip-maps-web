<template>
  <!-- The "Žemėlapis | Lentelė" switch: large, dark active state, always in the same place at
       the right end of the filter bar, so the table is easy to find. -->
  <div
    role="group"
    aria-label="Rodinys"
    class="flex shrink-0 gap-1 rounded-lg border border-gray-300 bg-white p-1 shadow-sm"
  >
    <button
      type="button"
      :class="[button, !tableOpen ? activeClass : idleClass]"
      :aria-pressed="!tableOpen"
      @click="set(false)"
    >
      <UiIcon name="map" :size="18" aria-hidden="true" class="hidden lg:block" />
      {{ S.viewMap }}
    </button>
    <button
      ref="tableButton"
      type="button"
      :class="[button, tableOpen ? activeClass : idleClass]"
      :aria-pressed="tableOpen"
      :aria-controls="controls || undefined"
      :disabled="disabled"
      @click="set(true)"
    >
      <UiIcon name="document" :size="18" aria-hidden="true" class="hidden lg:block" />
      {{ S.viewTable }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';

// Controlled: the snapshot topics bind it to `sel.table`, the Vilkai host to the wolves
// `tableOpen`.
const props = defineProps({
  tableOpen: { type: Boolean, required: true },
  controls: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:tableOpen']);

const button = `px-3 lg:px-4 min-h-[36px] rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;
const activeClass = 'bg-gray-900 text-white';
const idleClass = 'text-gray-900 hover:bg-gray-100';

const set = (open: boolean) => {
  if (open !== props.tableOpen) emit('update:tableOpen', open);
};

// Closing the table elsewhere (its ✕ or Esc) removes the focused element: give focus back
// to this switch so keyboard users are not dropped on <body>.
const tableButton = ref<HTMLButtonElement | null>(null);
watch(
  () => props.tableOpen,
  (open, wasOpen) => {
    if (open || !wasOpen) return;
    nextTick(() => {
      const active = document.activeElement;
      if (!active || active === document.body) tableButton.value?.focus();
    });
  },
);
</script>
