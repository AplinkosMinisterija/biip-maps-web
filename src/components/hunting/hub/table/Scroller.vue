<template>
  <!-- A table wider than its pane scrolls sideways with a cue (D14): a right-edge fade while
       columns are hidden on the right, a left-edge fade (right of a sticky first column) once
       scrolled, and one hint line under the table. -->
  <div class="flex flex-col gap-1" :class="fill ? 'min-h-0' : ''">
    <div class="relative flex max-w-full flex-col" :class="fill ? 'min-h-0' : ''">
      <div
        ref="box"
        class="max-w-full [scrollbar-width:thin]"
        :class="fill ? 'min-h-0 overflow-auto' : 'overflow-x-auto'"
      >
        <div ref="content"><slot /></div>
      </div>
      <div
        v-if="moreLeft"
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 z-30 w-6 bg-gradient-to-r from-white"
        :style="{ left: `${firstWidth}px` }"
      />
      <div
        v-if="moreRight"
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 right-0 z-30 w-8 bg-gradient-to-l from-white"
      />
    </div>
    <p v-if="moreLeft || moreRight" class="text-[13px] leading-[18px] text-ink-muted">
      {{ SCROLL_HINT }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useEventListener, useResizeObserver } from '@vueuse/core';

// The scroller of every hub table (DataTable, StebTable, the wolves tables).
const props = defineProps({
  // Scroll both ways inside a sized flex column (keeps the sticky header in view).
  fill: { type: Boolean, default: false },
  // The table's first column is sticky: the left fade starts at its right edge.
  stickyFirst: { type: Boolean, default: false },
});

const SCROLL_HINT = 'Slinkite lentelę į šoną – daugiau stulpelių →';

const box = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const moreLeft = ref(false);
const moreRight = ref(false);
const firstWidth = ref(0);

function update() {
  const el = box.value;
  if (!el) return;
  const overflow = el.scrollWidth > el.clientWidth + 1;
  moreLeft.value = overflow && el.scrollLeft > 1;
  moreRight.value = overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  const first = props.stickyFirst
    ? el.querySelector<HTMLElement>('thead th:first-child, tbody th:first-child')
    : null;
  firstWidth.value = first ? first.offsetWidth : 0;
}

useEventListener(box, 'scroll', update, { passive: true });
useResizeObserver(box, update);
useResizeObserver(content, update);
</script>
