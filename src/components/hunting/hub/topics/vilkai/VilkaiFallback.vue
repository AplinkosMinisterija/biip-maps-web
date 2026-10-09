<template>
  <section aria-label="Momentinė kopija" class="flex flex-col gap-3 text-sm text-gray-800">
    <p class="font-semibold text-gray-900" aria-live="polite">{{ view.answer }}</p>
    <p v-if="view.notice" class="text-xs text-gray-600">{{ view.notice }}</p>

    <button
      type="button"
      class="self-start px-3 py-2 min-h-[44px] md:min-h-[32px] rounded border border-gray-300 text-xs font-semibold text-gray-800 hover:bg-gray-100"
      :class="focusRing"
      @click="ctx.data.reload()"
    >
      Bandyti gauti gyvus duomenis
    </button>

    <div class="flex flex-col gap-1">
      <label :for="`${uid}-season`" class="text-xs font-semibold text-gray-900">{{
        S.season
      }}</label>
      <select
        :id="`${uid}-season`"
        :value="String(season)"
        class="block w-full rounded-md border border-gray-400 bg-white px-2 text-sm text-gray-900 cursor-pointer h-11 md:h-9"
        :class="focusRing"
        @change="season = Number(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="s in seasons" :key="s" :value="String(s)">{{ seasonLabel(s) }}</option>
      </select>
    </div>

    <dl class="grid gap-2" :class="view.kpis.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
      <div
        v-for="kpi in view.kpis"
        :key="kpi.id"
        class="rounded-lg border border-gray-200 p-3"
        :aria-label="kpi.ariaLabel"
      >
        <dt class="text-xs text-gray-600">{{ kpi.label }}</dt>
        <dd class="text-2xl font-semibold tabular-nums text-gray-900">{{ kpi.value }}</dd>
      </div>
    </dl>

    <p v-for="note in view.notes" :key="note" class="text-xs text-gray-700">{{ note }}</p>
    <p v-if="view.empty" class="text-gray-700">{{ view.empty.text }}</p>

    <div v-for="table in view.tables" :key="table.id" class="max-h-[320px] overflow-y-auto">
      <table class="w-full border-collapse text-left text-xs">
        <caption class="sr-only">
          {{
            `${table.label}: ${seasonLabel(season)}`
          }}
        </caption>
        <thead class="sticky top-0 bg-white">
          <tr class="border-b border-gray-200 text-gray-600">
            <th
              v-for="column in table.columns"
              :key="column.id"
              scope="col"
              class="py-2 pr-2 font-semibold"
              :class="column.numeric ? 'text-right' : ''"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="table.totals" class="border-b border-gray-200 font-semibold">
            <th scope="row" class="py-1.5 pr-2">{{ S.totalsRow }}</th>
            <td class="py-1.5 pr-2 text-right tabular-nums">
              {{ cell(table.columns[1], table.totals) }}
            </td>
          </tr>
          <tr
            v-for="row in table.rows"
            :key="row.code"
            class="border-b border-gray-100"
            :class="row.code === ctx.state.sav.value ? 'bg-amber-50' : ''"
          >
            <td class="py-1 pr-2">
              <button
                type="button"
                class="text-left text-blue-800 underline-offset-2 hover:underline rounded min-h-[24px]"
                :class="focusRing"
                :aria-pressed="row.code === ctx.state.sav.value"
                @click="toggleSav(row.code)"
              >
                {{ row.name }}
              </button>
            </td>
            <td class="py-1 pr-2 text-right tabular-nums">{{ cell(table.columns[1], row) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-for="note in table.footnotes" :key="note" class="mt-1 text-xs text-gray-600">
        {{ note }}
      </p>
    </div>

    <p class="text-xs text-gray-600" :title="S.provenanceSnapshotTitle(view.provenance.asOf)">
      {{ view.provenance.text }}
    </p>
  </section>
</template>

<script setup lang="ts">
// Vilkai fallback (SPEC2 §6.2, P0b): when `/wolfs` fails after its retry, the panel shows the
// committed `wolves.json` copy instead: closed seasons, located wolves per municipality.
// The place stays the wolves state's `sav`, so the URL and the map outline keep working.
import { computed, getCurrentInstance, inject, watch, type PropType } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { seasonInterval, seasonLabel } from '@/utils/hunting/dates';
import { S } from '@/utils/hunting/hub/strings';
import type { ColumnDef, SnapshotData } from '@/utils/hunting/hub/types';
import { vilkaiFallbackSeasons, vilkaiFallbackView } from '@/utils/hunting/hub/topics/vilkai';

const props = defineProps({
  snapshot: { type: Object as PropType<SnapshotData>, required: true },
});
// 'view' (view: TopicView): the fallback's content, for the host's map.
const emit = defineEmits(['view']);

const ctx = inject(WOLVES_CTX)!;
const uid = `hub-vilkai-fallback-${getCurrentInstance()?.uid ?? 0}`;
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2';

const seasons = computed(() => vilkaiFallbackSeasons(props.snapshot));
// The wolves period when it is a closed season of the copy, else the newest one. A choice
// sets the wolves period, so the season is in the URL (reload, "Dalintis") like the place.
const season = computed<number>({
  get() {
    const current = ctx.derived.intervalSeason.value;
    return current !== null && seasons.value.includes(current)
      ? current
      : (seasons.value[0] ?? current ?? 0);
  },
  set(value) {
    ctx.state.setInterval(seasonInterval(value), `season:${value}`);
  },
});

const view = computed(() =>
  vilkaiFallbackView(props.snapshot, {
    topic: 'vilkai',
    season: season.value,
    sav: ctx.state.sav.value,
    dims: {},
    table: null,
  }),
);
// The host hands the view to the hub's choropleth (map) when it has one.
watch(view, (value) => emit('view', value), { immediate: true });

const cell = (column: ColumnDef<any>, row: any) =>
  column.display ? column.display(row) : column.value(row);

function toggleSav(code: number | null) {
  ctx.state.sav.value = code === ctx.state.sav.value ? null : code;
}

defineExpose({ view });
</script>
