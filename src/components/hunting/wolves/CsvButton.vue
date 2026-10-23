<template>
  <button
    type="button"
    :class="[BTN_SECONDARY, 'shrink-0 whitespace-nowrap disabled:cursor-not-allowed max-md:h-11']"
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
import { BTN_SECONDARY } from '@/components/hunting/hub/shell/controls';

import { CSV_MIME, buildCsv, csvFileName } from '@/utils/hunting/csv';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { vilkaiReconcile, vilkaiReconcileCsv } from '@/utils/hunting/hub/topics/vilkai';

const ctx = inject(WOLVES_CTX)!;
const { state, derived, data } = ctx;
// The hub (optional): its snapshot meta holds the official AM count per season.
const hub = inject(HUB_CTX, null);

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
  // A whole closed season of all Lithuania: the official AM figure next to the located total.
  const attrs = state.attrs.value;
  const reconcile =
    sav === null && !attrs.age.length && !attrs.sex.length && !attrs.method.length
      ? vilkaiReconcile(
          hub?.data.snapshot.value?.meta,
          derived.intervalSeason.value,
          ctx.currentSeason,
          rows.length,
        )
      : null;
  const notes = reconcile ? vilkaiReconcileCsv(reconcile) : [];
  const csv = buildCsv(rows, { interval, placeLabel: place, withMunicipality, notes });
  const blob = new Blob([csv], { type: CSV_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFileName(interval, savName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>
