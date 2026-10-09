<template>
  <fieldset ref="root" @keydown="onKeydown">
    <legend class="sr-only">{{ S.season }}</legend>
    <label
      v-for="o in options"
      :key="o.season"
      class="flex cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-gray-50"
      :class="large ? 'min-h-[48px] text-base' : 'min-h-[36px] text-sm'"
    >
      <input
        type="radio"
        :name="name"
        :value="o.season"
        :checked="o.season === modelValue"
        class="h-4 w-4 accent-gray-900"
        :class="focusRing"
        @change="emit('update:modelValue', o.season)"
      />
      <span class="font-semibold text-gray-900">{{ o.label }}</span>
      <HuntingHubShellStateBadge v-if="o.badge" :badge="o.badge" />
    </label>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue';
import { S } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';
import type { SeasonOption } from './useSeasonOptions';

const props = defineProps({
  options: { type: Array as PropType<SeasonOption[]>, required: true },
  modelValue: { type: Number, required: true },
  name: { type: String, required: true },
  large: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

// Arrow keys move to the next/previous season and select it (handled here, as the browser's
// own radio navigation did not move inside the map page).
const root = ref<HTMLElement | null>(null);
function onKeydown(event: KeyboardEvent) {
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
  if (!step || !props.options.length) return;
  event.preventDefault();
  const i = props.options.findIndex((o) => o.season === props.modelValue);
  const next = props.options[(i + step + props.options.length) % props.options.length];
  emit('update:modelValue', next.season);
  root.value?.querySelector<HTMLInputElement>(`input[value="${next.season}"]`)?.focus();
}
</script>
