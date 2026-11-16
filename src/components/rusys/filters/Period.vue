<template>
  <div>
    <UiLabel size="sm">Stebėjimo laikotarpis</UiLabel>
    <UiSelect
      :model-value="year"
      placeholder="Pasirinkite metus"
      :options="years"
      :can-clear="true"
      full-width
      @change="setYear"
    />
    <div class="grid grid-cols-2 gap-2 mt-2">
      <label v-for="field in fields" :key="field.key" class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">{{ field.label }}</span>
        <input
          type="date"
          :value="field.value"
          class="w-full h-12 px-2 text-sm bg-white border rounded focus:outline-none focus:border-origin-500"
          @change="field.onChange(($event.target as HTMLInputElement).value)"
        />
      </label>
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

const fields = computed(() => [
  {
    key: 'from',
    label: 'Nuo',
    value: props.from,
    onChange: (from: string) => emitPeriod(from, props.to),
  },
  {
    key: 'to',
    label: 'Iki',
    value: props.to,
    onChange: (to: string) => emitPeriod(props.from, to),
  },
]);

function setYear(value: number | null) {
  if (!value) return emitPeriod('', '');

  emitPeriod(`${value}-01-01`, `${value}-12-31`);
}

function emitPeriod(from: string, to: string) {
  emit('change', { from: from || '', to: to || '' });
}
</script>
