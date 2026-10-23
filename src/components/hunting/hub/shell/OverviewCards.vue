<template>
  <!-- Apžvalga (§4.4, §6.1, D8): a page over the map, two groups of cards with one anatomy.
       Embedded it reports its height to the WP page (D12b), which grows the frame to it. -->
  <section
    id="hub-panel"
    role="main"
    aria-labelledby="hub-title"
    class="hub-overview absolute inset-x-0 bottom-0 z-20 overflow-y-auto bg-page"
    :class="{ 'overscroll-contain': !ctx.embed }"
  >
    <div ref="content" class="hub-overview__content flex flex-col gap-8 py-6 md:py-8">
      <header class="flex flex-col gap-2">
        <h1
          id="hub-title"
          tabindex="-1"
          class="text-2xl font-bold leading-8 text-ink focus:outline-none"
        >
          {{ title }}
        </h1>
        <p class="text-[15px] leading-6 text-ink-muted">
          <HuntingHubShellStateBadge badge="vyksta" class="mr-2 align-[1px]" />
          <NowrapText :text="lead" />
        </p>
      </header>

      <!-- Element-rooted: Vue 3.5.29 mis-patches a v-if'd async component that is still
           loading when the data arrives first (insertBefore error; vuejs/core#15551). -->
      <div v-if="!ready" class="contents"><HuntingHubShellLoadState large /></div>

      <template v-else>
        <section
          v-for="group in groups"
          :key="group.id"
          :aria-labelledby="`hub-group-${group.id}`"
          class="flex flex-col gap-4"
        >
          <h2
            :id="`hub-group-${group.id}`"
            class="border-b border-line-soft pb-2 text-xl font-bold leading-7 text-ink"
          >
            {{ group.title }}
          </h2>
          <div class="hub-overview__grid">
            <article
              v-for="card in group.cards"
              :key="card.topic"
              :aria-labelledby="`hub-card-${card.topic}`"
              :class="[CARD, 'hub-overview__card p-5 md:p-6']"
            >
              <!-- Rows 1–7 (D8); every row is always there, so the rows line up across a
                   group on the subgrid (an empty row takes no space below 1024 px). -->
              <p class="text-[13px] font-bold uppercase leading-5 tracking-wide text-brand">
                {{ card.title }}
              </p>
              <h3 :id="`hub-card-${card.topic}`" class="text-lg font-bold leading-[26px] text-ink">
                {{ card.question }}
              </h3>
              <p
                class="hub-overview__row flex flex-wrap items-center gap-2 text-sm font-semibold text-ink"
              >
                <template v-if="card.season !== undefined">
                  <span>{{ seasonLabel(card.season) }} sezonas</span>
                  <HuntingHubShellStateBadge
                    v-if="badgeOf(card)"
                    :badge="badgeOf(card)!"
                    after-season
                  />
                </template>
              </p>
              <div class="hub-overview__row">
                <template v-if="card.value">
                  <p class="flex flex-wrap items-baseline gap-x-2">
                    <span :class="[KPI_VALUE, 'text-[40px] leading-[44px]']">{{ card.value }}</span>
                    <span v-if="card.outOf" :class="[KPI_VALUE, 'text-2xl leading-8']">
                      {{ card.outOf }}
                    </span>
                  </p>
                  <p v-if="card.unit" class="mt-1 text-sm leading-5 text-ink">
                    <NowrapText :text="card.unit" />
                  </p>
                </template>
                <p v-else-if="card.answer" class="text-base leading-6 text-ink">
                  <NowrapText :text="card.answer" />
                </p>
              </div>
              <ul class="hub-overview__row flex flex-col gap-1 text-sm leading-5 text-ink-muted">
                <li v-for="line in card.lines || []" :key="line"><NowrapText :text="line" /></li>
              </ul>
              <p class="hub-overview__row text-[13px] leading-5 text-ink-muted">
                {{ card.fixedNote }}
              </p>
              <!-- Buttons, so no maps-host link leaks into the WP page (SPEC §4). -->
              <div class="flex flex-wrap items-center gap-x-6 gap-y-1 self-start lg:self-end">
                <button
                  type="button"
                  :class="CTA_LINK"
                  :aria-label="`${S.overviewMap}: ${card.title}`"
                  @click="
                    ctx.setTopic(card.topic, { openTable: false, season: headlineSeason(card) })
                  "
                >
                  {{ S.overviewMap }}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    class="shrink-0"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  :class="CTA_LINK"
                  :aria-label="`${S.overviewTable}: ${card.title}`"
                  @click="
                    ctx.setTopic(card.topic, { openTable: true, season: headlineSeason(card) })
                  "
                >
                  {{ S.overviewTable }}
                </button>
              </div>
            </article>

            <!-- The reporting forms that feed the "Gyventojų pranešimai" data (OVERVIEW-28). -->
            <article
              v-if="group.id === 'pranesimai' && reportLinks.length"
              aria-labelledby="hub-card-report"
              class="hub-overview__cta flex flex-col gap-3 rounded-lg bg-band p-5 md:p-6"
            >
              <h3 id="hub-card-report" class="text-lg font-bold leading-[26px] text-ink">
                {{ S.overviewReportTitle }}
              </h3>
              <p class="text-base leading-6 text-ink">{{ S.overviewReportText }}</p>
              <div class="mt-auto flex flex-col items-start gap-1">
                <a
                  v-for="link in reportLinks"
                  :key="link.href"
                  :href="link.href"
                  target="_top"
                  :class="CTA_LINK"
                >
                  {{ link.label }}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    class="shrink-0"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </a>
              </div>
            </article>
          </div>
        </section>

        <!-- Embedded, the WP header line has the provenance (D9), with no staging marker. -->
        <div
          v-if="!ctx.embed && provenance"
          class="flex flex-col gap-0.5 border-t border-line-soft pt-2"
        >
          <HuntingHubShellProvenanceLine :provenance="provenance" :large="large" />
        </div>
      </template>
      <HuntingHubShellDebugPanel v-if="ctx.debug" />
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  effectScope,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type PropType,
} from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { fetchTotals } from '@/composables/hunting/useWolvesData';
import { useStebData, type StebData } from '@/composables/hunting/hub/stebejimai/useStebData';
import type { Badge, OverviewCard, Provenance, TopicDef, TopicId } from '@/utils/hunting/hub/types';
import { S, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { createHeightReporter, heightMessage } from '@/utils/hunting/hub/embed';
import { vilkaiOverviewLive, type VilkaiLiveStatus } from '@/utils/hunting/hub/topics/vilkai';
import { stebOverviewNumbers, wpPageUrl } from '@/utils/hunting/hub/stebejimai/model';
import { statusModel } from '@/utils/hunting/wolves';
import { seasonInterval, seasonLabel, seasonOfDay } from '@/utils/hunting/dates';
import { CARD, CTA_LINK, KPI_VALUE } from './controls';
import NowrapText from './NowrapText.vue';

const props = defineProps({
  topics: { type: Object as PropType<Partial<Record<TopicId, TopicDef>>>, required: true },
  large: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;

// Two groups (D8): the hunt itself, and the reports of damage and observations.
const GROUPS: { id: string; title: string; topics: TopicId[] }[] = [
  { id: 'medziokle', title: 'Medžioklė', topics: ['vilkai', 'laimikiai', 'limitai'] },
  // Observations come mostly from hunting-area users, so the label names the reports, not
  // the reporters (CONTENT-08).
  { id: 'pranesimai', title: 'Pranešimai apie žalą ir stebėjimus', topics: ['zala', 'stebejimai'] },
];

// §2.2: "Medžioklės sezonas {season}" for the season containing the real Vilnius day.
const season = seasonOfDay(ctx.today);
const title = `Medžioklės sezonas ${seasonLabel(season)}`;
const interval = seasonInterval(season);
const lead = `${interval.from} – ${interval.to}. ${S.overviewLead}`;

const ready = computed(() => ctx.data.phase.value === 'ready' && !!ctx.data.snapshot.value);

// ---- Live parts, loaded once the snapshot cards are on screen; a failure keeps the
// snapshot card (the sentence), and nothing waits for them.
const wolves = shallowRef<VilkaiLiveStatus | null>(null);
const steb = shallowRef<StebData | null>(null);
const liveScope = effectScope();
const totalsAbort = new AbortController();
let liveStarted = false;

function startLive() {
  if (liveStarted || ctx.isProductionHost) return;
  liveStarted = true;
  // The Vilkai tab's counter: the same endpoint and status rules as its status line.
  fetchTotals(totalsAbort.signal)
    .then((totals) => {
      wolves.value = statusModel(totals, false, [], ctx.today);
    })
    .catch((err) => {
      if (totalsAbort.signal.aborted) return;
      // eslint-disable-next-line no-console
      console.warn('[hunting/hub] overview wolves counter unavailable', err);
    });
  // The Stebėjimai tab's loader (same proxy, all-or-nothing).
  liveScope.run(() => {
    steb.value = useStebData({ enabled: true });
  });
}
watch(
  ready,
  (value) => {
    if (value) nextTick(startLive);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  totalsAbort.abort();
  liveScope.stop();
});

function cardOf(id: TopicId): OverviewCard | null {
  const data = ctx.data.snapshot.value;
  const def = props.topics[id];
  if (!data || !def?.overview) return null;
  let card: OverviewCard;
  try {
    card = def.overview(data, ctx.today);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[hunting/hub] overview ${id} failed`, err);
    return { topic: id, title: TOPIC_TABS[id], question: '', answer: S.loadError };
  }
  if (id === 'vilkai' && wolves.value) return vilkaiOverviewLive(card, wolves.value);
  if (id === 'stebejimai') {
    const phase = steb.value?.phase.value;
    if (phase === 'ready') {
      const numbers = stebOverviewNumbers(steb.value!.records.value, ctx.today);
      return numbers
        ? { ...card, ...numbers }
        : { ...card, answer: `${seasonLabel(season)} sezone stebėjimų neužregistruota.` };
    }
    // Still loading: the card without its number and lines; failed: the description.
    if (phase !== 'error') return { ...card, answer: '' };
  }
  return card;
}

const groups = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    cards: g.topics.map(cardOf).filter((c): c is OverviewCard => !!c),
  })),
);

// D19: the card's actions open the season of its headline number. A card without a number
// (a sentence: before the wolf hunt starts, observations still loading) opens the topic's
// own default.
const headlineSeason = (card: OverviewCard) => (card.value ? card.season : undefined);

// The season chip of a card's headline number (D10): only for figures that are not final.
const badgeOf = (card: OverviewCard): Badge | undefined =>
  card.state && card.state !== 'galutinis' ? card.state : undefined;

const reportLinks = computed(() =>
  [
    { path: '/pranesimas-apie-zala/', label: S.overviewReportDamage },
    { path: '/stebejimo-anketa/', label: S.overviewReportObservation },
  ].flatMap((l) => {
    const href = wpPageUrl(l.path, ctx.parentOrigin, window.location.hostname);
    return href ? [{ href, label: l.label }] : [];
  }),
);

const provenance = computed<Provenance | null>(() => {
  const asOf = ctx.data.snapshot.value?.meta.snapshotDate;
  return asOf ? { kind: 'snapshot', asOf, text: S.provenanceOverview(asOf) } : null;
});

// ---- Height for the WP page (D12b): embedded with a parent page, Apžvalga only.
const content = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;
let reporter: ReturnType<typeof createHeightReporter> | null = null;
let forceTimer = 0;
onMounted(() => {
  const parentOrigin = ctx.parentOrigin;
  if (!ctx.embed || !parentOrigin || window.parent === window || !content.value) return;
  if (typeof ResizeObserver === 'undefined') return;
  const el = content.value;
  reporter = createHeightReporter({
    // The content starts at the top of the frame (no filter bar on Apžvalga).
    measure: () => (el.isConnected ? el.offsetTop + el.offsetHeight : null),
    send: (px) => {
      try {
        window.parent.postMessage(heightMessage(px), parentOrigin);
      } catch (err) {
        // A detached or navigating parent: nothing to do.
      }
    },
    allowed: () => ctx.topic.value.kind === 'overview',
  });
  observer = new ResizeObserver(() => reporter?.schedule());
  observer.observe(el);
  reporter.schedule();
  // Once more after the first `state` message (debounced 150 ms), so a WP page that learns
  // the topic from it does not miss the first height.
  forceTimer = window.setTimeout(() => reporter?.force(), 400);
});
onBeforeUnmount(() => {
  window.clearTimeout(forceTimer);
  observer?.disconnect();
  reporter?.stop();
});
</script>

<style scoped>
.hub-overview {
  top: var(--hub-overview-top, var(--hub-top));
}
/* D3: the site container, 1120 px centred; gutter max(24px, (width − 1120px) / 2) from 768 px. */
.hub-overview__content {
  padding-inline: 16px;
}
.hub-overview__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.hub-overview__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hub-overview__row:empty {
  display: none;
}
@media (min-width: 768px) {
  .hub-overview__content {
    padding-inline: max(24px, calc((100% - 1120px) / 2));
  }
  .hub-overview__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
  }
}
/* ≥ 1024 px: three cards per group on a subgrid, so row n of every card lines up. */
@media (min-width: 1024px) {
  .hub-overview__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .hub-overview__card,
  .hub-overview__cta {
    grid-row: span 7;
  }
  .hub-overview__card {
    display: grid;
    grid-template-rows: subgrid;
    row-gap: 8px;
    align-content: start;
  }
  .hub-overview__row:empty {
    display: block;
  }
}
</style>
