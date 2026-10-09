<template>
  <section
    aria-labelledby="wolves-debug-title"
    class="rounded-lg border border-dashed border-gray-400 bg-gray-50 p-3 text-xs text-gray-800 font-mono"
  >
    <h2 id="wolves-debug-title" class="font-sans font-semibold text-gray-900 mb-2">Derinimas</h2>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <template v-for="row in rows" :key="row[0]">
        <dt class="text-gray-600">{{ row[0] }}</dt>
        <dd class="tabular-nums break-words">{{ row[1] }}</dd>
      </template>
    </dl>

    <h3 class="font-sans font-semibold text-gray-900 mt-3 mb-1">Pagal sezonus</h3>
    <table class="w-full tabular-nums">
      <caption class="sr-only">
        Įrašai pagal sezonus
      </caption>
      <thead>
        <tr class="text-left text-gray-600">
          <th scope="col">Sezonas</th>
          <th scope="col" class="text-right">Su vieta</th>
          <th scope="col" class="text-right">Ne medž. laik.</th>
          <th scope="col" class="text-right">Be vietos</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in perSeason" :key="s.season">
          <th scope="row" class="text-left font-normal">{{ s.season }}/{{ s.season + 1 }}</th>
          <td class="text-right">{{ s.count }}</td>
          <td class="text-right">{{ s.offWindow }}</td>
          <td class="text-right">{{ s.paper }}</td>
        </tr>
      </tbody>
    </table>

    <h3 class="font-sans font-semibold text-gray-900 mt-3 mb-1">Savitikra</h3>
    <ul>
      <li v-for="check in checks" :key="check.name" :class="check.ok ? '' : 'text-red-800'">
        {{ check.ok ? 'OK' : 'KLAIDA' }}: {{ check.name }}
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { runSelfChecks } from '@/utils/hunting/selfcheck';

const ctx = inject(WOLVES_CTX)!;
const { data, derived, state } = ctx;

// runSelfChecks() is expected to return [{ name, ok }]; anything else is shown as one failed check.
const checks = computed<{ name: string; ok: boolean }[]>(() => {
  try {
    const result: any = runSelfChecks();
    if (Array.isArray(result)) {
      return result.map((c: any) => ({ name: String(c.name), ok: !!c.ok }));
    }
    return [{ name: `runSelfChecks: ${JSON.stringify(result)}`, ok: false }];
  } catch (err) {
    return [{ name: `runSelfChecks: ${String(err)}`, ok: false }];
  }
});

const cacheText = computed(() => {
  const cache = data.fromCache.value;
  return cache ? `hit (${cache})` : 'miss';
});

// P1 lookup (§9): failures are reported here only.
const municipalityText = computed(() => {
  const records = data.dataset.value?.records || [];
  if (!records.length || records[0].municipalityCode === undefined) return 'nepriskirta';
  const assigned = records.filter((r) => r.municipalityCode != null).length;
  return `${assigned} iš ${records.length}`;
});

const rows = computed<[string, string | number][]>(() => {
  const d = data.dataset.value;
  const paperBySeason = d
    ? Object.entries(d.paperRowsBySeason)
        .map(([s, n]) => `${s}: ${n}`)
        .join(', ') || '0'
    : '—';
  return [
    ['phase', data.phase.value],
    ['apiTotal', d ? d.apiTotal : '—'],
    ['records (su vieta)', d ? d.records.length : '—'],
    ['paperRowsBySeason', paperBySeason],
    ['paperRowsUnknownSeason', d ? d.paperRowsUnknownSeason : '—'],
    ['excludedBadDate', d ? d.excludedBadDate : '—'],
    ['excludedBadGeom', d ? d.excludedBadGeom : '—'],
    ['duplicateIdsDropped', d ? d.duplicateIdsDropped : '—'],
    ['possibleDuplicatePairs', d ? d.possibleDuplicatePairs : '—'],
    ['minYear', d ? d.minYear : '—'],
    ['filtered', derived.filtered.value.length],
    [
      'interval',
      `${state.interval.value.from} … ${state.interval.value.to} (${state.preset.value})`,
    ],
    ['fetchMs', data.fetchMs?.value ?? '—'],
    ['cache', cacheText.value],
    ['seasons (E3)', data.seasonsFailed?.value ? 'nepavyko' : data.seasons.value.length],
    ['municipalities (P1)', municipalityText.value],
    ['totals (E2)', data.totalsFailed.value ? 'nepavyko' : JSON.stringify(data.totals.value)],
    ['error', data.error.value || '—'],
  ];
});

const perSeason = computed(() => {
  const d = data.dataset.value;
  if (!d) return [];
  const bySeason: Record<
    number,
    { season: number; count: number; offWindow: number; paper: number }
  > = {};
  const entry = (season: number) =>
    (bySeason[season] = bySeason[season] || { season, count: 0, offWindow: 0, paper: 0 });
  d.records.forEach((r) => {
    const e = entry(r.season);
    e.count++;
    if (!r.inWolfWindow) e.offWindow++;
  });
  Object.entries(d.paperRowsBySeason).forEach(([s, n]) => (entry(Number(s)).paper = n));
  return Object.values(bySeason).sort((a, b) => b.season - a.season);
});
</script>
