<template>
  <!-- Over the map: the loading pill and the empty-result card (§10). -->
  <template v-if="placement === 'map'">
    <div
      v-if="loadingWithoutData"
      role="status"
      class="absolute z-30 left-1/2 -translate-x-1/2 top-16 md:top-4 max-w-[calc(100%-32px)] flex items-center gap-2 rounded-full bg-white shadow-md px-4 py-2 text-sm text-gray-800"
    >
      <UiIcon name="spinner" :size="18" aria-hidden="true" />
      <span>{{ pillText }}</span>
    </div>
    <div
      v-if="isEmpty"
      class="absolute z-20 inset-0 flex items-center justify-center pointer-events-none p-4"
    >
      <div
        class="pointer-events-auto bg-white rounded-lg shadow-md p-4 max-w-sm flex flex-col gap-2 text-sm text-gray-800 md:ml-[416px]"
      >
        <p class="font-semibold text-gray-900">
          Pasirinktu laikotarpiu sumedžiotų vilkų su žinoma vieta nėra.
        </p>
        <p v-if="outsideWolfWindow">
          Vilkų medžioklės sezonas trunka nuo spalio 15 d. iki kovo 31 d.
        </p>
        <button
          v-if="!isDefaultSeason"
          type="button"
          class="self-start px-4 py-3 md:py-2 rounded bg-blue-50 text-blue-800 text-xs font-semibold hover:bg-blue-100"
          :class="focusRing"
          @click="showDefaultSeason"
        >
          Rodyti {{ defaultSeason }}/{{ defaultSeason + 1 }} sezoną
        </button>
      </div>
    </div>
  </template>

  <!-- In the panel: errors, cache notes and the data timestamp (§10). -->
  <template v-else>
    <UiAlert v-if="hardError" type="danger" class="!items-start !font-normal flex-col gap-2">
      <p class="font-semibold">{{ errorText }}</p>
      <button
        type="button"
        class="self-start px-3 py-2 min-h-[44px] md:min-h-0 rounded bg-white border border-red-200 text-xs font-semibold text-red-900 hover:bg-red-100"
        :class="focusRing"
        @click="data.reload()"
      >
        Bandyti dar kartą
      </button>
    </UiAlert>
    <div v-else-if="staleError" class="flex flex-wrap items-center gap-2 text-xs text-gray-700">
      <span>Rodomi {{ fetchedAtText }} duomenys; naujesnių gauti nepavyko.</span>
      <button
        type="button"
        class="px-2 py-1 min-h-[44px] md:min-h-[24px] rounded font-semibold text-blue-800 underline"
        :class="focusRing"
        @click="data.reload()"
      >
        Bandyti dar kartą
      </button>
    </div>
    <p v-else-if="refreshing" class="text-xs text-gray-700">
      Rodomi {{ fetchedAtText }} duomenys. Atnaujinama…
    </p>
    <p v-else-if="refreshedAt" class="text-xs text-gray-600">
      Duomenys atnaujinti {{ refreshedAt }}
    </p>
    <p v-else-if="data.fetchedAt.value" class="text-xs text-gray-600">
      Duomenys gauti {{ fetchedAtText }}
    </p>
  </template>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type PropType } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { formatDateTime, seasonInterval, seasonOfDay } from '@/utils/hunting/dates';

defineProps({
  placement: { type: String as PropType<'map' | 'panel'>, default: 'panel' },
});

const ctx = inject(WOLVES_CTX)!;
const { data, state, derived } = ctx;
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const GENERIC_ERROR = 'Nepavyko įkelti vilkų duomenų. Patikrinkite ryšį arba bandykite vėliau.';

const loading = computed(() => data.phase.value === 'loading' || data.phase.value === 'slow');
const loadingWithoutData = computed(() => loading.value && !data.dataset.value);
const pillText = computed(() =>
  data.phase.value === 'slow'
    ? 'Duomenys kraunami ilgiau nei įprastai, palaukite…'
    : 'Kraunami vilkų duomenys…',
);

const hardError = computed(() => data.phase.value === 'error' && !data.dataset.value);
const staleError = computed(() => data.phase.value === 'error' && !!data.dataset.value);
const refreshing = computed(() => loading.value && !!data.dataset.value);

// useWolvesData puts user-facing Lithuanian messages (they start with "Nepavyko")
// into `error`; anything else is technical and gets the generic text.
const errorText = computed(() => {
  const error = data.error.value;
  return error && error.startsWith('Nepavyko') ? error : GENERIC_ERROR;
});

const fetchedAtText = computed(() =>
  data.fetchedAt.value ? formatDateTime(data.fetchedAt.value) : '',
);

// "Duomenys atnaujinti HH:mm" only after a stale cache was refreshed in the background.
const refreshedAt = ref<string | null>(null);
let sawStale = data.fromCache.value === 'stale';
watch(data.fromCache, (value) => {
  if (value === 'stale') sawStale = true;
});
watch(data.phase, (phase) => {
  if (phase === 'ready' && sawStale && data.fromCache.value !== 'stale' && data.fetchedAt.value) {
    refreshedAt.value = formatDateTime(data.fetchedAt.value).slice(11);
    sawStale = false;
  }
});

const isEmpty = computed(
  () => !!data.dataset.value && !loading.value && derived.filtered.value.length === 0,
);

// The whole interval lies in Apr 1 – Oct 14 of one hunting year.
const outsideWolfWindow = computed(() => {
  const { from, to } = state.interval.value;
  const season = seasonOfDay(from);
  return seasonOfDay(to) === season && to < `${season}-10-15`;
});

const defaultSeason = computed(() => derived.defaultSeason.value);
const isDefaultSeason = computed(() => derived.intervalSeason.value === defaultSeason.value);

const showDefaultSeason = () => {
  state.setInterval(seasonInterval(defaultSeason.value), `season:${defaultSeason.value}`);
};
</script>
