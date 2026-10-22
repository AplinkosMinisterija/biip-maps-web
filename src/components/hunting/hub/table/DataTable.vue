<template>
  <div class="flex flex-col gap-3 text-sm text-ink" :class="fill ? 'h-full min-h-0' : ''">
    <div class="relative max-w-full overflow-auto" :class="fill ? 'flex-1 min-h-0' : ''">
      <!-- At most 960 px while the columns fit, so the numbers stay near their names. -->
      <table :class="[TABLE, 'max-w-[960px]']">
        <caption class="sr-only">
          {{
            caption
          }}
        </caption>
        <thead ref="theadEl">
          <tr>
            <th
              v-for="(col, i) in table.columns"
              :key="col.id"
              scope="col"
              :class="[TH, i === 0 ? `${STICKY_FIRST} z-30 pl-0` : '', col.numeric ? NUM : TEXT]"
              :aria-sort="ariaSort(currentSort, col.id)"
              :title="col.tooltip"
            >
              <button
                type="button"
                :class="[SORT_BTN, col.numeric ? 'justify-end text-right' : 'text-left']"
                @click="toggleSort(col)"
              >
                <span
                  aria-hidden="true"
                  :class="[
                    SORT_ICON,
                    col.numeric ? 'order-first' : '',
                    sortDir(col.id) ? SORT_ICON_ON : SORT_ICON_IDLE,
                  ]"
                  v-text="sortIcon(sortDir(col.id))"
                />
                <span :class="sortDir(col.id) ? SORT_LABEL_ON : ''">{{ col.label }}</span>
                <span v-if="col.tooltip" class="sr-only">. {{ col.tooltip }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Totals first (SPEC2 §10): the first tbody row, with a row header; it stays under
               the header while the rows scroll. -->
          <tr v-if="table.totals">
            <template v-for="(col, i) in table.columns" :key="col.id">
              <th
                v-if="i === 0"
                scope="row"
                :class="[TOTALS_CELL, STICKY_FIRST, 'z-[15] pl-0']"
                :style="totalsStyle"
              >
                {{ totalsLabel }}
              </th>
              <td
                v-else
                :class="[TOTALS_CELL, 'sticky z-10', col.numeric ? NUM : TEXT]"
                :style="totalsStyle"
              >
                <HuntingHubTableCell :col="col" :row="table.totals" />
              </td>
            </template>
          </tr>
          <tr v-for="(row, r) in rows" :key="rowKey(row, r)" :class="TR">
            <template v-for="(col, i) in table.columns" :key="col.id">
              <th
                v-if="i === 0"
                scope="row"
                :class="[
                  TD,
                  STICKY_FIRST,
                  'pl-0 font-normal whitespace-nowrap',
                  isSelected(row) ? TD_SELECTED : TD_BG,
                ]"
              >
                <RowName
                  :text="cellText(col, row)"
                  :sav="savOf(row)"
                  :selected="isSelected(row)"
                  @show-on-map="(code: number) => emit('show-on-map', code)"
                />
              </th>
              <td
                v-else
                :class="[TD, col.numeric ? NUM : TEXT, isSelected(row) ? TD_SELECTED : TD_BG]"
              >
                <HuntingHubTableCell :col="col" :row="row" />
              </td>
            </template>
          </tr>
          <!-- Rows without figures of their own (pooled, no MPV): last, whatever the sort,
               each with one note over the columns it has no value for. -->
          <template v-if="noted.length">
            <tr aria-hidden="true">
              <td :colspan="table.columns.length" :class="DIVIDER_CELL" />
            </tr>
            <tr v-for="(row, r) in noted" :key="rowKey(row, rows.length + r)" :class="TR">
              <th
                scope="row"
                :class="[
                  TD,
                  STICKY_FIRST,
                  'pl-0 font-normal whitespace-nowrap',
                  isSelected(row) ? TD_SELECTED : TD_BG,
                ]"
              >
                <RowName
                  :text="cellText(table.columns[0], row)"
                  :sav="savOf(row)"
                  :selected="isSelected(row)"
                  @show-on-map="(code: number) => emit('show-on-map', code)"
                />
              </th>
              <td
                v-for="col in table.columns.slice(1, noteOf(row).from)"
                :key="col.id"
                :class="[TD, col.numeric ? NUM : TEXT, isSelected(row) ? TD_SELECTED : TD_BG]"
              >
                <HuntingHubTableCell :col="col" :row="row" />
              </td>
              <td
                :colspan="table.columns.length - noteOf(row).from"
                :class="[
                  TD,
                  'pr-2 text-right text-[13px] text-ink-muted',
                  isSelected(row) ? TD_SELECTED : TD_BG,
                ]"
              >
                {{ noteOf(row).text }}
              </td>
            </tr>
          </template>
          <tr v-if="!rows.length && !noted.length">
            <td :colspan="table.columns.length" class="py-3 text-ink-muted">{{ S.empty }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul v-if="table.footnotes.length" :class="[FOOTNOTES, 'max-w-[960px]']">
      <li v-for="(note, i) in table.footnotes" :key="i">{{ note }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue';
import { useElementSize } from '@vueuse/core';
import { S } from '@/utils/hunting/hub/strings';
import type { ColumnDef, RowNote, TableDef } from '@/utils/hunting/hub/types';
import RowName from './RowName.vue';
import { ariaSort, cellText, nextSort, notedRows, sortRows, type SortState } from './sort';
import {
  DIVIDER_CELL,
  FOOTNOTES,
  NUM,
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
  TEXT,
  TH,
  TOTALS_CELL,
  TR,
  sortIcon,
} from './spec';

// Generic sortable table of the hub (SPEC2 §10, one spec with the wolves and Stebėjimai
// tables: ./spec.ts): caption, `scope`, `aria-sort`, a totals row as the first tbody row,
// sticky header, totals and first column, "<3" cells with their explanation, and rows with a
// note (pooled, no MPV) kept last. The sort state can be controlled (v-model:sort, shared
// with CardList) or kept here.
const props = defineProps({
  table: { type: Object as PropType<TableDef>, required: true },
  caption: { type: String, required: true },
  sort: { type: Object as PropType<SortState | null>, default: undefined },
  selectedSav: { type: Number as PropType<number | null>, default: null },
  // Fill the parent's height and scroll inside (keeps the sticky header in view); the
  // parent must be a sized flex column.
  fill: { type: Boolean, default: false },
});
const emit = defineEmits(['update:sort', 'show-on-map']);

const localSort = ref<SortState | null>(props.table.defaultSort ?? null);
const currentSort = computed(() => (props.sort === undefined ? localSort.value : props.sort));

const rows = computed(() => sortRows(props.table, currentSort.value, false));
const noted = computed(() => notedRows(props.table));
const noteOf = (row: unknown) => props.table.rowNote!(row) as RowNote;

// The totals row sticks right under the header, whatever height its labels wrap to.
const theadEl = ref<HTMLElement | null>(null);
const { height: theadHeight } = useElementSize(theadEl, undefined, { box: 'border-box' });
const totalsStyle = computed(() => ({ top: `${Math.round(theadHeight.value)}px` }));

const totalsLabel = computed(() => {
  const first = props.table.columns[0];
  if (!first || !props.table.totals) return S.totalsRow;
  const text = cellText(first, props.table.totals);
  return text && text !== '–' ? text : S.totalsRow;
});

function toggleSort(col: ColumnDef<any>) {
  const next = nextSort(currentSort.value, col);
  localSort.value = next;
  emit('update:sort', next);
}

const sortDir = (colId: string) =>
  currentSort.value?.col === colId ? currentSort.value.dir : null;

const savOf = (row: unknown) => props.table.rowSav?.(row) ?? null;
const isSelected = (row: unknown) => {
  const code = savOf(row);
  return code !== null && code === props.selectedSav;
};
const rowKey = (row: unknown, index: number) => {
  const code = savOf(row);
  return code !== null ? `sav-${code}` : `row-${index}`;
};
</script>
