<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[1000] flex items-stretch justify-center bg-black/50 md:p-8"
      :class="tallFrame ? 'md:items-start' : 'md:items-center'"
      @click.self="close()"
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
            @click="close()"
          >
            <span aria-hidden="true">✕</span> {{ S.close }}
          </button>
        </div>

        <div class="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-sm text-gray-800">
          <section v-for="part in sections" :key="part.key">
            <h3 class="font-semibold text-gray-900">{{ part.heading }}</h3>
            <p v-for="line in part.lines" :key="line" class="mt-1">{{ line }}</p>
          </section>
          <section v-if="common.length">
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
import { HUB_CTX, type AboutOpenOptions } from '@/composables/hunting/hub/context';
import type { TopicDef, TopicId } from '@/utils/hunting/hub/types';
import {
  ABOUT_HEADINGS,
  ABOUT_LOCALE_RULE,
  ATTRIBUTION_RULE,
  S,
  SOURCE_BIIP,
  TOPIC_TABS,
} from '@/utils/hunting/hub/strings';
import { focusRing, trapTab } from './shell';

// About dialog (§5): four fixed headings per topic, then "Bendros taisyklės" (the topic's
// own `aboutCommon` lines when it has them, else the shell's default lines).
const props = defineProps({
  topics: { type: Object as PropType<Partial<Record<TopicId, TopicDef>>>, required: true },
});

const ctx = inject(HUB_CTX)!;

// Default texts of "Bendros taisyklės" (§5: attribution rule, snapshot, locale, no personal
// data). The locale rule is shared with the topics' own lines (strings.ts).
const PRIVACY_RULE =
  'Asmens duomenys neskelbiami: rodomos tik visos Lietuvos ir savivaldybių sumos – be MPV ' +
  'duomenų, pranešėjų tapatybės ir tikslių vietų.';

// Embedded Apžvalga: the frame grows to its content (D12b), so a centred dialog could open
// below the visible part of the page; open it at the top of the frame instead.
const tallFrame = computed(() => ctx.embed && ctx.topic.value.kind === 'overview');

const LIVE_SOURCE_RULE =
  'Duomenys gaunami tiesiogiai iš BĮIP (vilkų taškai – ir iš BIOMON) kiekvieną kartą atidarius ' +
  'šią temą.';

const isOpen = ref(false);
const topicId = ref<TopicId>(ctx.sel.value.topic);
const dialog = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
let returnTo: HTMLElement | null = null;
let previousOverflow = '';
// Set when the opener wants to know about the close (embedded: the WP page, which then
// takes focus back to its "Apie duomenis" button).
let onClose: AboutOpenOptions['onClose'] | null = null;

// Embedded, the WP page focuses the frame right before it asks for this dialog. Firefox gives
// the frame's document focus a few milliseconds after the request arrives (without a window
// focus event) and then resets the focus to the body, so the title loses it: for a short
// while, put it back on the title whenever the frame has focus outside the dialog.
const LATE_FOCUS_MS = 1000;
const LATE_FOCUS_STEP_MS = 50;
let lateFocusTimer = 0;
function stopLateFocus() {
  window.clearTimeout(lateFocusTimer);
  lateFocusTimer = 0;
}
function focusTitleLate(until: number) {
  lateFocusTimer = 0;
  if (!isOpen.value) return;
  if (document.hasFocus() && !dialog.value?.contains(document.activeElement)) {
    titleEl.value?.focus();
  }
  if (Date.now() < until) {
    lateFocusTimer = window.setTimeout(() => focusTitleLate(until), LATE_FOCUS_STEP_MS);
  }
}

const sections = computed(() => {
  const about = props.topics[topicId.value]?.about;
  if (!about) return [];
  return (['source', 'meaning', 'missing', 'compare'] as const)
    .map((key) => {
      const lines = about[key] || [];
      // Every "Šaltinis ir atnaujinimas" names the platform in plain words first (JOURNEYS-14).
      if (key !== 'source' || !lines.length || lines.includes(SOURCE_BIIP)) {
        return { key, heading: ABOUT_HEADINGS[key], lines };
      }
      return { key, heading: ABOUT_HEADINGS[key], lines: [SOURCE_BIIP, ...lines] };
    })
    .filter((part) => part.lines.length);
});

const common = computed(() => {
  const topic = props.topics[topicId.value];
  // A topic whose rules differ (Stebėjimai: live records at their exact points) states its own.
  if (topic?.aboutCommon) return topic.aboutCommon.filter(Boolean);
  const asOf = ctx.data.snapshot.value?.meta.snapshotDate;
  // The attribution rule is stated once (topics usually include it in "Ką reiškia skaičiai"),
  // and only for topics whose municipalities are MPV sums (J-09).
  const meaning = topic?.about?.meaning || [];
  const mpv = (topic?.attribution ?? 'mpv') === 'mpv';
  // The snapshot line only for snapshot topics; a live topic says where its data comes from.
  const source =
    topic?.kind === 'snapshot'
      ? asOf
        ? S.provenanceSnapshotTitle(asOf)
        : ''
      : topic?.kind === 'live'
        ? LIVE_SOURCE_RULE
        : '';
  return [
    mpv && !meaning.includes(ATTRIBUTION_RULE) ? ATTRIBUTION_RULE : '',
    source,
    ABOUT_LOCALE_RULE,
    PRIVACY_RULE,
  ].filter(Boolean);
});

async function open(id?: TopicId, opts: AboutOpenOptions = {}) {
  topicId.value = id || ctx.sel.value.topic;
  onClose = opts.onClose || null;
  // Opened again while open (the WP button stays clickable): keep the first opener's
  // focus target and the page's own overflow.
  if (!isOpen.value) {
    returnTo = document.activeElement as HTMLElement | null;
    isOpen.value = true;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  await nextTick();
  titleEl.value?.focus();
  if (ctx.embed) {
    stopLateFocus();
    const until = Date.now() + LATE_FOCUS_MS;
    lateFocusTimer = window.setTimeout(() => focusTitleLate(until), 0);
  }
}

// byUser: false when the opener closed it (embedded: a WP `set` changed the topic or view
// behind the dialog). Focus then stays where the user is (on the WP page).
function close(byUser = true) {
  if (!isOpen.value) return;
  stopLateFocus();
  isOpen.value = false;
  document.body.style.overflow = previousOverflow;
  const notify = onClose;
  onClose = null;
  // An opener that is told about the close moves the focus itself.
  const target = byUser && !notify ? returnTo : null;
  returnTo = null;
  nextTick(() => {
    if (target && document.contains(target)) target.focus();
  });
  notify?.(byUser);
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
  stopLateFocus();
  if (isOpen.value) document.body.style.overflow = previousOverflow;
});

defineExpose({ open, close });
</script>
