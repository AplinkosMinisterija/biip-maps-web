<template>
  <UiPopup v-if="layer.download || layer.layer">
    <template #action>
      <UiIcon name="dots-vertical" class="text-gray-400 flex-shrink-0 cursor-pointer" />
    </template>
    <div class="text-xs max-w-[10rem]">
      <UiPopupContentItem v-if="layer.download" icon="download" label="Atsisiųsti" />
      <UiPopupContentItem v-if="layer.layer" icon="visible" :label="`Ryškumas (${opacityValue * 100}%)`">
        <UiInputRange
          v-model="opacityValue"
          :min="0"
          :max="1"
          :step="0.1"
          @change="onChangeOpacity($event)"
        />
      </UiPopupContentItem>
      <template v-if="description?.length">
        <hr />
        <div class="text-xxxs text-gray-400 mt-2">
          <div v-for="d in description" :key="d" v-html="d"></div>
        </div>
      </template>
    </div>
  </UiPopup>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { merge } from "lodash";
const mapLayers: any = inject("mapLayers");
const props = defineProps({
  layer: {
    type: Object,
    required: true,
  },
});

const layer = computed(() => {
  if (!props.layer?.id) return props.layer;

  const realLayer = mapLayers.get(props.layer.id);

  if (!realLayer?.id) return props.layer;

  return merge(realLayer, props.layer, { name: props.layer.name || realLayer.title });
});

const description = computed(() => {
  const { description } = layer.value;
  if (!description) return [];
  else if (!Array.isArray(description)) return [description];
  return description || [];
});

const opacityValue = ref(0);

mapLayers.onChange(layer.value.id, "opacity", ({ value }: any) => {
  opacityValue.value = value;
});

function onChangeOpacity(value: number) {
  layer.value.layer?.setOpacity(value);
}
</script>
