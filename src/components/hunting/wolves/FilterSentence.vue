<template>
  <div class="flex items-start justify-between gap-2">
    <p aria-live="polite" class="text-sm text-gray-900 font-semibold">
      <template v-for="(part, i) in parts" :key="i">
        <span class="whitespace-nowrap">{{ part }}</span>
        <template v-if="i < parts.length - 1"> · </template>
      </template>
    </p>
    <button
      v-if="!ctx.derived.isDefaultView.value"
      type="button"
      aria-label="Atstatyti numatytąjį vaizdą"
      class="shrink-0 px-3 py-1 min-h-[44px] md:min-h-[24px] rounded border border-gray-300 text-xs font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      @click="ctx.state.reset()"
    >
      Atstatyti
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';

const ctx = inject(WOLVES_CTX)!;

// Wrap only between the parts, so dates such as 2025-12-01 never break at a hyphen.
const parts = computed(() => ctx.derived.sentence.value.split(' · '));
</script>
