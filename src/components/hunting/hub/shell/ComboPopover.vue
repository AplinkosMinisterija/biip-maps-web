<template>
  <div ref="root" class="relative min-w-0" :class="mode === 'inline' ? 'flex flex-col gap-2' : ''">
    <!-- Popover and sheet: a filter chip opens the list. -->
    <HuntingHubShellFilterChip
      v-if="mode !== 'inline'"
      ref="trigger"
      :name="mode === 'sheet' ? '' : name"
      :name-class="nameClass"
      :value="chipText"
      :active="isSet"
      :open="isOpen"
      :touch="mode === 'sheet'"
      :sr-label="mode === 'sheet' ? `${name}: ${chipText}` : ''"
      :disabled="!items.length"
      class="w-full"
      aria-haspopup="dialog"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="open"
    />
    <span v-else :id="`${uid}-label`" class="text-base font-semibold text-ink">{{ name }}</span>

    <!-- Desktop: popover with the search field and the list. -->
    <div
      v-if="isOpen && mode === 'popover'"
      ref="panel"
      role="dialog"
      :aria-label="placeholder"
      :class="POPOVER"
      @keydown.esc.prevent.stop="close()"
    >
      <ComboList />
    </div>

    <!-- Phones: the same combobox in a full-screen sheet. -->
    <HuntingHubShellFullSheet
      v-if="mode === 'sheet'"
      :open="isOpen"
      :title="sheetTitle || placeholder"
      initial-focus="input"
      @close="close()"
    >
      <ComboList />
    </HuntingHubShellFullSheet>

    <!-- Inside a sheet (Filtrai): the combobox in the flow, no chip. -->
    <ComboList v-if="mode === 'inline'" />
  </div>
</template>

<script setup lang="ts">
// Searchable single choice (WAI-ARIA combobox with a listbox): the place picker and the
// Laimikiai species filter. Diacritic-insensitive search ("kedainiu" finds "Kėdainių r.
// sav."), the default ("all") item first, optional group headings. A pick applies at once.
// Modes: 'popover' (filter bar chip), 'sheet' (phone header chip, full-screen sheet),
// 'inline' (inside the phone Filtrai sheet).
import {
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from 'vue';
import { foldLt, rankByQuery } from './shell';
import {
  FIELD,
  FIELD_FOCUS_INSET,
  FIELD_TOUCH,
  GROUP_LABEL,
  OPTION,
  OPTION_HIGHLIGHT,
  OPTION_SELECTED,
  OPTION_TOUCH,
  POPOVER,
} from './controls';
import { S } from '@/utils/hunting/hub/strings';

interface ComboItem {
  value: string | number;
  label: string;
  group?: string;
}

const props = defineProps({
  // Chip name ("Vieta", "Rūšis").
  name: { type: String, required: true },
  items: { type: Array as PropType<ComboItem[]>, required: true },
  modelValue: { type: [String, Number], required: true },
  // The value that means "no filter" (chip not active).
  defaultValue: { type: [String, Number], required: true },
  // Chip value text; defaults to the label of the current item.
  valueText: { type: String, default: '' },
  // Search field label and placeholder ("Ieškoti savivaldybės").
  placeholder: { type: String, required: true },
  sheetTitle: { type: String, default: '' },
  mode: { type: String as PropType<'popover' | 'sheet' | 'inline'>, default: 'popover' },
  nameClass: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

const uid = `hub-combo-${getCurrentInstance()?.uid ?? 0}`;
const isOpen = ref(false);
const query = ref('');
const active = ref(0);
const root = ref<HTMLElement | null>(null);
const trigger = ref<{ focus(): void } | null>(null);
// The active option is marked only while the search field has focus (inline mode).
const inputFocused = ref(false);

const keyed = computed(() => props.items.map((i) => ({ ...i, key: foldLt(i.label) })));
const current = computed(() => props.items.find((i) => i.value === props.modelValue));
const isSet = computed(() => props.modelValue !== props.defaultValue);
const chipText = computed(() => props.valueText || current.value?.label || '');

// Word-start hits first, so "ute" + Enter picks Utenos r. sav., not Šilutės (JOURNEYS-01).
const filtered = computed(() => rankByQuery(keyed.value, foldLt(query.value.trim())));
const optionId = (item: ComboItem) => `${uid}-opt-${item.value}`;
const activeId = computed(() => {
  const item = filtered.value[active.value];
  return item ? optionId(item) : undefined;
});
watch(query, () => (active.value = 0));

const resetActive = () => {
  active.value = Math.max(
    0,
    filtered.value.findIndex((i) => i.value === props.modelValue),
  );
};

const onOutside = (event: PointerEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) close(false);
};

async function open() {
  query.value = '';
  resetActive();
  isOpen.value = true;
  if (props.mode === 'popover') document.addEventListener('pointerdown', onOutside, true);
  await nextTick();
  if (props.mode === 'popover') root.value?.querySelector<HTMLInputElement>('input')?.focus();
  scrollActive();
}

function close(returnFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.removeEventListener('pointerdown', onOutside, true);
  if (returnFocus) nextTick(() => trigger.value?.focus());
}

function pick(item: ComboItem) {
  if (item.value !== props.modelValue) emit('update:modelValue', item.value);
  if (props.mode === 'inline') {
    active.value = Math.max(0, filtered.value.indexOf(item as (typeof filtered.value)[0]));
  } else close();
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
    if (item) pick(item);
  } else if (event.key === 'Escape' && props.mode !== 'inline') {
    close();
  } else {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  scrollActive();
}

watch(
  () => props.mode,
  () => close(false),
);
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true));

// The search field and the list, shared by the three modes (render function: one copy of
// the markup, and the ids stay unique because only one mode renders at a time).
const CHECK_PATH = 'M4 10.5l4 4 8-9';
const ComboList = defineComponent({
  setup() {
    return () => {
      const large = props.mode !== 'popover';
      const groups: { label: string; items: typeof filtered.value }[] = [];
      filtered.value.forEach((item) => {
        const label = item.group || '';
        let g = groups[groups.length - 1];
        if (!g || g.label !== label) {
          g = { label, items: [] };
          groups.push(g);
        }
        g.items.push(item);
      });
      const option = (item: (typeof filtered.value)[0]) => {
        const i = filtered.value.indexOf(item);
        const selected = item.value === props.modelValue;
        return h(
          'div',
          {
            id: optionId(item),
            key: String(item.value),
            role: 'option',
            'aria-selected': selected ? 'true' : 'false',
            class: [
              OPTION,
              large ? OPTION_TOUCH : '',
              selected
                ? OPTION_SELECTED
                : i === active.value && inputFocused.value
                  ? OPTION_HIGHLIGHT
                  : '',
              i === active.value && inputFocused.value ? 'shadow-[inset_3px_0_0_#004650]' : '',
              'justify-between',
            ],
            onMousedown: (e: MouseEvent) => e.preventDefault(),
            onClick: () => pick(item),
          },
          [
            h('span', { class: 'min-w-0' }, item.label),
            selected
              ? h(
                  'svg',
                  {
                    width: 16,
                    height: 16,
                    viewBox: '0 0 20 20',
                    'aria-hidden': 'true',
                    class: 'shrink-0',
                  },
                  [
                    h('path', {
                      d: CHECK_PATH,
                      fill: 'none',
                      stroke: 'currentColor',
                      'stroke-width': 2,
                      'stroke-linecap': 'round',
                      'stroke-linejoin': 'round',
                    }),
                  ],
                )
              : null,
          ],
        );
      };
      return [
        h('input', {
          type: 'text',
          role: 'combobox',
          autocomplete: 'off',
          spellcheck: 'false',
          value: query.value,
          'aria-label': props.placeholder,
          placeholder: props.placeholder,
          'aria-autocomplete': 'list',
          'aria-expanded': 'true',
          'aria-controls': `${uid}-list`,
          'aria-activedescendant': activeId.value,
          class: [
            props.mode === 'inline' ? FIELD : FIELD_FOCUS_INSET,
            large ? FIELD_TOUCH : '',
            'placeholder:text-ink-muted',
          ],
          onInput: (e: Event) => (query.value = (e.target as HTMLInputElement).value),
          onKeydown,
          onFocus: () => (inputFocused.value = true),
          onBlur: () => (inputFocused.value = false),
        }),
        h(
          'div',
          {
            id: `${uid}-list`,
            role: 'listbox',
            'aria-label': props.name,
            class: [
              'mt-2 flex flex-col gap-0.5',
              props.mode === 'popover' ? 'max-h-72 overflow-y-auto' : '',
            ],
          },
          filtered.value.length
            ? groups.map((g) =>
                g.label
                  ? h('div', { role: 'group', 'aria-label': g.label, key: g.label }, [
                      h('div', { class: GROUP_LABEL, 'aria-hidden': 'true' }, g.label),
                      ...g.items.map(option),
                    ])
                  : g.items.map(option),
              )
            : [h('div', { class: 'px-3 py-2 text-[15px] text-ink-muted' }, S.placeNone)],
        ),
      ];
    };
  },
});
</script>
