<template>
  <div ref="rootEl" class="relative">
    <button
      ref="triggerEl"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-controls="panelId"
      class="inline-flex items-center gap-1 h-9 max-w-[320px] rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      :class="
        active
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-400 bg-white text-gray-900 hover:bg-gray-100'
      "
      @click="toggle"
    >
      <span class="truncate">{{ label }}</span>
      <span aria-hidden="true" class="text-xs">{{ isOpen ? '▴' : '▾' }}</span>
    </button>

    <div
      v-if="isOpen"
      :id="panelId"
      ref="panelEl"
      role="dialog"
      tabindex="-1"
      :aria-label="title || label"
      class="absolute left-0 top-full mt-2 z-50 focus:outline-none rounded-lg bg-white shadow-lg border border-gray-200 p-4 max-h-[calc(100vh-128px)] overflow-y-auto"
      :class="panelClass"
      @keydown="onKeydown"
    >
      <slot :close="close" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Filter-bar chip with a popover (SPEC2 §6.2, §10): Esc and a click outside close it, Tab
// stays inside while it is open, and focus returns to the chip.
import { getCurrentInstance, nextTick, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';

defineProps({
  label: { type: String, required: true },
  // Dialog name when it differs from the chip text.
  title: { type: String, default: '' },
  // Dark chip: a non-default value is set.
  active: { type: Boolean, default: false },
  panelClass: { type: String, default: 'w-[360px]' },
});

const panelId = `hub-vilkai-popover-${getCurrentInstance()?.uid ?? 0}`;
const isOpen = ref(false);
const rootEl = ref<HTMLElement | null>(null);
const triggerEl = ref<HTMLButtonElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const focusables = () =>
  Array.from(panelEl.value?.querySelectorAll<HTMLElement>(FOCUSABLE) || []).filter(
    (el) => el.offsetParent !== null,
  );

// The content is lazily loaded (global async components): focus the dialog at once and
// move to its first control as soon as that has rendered.
async function open() {
  isOpen.value = true;
  await nextTick();
  panelEl.value?.focus();
  for (let attempt = 0; attempt < 10 && isOpen.value; attempt++) {
    const first = focusables()[0];
    if (first) {
      first.focus();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function close(returnFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (returnFocus) nextTick(() => triggerEl.value?.focus());
}

const toggle = () => (isOpen.value ? close() : open());

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const items = focusables();
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// A click elsewhere closes without stealing focus from what was clicked.
onClickOutside(rootEl, () => close(false));

defineExpose({ open, close });
</script>
