<template>
  <!-- Floating left panel (desktop/tablet), or the 56 px rail when the table drawer is open at
       ≥ 1280 px. Topic hosts that render their own panel (Vilkai) use it too. -->
  <section
    id="hub-panel"
    role="main"
    :aria-labelledby="headingId"
    class="hub-panel absolute z-30 bg-white rounded-lg shadow-lg"
    :class="collapsed ? 'hub-panel--rail overflow-hidden' : 'overflow-y-auto overscroll-contain'"
  >
    <HuntingHubShellPanelRail
      v-if="collapsed"
      :title="railTitle"
      :value="railValue"
      @expand="expand"
    />
    <div v-show="!collapsed" class="p-4">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps({
  railed: { type: Boolean, default: false },
  railTitle: { type: String, default: '' },
  railValue: { type: String, default: '' },
  headingId: { type: String, default: 'hub-title' },
});

// "Išskleisti skydelį" shows the panel over the map while the drawer stays open; the next
// time the table opens the panel collapses again.
const expanded = ref(false);
watch(
  () => props.railed,
  () => (expanded.value = false),
);
const collapsed = computed(() => props.railed && !expanded.value);

async function expand() {
  expanded.value = true;
  await nextTick();
  document.getElementById(props.headingId)?.focus();
}
</script>

<style scoped>
.hub-panel {
  left: var(--hub-gap);
  top: calc(var(--hub-top) + var(--hub-gap));
  bottom: var(--hub-gap);
  width: var(--hub-panel-w);
}
.hub-panel--rail {
  width: var(--hub-rail-w);
}
</style>
