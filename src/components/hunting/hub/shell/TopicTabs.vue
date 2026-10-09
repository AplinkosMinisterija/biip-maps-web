<template>
  <nav ref="root" :aria-label="S.topicsNav" class="relative min-w-0 flex-1">
    <!-- Hidden copy that measures the tabs' natural width (§4.2: measure, do not guess). -->
    <div
      ref="measure"
      aria-hidden="true"
      class="invisible absolute left-0 top-0 flex gap-1 whitespace-nowrap pointer-events-none"
    >
      <span v-for="id in TOPIC_ORDER" :key="id" class="px-3 text-sm font-semibold">
        {{ TOPIC_TABS[id] }}
      </span>
    </div>

    <div v-if="!overflow" role="tablist" class="flex gap-1" @keydown="onKeydown">
      <button
        v-for="id in TOPIC_ORDER"
        :id="`hub-tab-${id}`"
        :key="id"
        ref="tabs"
        type="button"
        role="tab"
        :aria-selected="id === active"
        aria-controls="hub-panel"
        :tabindex="id === active ? 0 : -1"
        class="h-10 whitespace-nowrap rounded-md px-3 text-sm font-semibold"
        :class="[
          focusRing,
          id === active
            ? 'bg-gray-900 text-white'
            : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900',
        ]"
        @click="ctx.setTopic(id)"
      >
        {{ TOPIC_TABS[id] }}
      </button>
    </div>

    <div v-else class="flex items-center gap-2">
      <label for="hub-topic-select" class="text-sm font-semibold text-gray-900">{{
        S.topic
      }}</label>
      <select
        id="hub-topic-select"
        :value="active"
        class="h-10 rounded-md border border-gray-400 bg-white px-2 text-sm font-semibold text-gray-900"
        :class="focusRing"
        @change="ctx.setTopic(($event.target as HTMLSelectElement).value as TopicId)"
      >
        <option v-for="id in TOPIC_ORDER" :key="id" :value="id">{{ TOPIC_TABS[id] }}</option>
      </select>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { useElementSize } from '@vueuse/core';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import type { TopicId } from '@/utils/hunting/hub/types';
import { S, TOPIC_ORDER, TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';

const ctx = inject(HUB_CTX)!;
const active = computed(() => ctx.sel.value.topic);

const root = ref<HTMLElement | null>(null);
const measure = ref<HTMLElement | null>(null);
const tabs = ref<HTMLButtonElement[]>([]);
const { width: available } = useElementSize(root);
const { width: needed } = useElementSize(measure);
// 4 px per gap between the five tabs.
const overflow = computed(
  () => available.value > 0 && needed.value + 4 * (TOPIC_ORDER.length - 1) > available.value,
);

// Tabs with manual activation: arrows/Home/End move focus, Enter/Space switch the topic
// (each switch is a history entry, so focus alone must not switch).
function onKeydown(event: KeyboardEvent) {
  const list = tabs.value;
  const i = list.findIndex((el) => el === document.activeElement);
  if (i < 0) return;
  let next = -1;
  if (event.key === 'ArrowRight') next = (i + 1) % list.length;
  else if (event.key === 'ArrowLeft') next = (i - 1 + list.length) % list.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = list.length - 1;
  if (next < 0) return;
  event.preventDefault();
  list[next].focus();
}
</script>
