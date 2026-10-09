<template>
  <component
    :is="variant === 'drawer' ? 'aside' : 'section'"
    v-if="variant === 'sheet' || state.tableOpen.value"
    :id="variant === 'drawer' ? DRAWER_ID : undefined"
    :aria-labelledby="`${uid}-title`"
    :class="
      variant === 'drawer'
        ? 'absolute right-0 top-0 h-full w-[calc(100%-24px)] max-w-[520px] lg:w-[520px] z-30 bg-white shadow-lg flex flex-col'
        : 'flex flex-col'
    "
    @keydown.esc="variant === 'drawer' && close()"
  >
    <div
      class="flex items-center justify-between gap-2"
      :class="variant === 'drawer' ? 'px-4 pt-4 pb-2' : 'pb-2'"
    >
      <h2
        :id="`${uid}-title`"
        :class="variant === 'drawer' ? 'text-base font-semibold' : 'sr-only'"
      >
        Lentelė
      </h2>
      <button
        v-if="variant === 'drawer'"
        type="button"
        class="inline-flex items-center gap-1 min-h-[32px] rounded px-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :aria-expanded="true"
        :aria-controls="DRAWER_ID"
        @click="close"
      >
        <UiIcon name="close" :size="16" aria-hidden="true" />
        Slėpti lentelę
      </button>
    </div>

    <div
      role="tablist"
      aria-label="Lentelės"
      class="flex gap-1 border-b border-gray-200 overflow-x-auto"
      :class="variant === 'drawer' ? 'px-4' : ''"
    >
      <button
        v-for="tab in tabs"
        :id="tabId(tab.id)"
        :key="tab.id"
        :ref="(el) => setTabRef(tab.id, el)"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="panelId(tab.id)"
        :tabindex="activeTab === tab.id ? 0 : -1"
        class="min-h-[44px] md:min-h-[36px] whitespace-nowrap px-3 text-sm font-semibold border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        :class="
          activeTab === tab.id
            ? 'border-blue-700 text-blue-800'
            : 'border-transparent text-gray-600 hover:text-gray-900'
        "
        @click="selectTab(tab.id)"
        @keydown="onTabKeydown"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      class="flex-1 min-h-0"
      :class="variant === 'drawer' ? 'overflow-y-auto px-4 py-3' : 'py-3'"
    >
      <div
        v-for="tab in tabs"
        :id="panelId(tab.id)"
        :key="tab.id"
        role="tabpanel"
        :aria-labelledby="tabId(tab.id)"
        :hidden="activeTab !== tab.id"
        tabindex="0"
        class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded"
      >
        <template v-if="activeTab === tab.id">
          <HuntingWolvesRecordsTable
            v-if="tab.id === 'irasai'"
            @show-on-map="(record: unknown) => emit('show-on-map', record)"
          />
          <HuntingWolvesSeasonMonthTable v-else-if="tab.id === 'sezonai'" />
          <p v-else-if="!municipalitiesReady" class="text-sm text-gray-700" role="status">
            Skaičiuojama…
          </p>
          <HuntingWolvesMunicipalityTable v-else />
        </template>
      </div>
    </div>

    <div
      class="border-t border-gray-200 flex justify-end"
      :class="variant === 'drawer' ? 'px-4 py-3' : 'pt-3'"
    >
      <HuntingWolvesCsvButton />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, watch } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { hasMunicipalities } from '@/utils/hunting/municipalities';

type TabId = 'irasai' | 'sezonai' | 'savivaldybes';

const props = defineProps({
  // 'drawer': desktop/tablet right drawer, shown while `state.tableOpen` is true.
  // 'sheet': inline content for the expanded MobileSheet (always rendered).
  variant: { type: String as () => 'drawer' | 'sheet', default: 'drawer' },
});
// 'show-on-map' (record: WolfRecord): the parent may collapse the mobile sheet.
const emit = defineEmits(['show-on-map']);

// The map toggle button ("Lentelė" / "Slėpti lentelę") should use
// `aria-controls="wolves-table-drawer"`.
const DRAWER_ID = 'wolves-table-drawer';

const ctx = inject(WOLVES_CTX)!;
const { state, data } = ctx;

const uid = computed(() => `wolves-table-${props.variant}`);
const tabId = (id: TabId) => `${uid.value}-tab-${id}`;
const panelId = (id: TabId) => `${uid.value}-panel-${id}`;

// P1 tab: shown from the start and hidden only if the attribution failed (§9). While the
// polygons load it shows a placeholder. The tab list must not change under the user:
// switching the active tab while an async table is still mounting broke the page
// (a `?lentele=savivaldybes` link fell back to `irasai`, then jumped back).
const municipalityStatus = computed(
  () =>
    data.municipalityStatus?.value ??
    (hasMunicipalities(data.dataset.value?.records || []) ? 'ready' : 'pending'),
);
const municipalitiesReady = computed(
  () =>
    municipalityStatus.value === 'ready' && hasMunicipalities(data.dataset.value?.records || []),
);
const tabs = computed(() => {
  const list: { id: TabId; label: string }[] = [
    { id: 'irasai', label: 'Įrašai' },
    { id: 'sezonai', label: 'Sezonai ir mėnesiai' },
  ];
  if (municipalityStatus.value !== 'failed') {
    list.push({ id: 'savivaldybes', label: 'Savivaldybės' });
  }
  return list;
});

const activeTab = computed<TabId>(() =>
  tabs.value.some((t) => t.id === state.tableTab.value) ? state.tableTab.value : 'irasai',
);

const tabRefs: Partial<Record<TabId, HTMLElement>> = {};
function setTabRef(id: TabId, el: any) {
  if (el) tabRefs[id] = el as HTMLElement;
  else delete tabRefs[id];
}

function selectTab(id: TabId, focus = false) {
  state.tableTab.value = id;
  if (focus) nextTick(() => tabRefs[id]?.focus());
}

function onTabKeydown(event: KeyboardEvent) {
  const ids = tabs.value.map((t) => t.id);
  const index = ids.indexOf(activeTab.value);
  let next: number | null = null;
  if (event.key === 'ArrowRight') next = (index + 1) % ids.length;
  else if (event.key === 'ArrowLeft') next = (index - 1 + ids.length) % ids.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = ids.length - 1;
  if (next === null) return;
  event.preventDefault();
  selectTab(ids[next], true);
}

// Move focus into the drawer when it opens, so keyboard users land on the tabs.
watch(
  () => state.tableOpen.value,
  (open) => {
    if (open && props.variant === 'drawer') nextTick(() => tabRefs[activeTab.value]?.focus());
  },
);

function close() {
  state.tableOpen.value = false;
}
</script>
