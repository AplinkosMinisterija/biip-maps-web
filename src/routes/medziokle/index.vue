<template>
  <div>
    <UiMap
      :projection="projection3857"
      :show-scale-line="true"
      :mark-center="!!query.draw"
      :constrain-resolution="false"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, inject } from "vue";
import { useRoute } from "vue-router";
import { parse, GeometryType } from "geojsonjs";
import {
  geoportalOrto,
  parseRouteParams,
  convertCoordinatesToProjection,
  projection3857,
  vectorPositron,
  vectorBright,
  huntingServiceVT,
  projection4326,
  convertFeatureCollectionProjection,
  projection,
} from "@/utils";
import { getMpvBbox } from "@/utils/requests/medziokle";

const mapLayers: any = inject("mapLayers");
const events: any = inject("events");
const postMessage: any = inject("postMessage");
const $route = useRoute();

const query = parseRouteParams($route.query, ["mpvId", "draw", "zoom", "points"]);

const colors: any = {
  current: "#004650",
  other: "#A5B9C0",
};

function zoomToCoordinate(data: any) {
  const coordinates = convertCoordinatesToProjection(
    [data.x, data.y],
    projection4326,
    projection4326
  );

  mapLayers.zoomToCoordinate(...coordinates);
}

let zoomFn: any;

if (query.zoom) {
  zoomFn = () => {
    zoomToCoordinate(query.zoom);
  };
}

await mapLayers
  .addBaseLayer(vectorBright.id)
  .addBaseLayer(vectorPositron.id)
  .addBaseLayer(geoportalOrto.id)
  .add(huntingServiceVT.id);

const mapDraw = computed(() => mapLayers.getDraw());

function parsePoints(data: any[]) {
  const featureCollection = parse(
    data.map((item) => ({
      type: GeometryType.POINT,
      coordinates: convertCoordinatesToProjection(
        [item.x, item.y],
        projection4326,
        projection3857
      ),
      properties: {
        color: colors[item.type] || colors.current,
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
    if (features) {
      features = convertFeatureCollectionProjection(features, projection3857, projection);
    }
    postMessage("data", features);
  });

if (query.points) {
  parsePoints(query.points);
}

if (query.mpvId) {
  mapLayers.setActiveFeatures(huntingServiceVT.id, query.mpvId);

  if (zoomFn) {
    zoomFn();
  } else {
    const geojson = await getMpvBbox({ query: JSON.stringify({ mpvId: query.mpvId }) });
    mapLayers.zoomToFeatureCollection(geojson, { dataProjection: projection });
  }
}
</script>
