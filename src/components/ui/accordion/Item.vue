<template>
  <div class="border rounded p-2">
    <div class="flex justify-between items-center gap-2 cursor-pointer" @click="toggleItem">
      <div class="flex flex-col">
        <div class="flex gap-2 items-start">
          <span class="text-sm font-semibold" v-html="title" />
          <UiBadge v-if="badge">
            {{ badge }}
          </UiBadge>
        </div>
        <span class="text-xs text-gray-700" v-html="subtitle" />
        <span v-if="description" class="text-xxs text-gray-600" v-html="description" />
      </div>
      <UiIcon name="chevron-down" class="transition" :class="{ 'rotate-180': isOpen }" />
    </div>
    <div :class="{ hidden: !isOpen }" class="mt-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  badge: { type: String, default: '' },
  isOpen: { type: Boolean, default: false },
});

const isOpen = ref(props.isOpen || false);
const toggleItem = () => {
  isOpen.value = !isOpen.value;
};
</script>
