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
      <div class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-5">
        <h2
          :id="`${uid}-title`"
          ref="titleEl"
          tabindex="-1"
          class="text-lg font-bold text-ink focus:outline-none"
        >
          {{ title }}
        </h2>
        <button
          type="button"
          class="-mr-3 inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-base font-semibold text-brand hover:bg-brand-50"
          :class="FOCUS_RING"
          @click="$emit('close')"
        >
          <span aria-hidden="true">✕</span> {{ S.close }}
        </button>
      </div>
      <div class="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <slot />
      </div>
      <!-- Actions pinned to the bottom edge, outside the scroller (MOBILE-09): nothing scrolls
           below them, and the border runs edge to edge. -->
      <div
        v-if="$slots.footer"
        class="flex shrink-0 gap-3 border-t border-line bg-white px-5 pt-3"
        style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
      >
        <slot name="footer" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import { focusWhenReady, trapTab } from './shell';
import { FOCUS_RING } from './controls';
import { useModalState } from './sheet';

// Full-screen modal sheet for phones (season, place, filters): focus moves in, Tab is trapped, Esc
// closes; the caller returns focus to its trigger (§10). Embedded, the WP page dims and
// disables its own chrome while it is open (`modal` message, D16). The optional `footer`
// slot holds the sheet's actions, pinned below the scrolling content.
const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  // Selector inside the sheet that gets focus on open (default: the title).
  initialFocus: { type: String, default: '' },
});
const emit = defineEmits(['close']);
useModalState(computed(() => props.open));

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
