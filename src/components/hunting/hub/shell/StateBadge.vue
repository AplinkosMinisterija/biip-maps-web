<template>
  <!-- A badge only for figures that are not final (§0.5, D10): a site pill, text + colour. -->
  <span
    :class="[BADGE, 'border-transparent', STYLE[badge]]"
    :title="badge === 'bandomoji' ? BANDOMOJI_TOOLTIP : undefined"
  >
    {{ afterSeason ? BADGE_LABELS_AFTER_SEASON[badge] : BADGE_LABELS[badge] }}
    <span v-if="badge === 'bandomoji'" class="sr-only">. {{ BANDOMOJI_TOOLTIP }}</span>
  </span>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { Badge } from '@/utils/hunting/hub/types';
import {
  BADGE_LABELS,
  BADGE_LABELS_AFTER_SEASON,
  BANDOMOJI_TOOLTIP,
} from '@/utils/hunting/hub/strings';
import { BADGE } from './controls';

defineProps({
  badge: { type: String as PropType<Badge>, required: true },
  // Right after a season label: the short label ("vyksta").
  afterSeason: { type: Boolean, default: false },
});

// "vyksta" = the site's nav tint; preliminary / partial = warm (≈ 7:1 contrast).
const STYLE: Record<Badge, string> = {
  vyksta: 'bg-brand-100 text-brand',
  preliminarus: 'bg-[#fdf1e7] text-[#8a3b12]',
  dalinis: 'bg-[#fdf1e7] text-[#8a3b12]',
  bandomoji: 'bg-band text-ink-muted',
};
</script>
