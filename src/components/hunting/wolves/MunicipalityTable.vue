<template>
  <div ref="rootEl" class="flex flex-col gap-3 text-sm text-ink">
    <!-- Phones: the hub's card list, as Laimikiai (JOURNEYS-07). -->
    <HuntingHubTableCardList
      v-if="ctx.isMobile.value"
      v-model:sort="cardSort"
      :table="table"
      :caption="caption"
      :selected-sav="state.sav.value"
      @show-on-map="selectMunicipality"
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
            <th scope="col" :class="[TH, STICKY_FIRST, 'z-30 pl-0']" :aria-sort="ariaSort('name')">
              <button type="button" :class="SORT_BTN" @click="toggleSort('name')">
                <span :class="sortKey === 'name' ? SORT_LABEL_ON : ''">Savivaldybė</span>
                <span
                  aria-hidden="true"
                  :class="[SORT_ICON, sortKey === 'name' ? SORT_ICON_ON : SORT_ICON_IDLE]"
                  v-text="sortArrow('name')"
                />
              </button>
            </th>
            <th scope="col" :class="[TH, NUM]" :aria-sort="ariaSort('count')">
              <button type="button" :class="[SORT_BTN, 'justify-end']" @click="toggleSort('count')">
                <span
                  aria-hidden="true"
                  :class="[SORT_ICON, sortKey === 'count' ? SORT_ICON_ON : SORT_ICON_IDLE]"
                  v-text="sortArrow('count')"
                />
                <span :class="sortKey === 'count' ? SORT_LABEL_ON : ''">Vilkai</span>
              </button>
            </th>
            <th scope="col" :class="[TH, NUM]">Suaugę</th>
            <th scope="col" :class="[TH, NUM]">Jaunikliai</th>
            <th scope="col" :class="[TH, NUM]">Patinai</th>
            <th scope="col" :class="[TH, NUM]">Patelės</th>
            <th scope="col" :class="[TH, NUM, 'pr-0']">Paskutinio data</th>
          </tr>
        </thead>
        <tbody>
          <!-- Totals first (as every hub table): the national figures. -->
          <tr>
            <th scope="row" :class="[TOTALS_CELL, STICKY_FIRST, 'pl-0']">
              Iš viso su žinoma vieta
            </th>
            <td :class="[TOTALS_CELL, NUM]">{{ formatInt(totals.count) }}</td>
            <td :class="[TOTALS_CELL, NUM]">{{ formatInt(totals.adults) }}</td>
            <td :class="[TOTALS_CELL, NUM]">{{ formatInt(totals.juniors) }}</td>
            <td :class="[TOTALS_CELL, NUM]">{{ formatInt(totals.males) }}</td>
            <td :class="[TOTALS_CELL, NUM]">{{ formatInt(totals.females) }}</td>
            <td :class="[TOTALS_CELL, NUM, 'pr-0']">{{ totals.lastDay || DASH }}</td>
          </tr>
          <!-- A closed season: the official AM figure where the located total is read (J-02). -->
          <tr v-if="reconcile">
            <th scope="row" :class="[TD, TD_BG, STICKY_FIRST, 'pl-0 font-normal text-ink-muted']">
              {{ reconcile.unknown === null ? 'Oficialus AM skaičius' : 'Vieta nežinoma' }}
            </th>
            <td :class="[TD, NUM, 'text-ink-muted']">
              {{ formatInt(reconcile.unknown ?? reconcile.official) }}
            </td>
            <td colspan="5" :class="[TD, 'pr-0 text-xs text-ink-muted']">
              {{
                reconcile.unknown === null
                  ? 'Skaičiuojama kitaip (žr. „Apie duomenis“).'
                  : `Oficialus AM skaičius – ${formatInt(reconcile.official)}`
              }}
            </td>
          </tr>
          <tr v-for="row in visibleRows" :key="row.code ?? 'none'" :class="TR">
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
                :aria-label="`${row.name}: ${row.count}. Rodyti šią savivaldybę.`"
                @click="selectMunicipality(row.code)"
              >
                <span>{{ row.name }}</span>
                <UiIcon name="pin" :size="16" :class="ROW_ACTION_PIN" aria-hidden="true" />
              </button>
              <span v-else class="text-ink-muted">{{ row.name }}</span>
            </th>
            <td v-for="key in VALUE_KEYS" :key="key" :class="[TD, NUM, cellBg(row)]">
              {{ formatInt(row[key]) }}
            </td>
            <td :class="[TD, NUM, 'pr-0', cellBg(row)]">{{ row.lastDay || DASH }}</td>
          </tr>
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

    <ul :class="FOOTNOTES">
      <li v-if="selectedName">
        Lentelėje rodomos visos savivaldybės; pasirinkta „{{ selectedName }}“ paryškinta.
      </li>
      <li>
        Savivaldybė nustatyta pagal sumedžiojimo vietą; prie ribų galimas nedidelis netikslumas.
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import Scroller from '@/components/hunting/hub/table/Scroller.vue';
import { revealRow } from '@/components/hunting/hub/table/reveal';
import type { SortState } from '@/components/hunting/hub/table/sort';
import type { TableDef } from '@/utils/hunting/hub/types';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { loadMunicipalityIndex, type MunicipalityIndex } from '@/utils/hunting/municipalities';
import { formatInt } from '@/utils/hunting/dates';
import { countByMunicipality, filterRecords, type MunicipalityCount } from '@/utils/hunting/wolves';
import { DASH } from '@/utils/hunting/hub/topics/common';
import { HUB_CTX } from '@/composables/hunting/hub/context';
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

type Row = Omit<MunicipalityCount, 'lastDay'> & { lastDay: string | null };
const VALUE_KEYS = ['count', 'adults', 'juniors', 'males', 'females'] as const;

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
const sortKey = ref<'count' | 'name'>('count');
const sortDir = ref<'asc' | 'desc'>('desc');

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

const sortedRows = computed(() => {
  const rows = [...rowsByCode.value.values()].filter((r) => r.code !== null);
  const dir = sortDir.value === 'asc' ? 1 : -1;
  rows.sort((a, b) =>
    sortKey.value === 'count'
      ? dir * (a.count - b.count) || a.name.localeCompare(b.name, 'lt')
      : dir * a.name.localeCompare(b.name, 'lt'),
  );
  const unassigned = rowsByCode.value.get(null);
  if (unassigned?.count) rows.push(unassigned);
  return rows;
});

const zeroCount = computed(() => sortedRows.value.filter((r) => r.count === 0).length);
const visibleRows = computed(() =>
  showZero.value ? sortedRows.value : sortedRows.value.filter((r) => r.count > 0),
);

const totals = computed<Row>(() => {
  const total = emptyRow(null, '');
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

const selectedName = computed(() =>
  state.sav.value == null ? null : rowsByCode.value.get(state.sav.value)?.name || null,
);

function toggleSort(key: 'count' | 'name') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'count' ? 'desc' : 'asc';
  }
}
const ariaSort = (key: 'count' | 'name') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none';
const sortArrow = (key: 'count' | 'name') =>
  sortKey.value === key ? (sortDir.value === 'asc' ? '▲' : '▼') : '↕';
const isSelected = (row: Row) => row.code !== null && row.code === state.sav.value;
const cellBg = (row: Row) => (isSelected(row) ? TD_SELECTED : TD_BG);

const caption = computed(() => `Sumedžioti vilkai pagal savivaldybes: ${periodLabel.value}`);

// The table as a hub TableDef: the phone cards and the CSV of what the screen shows
// (REGRESS-03): the shown rows in the shown order, totals first, the same notes.
const TABLE_COLUMNS: { id: (typeof VALUE_KEYS)[number]; label: string }[] = [
  { id: 'count', label: 'Vilkai' },
  { id: 'adults', label: 'Suaugę' },
  { id: 'juniors', label: 'Jaunikliai' },
  { id: 'males', label: 'Patinai' },
  { id: 'females', label: 'Patelės' },
];
const fileSuffix = computed(() => {
  const season = derived.intervalSeason.value;
  const { from, to } = state.interval.value;
  return season !== null ? `${season}-${season + 1}` : `${from}_${to}`;
});
const table = computed<TableDef<Row>>(() => ({
  id: 'savivaldybes',
  label: 'Savivaldybės',
  title: `Sumedžioti vilkai pagal savivaldybes · ${periodLabel.value}`,
  columns: [
    { id: 'name', label: 'Savivaldybė', value: (r) => r.name },
    ...TABLE_COLUMNS.map((c) => ({
      id: c.id,
      label: c.label,
      numeric: true,
      value: (r: Row) => r[c.id],
    })),
    { id: 'lastDay', label: 'Paskutinis', value: (r) => r.lastDay },
  ],
  rows: visibleRows.value,
  totals: { ...totals.value, name: 'Iš viso Lietuvoje' },
  footnotes: [
    ...(selectedName.value
      ? [`Lentelėje rodomos visos savivaldybės; pasirinkta „${selectedName.value}“ paryškinta.`]
      : []),
    'Savivaldybė nustatyta pagal sumedžiojimo vietą; prie ribų galimas nedidelis netikslumas.',
  ],
  rowSav: (r) => r.code,
  csvName: `vilkai-savivaldybes-${fileSuffix.value}`,
}));
// The cards' own sort ("Kaip lentelėje" = the table's order above).
const cardSort = ref<SortState | null>(null);
defineExpose({ table });

// The selected municipality's row in view inside the table (JOURNEYS-07), on open and when
// the selection changes.
const rootEl = ref<HTMLElement | null>(null);
function revealSelected() {
  nextTick(() => revealRow(rootEl.value?.querySelector<HTMLElement>('[data-selected]'), 80));
}
onMounted(revealSelected);
watch([() => state.sav.value, index, sortKey, sortDir], revealSelected);

function selectMunicipality(code: number) {
  const next = state.sav.value === code ? null : code;
  state.sav.value = next;
  const info = next !== null ? index.value?.byCode[next] : null;
  if (info && mapLayers) {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    mapLayers.zoomToExtent(info.extent3857, { animate: !reduceMotion, maxZoom: 12 });
  }
}
</script>
