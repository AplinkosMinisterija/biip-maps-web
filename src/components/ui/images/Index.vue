<template>
  <div class="flex gap-3 flex-wrap">
    <div v-for="(p, index) in images" :key="p">
      <img :src="p" class="h-20 cursor-pointer" @click="imagesPopupRef?.open?.(index)" />
    </div>
    <UiImagesPopup ref="imagesPopupRef" :images="images"></UiImagesPopup>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
defineProps({
  images: {
    type: Array<any>,
    default: () => [],
  },
});

const imagesPopupRef = ref()
</script>
