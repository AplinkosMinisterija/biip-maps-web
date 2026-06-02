<template>
  <!--
    inline=true (screenshot legend) renders each top-level item as a
    vertical block (parent + indented children) and wraps blocks
    horizontally across the row, so the result matches the stakeholder's
    grouped layout: "Upės ir kanaliai:" / >100 km / 50-100 km / <50 km
    in one column, "Ežerai ir tvenkiniai:" in the next, single-symbol
    layers as their own narrow columns. inline=false keeps the original
    nested vertical list for the sidebar.
  -->
  <div :class="inline ? 'flex flex-row flex-wrap gap-x-6 gap-y-2 items-start' : 'flex flex-col gap-1'">
    <div v-for="(data, index) in items" :key="index">
      <UiMapLegendItem
        :title="data.title"
        :icon="data.icon"
        :children="data.children"
        :inline="inline"
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
