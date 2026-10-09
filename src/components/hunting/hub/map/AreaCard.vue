<template>
  <aside
    v-if="card && sav !== null"
    :aria-labelledby="titleId"
    class="bg-white rounded-lg shadow-lg w-[360px] max-w-full p-4 text-sm text-gray-900 flex flex-col gap-3"
  >
    <div class="flex items-start justify-between gap-2">
      <h2
        :id="titleId"
        ref="titleEl"
        tabindex="-1"
        class="text-base font-semibold leading-6 outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 rounded"
      >
        {{ card.title }}
      </h2>
      <button
        type="button"
        class="shrink-0 min-h-[24px] min-w-[24px] max-md:min-h-[44px] max-md:min-w-[44px] px-2 rounded text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :aria-label="`${S.close}: ${card.title}`"
        @click="close"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>

    <ul class="flex flex-col gap-1">
      <li v-for="(line, i) in card.lines" :key="i" :class="i === 0 ? 'font-semibold' : ''">
        {{ line }}
      </li>
    </ul>

    <template v-if="card.other">
      <hr class="border-gray-200" />
      <HuntingHubMapOtherTopicsRows :sav="sav" :topics="topics" />
    </template>

    <div v-if="hasTables" class="flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1 min-h-[32px] max-md:min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        @click="showInTable"
      >
        <UiIcon name="document" :size="16" aria-hidden="true" />
        {{ S.showInTable }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, watch, type PropType } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import type { CardDef, TopicDef } from '@/utils/hunting/hub/types';

// Municipality card of a snapshot topic (SPEC2 §6.3–6.6): the topic's `view.card(sav)` lines,
// "Kiti rodikliai čia", "Rodyti lentelėje" and ✕ (clears `sav`). The shell positions it:
// bottom right on desktop, in place of the sheet content on phones.
const props = defineProps({
  // Topic registry, passed through to "Kiti rodikliai čia".
  topics: { type: Array as PropType<TopicDef[]>, default: () => [] },
  // Move focus to the title when a municipality is selected (desktop; the shell decides).
  focusOnOpen: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const ctx = inject(HUB_CTX)!;

const sav = computed(() => ctx.sel.value.sav);
const titleId = computed(() => `hub-area-card-${sav.value ?? 'none'}`);

const card = computed<CardDef | null>(() => {
  const view = ctx.view.value;
  if (!view || ctx.topic.value.kind !== 'snapshot' || sav.value === null) return null;
  try {
    return view.card(sav.value);
  } catch (err) {
    return null;
  }
});
const hasTables = computed(() => !!ctx.view.value?.tables.some((t) => !t.disabled));

const titleEl = ref<HTMLElement | null>(null);
watch(sav, (code, old) => {
  if (props.focusOnOpen && code !== null && code !== old) {
    nextTick(() => titleEl.value?.focus({ preventScroll: true }));
  }
});

function close() {
  ctx.setSav(null);
  emit('close');
}

function showInTable() {
  const tables = ctx.view.value?.tables || [];
  const preferred = ctx.sel.value.table || ctx.topic.value.defaultTable;
  const target =
    tables.find((t) => t.id === preferred && !t.disabled) || tables.find((t) => !t.disabled);
  if (target) ctx.setTable(target.id);
}
</script>
