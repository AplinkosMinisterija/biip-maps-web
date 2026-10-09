<template>
  <div ref="root" class="relative min-w-0" :class="mobile ? 'shrink-0' : ''">
    <button
      ref="trigger"
      type="button"
      :aria-haspopup="'dialog'"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :disabled="!items.length"
      class="flex max-w-full items-center gap-1 rounded-full border bg-white font-semibold text-gray-900 disabled:border-gray-300 disabled:text-gray-700"
      :class="[
        focusRing,
        mobile
          ? 'h-11 px-4 text-base border-gray-900 whitespace-nowrap'
          : 'h-9 max-w-[12rem] lg:max-w-[18rem] px-3 text-sm border-gray-500 hover:bg-gray-50 whitespace-nowrap',
        current ? 'bg-gray-100' : '',
      ]"
      @click="open"
    >
      <span class="truncate">
        <span v-if="!mobile" class="sr-only lg:not-sr-only">{{ S.placeChip('') }}</span>
        {{ currentName }}
      </span>
      <UiIcon name="chevron-down" :size="14" aria-hidden="true" />
    </button>

    <!-- Desktop: popover. -->
    <div
      v-if="isOpen && !mobile"
      ref="panel"
      role="dialog"
      :aria-label="S.placeSearch"
      class="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      @keydown.esc.prevent.stop="close()"
    >
      <input
        :id="`${uid}-input`"
        ref="input"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :aria-label="S.placeSearch"
        :placeholder="S.placeSearch"
        aria-autocomplete="list"
        aria-expanded="true"
        :aria-controls="`${uid}-list`"
        :aria-activedescendant="activeId"
        class="h-9 w-full rounded-md border border-gray-400 px-2 text-sm text-gray-900"
        :class="focusRing"
        @keydown="onKeydown"
      />
      <ul
        :id="`${uid}-list`"
        role="listbox"
        :aria-label="S.placeSearch"
        class="mt-1 max-h-72 overflow-y-auto"
      >
        <li
          v-for="(item, i) in filtered"
          :id="`${uid}-opt-${item.code}`"
          :key="item.code"
          role="option"
          :aria-selected="item.code === (current ?? 0)"
          class="flex min-h-[32px] cursor-pointer items-center rounded px-2 text-sm"
          :class="[
            i === active ? 'bg-gray-900 text-white' : 'text-gray-900 hover:bg-gray-100',
            item.code === (current ?? 0) ? 'font-semibold' : '',
          ]"
          @mousedown.prevent
          @click="pick(item.code)"
        >
          {{ item.name }}
        </li>
        <li v-if="!filtered.length" class="px-2 py-1 text-sm text-gray-700">{{ S.placeNone }}</li>
      </ul>
    </div>

    <!-- Mobile: full-screen sheet with the same combobox. -->
    <HuntingHubShellFullSheet
      v-if="mobile"
      :open="isOpen"
      :title="S.placeSearch"
      initial-focus="input"
      @close="close()"
    >
      <input
        ref="input"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :aria-label="S.placeSearch"
        :placeholder="S.placeSearch"
        aria-autocomplete="list"
        aria-expanded="true"
        :aria-controls="`${uid}-mlist`"
        :aria-activedescendant="activeId"
        class="h-12 w-full rounded-md border border-gray-400 px-3 text-base text-gray-900"
        :class="focusRing"
        @keydown="onKeydown"
      />
      <ul
        :id="`${uid}-mlist`"
        role="listbox"
        :aria-label="S.placeSearch"
        class="mt-2 flex flex-col"
      >
        <li
          v-for="(item, i) in filtered"
          :id="`${uid}-opt-${item.code}`"
          :key="item.code"
          role="option"
          :aria-selected="item.code === (current ?? 0)"
          class="flex min-h-[48px] cursor-pointer items-center rounded px-3 text-base"
          :class="[
            i === active ? 'bg-gray-900 text-white' : 'text-gray-900',
            item.code === (current ?? 0) ? 'font-semibold' : '',
          ]"
          @click="pick(item.code)"
        >
          {{ item.name }}
        </li>
        <li v-if="!filtered.length" class="px-3 py-2 text-base text-gray-700">{{ S.placeNone }}</li>
      </ul>
    </HuntingHubShellFullSheet>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { focusRing, foldLt } from './shell';

// Place picker (§4.3, §10): WAI-ARIA combobox with a listbox, diacritic-insensitive search
// ("kedainiu" finds "Kėdainių r. sav."), "Visa Lietuva" first. Code 0 = Visa Lietuva.
const props = defineProps({
  mobile: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const uid = `hub-place-${getCurrentInstance()?.uid ?? 0}`;

const collator = new Intl.Collator('lt');
const items = computed(() => {
  const list = ctx.data.snapshot.value?.meta.municipalities || [];
  if (!list.length) return [];
  const sorted = list
    .map((m) => ({ code: m.code, name: m.name, key: foldLt(m.name) }))
    .sort((a, b) => collator.compare(a.name, b.name));
  return [{ code: 0, name: S.placeAll, key: foldLt(S.placeAll) }, ...sorted];
});

const current = computed(() => ctx.sel.value.sav);
const currentName = computed(
  () => items.value.find((i) => i.code === (current.value ?? 0))?.name || S.placeAll,
);

const isOpen = ref(false);
const query = ref('');
const active = ref(0);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const input = ref<HTMLInputElement | null>(null);

const filtered = computed(() => {
  const q = foldLt(query.value.trim());
  if (!q) return items.value;
  return items.value.filter((i) => i.key.includes(q));
});
const activeId = computed(() => {
  const item = filtered.value[active.value];
  return item ? `${uid}-opt-${item.code}` : undefined;
});

watch(query, () => (active.value = 0));

const onOutside = (event: PointerEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) close(false);
};

async function open() {
  query.value = '';
  active.value = Math.max(
    0,
    items.value.findIndex((i) => i.code === (current.value ?? 0)),
  );
  isOpen.value = true;
  if (!props.mobile) document.addEventListener('pointerdown', onOutside, true);
  await nextTick();
  if (!props.mobile) input.value?.focus();
  scrollActive();
}

function close(returnFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.removeEventListener('pointerdown', onOutside, true);
  if (returnFocus) nextTick(() => trigger.value?.focus());
}

function pick(code: number) {
  ctx.setSav(code === 0 ? null : code);
  close();
}

function scrollActive() {
  nextTick(() => {
    if (!activeId.value) return;
    document.getElementById(activeId.value)?.scrollIntoView({ block: 'nearest' });
  });
}

function onKeydown(event: KeyboardEvent) {
  const n = filtered.value.length;
  if (event.key === 'ArrowDown' && n) {
    active.value = (active.value + 1) % n;
  } else if (event.key === 'ArrowUp' && n) {
    active.value = (active.value - 1 + n) % n;
  } else if (event.key === 'Home' && n && !query.value) {
    active.value = 0;
  } else if (event.key === 'End' && n && !query.value) {
    active.value = n - 1;
  } else if (event.key === 'Enter') {
    const item = filtered.value[active.value];
    if (item) pick(item.code);
  } else if (event.key === 'Escape') {
    close();
  } else {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  scrollActive();
}

watch(
  () => props.mobile,
  () => close(false),
);

onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true));
</script>
