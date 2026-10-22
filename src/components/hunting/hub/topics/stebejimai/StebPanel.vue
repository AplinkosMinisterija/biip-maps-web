<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-start justify-between gap-2">
      <component
        :is="mobile ? 'h2' : 'h1'"
        id="hub-title"
        tabindex="-1"
        class="font-semibold text-gray-900 focus:outline-none"
        :class="mobile ? 'text-lg' : 'text-xl'"
      >
        {{ SS.h1 }}
      </component>
      <span
        v-if="!ctx.isProductionHost"
        class="mt-1 shrink-0 rounded border border-gray-400 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800"
        :title="BANDOMOJI_TOOLTIP"
        :aria-label="`${BADGE_LABELS.bandomoji}. ${BANDOMOJI_TOOLTIP}`"
      >
        {{ BADGE_LABELS.bandomoji }}
      </span>
    </div>

    <!-- Error: no numbers from a partial read (STEB-SPEC §3.9). -->
    <div v-if="phase === 'error'" class="flex flex-col items-start gap-2">
      <p role="alert" class="text-sm font-medium text-gray-900">{{ SS.loadError }}</p>
      <button type="button" :class="buttonClass" @click="ctx.data.reload()">{{ SS.retry }}</button>
    </div>

    <p v-else-if="!ctx.derived.ready.value" role="status" class="text-sm text-gray-700">
      {{ SS.loading }}
    </p>

    <p v-else-if="!ctx.derived.records.value.length" class="text-sm text-gray-900">
      {{ ctx.isProductionHost ? SS.noRecordsProd : SS.noRecordsTest }}
    </p>

    <template v-else>
      <p class="text-base leading-snug text-gray-900" data-testid="steb-answer">
        {{ answer.text }}
      </p>
      <div v-if="answer.empty" class="flex flex-wrap gap-2">
        <button
          v-if="ctx.state.period.value.kind !== 'all'"
          type="button"
          :class="buttonClass"
          @click="ctx.state.setPeriod({ kind: 'all' })"
        >
          {{ SS.showAllPeriod }}
        </button>
        <button
          v-if="ctx.state.gyvunas.value !== null"
          type="button"
          :class="buttonClass"
          @click="ctx.state.setSpecies(null)"
        >
          {{ SS.showAllSpecies }}
        </button>
        <button
          v-if="ctx.state.faktas.value !== null"
          type="button"
          :class="buttonClass"
          @click="ctx.state.setFact(null)"
        >
          {{ SS.showAllFacts }}
        </button>
        <button
          v-if="ctx.state.sav.value !== null"
          type="button"
          :class="buttonClass"
          @click="ctx.state.setPlace(null)"
        >
          {{ SS.showAllPlaces }}
        </button>
      </div>
      <p class="text-xs text-gray-700">{{ ctx.derived.sentence.value }}</p>
      <BarChart v-if="chart" :chart="chart" />
      <ul v-if="notes.length" class="flex flex-col gap-1 text-xs text-gray-700">
        <li v-for="note in notes" :key="note">{{ note }}</li>
      </ul>
    </template>

    <footer class="flex flex-col gap-1 border-t border-gray-200 pt-2 text-xs text-gray-600">
      <p v-if="provenanceTime">
        {{ SS.provenance(provenanceTime) }}
        <template v-if="ctx.hub">
          ·
          <button type="button" :class="linkButton" @click="ctx.hub.openAbout()">
            {{ S.provenanceLink }}
          </button>
        </template>
      </p>
      <p>
        {{ S.prototypeLine }}
        <template v-if="FEEDBACK_URL">
          ·
          <a :href="FEEDBACK_URL" target="_blank" rel="noopener" :class="linkButton">
            {{ S.prototypeFeedback }}
            <span class="sr-only">{{ SS.newWindow }}</span>
          </a>
        </template>
      </p>
    </footer>

    <template v-if="ctx.debug">
      <dl
        class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-dashed border-gray-400 bg-gray-50 p-3 font-mono text-xs text-gray-800"
      >
        <dt class="text-gray-600">Stebėjimai</dt>
        <dd class="min-w-0 break-words tabular-nums">{{ debugRows }}</dd>
        <dt class="text-gray-600">Filtrai</dt>
        <dd class="min-w-0 break-all">{{ debugFilters }}</dd>
      </dl>
      <DebugPanel v-if="ctx.hub" />
    </template>
  </div>
</template>

<script setup lang="ts">
// Panel of the Stebėjimai topic (STEB-SPEC §3.2): the question, the answer, the filter
// sentence, the species chart, notes, provenance and the prototype line; ?debug=1 adds the
// hub's self-check panel (which appends this topic's checks).
import { computed, inject } from 'vue';
import BarChart from '@/components/hunting/hub/shell/BarChart.vue';
import DebugPanel from '@/components/hunting/hub/shell/DebugPanel.vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { formatInt, formatTime } from '@/utils/hunting/dates';
import { BADGE_LABELS, BANDOMOJI_TOOLTIP, FEEDBACK_URL, S } from '@/utils/hunting/hub/strings';
import type { ChartDef } from '@/utils/hunting/hub/types';
import { speciesSummary } from '@/utils/hunting/hub/stebejimai/model';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';

defineProps({
  // Inside the mobile sheet: the heading is an h2 (as the hub's mobile panel).
  mobile: { type: Boolean, default: false },
});

const ctx = inject(STEB_CTX)!;

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const linkButton = `font-semibold text-brand underline rounded ${focusRing}`;
const buttonClass = `min-h-[44px] md:min-h-[32px] rounded-md border border-gray-400 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 ${focusRing}`;

const phase = computed(() => ctx.data.phase.value);
const answer = computed(() => ctx.derived.answer.value);

const chart = computed<ChartDef | null>(() => {
  const rows = ctx.derived.filtered.value;
  if (!rows.length) return null;
  return {
    kind: 'hbar',
    title: SS.chartTitle,
    bars: speciesSummary(rows).map((g) => ({
      label: g.label,
      value: g.n,
      valueLabel: formatInt(g.n),
    })),
  };
});

const notes = computed(() => {
  const out: string[] = [];
  const k = ctx.derived.withoutPoint.value;
  if (k) out.push(SS.noPoint(k));
  if (ctx.data.truncated.value) {
    out.push(SS.truncated(ctx.derived.records.value.length, ctx.data.total.value));
  }
  return out;
});

const provenanceTime = computed(() => {
  const at = ctx.data.fetchedAt.value;
  return at && phase.value === 'ready' ? formatTime(at) : '';
});

const debugRows = computed(() => {
  const d = ctx.data;
  const parts = [
    `${ctx.derived.filtered.value.length} / ${d.records.value.length} (API ${d.total.value})`,
    `užklausos ${d.requests.value}`,
    d.fetchMs.value !== null ? `${d.fetchMs.value} ms` : '',
    `būsena ${d.phase.value}`,
    d.error.value ? `klaida ${d.error.value}` : '',
    `meta ${ctx.meta.status.value}`,
  ];
  return parts.filter(Boolean).join(' · ');
});
const debugFilters = computed(() =>
  JSON.stringify({
    period: ctx.state.period.value,
    gyvunas: ctx.state.gyvunas.value,
    faktas: ctx.state.faktas.value,
    sav: ctx.state.sav.value,
    lentele: ctx.state.tableOpen.value ? ctx.state.table.value : null,
  }),
);
</script>
