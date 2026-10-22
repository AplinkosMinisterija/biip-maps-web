<template>
  <div ref="rootEl" class="relative" :class="shrinkable ? 'min-w-0 max-w-[22rem]' : 'shrink-0'">
    <HuntingHubShellFilterChip
      ref="triggerEl"
      :name="name"
      :value="value"
      :active="active"
      :open="isOpen"
      :name-class="nameClass"
      :sr-label="srLabel"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-controls="isOpen ? panelId : undefined"
      @click="toggle"
    />

    <div
      v-if="isOpen"
      :id="panelId"
      ref="panelEl"
      role="dialog"
      tabindex="-1"
      :aria-label="title || name"
      class="absolute left-0 top-full z-50 mt-2 max-h-[calc(100vh-128px)] overflow-y-auto rounded-lg border border-line bg-white shadow-[0_8px_24px_rgba(18,25,38,0.12)] focus:outline-none"
      :class="[panelClass, padded ? 'p-4' : 'p-2']"
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

const props = defineProps({
  // Chip text "name: value" (HuntingHubShellFilterChip).
  name: { type: String, required: true },
  value: { type: String, required: true },
  // Dialog name when it differs from the chip name.
  title: { type: String, default: '' },
  // A non-default value is set (the teal chip).
  active: { type: Boolean, default: false },
  panelClass: { type: String, default: 'w-[360px]' },
  // 16 px padding for forms; option lists (rows with their own padding) use 8 px.
  padded: { type: Boolean, default: true },
  // The chip may shrink below its text (truncated with "…") when the filter row is short.
  shrinkable: { type: Boolean, default: false },
  // Tablets: 'sr-only lg:not-sr-only' hides the name.
  nameClass: { type: String, default: '' },
  // Accessible name when the visible text is a short form ("Stumbras" for "Rūšis: Stumbras").
  srLabel: { type: String, default: '' },
  // Selector of the element that gets focus on open (default: the first control).
  initialFocus: { type: String, default: '' },
});

const panelId = `hub-vilkai-popover-${getCurrentInstance()?.uid ?? 0}`;
const isOpen = ref(false);
const rootEl = ref<HTMLElement | null>(null);
const triggerEl = ref<{ focus(): void; el: HTMLButtonElement | null } | null>(null);
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
    const first =
      (props.initialFocus && panelEl.value?.querySelector<HTMLElement>(props.initialFocus)) ||
      focusables()[0];
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
