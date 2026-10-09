<template>
  <!-- Apžvalga (§4.4, §6.1): a scrollable page over the map with one card per topic. -->
  <section
    id="hub-panel"
    role="main"
    aria-labelledby="hub-title"
    class="hub-overview absolute inset-x-0 bottom-0 z-20 overflow-y-auto overscroll-contain bg-gray-50"
  >
    <div class="flex max-w-[1040px] flex-col gap-4 p-4 md:p-6">
      <h1
        id="hub-title"
        tabindex="-1"
        class="text-xl font-semibold text-gray-900 focus:outline-none"
      >
        {{ title }}
      </h1>

      <HuntingHubShellLoadState v-if="!ready" large />

      <template v-else>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article
            v-for="card in cards"
            :key="card.topic"
            :aria-labelledby="`hub-card-${card.topic}`"
            class="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 :id="`hub-card-${card.topic}`" class="text-lg font-semibold text-gray-900">
              {{ card.title }}
            </h2>
            <p class="text-sm font-semibold text-gray-700">{{ card.question }}</p>
            <p class="text-base leading-snug text-gray-900">{{ card.answer }}</p>
            <p v-if="card.secondary || card.badge" class="text-sm text-gray-800">
              {{ card.secondary }}
              <HuntingHubShellStateBadge
                v-if="card.badge"
                :badge="card.badge"
                class="ml-1 align-middle"
              />
            </p>
            <p v-if="card.fixedNote" class="text-sm text-gray-700">{{ card.fixedNote }}</p>
            <a
              :href="hrefOf(card.topic)"
              class="mt-auto self-end inline-flex min-h-[44px] items-center rounded px-2 text-sm font-semibold text-blue-800 underline md:min-h-[32px]"
              :class="focusRing"
              @click.prevent="ctx.setTopic(card.topic)"
            >
              {{ TOPIC_TABS[card.topic] }} →
            </a>
          </article>
        </div>
        <HuntingHubShellProvenanceLine v-if="provenance" :provenance="provenance" :large="large" />
        <HuntingHubShellPrototypeLine :dismissible="large" />
      </template>
      <HuntingHubShellDebugPanel v-if="ctx.debug" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, type PropType } from 'vue';
import { useRouter } from 'vue-router';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { OverviewCard, Provenance, TopicDef, TopicId } from '@/utils/hunting/hub/types';
import { S, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { seasonLabel, seasonOfDay } from '@/utils/hunting/dates';
import { focusRing } from './shell';

const props = defineProps({
  topics: { type: Object as PropType<Partial<Record<TopicId, TopicDef>>>, required: true },
  large: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const router = useRouter();

const CARD_ORDER: TopicId[] = ['vilkai', 'laimikiai', 'limitai', 'zala'];

// §2.2: "Medžioklės sezonas {season}" for the season containing the real Vilnius today.
const title = computed(() => `Medžioklės sezonas ${seasonLabel(seasonOfDay(ctx.today))}`);

const ready = computed(() => ctx.data.phase.value === 'ready' && !!ctx.data.snapshot.value);

const cards = computed<OverviewCard[]>(() => {
  const data = ctx.data.snapshot.value;
  if (!data) return [];
  return CARD_ORDER.flatMap((id) => {
    const def = props.topics[id];
    if (!def?.overview) return [];
    try {
      return [def.overview(data, ctx.today)];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[hunting/hub] overview ${id} failed`, err);
      return [{ topic: id, title: TOPIC_TABS[id], question: '', answer: S.loadError }];
    }
  });
});

const provenance = computed<Provenance | null>(() => {
  const asOf = ctx.data.snapshot.value?.meta.snapshotDate;
  return asOf ? { kind: 'snapshot', asOf, text: S.provenanceSnapshot(asOf) } : null;
});

const hrefOf = (id: TopicId) => {
  const query: Record<string, string> = { tema: id };
  const sav = ctx.sel.value.sav;
  if (sav !== null) query.sav = `${sav}`;
  return router.resolve({ query }).href;
};
</script>

<style scoped>
.hub-overview {
  top: var(--hub-overview-top, var(--hub-top));
}
</style>
