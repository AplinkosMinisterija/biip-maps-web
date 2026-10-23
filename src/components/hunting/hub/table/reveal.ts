// Scroll a table row into view inside its own scroller (JOURNEYS-07): the nearest ancestor that
// scrolls vertically, below `cover` px of sticky header rows. Never `scrollIntoView`, which
// would also scroll the WP page around the iframe.
export function revealRow(el: HTMLElement | null | undefined, cover = 0) {
  let box = el?.parentElement || null;
  while (box) {
    const overflow = getComputedStyle(box).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && box.scrollHeight > box.clientHeight) {
      break;
    }
    box = box.parentElement;
  }
  if (!el || !box) return;
  const row = el.getBoundingClientRect();
  const view = box.getBoundingClientRect();
  const above = row.top - (view.top + cover);
  const below = row.bottom - view.bottom;
  if (above < 0) box.scrollTop += above;
  else if (below > 0) box.scrollTop += Math.min(below, above);
}
