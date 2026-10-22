<template>
  <div class="min-w-0">
    <div v-if="!embedded" class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-controls="`${uid}-panel`"
        :class="[BTN_TEXT, large ? BTN_TEXT_TOUCH : '', 'text-sm']"
        @click="isOpen = !isOpen"
      >
        Daugiau filtrų<template v-if="activeCount"> ({{ activeCount }})</template>
        <UiIcon
          name="chevron-down"
          :size="16"
          aria-hidden="true"
          class="transition-transform motion-reduce:transition-none"
          :class="isOpen ? 'rotate-180' : ''"
        />
      </button>
      <button
        v-if="activeCount"
        type="button"
        :class="[BTN_TEXT, large ? BTN_TEXT_TOUCH : '']"
        aria-label="Atstatyti papildomus filtrus"
        @click="clear"
      >
        Atstatyti
      </button>
    </div>

    <div
      v-show="embedded || isOpen"
      :id="`${uid}-panel`"
      class="grid gap-x-4 gap-y-3 grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]"
      :class="embedded ? '' : 'mt-2'"
    >
      <fieldset v-for="group in groups" :key="group.key" class="min-w-0">
        <legend class="mb-1 font-semibold text-ink" :class="large ? 'text-base' : 'text-[13px]'">
          {{ group.title }}
        </legend>
        <label
          v-for="option in group.options"
          :key="option.code"
          class="flex cursor-pointer items-center gap-2 text-ink"
          :class="large ? 'min-h-[48px] text-base' : 'min-h-[32px] text-sm'"
        >
          <input
            type="checkbox"
            :class="[CHECK, large ? 'h-5 w-5' : '']"
            :checked="attrs[group.key].includes(option.code)"
            @change="toggle(group.key, option.code, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ option.label }}</span>
        </label>
      </fieldset>
    </div>

    <!-- The hub's "Daugiau filtrų" popover: reset at the bottom right (CONTROLS-16). -->
    <div v-if="embedded && !staged && activeCount" class="mt-3 flex justify-end">
      <button
        type="button"
        :class="BTN_TEXT"
        aria-label="Atstatyti papildomus filtrus"
        @click="clear"
      >
        Atstatyti
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// P1 attribute filters (SPEC §4.7, §5.2): Amžius / Lytis / Medžioklės būdas.
// An empty list means no filter; 'nenurodyta' stands for a missing value.
import { computed, getCurrentInstance, inject, ref, type PropType } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { BTN_TEXT, BTN_TEXT_TOUCH, CHECK } from '@/components/hunting/hub/shell/controls';

type AttrKey = 'age' | 'sex' | 'method';
type Attrs = Record<AttrKey, string[]>;

const props = defineProps({
  large: { type: Boolean, default: false },
  // Hub: rendered inside the "Daugiau filtrų" popover or the phone Filtrai sheet, so the
  // panel is always open and the own toggle is hidden.
  embedded: { type: Boolean, default: false },
  // Staged (the hub's phone Filtrai sheet): changes go to `draft` (v-model:draft), the sheet
  // applies them with its footer button.
  staged: { type: Boolean, default: false },
  draft: { type: Object as PropType<Attrs | null>, default: null },
});
const emit = defineEmits(['update:draft']);

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

const attrs = computed<Attrs>(() =>
  props.staged && props.draft ? props.draft : ctx.state.attrs.value,
);
const activeCount = computed(
  () => attrs.value.age.length + attrs.value.sex.length + attrs.value.method.length,
);
const isOpen = ref(activeCount.value > 0);

function write(next: Attrs) {
  if (props.staged) emit('update:draft', next);
  // Replace the object so URL sync and computed filters see the change.
  else ctx.state.attrs.value = next;
}

function toggle(key: AttrKey, code: string, checked: boolean) {
  const list = attrs.value[key].filter((c) => c !== code);
  if (checked) list.push(code);
  write({ ...attrs.value, [key]: list });
}

function clear() {
  write({ age: [], sex: [], method: [] });
}
</script>
