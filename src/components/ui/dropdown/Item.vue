<template>
  <option :value="value">
    <slot />
  </option>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
  value: { type: String, default: '' },
});

const value = computed(() => props.value);
</script>
