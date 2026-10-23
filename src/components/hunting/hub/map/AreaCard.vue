<template>
  <aside
    v-if="card && sav !== null"
    :aria-labelledby="titleId"
    class="bg-white rounded-lg shadow-lg w-[360px] max-w-full p-4 text-sm text-ink flex flex-col gap-3"
  >
    <div class="flex items-start justify-between gap-2">
      <h2
        :id="titleId"
        ref="titleEl"
        tabindex="-1"
        class="rounded text-base font-semibold leading-6 outline-none"
        :class="FOCUS_RING"
      >
        {{ card.title }}
      </h2>
      <button
        type="button"
        :class="[BTN_TEXT, 'shrink-0 text-sm max-md:min-h-[44px]']"
        :aria-label="`${S.close}: ${card.title}`"
        @click="close"
      >
        <UiIcon name="close" :size="16" aria-hidden="true" />
        {{ S.close }}
      </button>
    </div>

    <ul class="flex flex-col gap-1">
      <li v-for="(line, i) in card.lines" :key="i" :class="i === 0 ? 'font-semibold' : ''">
        {{ line }}
      </li>
    </ul>

    <template v-if="card.other">
      <hr class="border-line" />
      <HuntingHubMapOtherTopicsRows :sav="sav" :topics="topics" />
    </template>

    <div v-if="hasTables" class="flex justify-end">
      <button
        type="button"
        :class="[BTN_SECONDARY, 'h-9 px-3 text-sm max-md:h-11']"
        @click="showInTable"
      >
        <UiIcon name="document" :size="16" aria-hidden="true" />
        {{ S.showInTable }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
} from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { BTN_SECONDARY, BTN_TEXT, FOCUS_RING } from '@/components/hunting/hub/shell/controls';
import type { CardDef, TopicDef } from '@/utils/hunting/hub/types';

// Municipality card of a snapshot topic (SPEC2 §6.3–6.6): the topic's `view.card(sav)` lines,
// "Kiti šios savivaldybės rodikliai", "Rodyti lentelėje" and ✕ or Esc (clears `sav`; the
// shell returns focus on `close`). The shell positions it:
// top right on the gutter on desktop, in place of the sheet content on phones.
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

// Esc closes the card, with focus in it or outside it (on the map, say), unless something else
// took the key: a handled event, or an open popover, sheet, dialog or menu, which closes first.
// This is the card's only Esc path, so the same guards apply everywhere.
const OPEN_LAYER = '[role="dialog"], [role="listbox"]';
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || !card.value) return;
  if (document.querySelector(OPEN_LAYER)) return;
  e.preventDefault();
  close();
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

function showInTable() {
  const tables = ctx.view.value?.tables || [];
  const preferred = ctx.sel.value.table || ctx.topic.value.defaultTable;
  const target =
    tables.find((t) => t.id === preferred && !t.disabled) || tables.find((t) => !t.disabled);
  if (target) ctx.setTable(target.id);
}
</script>
