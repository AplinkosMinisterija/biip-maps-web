<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-search="true"
      @search="filtersStore.search = $event"
    >
      <template #sidebar>
        <UiSidebarFeatures
          :features="selectedFeatures"
          :is-open="!!selectedFeatures?.length"
          :title="selectedFeatures?.[0]?.munipality?.name"
          type="zvejyba"
          @close="selectFeatures"
        />
      </template>

      <template v-if="filtersStore.active" #filtersContent>
        <Search
          v-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :types="['uetk']"
          @select="filtersStore.hide()"
        />
      </template>
    </UiMap>

    <FeaturesPopupHover @click="selectFeatures">
      <template #title="{ data }">
        <div class="flex gap-2 items-start">
          <span>
            {{ data?.location?.name || '' }} ({{ data?.location?.municipality?.name || '' }})
          </span>
        </div>
      </template>
      <template #content="{ data }">
        <div class="flex flex-col gap-2 items-start mt-2">
          <div class="text-xxs">
            {{ moment(data?.event_time).format('YYYY-MM-DD HH:mm') }}
          </div>

          <UiBadge v-if="byStatus[data?.status]?.text" :type="byStatus[data?.status]?.badge">
            {{ byStatus[data?.status]?.text }}
          </UiBadge>

          <template v-if="data?.fishes?.length">
            <div
              v-for="fish in data?.fishes"
              :key="fish.id"
              class="text-xs flex justify-between text-gray-600 w-full"
            >
              <div>{{ fish.fish_type?.label }}</div>
              <div class="font-semibold">{{ fish?.count || 0 }} vnt.</div>
            </div>
          </template>
        </div>
      </template>
    </FeaturesPopupHover>
  </div>
</template>
<script setup lang="ts">
import { inject, ref } from 'vue';
import {
  projection3857,
  zuvinimasServiceVT,
  vectorGRPKPositron,
  vectorGRPKBright,
} from '@/utils';
import moment from 'moment';
import { useFiltersStore } from '@/stores/filters';

const filtersStore = useFiltersStore();

const byStatus: any = {
  UPCOMING: {
    text: 'Planuojamas',
    badge: '',
  },
  ONGOING: {
    text: 'Įžuvinama',
    badge: 'success',
  },
};

const mapLayers: any = inject('mapLayers');
const events: any = inject('events');

const selectedFeatures = ref([] as any);

function selectFeatures(feature: any) {
  if (!feature?.count) {
    selectedFeatures.value = [];
  } else {
    selectedFeatures.value = [feature];
  }
}

events.on('zoom', (data: any) => {
  mapLayers.zoomToFeatureCollection(data);
});

mapLayers
  .addBaseLayer(vectorGRPKBright.id)
  .addBaseLayer(vectorGRPKPositron.id)
  .add(zuvinimasServiceVT.id);
</script>
