<template>
  <div>
    <div
      v-map="{
        showZoom: showZoom && !isPreview,
        showAttribution: showAttribution && (!isPreview || attributionOptions),
        attributionOptions,
        showScaleLine,
        showCoordinates: showCoordinates && !isPreview,
        projection,
        constrainResolution,
        addCoordinatesToUrl,
      }"
    />
    <div
      v-if="markCenter"
      class="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    >
      <UiIcon name="target" :size="24" />
    </div>

    <div
      class="absolute left-0 z-10 ml-2 mb-2 bottom-0 flex flex-col items-start gap-2 pointer-events-none"
    >
      <div
        id="mapControlsLB"
        class="text-xxs text-gray-700 flex flex-col gap-2 items-start"
      />

      <UiDropdown
        v-if="mapLayers.baseLayers?.length > 1 && !isPreview"
        v-model="mapLayers.visibleBaseLayerId"
        class="px-1 rounded border border-gray-400 bg-white pointer-events-auto"
      >
        <UiDropdownItem v-for="l in mapLayers.baseLayers" :key="l.id" :value="`${l.id}`">
          {{ l.title }}
        </UiDropdownItem>
      </UiDropdown>

      <slot v-if="!isPreview" name="leftBottom" />
    </div>
    <div
      class="absolute left-0 p-2 top-0 flex flex-col gap-2 items-start right-0 xs:right-auto z-20 max-h-screen justify-start pointer-events-none"
    >
      <div v-if="$slots.leftTop && !isPreview" class="pointer-events-auto">
        <slot name="leftTop" />
      </div>
      <div
        v-if="($slots.filters || showSearch) && !isPreview"
        class="flex flex-col xs:flex-row gap-3 w-full flex-wrap items-strech pointer-events-auto"
      >
        <div v-if="showSearch" class="w-72 max-w-full pb-2">
          <UiInput
            v-model="search"
            :icon="search ? 'close' : 'search'"
            :hide-border="true"
            class="shadow-md h-9"
            placeholder="Paieška"
            @change="$emit('search', $event)"
            @focus="search.length > 3 && $emit('search', search)"
            @click-icon="clearSearch()"
          />
        </div>
        <div
          v-if="!isPreview"
          class="flex gap-3 items-stretch overflow-x-auto max-w-full pb-2"
        >
          <slot name="filters" />
        </div>
      </div>
      <div
        v-if="$slots.filtersContent && (!isPreview || filtersStore.active)"
        class="bg-white rounded shadow md:max-w-md max-w-full overflow-y-auto h-full relative mb-10 pointer-events-auto"
      >
        <div class="relative h-full w-full">
          <div
            v-if="showResults"
            class="sticky top-0 bg-white p-3 border-b border-gray-200 text-sm font-semibold flex justify-between items-center gap-3"
          >
            <div>Rezultatai</div>
            <UiIcon name="close" class="cursor-pointer" @click="clearSearch()" />
          </div>
          <div class="mx-3" :class="{ 'my-3': !showResults }">
            <slot name="filtersContent" />
          </div>
        </div>
      </div>
    </div>
    <div
      class="absolute left-auto right-0 z-10 mr-2 mt-2 top-0 flex flex-col gap-2 items-end"
    >
      <div id="mapControlsRT" class="text-gray-700 flex flex-col gap-2 items-end" />
      <slot v-if="!isPreview" name="rightTop" />
    </div>
    <div
      class="absolute left-auto right-0 z-10 mr-2 mb-2 top-auto bottom-0 flex flex-col gap-2 items-end sm:max-w-[80vw] xs:max-w-[65vw] max-w-[50vw]"
    >
      <UiButtonIcon
        v-if="isZoomToUserLocationEnabled && !isPreview"
        icon="current-location"
        size="icon-sm"
        class="w-7 h-7 mx-1"
        @click="zoomToUserLocation"
      />

      <UiButtonIcon
        v-if="showCenterMap && !isPreview"
        icon="globe"
        size="icon-sm"
        class="w-7 h-7 mx-1"
        @click="mapLayers.centerMap()"
      />

      <div id="mapControlsRB" class="text-gray-700 flex flex-col gap-2 items-end" />
      <slot v-if="!isPreview" name="rightBottom" />
    </div>
    <slot name="sidebar" />
    <UiMapRightClick />
  </div>
</template>

<script lang="ts" setup>
import { computed, inject, ref } from "vue";
import { useFiltersStore } from "@/stores/filters";

const mapLayers: any = inject("mapLayers");
const eventBus: any = inject("eventBus");
const search = ref("");

const filtersStore = useFiltersStore();

defineProps({
  showScaleLine: {
    type: Boolean,
    default: false,
  },
  isPreview: {
    type: Boolean,
    default: false,
  },
  showZoom: {
    type: Boolean,
    default: true,
  },
  showAttribution: {
    type: Boolean,
    default: true,
  },
  showCenterMap: {
    type: Boolean,
    default: true,
  },
  attributionOptions: {
    type: Object,
    default: () => {},
  },
  showCoordinates: {
    type: Boolean,
    default: false,
  },
  showSearch: {
    type: Boolean,
    default: false,
  },
  showResults: {
    type: Boolean,
    default: false,
  },
  markCenter: {
    type: Boolean,
    default: false,
  },
  projection: {
    type: String,
    default: "",
  },
  constrainResolution: {
    type: Boolean,
    default: true,
  },
  addCoordinatesToUrl: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["search"]);

const isZoomToUserLocationEnabled = computed(() => mapLayers.zoomToUserLocationEnabled);

const clearSearch = () => {
  search.value = "";
  emit("search", "");
};

function zoomToUserLocation() {
  const success = mapLayers.zoomToUserLocation();
  if (success) return;

  eventBus.emit("uiToast", {
    type: "danger",
    title: "Nėra galimybės nustatyti buvimo vietos",
    description: "Patikrinkite ar įgalinote naršyklę nustatyti jūsų buvimo vietą.",
  });
}
</script>

<style>
.ol-zoom button,
.ol-icon-button,
.ol-attribution button {
  @apply h-7 w-7 bg-white border-gray-200 border-solid border-0 border-b last:border-b-0 m-0 outline-none shadow-md text-gray-800 !important;
}

.ol-icon-button {
  @apply flex items-center justify-center mx-1 !important;
}

.ol-control {
  @apply bg-transparent !important;
}

.ol-mouse-position,
.ol-attribution,
.ol-zoom,
.ol-scale-line {
  @apply px-1 py-0.5 max-w-none !important;
  position: initial !important;
}

.ol-attribution ul {
  @apply bg-white p-1 rounded shadow mr-2 !important;
}
.ol-attribution ul:before {
  content: "Duomenų šaltiniai: ";
}

.ol-mouse-position,
.ol-scale-line {
  @apply bg-white rounded bg-opacity-90 !important;
}
</style>
