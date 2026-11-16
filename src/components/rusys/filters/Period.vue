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
      <div v-for="field in fields" :key="field.key" class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">{{ field.label }}</span>
        <VueDatePicker
          :model-value="field.value || null"
          model-type="yyyy-MM-dd"
          format="yyyy-MM-dd"
          locale="lt"
          :format-locale="lt"
          :week-start="1"
          month-name-format="long"
          :enable-time-picker="false"
          :auto-apply="true"
          :teleport="true"
          placeholder="Pasirinkite"
          input-class-name="rusys-period-input"
          @update:model-value="field.onChange($event || '')"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { lt } from 'date-fns/locale';
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

<style>
.rusys-period-input {
  height: 3rem;
  font-size: 0.875rem;
}
</style>
