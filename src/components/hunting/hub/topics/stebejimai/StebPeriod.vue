<template>
  <fieldset class="min-w-0">
    <legend class="sr-only">{{ SS.period }}</legend>
    <div class="flex flex-col gap-2">
      <label v-for="opt in simple" :key="opt.kind" :class="rowClass">
        <input
          type="radio"
          :name="`${uid}-kind`"
          :value="opt.kind"
          :checked="choice === opt.kind"
          :class="radioClass"
          @change="pick(opt.kind)"
        />
        <span>{{ opt.label }}</span>
      </label>

      <div class="flex flex-col gap-1">
        <label :class="rowClass">
          <input
            type="radio"
            :name="`${uid}-kind`"
            value="season"
            :checked="choice === 'season'"
            :class="radioClass"
            @change="pick('season')"
          />
          <span>{{ SS.periodSeason }}</span>
        </label>
        <div class="pl-7">
          <label :for="`${uid}-season`" class="sr-only">{{ SS.seasonSelect }}</label>
          <select
            :id="`${uid}-season`"
            :value="String(seasonPick)"
            :class="selectClass"
            @change="onSeason(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="s in ctx.derived.seasons.value" :key="s" :value="String(s)">
              {{ seasonLabel(s) }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label :class="rowClass">
          <input
            type="radio"
            :name="`${uid}-kind`"
            value="range"
            :checked="choice === 'range'"
            :class="radioClass"
            @change="pick('range')"
          />
          <span>{{ SS.periodRange }}</span>
        </label>
        <div class="flex flex-col gap-2 pl-7">
          <DatePartsSelect
            :model-value="nuo"
            kind="nuo"
            :years="years"
            :today="ctx.today"
            :id-prefix="`${uid}-nuo`"
            :large="large"
            @update:model-value="(value: Parts) => onParts('nuo', value)"
          />
          <DatePartsSelect
            :model-value="iki"
            kind="iki"
            :years="years"
            :today="ctx.today"
            :id-prefix="`${uid}-iki`"
            :large="large"
            :invalid="invalid"
            :described-by="`${uid}-error`"
            @update:model-value="(value: Parts) => onParts('iki', value)"
          />
          <p
            v-if="invalid"
            :id="`${uid}-error`"
            role="alert"
            class="text-sm font-medium text-red-700"
          >
            {{ SS.rangeInvalid }}
          </p>
          <p class="text-xs text-gray-700">{{ SS.rangeHint }}</p>
        </div>
      </div>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
// Period picker of the Stebėjimai topic (STEB-SPEC §3.3): Visas laikotarpis · Paskutinės
// 30 d. · Medžioklės sezonas (select) · Nuo–iki (Metai/Mėnuo/Diena selects; no native date
// inputs). Every valid change applies at once; an invalid range keeps the previous period.
import { computed, getCurrentInstance, inject, ref, watch } from 'vue';
import DatePartsSelect from '@/components/hunting/wolves/DatePartsSelect.vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { intervalFromParts, seasonLabel, seasonOfDay } from '@/utils/hunting/dates';
import { periodInterval, type StebPeriod } from '@/utils/hunting/hub/stebejimai/model';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';

interface Parts {
  year: string;
  month: string;
  day: string;
}
type Kind = StebPeriod['kind'];

const props = defineProps({
  // Phones: larger targets and selects.
  large: { type: Boolean, default: false },
});

const ctx = inject(STEB_CTX)!;
const uid = `steb-period-${getCurrentInstance()?.uid ?? 0}`;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const rowClass = [
  'flex cursor-pointer items-center gap-3 text-gray-900',
  props.large ? 'min-h-[44px] text-base' : 'min-h-[32px] text-sm',
];
const radioClass = `h-4 w-4 shrink-0 accent-gray-900 ${focusRing}`;
const selectClass = [
  'block w-full rounded-md border border-gray-400 bg-white px-2 text-gray-900',
  focusRing,
  props.large ? 'h-12 text-base' : 'h-9 text-sm',
];

const simple: { kind: Kind; label: string }[] = [
  { kind: 'all', label: SS.periodAll },
  { kind: '30d', label: SS.period30 },
];

const period = computed(() => ctx.state.period.value);
const choice = ref<Kind>(period.value.kind);
const seasonPick = ref<number>(
  period.value.kind === 'season' ? period.value.season : seasonOfDay(ctx.today),
);

const empty = (): Parts => ({ year: '', month: '', day: '' });
const partsOf = (day: string): Parts => ({
  year: day.slice(0, 4),
  month: `${Number(day.slice(5, 7))}`,
  day: `${Number(day.slice(8, 10))}`,
});
const nuo = ref<Parts>(empty());
const iki = ref<Parts>(empty());
const invalid = ref(false);

// Day precision; Iki is never after today (the lists end there).
function prefill() {
  const p = period.value;
  const interval = periodInterval(p, ctx.today);
  const oldest = `${ctx.derived.years.value[ctx.derived.years.value.length - 1]}-01-01`;
  const from = interval ? interval.from : oldest;
  const to = interval ? interval.to : ctx.today;
  nuo.value = partsOf(from);
  iki.value = partsOf(to > ctx.today ? ctx.today : to);
  invalid.value = false;
}
prefill();

// A change from elsewhere (reset, the URL, "Rodyti visą laikotarpį").
watch(period, (p) => {
  choice.value = p.kind;
  if (p.kind === 'season') seasonPick.value = p.season;
  // Keep a coarser choice ("2025 · Visi mėnesiai") that already gives this range.
  const shown = rangeFromParts();
  if (p.kind !== 'range' || !shown || JSON.stringify(shown) !== JSON.stringify(p)) prefill();
});

const years = computed(() => {
  const list = ctx.derived.years.value.slice();
  [nuo.value.year, iki.value.year].filter(Boolean).forEach((y) => {
    if (list.indexOf(Number(y)) < 0) list.push(Number(y));
  });
  return list.sort((a, b) => b - a);
});

const num = (v: string) => (v ? Number(v) : null);
function rangeFromParts(): StebPeriod | null {
  if (!nuo.value.year) return null;
  const from = {
    year: Number(nuo.value.year),
    month: num(nuo.value.month),
    day: num(nuo.value.day),
  };
  const to = iki.value.year
    ? { year: Number(iki.value.year), month: num(iki.value.month), day: num(iki.value.day) }
    : null;
  const interval = intervalFromParts(from, to);
  return interval ? { kind: 'range', from: interval.from, to: interval.to } : null;
}

function applyRange() {
  const next = rangeFromParts();
  invalid.value = !next && !!nuo.value.year;
  if (next) ctx.state.setPeriod(next);
}

function pick(kind: Kind) {
  choice.value = kind;
  invalid.value = false;
  if (kind === 'all') ctx.state.setPeriod({ kind: 'all' });
  else if (kind === '30d') ctx.state.setPeriod({ kind: '30d' });
  else if (kind === 'season') ctx.state.setPeriod({ kind: 'season', season: seasonPick.value });
  else applyRange();
}

function onSeason(value: string) {
  const season = Number(value);
  if (!Number.isInteger(season)) return;
  seasonPick.value = season;
  pick('season');
}

function onParts(row: 'nuo' | 'iki', value: Parts) {
  if (row === 'nuo') nuo.value = value;
  else iki.value = value;
  choice.value = 'range';
  applyRange();
}
</script>
