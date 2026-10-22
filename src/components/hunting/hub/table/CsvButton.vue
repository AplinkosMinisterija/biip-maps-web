<template>
  <!-- Compact (the phone table header row, MOBILE-07): a 44 px icon button. -->
  <button
    type="button"
    :class="
      compact
        ? [ICON_BTN, ICON_BTN_TOUCH, 'shrink-0 disabled:cursor-not-allowed disabled:opacity-50']
        : [BTN_SECONDARY, 'shrink-0 whitespace-nowrap disabled:cursor-not-allowed max-md:h-11']
    "
    :aria-label="compact ? S.csv : undefined"
    :title="compact ? S.csv : undefined"
    :disabled="!table.rows.length || !!table.disabled"
    @click="download"
  >
    <UiIcon name="download" :size="compact ? 20 : 16" aria-hidden="true" />
    <template v-if="!compact">{{ S.csv }}</template>
  </button>
</template>

<script setup lang="ts">
import { inject, type PropType } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { buildTableCsv, downloadCsv, tableCsvFileName } from '@/utils/hunting/hub/csv';
import { S } from '@/utils/hunting/hub/strings';
import type { Provenance, TableDef } from '@/utils/hunting/hub/types';
import { BTN_SECONDARY, ICON_BTN, ICON_BTN_TOUCH } from '../shell/controls';
import { sortRows, type SortState } from './sort';

// CSV of one hub table as shown (same columns, same sort, totals first). The first line
// is the provenance (SPEC2 §5): '# Duomenys: {date} momentinė kopija; BĮIP'.
const props = defineProps({
  table: { type: Object as PropType<TableDef>, required: true },
  caption: { type: String, default: '' },
  sort: { type: Object as PropType<SortState | null>, default: null },
  // A table that is not the active topic's (the Vilkai snapshot fallback): its own provenance.
  provenance: { type: Object as PropType<Provenance | null>, default: null },
  compact: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;

function download() {
  if (!props.table.rows.length || props.table.disabled) return;
  const provenance: Provenance = props.provenance ||
    ctx.view.value?.provenance || {
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
