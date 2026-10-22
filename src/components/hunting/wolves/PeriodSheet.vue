<template>
  <div class="min-w-0">
    <HuntingHubShellFilterChip
      ref="triggerEl"
      touch
      :value="compact ? shortLabel : periodLabel"
      :open="isOpen"
      :active="!isDefault"
      :sr-label="`Laikotarpis: ${periodLabel}`"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="open"
    />

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
          class="flex items-center justify-between gap-2 border-b border-line px-4 h-14 shrink-0"
        >
          <h2
            :id="`${uid}-title`"
            ref="titleEl"
            tabindex="-1"
            class="text-lg font-semibold text-ink focus:outline-none"
          >
            Laikotarpis
          </h2>
          <button
            type="button"
            :class="[BTN_TEXT, BTN_TEXT_TOUCH, 'px-3 text-base text-ink']"
            @click="close"
          >
            <span aria-hidden="true">✕</span> Uždaryti
          </button>
        </div>

        <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <HuntingWolvesPeriodFilter v-model:draft="draft" staged large />
        </div>

        <div
          class="sticky bottom-0 flex shrink-0 gap-3 border-t border-line bg-white px-4 py-3"
          style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
        >
          <button type="button" :class="[BTN_SECONDARY, BTN_TOUCH, 'text-base']" @click="clear">
            Atstatyti
          </button>
          <button
            type="button"
            :class="[BTN_PRIMARY, BTN_TOUCH, 'flex-1 text-base']"
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
import type { Interval, PresetId } from '@/utils/hunting/types';
import { formatInt, pluralLt, WOLVES_ACC } from '@/utils/hunting/dates';
import { filterRecords } from '@/utils/hunting/wolves';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT,
  BTN_TEXT_TOUCH,
  BTN_TOUCH,
} from '@/components/hunting/hub/shell/controls';

interface Draft {
  interval: Interval;
  preset: PresetId;
}

defineProps({
  // The hub's phone header: the chip shows "2025/2026" for a season (the full label stays
  // its accessible name), so the place and Filtrai chips fit in the same row.
  compact: { type: Boolean, default: false },
});

const ctx = inject(WOLVES_CTX)!;
const uid = `wolves-period-sheet-${getCurrentInstance()?.uid ?? 0}`;

const isOpen = ref(false);
const triggerEl = ref<{ focus(): void } | null>(null);
const dialogEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
const draft = ref<Draft>({ interval: ctx.state.interval.value, preset: ctx.state.preset.value });

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

const shortLabel = computed(() => {
  const preset = ctx.state.preset.value;
  if (preset.startsWith('season:')) {
    const s = Number(preset.slice(7));
    return `${s}/${s + 1}`;
  }
  return periodLabel.value;
});
const isDefault = computed(
  () => ctx.state.preset.value === `season:${ctx.derived.defaultSeason.value}`,
);

// The same filter as derived.filtered, but for the staged interval.
const draftCount = computed<number | null>(() => {
  const records = ctx.data.dataset.value?.records;
  if (!records) return null;
  return filterRecords(records, {
    interval: draft.value.interval,
    sav: ctx.state.sav.value,
    ...ctx.state.attrs.value,
  }).length;
});

const applyLabel = computed(() => {
  const n = draftCount.value;
  if (n === null) return 'Rodyti';
  return `Rodyti ${formatInt(n)} ${pluralLt(n, WOLVES_ACC)}`;
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
