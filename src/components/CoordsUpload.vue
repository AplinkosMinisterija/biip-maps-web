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
            <p class="text-sm text-gray-600">
              Įkelkite geografinių duomenų failą (.shp arba .geojson)
            </p>
            <UiInputFile
              :accept="Object.values(fileTypes).join(',')"
              @upload="onFilesUpload"
            />
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
          </template>
        </div>
      </template>
    </UiTabs>

    <template #footer>
      <UiButton type="success" @click="upload">Įkelti</UiButton>
    </template>
  </UiModal>
</template>

<script lang="ts" setup>
import { ref, computed, inject } from "vue";
import {
  isCoordinate,
  parseGeomFromString,
  projection4326,
  readGeojsonFromFile,
  readShapefileFromFile,
} from "@/utils";
const coordinatesInput = ref("");

const mapLayers: any = inject("mapLayers");
const uploadModalRef = ref();
const validObjects = ref([] as any);
const selectedItemType = ref("");

const mapDraw = computed(() => mapLayers.getDraw());

const fileTypes = {
  json: "application/json",
  zip: "application/zip",
};

const geomTranslates: any = {
  LineString: "Linija",
  Point: "Taškas",
  Polygon: "Plotas",
};

const tabs = [
  { type: "file", name: "Įkelti failą" },
  { type: "input", name: "Įklijuoti koordinates" },
];

defineExpose({ modal: uploadModalRef });

function onFilesUpload(files: File[]) {
  const file = files?.[0];
  if (!file) return;

  if (file.type === fileTypes.json) {
    readGeojsonFromFile(file).then((data) => {
      // console.log(data);
      mapLayers.zoomToFeatureCollection(data, {
        dataProjection: projection4326,
      });
      mapDraw.value.setFeatures(data, {
        dataProjection: projection4326,
      });
    });
  } else if (file.type === fileTypes.zip) {
    readShapefileFromFile(file);
  }
}

function validateCoordinates() {
  isCoordinate(coordinatesInput.value, true);
  validObjects.value = parseGeomFromString(coordinatesInput.value) || [];
  selectedItemType.value = validObjects.value?.[0]?.type || "";
}

function upload() {
  if (selectedItemType?.value && validObjects.value?.length) {
    const selectedObject = validObjects.value.find(
      (i: any) => i.type === selectedItemType.value
    );

    if (!selectedObject) return;
  }
}
</script>
