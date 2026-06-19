<template>
  <!--
    inline=true (screenshot legend): every item flows top-to-bottom into
    one 3-column CSS columns block so the browser auto-balances the
    list (e.g. 11 items → 4-4-3). The parent decides the order via
    legendOrder; this component just respects it.

    inline=false (sidebar) keeps the original nested vertical list.
  -->
  <div v-if="inline" class="columns-3" :style="{ columnGap: '1.5rem' }">
    <div
      v-for="(data, index) in items"
      :key="index"
      class="mb-1"
      :style="{ breakInside: 'avoid' }"
    >
      <UiMapLegendItem
        :title="data.title"
        :icon="data.icon"
        :children="data.children"
        :inline="true"
      />
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
defineProps({
  items: {
    type: Array<any>,
    default: [],
  },
  inline: {
    type: Boolean,
    default: false,
  },
});
</script>
