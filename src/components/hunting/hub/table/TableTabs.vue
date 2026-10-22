<template>
  <div role="tablist" aria-label="Lentelės" class="flex min-w-0 gap-1 overflow-x-auto p-0.5">
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
      :class="[
        PILL_TAB,
        'whitespace-nowrap max-md:h-11',
        active === tab.id ? PILL_TAB_ON : '',
        tab.disabled && active !== tab.id ? 'text-ink-muted' : '',
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
import { PILL_TAB, PILL_TAB_ON } from '../shell/controls';

// Tabs of the hub tables (WAI-ARIA tabs: arrows, Home/End), as pill tabs: the WP topic tabs
// above are the only underline tabs of the page (D1). A disabled table stays reachable so
// its reason (`TableDef.disabled`) can be read in the panel.
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
