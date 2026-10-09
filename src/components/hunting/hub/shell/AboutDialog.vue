<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[1000] flex items-stretch justify-center bg-black/50 md:items-center md:p-8"
      @click.self="close"
    >
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-about-title"
        class="flex max-h-full w-full flex-col bg-white md:max-w-2xl md:rounded-lg md:shadow-lg"
        @keydown="onKeydown"
      >
        <div
          class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4"
        >
          <h2
            id="hub-about-title"
            ref="titleEl"
            tabindex="-1"
            class="text-lg font-semibold text-gray-900 focus:outline-none"
          >
            {{ S.about }}: {{ TOPIC_TABS[topicId] }}
          </h2>
          <button
            type="button"
            class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-sm font-semibold text-gray-900 hover:bg-gray-100"
            :class="focusRing"
            @click="close"
          >
            <span aria-hidden="true">✕</span> {{ S.close }}
          </button>
        </div>

        <div class="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-sm text-gray-800">
          <section v-for="part in sections" :key="part.key">
            <h3 class="font-semibold text-gray-900">{{ part.heading }}</h3>
            <p v-for="line in part.lines" :key="line" class="mt-1">{{ line }}</p>
          </section>
          <section>
            <h3 class="font-semibold text-gray-900">{{ ABOUT_HEADINGS.common }}</h3>
            <p v-for="line in common" :key="line" class="mt-1">{{ line }}</p>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, type PropType } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { TopicDef, TopicId } from '@/utils/hunting/hub/types';
import { ABOUT_HEADINGS, ATTRIBUTION_RULE, S, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { focusRing, trapTab } from './shell';

// About dialog (§5): four fixed headings per topic, then "Bendros taisyklės".
const props = defineProps({
  topics: { type: Object as PropType<Partial<Record<TopicId, TopicDef>>>, required: true },
});

const ctx = inject(HUB_CTX)!;

// Shell texts of "Bendros taisyklės" (§5: attribution rule, snapshot, locale, no personal
// data). Candidates for strings.ts.
const LOCALE_RULE =
  'Datos rašomos formatu metai-mėnuo-diena (pvz., 2026-10-09), laikas – 24 valandų formatu, ' +
  'trupmenos – su kableliu.';
const PRIVACY_RULE =
  'Asmens duomenys neskelbiami: rodomos tik visos Lietuvos ir savivaldybių sumos, be MPV, ' +
  'pranešėjų ar tikslių vietų.';

const isOpen = ref(false);
const topicId = ref<TopicId>(ctx.sel.value.topic);
const dialog = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
let returnTo: HTMLElement | null = null;
let previousOverflow = '';

const sections = computed(() => {
  const about = props.topics[topicId.value]?.about;
  if (!about) return [];
  return (['source', 'meaning', 'missing', 'compare'] as const)
    .map((key) => ({ key, heading: ABOUT_HEADINGS[key], lines: about[key] || [] }))
    .filter((part) => part.lines.length);
});

const common = computed(() => {
  const asOf = ctx.data.snapshot.value?.meta.snapshotDate;
  // The attribution rule is stated once: topics usually include it in "Ką reiškia skaičiai".
  const meaning = props.topics[topicId.value]?.about?.meaning || [];
  return [
    meaning.includes(ATTRIBUTION_RULE) ? '' : ATTRIBUTION_RULE,
    asOf ? S.provenanceSnapshotTitle(asOf) : '',
    LOCALE_RULE,
    PRIVACY_RULE,
  ].filter(Boolean);
});

async function open(id?: TopicId) {
  topicId.value = id || ctx.sel.value.topic;
  returnTo = document.activeElement as HTMLElement | null;
  isOpen.value = true;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  await nextTick();
  titleEl.value?.focus();
}

function close() {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.body.style.overflow = previousOverflow;
  nextTick(() => {
    if (returnTo && document.contains(returnTo)) returnTo.focus();
  });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close();
    return;
  }
  trapTab(event, dialog.value);
}

onBeforeUnmount(() => {
  if (isOpen.value) document.body.style.overflow = previousOverflow;
});

defineExpose({ open, close });
</script>
