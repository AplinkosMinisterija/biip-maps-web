<template>
  <div>
    <UiMap :show-scale-line="true" :show-search="true" @search="filtersStore.search = $event">
      <template v-if="filtersStore.active" #filtersContent>
        <Search
          v-if="filtersStore.isActive('search')"
          :value="filtersStore.search"
          :types="['uetk']"
          @select="filtersStore.hide()"
        />
      </template>
    </UiMap>
  </div>
</template>
<script setup lang="ts">
import { inject, computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  zuvinimasService,
  uetkService,
  parseRouteParams,
  objectPropsToCamel,
} from '@/utils';
import { useFiltersStore } from '@/stores/filters';

const postMessage: any = inject('postMessage');
const mapLayers: any = inject('mapLayers');
const $route = useRoute();

const filtersStore = useFiltersStore();

const query = parseRouteParams($route.query, [
  'id',
  'createdBy',
  'tenantId',
  'userId',
  'stockingCustomer',
]);

const zuvinimasServiceFilters = mapLayers.filters(zuvinimasService.id);
const filters = computed(() => zuvinimasServiceFilters.on('fish_stockings'));

if (query.tenantId) {
  filters.value.set('$or', [
    { tenant_id: query.tenantId },
    { stocking_customer_id: query.tenantId },
  ]);
}

if (query.userId) {
  filters.value.set('created_by', query.userId).set('tenant_id', { $exists: false });
}

mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(uetkService.id)
  .add(zuvinimasService.id)
  .click(async ({ coordinate }: any) => {
    mapLayers.getFeatureInfo(zuvinimasService.id, coordinate, ({ properties }: any) => {
      postMessage('click', objectPropsToCamel(properties));
    });
  });

if (query.userId || query.tenantId) {
  await mapLayers.zoomNew(zuvinimasService.id);
}
</script>
