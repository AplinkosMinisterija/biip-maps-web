<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-search="true"
      @search="filtersStore.search = $event"
    >
    </UiMap>

    <FeaturesPopupClickMulti>
      <template #title="{ current }">
        <template v-if="current?.name">
          <div class="flex gap-1 mb-1">
            <div class="text-xxxs text-gray-600">
              {{ moment(current.start_at).format("YYYY-MM-DD") }}
            </div>
            <span class="text-gray-500">·</span>
            <UiBadge type="success">{{ current?.app_name }}</UiBadge>
          </div>
          <div>{{ current.name }}</div>
        </template>
      </template>
      <template #content="{ current }">
        <div v-if="current?.body" class="text-xxs mt-2 text-gray-700">
          <VueMarkdown :source="current.body" />
        </div>
      </template>
    </FeaturesPopupClickMulti>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import { projection3857, vectorBright, smalsuolisServiceVT } from "@/utils";
import { useFiltersStore } from "@/stores/filters";
import VueMarkdown from "vue-markdown-render";
import moment from "moment";
const filtersStore = useFiltersStore();

const mapLayers: any = inject("mapLayers");

mapLayers.addBaseLayer(vectorBright.id).add(smalsuolisServiceVT.id);
</script>
