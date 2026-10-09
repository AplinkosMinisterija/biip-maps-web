<template>
  <div class="flex flex-col gap-3">
    <component
      :is="mobile ? 'h2' : 'h1'"
      :id="headingId"
      ref="heading"
      tabindex="-1"
      class="font-semibold text-gray-900 focus:outline-none"
      :class="mobile ? 'text-lg' : 'text-xl'"
    >
      {{ view?.h1 || TOPIC_TABS[ctx.sel.value.topic] }}
    </component>

    <HuntingHubShellLoadState
      v-if="!view"
      :large="mobile"
      :failed="ctx.data.phase.value === 'ready'"
    />

    <template v-else>
      <HuntingHubShellAnswerBlock
        :answer="view.answer"
        :badge="view.badge"
        :notice="ctx.notice.value || undefined"
        :topic-notice="view.notice"
        :fixed-note="view.fixedNote"
      />
      <HuntingHubShellEmptyState v-if="view.empty" :empty="view.empty" :large="mobile" />
      <template v-else>
        <HuntingHubShellKpiStrip :kpis="view.kpis" :large="mobile" />
        <HuntingHubShellBarChart v-if="view.chart" :chart="view.chart" />
        <ul v-if="view.notes.length" class="flex flex-col gap-1 text-xs text-gray-700">
          <li v-for="note in view.notes" :key="note">{{ note }}</li>
        </ul>
      </template>
      <div class="flex flex-col gap-0.5 border-t border-gray-200 pt-2">
        <HuntingHubShellProvenanceLine :provenance="view.provenance" :large="mobile" />
        <HuntingHubShellPrototypeLine :dismissible="mobile" />
      </div>
    </template>

    <!-- Self-checks (?debug=1). -->
    <HuntingHubShellDebugPanel v-if="ctx.debug" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { TOPIC_TABS } from '@/utils/hunting/hub/strings';

// Generic panel for a snapshot topic: H1 question, answer, KPIs, chart, notes, provenance
// (§4.1 height budget: chart bottom ≈ 490 px at 900 px).
defineProps({
  mobile: { type: Boolean, default: false },
  headingId: { type: String, default: 'hub-title' },
});

const ctx = inject(HUB_CTX)!;
const view = computed(() => ctx.view.value);

const heading = ref<HTMLElement | null>(null);
defineExpose({ focusHeading: () => heading.value?.focus() });
</script>
