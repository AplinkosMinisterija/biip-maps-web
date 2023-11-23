<template>
  <div>
    <UiMap :show-scale-line="true" :mark-center="!!query.draw" />
  </div>
</template>
<script setup lang="ts">
import { computed, inject } from "vue";
import { useRoute } from "vue-router";
import { parse, GeometryType } from "geojsonjs";
import {
  geoportalTopo,
  geoportalOrto,
  geoportalTopoGray,
  huntingService,
  parseRouteParams,
  convertCoordinatesToProjection,
} from "@/utils";

const mapLayers: any = inject("mapLayers");
const events: any = inject("events");
const postMessage: any = inject("postMessage");
const $route = useRoute();

const query = parseRouteParams($route.query, ["mpvId", "draw", "zoom", "points"]);
const huntingServiceFilters = mapLayers.filters(huntingService.id);

if (query.mpvId) {
  huntingServiceFilters.on("mpv_info_geom").set("mpv_id", query.mpvId);
}

const colors: any = {
  current: "#004650",
  other: "#A5B9C0",
};

function zoomToCoordinate(data: any) {
  const coordinates = convertCoordinatesToProjection([data.x, data.y]);
  mapLayers.zoomToCoordinate(...coordinates);
}

let zoomFn: any;

if (query.zoom) {
  zoomFn = () => {
    zoomToCoordinate(query.zoom);
  };
}

await mapLayers
  .addBaseLayer(geoportalTopoGray.id)
  .addBaseLayer(geoportalTopo.id)
  .addBaseLayer(geoportalOrto.id)
  .add(huntingService.id)
  .zoomNew(huntingService.id, { addStroke: true, zoomFn });

const mapDraw = computed(() => mapLayers.getDraw());

function parsePoints(data: any[]) {
  const featureCollection = parse(
    data.map((item) => ({
      type: GeometryType.POINT,
      coordinates: convertCoordinatesToProjection([item.x, item.y]),
      properties: {
        color: colors[item.type] || colors.current,
        radius: 5,
        ...item,
      },
    }))
  );

  mapDraw.value.setFeatures(featureCollection).edit();
}

events.on("points", parsePoints).on("zoom", zoomToCoordinate);

mapDraw.value
  .enableSelect()
  .enablePan(!!query.draw)
  .on("select", ({ feature }: any) => {
    postMessage("selected", feature);
  })
  .on("change", ({ features }: any) => {
    postMessage("data", features);
  });

if (query.points) {
  parsePoints(query.points);
}
</script>
