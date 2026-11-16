<template>
  <div>
    <UiLabel size="sm">Stebėjimo laikotarpis</UiLabel>
    <UiSelect
      :model-value="year"
      placeholder="Pasirinkite metus"
      :options="years"
      :can-clear="true"
      @change="setYear"
    />
    <div class="flex gap-2 mt-2">
      <UiInput :model-value="from" type="date" label="Nuo" @change="emitPeriod($event, to)" />
      <UiInput :model-value="to" type="date" label="Iki" @change="emitPeriod(from, $event)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const FIRST_YEAR = 1990;

const props = defineProps({
  from: { type: String, default: '' },
  to: { type: String, default: '' },
});

const emit = defineEmits(['change']);

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => {
  const value = currentYear - index;
  return { value, label: `${value}` };
});

const year = computed(() => {
  const match = props.from.match(/^(\d{4})-01-01$/);
  return match && props.to === `${match[1]}-12-31` ? Number(match[1]) : null;
});

function setYear(value: number | null) {
  if (!value) return emitPeriod('', '');

  emitPeriod(`${value}-01-01`, `${value}-12-31`);
}

function emitPeriod(from: string, to: string) {
  emit('change', { from: from || '', to: to || '' });
}
</script>
