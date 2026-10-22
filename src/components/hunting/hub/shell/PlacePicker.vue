<template>
  <!-- Phones: the chip shrinks (truncated) so the header row never scrolls sideways. -->
  <HuntingHubShellComboPopover
    :class="mobile ? 'min-w-0 flex-1' : 'max-w-[22rem]'"
    :mode="mobile ? 'sheet' : 'popover'"
    :name="S.place"
    name-class="sr-only lg:not-sr-only"
    :items="list"
    :model-value="current ?? 0"
    :default-value="0"
    :value-text="valueText"
    :placeholder="S.placeSearch"
    @update:model-value="pick"
  />
</template>

<script setup lang="ts">
import { computed, inject, type PropType } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';

// Place picker (§4.3, §10): one control for every topic (CONTROLS-05). "Visa Lietuva" first,
// then the municipalities in Lithuanian order. Code 0 = Visa Lietuva. Bound to the hub state
// (ctx.sel.sav / ctx.setSav) unless `modelValue` is given: then it is controlled, with
// `items` from the caller (Vilkai, Stebėjimai) and `update:modelValue` (null = Visa Lietuva).
const props = defineProps({
  mobile: { type: Boolean, default: false },
  modelValue: {
    type: null as unknown as PropType<number | null | undefined>,
    default: undefined,
  },
  items: {
    type: Array as PropType<{ code: number; name: string }[] | undefined>,
    default: undefined,
  },
});
const emit = defineEmits(['update:modelValue']);

const ctx = inject(HUB_CTX, null);
const controlled = computed(() => props.modelValue !== undefined);

const collator = new Intl.Collator('lt');
const list = computed(() => {
  const source = props.items ?? ctx?.data.snapshot.value?.meta.municipalities ?? [];
  if (!source.length) return [];
  const sorted = source
    .map((m) => ({ value: m.code, label: m.name }))
    .sort((a, b) => collator.compare(a.label, b.label));
  return [{ value: 0, label: S.placeAll }, ...sorted];
});

const current = computed<number | null>(() =>
  controlled.value ? (props.modelValue ?? null) : (ctx?.sel.value.sav ?? null),
);
// "Vieta: visa Lietuva" (lower-case after the colon); a municipality is a proper noun. On
// phones and tablets (< 1024 px, where the name is hidden) the chip shows the value alone:
// "Visa Lietuva".
const named = useMediaQuery('(min-width: 1024px)');
const valueText = computed(() => {
  if (current.value === null) return props.mobile || !named.value ? S.placeAll : S.placeAllLower;
  return list.value.find((i) => i.value === current.value)?.label || `${current.value}`;
});

function pick(code: string | number) {
  const sav = code === 0 ? null : Number(code);
  if (controlled.value) emit('update:modelValue', sav);
  else ctx?.setSav(sav);
}
</script>
