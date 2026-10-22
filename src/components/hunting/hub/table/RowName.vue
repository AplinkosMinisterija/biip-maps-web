<template>
  <button
    v-if="sav !== null"
    type="button"
    :class="ROW_ACTION"
    :aria-pressed="selected"
    :aria-label="`${text}. ${S.showOnMap}`"
    :title="S.showOnMap"
    @click="emit('show-on-map', sav)"
  >
    <span>{{ text }}</span>
    <UiIcon name="pin" :size="16" :class="ROW_ACTION_PIN" aria-hidden="true" />
  </button>
  <span v-else>{{ text }}</span>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import { ROW_ACTION, ROW_ACTION_PIN } from './spec';

// The first-column name of a hub table row: the "show on map" action when the row is a
// municipality, else plain text (table spec: ./spec.ts).
defineProps({
  text: { type: String, required: true },
  sav: { type: Number as PropType<number | null>, default: null },
  selected: { type: Boolean, default: false },
});
// 'show-on-map' (code: number)
const emit = defineEmits(['show-on-map']);
</script>
