<template>
  <div
    role="tablist"
    aria-label="Lentelės"
    class="flex gap-1 border-b border-gray-200 overflow-x-auto"
  >
    <button
      v-for="tab in tables"
      :id="tabId(tab.id)"
      :key="tab.id"
      :ref="(el) => setTabRef(tab.id, el)"
      type="button"
      role="tab"
      :aria-selected="active === tab.id"
      :aria-controls="panelId(tab.id)"
      :tabindex="active === tab.id ? 0 : -1"
      :title="tab.disabled || undefined"
      class="min-h-[44px] md:min-h-[36px] whitespace-nowrap px-3 text-sm font-semibold border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      :class="[
        active === tab.id
          ? 'border-blue-700 text-blue-800'
          : 'border-transparent text-gray-600 hover:text-gray-900',
        tab.disabled ? 'italic' : '',
      ]"
      @click="select(tab.id)"
      @keydown="onKeydown"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, type PropType } from 'vue';
import type { TableDef } from '@/utils/hunting/hub/types';

// Tabs of the hub tables (WAI-ARIA tabs: arrows, Home/End). A disabled table stays
// reachable so its reason (`TableDef.disabled`) can be read in the panel.
const props = defineProps({
  tables: { type: Array as PropType<TableDef[]>, required: true },
  active: { type: String, required: true },
  idPrefix: { type: String, required: true },
});
const emit = defineEmits(['select']);

const tabId = (id: string) => `${props.idPrefix}-tab-${id}`;
const panelId = (id: string) => `${props.idPrefix}-panel-${id}`;

const tabRefs: Record<string, HTMLElement> = {};
function setTabRef(id: string, el: any) {
  if (el) tabRefs[id] = el as HTMLElement;
  else delete tabRefs[id];
}

function select(id: string, focus = false) {
  emit('select', id);
  if (focus) nextTick(() => tabRefs[id]?.focus());
}

function onKeydown(event: KeyboardEvent) {
  const ids = props.tables.map((t) => t.id);
  const index = ids.indexOf(props.active);
  let next: number | null = null;
  if (event.key === 'ArrowRight') next = (index + 1) % ids.length;
  else if (event.key === 'ArrowLeft') next = (index - 1 + ids.length) % ids.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = ids.length - 1;
  if (next === null) return;
  event.preventDefault();
  select(ids[next], true);
}

defineExpose({ focusActive: () => tabRefs[props.active]?.focus() });
</script>
