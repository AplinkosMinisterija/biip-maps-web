<template>
  <div v-if="total > 1" class="flex items-center gap-2 text-gray-500 justify-end">
    <div class="flex items-center">
      <slot name="previous" :current="current" :total="total">
        <UiIcon
          v-if="current > 1"
          name="chevron-left"
          class="cursor-pointer m-1"
          @click="emit('change', current - 1)"
        />
      </slot>

      <slot name="default" :current="current" :total="total">
        <span class="text-xxs">
          {{ current }} iš {{ total }}{{ maxLessThanTotal ? "+" : "" }}
        </span>
      </slot>

      <slot name="next" :current="current" :total="total">
        <UiIcon
          v-if="current < total"
          name="chevron-right"
          class="cursor-pointer m-1"
          @click="emit('change', current + 1)"
        />
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps({
  current: {
    type: Number,
    default: 1,
  },
  total: {
    type: Number,
    default: 1,
  },
  max: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["change"]);

const maxLessThanTotal = computed(() => {
  return props.max && props.max < props.total;
});

const total = computed(() => {
  if (maxLessThanTotal.value) return props.max;
  return props.total;
});
</script>
