<template>
  <button
    type="button"
    :class="[BTN_SECONDARY, 'shrink-0 whitespace-nowrap disabled:cursor-not-allowed max-md:h-11']"
    :disabled="!table.rows.length || !!table.disabled"
    @click="download"
  >
    <UiIcon name="download" :size="16" aria-hidden="true" />
    {{ S.csv }}
  </button>
</template>

<script setup lang="ts">
import { inject, type PropType } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { buildTableCsv, downloadCsv, tableCsvFileName } from '@/utils/hunting/hub/csv';
import { S } from '@/utils/hunting/hub/strings';
import type { Provenance, TableDef } from '@/utils/hunting/hub/types';
import { BTN_SECONDARY } from '../shell/controls';
import { sortRows, type SortState } from './sort';

// CSV of one hub table as shown (same columns, same sort, totals first). The first line
// is the provenance (SPEC2 §5): '# Duomenys: {date} momentinė kopija; BĮIP'.
const props = defineProps({
  table: { type: Object as PropType<TableDef>, required: true },
  caption: { type: String, default: '' },
  sort: { type: Object as PropType<SortState | null>, default: null },
});

const ctx = inject(HUB_CTX)!;

function download() {
  if (!props.table.rows.length || props.table.disabled) return;
  const provenance: Provenance = ctx.view.value?.provenance || {
    kind: 'live',
    asOf: '',
    text: S.appTitle,
  };
  const csv = buildTableCsv(props.table, {
    provenance,
    title: props.caption,
    rows: sortRows(props.table, props.sort),
  });
  downloadCsv(csv, tableCsvFileName(props.table));
}
</script>
