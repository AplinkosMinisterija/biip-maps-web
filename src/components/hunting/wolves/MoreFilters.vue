<template>
  <div class="min-w-0">
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-if="!embedded"
        type="button"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-controls="`${uid}-panel`"
        class="inline-flex items-center gap-1 rounded px-1 text-sm font-medium text-blue-800 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :class="large ? 'min-h-[44px]' : 'min-h-[24px]'"
        @click="isOpen = !isOpen"
      >
        Daugiau filtrų<template v-if="activeCount"> ({{ activeCount }})</template>
        <span aria-hidden="true" class="text-xs">{{ isOpen ? '▴' : '▾' }}</span>
      </button>
      <button
        v-if="activeCount"
        type="button"
        class="inline-flex items-center rounded px-1 text-sm text-gray-800 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :class="large ? 'min-h-[44px]' : 'min-h-[24px]'"
        aria-label="Išvalyti papildomus filtrus"
        @click="clear"
      >
        Išvalyti
      </button>
    </div>

    <div
      v-show="embedded || isOpen"
      :id="`${uid}-panel`"
      class="mt-2 grid gap-x-4 gap-y-3 grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]"
    >
      <fieldset v-for="group in groups" :key="group.key" class="min-w-0">
        <legend class="mb-1 text-xs font-semibold text-gray-900">{{ group.title }}</legend>
        <label
          v-for="option in group.options"
          :key="option.code"
          class="flex cursor-pointer items-center gap-2 text-sm text-gray-900"
          :class="large ? 'min-h-[44px]' : 'min-h-[24px]'"
        >
          <input
            type="checkbox"
            class="h-4 w-4 accent-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            :checked="ctx.state.attrs.value[group.key].includes(option.code)"
            @change="toggle(group.key, option.code, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ option.label }}</span>
        </label>
      </fieldset>
    </div>
  </div>
</template>

<script setup lang="ts">
// P1 attribute filters (SPEC §4.7, §5.2): Amžius / Lytis / Medžioklės būdas.
// An empty list means no filter; 'nenurodyta' stands for a missing value.
import { computed, getCurrentInstance, inject, ref } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';

type AttrKey = 'age' | 'sex' | 'method';

defineProps({
  large: { type: Boolean, default: false },
  // Hub: rendered inside the "Daugiau filtrų" popover, so the panel is always open and the
  // own toggle is hidden.
  embedded: { type: Boolean, default: false },
});

const ctx = inject(WOLVES_CTX)!;
const uid = `wolves-more-${getCurrentInstance()?.uid ?? 0}`;

// Labels as in SPEC §4.8.
const groups: { key: AttrKey; title: string; options: { code: string; label: string }[] }[] = [
  {
    key: 'age',
    title: 'Amžius',
    options: [
      { code: 'ADULT', label: 'Suaugęs' },
      { code: 'TWO_YEAR', label: 'Vyresnis nei 1 m.' },
      { code: 'ONE_YEAR', label: 'Jauniklis iki 1 m.' },
      { code: 'nenurodyta', label: 'Nenurodyta' },
    ],
  },
  {
    key: 'sex',
    title: 'Lytis',
    options: [
      { code: 'MALE', label: 'Patinas' },
      { code: 'FEMALE', label: 'Patelė' },
      { code: 'nenurodyta', label: 'Nenurodyta' },
    ],
  },
  {
    key: 'method',
    title: 'Medžioklės būdas',
    options: [
      { code: 'TYKOJAMOJI', label: 'Tykojamoji' },
      { code: 'VAROMOJI', label: 'Varomoji' },
      { code: 'SU_VELIAVELEMIS', label: 'Su vėliavėlėmis' },
      { code: 'OTHER', label: 'Kita' },
      { code: 'nenurodyta', label: 'Nenurodytas' },
    ],
  },
];

const activeCount = computed(() => {
  const attrs = ctx.state.attrs.value;
  return attrs.age.length + attrs.sex.length + attrs.method.length;
});
const isOpen = ref(activeCount.value > 0);

function toggle(key: AttrKey, code: string, checked: boolean) {
  const attrs = ctx.state.attrs.value;
  const list = attrs[key].filter((c) => c !== code);
  if (checked) list.push(code);
  // Replace the object so URL sync and computed filters see the change.
  ctx.state.attrs.value = { ...attrs, [key]: list };
}

function clear() {
  ctx.state.attrs.value = { age: [], sex: [], method: [] };
}
</script>
