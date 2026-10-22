<template>
  <!-- Floating left panel (desktop/tablet), as tall as its content (D18), or the 56 px rail
       while a table is open at ≥ 1280 px (D14). -->
  <section
    id="hub-panel"
    ref="panelEl"
    role="main"
    :aria-labelledby="headingId"
    class="hub-panel absolute bg-white rounded-lg shadow-lg"
    :class="[
      collapsed ? 'hub-panel--rail overflow-hidden' : 'overflow-y-auto overscroll-contain',
      // Expanded from the rail it opens over the table pane.
      railed && !collapsed ? 'z-[32]' : 'z-30',
      !collapsed && more ? MORE_BELOW_MASK : '',
    ]"
  >
    <HuntingHubShellPanelRail
      v-if="collapsed"
      :title="railTitle"
      :value="railValue"
      @expand="expand"
    />
    <div
      v-show="!collapsed"
      :ref="(node) => track(node as HTMLElement | null)"
      class="relative overflow-hidden p-4"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { MORE_BELOW_MASK, useMoreBelow } from './useMoreBelow';

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

const panelEl = ref<HTMLElement | null>(null);
const { more, track } = useMoreBelow(panelEl);

async function expand() {
  expanded.value = true;
  await nextTick();
  document.getElementById(props.headingId)?.focus();
}
</script>

<style scoped>
/* Left edge on the site grid when embedded (--hub-panel-left = the gutter, decision D3); as
   tall as the content, up to the bottom of the frame (D18). */
.hub-panel {
  left: var(--hub-panel-left, var(--hub-gap));
  top: calc(var(--hub-top) + var(--hub-gap));
  bottom: auto;
  max-height: calc(100% - var(--hub-top) - 2 * var(--hub-gap));
  width: var(--hub-panel-w);
}
.hub-panel--rail {
  width: var(--hub-rail-w);
}
</style>
