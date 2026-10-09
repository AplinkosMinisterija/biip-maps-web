<template>
  <!-- A badge only for figures that are not final (§0.5): text + colour + border. -->
  <span
    class="inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
    :class="STYLE[badge]"
    :title="badge === 'bandomoji' ? BANDOMOJI_TOOLTIP : undefined"
  >
    {{ BADGE_LABELS[badge] }}
    <span v-if="badge === 'bandomoji'" class="sr-only">. {{ BANDOMOJI_TOOLTIP }}</span>
  </span>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { Badge } from '@/utils/hunting/hub/types';
import { BADGE_LABELS, BANDOMOJI_TOOLTIP } from '@/utils/hunting/hub/strings';

defineProps({
  badge: { type: String as PropType<Badge>, required: true },
});

const STYLE: Record<Badge, string> = {
  vyksta: 'bg-blue-50 border-blue-700 text-blue-900',
  preliminarus: 'bg-amber-50 border-amber-700 text-amber-900',
  dalinis: 'bg-amber-50 border-amber-700 text-amber-900',
  bandomoji: 'bg-gray-100 border-gray-600 text-gray-800',
};
</script>
