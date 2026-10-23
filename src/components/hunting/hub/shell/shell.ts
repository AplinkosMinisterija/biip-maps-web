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

// The hub's focus outline (controls.ts FOCUS_RING), kept under its old name for the
// components that import it from here.
export { FOCUS_RING as focusRing } from './controls';

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

/**
 * Search hits for a folded query (foldLt), best first (JOURNEYS-01): items where a word starts
 * with the query ("ute" → "Utenos r. sav.") before items that contain it inside a word
 * ("Šilutės r. sav."), so Enter on the first option picks what was meant. Otherwise the list
 * order stays; grouped lists keep each group together, the group with the best hit first.
 */
export function rankByQuery<T extends { key: string; group?: string }>(items: T[], q: string): T[] {
  if (!q) return items;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordStart = new RegExp(`(^|[^a-z0-9])${escaped}`);
  const hits = items
    .filter((item) => item.key.includes(q))
    .map((item, index) => ({ item, index, score: wordStart.test(item.key) ? 0 : 1 }));
  // A group's place: its best hit (word-start hits before inner ones, then list order).
  const groupScore = new Map<string, number>();
  hits.forEach(({ item, index, score }) => {
    const g = item.group || '';
    groupScore.set(g, Math.min(groupScore.get(g) ?? Infinity, score * items.length + index));
  });
  const groupOf = (h: (typeof hits)[0]) => groupScore.get(h.item.group || '')!;
  return hits
    .sort((a, b) => groupOf(a) - groupOf(b) || a.score - b.score || a.index - b.index)
    .map((h) => h.item);
}

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
