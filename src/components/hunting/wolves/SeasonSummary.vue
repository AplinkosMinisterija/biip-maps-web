<template>
  <section aria-labelledby="wolves-summary-title" class="flex flex-col gap-2 text-sm text-ink">
    <h2 id="wolves-summary-title" class="sr-only">
      Suvestinė: {{ ctx.derived.periodLabel.value }}
    </h2>

    <!-- The hub's tile anatomy (KpiTile): the number first, the label under it. The DOM keeps
         dt before dd; flex-col-reverse puts the value on top. -->
    <dl
      class="grid items-start gap-2"
      :class="season == null ? 'grid-cols-1' : remaining != null ? 'grid-cols-3' : 'grid-cols-2'"
    >
      <div :class="TILE">
        <dt :class="LABEL">
          Sumedžiota (su vieta)
          <button
            type="button"
            :class="tipButton"
            aria-label="Paaiškinimas: Sumedžiota (su vieta)"
            :aria-expanded="tips.located"
            aria-controls="wolves-tip-located"
            @click="tips.located = !tips.located"
          >
            <span :class="tipGlyph" aria-hidden="true">i</span>
          </button>
        </dt>
        <dd :class="[KPI_VALUE, VALUE]">{{ count }}</dd>
      </div>

      <template v-if="season != null">
        <div :class="TILE">
          <dt :class="LABEL">
            <!-- Names its season, so it cannot be read as the status line's limit (SPEC2 §7),
                 and its scope when a municipality is chosen (J-07). -->
            <span>
              Limitas {{ seasonLabel(season) }}
              <template v-if="scoped">(visa Lietuva)</template>
            </span>
            <button
              v-if="limitUnknownPast"
              type="button"
              :class="tipButton"
              aria-label="Paaiškinimas: Limitas"
              :aria-expanded="tips.limit"
              aria-controls="wolves-tip-limit"
              @click="tips.limit = !tips.limit"
            >
              <span :class="tipGlyph" aria-hidden="true">i</span>
            </button>
          </dt>
          <dd
            :class="[KPI_VALUE, limitText.length > 6 ? 'text-base leading-6' : VALUE, scopedValue]"
          >
            {{ limitText }}
          </dd>
        </div>
        <div v-if="remaining != null" :class="TILE">
          <dt :class="LABEL">Liko<template v-if="scoped">&nbsp;(visa Lietuva)</template></dt>
          <dd :class="[KPI_VALUE, VALUE, scopedValue]">{{ remaining }}</dd>
        </div>
      </template>
    </dl>

    <p v-if="tips.located" id="wolves-tip-located" class="text-xs text-ink-muted">
      Skaičiuojami vilkai, kurių sumedžiojimo vieta ir data žinomos (BIOMON ir BĮIP).
    </p>
    <p v-if="tips.limit && limitUnknownPast" id="wolves-tip-limit" class="text-xs text-ink-muted">
      Šio sezono limitas šiame puslapyje dar nepateikiamas.
    </p>

    <p v-if="season == null" class="text-xs text-ink-muted">Limitas nustatomas visam sezonui.</p>

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
          <span :class="tipGlyph" aria-hidden="true">i</span>
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
import { INLINE_LINK, KPI_VALUE } from '@/components/hunting/hub/shell/controls';
import { formatInt, pluralLt, seasonLabel } from '@/utils/hunting/dates';
import { AM_WOLVES_URL, WOLF_LIMITS } from '@/utils/hunting/labels';

const ctx = inject(WOLVES_CTX)!;
// The hub (optional): its snapshot meta holds the official AM count per season.
const hub = inject(HUB_CTX, null);
const { data, derived } = ctx;

const TILE =
  'flex min-w-0 flex-col-reverse gap-1 rounded-lg border border-line bg-white px-3 py-2.5';
const LABEL = 'flex items-center gap-1 text-[13px] font-medium leading-[18px] text-ink-muted';
const VALUE = 'text-[28px] leading-8';

const tips = reactive({ located: false, limit: false, paper: false });
const tipButton =
  'w-11 h-11 -my-3 md:w-6 md:h-6 md:my-0 shrink-0 inline-flex items-center justify-center rounded-full text-brand hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const tipGlyph =
  'w-4 h-4 rounded-full border border-current text-[10px] font-bold leading-none flex items-center justify-center';

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

// A municipality is chosen: the limit tiles stay national, and say so (J-07).
const scoped = computed(() => ctx.state.sav.value != null);
const scopedValue = computed(() => (scoped.value ? '!text-ink-muted' : ''));

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
