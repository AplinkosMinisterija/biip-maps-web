<template>
  <p v-if="shown && !dismissed" class="flex items-center gap-1 text-xs text-ink-muted">
    <span>
      {{ S.prototypeLine
      }}<template v-if="FEEDBACK_URL">
        ·
        <a
          :href="FEEDBACK_URL"
          target="_blank"
          rel="noopener"
          class="font-semibold text-brand underline rounded"
          :class="[focusRing, dismissible ? 'inline-flex items-center min-h-[44px]' : '']"
        >
          {{ S.prototypeFeedback }}<span class="sr-only"> (atidaroma naujame lange)</span>
        </a>
      </template>
    </span>
    <button
      v-if="dismissible"
      type="button"
      class="ml-auto shrink-0 w-11 h-11 flex items-center justify-center rounded text-ink-muted hover:bg-brand-50"
      :class="focusRing"
      :aria-label="S.prototypeClose"
      @click="dismiss"
    >
      <UiIcon name="close" :size="16" aria-hidden="true" />
    </button>
  </p>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { FEEDBACK_URL, S } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';

// "Bandomoji aplinka · Pastabos apie puslapį" (§5). On mobile it appears once in the sheet
// and can be dismissed; the dismissal is remembered in localStorage (§4.3). Only in the
// standalone app off production: embedded, the WP header line carries the staging marker
// (and nothing of it may reach a production host).
const props = defineProps({
  dismissible: { type: Boolean, default: false },
});

const ctx = inject(HUB_CTX, null);
const shown = !!ctx && !ctx.isProductionHost && !ctx.embed;

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
