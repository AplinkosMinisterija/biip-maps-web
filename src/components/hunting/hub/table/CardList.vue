<template>
  <div class="flex flex-col gap-3 text-sm text-ink">
    <div class="flex items-center gap-2">
      <label :for="selectId" class="text-[13px] font-semibold text-ink-muted">Rikiuoti</label>
      <select
        :id="selectId"
        :class="[FIELD, 'h-11 min-w-0 flex-1 text-sm']"
        :value="sortValue"
        @change="onSortChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">Kaip lentelėje</option>
        <template v-for="col in table.columns" :key="col.id">
          <option :value="`${col.id}:desc`">
            {{ col.label }} {{ col.numeric ? '(mažėjančiai)' : '(Ž–A)' }}
          </option>
          <option :value="`${col.id}:asc`">
            {{ col.label }} {{ col.numeric ? '(didėjančiai)' : '(A–Ž)' }}
          </option>
        </template>
      </select>
    </div>

    <ul :aria-label="caption" class="flex flex-col gap-2">
      <li v-if="table.totals" :class="[cardClass, 'border-line bg-page']">
        <p class="text-[15px] font-semibold leading-5">{{ totalsLabel }}</p>
        <dl :class="gridClass">
          <div v-for="col in valueColumns" :key="col.id" :class="pairClass">
            <dt :class="dtClass">{{ col.label }}</dt>
            <dd :class="[ddClass, 'font-semibold']">
              <HuntingHubTableCell :col="col" :row="table.totals" />
            </dd>
          </div>
        </dl>
      </li>
      <li
        v-for="(row, r) in rows"
        :key="rowKey(row, r)"
        :class="[cardClass, isSelected(row) ? 'border-brand bg-brand-50' : 'border-line bg-white']"
      >
        <div class="flex items-center justify-between gap-2">
          <!-- The name is the "show on map" action (one control per card). -->
          <button
            v-if="savOf(row) !== null"
            type="button"
            :class="titleButtonClass"
            :aria-current="isSelected(row) ? 'true' : undefined"
            :aria-label="`${nameOf(row)}: ${S.showOnMap}`"
            @click="emit('show-on-map', savOf(row)!)"
          >
            <span>{{ nameOf(row) }}</span>
            <UiIcon name="chevron-right" :size="16" class="shrink-0" aria-hidden="true" />
          </button>
          <p v-else class="text-[15px] font-semibold leading-5">{{ nameOf(row) }}</p>
          <span
            v-if="summaryOf(row)"
            class="shrink-0 text-[15px] leading-5 tabular-nums text-ink-muted"
          >
            {{ summaryOf(row) }}
          </span>
        </div>
        <template v-if="!summaryOf(row)">
          <dl v-if="publishedColumns(row).length" :class="gridClass">
            <div v-for="col in publishedColumns(row)" :key="col.id" :class="pairClass">
              <dt :class="dtClass">{{ col.label }}</dt>
              <dd :class="ddClass"><HuntingHubTableCell :col="col" :row="row" /></dd>
            </div>
          </dl>
          <p v-if="noteOf(row)" class="mt-1 text-[13px] leading-[18px] text-ink-muted">
            {{ noteOf(row)!.text }}
          </p>
        </template>
      </li>
      <li v-if="!rows.length" class="text-ink-muted">{{ S.empty }}</li>
    </ul>

    <!-- Visible under the cards: "<3", ranges and "x" cannot be explained by a hover title on
         touch screens. -->
    <ul v-if="table.footnotes.length" class="flex flex-col gap-1 text-[13px] text-ink-muted">
      <li v-for="(note, i) in table.footnotes" :key="i">{{ note }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import type { ColumnDef, TableDef } from '@/utils/hunting/hub/types';
import { FIELD, FOCUS_RING } from '../shell/controls';
import { cellText, sortRows, type SortDir, type SortState } from './sort';

// Phone (< 600 px) form of a hub table: one card per row with its name and every value of
// the desktop table, in the same order (shared sort state via v-model:sort). The name is the
// "show on map" action. A row with a note (pooled, no MPV) shows the note instead of the
// values it does not have; `cardSummary` folds a row into one line ("0 pranešimų").
const props = defineProps({
  table: { type: Object as PropType<TableDef>, required: true },
  caption: { type: String, required: true },
  sort: { type: Object as PropType<SortState | null>, default: undefined },
  selectedSav: { type: Number as PropType<number | null>, default: null },
});
const emit = defineEmits(['update:sort', 'show-on-map']);

const selectId = computed(() => `hub-cards-sort-${props.table.id}`);

const localSort = ref<SortState | null>(props.table.defaultSort ?? null);
const currentSort = computed(() => (props.sort === undefined ? localSort.value : props.sort));
const sortValue = computed(() =>
  currentSort.value ? `${currentSort.value.col}:${currentSort.value.dir}` : '',
);

function onSortChange(value: string) {
  let next: SortState | null = null;
  if (value) {
    const [col, dir] = value.split(':');
    next = { col, dir: dir as SortDir };
  }
  localSort.value = next;
  emit('update:sort', next);
}

const firstColumn = computed(() => props.table.columns[0]);
// Every value column, in the table's column order.
const valueColumns = computed(() => props.table.columns.slice(1));

const rows = computed(() => sortRows(props.table, currentSort.value));

const totalsLabel = computed(() => {
  const first = firstColumn.value;
  if (!first || !props.table.totals) return S.totalsRow;
  const text = cellText(first, props.table.totals);
  return text && text !== '–' ? text : S.totalsRow;
});

const nameOf = (row: unknown) => (firstColumn.value ? cellText(firstColumn.value, row) : '');
const noteOf = (row: unknown) => props.table.rowNote?.(row) ?? null;
const summaryOf = (row: unknown) => props.table.cardSummary?.(row) ?? null;
// The values a row has: all of them, or those before its note.
const publishedColumns = (row: unknown): ColumnDef<any>[] => {
  const note = noteOf(row);
  return note ? valueColumns.value.slice(0, Math.max(0, note.from - 1)) : valueColumns.value;
};

const savOf = (row: unknown) => props.table.rowSav?.(row) ?? null;
const isSelected = (row: unknown) => {
  const code = savOf(row);
  return code !== null && code === props.selectedSav;
};
const rowKey = (row: unknown, index: number) => {
  const code = savOf(row);
  return code !== null ? `sav-${code}` : `row-${index}`;
};

const cardClass = 'rounded-lg border p-3';
const gridClass = 'mt-1 grid grid-cols-2 gap-x-4 gap-y-1';
const pairClass = 'flex min-w-0 items-baseline justify-between gap-2';
const dtClass = 'min-w-0 text-[13px] leading-[18px] text-ink-muted';
const ddClass = 'shrink-0 text-right text-[15px] leading-5 tabular-nums text-ink';
const titleButtonClass = `-mx-1 -my-2 inline-flex min-h-[44px] min-w-0 items-center gap-1 rounded px-1 text-left text-[15px] font-semibold leading-5 text-brand underline-offset-2 hover:underline ${FOCUS_RING}`;
</script>
