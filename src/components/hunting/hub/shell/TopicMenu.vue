<template>
  <div ref="root" class="relative min-w-0">
    <h1 class="min-w-0">
      <button
        ref="trigger"
        type="button"
        aria-haspopup="listbox"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-controls="isOpen ? `${uid}-list` : undefined"
        class="flex h-11 max-w-full items-center gap-1 rounded-md pr-2 text-lg font-semibold text-gray-900"
        :class="focusRing"
        @click="isOpen ? close() : open()"
        @keydown.down.prevent="open()"
      >
        <span class="truncate">{{ TOPIC_TABS[activeTopic] }}</span>
        <UiIcon name="chevron-down" :size="18" aria-hidden="true" />
      </button>
    </h1>

    <ul
      v-if="isOpen"
      :id="`${uid}-list`"
      ref="list"
      role="listbox"
      tabindex="-1"
      :aria-label="S.topicsNav"
      :aria-activedescendant="`${uid}-${TOPIC_ORDER[active]}`"
      class="absolute left-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-24px))] rounded-lg border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
      @keydown="onKeydown"
      @blur="onBlur"
    >
      <li
        v-for="(id, i) in TOPIC_ORDER"
        :id="`${uid}-${id}`"
        :key="id"
        role="option"
        :aria-selected="id === activeTopic"
        class="flex min-h-[52px] cursor-pointer flex-col justify-center rounded-md px-3 py-1"
        :class="i === active ? 'bg-gray-900 text-white' : 'text-gray-900'"
        @mousedown.prevent
        @click="pick(id)"
      >
        <span class="text-base font-semibold">{{ TOPIC_TABS[id] }}</span>
        <span class="text-sm" :class="i === active ? 'text-gray-100' : 'text-gray-700'">
          {{ TOPIC_SUBTITLES[id] }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, nextTick, ref } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { TopicId } from '@/utils/hunting/hub/types';
import { S, TOPIC_ORDER, TOPIC_SUBTITLES, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';

// Mobile topic menu (§4.3): the header's H1 is a button that opens a listbox of the five
// topics with their subtitles.
const ctx = inject(HUB_CTX)!;
const uid = `hub-topic-menu-${getCurrentInstance()?.uid ?? 0}`;
const activeTopic = computed(() => ctx.sel.value.topic);

const isOpen = ref(false);
const active = ref(0);
const trigger = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);

async function open() {
  active.value = Math.max(0, TOPIC_ORDER.indexOf(activeTopic.value));
  isOpen.value = true;
  await nextTick();
  list.value?.focus();
}

function close(returnFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (returnFocus) nextTick(() => trigger.value?.focus());
}

function pick(id: TopicId) {
  close();
  ctx.setTopic(id);
}

function onBlur(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  if (!next || !list.value?.contains(next)) close(false);
}

function onKeydown(event: KeyboardEvent) {
  const n = TOPIC_ORDER.length;
  if (event.key === 'ArrowDown') active.value = (active.value + 1) % n;
  else if (event.key === 'ArrowUp') active.value = (active.value - 1 + n) % n;
  else if (event.key === 'Home') active.value = 0;
  else if (event.key === 'End') active.value = n - 1;
  else if (event.key === 'Enter' || event.key === ' ') pick(TOPIC_ORDER[active.value]);
  else if (event.key === 'Escape') close();
  else if (event.key === 'Tab') return close(false);
  else return;
  event.preventDefault();
}
</script>
