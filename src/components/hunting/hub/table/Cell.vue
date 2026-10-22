<template>
  <span v-if="suppressed" :title="tooltip" class="text-ink-muted [@media(hover:hover)]:cursor-help">
    <span aria-hidden="true">{{ shown }}</span>
    <span class="sr-only">{{ withheld ? tooltip : `mažiau nei 3. ${tooltip}` }}</span>
  </span>
  <template v-else>{{ text }}</template>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { ColumnDef } from '@/utils/hunting/hub/types';
import { S } from '@/utils/hunting/hub/strings';
import { WITHHELD_MARK } from '@/utils/hunting/hub/topics/common';
import { cellText, isSuppressed, suppressedTooltip } from './sort';

// One table cell's text; a suppressed small count reads "<3" and a withheld one "x" in a
// numeric column ("neskelbiama" elsewhere), each in muted plain text with its explanation
// for screen readers and as a hover title; the table's footnotes explain both on screen (§5).
const props = defineProps({
  col: { type: Object as PropType<ColumnDef<any>>, required: true },
  row: { type: null as unknown as PropType<unknown>, required: true },
});

const text = computed(() => cellText(props.col, props.row));
const withheld = computed(() => text.value === S.withheld);
const suppressed = computed(() => withheld.value || isSuppressed(text.value));
const shown = computed(() => (withheld.value && props.col.numeric ? WITHHELD_MARK : text.value));
const tooltip = computed(() => (withheld.value ? S.withheldTooltip : suppressedTooltip(props.col)));
</script>
