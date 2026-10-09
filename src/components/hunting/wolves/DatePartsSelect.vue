<template>
  <fieldset class="min-w-0">
    <legend class="sr-only">{{ title }}</legend>
    <span
      aria-hidden="true"
      class="block mb-1 font-semibold text-gray-900"
      :class="large ? 'text-base' : 'text-sm'"
    >
      {{ title }}
    </span>
    <!-- Mobile: each select full width (SPEC §7.3); desktop: one row of three. -->
    <div
      class="grid min-w-0"
      :class="large ? 'grid-cols-1 gap-2' : 'grid-cols-[0.9fr_1.05fr_1.05fr] gap-1.5'"
    >
      <div class="min-w-0">
        <label :for="`${idPrefix}-year`" :class="labelClass">Metai</label>
        <select
          :id="`${idPrefix}-year`"
          :value="modelValue.year"
          :aria-label="`${title}: metai`"
          :aria-invalid="invalid ? 'true' : undefined"
          :aria-describedby="invalid && describedBy ? describedBy : undefined"
          :class="selectClass"
          :style="{ backgroundImage: CHEVRON }"
          @change="update('year', ($event.target as HTMLSelectElement).value)"
        >
          <option v-if="kind === 'iki'" value="">Kaip „Nuo“</option>
          <option v-for="year in years" :key="year" :value="`${year}`">{{ year }}</option>
        </select>
      </div>
      <div class="min-w-0">
        <label :for="`${idPrefix}-month`" :class="labelClass">Mėnuo</label>
        <select
          :id="`${idPrefix}-month`"
          :value="modelValue.month"
          :aria-label="`${title}: mėnuo`"
          :aria-invalid="invalid ? 'true' : undefined"
          :aria-describedby="invalid && describedBy ? describedBy : undefined"
          :disabled="!modelValue.year"
          :class="selectClass"
          :style="{ backgroundImage: CHEVRON }"
          @change="update('month', ($event.target as HTMLSelectElement).value)"
        >
          <!-- A disabled select shows a dash, not "Visi …", which would read as "all of them". -->
          <option value="">{{ modelValue.year ? 'Visi mėnesiai' : '—' }}</option>
          <option v-for="month in months" :key="month.value" :value="month.value">
            {{ month.label }}
          </option>
        </select>
      </div>
      <div class="min-w-0">
        <label :for="`${idPrefix}-day`" :class="labelClass">Diena</label>
        <select
          :id="`${idPrefix}-day`"
          :value="modelValue.day"
          :aria-label="`${title}: diena`"
          :aria-invalid="invalid ? 'true' : undefined"
          :aria-describedby="invalid && describedBy ? describedBy : undefined"
          :disabled="!modelValue.month"
          :class="selectClass"
          :style="{ backgroundImage: CHEVRON }"
          @change="update('day', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ modelValue.month ? 'Visos dienos' : '—' }}</option>
          <option v-for="day in days" :key="day" :value="`${day}`">{{ day }}</option>
        </select>
      </div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
// One row of the period picker: Metai · Mėnuo · Diena. Values are strings
// ('' = not chosen); months and days are unpadded numbers ('1'…'12').
import { computed, type PropType } from 'vue';
import { MONTHS } from '@/utils/constants';

interface DateParts {
  year: string;
  month: string;
  day: string;
}

const props = defineProps({
  kind: { type: String as PropType<'nuo' | 'iki'>, required: true },
  modelValue: { type: Object as PropType<DateParts>, required: true },
  years: { type: Array as PropType<number[]>, required: true },
  // Local 'yyyy-MM-dd': months and days after it are not offered.
  today: { type: String, required: true },
  idPrefix: { type: String, required: true },
  invalid: { type: Boolean, default: false },
  describedBy: { type: String, default: '' },
  large: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const title = computed(() => (props.kind === 'nuo' ? 'Nuo' : 'Iki'));

const todayYear = computed(() => Number(props.today.slice(0, 4)));
const todayMonth = computed(() => Number(props.today.slice(5, 7)));
const todayDay = computed(() => Number(props.today.slice(8, 10)));

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

function monthsFor(year: string) {
  // The current year only offers the months that have already started.
  return Number(year) === todayYear.value ? MONTHS.slice(0, todayMonth.value) : MONTHS;
}

function maxDayFor(year: string, month: string) {
  const y = Number(year);
  const m = Number(month);
  if (y === todayYear.value && m === todayMonth.value) return todayDay.value;
  return daysInMonth(y, m);
}

const months = computed(() => monthsFor(props.modelValue.year));
const days = computed(() => {
  const { year, month } = props.modelValue;
  if (!year || !month) return [];
  return Array.from({ length: maxDayFor(year, month) }, (_, i) => i + 1);
});

// Keeps the trio consistent after any change: no month without a year, no day
// without a month, no month or day that the chosen year/month does not offer.
function normalise(parts: DateParts): DateParts {
  const next = { ...parts };
  if (!next.year) return { year: '', month: '', day: '' };
  if (next.month && !monthsFor(next.year).some((m) => m.value === next.month)) {
    next.month = '';
  }
  if (!next.month) {
    next.day = '';
  } else if (next.day) {
    next.day = `${Math.min(Number(next.day), maxDayFor(next.year, next.month))}`;
  }
  return next;
}

// Choosing a year or a month clears the day, so "2025 · Gruodis" means the whole month
// rather than keeping a day left over from the pre-filled interval.
function update(part: keyof DateParts, value: string) {
  const next = { ...props.modelValue, [part]: value };
  if (part !== 'day' && value !== props.modelValue[part]) next.day = '';
  emit('update:modelValue', normalise(next));
}

// A compact chevron (instead of the wide native one) leaves room for "Visos dienos" in a 360 px panel.
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23374151' stroke-width='1.5'/%3E%3C/svg%3E\")";

const labelClass = computed(() => [
  'block mb-1 text-gray-700',
  props.large ? 'text-sm' : 'text-xs',
]);

const selectClass = computed(() => [
  'block w-full appearance-none rounded-md border bg-white bg-no-repeat pl-1.5 pr-5 text-gray-900 cursor-pointer',
  'bg-[length:12px_12px] bg-[right_0.3rem_center]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2',
  'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
  props.large ? 'h-12 text-base' : 'h-9 text-sm',
  props.invalid ? 'border-red-600 ring-1 ring-red-600' : 'border-gray-400',
]);
</script>
