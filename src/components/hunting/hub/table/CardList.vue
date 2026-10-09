<template>
  <div class="flex flex-col gap-3 text-sm text-gray-900">
    <div class="flex items-center gap-2">
      <label :for="selectId" class="text-xs font-semibold text-gray-700">Rikiuoti</label>
      <select
        :id="selectId"
        class="min-h-[44px] min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
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
      <li v-if="table.totals" class="rounded-lg border border-gray-300 bg-gray-50 p-3">
        <p class="font-semibold">{{ totalsLabel }}</p>
        <dl class="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <template v-for="col in valueColumns" :key="col.id">
            <dt class="text-gray-700">{{ col.label }}</dt>
            <dd class="text-right tabular-nums font-semibold">
              <HuntingHubTableCell :col="col" :row="table.totals" />
            </dd>
          </template>
        </dl>
      </li>
      <li
        v-for="(row, r) in rows"
        :key="rowKey(row, r)"
        class="rounded-lg border p-3"
        :class="isSelected(row) ? 'border-blue-700 bg-blue-50' : 'border-gray-200 bg-white'"
      >
        <p class="font-semibold">{{ firstColumn ? cellText(firstColumn, row) : '' }}</p>
        <dl class="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <template v-for="col in valueColumns" :key="col.id">
            <dt class="text-gray-700">{{ col.label }}</dt>
            <dd class="text-right tabular-nums"><HuntingHubTableCell :col="col" :row="row" /></dd>
          </template>
        </dl>
        <button
          v-if="savOf(row) !== null"
          type="button"
          class="mt-2 min-h-[44px] rounded px-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          :aria-label="`${firstColumn ? cellText(firstColumn, row) : ''}: ${S.showOnMap}`"
          @click="emit('show-on-map', savOf(row)!)"
        >
          {{ S.showOnMap }}
        </button>
      </li>
      <li v-if="!rows.length" class="text-gray-700">{{ S.empty }}</li>
    </ul>

    <ul v-if="table.footnotes.length" class="flex flex-col gap-1 text-xs text-gray-700">
      <li v-for="(note, i) in table.footnotes" :key="i">{{ note }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import type { TableDef } from '@/utils/hunting/hub/types';
import { cellText, sortRows, type SortDir, type SortState } from './sort';

// Mobile (< 600 px) form of a hub table: one card per row with its name and at most four
// values, in the same order as the desktop table (shared sort state via v-model:sort).
const MAX_VALUES = 4;

const props = defineProps({
  table: { type: Object as PropType<TableDef>, required: true },
  caption: { type: String, required: true },
  sort: { type: Object as PropType<SortState | null>, default: undefined },
  selectedSav: { type: Number as PropType<number | null>, default: null },
});
const emit = defineEmits(['update:sort', 'show-on-map']);

const selectId = computed(() => `hub-cards-sort-${props.table.id}`);

const localSort = ref<SortState | null>(null);
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
// Name + up to four values; numeric columns first, in the table's column order.
const valueColumns = computed(() => {
  const rest = props.table.columns.slice(1);
  const numeric = rest.filter((c) => c.numeric);
  return [...numeric, ...rest.filter((c) => !c.numeric)].slice(0, MAX_VALUES);
});

const rows = computed(() => sortRows(props.table, currentSort.value));

const totalsLabel = computed(() => {
  const first = firstColumn.value;
  if (!first || !props.table.totals) return S.totalsRow;
  const text = cellText(first, props.table.totals);
  return text && text !== '–' ? text : S.totalsRow;
});

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
