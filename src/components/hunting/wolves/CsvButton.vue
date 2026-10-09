<template>
  <button
    type="button"
    class="inline-flex items-center justify-center gap-2 min-h-[44px] md:min-h-[32px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    :disabled="!records.length"
    @click="download"
  >
    <UiIcon name="download" :size="16" aria-hidden="true" />
    Atsisiųsti CSV
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { WOLVES_CTX } from '@/composables/hunting/context';
import { hasMunicipalities } from '@/utils/hunting/municipalities';
import type { WolfRecord } from '@/utils/hunting/types';

// Local CSV builder per §6.8 and labels per §4.8. T1 owns `@/utils/hunting/csv.ts`;
// the integrator may delegate to it once it lands, keeping this exact output.
const AGE: Record<string, string> = {
  ADULT: 'Suaugęs',
  TWO_YEAR: 'Vyresnis nei 1 m.',
  ONE_YEAR: 'Jauniklis iki 1 m.',
};
const SEX: Record<string, string> = { MALE: 'Patinas', FEMALE: 'Patelė' };
const METHOD: Record<string, string> = {
  TYKOJAMOJI: 'Tykojamoji',
  VAROMOJI: 'Varomoji',
  SU_VELIAVELEMIS: 'Su vėliavėlėmis',
  OTHER: 'Kita',
};
const SOURCE: Record<string, string> = {
  biomon: 'BIOMON',
  biip: 'BIIP elektroninis medžioklės lapas',
};
const pack = (member: boolean | null, amount: number | null) => {
  if (member === true) return amount && amount > 0 ? `Taip, gaujoje ${amount}` : 'Taip';
  if (member === false) return 'Ne';
  return 'Nenurodyta';
};

const vilniusDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Vilnius',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function formatDateTime(date: Date) {
  const parts = Object.fromEntries(
    vilniusDateTime.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

const escape = (value: string) =>
  /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const ctx = inject(WOLVES_CTX)!;
const { state, derived, data } = ctx;

const records = computed(() => derived.filtered.value);

function buildCsv(rows: WolfRecord[], withMunicipality: boolean, place: string) {
  const { from, to } = state.interval.value;
  const lines = [
    `# Sumedžioti vilkai; ${from}–${to}; ${place}; parengta ${formatDateTime(new Date())}; šaltinis: BIIP ir BIOMON (medziokle.biip.lt); vietos koordinatės ir identifikatoriai neįtraukti`,
    [
      'data',
      'sezonas',
      'amzius',
      'lytis',
      'medziokles_budas',
      'gaujos_narys',
      'saltinis',
      'ne_medziokles_laikotarpiu',
      ...(withMunicipality ? ['savivaldybe'] : []),
    ].join(';'),
  ];

  for (const r of rows) {
    const values = [
      r.day,
      `${r.season}/${r.season + 1}`,
      r.age ? AGE[r.age] || r.age : 'Nenurodyta',
      r.sex ? SEX[r.sex] || r.sex : 'Nenurodyta',
      r.method ? METHOD[r.method] || r.method : 'Nenurodytas',
      pack(r.packMember, r.packAmount),
      SOURCE[r.source] || r.source,
      r.inWolfWindow ? 'ne' : 'taip',
      ...(withMunicipality ? [r.municipalityName || 'Nenustatyta'] : []),
    ];
    lines.push(values.map(escape).join(';'));
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function download() {
  const rows = records.value;
  if (!rows.length) return;

  const withMunicipality = hasMunicipalities(data.dataset.value?.records || []);
  const sav = state.sav.value;
  const savName =
    sav !== null ? rows.find((r) => r.municipalityCode === sav)?.municipalityName : null;
  const place = savName || (sav !== null ? 'savivaldybė' : 'visa Lietuva');

  const { from, to } = state.interval.value;
  const blob = new Blob([buildCsv(rows, withMunicipality, place)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vilkai_${from}_${to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>
