<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${uid}-title`"
      class="fixed inset-0 z-[1000] flex flex-col bg-white"
      @keydown="onKeydown"
    >
      <div
        class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4"
      >
        <h2
          :id="`${uid}-title`"
          ref="titleEl"
          tabindex="-1"
          class="text-lg font-semibold text-gray-900 focus:outline-none"
        >
          {{ title }}
        </h2>
        <button
          type="button"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-base font-medium text-gray-900 hover:bg-gray-100"
          :class="focusRing"
          @click="$emit('close')"
        >
          <span aria-hidden="true">✕</span> {{ S.close }}
        </button>
      </div>
      <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import { focusRing, focusWhenReady, trapTab } from './shell';

// Full-screen modal sheet for phones (season, place): focus moves in, Tab is trapped, Esc
// closes; the caller returns focus to its trigger (§10).
const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  // Selector inside the sheet that gets focus on open (default: the title).
  initialFocus: { type: String, default: '' },
});
const emit = defineEmits(['close']);

const uid = `hub-sheet-${getCurrentInstance()?.uid ?? 0}`;
const dialog = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
let previousOverflow = '';

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      await nextTick();
      if (!props.initialFocus) titleEl.value?.focus();
      else focusWhenReady(() => dialog.value?.querySelector<HTMLElement>(props.initialFocus));
    } else {
      document.body.style.overflow = previousOverflow;
    }
  },
);

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    emit('close');
    return;
  }
  trapTab(event, dialog.value);
}

onBeforeUnmount(() => {
  if (props.open) document.body.style.overflow = previousOverflow;
});
</script>
