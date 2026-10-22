<template>
  <div ref="root" class="relative shrink-0">
    <!-- The "Sezonas" name is dropped on tablets to keep the filter bar on one line. -->
    <HuntingHubShellFilterChip
      ref="trigger"
      :name="S.season"
      name-class="sr-only lg:not-sr-only"
      :value="seasonLabel(season)"
      :open="isOpen"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :disabled="disabled || !options.length"
      @click="toggle"
    />

    <div
      v-if="isOpen"
      ref="panel"
      role="dialog"
      :aria-label="S.season"
      :class="[POPOVER, 'w-72']"
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
import { focusWhenReady, trapTab } from './shell';
import { POPOVER } from './controls';
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
const trigger = ref<{ focus(): void } | null>(null);
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
