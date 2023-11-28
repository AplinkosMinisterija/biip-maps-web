<template>
  <div>
    <UiMap
      :show-scale-line="true"
      :projection="projection3857"
      :show-coordinates="true"
    />

    <FeaturesPopupHover>
      <template #title="{ data }"> {{ statusTranslates[data.status] }} žvejyba </template>
      <template #content="{ data }">
        <div class="text-gray-500">
          <div
            v-if="['STARTED', 'FINISHED'].includes(data.status)"
            class="flex items-start gap-2"
          >
            <UiIcon name="clock" />
            <div>
              <div class="text-xs font-semibold">{{ getDuration(data) }}</div>
              <div class="text-xxs">
                {{ moment(data.started_at).format(format) }}
                <template v-if="data.status === 'FINISHED'">
                  - {{ moment(data.ended_at).format(format) }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </FeaturesPopupHover>
  </div>
</template>
<script setup lang="ts">
import { inject } from "vue";
import moment from "moment";
import { fishingsServiceVT, projection3857, geoportalTopo3857 } from "@/utils";

const format = "YYYY-MM-DD HH:mm";
const statusTranslates: any = {
  FINISHED: "Pasibaigusi",
  STARTED: "Prasidėjusi",
  SKIPPED: "Praleista",
};
const mapLayers: any = inject("mapLayers");

mapLayers.addBaseLayer(geoportalTopo3857.id).add(fishingsServiceVT.id);

function getDuration(data: any) {
  if (!data.started_at) return "";

  if (!data.ended_at) return "Vyksta dabar";

  const start = moment(data.started_at);
  const end = moment(data.ended_at);

  const durationMinutes = end.diff(start, "minutes");

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${hours ? `${hours} val. ` : " "}${minutes} min.`;
}
</script>
