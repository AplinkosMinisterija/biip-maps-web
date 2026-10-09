<template>
  <div class="min-w-0">
    <button
      ref="triggerEl"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-label="`Laikotarpis: ${periodLabel}`"
      class="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-900 bg-white px-4 h-11 text-base font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      @click="open"
    >
      <span class="truncate">{{ periodLabel }}</span>
      <span aria-hidden="true" class="text-sm">▾</span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dialogEl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${uid}-title`"
        class="fixed inset-0 z-[1000] flex flex-col bg-white"
        @keydown="onKeydown"
      >
        <div
          class="flex items-center justify-between gap-2 border-b border-gray-200 px-4 h-14 shrink-0"
        >
          <h2
            :id="`${uid}-title`"
            ref="titleEl"
            tabindex="-1"
            class="text-lg font-semibold text-gray-900 focus:outline-none"
          >
            Laikotarpis
          </h2>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md px-3 min-h-[44px] text-base font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            @click="close"
          >
            <span aria-hidden="true">✕</span> Uždaryti
          </button>
        </div>

        <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <HuntingWolvesPeriodFilter v-model:draft="draft" staged large />
        </div>

        <div
          class="sticky bottom-0 flex shrink-0 gap-3 border-t border-gray-200 bg-white px-4 py-3"
          style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
        >
          <button
            type="button"
            class="min-h-[48px] rounded-md border border-gray-400 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            @click="clear"
          >
            Valyti
          </button>
          <button
            type="button"
            class="flex-1 min-h-[48px] rounded-md bg-gray-900 px-4 text-base font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            @click="applyAndClose"
          >
            {{ applyLabel }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// Mobile period picker (SPEC §7.3): a chip that opens a full-screen modal dialog.
// Changes are staged inside the dialog and applied with the footer button, so
// the map does not redraw under it.
import { computed, getCurrentInstance, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import type { Interval, PresetId, WolfRecord } from '@/utils/hunting/types';

interface Draft {
  interval: Interval;
  preset: PresetId;
}

const ctx = inject(WOLVES_CTX)!;
const uid = `wolves-period-sheet-${getCurrentInstance()?.uid ?? 0}`;

const isOpen = ref(false);
const triggerEl = ref<HTMLButtonElement | null>(null);
const dialogEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
const draft = ref<Draft>({ interval: ctx.state.interval.value, preset: ctx.state.preset.value });

const numberFormat = new Intl.NumberFormat('lt-LT');
const pluralLt = (n: number, forms: [string, string, string]) => {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return forms[0];
  if (a >= 2 && a <= 9 && !(b >= 12 && b <= 19)) return forms[1];
  return forms[2];
};

const periodLabel = computed(() => {
  const { interval, preset } = {
    interval: ctx.state.interval.value,
    preset: ctx.state.preset.value,
  };
  if (preset.startsWith('season:')) {
    const s = Number(preset.slice(7));
    return `${s}/${s + 1} sezonas`;
  }
  if (preset === 'last30') return 'Paskutinės 30 d.';
  if (preset === 'all') return 'Visi sezonai';
  return interval.from === interval.to ? interval.from : `${interval.from} – ${interval.to}`;
});

// The same filter as derived.filtered, but for the staged interval.
function matches(record: WolfRecord, interval: Interval) {
  if (record.day < interval.from || record.day > interval.to) return false;
  const sav = ctx.state.sav.value;
  if (sav != null && record.municipalityCode !== sav) return false;
  const attrs = ctx.state.attrs.value;
  const ok = (list: string[], value: string | null) =>
    !list.length || list.includes(value ?? 'nenurodyta');
  return ok(attrs.age, record.age) && ok(attrs.sex, record.sex) && ok(attrs.method, record.method);
}

const draftCount = computed<number | null>(() => {
  const records = ctx.data.dataset.value?.records;
  if (!records) return null;
  const interval = draft.value.interval;
  let n = 0;
  for (const record of records) if (matches(record, interval)) n++;
  return n;
});

const applyLabel = computed(() => {
  const n = draftCount.value;
  if (n === null) return 'Rodyti';
  return `Rodyti ${numberFormat.format(n)} ${pluralLt(n, ['vilką', 'vilkus', 'vilkų'])}`;
});

let previousOverflow = '';

async function open() {
  draft.value = { interval: ctx.state.interval.value, preset: ctx.state.preset.value };
  isOpen.value = true;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  await nextTick();
  titleEl.value?.focus();
}

async function close() {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.body.style.overflow = previousOverflow;
  await nextTick();
  triggerEl.value?.focus();
}

function applyAndClose() {
  const { interval, preset } = draft.value;
  const applied = ctx.state.interval.value;
  if (
    interval.from !== applied.from ||
    interval.to !== applied.to ||
    preset !== ctx.state.preset.value
  ) {
    ctx.state.setInterval(interval, preset);
  }
  close();
}

function clear() {
  const s = ctx.derived.defaultSeason.value;
  draft.value = { interval: { from: `${s}-04-01`, to: `${s + 1}-03-31` }, preset: `season:${s}` };
}

const FOCUSABLE =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close();
    return;
  }
  if (event.key !== 'Tab' || !dialogEl.value) return;
  // Focus trap: wrap Tab / Shift+Tab inside the dialog.
  const items = Array.from(dialogEl.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === titleEl.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

// Leaving the mobile layout (rotation, resize) closes the dialog.
watch(
  () => ctx.isMobile.value,
  (mobile) => {
    if (!mobile) close();
  },
);

onBeforeUnmount(() => {
  if (isOpen.value) document.body.style.overflow = previousOverflow;
});
</script>
