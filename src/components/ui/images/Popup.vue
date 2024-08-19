<template>
  <div>
    <div
      v-if="isOpen"
      class="fixed w-screen h-screen top-0 left-0 z-50 flex items-center justify-center p-2 sm:py-12 sm:px-8"
    >
      <div
        class="fixed top-0 left-0 h-screen w-screen flex lg:items-center items-end justify-center z-50 bg-black bg-opacity-70"
        @click="close"
      />

      <div class="relative z-50 flex items-center select-none">
        <UiIcon
          name="chevron-left"
          class="text-white cursor-pointer"
          :size="40"
          @click="setIndex(-1)"
        />
        <img :src="images[currentImageIndex]" class="max-h-screen p-16" />

        <UiIcon
          name="chevron-right"
          class="text-white cursor-pointer"
          :size="40"
          @click="setIndex(1)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const props = defineProps({
  images: { type: Array<any>, default: () => [] },
});

const isOpen = ref(false);
const open = (index?: number) => {
  if (typeof index === 'number' ) {
    currentImageIndex.value = Number(index);
  }
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const currentImageIndex = ref(0);

function setIndex(add: number) {
  let result = currentImageIndex.value + add

  if (result >= props?.images?.length && add > 0) {
    result = result % props.images.length
  } else if (result < 0 && add < 0) {
    result = props.images.length + result;
  }

  currentImageIndex.value = result;

}

defineExpose({ close, open });
</script>
