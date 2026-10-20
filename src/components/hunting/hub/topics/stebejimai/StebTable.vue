<template>
  <component
    :is="sheet ? 'section' : 'aside'"
    :id="sheet ? undefined : TABLE_ID"
    :aria-labelledby="`${uid}-title`"
    :class="sheet ? 'flex flex-col' : drawerClass"
    @keydown.esc.stop="!sheet && close()"
  >
    <div class="flex items-center justify-between gap-2" :class="sheet ? 'pb-2' : 'px-4 pb-2 pt-4'">
      <h2 :id="`${uid}-title`" :class="sheet ? 'sr-only' : 'text-base font-semibold'">
        {{ SS.tableTitle }}
      </h2>
      <!-- Embedded, the WP page's view switch closes the table; Esc still does. -->
      <button
        v-if="!sheet && !ctx.embed"
        type="button"
        class="inline-flex min-h-[32px] items-center gap-1 rounded px-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
        :class="focusRing"
        :aria-controls="TABLE_ID"
        @click="close"
      >
        <UiIcon name="close" :size="16" aria-hidden="true" />
        {{ SS.close }}
      </button>
    </div>

    <div
      role="tablist"
      :aria-label="SS.tablesLabel"
      class="flex gap-1 overflow-x-auto border-b border-gray-200"
      :class="sheet ? '' : 'px-4'"
    >
      <button
        v-for="tab in tabs"
        :id="tabId(tab.id)"
        :key="tab.id"
        :ref="(el) => setTabRef(tab.id, el)"
        type="button"
        role="tab"
        :aria-selected="active === tab.id"
        :aria-controls="panelId(tab.id)"
        :tabindex="active === tab.id ? 0 : -1"
        class="-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-3 text-sm font-semibold md:min-h-[36px]"
        :class="[
          focusRing,
          active === tab.id
            ? 'border-blue-700 text-blue-800'
            : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
        @click="selectTab(tab.id)"
        @keydown="onTabKeydown"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1" :class="sheet ? 'py-3' : 'overflow-y-auto px-4 py-3'">
      <div
        :id="panelId(active)"
        ref="panelEl"
        role="tabpanel"
        :aria-labelledby="tabId(active)"
        tabindex="0"
        class="flex flex-col gap-3 rounded text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
      >
        <p v-if="loading" role="status" class="text-gray-700">{{ SS.loading }}</p>
        <p v-else-if="!ctx.derived.records.value.length" class="text-gray-700">
          {{ SS.tableEmpty }}
        </p>
        <p v-else-if="!rows.length" class="text-gray-700">{{ SS.tableFilteredEmpty }}</p>

        <!-- Įrašai: cards where the table would not fit (by the panel's own width), else a
             sortable table. -->
        <template v-else-if="active === 'irasai'">
          <ul v-if="narrow" class="flex flex-col gap-2" :aria-label="caption">
            <li
              v-for="r in pageRows"
              :key="r.key"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <p class="font-semibold tabular-nums">
                {{ dateTimeText(r) }} · {{ r.species || NOT_SET_LABEL }}
              </p>
              <p>{{ SS.colCount }}: {{ countText(r) }}</p>
              <p>{{ SS.colFact }}: {{ factText(r) }}</p>
              <p>{{ SS.colMunicipality }}: {{ r.municipality || NOT_SET_LABEL }}</p>
              <p>{{ SS.colEldership }}: {{ r.eldership || NOT_SET_LABEL }}</p>
              <p>{{ SS.cardMpv }}: {{ r.huntingArea || NOT_SET_LABEL }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-3">
                <button
                  v-if="r.x !== null"
                  type="button"
                  :class="actionButton"
                  :aria-label="showLabel(r)"
                  @click="showRecord(r)"
                >
                  <UiIcon name="pin" :size="16" aria-hidden="true" />
                  {{ SS.showOnMap }}
                </button>
                <span v-else class="text-gray-600">{{ SS.noPlace }}</span>
                <a
                  v-if="ctx.state.linkOf(r)"
                  :href="ctx.state.linkOf(r)!"
                  :target="linkTarget"
                  :rel="linkRel"
                  :aria-label="viewLabel(r)"
                  :class="linkClass"
                >
                  {{ SS.view }}
                </a>
              </div>
            </li>
          </ul>

          <div v-else class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-xs">
              <caption class="sr-only">
                {{
                  caption
                }}
              </caption>
              <thead>
                <tr class="border-b border-gray-200 text-gray-600">
                  <th
                    v-for="col in columns"
                    :key="col.key"
                    scope="col"
                    class="py-2 pr-2 font-semibold"
                    :aria-sort="ariaSort(col.key)"
                  >
                    <button type="button" :class="sortButton" @click="toggleSort(col.key)">
                      <abbr v-if="col.key === 'mpv'" :title="SS.colMpvTitle">{{ col.label }}</abbr>
                      <template v-else>{{ col.label }}</template>
                      <span aria-hidden="true">{{ sortArrow(col.key) }}</span>
                    </button>
                  </th>
                  <th scope="col" class="sticky right-0 bg-white py-2 pl-1 font-semibold">
                    <span class="sr-only">{{ SS.colActions }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pageRows" :key="r.key" class="border-b border-gray-100 align-top">
                  <td class="whitespace-nowrap py-2 pr-2 tabular-nums">{{ dateTimeText(r) }}</td>
                  <td class="py-2 pr-2">{{ r.species || NOT_SET_LABEL }}</td>
                  <td class="py-2 pr-2 tabular-nums">{{ countText(r) }}</td>
                  <td class="py-2 pr-2">{{ factText(r) }}</td>
                  <td class="py-2 pr-2">{{ r.municipality || NOT_SET_LABEL }}</td>
                  <td class="py-2 pr-2">{{ r.eldership || NOT_SET_LABEL }}</td>
                  <td class="py-2 pr-2">{{ r.huntingArea || NOT_SET_LABEL }}</td>
                  <td class="sticky right-0 bg-white py-1 pl-1">
                    <div class="flex items-center gap-1 whitespace-nowrap">
                      <button
                        v-if="r.x !== null"
                        type="button"
                        class="flex h-8 w-8 items-center justify-center rounded text-blue-800 hover:bg-blue-50"
                        :class="focusRing"
                        :aria-label="showLabel(r)"
                        :title="SS.showOnMap"
                        @click="showRecord(r)"
                      >
                        <UiIcon name="pin" :size="18" aria-hidden="true" />
                      </button>
                      <span v-else class="px-1 text-gray-600">{{ SS.noPlace }}</span>
                      <a
                        v-if="ctx.state.linkOf(r)"
                        :href="ctx.state.linkOf(r)!"
                        :target="linkTarget"
                        :rel="linkRel"
                        :aria-label="viewLabel(r)"
                        :class="linkClass"
                      >
                        {{ SS.view }}
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs tabular-nums text-gray-700" aria-live="polite">
              {{ SS.range(rangeFrom, rangeTo, rows.length) }}
            </p>
            <div v-if="pageCount > 1" class="flex gap-2">
              <button type="button" :class="pagerButton" :disabled="page === 0" @click="page--">
                {{ SS.previous }}
              </button>
              <button
                type="button"
                :class="pagerButton"
                :disabled="page >= pageCount - 1"
                @click="page++"
              >
                {{ SS.next }}
              </button>
            </div>
          </div>
        </template>

        <!-- Rūšys / Savivaldybės: one row per group, totals at the bottom. -->
        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-sm">
            <caption class="sr-only">
              {{
                caption
              }}
            </caption>
            <thead>
              <tr class="border-b border-gray-200 text-xs text-gray-600">
                <th scope="col" class="py-2 pr-2 font-semibold">
                  {{ active === 'rusys' ? SS.colSpecies : SS.colMunicipality }}
                </th>
                <th scope="col" class="py-2 pr-2 text-right font-semibold">
                  {{ SS.colObservations }}
                </th>
                <th scope="col" class="py-2 pr-2 text-right font-semibold">{{ SS.colAnimals }}</th>
                <th scope="col" class="py-2 pl-1">
                  <span class="sr-only">{{ SS.colActions }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in groups" :key="g.key" class="border-b border-gray-100">
                <th scope="row" class="py-2 pr-2 font-normal">
                  <span class="flex items-center gap-2">
                    <span
                      v-if="active === 'rusys'"
                      class="inline-block h-3 w-3 shrink-0 rounded-full"
                      :style="{ background: speciesColor(g.key) }"
                      aria-hidden="true"
                    />
                    {{ g.label }}
                  </span>
                </th>
                <td class="py-2 pr-2 text-right tabular-nums">{{ formatInt(g.n) }}</td>
                <td class="py-2 pr-2 text-right tabular-nums">{{ animalsText(g.animals) }}</td>
                <td class="py-1 pl-1 text-right">
                  <button
                    v-if="groupAction(g)"
                    type="button"
                    :class="actionButton"
                    :aria-label="SS.showOnMapOf(g.label)"
                    @click="showGroup(g)"
                  >
                    {{ SS.showOnMap }}
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-semibold">
                <th scope="row" class="py-2 pr-2 text-left">{{ SS.totals }}</th>
                <td class="py-2 pr-2 text-right tabular-nums">{{ formatInt(rows.length) }}</td>
                <td class="py-2 pr-2 text-right tabular-nums">
                  {{ animalsText(animalsOf(rows)) }}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <div class="flex justify-end border-t border-gray-200" :class="sheet ? 'pt-3' : 'px-4 py-3'">
      <button
        type="button"
        class="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-gray-400 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[32px]"
        :class="focusRing"
        :disabled="!ctx.derived.ready.value"
        @click="downloadCurrent"
      >
        <UiIcon name="download" :size="16" aria-hidden="true" />
        {{ S.csv }}
      </button>
    </div>
  </component>
</template>

<script setup lang="ts">
// Tables of the Stebėjimai topic (STEB-SPEC §3.5, §3.6): Įrašai (sortable, 50 per page,
// "Rodyti žemėlapyje" and the record link), Rūšys and Savivaldybės (with totals), and the
// CSV of the active table with all filtered rows in the shown order.
import { computed, getCurrentInstance, inject, nextTick, ref, watch } from 'vue';
import { useElementSize, useMediaQuery } from '@vueuse/core';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { formatInt } from '@/utils/hunting/dates';
import { downloadCsv } from '@/utils/hunting/hub/csv';
import { embedFocusAllowed } from '@/utils/hunting/hub/embed';
import { S } from '@/utils/hunting/hub/strings';
import {
  animalsOf,
  buildStebCsv,
  compareLt,
  compareRecords,
  countText,
  dateTimeText,
  factText,
  municipalitySummary,
  NOT_SET_LABEL,
  NOT_SET_SLUG,
  speciesSummary,
  stebCsvFileName,
  TABLE_LABELS,
  type StebRecord,
  type StebTableId,
  type SummaryRow,
} from '@/utils/hunting/hub/stebejimai/model';
import { speciesColor } from '@/utils/hunting/hub/stebejimai/layers';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';

type SortKey = 'date' | 'species' | 'count' | 'fact' | 'muni' | 'elder' | 'mpv';

const PAGE_SIZE = 50;
// The standalone view switch points here (`aria-controls`).
const TABLE_ID = 'steb-table-drawer';

const props = defineProps({
  // 'drawer': desktop/tablet (positioned by `drawerClass`); 'sheet': inside the mobile sheet.
  variant: { type: String as () => 'drawer' | 'sheet', default: 'drawer' },
  drawerClass: { type: String, default: '' },
});
// 'show-on-map': the host closes the table where it covers the map.
const emit = defineEmits(['show-on-map', 'close']);

const ctx = inject(STEB_CTX)!;
const sheet = props.variant === 'sheet';
const uid = `steb-table-${props.variant}-${getCurrentInstance()?.uid ?? 0}`;
// Cards by the width the table has, not by the viewport: the table sits beside the panel
// (embedded from 768 px, standalone in the 560 px drawer), and its seven columns and the
// actions need about 660 px. Below that the place columns would hide behind the sticky
// actions column. Before the panel is measured, a narrow viewport decides.
const CARDS_BELOW = 680;
const panelEl = ref<HTMLElement | null>(null);
const { width: panelWidth } = useElementSize(panelEl);
const narrowViewport = useMediaQuery('(max-width: 599px)');
const narrow = computed(() =>
  panelWidth.value > 0 ? panelWidth.value < CARDS_BELOW : narrowViewport.value,
);

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const sortButton = `inline-flex min-h-[24px] items-center gap-1 rounded font-semibold hover:text-gray-900 ${focusRing}`;
const pagerButton = `min-h-[44px] md:min-h-[24px] rounded border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;
const actionButton = `inline-flex min-h-[44px] md:min-h-[28px] items-center gap-1 rounded px-1 text-sm font-semibold text-blue-800 underline hover:bg-blue-50 ${focusRing}`;
const linkClass = `inline-flex min-h-[44px] md:min-h-[28px] items-center rounded px-1 font-semibold text-blue-800 underline ${focusRing}`;

const linkTarget = ctx.embed ? '_top' : '_blank';
const linkRel = ctx.embed ? undefined : 'noopener';

const tabs: { id: StebTableId; label: string }[] = [
  { id: 'irasai', label: TABLE_LABELS.irasai },
  { id: 'rusys', label: TABLE_LABELS.rusys },
  { id: 'savivaldybes', label: TABLE_LABELS.savivaldybes },
];
const active = computed(() => ctx.state.table.value);
const tabId = (id: StebTableId) => `${uid}-tab-${id}`;
const panelId = (id: StebTableId) => `${uid}-panel-${id}`;
const tabRefs: Partial<Record<StebTableId, HTMLElement>> = {};
function setTabRef(id: StebTableId, el: any) {
  if (el) tabRefs[id] = el as HTMLElement;
  else delete tabRefs[id];
}
function selectTab(id: StebTableId, focus = false) {
  ctx.state.table.value = id;
  if (focus) nextTick(() => tabRefs[id]?.focus());
}
function onTabKeydown(event: KeyboardEvent) {
  const ids = tabs.map((t) => t.id);
  const index = ids.indexOf(active.value);
  let next: number | null = null;
  if (event.key === 'ArrowRight') next = (index + 1) % ids.length;
  else if (event.key === 'ArrowLeft') next = (index - 1 + ids.length) % ids.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = ids.length - 1;
  if (next === null) return;
  event.preventDefault();
  selectTab(ids[next], true);
}

const loading = computed(() => !ctx.derived.ready.value);
const placeCaption = computed(() => {
  const sav = ctx.state.sav.value;
  return sav === null ? SS.allPlaces : ctx.meta.nameOf(sav) || `${sav}`;
});
const caption = computed(() =>
  SS.caption(TABLE_LABELS[active.value], ctx.derived.periodLabel.value, placeCaption.value),
);

// ---- Įrašai: sort and pages.
const columns: { key: SortKey; label: string }[] = [
  { key: 'date', label: SS.colDateTime },
  { key: 'species', label: SS.colSpecies },
  { key: 'count', label: SS.colCount },
  { key: 'fact', label: SS.colFact },
  { key: 'muni', label: SS.colMunicipality },
  { key: 'elder', label: SS.colEldership },
  { key: 'mpv', label: SS.colMpv },
];
const sortKey = ref<SortKey>('date');
const sortDir = ref<'asc' | 'desc'>('desc');
const page = ref(0);

type TextKey = Exclude<SortKey, 'date' | 'count'>;
function textValue(key: TextKey, r: StebRecord): string | null {
  if (key === 'species') return r.species;
  if (key === 'fact') return r.fact || r.factOther ? factText(r) : null;
  if (key === 'muni') return r.municipality;
  if (key === 'elder') return r.eldership;
  return r.huntingArea;
}

// Filtered rows in the shown order; missing values always last.
const rows = computed(() => {
  const list = ctx.derived.filtered.value;
  const key = sortKey.value;
  const dir = sortDir.value === 'asc' ? 1 : -1;
  if (key === 'date') return dir < 0 ? list : [...list].sort(byDateAsc);
  const value = (r: StebRecord) => (key === 'count' ? r.count : textValue(key, r));
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === null || vb === null) return va === vb ? compareRecords(a, b) : va === null ? 1 : -1;
    const diff =
      typeof va === 'number' ? va - (vb as number) : compareLt(va as string, vb as string);
    return dir * diff || compareRecords(a, b);
  });
});
function byDateAsc(a: StebRecord, b: StebRecord) {
  if (!a.dateTime || !b.dateTime) return a.dateTime === b.dateTime ? 0 : a.dateTime ? -1 : 1;
  return -compareRecords(a, b);
}

const pageCount = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)));
const pageRows = computed(() =>
  rows.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE),
);
const rangeFrom = computed(() => (rows.value.length ? page.value * PAGE_SIZE + 1 : 0));
const rangeTo = computed(() => Math.min(rows.value.length, (page.value + 1) * PAGE_SIZE));
watch([() => ctx.derived.filtered.value, sortKey, sortDir], () => (page.value = 0));

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'date' || key === 'count' ? 'desc' : 'asc';
  }
}
const ariaSort = (key: SortKey) =>
  sortKey.value === key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none';
const sortArrow = (key: SortKey) =>
  sortKey.value === key ? (sortDir.value === 'asc' ? '▲' : '▼') : '';

const showLabel = (r: StebRecord) =>
  SS.showOnMapOf(`${dateTimeText(r)}, ${r.species || NOT_SET_LABEL}`);
const viewLabel = (r: StebRecord) =>
  ctx.embed ? SS.viewRecord(r.id!) : `${SS.viewRecord(r.id!)} ${SS.newWindow}`;

function showRecord(r: StebRecord) {
  ctx.state.select([r.key], { zoom: true });
  emit('show-on-map');
}

// ---- Rūšys / Savivaldybės.
const groups = computed<SummaryRow[]>(() =>
  active.value === 'rusys' ? speciesSummary(rows.value) : municipalitySummary(rows.value),
);
const animalsText = (n: number | null) => (n === null ? '–' : formatInt(n));
function groupAction(g: SummaryRow) {
  if (active.value === 'rusys') return true;
  return g.key !== '' && ctx.meta.codeOf(g.key) !== null;
}
function showGroup(g: SummaryRow) {
  if (active.value === 'rusys') {
    ctx.state.setSpecies(g.key || NOT_SET_SLUG);
  } else {
    const code = ctx.meta.codeOf(g.key);
    if (code === null) return;
    ctx.state.setPlace(code);
  }
  emit('show-on-map');
}

// ---- CSV of the active table: all filtered rows in the shown order (§3.6).
function downloadCurrent() {
  const table = active.value;
  const csv = buildStebCsv({
    table,
    records: rows.value,
    fetchedAt: ctx.data.fetchedAt.value,
    labels: {
      period: ctx.derived.periodLabel.value,
      species: ctx.derived.speciesLabel.value,
      fact: ctx.derived.factLabel.value,
      place: ctx.derived.placeLabel.value,
    },
    truncated: ctx.data.truncated.value
      ? { shown: ctx.derived.records.value.length, total: ctx.data.total.value }
      : null,
    linkOf: ctx.state.linkOf,
  });
  downloadCsv(csv, stebCsvFileName(table, ctx.state.period.value, ctx.today));
}

function close() {
  emit('close');
}

// The host calls this when the user opens the table, so keyboard users land on the tabs
// (embedded: only while the frame has focus, without scrolling the WP page).
function focusTab() {
  nextTick(() => {
    if (!embedFocusAllowed(ctx.embed)) return;
    tabRefs[active.value]?.focus({ preventScroll: true });
  });
}
defineExpose({ focusTab });
</script>
