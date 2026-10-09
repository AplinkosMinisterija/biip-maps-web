<template>
  <div class="flex flex-col gap-1">
    <p class="text-base leading-snug text-gray-900" :class="clamp ? 'line-clamp-2' : ''">
      {{ answer }}
      <HuntingHubShellStateBadge v-if="badge" :badge="badge" class="ml-1 align-middle" />
    </p>
    <p v-for="line in notices" :key="line" class="text-sm text-gray-700">{{ line }}</p>
    <p v-if="fixedNote" class="text-sm text-gray-700">{{ fixedNote }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { Badge } from '@/utils/hunting/hub/types';

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
