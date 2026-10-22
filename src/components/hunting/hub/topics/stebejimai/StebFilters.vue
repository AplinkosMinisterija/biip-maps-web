<template>
  <!-- Desktop and tablet: one chip with a popover per filter (STEB-SPEC §3.1), the same chips
       as the other topics. The chips shrink (truncated) when the row is short, so the bar
       never scrolls sideways and "Atstatyti filtrus" never slides under the standalone view
       switch. -->
  <div v-if="!mobile" class="flex min-w-0 items-center gap-2">
    <ChipPopover
      :name="chipText.period.name"
      :value="chipText.period.value"
      shrinkable
      :style="shrinkStyle(chipText.period.value)"
      :sr-label="compact ? fullText.period : ''"
      :title="SS.period"
      :active="ctx.state.period.value.kind !== 'all'"
      panel-class="w-[400px]"
    >
      <StebPeriod />
    </ChipPopover>
    <ChipPopover
      :name="chipText.species.name"
      :value="chipText.species.value"
      shrinkable
      :style="shrinkStyle(chipText.species.value)"
      :sr-label="compact ? fullText.species : ''"
      :title="SS.species"
      :active="ctx.state.gyvunas.value !== null"
      :padded="false"
      initial-focus="input:checked"
      panel-class="w-[320px]"
    >
      <template #default="{ close }">
        <fieldset class="min-w-0" @change="closeOnPointer(close)" @pointerdown="byPointer = true">
          <legend class="sr-only">{{ SS.species }}</legend>
          <label :class="row(ctx.state.gyvunas.value === null)">
            <input
              type="radio"
              :name="`${uid}-species`"
              :checked="ctx.state.gyvunas.value === null"
              :class="CHECK"
              @change="ctx.state.setSpecies(null)"
            />
            <span>{{ SS.allSpecies }}</span>
          </label>
          <label
            v-for="o in ctx.derived.speciesOptions.value"
            :key="o.key"
            :class="row(ctx.state.gyvunas.value === o.key)"
          >
            <input
              type="radio"
              :name="`${uid}-species`"
              :checked="ctx.state.gyvunas.value === o.key"
              :class="CHECK"
              @change="ctx.state.setSpecies(o.key)"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </fieldset>
      </template>
    </ChipPopover>
    <ChipPopover
      :name="chipText.fact.name"
      :value="chipText.fact.value"
      shrinkable
      :style="shrinkStyle(chipText.fact.value)"
      :sr-label="compact ? fullText.fact : ''"
      :title="SS.fact"
      :active="ctx.state.faktas.value !== null"
      :padded="false"
      initial-focus="input:checked"
      panel-class="w-[360px]"
    >
      <template #default="{ close }">
        <fieldset class="min-w-0" @change="closeOnPointer(close)" @pointerdown="byPointer = true">
          <legend class="sr-only">{{ SS.fact }}</legend>
          <label :class="row(ctx.state.faktas.value === null)">
            <input
              type="radio"
              :name="`${uid}-fact`"
              :checked="ctx.state.faktas.value === null"
              :class="CHECK"
              @change="ctx.state.setFact(null)"
            />
            <span>{{ SS.allFacts }}</span>
          </label>
          <label
            v-for="o in ctx.derived.factOptions.value"
            :key="o.key"
            :class="row(ctx.state.faktas.value === o.key)"
          >
            <input
              type="radio"
              :name="`${uid}-fact`"
              :checked="ctx.state.faktas.value === o.key"
              :class="CHECK"
              @change="ctx.state.setFact(o.key)"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </fieldset>
      </template>
    </ChipPopover>
    <!-- The hub's place picker (search over the municipalities, CONTROLS-05). -->
    <HuntingHubShellPlacePicker
      v-if="placeAvailable"
      :style="shrinkStyle(placeText)"
      :model-value="ctx.state.sav.value"
      :items="ctx.derived.placeOptions.value"
      @update:model-value="ctx.state.setPlace"
    />
    <button
      v-if="!ctx.derived.isDefault.value"
      type="button"
      :class="[BTN_TEXT, 'shrink-0 whitespace-nowrap']"
      @click="ctx.state.reset()"
    >
      {{ SS.resetFilters }}
    </button>
  </div>

  <!-- Phones: [Laikotarpis] [Vieta] [Filtrai (n)], as the other topics (CONTROLS-07). The
       period chip shows its value ("Visas laikotarpis", truncated when the row is short) as
       the other topics' season chips do; its accessible name keeps "Laikotarpis: …"
       (MOBILE-15). -->
  <div v-else class="flex min-w-0 flex-1 items-center gap-2">
    <HuntingHubShellFilterChip
      ref="periodTrigger"
      class="min-w-0 max-w-[38%] shrink"
      touch
      :value="periodChip"
      :open="periodOpen"
      :active="ctx.state.period.value.kind !== 'all'"
      :sr-label="SS.periodChip(periodChip)"
      aria-haspopup="dialog"
      @click="periodOpen = true"
    />
    <HuntingHubShellPlacePicker
      v-if="placeAvailable"
      mobile
      :model-value="ctx.state.sav.value"
      :items="ctx.derived.placeOptions.value"
      @update:model-value="ctx.state.setPlace"
    />
    <HuntingHubShellFilterChip
      ref="filtersTrigger"
      class="ml-auto shrink-0"
      touch
      :value="S.filters"
      :badge="sheetCount"
      :active="sheetCount > 0"
      :chevron="false"
      :sr-label="SS.filtersChip(sheetCount)"
      aria-haspopup="dialog"
      @click="openFilters"
    />

    <FullSheet :open="periodOpen" :title="SS.period" @close="closeSheet('period')">
      <StebPeriod large />
    </FullSheet>
    <FullSheet :open="filtersOpen" :title="S.filters" @close="closeSheet('filters')">
      <div class="flex flex-col gap-5">
        <fieldset class="min-w-0">
          <legend class="mb-1 text-base font-semibold text-ink">{{ SS.species }}</legend>
          <label :class="row(draft.gyvunas === null, true)">
            <input
              type="radio"
              :name="`${uid}-m-species`"
              :checked="draft.gyvunas === null"
              :class="[CHECK, 'h-5 w-5']"
              @change="draft = { ...draft, gyvunas: null }"
            />
            <span>{{ SS.allSpecies }}</span>
          </label>
          <label
            v-for="o in ctx.derived.speciesOptions.value"
            :key="o.key"
            :class="row(draft.gyvunas === o.key, true)"
          >
            <input
              type="radio"
              :name="`${uid}-m-species`"
              :checked="draft.gyvunas === o.key"
              :class="[CHECK, 'h-5 w-5']"
              @change="draft = { ...draft, gyvunas: o.key }"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </fieldset>
        <fieldset class="min-w-0">
          <legend class="mb-1 text-base font-semibold text-ink">{{ SS.fact }}</legend>
          <label :class="row(draft.faktas === null, true)">
            <input
              type="radio"
              :name="`${uid}-m-fact`"
              :checked="draft.faktas === null"
              :class="[CHECK, 'h-5 w-5']"
              @change="draft = { ...draft, faktas: null }"
            />
            <span>{{ SS.allFacts }}</span>
          </label>
          <label
            v-for="o in ctx.derived.factOptions.value"
            :key="o.key"
            :class="row(draft.faktas === o.key, true)"
          >
            <input
              type="radio"
              :name="`${uid}-m-fact`"
              :checked="draft.faktas === o.key"
              :class="[CHECK, 'h-5 w-5']"
              @change="draft = { ...draft, faktas: o.key }"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </fieldset>
      </div>
      <!-- Staged: the map redraws only with "Rodyti N stebėjimų" (CONTROLS-17); the actions
           are pinned below the list (MOBILE-09). -->
      <template #footer>
        <button
          type="button"
          :class="[BTN_SECONDARY, BTN_TOUCH, 'text-base']"
          @click="draft = { gyvunas: null, faktas: null }"
        >
          {{ S.reset }}
        </button>
        <button
          type="button"
          :class="[BTN_PRIMARY, BTN_TOUCH, 'flex-1 text-base']"
          @click="applyFilters"
        >
          {{ draftLabel }}
        </button>
      </template>
    </FullSheet>
  </div>
</template>

<script setup lang="ts">
// Filters of the Stebėjimai topic (STEB-SPEC §3.3): Laikotarpis, Rūšis, Faktas, Vieta.
// Desktop: chips with popovers (the hub's generic ChipPopover and PlacePicker); phones:
// "Laikotarpis", "Vieta" and "Filtrai (n)" chips opening full-screen sheets. Single choices
// apply at once; the phone Filtrai sheet (two fields) is staged until its footer button.
import { computed, getCurrentInstance, inject, nextTick, ref } from 'vue';
import { useWindowSize } from '@vueuse/core';
import ChipPopover from '@/components/hunting/hub/topics/vilkai/ChipPopover.vue';
import FullSheet from '@/components/hunting/hub/shell/FullSheet.vue';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT,
  BTN_TOUCH,
  CHECK,
  OPTION,
  OPTION_SELECTED,
  OPTION_TOUCH,
} from '@/components/hunting/hub/shell/controls';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { formatInt, pluralLt } from '@/utils/hunting/dates';
import { DESKTOP_MIN, WIDE_MIN } from '@/utils/hunting/hub/layout';
import { chipValue, S } from '@/utils/hunting/hub/strings';
import { filterRecords, periodChipLabel } from '@/utils/hunting/hub/stebejimai/model';
import { P_OBSERVATION_ACC, SS } from '@/utils/hunting/hub/stebejimai/strings';
import StebPeriod from './StebPeriod.vue';

defineProps({
  mobile: { type: Boolean, default: false },
});

const ctx = inject(STEB_CTX)!;
const uid = `steb-filters-${getCurrentInstance()?.uid ?? 0}`;
const { width } = useWindowSize();
// Tablets, and standalone below 1280 px (where the own view switch shares the bar): short
// chip texts, so four chips fit; the chips also shrink as a last resort.
const compact = computed(() => width.value < (ctx.embed ? DESKTOP_MIN : WIDE_MIN));

const row = (selected: boolean, large = false) => [
  OPTION,
  large ? OPTION_TOUCH : '',
  selected ? OPTION_SELECTED : '',
];

const periodChip = computed(() => periodChipLabel(ctx.state.period.value, ctx.today));
const optionLabel = (list: { key: string; label: string }[], key: string | null) =>
  list.find((o) => o.key === key)?.label || key || '';
// Chip values after the name, lower-case ("Rūšis: visos", "Faktas: stebėtas gyvas").
const values = computed(() => {
  const { period, gyvunas, faktas } = ctx.state;
  return {
    period: period.value.kind === 'all' ? SS.allPeriodChip : chipValue(periodChip.value),
    species:
      gyvunas.value === null
        ? SS.allSpeciesChip
        : chipValue(optionLabel(ctx.derived.speciesOptions.value, gyvunas.value)),
    fact:
      faktas.value === null
        ? SS.allFactsChip
        : chipValue(optionLabel(ctx.derived.factOptions.value, faktas.value)),
  };
});
const fullText = computed(() => ({
  period: SS.periodChip(values.value.period),
  species: SS.speciesChip(values.value.species),
  fact: SS.factChip(values.value.fact),
}));
// Wide: "Rūšis: stumbras". Compact: the value of a set filter, the name of an unset one
// ("Rūšis", not "visos"), and the period's value; the full text stays the chip's accessible
// name, so a screen reader still hears "Rūšis: stumbras".
const chipText = computed(() => {
  const v = values.value;
  if (!compact.value) {
    return {
      period: { name: SS.period, value: v.period },
      species: { name: SS.species, value: v.species },
      fact: { name: SS.fact, value: v.fact },
    };
  }
  const { gyvunas, faktas } = ctx.state;
  return {
    period: { name: '', value: periodChip.value },
    species: {
      name: '',
      value:
        gyvunas.value !== null
          ? optionLabel(ctx.derived.speciesOptions.value, gyvunas.value)
          : SS.species,
    },
    fact: {
      name: '',
      value:
        faktas.value !== null ? optionLabel(ctx.derived.factOptions.value, faktas.value) : SS.fact,
    },
  };
});
const placeText = computed(() => {
  const sav = ctx.state.sav.value;
  return sav === null ? SS.allPlaces : ctx.meta.nameOf(sav) || `${sav}`;
});
// When the row is short, long chip texts give way first, down to 5rem; short ones ("Rūšis",
// "Stumbras") shrink only after that, so they stay readable in the usual cases. Flex
// shrinking is weighted by the shrink factor, hence the large factor of the long chips.
const LONG_CHIP = 16;
const shrinkStyle = (text: string) =>
  text.length > LONG_CHIP ? { flexShrink: 100000, minWidth: '5rem' } : { flexShrink: 1 };
// The place filter needs the municipality list of the hub meta.
const placeAvailable = computed(() => ctx.meta.status.value === 'ready');

// A click on an option closes its popover; arrow keys move through the options and keep it
// open (Esc closes).
const byPointer = ref(false);
function closeOnPointer(close: () => void) {
  if (byPointer.value) close();
  byPointer.value = false;
}

// ---- Phone sheets: focus goes back to the chip that opened them.
const periodOpen = ref(false);
const filtersOpen = ref(false);
const periodTrigger = ref<{ focus(): void } | null>(null);
const filtersTrigger = ref<{ focus(): void } | null>(null);
function closeSheet(which: 'period' | 'filters') {
  if (which === 'period') periodOpen.value = false;
  else filtersOpen.value = false;
  nextTick(() => (which === 'period' ? periodTrigger : filtersTrigger).value?.focus());
}

// The Filtrai sheet holds Rūšis and Faktas (Vieta has its own chip): staged.
const sheetCount = computed(
  () => Number(ctx.state.gyvunas.value !== null) + Number(ctx.state.faktas.value !== null),
);
const draft = ref<{ gyvunas: string | null; faktas: string | null }>({
  gyvunas: null,
  faktas: null,
});
function openFilters() {
  draft.value = { gyvunas: ctx.state.gyvunas.value, faktas: ctx.state.faktas.value };
  filtersOpen.value = true;
}
function applyFilters() {
  const { gyvunas, faktas } = draft.value;
  if (gyvunas !== ctx.state.gyvunas.value) ctx.state.setSpecies(gyvunas);
  if (faktas !== ctx.state.faktas.value) ctx.state.setFact(faktas);
  closeSheet('filters');
}
// "Rodyti 8 stebėjimus": the rows the draft would show, under the period and place.
const draftLabel = computed(() => {
  const n = filterRecords(
    ctx.derived.records.value,
    { period: ctx.state.period.value, sav: ctx.state.sav.value, ...draft.value },
    ctx.today,
    ctx.meta.codeOf,
  ).length;
  return SS.showObservations(`${formatInt(n)} ${pluralLt(n, P_OBSERVATION_ACC)}`);
});
</script>
