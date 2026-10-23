<template>
  <!-- One period panel for Vilkai and Stebėjimai (CONTROLS-06): one radio group,
       ( ) Medžioklės sezonas [select] · ( ) Paskutinės 30 d. · ( ) all · ( ) Nuo–iki
       [Metai · Mėnuo · Diena]. Presentational: the topic wrapper owns the state and the URL. -->
  <fieldset class="min-w-0">
    <legend :class="showLegend ? 'mb-2 text-sm font-semibold text-ink' : 'sr-only'">
      {{ S_PERIOD.title }}
    </legend>
    <div class="flex flex-col gap-0.5">
      <div>
        <label :class="row('season')">
          <input
            type="radio"
            :name="`${uid}-kind`"
            value="season"
            :checked="kind === 'season'"
            :class="radio"
            @change="emit('pick', 'season')"
          />
          <span>{{ S_PERIOD.season }}</span>
        </label>
        <div :class="indent">
          <label :for="`${uid}-season`" class="sr-only">{{ S_PERIOD.seasonSelect }}</label>
          <select
            :id="`${uid}-season`"
            :value="String(season)"
            :class="[FIELD, large ? FIELD_TOUCH : 'h-9 text-sm']"
            @change="onSeason(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="s in seasons" :key="s" :value="String(s)">
              {{ seasonLabel(s) }}
            </option>
          </select>
        </div>
      </div>

      <label :class="row('30d')">
        <input
          type="radio"
          :name="`${uid}-kind`"
          value="30d"
          :checked="kind === '30d'"
          :class="radio"
          @change="emit('pick', '30d')"
        />
        <span>{{ S_PERIOD.last30 }}</span>
      </label>

      <label :class="row('all')">
        <input
          type="radio"
          :name="`${uid}-kind`"
          value="all"
          :checked="kind === 'all'"
          :class="radio"
          @change="emit('pick', 'all')"
        />
        <span>{{ allLabel }}</span>
      </label>

      <div>
        <label :class="row('range')">
          <input
            type="radio"
            :name="`${uid}-kind`"
            value="range"
            :checked="kind === 'range'"
            :class="radio"
            @change="emit('pick', 'range')"
          />
          <span>{{ S_PERIOD.range }}</span>
        </label>
        <div class="flex flex-col gap-2" :class="indent">
          <HuntingWolvesDatePartsSelect
            :model-value="nuo"
            kind="nuo"
            :years="years"
            :today="today"
            :id-prefix="`${uid}-nuo`"
            :large="large"
            @update:model-value="(value: Parts) => emit('parts', 'nuo', value)"
          />
          <HuntingWolvesDatePartsSelect
            :model-value="iki"
            kind="iki"
            :years="years"
            :today="today"
            :id-prefix="`${uid}-iki`"
            :large="large"
            :invalid="invalid"
            :described-by="`${uid}-error`"
            @update:model-value="(value: Parts) => emit('parts', 'iki', value)"
          />
          <p
            v-if="invalid"
            :id="`${uid}-error`"
            role="alert"
            class="text-sm font-medium text-red-700"
          >
            {{ S_PERIOD.invalid }}
          </p>
          <p :class="HELP">{{ S_PERIOD.hint }}</p>
        </div>
      </div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { getCurrentInstance, type PropType } from 'vue';
import { seasonLabel } from '@/utils/hunting/dates';
import { CHECK, FIELD, FIELD_TOUCH, HELP, OPTION, OPTION_SELECTED, OPTION_TOUCH } from './controls';

type PeriodKind = 'season' | '30d' | 'all' | 'range';
interface Parts {
  year: string;
  month: string;
  day: string;
}

const S_PERIOD = {
  title: 'Laikotarpis',
  season: 'Medžioklės sezonas',
  seasonSelect: 'Sezonas',
  last30: 'Paskutinės 30 d.',
  range: 'Nuo–iki',
  // The same wording as Stebėjimai (SS.rangeInvalid, CONTENT-27).
  invalid: 'Pabaiga negali būti ankstesnė už pradžią.',
  hint: 'Palikus „Iki“ tuščią, rodomas visas „Nuo“ laikotarpis (metai, mėnuo ar diena).',
};

const props = defineProps({
  kind: { type: String as PropType<PeriodKind>, required: true },
  // The season in the select (the chosen one, or the default when another kind is on).
  season: { type: Number, required: true },
  // Newest first.
  seasons: { type: Array as PropType<number[]>, required: true },
  // "Visi sezonai" (Vilkai) or "Visas laikotarpis" (Stebėjimai).
  allLabel: { type: String, required: true },
  nuo: { type: Object as PropType<Parts>, required: true },
  iki: { type: Object as PropType<Parts>, required: true },
  years: { type: Array as PropType<number[]>, required: true },
  today: { type: String, required: true },
  invalid: { type: Boolean, default: false },
  // Phones: 48 px rows and fields.
  large: { type: Boolean, default: false },
  showLegend: { type: Boolean, default: false },
});
const emit = defineEmits(['pick', 'season', 'parts']);

const uid = `hub-period-${getCurrentInstance()?.uid ?? 0}`;
const radio = [CHECK, props.large ? 'h-5 w-5' : ''];
const indent = props.large ? 'pb-2 pl-11 pr-1' : 'pb-1 pl-10 pr-1';
const row = (kind: PeriodKind) => [
  OPTION,
  props.large ? OPTION_TOUCH : '',
  props.kind === kind ? OPTION_SELECTED : '',
];

function onSeason(value: string) {
  const s = Number(value);
  if (Number.isInteger(s)) emit('season', s);
}
</script>
