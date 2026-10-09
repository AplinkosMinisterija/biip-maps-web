<template>
  <p v-if="!dismissed" class="flex items-center gap-1 text-xs text-gray-700">
    <span>
      {{ S.prototypeLine
      }}<template v-if="FEEDBACK_URL">
        ·
        <a
          :href="FEEDBACK_URL"
          target="_blank"
          rel="noopener"
          class="font-semibold text-blue-800 underline rounded"
          :class="[focusRing, dismissible ? 'inline-flex items-center min-h-[44px]' : '']"
        >
          {{ S.prototypeFeedback }}<span class="sr-only"> (atidaroma naujame lange)</span>
        </a>
      </template>
    </span>
    <button
      v-if="dismissible"
      type="button"
      class="ml-auto shrink-0 w-11 h-11 flex items-center justify-center rounded text-gray-700 hover:bg-gray-100"
      :class="focusRing"
      aria-label="Uždaryti pranešimą apie prototipą"
      @click="dismiss"
    >
      <UiIcon name="close" :size="16" aria-hidden="true" />
    </button>
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FEEDBACK_URL, S } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';

// "Bandomoji versija · Pastabos apie prototipą" (§5). On mobile it appears once in the sheet
// and can be dismissed; the dismissal is remembered in localStorage (§4.3).
const props = defineProps({
  dismissible: { type: Boolean, default: false },
});

const STORAGE_KEY = 'hunting-hub:prototype-dismissed';

const read = () => {
  if (!props.dismissible) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch (err) {
    return false;
  }
};

const dismissed = ref(read());

const dismiss = () => {
  dismissed.value = true;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch (err) {
    // Storage blocked: hidden until the page is reloaded.
  }
};
</script>
