<template>
  <section aria-labelledby="wolves-summary-title" class="flex flex-col gap-2 text-sm text-ink">
    <h2 id="wolves-summary-title" class="sr-only">
      Suvestinė: {{ ctx.derived.periodLabel.value }}
    </h2>

    <!-- The hub's tile anatomy (KpiTile): the number first, the label under it. The DOM keeps
         dt before dd; flex-col-reverse puts the value on top. Two columns; with three tiles
         the first spans both, and the tiles of a row share one height (VISUAL-09). -->
    <dl class="grid items-stretch gap-2" :class="tileCount > 1 ? 'grid-cols-2' : 'grid-cols-1'">
      <div :class="[TILE, tileCount >= 3 ? 'col-span-2' : '']">
        <dt :class="LABEL">
          <span class="flex-1">Sumedžiota, vieta žinoma</span>
          <button
            type="button"
            :class="tipButton"
            aria-label="Paaiškinimas: Sumedžiota, vieta žinoma"
            :aria-expanded="tips.located"
            aria-controls="wolves-tip-located"
            @click="tips.located = !tips.located"
          >
            <svg v-bind="TIP_SVG"><path v-bind="TIP_PATH" /></svg>
          </button>
        </dt>
        <dd :class="[KPI_VALUE, VALUE]">{{ count }}</dd>
      </div>

      <!-- A municipality is chosen: the national limit is not comparable with the local
           count, so the second tile is the same count for all of Lithuania (JOURNEYS-15). -->
      <div v-if="scoped" :class="TILE">
        <dt :class="LABEL"><span class="flex-1">Lietuvoje, vieta žinoma</span></dt>
        <dd :class="[KPI_VALUE, VALUE]">{{ nationalCount }}</dd>
      </div>

      <template v-else-if="season != null">
        <div :class="TILE">
          <dt :class="LABEL">
            <!-- Names its season, so it cannot be read as the status line's limit (SPEC2 §7). -->
            <span class="flex-1">Limitas {{ seasonLabel(season) }}</span>
            <button
              v-if="limitUnknownPast"
              type="button"
              :class="tipButton"
              aria-label="Paaiškinimas: Limitas"
              :aria-expanded="tips.limit"
              aria-controls="wolves-tip-limit"
              @click="tips.limit = !tips.limit"
            >
              <svg v-bind="TIP_SVG"><path v-bind="TIP_PATH" /></svg>
            </button>
          </dt>
          <dd :class="[KPI_VALUE, limitText.length > 6 ? 'text-base leading-6' : VALUE]">
            {{ limitText }}
          </dd>
        </div>
        <div v-if="remaining != null" :class="TILE">
          <dt :class="LABEL"><span class="flex-1">Liko</span></dt>
          <dd :class="[KPI_VALUE, VALUE]">{{ remaining }}</dd>
        </div>
      </template>
    </dl>

    <p v-if="tips.located" id="wolves-tip-located" class="text-xs text-ink-muted">
      Skaičiuojami vilkai, kurių sumedžiojimo vieta ir data žinomos (BIOMON ir BĮIP).
    </p>
    <p v-if="tips.limit && limitUnknownPast" id="wolves-tip-limit" class="text-xs text-ink-muted">
      Šio sezono limitas šiame puslapyje dar nepateikiamas.
    </p>

    <p v-if="season == null && !scoped" class="text-xs text-ink-muted">
      Limitas nustatomas visam sezonui.
    </p>

    <p v-if="offWindow > 0" class="text-xs text-ink-muted">
      Iš jų {{ formatInt(offWindow) }} ne vilkų medžioklės laikotarpiu.
    </p>

    <div v-if="paperRows > 0" class="text-xs text-ink-muted">
      <p class="flex items-start gap-1">
        <span>
          Be vietos: {{ formatInt(paperRows) }}
          {{ pluralLt(paperRows, ['įrašas', 'įrašai', 'įrašų']) }}
          (popieriniai suvestiniai duomenys, neįtraukti)
        </span>
        <button
          type="button"
          :class="tipButton"
          aria-label="Paaiškinimas: Be vietos"
          :aria-expanded="tips.paper"
          aria-controls="wolves-tip-paper"
          @click="tips.paper = !tips.paper"
        >
          <svg v-bind="TIP_SVG"><path v-bind="TIP_PATH" /></svg>
        </button>
      </p>
      <p v-if="tips.paper" id="wolves-tip-paper" class="mt-1">
        Po sezono popieriniais lapais pateiktos suvestinės: viena eilutė gali reikšti kelis vilkus,
        vieta ir tikroji data nežinomos. Neįtraukiama, kad vilkai nebūtų skaičiuojami du kartus su
        BIOMON.
      </p>
    </div>

    <!-- A closed season: the official AM figure next to the located count, so the three
         totals of the hub (Apžvalga, Vilkai, Laimikiai) are reconciled where they are read
         (OVERVIEW-07, J-04). -->
    <p v-if="closed && official != null" class="text-xs leading-4 text-ink">
      Oficialus AM skaičius: {{ formatInt(official) }}.
      <template v-if="wholeSeason && located != null">
        Čia – {{ formatInt(located) }} {{ pluralLt(located, ['vilkas', 'vilkai', 'vilkų']) }} su
        žinoma vieta; skaičiai skiriasi, nes skaičiuojama kitaip (žr. „Apie duomenis“).
      </template>
      <template v-else>Jis skaičiuojamas visai Lietuvai ir visam sezonui.</template>
    </p>
    <a
      v-if="closed"
      :href="AM_WOLVES_URL"
      target="_blank"
      rel="noopener"
      class="self-start text-xs"
      :class="INLINE_LINK"
    >
      Oficiali sezono suvestinė – am.lrv.lt
      <span class="sr-only">(atidaroma naujame lange)</span>
    </a>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, reactive } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { FOCUS_RING, INLINE_LINK, KPI_VALUE } from '@/components/hunting/hub/shell/controls';
import { formatInt, pluralLt, seasonLabel } from '@/utils/hunting/dates';
import { AM_WOLVES_URL, WOLF_LIMITS } from '@/utils/hunting/labels';
import { filterRecords } from '@/utils/hunting/wolves';

const ctx = inject(WOLVES_CTX)!;
// The hub (optional): its snapshot meta holds the official AM count per season.
const hub = inject(HUB_CTX, null);
const { data, derived } = ctx;

const TILE =
  'flex min-w-0 flex-col-reverse gap-1 rounded-lg border border-line bg-white px-3 py-2.5';
const LABEL = 'flex items-start gap-1 text-[13px] font-medium leading-[18px] text-ink-muted';
const VALUE = 'text-[28px] leading-8';

const tips = reactive({ located: false, limit: false, paper: false });
// The ⓘ of KpiTile: 16 px on desktop, a 44 px target on phones.
const tipButton = computed(() => [
  'flex shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink',
  FOCUS_RING,
  ctx.isMobile.value ? '-m-3 h-11 w-11' : 'h-4 w-4',
]);
const TIP_SVG = { viewBox: '0 0 20 20', width: 16, height: 16, 'aria-hidden': 'true' } as const;
// The circle, the stem and the dot of KpiTile's glyph as one path.
const TIP_PATH = {
  d: 'M10 1.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17M10 8.5v5.1M10 5.8v.01',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.6,
  'stroke-linecap': 'round',
} as const;

const season = computed(() => derived.intervalSeason.value);
const isCurrent = computed(() => season.value === ctx.currentSeason);
const located = computed(() => (data.dataset.value ? derived.filtered.value.length : null));
const count = computed(() => (located.value == null ? '—' : formatInt(located.value)));

// Current season: E2 wolfLimit (0 = not approved yet). Past seasons: constants (§4.6).
const limit = computed<number | null>(() => {
  if (season.value == null) return null;
  if (isCurrent.value) return data.totals.value ? data.totals.value.wolfLimit : null;
  return WOLF_LIMITS[season.value] ?? null;
});

const limitUnknownPast = computed(
  () => season.value != null && !isCurrent.value && limit.value == null,
);

const limitText = computed(() => {
  if (isCurrent.value && limit.value === 0) return 'Dar nepatvirtintas';
  return limit.value == null ? '—' : formatInt(limit.value);
});

const remaining = computed(() => {
  if (!isCurrent.value || !limit.value || located.value == null) return null;
  const hunted = data.totals.value?.wolfAmount || 0;
  return formatInt(Math.max(0, limit.value - Math.max(located.value, hunted)));
});

// A municipality is chosen: the national located count replaces the limit tiles.
const scoped = computed(() => ctx.state.sav.value != null);
const nationalCount = computed(() => {
  const records = data.dataset.value?.records;
  if (!records) return '—';
  const { age, sex, method } = ctx.state.attrs.value;
  return formatInt(
    filterRecords(records, { interval: ctx.state.interval.value, sav: null, age, sex, method })
      .length,
  );
});
const tileCount = computed(() => {
  if (scoped.value) return 2;
  if (season.value == null) return 1;
  return remaining.value != null ? 3 : 2;
});

const closed = computed(() => season.value != null && season.value < ctx.currentSeason);
const official = computed<number | null>(() => {
  if (season.value == null) return null;
  const s = hub?.data.snapshot.value?.meta?.static?.wolves?.seasons?.[String(season.value)];
  return s?.official ?? null;
});
// The count on screen is the whole season's located total: all of Lithuania, no attributes.
const wholeSeason = computed(() => {
  const attrs = ctx.state.attrs.value;
  return !scoped.value && !attrs.age.length && !attrs.sex.length && !attrs.method.length;
});

const offWindow = computed(() => derived.filtered.value.filter((r) => !r.inWolfWindow).length);

// Hidden when the season list (E3) failed: paper rows cannot be placed in a season then.
const paperRows = computed(() => {
  if (season.value == null || !data.seasons.value.length) return 0;
  return data.dataset.value?.paperRowsBySeason[season.value] || 0;
});
</script>
