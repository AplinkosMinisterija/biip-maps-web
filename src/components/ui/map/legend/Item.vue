<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <!--
        16x16 slot is enough to hold every WMS legend symbol the layer
        emits (filled circle, open circle, triangle, line, square fill)
        without distorting them, and is small enough that the variation
        between symbol shapes doesn't read as inconsistent left padding.
        Skip the slot entirely for grouped parents that come back from
        WMS without an icon, so e.g. "Ežerai ir tvenkiniai:" sits flush
        with "Upės ir kanalai:" instead of getting pushed 24px right by
        an empty placeholder.
      -->
      <span
        v-if="icon || !children?.length"
        class="inline-flex h-4 w-4 shrink-0 items-center justify-start"
      >
        <img
          v-if="icon"
          :src="`data:image/png;base64,${icon}`"
          class="max-h-full max-w-full object-contain"
        />
      </span>
      <div v-if="title">{{ title }}{{ children?.length ? ':' : '' }}</div>
    </div>
    <div v-if="children?.length" class="pl-4">
      <UiMapLegendItems :items="children" :inline="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  children: {
    type: Array<any>,
    default: [],
  },
  inline: {
    type: Boolean,
    default: false,
  },
});
</script>
