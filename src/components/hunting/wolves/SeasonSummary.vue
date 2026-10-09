<template>
  <section aria-labelledby="wolves-summary-title" class="flex flex-col gap-2 text-sm text-gray-800">
    <h2 id="wolves-summary-title" class="sr-only">
      Suvestinė: {{ ctx.derived.periodLabel.value }}
    </h2>

    <dl
      class="grid gap-2"
      :class="season == null ? 'grid-cols-1' : remaining != null ? 'grid-cols-3' : 'grid-cols-2'"
    >
      <div class="rounded-lg border border-gray-200 p-3">
        <dt class="text-xs text-gray-600 flex items-center gap-1">
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
        <dd class="text-2xl font-semibold tabular-nums text-gray-900">{{ count }}</dd>
      </div>

      <template v-if="season != null">
        <div class="rounded-lg border border-gray-200 p-3">
          <dt class="text-xs text-gray-600 flex items-center gap-1">
            Limitas
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
            class="font-semibold tabular-nums text-gray-900"
            :class="limitText.length > 6 ? 'text-sm mt-2' : 'text-2xl'"
          >
            {{ limitText }}
          </dd>
        </div>
        <div v-if="remaining != null" class="rounded-lg border border-gray-200 p-3">
          <dt class="text-xs text-gray-600">Liko</dt>
          <dd class="text-2xl font-semibold tabular-nums text-gray-900">{{ remaining }}</dd>
        </div>
      </template>
    </dl>

    <p v-if="tips.located" id="wolves-tip-located" class="text-xs text-gray-700">
      Skaičiuojami vilkai, kurių sumedžiojimo vieta ir data žinomos (BIOMON ir BIIP).
    </p>
    <p v-if="tips.limit && limitUnknownPast" id="wolves-tip-limit" class="text-xs text-gray-700">
      Šio sezono limitas šiame puslapyje dar nepateikiamas.
    </p>

    <p v-if="season == null" class="text-xs text-gray-600">Limitas nustatomas visam sezonui.</p>

    <p v-if="offWindow > 0" class="text-xs text-gray-700">
      Iš jų {{ formatInt(offWindow) }} ne vilkų medžioklės laikotarpiu.
    </p>

    <div v-if="paperRows > 0" class="text-xs text-gray-700">
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

    <a
      v-if="season != null && season < ctx.currentSeason"
      :href="AM_WOLVES_URL"
      target="_blank"
      rel="noopener"
      class="self-start text-xs font-semibold text-blue-800 underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    >
      Oficiali sezono suvestinė – am.lrv.lt
      <span class="sr-only">(atidaroma naujame lange)</span>
    </a>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, reactive } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { formatInt, pluralLt } from '@/utils/hunting/dates';
import { AM_WOLVES_URL, WOLF_LIMITS } from '@/utils/hunting/labels';

const ctx = inject(WOLVES_CTX)!;
const { data, derived } = ctx;

const tips = reactive({ located: false, limit: false, paper: false });
const tipButton =
  'w-11 h-11 -my-3 md:w-6 md:h-6 md:my-0 shrink-0 inline-flex items-center justify-center rounded-full text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';

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

const offWindow = computed(() => derived.filtered.value.filter((r) => !r.inWolfWindow).length);

// Hidden when the season list (E3) failed: paper rows cannot be placed in a season then.
const paperRows = computed(() => {
  if (season.value == null || !data.seasons.value.length) return 0;
  return data.dataset.value?.paperRowsBySeason[season.value] || 0;
});
</script>
