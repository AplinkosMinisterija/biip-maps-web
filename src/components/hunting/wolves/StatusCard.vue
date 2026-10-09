<template>
  <section
    aria-labelledby="wolves-status-title"
    class="rounded-lg border border-gray-200 bg-white text-sm text-gray-800"
    :class="compact ? '' : 'p-3'"
  >
    <h2 id="wolves-status-title" :class="compact ? 'sr-only' : 'font-semibold text-gray-900'">
      Šis sezonas ({{ model.seasonLabel }})
    </h2>

    <!-- Mobile: one line that expands on tap (§7.3). -->
    <button
      v-if="compact"
      type="button"
      class="w-full min-h-[44px] px-3 py-2 flex items-center gap-2 text-left rounded-lg"
      :class="focusRing"
      :aria-expanded="expanded"
      aria-controls="wolves-status-body"
      @click="expanded = !expanded"
    >
      <span v-if="loading" class="flex-1 text-gray-600">Įkeliama…</span>
      <template v-else>
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="dotClass" aria-hidden="true" />
        <span class="flex-1 font-semibold">{{ title }}</span>
      </template>
      <UiIcon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="16" aria-hidden="true" />
    </button>

    <div
      v-if="!compact || expanded"
      id="wolves-status-body"
      class="flex flex-col gap-2"
      :class="compact ? 'px-3 pb-3' : ''"
    >
      <p class="text-xs text-gray-600">
        Rodoma einamajam sezonui, nepriklausomai nuo pasirinkto laikotarpio.
      </p>

      <div v-if="loading" aria-busy="true">
        <div class="animate-pulse flex flex-col gap-2" aria-hidden="true">
          <div class="h-4 bg-gray-200 rounded w-3/4" />
          <div class="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <p class="text-xs text-gray-600 mt-1">Įkeliama…</p>
      </div>

      <template v-else>
        <p v-if="!compact" class="flex items-start gap-2 font-semibold text-gray-900">
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
            :class="dotClass"
            aria-hidden="true"
          />
          <span>{{ title }}</span>
        </p>

        <button
          v-if="model.state === 'unavailable'"
          type="button"
          class="self-start px-3 py-2 min-h-[44px] md:min-h-0 rounded bg-blue-50 text-blue-800 font-semibold text-xs hover:bg-blue-100"
          :class="focusRing"
          @click="ctx.data.reloadTotals()"
        >
          Bandyti dar kartą
        </button>

        <template v-else>
          <p v-if="line2">{{ line2 }}</p>
          <progress
            v-if="showProgress && model.limit"
            class="wolves-progress w-full h-2"
            :max="model.limit"
            :value="Math.min(model.hunted || 0, model.limit)"
            :aria-valuetext="`Sumedžiota ${model.hunted || 0} iš ${model.limit}`"
          />
          <button
            type="button"
            class="self-start text-xs font-semibold text-blue-800 underline rounded min-h-[44px] md:min-h-[24px]"
            :class="focusRing"
            :aria-expanded="more"
            aria-controls="wolves-status-details"
            @click="more = !more"
          >
            {{ more ? 'Mažiau' : 'Daugiau' }}
          </button>
          <ul
            v-if="more"
            id="wolves-status-details"
            class="flex flex-col gap-1 text-xs text-gray-700"
          >
            <li v-for="text in details" :key="text">{{ text }}</li>
          </ul>
        </template>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { formatDateTime, formatInt } from '@/utils/hunting/dates';
import type { StatusState } from '@/utils/hunting/types';

const ctx = inject(WOLVES_CTX)!;
const model = ctx.derived.status;
const expanded = ref(false);
const more = ref(false);
const updatedAt = ref<Date | null>(null);

const compact = computed(() => ctx.isMobile.value);
const loading = computed(() => !ctx.data.totals.value && !ctx.data.totalsFailed.value);

watch(
  ctx.data.totals,
  (totals) => {
    if (totals) updatedAt.value = new Date();
  },
  { immediate: true },
);

const DOTS: Record<StatusState, string> = {
  unavailable: 'bg-gray-400',
  notApproved: 'bg-gray-400',
  beforeStart: 'bg-blue-600',
  exhausted: 'bg-red-600',
  littleLeft: 'bg-amber-500',
  ongoing: 'bg-green-600',
};
const dotClass = computed(() => DOTS[model.value.state]);

const taken = computed(() => Math.max(model.value.hunted || 0, model.value.points));

const title = computed(() => {
  const m = model.value;
  switch (m.state) {
    case 'unavailable':
      return 'Limito duomenys šiuo metu nepasiekiami.';
    case 'notApproved':
      return `Vilkų limitas ${m.seasonLabel} sezonui dar nepatvirtintas`;
    case 'beforeStart':
      return `Vilkų medžioklė prasidės ${m.wolfStartDay}`;
    case 'exhausted':
      return 'Vilkų limitas išnaudotas';
    case 'littleLeft':
      return 'Vilkų medžioklė vyksta – limito liko nedaug';
    default:
      return 'Vilkų medžioklė vyksta';
  }
});

const line2 = computed(() => {
  const m = model.value;
  const limit = formatInt(m.limit || 0);
  switch (m.state) {
    case 'notApproved':
      return ctx.today < m.wolfStartDay
        ? `Vilkų medžioklė prasidės ${m.wolfStartDay}.`
        : `Sumedžiota ${formatInt(m.hunted || 0)}.`;
    case 'beforeStart':
      return `Šio sezono limitas: ${limit}.`;
    case 'exhausted':
      return `Sumedžiota ${formatInt(taken.value)} iš ${limit}.`;
    case 'littleLeft':
    case 'ongoing':
      return `Sumedžiota ${formatInt(taken.value)} iš ${limit} · Liko ${formatInt(
        Math.max(0, m.remaining || 0),
      )}`;
    default:
      return '';
  }
});

const showProgress = computed(() =>
  ['exhausted', 'littleLeft', 'ongoing'].includes(model.value.state),
);

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';

const details = computed(() => {
  const m = model.value;
  const list = [
    'Apie sumedžiotą vilką pranešama per 12 val., todėl skaičius gali vėluoti.',
    'Tai informacinis rodiklis, ne oficialus pranešimas apie medžioklės nutraukimą.',
  ];
  if (m.hunted != null && m.points !== m.hunted) {
    list.push(
      `Žemėlapyje su vieta: ${formatInt(m.points)}; oficialiai užregistruota: ${formatInt(m.hunted)}.`,
    );
  }
  if (updatedAt.value) list.push(`Atnaujinta ${formatDateTime(updatedAt.value).slice(11)}`);
  return list;
});
</script>

<style scoped>
.wolves-progress {
  appearance: none;
  border-radius: 9999px;
  overflow: hidden;
  background: #e5e7eb;
}
.wolves-progress::-webkit-progress-bar {
  background: #e5e7eb;
}
.wolves-progress::-webkit-progress-value {
  background: #b45309;
}
.wolves-progress::-moz-progress-bar {
  background: #b45309;
}
</style>
