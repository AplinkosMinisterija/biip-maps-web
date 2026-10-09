import type { InjectionKey, Ref } from 'vue';
import type { HubContext } from '@/composables/hunting/hub/context';

// Shell services for topic hosts that render their own controls (the Vilkai tab mounts the
// wolves components, whose state lives in WOLVES_CTX, not in the hub). They place those
// controls into the shell through <Teleport defer :to="`#${HUB_SLOTS.filters}`"> and may
// override "Dalintis" with their own link builder.
export const HUB_SLOTS = {
  // Desktop/tablet filter bar, left part (after the hub's own chips, which the shell hides
  // for live topics).
  filters: 'hub-slot-filters',
  // Desktop/tablet filter bar, right end (the "Žemėlapis | Lentelė" switch).
  filtersEnd: 'hub-slot-filters-end',
  // Mobile header, chip row.
  mobileChips: 'hub-slot-mobile-chips',
} as const;

export interface HubShell {
  // When set, "Dalintis" copies this URL instead of HubContext.shareUrl().
  shareOverride: Ref<(() => string) | null>;
  // Width of the window in px (kept by the route), for layout decisions in topic hosts.
  width: Ref<number>;
  // Focus the panel H1 (used after a topic switch).
  focusHeading(): void;
}

export const HUB_SHELL: InjectionKey<HubShell> = Symbol('huntingHubShell');

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';

export const FOCUSABLE =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

// Wrap Tab / Shift+Tab inside `root` (modal dialogs and sheets, §10).
export function trapTab(event: KeyboardEvent, root: HTMLElement | null) {
  if (event.key !== 'Tab' || !root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
  if (!items.length) {
    event.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;
  // A heading focused with tabindex=-1 is not in `items`: Shift+Tab from it wraps too.
  const before =
    !!active &&
    items.indexOf(active) < 0 &&
    root.contains(active) &&
    !!(active.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (event.shiftKey && (active === first || before || !root.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !root.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

// Diacritic-insensitive search key: "kedainiu" finds "Kėdainių r. sav." (§4.3).
export const foldLt = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const seasonParam = (s: number) => `${s}-${s + 1}`;

export function parseSeasonParam(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{4})$/.exec(value);
  if (!m) return null;
  const s = Number(m[1]);
  return Number(m[2]) === s + 1 ? s : null;
}

// Open the table on the topic's default tab (or the first one the view offers), or close it.
export function setTableOpen(ctx: HubContext, open: boolean) {
  if (!open) return ctx.setTable(null);
  const tables = ctx.view.value?.tables || [];
  const first = tables.find((t) => t.id === ctx.topic.value.defaultTable) || tables[0];
  ctx.setTable(first?.id || ctx.topic.value.defaultTable);
}

// Components are registered as async components, so content rendered by a child component
// may appear a few frames after nextTick(): retry until the element exists (up to 1 s).
export function focusWhenReady(find: () => HTMLElement | null | undefined, timeoutMs = 1000) {
  const started = performance.now();
  const attempt = () => {
    const el = find();
    if (el) return el.focus();
    if (performance.now() - started < timeoutMs) requestAnimationFrame(attempt);
  };
  attempt();
}
