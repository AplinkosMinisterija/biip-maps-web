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
    <!-- Title row: what, where and when (the region's name); standalone also "Uždaryti". -->
    <div
      class="flex items-start justify-between gap-3"
      :class="mode === 'sheet' ? 'pb-2' : 'px-4 pt-4 pb-2'"
    >
      <h2
        :id="`${uid}-title`"
        class="font-bold text-ink"
        :class="mode === 'sheet' ? 'text-[15px] leading-5' : 'text-base leading-[22px]'"
      >
        {{ active ? captionOf(active) : S.viewTable }}
      </h2>
      <!-- Embedded, the WP page's view switch closes the table (Esc still does). -->
      <button
        v-if="mode !== 'sheet' && !ctx.embed"
        type="button"
        :class="[BTN_TEXT, 'shrink-0 text-ink']"
        :aria-controls="HUB_TABLE_ID"
        :aria-expanded="true"
        @click="close"
      >
        <UiIcon name="close" :size="16" aria-hidden="true" />
        {{ S.close }}
      </button>
    </div>

    <!-- Sub-tabs left, the table's action right (clear of the site's accessibility button in
         the bottom-right corner); on phones the button wraps above the cards. -->
    <div
      class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
      :class="mode === 'sheet' ? '' : 'px-4'"
    >
      <HuntingHubTableTableTabs
        ref="tabsRef"
        :tables="tables"
        :active="active?.id || ''"
        :id-prefix="uid"
        @select="selectTab"
      />
      <!-- Element-rooted: Vue 3.5.29 mis-patches a v-if'd async component that is still
           loading (insertBefore error, vuejs/core#15551). -->
      <div v-if="active" class="contents">
        <HuntingHubTableCsvButton
          :table="active"
          :caption="captionOf(active)"
          :sort="sortOf(active)"
        />
      </div>
    </div>

    <div class="flex-1 min-h-0" :class="mode === 'sheet' ? 'py-3' : 'flex flex-col px-4 py-3'">
      <div
        v-for="table in tables"
        :id="`${uid}-panel-${table.id}`"
        :key="table.id"
        role="tabpanel"
        :aria-labelledby="`${uid}-tab-${table.id}`"
        :hidden="active?.id !== table.id"
        tabindex="0"
        :class="[
          FOCUS_RING,
          'rounded',
          mode === 'sheet' || active?.id !== table.id ? '' : 'flex-1 min-h-0 flex flex-col',
        ]"
      >
        <template v-if="active?.id === table.id">
          <p v-if="table.disabled" class="text-sm text-ink-muted">{{ table.disabled }}</p>
          <HuntingHubTableCardList
            v-else-if="useCards"
            :sort="sortOf(table)"
            :table="table"
            :caption="captionOf(table)"
            :selected-sav="ctx.sel.value.sav"
            @update:sort="(next: SortState | null) => (sorts[table.id] = next)"
            @show-on-map="showOnMap"
          />
          <HuntingHubTableDataTable
            v-else
            :sort="sortOf(table)"
            :fill="mode !== 'sheet'"
            :table="table"
            :caption="captionOf(table)"
            :selected-sav="ctx.sel.value.sav"
            @update:sort="(next: SortState | null) => (sorts[table.id] = next)"
            @show-on-map="showOnMap"
          />
        </template>
      </div>
    </div>

    <!-- Standalone only: embedded, the WP header line carries the provenance (D9). -->
    <div
      v-if="!ctx.embed"
      class="border-t border-line-soft"
      :class="mode === 'sheet' ? 'pt-3' : 'px-4 py-3'"
    >
      <p class="text-xs text-ink-muted" :title="provenanceTitle">
        {{ view.provenance.text }} ·
        <button
          type="button"
          :class="[INLINE_LINK, 'min-h-[24px] rounded font-normal max-md:min-h-[44px]']"
          @click="ctx.openAbout()"
        >
          {{ S.provenanceLink }}
        </button>
      </p>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, watch, type PropType } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { HUB_CTX } from '@/composables/hunting/hub/context';
import { seasonLabel } from '@/utils/hunting/dates';
import { embedFocusAllowed } from '@/utils/hunting/hub/embed';
import { HUB_DRAWER_W, HUB_GAP, HUB_TOP } from '@/utils/hunting/hub/layout';
import { S } from '@/utils/hunting/hub/strings';
import type { TableDef } from '@/utils/hunting/hub/types';
import { BTN_TEXT, FOCUS_RING, INLINE_LINK } from '../shell/controls';
import { effectiveSort, type SortState } from './sort';

// Tables of the active snapshot topic (SPEC2 §4.1 "Table mode"):
// - ≥ 1280 px: right drawer (560 px) next to the panel rail; the map stays;
// - 768–1279 px: replaces the map, full width right of the panel (the shell hides the map);
// - < 768 px: `variant="sheet"` inside the mobile sheet's "Lentelė" segment (card list).
// Embedded in the WP page (SPEC §4), the table replaces the map from 768 px, without a drawer.
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
  return ctx.isWide.value && !ctx.embed ? 'drawer' : 'replace';
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

// Sort per table id; the table's default (or its own order) until the visitor picks one.
// Reset per topic. The CSV follows the same order.
const sorts = ref<Record<string, SortState | null>>({});
const sortOf = (table: TableDef) => effectiveSort(table, sorts.value[table.id]);
watch(
  () => ctx.sel.value.topic,
  () => (sorts.value = {}),
);

const placeName = computed(() => {
  const sav = ctx.sel.value.sav;
  if (sav === null) return S.placeAll;
  return ctx.data.snapshot.value?.meta.municipalities.find((m) => m.code === sav)?.name || '';
});
// Heading and <caption>: the topic's title (what, where, when), else tab label + season +
// place (§10).
const captionOf = (table: TableDef) =>
  table.title ||
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

// "Rodyti žemėlapyje": select the municipality; below 1280 px (embedded: always) the table
// gives way to the map.
function showOnMap(code: number) {
  if (ctx.embed) {
    // Close first: setSav's immediate URL write then carries both changes. A close scheduled
    // after that write is dropped when the write lands, and the URL would keep `lentele`.
    ctx.setTable(null);
    ctx.setSav(code);
    return;
  }
  ctx.setSav(code);
  if (!ctx.isWide.value) ctx.setTable(null);
}

// Move focus into the drawer / replaced view when it opens, so keyboard users land on the tabs.
// Embedded, only while the iframe document has focus and without scrolling the page (§5.8).
function focusActiveTab() {
  if (!ctx.embed) return tabsRef.value?.focusActive();
  const id = active.value?.id;
  if (!id || !embedFocusAllowed(true)) return;
  document.getElementById(`${uid.value}-tab-${id}`)?.focus({ preventScroll: true });
}
watch(
  () => visible.value && props.variant !== 'sheet',
  (open, wasOpen) => {
    if (!open || wasOpen || !embedFocusAllowed(ctx.embed)) return;
    nextTick(focusActiveTab);
  },
);
</script>
