<template>
  <UiModal
    ref="uploadModalRef"
    title="Įkelti failą arba pridėti koordinates"
    :show-close-btn="false"
    size="sm"
  >
    <UiTabs v-if="tabs.length" :tabs="tabs" :active="tabs[0].type">
      <template #default="{ activeTab }">
        <div class="flex flex-col gap-2">
          <template v-if="activeTab === 'file'">
            <UiInputFile
              :accept="Object.values(fileTypes).flat()"
              description="Įkelkite geografinių duomenų failą (.zip archyvai, kuriuose yra Shapefile failai (.shp, .shx, .dbf ir kt.) arba .geojson)"
              @upload="(files: any) => (file = files?.[0])"
            />
            <div v-if="fileTypes.json.includes(file?.type)" class="text-sm text-gray-600">
              <UiLabel>Įkeliamų duomenų projekcija:</UiLabel>
              <UiInputRadio v-model="fileDataProjection" :value="projection">
                LKS
              </UiInputRadio>
              <UiInputRadio v-model="fileDataProjection" :value="projection4326">
                WGS84
              </UiInputRadio>
            </div>
          </template>
          <template v-else-if="activeTab === 'input'">
            <p class="text-sm text-gray-600">
              Įklijuokite turimas koordinates. Jei keliamos linijos ar poligono
              koordinatės jos turi būti atskirtos kableliu ir gali būti apgaubtos
              laužtiniais skliaustais. Galite įkelti tiek WGS tiek LKS koordinates.
            </p>
            <UiInputTextarea
              v-model="coordinatesInput"
              placeholder="517245 6110211"
              @change="validateCoordinates"
            ></UiInputTextarea>

            <div v-if="validObjects?.length > 1" class="text-sm text-gray-600">
              <template v-for="item in validObjects" :key="item.type">
                <UiInputRadio v-model="selectedItemType" :value="item.type">
                  {{ geomTranslates[item.type] }}
                </UiInputRadio>
              </template>
            </div>

            <div class="text-xs text-gray-600">
              <div>Koordinaračių įvedimo pavyzdžiai:</div>
              <div>Taškas: 517245 6110211 arba [517245 6110211]</div>
              <div>
                Linija: 531285 6106928, 531283 6106928, 531285 6106928 arba [531285
                6106928], [531283 6106928], [531285 6106928]
              </div>
              <div>
                Plotas: 479772 6120489,481666 6120499,481521 6118923,479853 6119028,479772
                6120489
              </div>
            </div>
            <UiAlert
              v-if="coordinatesInput?.length && !validObjects?.length"
              type="warning"
            >
              Pateiktame kode yra klaidų. Prašome patikrinti.
            </UiAlert>
          </template>
        </div>
      </template>
    </UiTabs>

    <template #footer>
      <UiButton type="success" :loading="uploadLoading" @click="upload">Įkelti</UiButton>
    </template>
  </UiModal>
</template>

<script lang="ts" setup>
import { ref, computed, inject } from "vue";
import {
  isCoordinate,
  parseGeomFromString,
  projection4326,
  projection,
  readGeojsonFromFile,
  readShapefileFromFile,
  GEOJSON_FILE_FORMATS,
  SHAPEFILE_FILE_FORMATS,
} from "@/utils";
const coordinatesInput = ref("");

const mapLayers: any = inject("mapLayers");
const uploadModalRef = ref();
const validObjects = ref([] as any);
const selectedItemType = ref("");
const file = ref({} as any);
const fileDataProjection = ref(projection);
const uploadLoading = ref(false);

const mapDraw = computed(() => mapLayers.getDraw());

const fileTypes = {
  json: GEOJSON_FILE_FORMATS,
  zip: SHAPEFILE_FILE_FORMATS,
};

const geomTranslates: any = {
  LineString: "Linija",
  Point: "Taškas",
  Polygon: "Plotas",
};

const tabs = [
  { type: "file", name: "Įkelti failą", icon: "document" },
  { type: "input", name: "Įklijuoti koordinates", icon: "curved-line" },
];

defineExpose({ modal: uploadModalRef });

function validateCoordinates() {
  isCoordinate(coordinatesInput.value, true);
  validObjects.value = parseGeomFromString(coordinatesInput.value) || [];
  selectedItemType.value = validObjects.value?.[0]?.type || "";
}

async function upload() {
  uploadLoading.value = true;
  let geojson: any;
  let dataProjection = projection;

  if (selectedItemType?.value && validObjects.value?.length) {
    const selectedObject = validObjects.value.find(
      (i: any) => i.type === selectedItemType.value
    );

    if (!selectedObject) return;

    geojson = selectedObject.geom;
  } else if (file?.value?.type) {
    dataProjection = fileDataProjection.value;
    if (fileTypes.json.includes(file.value.type)) {
      geojson = await readGeojsonFromFile(file.value);
    } else if (fileTypes.zip.includes(file.value.type)) {
      geojson = await readShapefileFromFile(file.value);
      dataProjection = projection4326;
    }
  }

  if (geojson) {
    mapLayers.zoomToFeatureCollection(geojson, { dataProjection });
    mapDraw.value.setFeatures(geojson, { dataProjection });
  }

  uploadLoading.value = false;
  file.value = {};
  uploadModalRef?.value?.close?.();
}
</script>
