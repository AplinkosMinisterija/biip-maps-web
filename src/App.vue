<template>
  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <Suspense @resolve="onSuspenseResolve">
        <component :is="Component" />
      </Suspense>
      <UiToasts />
    </template>
    <template v-if="!isLoaded">
      <div id="mapLoader" class="h-screen w-screen absolute top-0 left-0 z-50">
        <div class="bg-gray-200 opacity-50 h-full w-full absolute" />
        <div class="flex items-center justify-center flex-col gap-2 h-full w-full">
          <UiLoader type="spinner" />
        </div>
      </div>
    </template>
  </RouterView>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { canvasToImage, projection3857 } from "@/utils";
const events: any = inject("events");
const mapLayers: any = inject("mapLayers");

const isLoadedSuspense = ref(false);
const isLoadedMap = ref(false);
const isLoaded = computed(() => isLoadedSuspense.value && isLoadedMap.value);
const $route = useRoute();
const $router = useRouter();

const onSuspenseResolve = () => {
  isLoadedSuspense.value = true;
  events.setLoading(false);
};

mapLayers.waitForLoaded.then(() => {
  isLoadedMap.value = true;
});

$router.isReady().then(() => {
  if ($route?.query?.x && $route?.query?.y) {
    mapLayers.zoomToCoordinate($route.query.x, $route.query.y, {
      defaultToMapProjection: true,
      zoom: $route.query.z,
    });
  }
});

watch(
  isLoaded,
  (value) => {
    if (!value || !$route?.query?.screenshot) return;
    canvasToImage();
  },
  { immediate: true }
);
</script>
