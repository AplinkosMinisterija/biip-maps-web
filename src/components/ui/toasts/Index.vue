<template>
  <div v-if="toasts.length" class="fixed right-0 bottom-0 z-[100] p-3 max-w-xs w-full">
    <div class="flex flex-col gap-2 w-full transition">
      <UiToastsItem
        v-for="toast in toasts"
        :key="toast"
        :type="toast.type"
        :title="toast.title"
        :description="toast.description"
        :expires-in="toast.expiresIn"
        @close="remove(toast)"
      ></UiToastsItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue';
const eventBus: any = inject('eventBus');

const toasts = ref([] as any);

function remove(toast: any) {
  const index = toasts.value.indexOf(toast);
  toasts.value.splice(index, 1);
}

eventBus.on('uiToast', (data: any) => {
  toasts.value.push(data);
});
</script>
