<template>
  <component
    :is="mode === 'drawer' ? 'aside' : 'section'"
    v-if="visible && view && tables.length"
    :id="mode === 'sheet' ? undefined : HUB_TABLE_ID"
    :aria-labelledby="`${uid}-title`"
    :class="containerClass"
    :style="containerStyle"
    @keydown.esc="mode !== 'sheet' && close()"
  >
    <div
      class="flex items-center justify-between gap-2"
      :class="mode === 'sheet' ? 'pb-2' : 'px-4 pt-4 pb-2'"
    >
      <h2 :id="`${uid}-title`" :class="mode === 'sheet' ? 'sr-only' : 'text-base font-semibold'">
        {{ S.viewTable }}
      </h2>
      <button
        v-if="mode !== 'sheet'"
        type="button"
        class="inline-flex items-center gap-1 min-h-[32px] rounded px-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :aria-controls="HUB_TABLE_ID"
        :aria-expanded="true"
        @click="close"
      >
        <UiIcon name="close" :size="16" aria-hidden="true" />
        {{ S.close }}
      </button>
    </div>

    <HuntingHubTableTableTabs
      ref="tabsRef"
      :class="mode === 'sheet' ? '' : 'px-4'"
      :tables="tables"
      :active="active?.id || ''"
      :id-prefix="uid"
      @select="selectTab"
    />

    <div class="flex-1 min-h-0" :class="mode === 'sheet' ? 'py-3' : 'flex flex-col px-4 py-3'">
      <div
        v-for="table in tables"
        :id="`${uid}-panel-${table.id}`"
        :key="table.id"
        role="tabpanel"
        :aria-labelledby="`${uid}-tab-${table.id}`"
        :hidden="active?.id !== table.id"
        tabindex="0"
        class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded"
        :class="mode === 'sheet' || active?.id !== table.id ? '' : 'flex-1 min-h-0 flex flex-col'"
      >
        <template v-if="active?.id === table.id">
          <p v-if="table.disabled" class="text-sm text-gray-700">{{ table.disabled }}</p>
          <HuntingHubTableCardList
            v-else-if="useCards"
            v-model:sort="sorts[table.id]"
            :table="table"
            :caption="captionOf(table)"
            :selected-sav="ctx.sel.value.sav"
            @show-on-map="showOnMap"
          />
          <HuntingHubTableDataTable
            v-else
            v-model:sort="sorts[table.id]"
            :fill="mode !== 'sheet'"
            :table="table"
            :caption="captionOf(table)"
            :selected-sav="ctx.sel.value.sav"
            @show-on-map="showOnMap"
          />
        </template>
      </div>
    </div>

    <div
      class="border-t border-gray-200 flex flex-wrap items-center justify-between gap-2"
      :class="mode === 'sheet' ? 'pt-3' : 'px-4 py-3'"
    >
      <p class="text-xs text-gray-600" :title="provenanceTitle">
        {{ view.provenance.text }} ·
        <button
          type="button"
          class="min-h-[24px] max-md:min-h-[44px] rounded text-blue-800 underline underline-offset-2 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          @click="ctx.openAbout()"
        >
          {{ S.provenanceLink }}
        </button>
      </p>
      <HuntingHubTableCsvButton
        v-if="active"
        :table="active"
        :caption="captionOf(active)"
        :sort="sorts[active.id] ?? null"
      />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, watch, type PropType } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { seasonLabel } from '@/utils/hunting/dates';
import { HUB_DRAWER_W, HUB_GAP, HUB_TOP } from '@/utils/hunting/hub/layout';
import { S } from '@/utils/hunting/hub/strings';
import type { TableDef } from '@/utils/hunting/hub/types';
import type { SortState } from './sort';

// Tables of the active snapshot topic (SPEC2 §4.1 "Table mode"):
// - ≥ 1280 px: right drawer (560 px) next to the panel rail; the map stays;
// - 768–1279 px: replaces the map, full width right of the panel (the shell hides the map);
// - < 768 px: `variant="sheet"` inside the mobile sheet's "Lentelė" segment (card list).
// With `variant="auto"` the component positions itself and shows only while `sel.table`
// is set; the "Lentelė" toggle should use `aria-controls="hunting-hub-table"`.
const HUB_TABLE_ID = 'hunting-hub-table';

const props = defineProps({
  variant: { type: String as PropType<'auto' | 'sheet'>, default: 'auto' },
});
const emit = defineEmits(['close']);

const ctx = inject(HUB_CTX)!;
const narrow = useMediaQuery('(max-width: 599px)');

const view = computed(() => ctx.view.value);
const tables = computed<TableDef[]>(() => view.value?.tables || []);

const mode = computed<'drawer' | 'replace' | 'sheet'>(() => {
  if (props.variant === 'sheet') return 'sheet';
  return ctx.isWide.value ? 'drawer' : 'replace';
});
const visible = computed(() => {
  if (props.variant === 'sheet') return true;
  return !ctx.isMobile.value && ctx.sel.value.table !== null;
});
const useCards = computed(() => mode.value === 'sheet' && narrow.value);
const uid = computed(() => `hub-table-${mode.value}`);

const active = computed<TableDef | null>(() => {
  const list = tables.value;
  if (!list.length) return null;
  const wanted = ctx.sel.value.table || ctx.topic.value.defaultTable;
  return list.find((t) => t.id === wanted) || list[0];
});

// Sort per table id; the topics' own order until a header is clicked. Reset per topic.
const sorts = ref<Record<string, SortState | null>>({});
watch(
  () => ctx.sel.value.topic,
  () => (sorts.value = {}),
);

const placeName = computed(() => {
  const sav = ctx.sel.value.sav;
  if (sav === null) return S.placeAll;
  return ctx.data.snapshot.value?.meta.municipalities.find((m) => m.code === sav)?.name || '';
});
// <caption> = tab label + season + place (§10).
const captionOf = (table: TableDef) =>
  [table.label, `${seasonLabel(ctx.sel.value.season)} sezonas`, placeName.value]
    .filter(Boolean)
    .join(' · ');

const provenanceTitle = computed(() => {
  const p = view.value?.provenance;
  return p?.kind === 'snapshot' ? S.provenanceSnapshotTitle(p.asOf) : undefined;
});

const containerClass = computed(() => {
  if (mode.value === 'sheet') return 'flex flex-col';
  const base = 'absolute right-0 bottom-0 z-30 bg-white flex flex-col';
  return mode.value === 'drawer' ? `${base} shadow-lg max-w-full` : base;
});
// Geometry from the shell's CSS variables (layout.ts), with the same numbers as fallbacks.
const containerStyle = computed(() => {
  if (mode.value === 'sheet') return undefined;
  const top = `var(--hub-top, ${HUB_TOP}px)`;
  if (mode.value === 'drawer') return { top, width: `var(--hub-drawer-w, ${HUB_DRAWER_W}px)` };
  return {
    top,
    left: `calc(var(--hub-panel-w, 320px) + 2 * var(--hub-gap, ${HUB_GAP}px))`,
  };
});

const tabsRef = ref<{ focusActive(): void } | null>(null);

function selectTab(id: string) {
  ctx.setTable(id);
}

function close() {
  ctx.setTable(null);
  emit('close');
}

// "Rodyti žemėlapyje": select the municipality; below 1280 px the table gives way to the map.
function showOnMap(code: number) {
  ctx.setSav(code);
  if (!ctx.isWide.value) ctx.setTable(null);
}

// Move focus into the drawer / replaced view when it opens, so keyboard users land on the tabs.
watch(
  () => visible.value && props.variant !== 'sheet',
  (open, wasOpen) => {
    if (open && !wasOpen) nextTick(() => tabsRef.value?.focusActive());
  },
);
</script>
