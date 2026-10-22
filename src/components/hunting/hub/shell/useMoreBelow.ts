import { ref, type Ref } from 'vue';
import { useEventListener, useResizeObserver } from '@vueuse/core';

// A panel as tall as its content (D18) still scrolls once it reaches the bottom of the frame.
// While part of its content is below the fold, `MORE_BELOW_MASK` fades the last 24 px, so the
// cut line reads as "more below" (VISUAL-08). The content wrapper should be `relative
// overflow-hidden`: screen-reader twins (`sr-only` tables) overflow their 1 px box and would
// otherwise make every panel scroll by a few rows of nothing.
export const MORE_BELOW_MASK = '[mask-image:linear-gradient(#000_calc(100%-24px),transparent)]';

export function useMoreBelow(el: Ref<HTMLElement | null>) {
  const more = ref(false);
  const update = () => {
    const box = el.value;
    more.value = !!box && box.scrollTop + box.clientHeight < box.scrollHeight - 1;
  };
  useEventListener(el, 'scroll', update, { passive: true });
  useResizeObserver(el, update);
  // The content grows and shrinks inside a box of the same size (charts, loading states).
  const content = ref<HTMLElement | null>(null);
  useResizeObserver(content, update);
  const track = (node: HTMLElement | null) => {
    content.value = node;
    update();
  };
  return { more, track, update };
}
