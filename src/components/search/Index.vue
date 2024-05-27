<template>
  <div v-for="item in matchCoordinates" v-if="!!matchCoordinates.length" :key="item.id">
    <SearchBox :name="item.name" :description="item.description" @click="zoomToMatch(item)">
      <template v-if="item.content">
        {{ item.content }}
      </template>
    </SearchBox>
  </div>
  <UiTabs v-else-if="tabs.length" :tabs="tabs" :active="tabs[0].type" :hide-on-one="true">
    <template #default="{ activeTab }">
      <UiLoader v-if="matchesByType[activeTab]?.loading" />
      <div v-else-if="!matchesByType[activeTab]?.rows?.length" class="text-sm my-2">
        Pagal pateiktą užklausą rezultatų nerasta
      </div>
      <SearchBox
        v-for="m in matchesByType[activeTab]?.rows"
        v-else
        :key="m.id"
        :name="m.name"
        :description="m.description"
        @click="zoomToMatch(m)"
      />
    </template>
  </UiTabs>
  <div v-else class="text-sm my-2">
    Pagal pateiktą užklausą
    <span class="font-semibold">"{{ value }}"</span>
    rezultatų nerasta
  </div>
</template>

<script setup lang="ts">
import SearchBox from '@/components/search/Box.vue';
import type { SearchResult, SearchResults } from '@/types';
import { computed, inject, ref, watch } from 'vue';

import {
  GEOM_TYPES,
  isCoordinate,
  parseGeomFromString,
  searchGeoportal,
  searchRusys,
  searchUETK,
} from '@/utils';

const props = defineProps({
  searchCoordinates: {
    type: Boolean,
    default: true,
  },
  searchPoint: {
    type: Boolean,
    default: true,
  },
  searchLine: {
    type: Boolean,
    default: false,
  },
  searchPolygon: {
    type: Boolean,
    default: false,
  },
  types: {
    type: Array<string>,
    default: [],
  },
  additionalGeoportalLayers: {
    type: Array<{
      type: string;
      weight: number;
    }>,
    default: [],
  },
  addStroke: {
    type: Boolean,
    default: false,
  },
  value: {
    type: String,
    default: '',
  },
  geoportalLayers: {
    type: Array<{
      type: string;
      weight: number;
    }>,
    default: [
      { type: 'apskritis' },
      { type: 'savivaldybė' },
      { type: 'gyvenvietė' },
      { type: 'miesto dalis' },
      { type: 'gatvė', weight: 1.2 },
      { type: 'adresas', weight: 0.8 },
    ],
  },
});

const matchCoordinates = ref([] as SearchResult[]);
const matchesByType = ref({} as { [key: string]: SearchResults });

const mapLayers: any = inject('mapLayers');
const search = computed(() => props.value);

const emit = defineEmits(['select']);
let searchTimeout: any;

const applySearch = () => {
  const multiSearch = !!props.searchLine || !!props.searchPolygon;
  if (props.searchCoordinates && isCoordinate(search.value, multiSearch)) {
    const results = parseGeomFromString(search.value);

    const translates: any = {
      LineString: 'Linija',
      Point: 'Taškas',
      Polygon: 'Plotas',
    };

    if (!multiSearch) {
      translates.Point = 'Koordinatės';
    }

    matchCoordinates.value = results
      .filter(
        (item) =>
          (item.type === 'Point' && props.searchPoint) ||
          (item.type === 'LineString' && props.searchLine) ||
          (item.type === 'Polygon' && props.searchPolygon),
      )
      .map((item, index) => ({
        id: index + 1,
        x: item.center[0],
        y: item.center[1],
        name: translates[item.type],
        content: item.content || '',
        description: item.properties?.area || item.properties?.distance || search.value,
        geometry: item.geometry,
        geom: item.geom,
        cleanOnSelect: true,
        extent: item.extent,
      }));

    return;
  } else {
    matchCoordinates.value = [];
  }

  tabs.value.map((t) => {
    matchesByType.value[t.type] = matchesByType.value[t.type] || {};
    matchesByType.value[t.type].loading = true;
    t.searchFn?.(search.value).then((data) => {
      matchesByType.value[t.type] = data;
      matchesByType.value[t.type].loading = false;
    });
  });
};

const searchGeoportalData = (value: string) => {
  const filters: any[] = [...props.geoportalLayers];
  if (props.additionalGeoportalLayers?.length) {
    filters.push(...props.additionalGeoportalLayers);
  }

  const geomTypes: GEOM_TYPES[] = [];

  if (!props.searchPoint) {
    !!props?.searchLine && geomTypes.push(GEOM_TYPES.LINE);
    !!props?.searchPolygon && geomTypes.push(GEOM_TYPES.POLYGON);
  }

  return searchGeoportal(value, filters, geomTypes);
};

const tabs = computed(() => {
  const allTabs = [
    {
      type: 'uetk',
      name: 'UETK',
      searchFn: searchUETK,
    },
    {
      type: 'rusys',
      name: 'Rūšys',
      searchFn: searchRusys,
    },
    {
      type: 'geoportal',
      name: 'Vietovardžiai',
      searchFn: searchGeoportalData,
    },
  ];

  return allTabs
    .filter((tab) => props.types.includes(tab.type))
    .map((tab) => {
      let count: number | string = matchesByType.value?.[tab.type]?.total || 0;
      if (count > 10) {
        count = '10+';
      }
      (tab as any).count = count;
      return tab;
    });
});

const zoomToMatch = (match: any) => {
  if (!match?.id) return;

  if (match.geom) {
    mapLayers.zoomToFeatureCollection(match.geom, !!props.addStroke);
  } else if (match.extent) {
    mapLayers.zoomToExtent(match.extent);
  } else if (match.x && match.y) {
    mapLayers.zoomToCoordinate(match.x, match.y);
  }

  emit('select', match);
};

watch(
  search,
  () => {
    clearTimeout(searchTimeout);
    const action = search.value?.length > 2 ? 'open' : 'close';

    if (action === 'close') return;
    searchTimeout = setTimeout(applySearch, 150);
  },
  {
    immediate: true,
  },
);
</script>
