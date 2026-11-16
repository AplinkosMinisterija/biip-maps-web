<template>
  <div class="flex justify-between items-center">
    <span class="text-sm font-semibold">Filtrai</span>
    <UiButton type="link" @click="clearFilters"> Valyti filtrus </UiButton>
  </div>
  <UiButtonRow>
    <UiButton
      v-for="k in kingdoms"
      :key="k.id"
      :icon="k.icon"
      :icon-top="true"
      type="white"
      :active="filters.has('kingdomId', k.id)"
      @click="filters.toggleOrReplace('kingdomId', k.id)"
    >
      {{ k.name }}
    </UiButton>
  </UiButtonRow>
  <RusysFiltersSpecies :value="species" @change="setSpecies" />
  <RusysFiltersPeriod :from="period.from" :to="period.to" class="mt-2" @change="setPeriod" />
</template>

<script setup lang="ts">
import { rusysService } from '@/utils';
import { computed, inject, ref } from 'vue';
const mapLayers: any = inject('mapLayers');

const PLACE_LAYERS = ['radavietes', 'radavietes_invazines', 'radavietes_svetimzemes'];
const FORM_LAYERS = [
  'stebejimai_interpretuojami',
  'stebejimai_tyrineta_nerasta_invazines',
  'stebejimai_tyrineta_nerasta_svetimzemes',
];

const rusysServiceFilters = mapLayers.filters(rusysService.id);
const filters = computed(() => rusysServiceFilters.onAll([...PLACE_LAYERS, ...FORM_LAYERS]));

const kingdoms = [
  { id: 1, name: 'Augalai', icon: 'plants' },
  { id: 2, name: 'Grybai', icon: 'mushrooms' },
  { id: 3, name: 'Gyvūnai', icon: 'animals' },
];

const species = computed(() => filters.value.get('speciesId')?.$in || []);

function setSpecies(speciesIds: number[]) {
  if (!speciesIds.length) {
    filters.value.remove('speciesId');
  } else {
    filters.value.toggleOrReplace('speciesId', { $in: speciesIds });
  }
}

const shiftDay = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const placeFilter = rusysServiceFilters.on(PLACE_LAYERS[0]);
const storedEnd = placeFilter.get('firstObservedAt')?.$lt;
const period = ref({
  from: placeFilter.get('lastObservedAt')?.$gte || '',
  to: storedEnd ? shiftDay(storedEnd, -1) : '',
});

// A place spans every observation it holds, so it stays on the map while that span meets the
// period; a single observation stays when it was made within the period. The end date is
// inclusive, hence the next day as an exclusive bound.
function setPeriod({ from, to }: { from: string; to: string }) {
  period.value = { from, to };
  const end = to ? shiftDay(to, 1) : '';

  PLACE_LAYERS.forEach((layer) => {
    const filter = rusysServiceFilters.on(layer);
    from ? filter.set('lastObservedAt', { $gte: from }) : filter.remove('lastObservedAt');
    end ? filter.set('firstObservedAt', { $lt: end }) : filter.remove('firstObservedAt');
  });

  FORM_LAYERS.forEach((layer) => {
    const filter = rusysServiceFilters.on(layer);
    const range = { ...(from && { $gte: from }), ...(end && { $lt: end }) };
    Object.keys(range).length ? filter.set('observedAt', range) : filter.remove('observedAt');
  });
}

function clearFilters() {
  filters.value.clear();
  setPeriod({ from: '', to: '' });
}
</script>
