<template>
  <span
    v-if="suppressed"
    :title="tooltip"
    class="cursor-help underline decoration-dotted underline-offset-2 text-gray-700"
  >
    <span aria-hidden="true">{{ text }}</span>
    <span class="sr-only">{{ withheld ? tooltip : `mažiau nei 3. ${tooltip}` }}</span>
  </span>
  <template v-else>{{ text }}</template>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { ColumnDef } from '@/utils/hunting/hub/types';
import { S } from '@/utils/hunting/hub/strings';
import { cellText, isSuppressed, suppressedTooltip } from './sort';

// One table cell's text; a suppressed small count reads "<3" and a withheld one "neskelbiama",
// each with its explanation (§5).
const props = defineProps({
  col: { type: Object as PropType<ColumnDef<any>>, required: true },
  row: { type: null as unknown as PropType<unknown>, required: true },
});

const text = computed(() => cellText(props.col, props.row));
const withheld = computed(() => text.value === S.withheld);
const suppressed = computed(() => withheld.value || isSuppressed(text.value));
const tooltip = computed(() => (withheld.value ? S.withheldTooltip : suppressedTooltip(props.col)));
</script>
