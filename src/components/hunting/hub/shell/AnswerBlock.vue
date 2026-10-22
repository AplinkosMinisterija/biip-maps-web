<template>
  <div class="flex flex-col gap-1">
    <!-- The badge's branch is element-rooted: Vue 3.5.29 mis-patches a v-if'd async component
         that is still loading (insertBefore error, vuejs/core#15551). It stands on its own line
         before the answer, never after a sentence (OVERVIEW-03), with its full label. -->
    <div v-if="badge" class="contents">
      <p><HuntingHubShellStateBadge :badge="badge" /></p>
    </div>
    <p class="text-base leading-snug text-ink" :class="clamp ? 'line-clamp-2' : ''">
      <NowrapText :text="answer" />
    </p>
    <p v-for="line in notices" :key="line" class="text-sm text-ink-muted">
      <NowrapText :text="line" />
    </p>
    <p v-if="fixedNote" class="text-sm text-ink-muted">{{ fixedNote }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { Badge } from '@/utils/hunting/hub/types';
import NowrapText from './NowrapText.vue';

// The one-sentence answer (§0.3), its badge (only when not final) and the muted notice
// lines (§3.4: the hub's coercion notice, then the topic's own).
const props = defineProps({
  answer: { type: String, required: true },
  badge: { type: String as PropType<Badge>, default: undefined },
  notice: { type: String, default: undefined },
  topicNotice: { type: String, default: undefined },
  fixedNote: { type: String, default: undefined },
  clamp: { type: Boolean, default: false },
});

const notices = computed(() =>
  [props.notice, props.topicNotice].filter((x, i, all): x is string => !!x && all.indexOf(x) === i),
);
</script>
