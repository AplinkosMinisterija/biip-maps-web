<template>
  <div v-if="!dismissed" class="text-sm">
    <UiAlert type="warning" class="!items-start gap-2 !font-normal">
      <UiIcon name="warning" :size="18" class="shrink-0 mt-0.5" aria-hidden="true" />
      <p class="flex-1">
        Prototipas bandomojoje aplinkoje: dalis duomenų bandomieji, skaičiai dar tikrinami.
        <a
          href="/hunting/public"
          class="underline font-semibold max-md:inline-flex max-md:items-center max-md:min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 rounded"
        >
          Atidaryti dabartinį žemėlapį
        </a>
      </p>
      <button
        v-if="dismissible"
        type="button"
        class="shrink-0 -m-2 w-11 h-11 flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        aria-label="Uždaryti pranešimą apie prototipą"
        @click="dismiss"
      >
        <UiIcon name="close" :size="18" aria-hidden="true" />
      </button>
    </UiAlert>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// On mobile the banner can be dismissed for the session (§7.3).
defineProps({
  dismissible: { type: Boolean, default: false },
});

const STORAGE_KEY = 'hunting-wolves:banner-dismissed';

const readDismissed = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch (err) {
    return false;
  }
};

const dismissed = ref(readDismissed());

const dismiss = () => {
  dismissed.value = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch (err) {
    // Storage blocked: the banner stays hidden until the page is reloaded.
  }
};
</script>
