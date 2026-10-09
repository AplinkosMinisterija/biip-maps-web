<template>
  <section
    v-if="record"
    ref="cardEl"
    role="dialog"
    aria-modal="false"
    aria-labelledby="wolf-card-title"
    class="bg-white rounded-lg shadow-lg w-[360px] max-w-full p-4 text-sm text-gray-900"
  >
    <div class="flex items-start justify-between gap-2">
      <h2
        id="wolf-card-title"
        ref="titleEl"
        tabindex="-1"
        class="text-base font-semibold leading-6 outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 rounded"
      >
        Sumedžiotas vilkas
      </h2>
      <button
        type="button"
        class="shrink-0 min-h-[24px] min-w-[24px] max-md:min-h-[44px] max-md:min-w-[44px] px-2 rounded text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        @click="close"
      >
        <span aria-hidden="true">✕</span> Uždaryti
      </button>
    </div>

    <div v-if="count > 1" class="mt-2 flex items-center gap-2">
      <span class="tabular-nums text-gray-700" aria-live="polite">{{ counter }}</span>
      <div class="ml-auto flex gap-1">
        <button
          type="button"
          :class="pagerClass"
          aria-label="Ankstesnis vilkas"
          :disabled="index === 0"
          @click="go(-1)"
        >
          ‹ Ankstesnis
        </button>
        <button
          type="button"
          :class="pagerClass"
          aria-label="Kitas vilkas"
          :disabled="index >= count - 1"
          @click="go(1)"
        >
          Kitas ›
        </button>
      </div>
    </div>

    <p v-if="count > 1 && allInOneCell" class="mt-2 text-gray-700">
      {{ count }} {{ plural(count, ['vilkas', 'vilkai', 'vilkų']) }} šioje vietoje
    </p>

    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <dt class="text-gray-600">Data:</dt>
      <dd class="tabular-nums">
        {{ record.day }}
        <span
          v-if="!record.inWolfWindow"
          class="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900"
        >
          ne medžioklės laikotarpiu
        </span>
      </dd>
      <template v-if="municipality">
        <dt class="text-gray-600">Savivaldybė:</dt>
        <dd>{{ municipality }}</dd>
      </template>
      <dt class="text-gray-600">Amžius:</dt>
      <dd>{{ ageLabel(record.age) }}</dd>
      <dt class="text-gray-600">Lytis:</dt>
      <dd>{{ sexLabel(record.sex) }}</dd>
      <dt class="text-gray-600">Medžioklės būdas:</dt>
      <dd>{{ methodLabel(record.method) }}</dd>
      <dt class="text-gray-600">Gaujos narys:</dt>
      <dd>{{ packLabel(record.packMember, record.packAmount) }}</dd>
      <dt class="text-gray-600">Sezonas:</dt>
      <dd class="tabular-nums">{{ record.season }}/{{ record.season + 1 }}</dd>
      <dt class="text-gray-600">Šaltinis:</dt>
      <dd>{{ sourceLabel(record.source) }}</dd>
    </dl>

    <p class="mt-3 text-xs text-gray-600">Vieta žemėlapyje rodoma apytiksliai (~1 km).</p>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { WOLVES_MAP_CTX } from '@/composables/hunting/useWolvesMap';
import type { WolfRecord } from '@/utils/hunting/types';

import { pluralLt as plural } from '@/utils/hunting/dates';
import { ageLabel, methodLabel, packLabel, sexLabel, sourceLabel } from '@/utils/hunting/labels';

const pagerClass =
  'min-h-[24px] max-md:min-h-[44px] px-2 py-1 rounded border border-gray-300 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';

const ctx = inject(WOLVES_CTX)!;
const mapApi = inject(WOLVES_MAP_CTX, null);

const cardEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
let opener: HTMLElement | null = null;

const recordsById = computed(() => {
  const byId = new Map<string, WolfRecord>();
  ctx.data.dataset.value?.records.forEach((r) => byId.set(r.id, r));
  return byId;
});

const selection = computed(() => ctx.state.selection.value);
const members = computed(() =>
  (selection.value?.ids || [])
    .map((id) => recordsById.value.get(id))
    .filter((r): r is WolfRecord => !!r),
);
const count = computed(() => members.value.length);
const index = computed(() =>
  Math.min(Math.max(selection.value?.index ?? 0, 0), Math.max(count.value - 1, 0)),
);
const record = computed(() => members.value[index.value] || null);
const counter = computed(() => `${index.value + 1} iš ${count.value}`);
const allInOneCell = computed(() =>
  members.value.every((r) => r.x === members.value[0]?.x && r.y === members.value[0]?.y),
);

const municipality = computed(() => {
  const r = record.value;
  if (!r) return null;
  if (r.municipalityName) return r.municipalityName;
  // re-evaluated after each render, so the name appears once the tile under the point is drawn
  void mapApi?.renderTick.value;
  return mapApi?.municipalityNameOf(r) ?? null;
});

function go(step: number) {
  const sel = selection.value;
  if (!sel) return;
  const next = Math.min(Math.max(index.value + step, 0), count.value - 1);
  ctx.state.selection.value = { ...sel, index: next };
  // the pressed pager button is disabled at either end and drops focus; keep it in the card
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

// Focus moves to the heading when a card opens (§8.3). When this component is mounted
// together with the selection, the heading exists only after mount.
let pendingFocus = false;
function focusTitle() {
  if (!pendingFocus || !titleEl.value) return;
  pendingFocus = false;
  titleEl.value.focus({ preventScroll: true });
}

function restoreFocus() {
  const target = opener;
  opener = null;
  if (target && target.isConnected && target !== document.body) {
    target.focus({ preventScroll: true });
  }
  // the opener may be gone or not focusable (a map click): fall back to the map
  if (!target || document.activeElement !== target) mapApi?.focusMap();
}

watch(
  () => selection.value?.ids.join('|') || '',
  async (key, oldKey) => {
    if (key && key !== oldKey) {
      if (!oldKey) {
        // remember who opened the card (a table button); a map click leaves focus on body
        const active = document.activeElement as HTMLElement | null;
        opener =
          active && active !== document.body && !cardEl.value?.contains(active) ? active : null;
      }
      pendingFocus = true;
      await nextTick();
      focusTitle();
    } else if (!key && oldKey) {
      // closed by the button, Esc or a filter change: return focus only if it was inside the card
      // (pre-flush: the card is still in the DOM here)
      const active = document.activeElement;
      if (active && cardEl.value?.contains(active)) restoreFocus();
      else opener = null;
    }
  },
  // immediate: the route mounts this card only once something is selected
  { flush: 'pre', immediate: true },
);

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !record.value) return;
  e.preventDefault();
  close();
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  focusTitle();
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  // The route unmounts the card when the selection clears, before the watcher above
  // can run; return focus here so it is not lost on <body>.
  const active = document.activeElement;
  if (active && cardEl.value?.contains(active)) restoreFocus();
});
</script>
