<template>
  <!-- Until the records arrive: one loading line, no "Rodoma: —" and no guessed period. -->
  <p v-if="loading" class="text-sm font-semibold text-ink-muted">{{ loadingText }}</p>
  <!-- Hub: the answer sentence of every topic panel (question → answer → tiles), and on
       phones the official AM figure right under it, so the peek reconciles the totals. -->
  <div v-else-if="ctx.data.dataset.value && inHub" class="flex flex-col gap-1">
    <p class="text-base leading-6 text-ink"><NowrapText :text="answer" /></p>
    <p v-if="officialLine" class="text-sm text-ink-muted">{{ officialLine }}</p>
  </div>
  <div v-else-if="ctx.data.dataset.value" class="flex items-start justify-between gap-2">
    <!-- The wolves page has only this live region (the hub announces its answer itself). -->
    <p aria-live="polite" class="text-sm text-ink font-semibold">
      <template v-for="(part, i) in parts" :key="i">
        <span class="whitespace-nowrap">{{ part }}</span>
        <template v-if="i < parts.length - 1"> · </template>
      </template>
    </p>
    <button
      v-if="!ctx.derived.isDefaultView.value"
      type="button"
      aria-label="Atstatyti numatytąjį vaizdą"
      class="shrink-0 px-3 py-1 min-h-[44px] md:min-h-[24px] rounded-full border border-line-strong text-xs font-semibold text-ink hover:bg-brand-50"
      :class="FOCUS_RING"
      @click="ctx.state.reset()"
    >
      Atstatyti
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { FOCUS_RING } from '@/components/hunting/hub/shell/controls';
import NowrapText from '@/components/hunting/hub/shell/NowrapText.vue';
import { formatInt } from '@/utils/hunting/dates';
import { vilkaiAnswer, vilkaiReconcile } from '@/utils/hunting/hub/topics/vilkai';

const ctx = inject(WOLVES_CTX)!;
const hub = inject(HUB_CTX, null);
const inHub = !!hub;

const loading = computed(
  () =>
    !ctx.data.dataset.value &&
    (ctx.data.phase.value === 'loading' || ctx.data.phase.value === 'slow'),
);
const loadingText = computed(() =>
  ctx.data.phase.value === 'slow'
    ? 'Duomenys kraunami ilgiau nei įprastai, palaukite…'
    : 'Kraunami vilkų duomenys…',
);

// Wrap only between the parts, so dates such as 2025-12-01 never break at a hyphen.
const parts = computed(() => ctx.derived.sentence.value.split(' · '));

const placeName = computed(() => {
  const sav = ctx.state.sav.value;
  if (sav == null) return null;
  const match = ctx.data.dataset.value?.records.find((r) => r.municipalityCode === sav);
  return match?.municipalityName || `Savivaldybė ${sav}`;
});

const answer = computed(() =>
  vilkaiAnswer({
    count: ctx.derived.filtered.value.length,
    preset: ctx.state.preset.value,
    interval: ctx.state.interval.value,
    place: placeName.value,
    attrs: ctx.state.attrs.value,
  }),
);

// Phones: the panel's "Oficialus AM skaičius" line is below the fold of the sheet (J-02).
const officialLine = computed(() => {
  if (!ctx.isMobile.value || ctx.state.sav.value != null) return null;
  const attrs = ctx.state.attrs.value;
  if (attrs.age.length || attrs.sex.length || attrs.method.length) return null;
  const r = vilkaiReconcile(
    hub?.data.snapshot.value?.meta,
    ctx.derived.intervalSeason.value,
    ctx.currentSeason,
    ctx.derived.filtered.value.length,
  );
  return r
    ? `Oficialus AM skaičius: ${formatInt(r.official)}; skaičiai skiriasi, nes skaičiuojama kitaip.`
    : null;
});
</script>
