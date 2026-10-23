<template>
  <!-- Desktop: the filter bar's "Laikotarpis" chip with the copy's seasons as radios. -->
  <HuntingHubTopicsVilkaiChipPopover
    v-if="!mobile"
    name="Laikotarpis"
    :value="valueText"
    title="Laikotarpis"
    :padded="false"
    panel-class="w-72"
    initial-focus="input:checked"
  >
    <template #default="{ close }">
      <div @pointerdown="byPointer = true" @keydown.enter.prevent="close()">
        <HuntingHubShellSeasonOptions
          name="hub-vilkai-fallback-season"
          :options="options"
          :model-value="modelValue"
          @update:model-value="(s: number) => pick(s, close)"
        />
      </div>
    </template>
  </HuntingHubTopicsVilkaiChipPopover>

  <!-- Phones: the header chip opens the same list in a full-screen sheet. -->
  <div v-else class="shrink-0">
    <HuntingHubShellFilterChip
      ref="trigger"
      touch
      :value="valueText"
      :open="isOpen"
      :sr-label="`Laikotarpis: ${valueText}`"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :disabled="!options.length"
      @click="isOpen = true"
    />
    <HuntingHubShellFullSheet
      :open="isOpen"
      title="Laikotarpis"
      initial-focus="input:checked"
      @close="closeSheet"
    >
      <div @pointerdown="byPointer = true" @keydown.enter.prevent="closeSheet">
        <HuntingHubShellSeasonOptions
          name="hub-vilkai-fallback-season-m"
          large
          :options="options"
          :model-value="modelValue"
          @update:model-value="(s: number) => pick(s, closeSheet)"
        />
      </div>
    </HuntingHubShellFullSheet>
  </div>
</template>

<script setup lang="ts">
// The Vilkai snapshot fallback's period control (JOURNEYS-11): while /wolfs fails, the chip
// of the filter bar (the phone header) shows and chooses the copy's closed season, so there
// is one season control and it names the season of the numbers below it.
import { computed, nextTick, ref, type PropType } from 'vue';
import { seasonLabel } from '@/utils/hunting/dates';

const props = defineProps({
  seasons: { type: Array as PropType<number[]>, required: true },
  modelValue: { type: Number, default: null },
  mobile: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const options = computed(() =>
  props.seasons.map((season) => ({ season, label: seasonLabel(season) })),
);
const valueText = computed(() =>
  props.modelValue == null ? '…' : `${seasonLabel(props.modelValue)} sezonas`,
);

const isOpen = ref(false);
const trigger = ref<{ focus(): void } | null>(null);
// As the hub's season chips: arrow keys apply at once, a pointer pick or Enter closes.
const byPointer = ref(false);
function pick(season: number, close: () => void) {
  if (season !== props.modelValue) emit('update:modelValue', season);
  if (byPointer.value) close();
  byPointer.value = false;
}
function closeSheet() {
  isOpen.value = false;
  nextTick(() => trigger.value?.focus());
}
</script>
