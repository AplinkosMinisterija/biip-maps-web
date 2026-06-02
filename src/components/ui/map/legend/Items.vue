<template>
  <!--
    inline=true (screenshot legend) uses CSS multi-column flow so blocks
    fill columns top-down then wrap left-to-right. Sorted upstream so
    grouped items (parent + children — "Ežerai ir tvenkiniai", "Upės ir
    kanalai") sit in the first columns and single-symbol items pack into
    a tidy trailing column. break-inside: avoid keeps each parent glued
    to its children. inline=false keeps the original nested vertical
    list for the sidebar.
  -->
  <div
    :class="inline ? 'columns-2 sm:columns-3 lg:columns-4' : 'flex flex-col gap-1'"
    :style="inline ? { columnGap: '1.5rem' } : undefined"
  >
    <div
      v-for="(data, index) in items"
      :key="index"
      :class="inline ? 'mb-3' : ''"
      :style="inline ? { breakInside: 'avoid' } : undefined"
    >
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
