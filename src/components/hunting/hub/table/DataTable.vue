<template>
  <div class="flex flex-col gap-3 text-sm text-gray-900" :class="fill ? 'h-full min-h-0' : ''">
    <div class="relative overflow-auto max-w-full" :class="fill ? 'flex-1 min-h-0' : ''">
      <table class="min-w-full border-collapse text-left text-sm">
        <caption class="sr-only">
          {{
            caption
          }}
        </caption>
        <thead>
          <tr class="border-b border-gray-200 text-xs text-gray-600">
            <th
              v-for="(col, i) in table.columns"
              :key="col.id"
              scope="col"
              :class="[
                'sticky top-0 z-20 bg-white py-2 font-semibold align-bottom',
                i === 0 ? `${stickyLeft} z-30 pr-2 text-left` : 'px-1',
                col.numeric ? 'text-right' : 'text-left',
              ]"
              :aria-sort="ariaSort(currentSort, col.id)"
              :title="col.tooltip"
            >
              <button
                type="button"
                :class="[sortButtonClass, col.numeric ? 'justify-end text-right' : 'text-left']"
                @click="toggleSort(col)"
              >
                <span>{{ col.label }}</span>
                <span v-if="col.tooltip" class="sr-only">. {{ col.tooltip }}</span>
                <span aria-hidden="true" class="w-3 shrink-0">{{ arrow(col.id) }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Totals first (SPEC2 §10): the first tbody row, with a row header. -->
          <tr v-if="table.totals" class="border-b-2 border-gray-300 font-semibold bg-gray-50">
            <template v-for="(col, i) in table.columns" :key="col.id">
              <th v-if="i === 0" scope="row" :class="[stickyLeft, 'py-2 pr-2 bg-gray-50']">
                {{ totalsLabel }}
              </th>
              <td v-else class="py-2 px-1 tabular-nums" :class="col.numeric ? 'text-right' : ''">
                <HuntingHubTableCell :col="col" :row="table.totals" />
              </td>
            </template>
          </tr>
          <tr
            v-for="(row, r) in rows"
            :key="rowKey(row, r)"
            class="border-b border-gray-100"
            :class="isSelected(row) ? 'bg-blue-50' : ''"
          >
            <template v-for="(col, i) in table.columns" :key="col.id">
              <th
                v-if="i === 0"
                scope="row"
                :class="[
                  stickyLeft,
                  'py-1 pr-2 font-normal whitespace-nowrap',
                  isSelected(row) ? 'bg-blue-50' : 'bg-white',
                ]"
              >
                <button
                  v-if="savOf(row) !== null"
                  type="button"
                  :class="cellButtonClass"
                  :aria-pressed="isSelected(row)"
                  :aria-label="`${cellText(col, row)}. ${S.showOnMap}`"
                  :title="S.showOnMap"
                  @click="emit('show-on-map', savOf(row)!)"
                >
                  {{ cellText(col, row) }}
                </button>
                <span v-else>{{ cellText(col, row) }}</span>
              </th>
              <td v-else class="py-1 px-1 tabular-nums" :class="col.numeric ? 'text-right' : ''">
                <HuntingHubTableCell :col="col" :row="row" />
              </td>
            </template>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="table.columns.length" class="py-3 text-gray-700">{{ S.empty }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul v-if="table.footnotes.length" class="flex flex-col gap-1 text-xs text-gray-700">
      <li v-for="(note, i) in table.footnotes" :key="i">{{ note }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import type { ColumnDef, TableDef } from '@/utils/hunting/hub/types';
import { ariaSort, cellText, nextSort, sortRows, type SortState } from './sort';

// Generic sortable table of the hub (SPEC2 §10): caption, `scope`, `aria-sort`, a totals row
// as the first tbody row, sticky header and first column, "<3" cells with a tooltip.
// The sort state can be controlled (v-model:sort, shared with CardList) or kept here.
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

const localSort = ref<SortState | null>(null);
const currentSort = computed(() => (props.sort === undefined ? localSort.value : props.sort));

const rows = computed(() => sortRows(props.table, currentSort.value));

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

const arrow = (colId: string) =>
  currentSort.value?.col === colId ? (currentSort.value.dir === 'asc' ? '▲' : '▼') : '';

const savOf = (row: unknown) => props.table.rowSav?.(row) ?? null;
const isSelected = (row: unknown) => {
  const code = savOf(row);
  return code !== null && code === props.selectedSav;
};
const rowKey = (row: unknown, index: number) => {
  const code = savOf(row);
  return code !== null ? `sav-${code}` : `row-${index}`;
};

const stickyLeft = 'sticky left-0 z-10 text-left';
const sortButtonClass =
  'inline-flex items-end gap-1 w-full min-h-[24px] max-md:min-h-[44px] rounded font-semibold hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const cellButtonClass =
  'min-h-[24px] max-md:min-h-[44px] rounded text-left text-blue-800 underline decoration-dotted underline-offset-2 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
</script>
