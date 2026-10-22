<template>
  <!-- The hub's period panel, shared with Vilkai (CONTROLS-06). -->
  <HuntingHubShellPeriodPanel
    :kind="choice"
    :season="seasonPick"
    :seasons="ctx.derived.seasons.value"
    :all-label="SS.periodAll"
    :nuo="nuo"
    :iki="iki"
    :years="years"
    :today="ctx.today"
    :invalid="invalid"
    :large="large"
    @pick="pick"
    @season="onSeasonPick"
    @parts="onParts"
  />
</template>

<script setup lang="ts">
// Period picker of the Stebėjimai topic (STEB-SPEC §3.3), drawn by the hub's period panel:
// Medžioklės sezonas (select) · Paskutinės 30 d. · Visas laikotarpis · Nuo–iki
// (Metai/Mėnuo/Diena selects; no native date inputs). Every valid change applies at once;
// an invalid range keeps the previous period.
import { computed, inject, ref, watch } from 'vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { intervalFromParts, seasonOfDay } from '@/utils/hunting/dates';
import { periodInterval, type StebPeriod } from '@/utils/hunting/hub/stebejimai/model';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';

interface Parts {
  year: string;
  month: string;
  day: string;
}
type Kind = StebPeriod['kind'];

defineProps({
  // Phones: larger targets and selects.
  large: { type: Boolean, default: false },
});

const ctx = inject(STEB_CTX)!;

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

function onSeasonPick(season: number) {
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
