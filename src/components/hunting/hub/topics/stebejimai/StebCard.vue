<template>
  <section
    v-if="record"
    ref="cardEl"
    role="region"
    :aria-labelledby="titleId"
    class="bg-white text-sm text-ink"
    :class="sheet ? 'p-1' : 'w-[360px] max-w-full rounded-lg p-4 shadow-lg'"
  >
    <div class="flex items-start justify-between gap-2">
      <h2
        :id="titleId"
        ref="titleEl"
        tabindex="-1"
        class="flex items-center gap-2 rounded text-base font-semibold leading-6 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span
          class="inline-block h-3 w-3 shrink-0 rounded-full border border-white ring-1 ring-line-strong"
          :style="{ background: speciesColor(record.speciesSlug) }"
          aria-hidden="true"
        />
        {{ record.species || NOT_SET_LABEL }}
      </h2>
      <button
        type="button"
        class="min-h-[24px] min-w-[24px] shrink-0 rounded px-2 text-ink-muted hover:bg-brand-50 max-md:min-h-[44px] max-md:min-w-[44px]"
        :class="focusRing"
        @click="close"
      >
        <span aria-hidden="true">✕</span> {{ SS.close }}
      </button>
    </div>

    <div v-if="count > 1" class="mt-2 flex items-center gap-2">
      <span class="tabular-nums text-ink-muted" aria-live="polite">
        {{ SS.cardPager(index + 1, count) }}
      </span>
      <div class="ml-auto flex gap-1">
        <button
          type="button"
          :class="pagerClass"
          :aria-label="SS.previousRecord"
          :disabled="index === 0"
          @click="go(-1)"
        >
          ‹ {{ SS.previous }}
        </button>
        <button
          type="button"
          :class="pagerClass"
          :aria-label="SS.nextRecord"
          :disabled="index >= count - 1"
          @click="go(1)"
        >
          {{ SS.next }} ›
        </button>
      </div>
    </div>

    <dl class="mt-3 grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-x-3 gap-y-1">
      <dt class="text-ink-muted">{{ SS.cardDateTime }}:</dt>
      <dd class="whitespace-nowrap tabular-nums">{{ dateTimeText(record) }}</dd>
      <dt class="text-ink-muted">{{ SS.cardCount }}:</dt>
      <dd class="tabular-nums">{{ countText(record) }}</dd>
      <dt class="text-ink-muted">{{ SS.cardFact }}:</dt>
      <dd>{{ factText(record) }}</dd>
      <dt class="text-ink-muted">{{ SS.cardMunicipality }}:</dt>
      <dd>{{ record.municipality || NOT_SET_LABEL }}</dd>
      <dt class="text-ink-muted">{{ SS.cardEldership }}:</dt>
      <dd>{{ record.eldership || NOT_SET_LABEL }}</dd>
      <dt class="text-ink-muted">{{ SS.cardMpv }}:</dt>
      <dd>{{ mpvName(record.huntingArea) || NOT_SET_LABEL }}</dd>
    </dl>

    <p v-if="link" class="mt-3">
      <a
        :href="link"
        :target="ctx.embed ? '_top' : '_blank'"
        :rel="ctx.embed ? undefined : 'noopener'"
        class="inline-flex min-h-[32px] items-center gap-1 rounded font-semibold text-brand underline max-md:min-h-[44px]"
        :class="focusRing"
      >
        {{ SS.cardLink }}
        <span v-if="!ctx.embed" class="sr-only">{{ SS.newWindow }}</span>
      </a>
    </p>
  </section>
</template>

<script setup lang="ts">
// Card of the selected observation(s) (STEB-SPEC §3.4): every public field, the record
// page link, a pager for a cluster. Values are rendered as text only.
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { STEB_MAP_CTX } from '@/composables/hunting/hub/stebejimai/useStebMap';
import { embedFocusAllowed } from '@/utils/hunting/hub/embed';
import {
  countText,
  dateTimeText,
  factText,
  NOT_SET_LABEL,
  type StebRecord,
} from '@/utils/hunting/hub/stebejimai/model';
import { speciesColor } from '@/utils/hunting/hub/stebejimai/layers';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';
import { mpvName } from '@/components/hunting/hub/table/text';

const props = defineProps({
  // Inside the mobile sheet: no own shadow or width.
  sheet: { type: Boolean, default: false },
});

const ctx = inject(STEB_CTX)!;
const mapApi = inject(STEB_MAP_CTX, null);

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const pagerClass = `min-h-[24px] max-md:min-h-[44px] px-2 py-1 rounded border border-line-strong text-ink hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;
const titleId = props.sheet ? 'steb-card-title-sheet' : 'steb-card-title';

const cardEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
let opener: HTMLElement | null = null;

const selection = computed(() => ctx.state.selection.value);
const byKey = computed(() => {
  const map = new Map<string, StebRecord>();
  ctx.derived.filtered.value.forEach((r) => map.set(r.key, r));
  return map;
});
// Only members that pass the current filters are paged through.
const visible = computed(() =>
  (selection.value?.keys || [])
    .map((key, i) => ({ i, record: byKey.value.get(key) }))
    .filter((m): m is { i: number; record: StebRecord } => !!m.record),
);
const count = computed(() => visible.value.length);
const index = computed(() => {
  const at = visible.value.findIndex((m) => m.i === selection.value?.index);
  return at >= 0 ? at : 0;
});
const record = computed(() => visible.value[index.value]?.record || null);
const link = computed(() => (record.value ? ctx.state.linkOf(record.value) : null));

function go(step: number) {
  const sel = selection.value;
  if (!sel) return;
  const next = Math.min(Math.max(index.value + step, 0), count.value - 1);
  const target = visible.value[next];
  if (!target || target.i === sel.index) return;
  ctx.state.selection.value = { ...sel, index: target.i };
  // The pressed button is disabled at either end and drops focus; keep it in the card.
  nextTick(() => {
    const active = document.activeElement as HTMLButtonElement | null;
    if (!active || active === document.body || active.disabled) {
      titleEl.value?.focus({ preventScroll: true });
    }
  });
}

function close() {
  ctx.state.clearSelection();
}

// Focus moves to the heading when the card opens (embedded: only while the frame has
// focus, never scrolling the WP page).
let pendingFocus = false;
function focusTitle() {
  if (!pendingFocus || !titleEl.value) return;
  pendingFocus = false;
  if (embedFocusAllowed(ctx.embed)) titleEl.value.focus({ preventScroll: true });
}

function restoreFocus() {
  const target = opener;
  opener = null;
  if (target && target.isConnected && target !== document.body) {
    target.focus({ preventScroll: true });
  }
  if (!target || document.activeElement !== target) mapApi?.focusMap();
}

watch(
  () => selection.value?.keys.join('|') || '',
  async (key, oldKey) => {
    if (key && key !== oldKey) {
      if (!oldKey) {
        // Who opened the card (a table button); a map click leaves focus on the body.
        const active = document.activeElement as HTMLElement | null;
        opener =
          active && active !== document.body && !cardEl.value?.contains(active) ? active : null;
      }
      pendingFocus = true;
      await nextTick();
      focusTitle();
    } else if (!key && oldKey) {
      const active = document.activeElement;
      if (active && cardEl.value?.contains(active)) restoreFocus();
      else opener = null;
    }
  },
  { flush: 'pre', immediate: true },
);

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !record.value || e.defaultPrevented) return;
  e.preventDefault();
  close();
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  focusTitle();
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  const active = document.activeElement;
  if (active && cardEl.value?.contains(active)) restoreFocus();
});
</script>
