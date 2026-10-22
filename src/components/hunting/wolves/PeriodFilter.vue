<template>
  <div class="min-w-0">
    <!-- The hub's period panel (one radio group, as Stebėjimai; CONTROLS-06). -->
    <HuntingHubShellPeriodPanel
      :kind="choice"
      :season="seasonPick"
      :seasons="seasons"
      all-label="Visi sezonai"
      :nuo="nuo"
      :iki="iki"
      :years="years"
      :today="ctx.today"
      :invalid="invalid"
      :large="large"
      :show-legend="!staged && showSeasonNote"
      @pick="pick"
      @season="onSeason"
      @parts="onPartsChange"
    />

    <p v-if="showSeasonNote && fallbackInfo" class="mt-3 flex items-start gap-1 text-xs text-ink">
      <!-- Drawn, not the "ⓘ" character: default fonts render that glyph as a box (SPEC2 §7). -->
      <span :class="infoGlyph" aria-hidden="true">i</span>
      <span>{{ fallbackInfo }}</span>
    </p>
    <p v-if="showSeasonNote && shownSeason !== null" class="mt-2 text-xs text-ink-muted">
      Vilkų medžioklė: {{ shownSeason }}-10-15 – {{ shownSeason + 1 }}-03-31. Sezonas baigiamas
      anksčiau, jei išnaudojamas limitas.
    </p>
  </div>
</template>

<script setup lang="ts">
// Period presets plus the Nuo/Iki (Metai · Mėnuo · Diena) picker (SPEC §4.4, §6.2), drawn by
// the hub's HuntingHubShellPeriodPanel: Medžioklės sezonas [select] · Paskutinės 30 d. ·
// Visi sezonai · Nuo–iki. The URL keys and presets are unchanged.
// Live mode (default) applies every change to the shared state immediately.
// Staged mode (used by PeriodSheet) only emits `update:draft`; the sheet applies it.
import { computed, inject, ref, watch, type PropType } from 'vue';
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
  // The season notes ("… vilkų medžioklė prasideda …" and "Vilkų medžioklė: … – …"); the hub
  // passes false because its status line already names the dates (SPEC2 §7).
  showSeasonNote: { type: Boolean, default: true },
});
const emit = defineEmits(['update:draft']);

const ctx = inject(WOLVES_CTX)!;

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

// Newest first, down to the first season that can hold a record.
const seasons = computed(() => {
  const list: number[] = [];
  for (let s = cur.value; s >= minSeason.value; s--) list.push(s);
  return list;
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

// --- The radio group ------------------------------------------------------------

type Kind = 'season' | '30d' | 'all' | 'range';
const kindOf = (preset: PresetId): Kind => {
  if (preset.startsWith('season:')) return 'season';
  if (preset === 'last30') return '30d';
  if (preset === 'all') return 'all';
  return 'range';
};
const seasonOf = (preset: PresetId) =>
  preset.startsWith('season:') ? Number(preset.slice(7)) : ctx.derived.defaultSeason.value;

// The radio follows the applied preset, except that "Nuo–iki" stays chosen when its dates
// give a preset's interval (a whole season, say). The season select keeps the chosen season,
// or shows the default (fallback) one.
const choice = ref<Kind>(kindOf(current.value.preset));
const seasonPick = ref<number>(seasonOf(current.value.preset));
let fromRange = false;
watch(
  () => current.value.preset,
  (preset) => {
    if (!fromRange) choice.value = kindOf(preset);
    fromRange = false;
    if (preset.startsWith('season:')) seasonPick.value = seasonOf(preset);
  },
);

function applyRange() {
  const result = intervalFromParts(nuo.value, iki.value);
  if (!result.valid) {
    // Keep the previous valid interval applied.
    invalid.value = true;
    return;
  }
  invalid.value = false;
  const interval = { from: result.from, to: result.to };
  if (sameInterval(interval, current.value.interval)) return;
  const preset = matchPreset(interval);
  fromRange = preset !== current.value.preset;
  apply(interval, preset);
}

function pick(kind: Kind) {
  choice.value = kind;
  if (kind === 'season') apply(seasonInterval(seasonPick.value), `season:${seasonPick.value}`);
  else if (kind === '30d') apply(last30Interval.value, 'last30');
  else if (kind === 'all') apply(allInterval.value, 'all');
  else applyRange();
}

function onSeason(season: number) {
  seasonPick.value = season;
  pick('season');
}

// --- Nuo / Iki ---------------------------------------------------------------

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
  choice.value = 'range';
  applyRange();
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

const infoGlyph =
  'mt-px w-3.5 h-3.5 shrink-0 rounded-full border border-current text-[9px] font-bold leading-none flex items-center justify-center';

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
</script>
