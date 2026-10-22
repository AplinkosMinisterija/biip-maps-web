<template>
  <div v-if="phase === 'slow'" role="status" class="flex flex-col gap-3">
    <div class="grid grid-cols-3 gap-2" aria-hidden="true">
      <span
        v-for="i in 3"
        :key="i"
        class="h-16 rounded-md bg-gray-100 animate-pulse motion-reduce:animate-none"
      />
    </div>
    <p class="text-sm text-ink-muted">{{ S.loading }}</p>
  </div>
  <div v-else-if="phase === 'loading'" role="status" class="sr-only">{{ S.loading }}</div>
  <div
    v-else-if="phase === 'error'"
    role="alert"
    class="flex flex-col items-start gap-3 rounded-lg border border-[#B42318] bg-[#FEF3F2] p-3"
  >
    <p class="text-sm font-semibold text-[#7A271A]">{{ S.loadError }}</p>
    <!-- The site's primary button ("Prisijungti"). -->
    <button type="button" :class="[BTN_PRIMARY, large ? BTN_TOUCH : '']" @click="ctx.data.reload()">
      {{ S.retry }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { BTN_PRIMARY, BTN_TOUCH } from './controls';

// Loading (skeleton only after 400 ms), and the load error with retry (§5): never a
// partial number.
const props = defineProps({
  large: { type: Boolean, default: false },
  // Data arrived but the view could not be built: shown like a load error.
  failed: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX)!;
const phase = computed(() => (props.failed ? 'error' : ctx.data.phase.value));
</script>
