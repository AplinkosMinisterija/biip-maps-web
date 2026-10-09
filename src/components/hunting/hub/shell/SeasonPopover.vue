<template>
  <div ref="root" class="relative shrink-0">
    <button
      ref="trigger"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :disabled="disabled || !options.length"
      class="flex h-9 items-center gap-1 whitespace-nowrap rounded-full border border-gray-500 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-default disabled:border-gray-300 disabled:text-gray-700 disabled:hover:bg-white"
      :class="focusRing"
      @click="toggle"
    >
      <!-- The "Sezonas" prefix is dropped on tablets to keep the filter bar on one line. -->
      <span class="sr-only lg:not-sr-only">{{ S.seasonChip('').trim() }}</span>
      {{ seasonLabel(season) }}
      <UiIcon v-if="!disabled" name="chevron-down" :size="14" aria-hidden="true" />
    </button>

    <div
      v-if="isOpen"
      ref="panel"
      role="dialog"
      :aria-label="S.season"
      class="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      @keydown="onKeydown"
      @pointerdown="byPointer = true"
    >
      <HuntingHubShellSeasonOptions
        name="hub-season-popover"
        :options="options"
        :model-value="season"
        @update:model-value="pick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { seasonLabel } from '@/utils/hunting/dates';
import { focusRing, focusWhenReady, trapTab } from './shell';
import { useSeasonOptions } from './useSeasonOptions';

// Desktop season chip with a radio list in a popover (§4.1). Apžvalga shows it disabled with
// the current season (§4.4).
defineProps({
  disabled: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const season = computed(() => ctx.sel.value.season);
const options = useSeasonOptions(ctx);

const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const onOutside = (event: PointerEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) close(false);
};

async function open() {
  isOpen.value = true;
  document.addEventListener('pointerdown', onOutside, true);
  await nextTick();
  focusWhenReady(() => panel.value?.querySelector<HTMLInputElement>('input:checked, input'));
}

function close(returnFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.removeEventListener('pointerdown', onOutside, true);
  if (returnFocus) nextTick(() => trigger.value?.focus());
}

const toggle = () => (isOpen.value ? close() : open());

// Arrow keys move through the radios and apply at once; the popover closes on a pointer
// pick, Enter or Esc.
const byPointer = ref(false);
function pick(s: number) {
  ctx.setSeason(s);
  if (byPointer.value) close();
  byPointer.value = false;
}

function onKeydown(event: KeyboardEvent) {
  byPointer.value = false;
  if (event.key === 'Escape' || event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    close();
    return;
  }
  trapTab(event, panel.value);
}

onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true));
</script>
