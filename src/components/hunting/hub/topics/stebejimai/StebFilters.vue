<template>
  <!-- Desktop and tablet: one chip with a popover per filter (STEB-SPEC §3.1). -->
  <div v-if="!mobile" class="flex min-w-0 items-center gap-2">
    <ChipPopover
      :label="compact ? periodChip : SS.periodChip(periodChip)"
      :title="SS.period"
      :active="ctx.state.period.value.kind !== 'all'"
      panel-class="w-[400px]"
    >
      <StebPeriod />
    </ChipPopover>
    <ChipPopover
      :label="compact ? speciesChip : SS.speciesChip(speciesChip)"
      :title="SS.species"
      :active="ctx.state.gyvunas.value !== null"
      panel-class="w-[320px]"
    >
      <fieldset class="min-w-0">
        <legend class="sr-only">{{ SS.species }}</legend>
        <div class="flex flex-col gap-1">
          <label :class="rowClass">
            <input
              type="radio"
              :name="`${uid}-species`"
              :checked="ctx.state.gyvunas.value === null"
              :class="radioClass"
              @change="ctx.state.setSpecies(null)"
            />
            <span>{{ SS.allSpecies }}</span>
          </label>
          <label v-for="o in ctx.derived.speciesOptions.value" :key="o.key" :class="rowClass">
            <input
              type="radio"
              :name="`${uid}-species`"
              :checked="ctx.state.gyvunas.value === o.key"
              :class="radioClass"
              @change="ctx.state.setSpecies(o.key)"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </div>
      </fieldset>
    </ChipPopover>
    <ChipPopover
      :label="compact ? factChip : SS.factChip(factChip)"
      :title="SS.fact"
      :active="ctx.state.faktas.value !== null"
      panel-class="w-[360px]"
    >
      <fieldset class="min-w-0">
        <legend class="sr-only">{{ SS.fact }}</legend>
        <div class="flex flex-col gap-1">
          <label :class="rowClass">
            <input
              type="radio"
              :name="`${uid}-fact`"
              :checked="ctx.state.faktas.value === null"
              :class="radioClass"
              @change="ctx.state.setFact(null)"
            />
            <span>{{ SS.allFacts }}</span>
          </label>
          <label v-for="o in ctx.derived.factOptions.value" :key="o.key" :class="rowClass">
            <input
              type="radio"
              :name="`${uid}-fact`"
              :checked="ctx.state.faktas.value === o.key"
              :class="radioClass"
              @change="ctx.state.setFact(o.key)"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </div>
      </fieldset>
    </ChipPopover>
    <ChipPopover
      v-if="placeAvailable"
      :label="compact ? placeChip : SS.placeChip(placeChip)"
      :title="SS.place"
      :active="ctx.state.sav.value !== null"
      panel-class="w-[320px]"
    >
      <label :for="`${uid}-place`" class="mb-1 block text-sm font-semibold text-gray-900">
        {{ SS.place }}
      </label>
      <select
        :id="`${uid}-place`"
        :value="placeValue"
        :class="selectClass"
        @change="onPlace(($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ SS.allPlaces }}</option>
        <option v-for="p in ctx.derived.placeOptions.value" :key="p.code" :value="String(p.code)">
          {{ p.name }}
        </option>
      </select>
    </ChipPopover>
    <button
      v-if="!ctx.derived.isDefault.value"
      type="button"
      class="shrink-0 whitespace-nowrap rounded px-1 text-sm font-semibold text-blue-800 underline"
      :class="focusRing"
      @click="ctx.state.reset()"
    >
      {{ SS.resetFilters }}
    </button>
  </div>

  <!-- Phones: two chips, each opening a full-screen sheet (STEB-SPEC §3.1). The period chip
       shows the value only (as Vilkai's does) and is the one that shrinks; its name keeps
       "Laikotarpis: …". -->
  <div v-else class="flex min-w-0 items-center gap-2">
    <button
      ref="periodTrigger"
      type="button"
      aria-haspopup="dialog"
      :aria-label="SS.periodChip(periodChip)"
      :class="[mobileChip, 'min-w-0 max-w-full shrink']"
      @click="periodOpen = true"
    >
      <span class="truncate">{{ periodChip }}</span>
      <span aria-hidden="true" class="text-sm">▾</span>
    </button>
    <button
      ref="filtersTrigger"
      type="button"
      aria-haspopup="dialog"
      :class="[mobileChip, 'shrink-0 whitespace-nowrap']"
      @click="filtersOpen = true"
    >
      <UiIcon name="filter" :size="18" aria-hidden="true" />
      <span>{{ SS.filtersChip(ctx.derived.activeCount.value) }}</span>
    </button>

    <FullSheet :open="periodOpen" :title="SS.period" @close="closeSheet('period')">
      <StebPeriod large />
    </FullSheet>
    <FullSheet :open="filtersOpen" :title="SS.filtersChip(0)" @close="closeSheet('filters')">
      <div class="flex flex-col gap-5">
        <fieldset class="min-w-0">
          <legend class="mb-1 text-base font-semibold text-gray-900">{{ SS.species }}</legend>
          <label :class="rowClassLarge">
            <input
              type="radio"
              :name="`${uid}-m-species`"
              :checked="ctx.state.gyvunas.value === null"
              :class="radioClass"
              @change="ctx.state.setSpecies(null)"
            />
            <span>{{ SS.allSpecies }}</span>
          </label>
          <label v-for="o in ctx.derived.speciesOptions.value" :key="o.key" :class="rowClassLarge">
            <input
              type="radio"
              :name="`${uid}-m-species`"
              :checked="ctx.state.gyvunas.value === o.key"
              :class="radioClass"
              @change="ctx.state.setSpecies(o.key)"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </fieldset>
        <fieldset class="min-w-0">
          <legend class="mb-1 text-base font-semibold text-gray-900">{{ SS.fact }}</legend>
          <label :class="rowClassLarge">
            <input
              type="radio"
              :name="`${uid}-m-fact`"
              :checked="ctx.state.faktas.value === null"
              :class="radioClass"
              @change="ctx.state.setFact(null)"
            />
            <span>{{ SS.allFacts }}</span>
          </label>
          <label v-for="o in ctx.derived.factOptions.value" :key="o.key" :class="rowClassLarge">
            <input
              type="radio"
              :name="`${uid}-m-fact`"
              :checked="ctx.state.faktas.value === o.key"
              :class="radioClass"
              @change="ctx.state.setFact(o.key)"
            />
            <span>{{ SS.optionCount(o.label, o.n) }}</span>
          </label>
        </fieldset>
        <div v-if="placeAvailable">
          <label :for="`${uid}-m-place`" class="mb-1 block text-base font-semibold text-gray-900">
            {{ SS.place }}
          </label>
          <select
            :id="`${uid}-m-place`"
            :value="placeValue"
            :class="[selectClass, 'h-12 text-base']"
            @change="onPlace(($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ SS.allPlaces }}</option>
            <option
              v-for="p in ctx.derived.placeOptions.value"
              :key="p.code"
              :value="String(p.code)"
            >
              {{ p.name }}
            </option>
          </select>
        </div>
        <button
          v-if="!ctx.derived.isDefault.value"
          type="button"
          class="min-h-[44px] self-start rounded text-base font-semibold text-blue-800 underline"
          :class="focusRing"
          @click="ctx.state.reset()"
        >
          {{ SS.resetFilters }}
        </button>
      </div>
    </FullSheet>
  </div>
</template>

<script setup lang="ts">
// Filters of the Stebėjimai topic (STEB-SPEC §3.3): Laikotarpis, Rūšis, Faktas, Vieta.
// Desktop: chips with popovers (the hub's generic ChipPopover); phones: "Laikotarpis" and
// "Filtrai (n)" chips opening full-screen sheets. Every change applies at once.
import { computed, getCurrentInstance, inject, nextTick, ref } from 'vue';
import { useWindowSize } from '@vueuse/core';
import ChipPopover from '@/components/hunting/hub/topics/vilkai/ChipPopover.vue';
import FullSheet from '@/components/hunting/hub/shell/FullSheet.vue';
import { STEB_CTX } from '@/composables/hunting/hub/stebejimai/useStebState';
import { DESKTOP_MIN } from '@/utils/hunting/hub/layout';
import { periodChipLabel } from '@/utils/hunting/hub/stebejimai/model';
import { SS } from '@/utils/hunting/hub/stebejimai/strings';
import StebPeriod from './StebPeriod.vue';

defineProps({
  mobile: { type: Boolean, default: false },
});

const ctx = inject(STEB_CTX)!;
const uid = `steb-filters-${getCurrentInstance()?.uid ?? 0}`;
const { width } = useWindowSize();
// Tablets: the chips show the value only, so four chips fit next to the view switch.
const compact = computed(() => width.value < DESKTOP_MIN);

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';
const rowClass = 'flex min-h-[32px] cursor-pointer items-center gap-3 text-sm text-gray-900';
const rowClassLarge = 'flex min-h-[44px] cursor-pointer items-center gap-3 text-base text-gray-900';
const radioClass = `h-4 w-4 shrink-0 accent-gray-900 ${focusRing}`;
const selectClass = `block h-9 w-full rounded-md border border-gray-400 bg-white px-2 text-sm text-gray-900 ${focusRing}`;
const mobileChip = `inline-flex h-11 items-center gap-1 rounded-full border border-gray-900 bg-white px-4 text-base font-medium text-gray-900 ${focusRing}`;

const periodChip = computed(() => periodChipLabel(ctx.state.period.value, ctx.today));
const optionLabel = (list: { key: string; label: string }[], key: string | null, all: string) =>
  key === null ? all : list.find((o) => o.key === key)?.label || key;
const speciesChip = computed(() =>
  optionLabel(ctx.derived.speciesOptions.value, ctx.state.gyvunas.value, SS.allSpecies),
);
const factChip = computed(() =>
  optionLabel(ctx.derived.factOptions.value, ctx.state.faktas.value, SS.allFacts),
);
const placeChip = computed(() => {
  const sav = ctx.state.sav.value;
  return sav === null ? SS.allPlaces : ctx.meta.nameOf(sav) || `${sav}`;
});
// The place filter needs the municipality list of the hub meta.
const placeAvailable = computed(() => ctx.meta.status.value === 'ready');
const placeValue = computed(() =>
  ctx.state.sav.value === null ? '' : String(ctx.state.sav.value),
);

function onPlace(value: string) {
  ctx.state.setPlace(value && /^\d+$/.test(value) ? Number(value) : null);
}

// ---- Phone sheets: focus goes back to the chip that opened them.
const periodOpen = ref(false);
const filtersOpen = ref(false);
const periodTrigger = ref<HTMLButtonElement | null>(null);
const filtersTrigger = ref<HTMLButtonElement | null>(null);
function closeSheet(which: 'period' | 'filters') {
  if (which === 'period') periodOpen.value = false;
  else filtersOpen.value = false;
  nextTick(() => (which === 'period' ? periodTrigger : filtersTrigger).value?.focus());
}
</script>
