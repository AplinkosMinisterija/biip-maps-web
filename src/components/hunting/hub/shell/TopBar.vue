<template>
  <header
    class="absolute inset-x-0 top-0 z-40 flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4"
  >
    <p class="shrink-0 text-base font-semibold text-gray-900">{{ S.appTitle }}</p>
    <HuntingHubShellTopicTabs />
    <div class="flex shrink-0 gap-2">
      <button type="button" :class="headerButton" @click="share">
        <UiIcon name="link" :size="16" aria-hidden="true" />
        {{ S.share }}
      </button>
      <button type="button" :class="headerButton" aria-haspopup="dialog" @click="ctx.openAbout()">
        <UiIcon name="document" :size="16" aria-hidden="true" />
        {{ S.about }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { S } from '@/utils/hunting/hub/strings';
import { focusRing } from './shell';
import { useShare } from './useShare';

// Desktop/tablet top bar, 56 px (§4.1): title, topic tabs, Dalintis, Apie duomenis.
const ctx = inject(HUB_CTX)!;
const share = useShare();

const headerButton = `px-3 h-9 rounded-md border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-100 flex items-center gap-1 whitespace-nowrap ${focusRing}`;
</script>
