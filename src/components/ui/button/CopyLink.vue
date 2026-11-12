<template>
  <UiButton type="white" size="icon-sm" icon="link-chain" :title="title" @click="copy" />
</template>

<script setup lang="ts">
import { inject } from 'vue';

const props = defineProps({
  url: { type: String, required: true },
  title: { type: String, default: 'Kopijuoti objekto nuorodą' },
  message: { type: String, default: 'Objekto nuoroda nukopijuota' },
});

const eventBus: any = inject('eventBus');

async function copy() {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(props.url);
    eventBus.emit('uiToast', { type: 'success', title: props.message });
  } catch (err) {
    eventBus.emit('uiToast', {
      type: 'danger',
      title: 'Nepavyko nukopijuoti nuorodos',
    });
  }
}
</script>
