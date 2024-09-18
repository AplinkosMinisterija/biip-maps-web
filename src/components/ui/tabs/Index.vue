<template>
  <div>
    <div class="overflow-x-auto sticky">
      <div
        v-if="!hideOnOne || (hideOnOne && tabs.length > 1)"
        class="flex text-xs gap-2 border-b-2 bg-opacity-50 border-gray-200 w-full mb-3"
      >
        <slot name="header" :tabs="tabs" :active="activeTab">
          <div
            v-for="t in tabs"
            :key="t.type"
            :class="[activeTab === t.type ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-600']"
            class="flex gap-1 cursor-pointer px-2 py-2 border-b-2 -mb-[1px] font-semibold"
            @click="activeTab = t.type"
          >
            <UiIcon v-if="t.icon" :name="t.icon" class="mr-1" />
            <span>{{ t.name }}</span>
            <span v-if="t.count">({{ t.count }})</span>
          </div>
        </slot>
      </div>
    </div>
    <div>
      <slot :active-tab="activeTab" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  tabs: {
    type: Array<any>,
    default: [],
  },
  active: { type: String, default: '' },
  hideOnOne: {
    type: Boolean,
    default: false,
  },
});

const activeTab = ref(props.active);
</script>
