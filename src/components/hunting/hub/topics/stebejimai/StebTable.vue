<template>
  <component
    :is="sheet ? 'section' : 'aside'"
    :id="sheet ? undefined : TABLE_ID"
    :aria-labelledby="`${uid}-title`"
    :class="sheet ? 'flex flex-col' : drawerClass"
    @keydown.esc.stop="!sheet && close()"
  >
    <!-- Title row: what, when and where; standalone also "Uždaryti". -->
    <div class="flex items-start justify-between gap-3" :class="sheet ? 'pb-2' : 'px-4 pb-2 pt-4'">
      <h2
        :id="`${uid}-title`"
        class="font-bold text-ink"
        :class="sheet ? 'text-[15px] leading-5' : 'text-base leading-[22px]'"
      >
        {{ title }}
      </h2>
      <!-- Embedded, the WP page's view switch closes the table; Esc still does. -->
      <button
        v-if="!sheet && !ctx.embed"
        type="button"
        :class="[BTN_TEXT, 'shrink-0 text-ink']"
        :aria-controls="TABLE_ID"
        @click="close"
      >
        <UiIcon name="close" :size="16" aria-hidden="true" />
        {{ SS.close }}
      </button>
    </div>

    <!-- Pill sub-tabs left, the CSV right (clear of the site's accessibility button). -->
    <div
      class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
      :class="sheet ? '' : 'px-4'"
    >
      <div
        role="tablist"
        :aria-label="SS.tablesLabel"
        class="flex min-w-0 gap-1 overflow-x-auto p-0.5"
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
          :class="[PILL_TAB, 'whitespace-nowrap max-md:h-11', active === tab.id ? PILL_TAB_ON : '']"
          @click="selectTab(tab.id)"
          @keydown="onTabKeydown"
        >
          {{ tab.label }}
        </button>
      </div>
      <button
        type="button"
        :class="[
          BTN_SECONDARY,
          'shrink-0 whitespace-nowrap disabled:cursor-not-allowed max-md:h-11',
        ]"
        :disabled="!ctx.derived.ready.value"
        @click="downloadCurrent"
      >
        <UiIcon name="download" :size="16" aria-hidden="true" />
        {{ S.csv }}
      </button>
    </div>

    <div class="min-h-0 flex-1" :class="sheet ? 'py-3' : 'overflow-y-auto px-4 py-3'">
      <div
        :id="panelId(active)"
        ref="panelEl"
        role="tabpanel"
        :aria-labelledby="tabId(active)"
        tabindex="0"
        :class="[FOCUS_RING, 'flex flex-col gap-3 rounded text-sm text-ink']"
      >
        <p v-if="loading" role="status" class="text-ink-muted">{{ SS.loading }}</p>
        <p v-else-if="!ctx.derived.records.value.length" class="text-ink-muted">
          {{ SS.tableEmpty }}
        </p>
        <p v-else-if="!rows.length" class="text-ink-muted">{{ SS.tableFilteredEmpty }}</p>

        <!-- Įrašai: cards where the table would not fit (by the panel's own width), else a
             sortable table. -->
        <template v-else-if="active === 'irasai'">
          <ul v-if="narrow" class="flex flex-col gap-2" :aria-label="caption">
            <li
              v-for="r in pageRows"
              :key="r.key"
              class="rounded-lg border border-line bg-white p-3"
            >
              <!-- The title is the "show on map" action; every public field below. -->
              <button
                v-if="r.x !== null"
                type="button"
                :class="cardTitleButton"
                :aria-label="showLabel(r)"
                @click="showRecord(r)"
              >
                <span>{{ dateTimeText(r) }} · {{ r.species || NOT_SET_LABEL }}</span>
                <UiIcon name="chevron-right" :size="16" class="shrink-0" aria-hidden="true" />
              </button>
              <p v-else class="text-[15px] font-semibold leading-5 tabular-nums">
                {{ dateTimeText(r) }} · {{ r.species || NOT_SET_LABEL }}
                <span class="font-normal text-ink-muted">· {{ SS.noPlace }}</span>
              </p>
              <dl class="mt-1 grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                <template v-for="field in cardFields(r)" :key="field.label">
                  <dt class="text-[13px] leading-5 text-ink-muted">{{ field.label }}</dt>
                  <dd class="leading-5">{{ field.value }}</dd>
                </template>
              </dl>
              <a
                v-if="ctx.state.linkOf(r)"
                :href="ctx.state.linkOf(r)!"
                :target="linkTarget"
                :rel="linkRel"
                :aria-label="viewLabel(r)"
                :class="[INLINE_LINK, 'mt-1 inline-flex min-h-[44px] items-center']"
              >
                {{ SS.view }}
              </a>
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
                  <th
                    v-for="(col, i) in columns"
                    :key="col.key"
                    scope="col"
                    :class="[TH, i === 0 ? 'pl-0' : '']"
                    :aria-sort="ariaSort(col.key)"
                  >
                    <button type="button" :class="SORT_BTN" @click="toggleSort(col.key)">
                      <abbr v-if="col.key === 'mpv'" :title="SS.colMpvTitle" class="no-underline">
                        <span :class="sortKey === col.key ? SORT_LABEL_ON : ''">{{
                          col.label
                        }}</span>
                      </abbr>
                      <span v-else :class="sortKey === col.key ? SORT_LABEL_ON : ''">{{
                        col.label
                      }}</span>
                      <span
                        aria-hidden="true"
                        :class="[SORT_ICON, sortKey === col.key ? SORT_ICON_ON : SORT_ICON_IDLE]"
                        v-text="sortArrow(col.key)"
                      />
                    </button>
                  </th>
                  <th scope="col" :class="[TH, 'sticky right-0 z-30 w-12 px-1']">
                    <span class="sr-only">{{ SS.colActions }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pageRows" :key="r.key" :class="TR">
                  <td :class="[TD, TD_BG, 'whitespace-nowrap pl-0 tabular-nums']">
                    {{ dateTimeText(r) }}
                  </td>
                  <td :class="[TD, TD_BG]">{{ r.species || NOT_SET_LABEL }}</td>
                  <td :class="[TD, TD_BG, 'tabular-nums']">{{ countText(r) }}</td>
                  <td :class="[TD, TD_BG, '[overflow-wrap:normal]']">{{ factText(r) }}</td>
                  <td :class="[TD, TD_BG]">{{ r.municipality || NOT_SET_LABEL }}</td>
                  <td :class="[TD, TD_BG]">{{ r.eldership || NOT_SET_LABEL }}</td>
                  <td :class="[TD, TD_BG]">
                    {{ mpvName(r.huntingArea, { suffix: false }) || NOT_SET_LABEL }}
                  </td>
                  <!-- One 40 px icon button at the row end; the record page link is in the
                       card the button opens. -->
                  <td :class="[TD, TD_BG, 'sticky right-0 z-10 px-1 py-0 align-middle']">
                    <button
                      v-if="r.x !== null"
                      type="button"
                      :class="ROW_ICON_BTN"
                      :aria-label="showLabel(r)"
                      :title="SS.showOnMap"
                      @click="showRecord(r)"
                    >
                      <UiIcon name="pin" :size="18" aria-hidden="true" />
                    </button>
                    <span v-else class="block whitespace-nowrap px-1 py-2 text-xs text-ink-muted">
                      {{ SS.noPlace }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- No aria-live: the range is read with the buttons, a live region read it twice. -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs tabular-nums text-ink-muted">
              {{ SS.range(rangeFrom, rangeTo, rows.length) }}
            </p>
            <div v-if="pageCount > 1" class="flex gap-2">
              <button type="button" :class="PAGER_BTN" :disabled="page === 0" @click="page--">
                {{ SS.previous }}
              </button>
              <button
                type="button"
                :class="PAGER_BTN"
                :disabled="page >= pageCount - 1"
                @click="page++"
              >
                {{ SS.next }}
              </button>
            </div>
          </div>
        </template>

        <!-- Rūšys / Savivaldybės: totals first, one row per group; the name is the action. -->
        <div v-else class="overflow-x-auto">
          <table :class="TABLE">
            <caption class="sr-only">
              {{
                caption
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col" :class="[TH, TEXT, 'pl-0']">
                  {{ active === 'rusys' ? SS.colSpecies : SS.colMunicipality }}
                </th>
                <th scope="col" :class="[TH, NUM]">{{ COL_OBSERVATIONS }}</th>
                <th scope="col" :class="[TH, NUM]">{{ COL_ANIMALS }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" :class="[TOTALS_CELL, 'pl-0 text-left']">{{ SS.totals }}</th>
                <td :class="[TOTALS_CELL, NUM]">{{ formatInt(rows.length) }}</td>
                <td :class="[TOTALS_CELL, NUM]">{{ animalsText(animalsOf(rows)) }}</td>
              </tr>
              <tr v-for="g in groups" :key="g.key" :class="TR">
                <th scope="row" :class="[TD, TD_BG, 'pl-0 font-normal']">
                  <span class="flex items-center gap-2">
                    <span
                      v-if="active === 'rusys'"
                      class="inline-block h-3 w-3 shrink-0 rounded-full"
                      :style="{ background: speciesColor(g.key) }"
                      aria-hidden="true"
                    />
                    <button
                      v-if="groupAction(g)"
                      type="button"
                      :class="ROW_ACTION"
                      :aria-label="SS.showOnMapOf(g.label)"
                      :title="SS.showOnMap"
                      @click="showGroup(g)"
                    >
                      <span>{{ g.label }}</span>
                      <UiIcon name="pin" :size="16" :class="ROW_ACTION_PIN" aria-hidden="true" />
                    </button>
                    <span v-else>{{ g.label }}</span>
                  </span>
                </th>
                <td :class="[TD, TD_BG, NUM]">{{ formatInt(g.n) }}</td>
                <td :class="[TD, TD_BG, NUM]">{{ animalsText(g.animals) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
import {
  BTN_SECONDARY,
  BTN_TEXT,
  FOCUS_RING,
  INLINE_LINK,
  PILL_TAB,
  PILL_TAB_ON,
} from '@/components/hunting/hub/shell/controls';
import {
  NUM,
  PAGER_BTN,
  ROW_ACTION,
  ROW_ACTION_PIN,
  ROW_ICON_BTN,
  SORT_BTN,
  SORT_ICON,
  SORT_ICON_IDLE,
  SORT_ICON_ON,
  SORT_LABEL_ON,
  TABLE,
  TD,
  TD_BG,
  TEXT,
  TH,
  TOTALS_CELL,
  TR,
} from '@/components/hunting/hub/table/spec';
import { mpvName } from '@/components/hunting/hub/table/text';

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

// Summary table heads in the nominative plural, as the other hub tables (DATAVIZ-11).
const COL_OBSERVATIONS = 'Stebėjimai';
const COL_ANIMALS = 'Gyvūnai';
const cardTitleButton = `-mx-1 -my-2 inline-flex min-h-[44px] w-[calc(100%+0.5rem)] items-center justify-between gap-2 rounded px-1 text-left text-[15px] font-semibold leading-5 text-brand tabular-nums underline-offset-2 hover:underline ${FOCUS_RING}`;

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
  return sav === null ? SS.allPlacesLower : ctx.meta.nameOf(sav) || `${sav}`;
});
// Heading and caption: the table's own title, then the period and place.
const caption = computed(() =>
  SS.caption(SS.tableTitles[active.value], ctx.derived.periodLabel.value, placeCaption.value),
);
const title = caption;

// Every public field of a record for its phone card (the title has date and species).
const cardFields = (r: StebRecord) => [
  { label: SS.colCount, value: countText(r) },
  { label: SS.colFact, value: factText(r) },
  { label: SS.colMunicipality, value: r.municipality || NOT_SET_LABEL },
  { label: SS.colEldership, value: r.eldership || NOT_SET_LABEL },
  { label: SS.cardMpv, value: mpvName(r.huntingArea) || NOT_SET_LABEL },
];

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
  sortKey.value === key ? (sortDir.value === 'asc' ? '▲' : '▼') : '↕';

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
