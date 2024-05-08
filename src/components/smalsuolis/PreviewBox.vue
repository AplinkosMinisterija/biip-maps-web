<template>
  <div class="my-1">
    <UiLoader
      v-if="clusterItemsLoading || eventItemLoading || !pageItem?.id"
      type="table"
      class="w-64"
    />
    <div v-else>
      <div class="flex gap-1 mb-1 items-center">
        <div class="text-xxxs text-gray-600">
          {{ moment(pageItem.startAt).format("YYYY-MM-DD") }}
        </div>
        <span class="text-gray-500">·</span>
        <UiBadge type="success">
          {{ pageItem?.app?.name }}
        </UiBadge>
        <UiBadge
          v-if="
            item?.cluster && mapLayers.getZoomLevels.max > mapLayers.getZoomLevels.current
          "
          type="ghost"
          class="cursor-pointer"
          @click="preview()"
        >
          Peržiūrėti
        </UiBadge>
      </div>
      <div>{{ pageItem?.name }}</div>
      <div v-if="pageItem?.body" class="text-xxs mt-2 text-gray-700">
        <VueMarkdown :source="pageItem.body" />
      </div>

      <UiPagination
        v-if="item?.cluster"
        :total="clusterItems?.total"
        :max="pageSize"
        :current="currentPage"
        @change="currentPage = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFetch } from "@vueuse/core";
import { computed, inject, ref, watch } from "vue";
import moment from "moment";
import VueMarkdown from "vue-markdown-render";
import { getClusterItemsUrl, getEventUrl } from "@/utils/requests/smalsuolis";
const eventBus: any = inject("eventBus");

const mapLayers: any = inject("mapLayers");

const currentPage = ref(1);
const props = defineProps({
  item: {
    type: Object,
    default: () => ({}),
  },
  filters: {
    type: Object,
    default: null,
  },
});

const item = computed(() => props.item);

const pageItem = computed(() => {
  if (item?.value?.cluster) return clusterItems?.value?.rows[currentPage.value - 1];
  return eventItem.value;
});

const pageSize = 20;

const clusterItemsUrl = computed(() =>
  getClusterItemsUrl(item.value?.cluster_id, {
    populate: "app,geom",
    pageSize: pageSize,
    page: Math.floor(currentPage.value / pageSize) + 1,
    ...(props.filters?.toJson(true) || {}),
  })
);
const eventItemUrl = computed(() => getEventUrl(item.value?.id, { populate: "app" }));

const {
  data: clusterItems,
  isFetching: clusterItemsLoading,
  execute: loadClusterItems,
} = useFetch<any>(clusterItemsUrl, { immediate: false }).json();

const {
  data: eventItem,
  isFetching: eventItemLoading,
  execute: loadEventItem,
} = useFetch<any>(eventItemUrl, { immediate: false }).json();

watch(
  item,
  () => {
    currentPage.value = 1;
    if (item.value?.cluster) loadClusterItems();
    else loadEventItem();
  },
  { deep: true }
);

function preview() {
  if (!pageItem.value?.geom) return;
  mapLayers.zoomToFeatureCollection(pageItem.value?.geom, { animate: true });

  eventBus.emit("multiFeaturesPopupClose");
}
</script>
