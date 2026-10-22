<template>
  <div class="flex flex-col gap-3 text-sm text-ink">
    <div v-if="showVisibleAreaToggle" class="flex flex-col gap-1">
      <label class="inline-flex items-center gap-2 cursor-pointer min-h-[44px] md:min-h-[24px]">
        <input v-model="visibleOnly" type="checkbox" :class="CHECK" />
        <span>Tik matomame žemėlapio plote</span>
      </label>
      <p v-if="visibleOnly" class="text-xs text-ink-muted">
        Šiame žemėlapio plote: {{ formatInt(rows.length) }} iš {{ formatInt(filtered.length) }}
      </p>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="i in 5" :key="i" class="h-6 rounded bg-page animate-pulse" />
    </div>

    <p v-else-if="!rows.length" class="text-sm text-ink-muted">
      Pasirinktu laikotarpiu sumedžiotų vilkų su žinoma vieta nėra.
    </p>

    <!-- Phone cards: every value of the row; the card is the "show on map" action. -->
    <ul v-else-if="isMobile" class="flex flex-col gap-2" :aria-label="caption">
      <li v-for="row in pageRows" :key="row.id">
        <button
          type="button"
          :class="[
            'w-full min-h-[44px] rounded-lg border border-line bg-white p-3 text-left hover:bg-brand-50',
            FOCUS_RING,
          ]"
          :aria-label="showOnMapLabel(row)"
          @click="showOnMap(row)"
        >
          <span
            class="flex flex-wrap items-center gap-x-2 text-[15px] font-semibold leading-5 text-brand tabular-nums"
          >
            {{ row.day }}
            <span class="font-normal text-ink-muted">
              · {{ row.municipalityName || 'Nenustatyta' }}
            </span>
            <UiIcon name="chevron-right" :size="16" class="ml-auto shrink-0" aria-hidden="true" />
          </span>
          <span v-if="!row.inWolfWindow" :class="tagClass" class="mt-1">
            ne vilkų medžioklės laikotarpiu
          </span>
          <span class="mt-1 block text-ink">
            {{ ageLabel(row.age) }} · {{ sexLabel(row.sex) }} · {{ methodLabel(row.method) }}
          </span>
          <span class="block text-[13px] leading-[18px] text-ink-muted">
            Gaujos narys: {{ packLabel(row.packMember, row.packAmount) }} ·
            {{ sourceLabel(row.source) }}
          </span>
        </button>
      </li>
    </ul>

    <div v-else class="overflow-x-auto">
      <table :class="TABLE">
        <caption class="sr-only">
          {{
            caption
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" :class="[TH, 'pl-0']" :aria-sort="ariaSort('day')">
              <button type="button" :class="SORT_BTN" @click="toggleSort('day')">
                <span :class="sortKey === 'day' ? SORT_LABEL_ON : ''">Data</span>
                <span
                  aria-hidden="true"
                  :class="[SORT_ICON, sortKey === 'day' ? SORT_ICON_ON : SORT_ICON_IDLE]"
                  v-text="sortArrow('day')"
                />
              </button>
            </th>
            <!-- Always there: "Nenustatyta" until the boundaries arrive, so the layout holds. -->
            <th scope="col" :class="TH" :aria-sort="ariaSort('sav')">
              <button type="button" :class="SORT_BTN" @click="toggleSort('sav')">
                <span :class="sortKey === 'sav' ? SORT_LABEL_ON : ''">Savivaldybė</span>
                <span
                  aria-hidden="true"
                  :class="[SORT_ICON, sortKey === 'sav' ? SORT_ICON_ON : SORT_ICON_IDLE]"
                  v-text="sortArrow('sav')"
                />
              </button>
            </th>
            <th scope="col" :class="TH">Amžius</th>
            <th scope="col" :class="TH">Lytis</th>
            <th scope="col" :class="TH">
              <span aria-hidden="true" title="Medžioklės būdas">Būdas</span>
              <span class="sr-only">Medžioklės būdas</span>
            </th>
            <template v-if="!compact">
              <th scope="col" :class="TH">Gaujos narys</th>
              <th scope="col" :class="TH">Šaltinis</th>
            </template>
            <th scope="col" :class="[TH, 'sticky right-0 z-30 w-12 px-1']">
              <span class="sr-only">Veiksmai</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pageRows" :key="row.id" :class="TR">
            <td :class="[TD, TD_BG, 'pl-0 tabular-nums']">
              <span class="whitespace-nowrap">{{ row.day }}</span>
              <span v-if="!row.inWolfWindow" :class="tagClass" class="mt-0.5 w-max">
                ne vilkų medžioklės laikotarpiu
              </span>
            </td>
            <td :class="[TD, TD_BG]">
              {{ row.municipalityName || 'Nenustatyta' }}
            </td>
            <td :class="[TD, TD_BG]">{{ ageLabel(row.age) }}</td>
            <td :class="[TD, TD_BG]">{{ sexLabel(row.sex) }}</td>
            <td :class="[TD, TD_BG]">{{ methodLabel(row.method) }}</td>
            <template v-if="!compact">
              <td :class="[TD, TD_BG]">{{ packLabel(row.packMember, row.packAmount) }}</td>
              <!-- Short source name keeps the table inside the 520 px drawer; the card and CSV use the full one. -->
              <td :class="[TD, TD_BG, 'whitespace-nowrap']">
                <span aria-hidden="true" :title="sourceLabel(row.source)">{{
                  SHORT_SOURCE[row.source] || row.source
                }}</span>
                <span class="sr-only">{{ sourceLabel(row.source) }}</span>
              </td>
            </template>
            <!-- One 40 px icon button at the row end; sticky so it stays visible when the
                 columns scroll in the drawer. -->
            <td :class="[TD, TD_BG, 'sticky right-0 z-10 px-1 py-0 align-middle']">
              <button
                type="button"
                :class="ROW_ICON_BTN"
                :aria-label="showOnMapLabel(row)"
                title="Rodyti žemėlapyje"
                @click="showOnMap(row)"
              >
                <UiIcon name="pin" :size="18" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- No aria-live: the range is read with the buttons, a live region read it twice. -->
    <div v-if="rows.length" class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-ink-muted tabular-nums">
        Rodoma {{ formatInt(rangeFrom) }}–{{ formatInt(rangeTo) }} iš {{ formatInt(rows.length) }}
      </p>
      <div class="flex gap-2">
        <button type="button" :class="PAGER_BTN" :disabled="page === 0" @click="page = page - 1">
          Ankstesnis
        </button>
        <button
          type="button"
          :class="PAGER_BTN"
          :disabled="page >= pageCount - 1"
          @click="page = page + 1"
        >
          Kitas
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { WolfRecord } from '@/utils/hunting/types';
import { CHECK, FOCUS_RING } from '@/components/hunting/hub/shell/controls';
import {
  PAGER_BTN,
  ROW_ICON_BTN,
  SORT_BTN,
  SORT_ICON,
  SORT_ICON_IDLE,
  SORT_ICON_ON,
  SORT_LABEL_ON,
  TABLE,
  TD,
  TD_BG,
  TH,
  TR,
} from '@/components/hunting/hub/table/spec';

import { formatInt } from '@/utils/hunting/dates';
import { ageLabel, methodLabel, packLabel, sexLabel, sourceLabel } from '@/utils/hunting/labels';

const PAGE_SIZE = 50;
const SHORT_SOURCE: Record<string, string> = { biomon: 'BIOMON', biip: 'BIIP' };

defineProps({
  // Hub (SPEC2 §7): Data · Savivaldybė · Amžius · Lytis · Būdas; pack and source stay in
  // the card and the CSV.
  compact: { type: Boolean, default: false },
});

// 'show-on-map' (record: WolfRecord): the parent may collapse the mobile sheet.
const emit = defineEmits(['show-on-map']);

const ctx = inject(WOLVES_CTX)!;
const { state, derived, data } = ctx;
// Inside the hub embedded in the WP data page (SPEC §4); false on the wolves page.
const embed = !!inject(HUB_CTX, null)?.embed;

const isMobile = computed(() => ctx.isMobile.value);
const filtered = computed(() => derived.filtered.value);
const isLoading = computed(
  () => !data.dataset.value && ['loading', 'slow'].includes(data.phase.value),
);
// Embedded, the table replaces the map at every width, so there is no visible area to filter
// by: the toggle is hidden and `visibleOnly` stays false (SPEC §4).
const showVisibleAreaToggle = computed(() => !embed && !!state.mapExtent3346.value);

const visibleOnly = ref(false);
const sortKey = ref<'day' | 'sav'>('day');
const sortDir = ref<'asc' | 'desc'>('desc');
const page = ref(0);

const periodLabel = computed(() => {
  const { from, to } = state.interval.value;
  const season = derived.intervalSeason.value;
  if (season !== null) return `${season}/${season + 1} sezonas`;
  if (state.preset.value === 'all') return 'visi sezonai';
  if (state.preset.value === 'last30') return `paskutinės 30 d. (${from} – ${to})`;
  return from === to ? from : `${from} – ${to}`;
});
const caption = computed(() => `Sumedžioti vilkai: ${periodLabel.value}`);

const rows = computed(() => {
  let list = filtered.value;
  const extent = state.mapExtent3346.value;
  if (visibleOnly.value && extent) {
    const [minX, minY, maxX, maxY] = extent;
    list = list.filter((r) => r.x >= minX && r.x <= maxX && r.y >= minY && r.y <= maxY);
  }

  // `filtered` arrives sorted by day desc, then id.
  if (sortKey.value === 'day') {
    return sortDir.value === 'desc' ? list : [...list].reverse();
  }
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...list].sort(
    (a, b) =>
      dir * (a.municipalityName || '').localeCompare(b.municipalityName || '', 'lt') ||
      b.day.localeCompare(a.day),
  );
});

const pageCount = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)));
const pageRows = computed(() =>
  rows.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE),
);
const rangeFrom = computed(() => (rows.value.length ? page.value * PAGE_SIZE + 1 : 0));
const rangeTo = computed(() => Math.min(rows.value.length, (page.value + 1) * PAGE_SIZE));

watch([filtered, visibleOnly, sortKey, sortDir], () => (page.value = 0));
watch(pageCount, (count) => {
  if (page.value > count - 1) page.value = count - 1;
});

function toggleSort(key: 'day' | 'sav') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'day' ? 'desc' : 'asc';
  }
}
const ariaSort = (key: 'day' | 'sav') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none';
const sortArrow = (key: 'day' | 'sav') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? '▲' : '▼') : '↕';

const showOnMapLabel = (row: WolfRecord) =>
  `Rodyti žemėlapyje: ${row.day}, ${sexLabel(row.sex)}, ${ageLabel(row.age)}`;

function showOnMap(row: WolfRecord) {
  state.select([row.id], { zoom: true });
  emit('show-on-map', row);
}

// The "dalinis / preliminarūs" pill of D10.
const tagClass =
  'block w-max rounded-full bg-[#fdf1e7] px-2 py-0.5 text-xs font-semibold text-[#8a3b12] whitespace-nowrap';
</script>
