<template>
  <p class="text-xs text-gray-700" :title="title">
    <!-- The acronyms carry their expansion (JOURNEYS-14). -->
    <template v-for="(part, i) in parts" :key="i">
      <abbr v-if="SOURCE_TITLES[part]" :title="SOURCE_TITLES[part]" class="no-underline">{{
        part
      }}</abbr>
      <template v-else>{{ part }}</template>
    </template>
    ·
    <button
      type="button"
      class="font-semibold text-brand underline rounded"
      :class="[focusRing, large ? 'inline-flex items-center min-h-[44px]' : '']"
      @click="ctx.openAbout()"
    >
      {{ S.provenanceLink }}
    </button>
  </p>
</template>

<script setup lang="ts">
import { computed, inject, type PropType } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { Provenance } from '@/utils/hunting/hub/types';
import { S, SOURCE_TITLES } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';

// One provenance line per panel (§5): the text comes without " · Apie duomenis"; the link
// that opens About is added here.
const props = defineProps({
  provenance: { type: Object as PropType<Provenance>, required: true },
  large: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;

const parts = computed(() => props.provenance.text.split(/(BĮIP|BIOMON)/).filter(Boolean));

const title = computed(() =>
  props.provenance.kind === 'snapshot'
    ? S.provenanceSnapshotTitle(props.provenance.asOf)
    : undefined,
);
</script>
