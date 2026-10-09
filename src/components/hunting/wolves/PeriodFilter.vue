<template>
  <fieldset class="min-w-0">
    <legend :class="staged ? 'sr-only' : 'text-sm font-semibold text-gray-900 mb-2'">
      Laikotarpis
    </legend>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="chip in seasonChips"
        :key="chip.preset"
        type="button"
        :aria-pressed="current.preset === chip.preset ? 'true' : 'false'"
        :class="chipClass(current.preset === chip.preset)"
        @click="apply(seasonInterval(chip.season), chip.preset)"
      >
        {{ chip.label }}
      </button>

      <div class="relative">
        <label :for="`${uid}-older`" class="sr-only">Ankstesni sezonai</label>
        <select
          :id="`${uid}-older`"
          :value="olderValue"
          :class="[chipClass(!!olderValue), 'appearance-none pr-8']"
          @change="onOlderChange($event)"
        >
          <option value="">Ankstesni sezonai</option>
          <option v-for="season in olderSeasons" :key="season" :value="`season:${season}`">
            {{ seasonLabel(season) }} sezonas
          </option>
          <option value="all">Visi sezonai</option>
        </select>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
          :class="olderValue ? 'text-white' : 'text-gray-700'"
        >
          ▾
        </span>
      </div>

      <button
        type="button"
        :aria-pressed="current.preset === 'last30' ? 'true' : 'false'"
        :class="chipClass(current.preset === 'last30')"
        @click="apply(last30Interval, 'last30')"
      >
        Paskutinės 30 d.
      </button>

      <button
        type="button"
        :aria-expanded="datesOpen ? 'true' : 'false'"
        :aria-controls="`${uid}-dates`"
        :class="chipClass(current.preset === 'custom')"
        @click="datesOpen = !datesOpen"
      >
        Pasirinkti datas
        <span aria-hidden="true" class="ml-1 text-xs">{{ datesOpen ? '▴' : '▾' }}</span>
      </button>
    </div>

    <div v-show="datesOpen" :id="`${uid}-dates`" class="mt-3 space-y-3">
      <HuntingWolvesDatePartsSelect
        :model-value="nuo"
        kind="nuo"
        :years="years"
        :today="ctx.today"
        :id-prefix="`${uid}-nuo`"
        :large="large"
        @update:model-value="(value: DateParts) => onPartsChange('nuo', value)"
      />
      <HuntingWolvesDatePartsSelect
        :model-value="iki"
        kind="iki"
        :years="years"
        :today="ctx.today"
        :id-prefix="`${uid}-iki`"
        :large="large"
        :invalid="invalid"
        :described-by="`${uid}-iki-error`"
        @update:model-value="(value: DateParts) => onPartsChange('iki', value)"
      />
      <p
        v-if="invalid"
        :id="`${uid}-iki-error`"
        role="alert"
        class="text-sm text-red-700 font-medium"
      >
        Data „Iki“ negali būti ankstesnė nei „Nuo“.
      </p>
      <p class="text-xs text-gray-700">
        Palikus „Iki“ tuščią, rodomas visas „Nuo“ laikotarpis (metai, mėnuo ar diena).
      </p>
    </div>

    <p v-if="fallbackInfo" class="mt-3 flex gap-1 text-xs text-gray-800">
      <span aria-hidden="true">ⓘ</span>
      <span>{{ fallbackInfo }}</span>
    </p>
    <p v-if="shownSeason !== null" class="mt-2 text-xs text-gray-700">
      Vilkų medžioklė: {{ shownSeason }}-10-15 – {{ shownSeason + 1 }}-03-31. Sezonas baigiamas
      anksčiau, jei išnaudojamas limitas.
    </p>
  </fieldset>
</template>

<script setup lang="ts">
// Period presets plus the Nuo/Iki (Metai · Mėnuo · Diena) picker (SPEC §4.4, §6.2).
// Live mode (default) applies every change to the shared state immediately.
// Staged mode (used by PeriodSheet) only emits `update:draft`; the sheet applies it.
import { computed, getCurrentInstance, inject, ref, watch, type PropType } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import type { Interval, PresetId } from '@/utils/hunting/types';
import {
  MIN_DAY as FIRST_DAY,
  addDays,
  daysInMonth,
  intervalSeason,
  sameInterval,
  seasonInterval,
  seasonLabel,
  toDay,
} from '@/utils/hunting/dates';

interface DateParts {
  year: string;
  month: string;
  day: string;
}
interface Draft {
  interval: Interval;
  preset: PresetId;
}

const props = defineProps({
  staged: { type: Boolean, default: false },
  draft: { type: Object as PropType<Draft | null>, default: null },
  // Mobile: 44 px chips, 48 px selects.
  large: { type: Boolean, default: false },
});
const emit = defineEmits(['update:draft']);

const ctx = inject(WOLVES_CTX)!;
const uid = `wolves-period-${getCurrentInstance()?.uid ?? 0}`;

const cur = computed(() => ctx.currentSeason);
const minYear = computed(() => ctx.data.dataset.value?.minYear ?? 2017);
// The first season that can hold a record (the season of minYear-01-01), never before 2017/2018.
const minSeason = computed(() => Math.max(2017, minYear.value - 1));

const current = computed<Draft>(() =>
  props.staged && props.draft
    ? props.draft
    : { interval: ctx.state.interval.value, preset: ctx.state.preset.value },
);

const last30Interval = computed<Interval>(() => ({ from: addDays(ctx.today, -29), to: ctx.today }));
const allInterval = computed<Interval>(() => ({ from: FIRST_DAY, to: ctx.today }));

const seasonChips = computed(() =>
  [cur.value, cur.value - 1].map((season) => ({
    season,
    preset: `season:${season}` as PresetId,
    label: `${seasonLabel(season)} sezonas`,
  })),
);
const olderSeasons = computed(() => {
  const list: number[] = [];
  for (let s = cur.value - 2; s >= minSeason.value; s--) list.push(s);
  return list;
});
const olderValue = computed(() => {
  const p = current.value.preset;
  if (p === 'all') return 'all';
  return olderSeasons.value.some((s) => p === `season:${s}`) ? p : '';
});

function matchPreset(interval: Interval): PresetId {
  for (let s = cur.value; s >= minSeason.value; s--) {
    if (sameInterval(interval, seasonInterval(s))) return `season:${s}`;
  }
  if (sameInterval(interval, last30Interval.value)) return 'last30';
  if (sameInterval(interval, allInterval.value)) return 'all';
  return 'custom';
}

function apply(interval: Interval, preset: PresetId) {
  invalid.value = false;
  if (props.staged) {
    emit('update:draft', { interval, preset });
  } else {
    ctx.state.setInterval(interval, preset);
  }
}

function onOlderChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const value = select.value;
  if (!value) {
    // The placeholder is not a period: keep the current one.
    select.value = olderValue.value;
    return;
  }
  if (value === 'all') return apply(allInterval.value, 'all');
  const season = Number(value.replace('season:', ''));
  apply(seasonInterval(season), value as PresetId);
}

// --- Nuo / Iki ---------------------------------------------------------------

const datesOpen = ref(current.value.preset === 'custom');
watch(
  () => current.value.preset,
  (preset) => {
    if (preset === 'custom') datesOpen.value = true;
  },
);

const partsOf = (day: string): DateParts => ({
  year: day.slice(0, 4),
  month: `${Number(day.slice(5, 7))}`,
  day: `${Number(day.slice(8, 10))}`,
});

const startOf = (p: DateParts) => {
  const y = Number(p.year);
  if (p.month && p.day) return toDay(y, Number(p.month), Number(p.day));
  if (p.month) return toDay(y, Number(p.month), 1);
  return `${y}-01-01`;
};
const endOf = (p: DateParts) => {
  const y = Number(p.year);
  if (p.month && p.day) return toDay(y, Number(p.month), Number(p.day));
  if (p.month) return toDay(y, Number(p.month), daysInMonth(y, Number(p.month)));
  return `${y}-12-31`;
};

// SPEC §4.4: Iki empty → the end of the Nuo unit; Iki set → the end of the Iki unit.
function intervalFromParts(from: DateParts, to: DateParts): Interval & { valid: boolean } {
  const start = startOf(from);
  const interval = {
    from: start < FIRST_DAY ? FIRST_DAY : start,
    to: to.year ? endOf(to) : endOf(from),
  };
  return { ...interval, valid: interval.to >= interval.from };
}

const nuo = ref<DateParts>({ year: '', month: '', day: '' });
const iki = ref<DateParts>({ year: '', month: '', day: '' });
const invalid = ref(false);

function prefill(interval: Interval) {
  // Day precision. Iki cannot be a future day (the lists end today), so a season
  // that ends later is shown up to today; that covers every record.
  nuo.value = partsOf(interval.from);
  iki.value = partsOf(interval.to > ctx.today ? ctx.today : interval.to);
  invalid.value = false;
}
prefill(current.value.interval);

watch(
  () => current.value.interval,
  (interval) => {
    const fromParts = intervalFromParts(nuo.value, iki.value);
    // Keep the user's coarser choice (e.g. "2025 / Gruodis / —") when it already gives this interval.
    if (!fromParts.valid || !sameInterval(fromParts, interval)) prefill(interval);
    else invalid.value = false;
  },
);

function onPartsChange(row: 'nuo' | 'iki', value: DateParts) {
  if (row === 'nuo') nuo.value = value;
  else iki.value = value;
  const result = intervalFromParts(nuo.value, iki.value);
  if (!result.valid) {
    // Keep the previous valid interval applied.
    invalid.value = true;
    return;
  }
  invalid.value = false;
  const interval = { from: result.from, to: result.to };
  if (sameInterval(interval, current.value.interval)) return;
  apply(interval, matchPreset(interval));
}

const years = computed(() => {
  const last = Number(ctx.today.slice(0, 4));
  let first = Math.max(2017, minYear.value);
  const shown = [nuo.value.year, iki.value.year].filter(Boolean).map(Number);
  if (shown.length) first = Math.min(first, ...shown);
  const list: number[] = [];
  for (let y = last; y >= first; y--) list.push(y);
  return list;
});

// --- Info lines ----------------------------------------------------------------

const shownSeason = computed<number | null>(() => intervalSeason(current.value.interval));

const fallbackInfo = computed(() => {
  const fellBack = ctx.derived.defaultSeason.value === cur.value - 1;
  if (!fellBack || shownSeason.value !== cur.value - 1) return '';
  const start = `${cur.value}-10-15`;
  if (ctx.today < start) {
    // "Sezonas" is the hunting year everywhere; the Oct 15 – Mar 31 window is "vilkų medžioklė".
    return `${seasonLabel(cur.value)} sezono vilkų medžioklė prasideda ${start}. Rodomas praėjęs sezonas.`;
  }
  return `${seasonLabel(cur.value)} sezono vilkų su žinoma vieta dar nėra. Rodomas praėjęs sezonas.`;
});

function chipClass(active: boolean) {
  return [
    'inline-flex items-center rounded-full border px-3 font-medium transition-colors cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2',
    props.large ? 'h-11 text-base' : 'h-8 text-sm',
    active
      ? 'bg-gray-900 border-gray-900 text-white'
      : 'bg-white border-gray-400 text-gray-900 hover:bg-gray-100',
  ];
}
</script>
