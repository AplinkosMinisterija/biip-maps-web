<template>
  <div ref="rootEl" class="flex flex-col gap-3 text-sm text-ink">
    <!-- Phones: the hub's card list, as Laimikiai (JOURNEYS-07). Desktop table, cards and the
         CSV read one model (`table`) and one sort (the parent's v-model:sort). -->
    <HuntingHubTableCardList
      v-if="ctx.isMobile.value"
      :sort="sort"
      :table="table"
      :caption="caption"
      :selected-sav="state.sav.value"
      @update:sort="setSort"
      @show-on-map="showOnMap"
    />
    <Scroller v-else sticky-first>
      <table :class="TABLE">
        <caption class="sr-only">
          {{
            caption
          }}
        </caption>
        <thead>
          <tr>
            <th
              v-for="(col, i) in table.columns"
              :key="col.id"
              scope="col"
              :class="[
                TH,
                i === 0 ? [STICKY_FIRST, 'z-30 pl-0'] : NUM,
                i === table.columns.length - 1 ? 'pr-0' : '',
              ]"
              :aria-sort="SORTABLE.includes(col.id) ? ariaSort(shownSort, col.id) : undefined"
            >
              <button
                v-if="SORTABLE.includes(col.id)"
                type="button"
                :class="[SORT_BTN, col.numeric ? 'justify-end' : '']"
                @click="toggleSort(col)"
              >
                <span
                  aria-hidden="true"
                  :class="[
                    SORT_ICON,
                    sortIconOrder(!!col.numeric),
                    shownSort.col === col.id ? SORT_ICON_ON : SORT_ICON_IDLE,
                  ]"
                  v-text="sortArrow(col.id)"
                />
                <span :class="shownSort.col === col.id ? SORT_LABEL_ON : ''">{{ col.label }}</span>
              </button>
              <template v-else>{{ col.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Totals first (as every hub table): the national figures. -->
          <tr>
            <th scope="row" :class="[TOTALS_CELL, STICKY_FIRST, 'pl-0']">
              {{ table.totals!.name }}
            </th>
            <td
              v-for="(col, i) in valueColumns"
              :key="col.id"
              :class="[TOTALS_CELL, NUM, i === valueColumns.length - 1 ? 'pr-0' : '']"
            >
              {{ cellText(col, table.totals!) }}
            </td>
          </tr>
          <template v-for="row in shownRows" :key="rowKey(row)">
            <!-- A closed season: the official AM figure as its own row, never a difference. -->
            <tr v-if="row.official" :class="TR">
              <th scope="row" :class="[TD, TD_BG, STICKY_FIRST, 'pl-0 font-normal text-ink-muted']">
                {{ row.name }}
              </th>
              <td :class="[TD, TD_BG, NUM, 'text-ink-muted']">{{ formatInt(row.count) }}</td>
              <td
                :colspan="table.columns.length - NOTE_FROM"
                :class="[TD, TD_BG, 'pr-0 text-xs text-ink-muted']"
              >
                {{ OFFICIAL_NOTE }}
              </td>
            </tr>
            <tr v-else :class="TR">
              <th
                scope="row"
                :data-selected="isSelected(row) || undefined"
                :class="[
                  TD,
                  STICKY_FIRST,
                  'pl-0 font-normal',
                  isSelected(row) ? [TD_SELECTED, TD_SELECTED_FIRST] : TD_BG,
                ]"
              >
                <button
                  v-if="row.code !== null"
                  type="button"
                  :class="ROW_ACTION"
                  :aria-pressed="row.code === state.sav.value"
                  :aria-label="rowActionLabel(row)"
                  :title="hub ? S.showOnMap : undefined"
                  @click="onRowAction(row.code)"
                >
                  <span>{{ row.name }}</span>
                  <UiIcon name="pin" :size="16" :class="ROW_ACTION_PIN" aria-hidden="true" />
                </button>
                <span v-else class="text-ink-muted">{{ row.name }}</span>
              </th>
              <td
                v-for="(col, i) in valueColumns"
                :key="col.id"
                :class="[TD, NUM, i === valueColumns.length - 1 ? 'pr-0' : '', cellBg(row)]"
              >
                {{ cellText(col, row) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </Scroller>

    <button
      v-if="zeroCount > 0"
      type="button"
      :class="[BTN_TEXT, BTN_TEXT_TOUCH, 'self-start md:min-h-[32px]']"
      :aria-expanded="showZero"
      @click="showZero = !showZero"
    >
      {{
        showZero
          ? 'Slėpti savivaldybes be sumedžiotų vilkų'
          : `Rodyti savivaldybes be sumedžiotų vilkų (${zeroCount})`
      }}
    </button>

    <ul v-if="!ctx.isMobile.value" :class="FOOTNOTES">
      <li v-for="(note, i) in table.footnotes" :key="i">{{ note }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, shallowRef, watch, type PropType } from 'vue';
import Scroller from '@/components/hunting/hub/table/Scroller.vue';
import { revealRow } from '@/components/hunting/hub/table/reveal';
import {
  ariaSort,
  cellText,
  nextSort,
  sortRows,
  type SortState,
} from '@/components/hunting/hub/table/sort';
import type { ColumnDef, TableDef } from '@/utils/hunting/hub/types';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { loadMunicipalityIndex, type MunicipalityIndex } from '@/utils/hunting/municipalities';
import { formatInt } from '@/utils/hunting/dates';
import { countByMunicipality, filterRecords, type MunicipalityCount } from '@/utils/hunting/wolves';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { csvName } from '@/utils/hunting/hub/topics/common';
import { vilkaiReconcile } from '@/utils/hunting/hub/topics/vilkai';
import { BTN_TEXT, BTN_TEXT_TOUCH } from '@/components/hunting/hub/shell/controls';
import {
  FOOTNOTES,
  NUM,
  ROW_ACTION,
  ROW_ACTION_PIN,
  SORT_BTN,
  SORT_ICON,
  SORT_ICON_IDLE,
  SORT_ICON_ON,
  SORT_LABEL_ON,
  sortIconOrder,
  STICKY_FIRST,
  TABLE,
  TD,
  TD_BG,
  TD_SELECTED,
  TD_SELECTED_FIRST,
  TH,
  TOTALS_CELL,
  TR,
} from '@/components/hunting/hub/table/spec';

// `official`: the official AM figure of a closed season, a row of its own (J-02).
type Row = Omit<MunicipalityCount, 'lastDay'> & { lastDay: string | null; official?: true };
const VALUE_KEYS = ['count', 'adults', 'juniors', 'males', 'females'] as const;
// The desktop table sorts by these (the cards by every column).
const SORTABLE = ['name', 'count'];
// The official row has the count only; a note spans the columns from this index on.
const NOTE_FROM = 2;
const OFFICIAL_NOTE = 'Skaičiuojamas kitaip nei vilkai su žinoma vieta.';
// Order until the visitor sorts: most wolves first, then by name (`sort` null).
const DEFAULT_SORT: SortState = { col: 'count', dir: 'desc' };

const emptyRow = (code: number | null, name: string): Row => ({
  code,
  name,
  count: 0,
  adults: 0,
  juniors: 0,
  males: 0,
  females: 0,
  lastDay: null,
});

// The sort of the table, the cards and the CSV (owned by the drawer, which has the CSV
// button); null = the default order.
const props = defineProps({
  sort: { type: Object as PropType<SortState | null>, default: undefined },
});
// 'show-on-map' (code: number): the parent gives way to the map (closes the table or
// collapses the sheet), as for the records table.
const emit = defineEmits(['update:sort', 'show-on-map']);

const ctx = inject(WOLVES_CTX)!;
const { state, derived, data } = ctx;
// The hub (optional): its snapshot meta holds the official AM count per season.
const hub = inject(HUB_CTX, null);
const mapLayers: any = inject('mapLayers');

const index = shallowRef<MunicipalityIndex | null>(null);
onMounted(async () => {
  try {
    index.value = await loadMunicipalityIndex();
  } catch (err) {
    // The table still works from the records' own names; zero rows are unknown then.
    index.value = null;
  }
});

const showZero = ref(false);
// Uncontrolled (no v-model:sort): a sort of its own.
const localSort = ref<SortState | null>(null);
const sort = computed(() => (props.sort === undefined ? localSort.value : props.sort));
function setSort(next: SortState | null) {
  localSort.value = next;
  emit('update:sort', next);
}

const periodLabel = computed(() => {
  const season = derived.intervalSeason.value;
  const { from, to } = state.interval.value;
  if (season !== null) return `${season}/${season + 1} sezonas`;
  return from === to ? from : `${from} – ${to}`;
});

// The table compares municipalities, so it applies the interval and the attribute filters
// but not `sav`: a selected municipality is highlighted, and the footer stays the national
// total. Counting uses the shared countByMunicipality() (ADULT and TWO_YEAR are adults).
const base = computed(() =>
  filterRecords(data.dataset.value?.records || [], {
    interval: state.interval.value,
    sav: null,
    age: state.attrs.value.age,
    sex: state.attrs.value.sex,
    method: state.attrs.value.method,
  }),
);
const counts = computed(() => countByMunicipality(base.value));

const rowsByCode = computed(() => {
  const map = new Map<number | null, Row>();
  index.value?.list.forEach((m) => map.set(m.code, emptyRow(m.code, m.name)));
  counts.value.forEach((c) => {
    const name = map.get(c.code)?.name || c.name;
    map.set(c.code, { ...c, name });
  });
  return map;
});

// Municipalities in the default order; the unassigned row last.
const allRows = computed(() => {
  const rows = [...rowsByCode.value.values()].filter((r) => r.code !== null);
  rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'lt'));
  const unassigned = rowsByCode.value.get(null);
  if (unassigned?.count) rows.push(unassigned);
  return rows;
});

const zeroCount = computed(() => allRows.value.filter((r) => r.count === 0).length);
const visibleRows = computed(() =>
  showZero.value ? allRows.value : allRows.value.filter((r) => r.count > 0),
);

const totals = computed<Row>(() => {
  const total = emptyRow(null, 'Iš viso su žinoma vieta');
  counts.value.forEach((c) => {
    total.count += c.count;
    total.adults += c.adults;
    total.juniors += c.juniors;
    total.males += c.males;
    total.females += c.females;
    if (!total.lastDay || c.lastDay > total.lastDay) total.lastDay = c.lastDay;
  });
  return total;
});

// The totals row ignores `sav`, so only attribute filters keep the official figure away.
const reconcile = computed(() => {
  const attrs = state.attrs.value;
  if (attrs.age.length || attrs.sex.length || attrs.method.length) return null;
  return vilkaiReconcile(
    hub?.data.snapshot.value?.meta,
    derived.intervalSeason.value,
    ctx.currentSeason,
    totals.value.count,
  );
});
const officialRow = computed<Row | null>(() =>
  reconcile.value
    ? {
        ...emptyRow(null, 'Oficialus AM skaičius'),
        count: reconcile.value.official,
        official: true,
      }
    : null,
);

const selectedName = computed(() =>
  state.sav.value == null ? null : rowsByCode.value.get(state.sav.value)?.name || null,
);

const caption = computed(() => `Sumedžioti vilkai pagal savivaldybes: ${periodLabel.value}`);

// The one model of the table (REGRESS-03): the desktop table, the phone cards and the CSV
// show the same rows, totals first, the official AM figure as its own row (kept last, with
// its note), the same notes. Sort keys: the unassigned row stays last in either direction.
// The table lists every municipality, so the file name has no place in it (as in the hub).
const fileName = computed(() => {
  const season = derived.intervalSeason.value;
  const { from, to } = state.interval.value;
  return season !== null
    ? csvName('vilkai', 'savivaldybes', season)
    : csvName('vilkai', 'savivaldybes', null, `${from}-${to}`);
});
const VALUE_COLUMNS: { id: (typeof VALUE_KEYS)[number]; label: string }[] = [
  { id: 'count', label: 'Vilkai' },
  { id: 'adults', label: 'Suaugę' },
  { id: 'juniors', label: 'Jaunikliai' },
  { id: 'males', label: 'Patinai' },
  { id: 'females', label: 'Patelės' },
];
const assigned = (r: Row, value: string | number | null) => (r.code === null ? null : value);
const COLUMNS: ColumnDef<Row>[] = [
  { id: 'name', label: 'Savivaldybė', value: (r) => r.name, sort: (r) => assigned(r, r.name) },
  ...VALUE_COLUMNS.map(
    (c): ColumnDef<Row> => ({
      id: c.id,
      label: c.label,
      numeric: true,
      value: (r) => (r.official && c.id !== 'count' ? null : r[c.id]),
      sort: (r) => assigned(r, r[c.id]),
    }),
  ),
  {
    id: 'lastDay',
    label: 'Paskutinio data',
    value: (r) => r.lastDay,
    sort: (r) => assigned(r, r.lastDay),
  },
];
const table = computed<TableDef<Row>>(() => ({
  id: 'savivaldybes',
  label: 'Savivaldybės',
  title: `Sumedžioti vilkai pagal savivaldybes · ${periodLabel.value}`,
  columns: COLUMNS,
  rows: officialRow.value ? [...visibleRows.value, officialRow.value] : visibleRows.value,
  totals: totals.value,
  rowNote: (r) => (r.official ? { text: OFFICIAL_NOTE, from: NOTE_FROM } : null),
  footnotes: [
    ...(selectedName.value
      ? [`Lentelėje rodomos visos savivaldybės; pasirinkta „${selectedName.value}“ paryškinta.`]
      : []),
    'Savivaldybė nustatyta pagal sumedžiojimo vietą; prie ribų galimas nedidelis netikslumas.',
  ],
  rowSav: (r) => r.code,
  csvName: fileName.value,
}));
defineExpose({ table });

const valueColumns = computed(() => table.value.columns.slice(1));
const shownRows = computed(() => sortRows(table.value, sort.value));
// The header shows the default order as a sort by "Vilkai".
const shownSort = computed(() => sort.value ?? DEFAULT_SORT);

function toggleSort(col: ColumnDef<Row>) {
  setSort(nextSort(shownSort.value, col));
}
const sortArrow = (id: string) =>
  shownSort.value.col === id ? (shownSort.value.dir === 'asc' ? '▲' : '▼') : '↕';
const isSelected = (row: Row) => row.code !== null && row.code === state.sav.value;
const cellBg = (row: Row) => (isSelected(row) ? TD_SELECTED : TD_BG);
const rowKey = (row: Row) => (row.official ? 'official' : (row.code ?? 'none'));

// The selected municipality's row in view inside the table (JOURNEYS-07), on open and when
// the selection changes.
const rootEl = ref<HTMLElement | null>(null);
function revealSelected() {
  nextTick(() => revealRow(rootEl.value?.querySelector<HTMLElement>('[data-selected]'), 80));
}
onMounted(revealSelected);
watch([() => state.sav.value, index, sort], revealSelected);

function zoomTo(code: number) {
  const info = index.value?.byCode[code];
  if (info && mapLayers) {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    mapLayers.zoomToExtent(info.extent3857, { animate: !reduceMotion, maxZoom: 12 });
  }
}

// "Rodyti žemėlapyje" (the cards; the rows in the hub, where the table covers the map):
// select the municipality, zoom to it and let the parent show the map. In the hub the
// Vilkai topic zooms on every municipality change itself (not when it stays the same).
function showOnMap(code: number) {
  const same = state.sav.value === code;
  state.sav.value = code;
  if (!hub || same) zoomTo(code);
  emit('show-on-map', code);
}

// The wolves page's drawer leaves the map beside it: its rows toggle the selection.
function onRowAction(code: number) {
  if (hub) return showOnMap(code);
  const next = state.sav.value === code ? null : code;
  state.sav.value = next;
  if (next !== null) zoomTo(next);
}
const rowActionLabel = (row: Row) =>
  hub
    ? `${row.name}: ${formatInt(row.count)}. ${S.showOnMap}`
    : `${row.name}: ${formatInt(row.count)}. Rodyti šią savivaldybę.`;
</script>
