<template>
  <!--
    inline=true (screenshot legend): each grouped item (parent + children
    like "Ežerai ir tvenkiniai", "Upės ir kanalai") becomes its own
    vertical column at the front; single-symbol items pack into a
    compact multi-column block at the end. Both kinds share the same
    horizontal gap so the row reads as one tidy strip.

    inline=false (sidebar) keeps the original nested vertical list.
  -->
  <div v-if="inline" class="flex flex-row flex-wrap items-start gap-x-6 gap-y-3">
    <div v-for="(data, index) in groupedItems" :key="`g-${index}`">
      <UiMapLegendItem
        :title="data.title"
        :icon="data.icon"
        :children="data.children"
        :inline="true"
      />
    </div>
    <div
      v-if="singleItems.length"
      class="columns-2 sm:columns-3"
      :style="{ columnGap: '1.5rem' }"
    >
      <div
        v-for="(data, index) in singleItems"
        :key="`s-${index}`"
        class="mb-1"
        :style="{ breakInside: 'avoid' }"
      >
        <UiMapLegendItem :title="data.title" :icon="data.icon" :inline="true" />
      </div>
    </div>
  </div>
  <div v-else class="flex flex-col gap-1">
    <div v-for="(data, index) in items" :key="index">
      <UiMapLegendItem
        :title="data.title"
        :icon="data.icon"
        :children="data.children"
        :inline="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  items: {
    type: Array<any>,
    default: [],
  },
  inline: {
    type: Boolean,
    default: false,
  },
});

const groupedItems = computed(() =>
  (props.items || []).filter((i: any) => i?.children?.length),
);
const singleItems = computed(() =>
  (props.items || []).filter((i: any) => !i?.children?.length),
);
</script>
