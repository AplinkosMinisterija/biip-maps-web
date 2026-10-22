<template>
  <!-- Until the records arrive: one loading line, no "Rodoma: —" and no guessed period. -->
  <p v-if="loading" class="text-sm font-semibold text-ink-muted">{{ loadingText }}</p>
  <div v-else-if="ctx.data.dataset.value" class="flex items-start justify-between gap-2">
    <!-- In the hub the Vilkai tab announces the sentence once, debounced; the wolves page
         has only this live region. -->
    <p :aria-live="inHub ? undefined : 'polite'" class="text-sm text-ink font-semibold">
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

const ctx = inject(WOLVES_CTX)!;
const inHub = !!inject(HUB_CTX, null);

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
</script>
