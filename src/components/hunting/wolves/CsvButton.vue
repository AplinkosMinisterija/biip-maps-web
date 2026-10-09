<template>
  <button
    type="button"
    class="inline-flex items-center justify-center gap-2 min-h-[44px] md:min-h-[32px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    :disabled="!records.length"
    @click="download"
  >
    <UiIcon name="download" :size="16" aria-hidden="true" />
    Atsisiųsti CSV
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { hasMunicipalities } from '@/utils/hunting/municipalities';

import { CSV_MIME, buildCsv, csvFileName } from '@/utils/hunting/csv';

const ctx = inject(WOLVES_CTX)!;
const { state, derived, data } = ctx;

const records = computed(() => derived.filtered.value);

function download() {
  const rows = records.value;
  if (!rows.length) return;

  const withMunicipality = hasMunicipalities(data.dataset.value?.records || []);
  const sav = state.sav.value;
  const savName =
    sav !== null ? rows.find((r) => r.municipalityCode === sav)?.municipalityName : null;
  const place = savName || (sav !== null ? 'savivaldybė' : 'visa Lietuva');

  const interval = state.interval.value;
  const csv = buildCsv(rows, { interval, placeLabel: place, withMunicipality });
  const blob = new Blob([csv], { type: CSV_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFileName(interval);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>
