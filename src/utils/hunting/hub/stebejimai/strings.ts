// Lithuanian UI texts of the Stebėjimai topic (STEB-SPEC §3). Shared hub texts (S, badges,
// the prototype line) come from `utils/hunting/hub/strings.ts`. Forbidden in UI text:
// "būrelis"; MPV is "medžioklės plotų vienetas (MPV)".
import { formatInt, pluralLt, type PluralForms } from '@/utils/hunting/dates';

export const P_NO_POINT: PluralForms = [
  'įrašas be vietos žemėlapyje nerodomas',
  'įrašai be vietos žemėlapyje nerodomi',
  'įrašų be vietos žemėlapyje nerodoma',
];
// Rail label: "13 stebėjimų".
export const P_OBSERVATION_GEN: PluralForms = ['stebėjimas', 'stebėjimai', 'stebėjimų'];
// Phone Filtrai sheet button: "Rodyti 8 stebėjimus".
export const P_OBSERVATION_ACC: PluralForms = ['stebėjimą', 'stebėjimus', 'stebėjimų'];
// Truncation note: the participle and the adjective agree with the number, as in
// "užregistruota 10 stebėjimų": "rodoma 10 000 naujausių įrašų", "rodomi 9 999 naujausi įrašai".
const P_SHOWN: PluralForms = ['rodomas', 'rodomi', 'rodoma'];
const P_NEWEST: PluralForms = ['naujausias įrašas', 'naujausi įrašai', 'naujausių įrašų'];
/** "rodoma 10 000 naujausių įrašų iš 12 345" (the panel note and the CSV comment line). */
export const truncatedPart = (shown: number, total: number) =>
  `${pluralLt(shown, P_SHOWN)} ${formatInt(shown)} ${pluralLt(shown, P_NEWEST)} iš ${formatInt(total)}`;

export const SS = {
  h1: 'Kur ir kokie gyvūnai stebėti?',
  filtersLabel: 'Stebėjimų filtrai',
  period: 'Laikotarpis',
  species: 'Rūšis',
  fact: 'Faktas',
  place: 'Vieta',
  periodChip: (label: string) => `Laikotarpis: ${label}`,
  speciesChip: (label: string) => `Rūšis: ${label}`,
  factChip: (label: string) => `Faktas: ${label}`,
  placeChip: (label: string) => `Vieta: ${label}`,
  filtersChip: (n: number) => (n ? `Filtrai (${n})` : 'Filtrai'),
  allSpecies: 'Visos rūšys',
  allFacts: 'Visi faktai',
  allPlaces: 'Visa Lietuva',
  allSpeciesLower: 'visos rūšys',
  allFactsLower: 'visi faktai',
  allPlacesLower: 'visa Lietuva',
  // Chip values of the unset filters ("Rūšis: visos", "Faktas: visi", "Laikotarpis: visas").
  allSpeciesChip: 'visos',
  allFactsChip: 'visi',
  allPeriodChip: 'visas',
  showObservations: (label: string) => `Rodyti ${label}`,
  optionCount: (label: string, n: number) => `${label} (${formatInt(n)})`,
  resetFilters: 'Atstatyti filtrus',
  // Period options (§3.3).
  periodAll: 'Visas laikotarpis',
  period30: 'Paskutinės 30 d.',
  periodSeason: 'Medžioklės sezonas',
  periodRange: 'Nuo–iki',
  seasonSelect: 'Sezonas',
  rangeInvalid: 'Pabaiga negali būti ankstesnė už pradžią.',
  rangeHint: 'Palikus „Iki“ tuščią, rodomas visas „Nuo“ laikotarpis (metai, mėnuo ar diena).',
  // Filter sentence (§3.2).
  // A place such as "Biržų r. sav." already ends the sentence with its period.
  sentence: (period: string, species: string, fact: string, place: string) =>
    `Rodoma: ${period}; ${species}; ${fact}; ${place}${place.endsWith('.') ? '' : '.'}`,
  chartTitle: 'Stebėjimai pagal rūšį',
  noPoint: (k: number) => `${formatInt(k)} ${pluralLt(k, P_NO_POINT)}.`,
  truncated: (shown: number, total: number) => {
    const text = truncatedPart(shown, total);
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  },
  provenance: (time: string) => `Duomenys gauti ${time} tiesiogiai iš BĮIP`,
  // States (§3.9).
  loading: 'Įkeliami duomenys…',
  loadError: 'Nepavyko įkelti duomenų.',
  retry: 'Bandyti dar kartą',
  noRecordsProd: 'Stebėjimų įrašų nėra.',
  noRecordsTest: 'Bandomojoje aplinkoje stebėjimų įrašų nėra.',
  showAllPeriod: 'Rodyti visą laikotarpį',
  showAllSpecies: 'Rodyti visas rūšis',
  showAllFacts: 'Rodyti visus faktus',
  showAllPlaces: 'Rodyti visą Lietuvą',
  tableEmpty: 'Įrašų nėra.',
  tableFilteredEmpty: 'Pagal pasirinktus filtrus įrašų nėra.',
  // Map, legend, card (§3.4).
  legendTitle: 'Stebėti gyvūnai',
  legendOther: 'Kita rūšis',
  legendCluster: 'Keli stebėjimai',
  legendClusterHint: 'priartinkite arba paspauskite',
  cardDateTime: 'Data ir laikas',
  cardCount: 'Gyvūnų skaičius',
  cardFact: 'Faktas',
  cardMunicipality: 'Savivaldybė',
  cardEldership: 'Seniūnija',
  cardMpv: 'Medžioklės plotų vienetas (MPV)',
  cardLink: 'Peržiūrėti įrašą',
  cardPager: (i: number, n: number) => `${formatInt(i)} iš ${formatInt(n)}`,
  previous: 'Ankstesnis',
  next: 'Kitas',
  previousRecord: 'Ankstesnis stebėjimas',
  nextRecord: 'Kitas stebėjimas',
  close: 'Uždaryti',
  newWindow: '(atidaroma naujame lange)',
  // Tables (§3.5).
  tableTitle: 'Lentelė',
  tablesLabel: 'Lentelės',
  caption: (tab: string, period: string, place: string) => `${tab} · ${period} · ${place}`,
  colDateTime: 'Data ir laikas',
  colSpecies: 'Rūšis',
  colCount: 'Skaičius',
  colFact: 'Faktas',
  colMunicipality: 'Savivaldybė',
  colEldership: 'Seniūnija',
  colMpv: 'MPV',
  colMpvTitle: 'Medžioklės plotų vienetas',
  colActions: 'Veiksmai',
  colObservations: 'Stebėjimų',
  colAnimals: 'Gyvūnų',
  totals: 'Iš viso',
  showOnMap: 'Rodyti žemėlapyje',
  showOnMapOf: (what: string) => `Rodyti žemėlapyje: ${what}`,
  noPlace: 'Be vietos',
  view: 'Peržiūrėti',
  viewRecord: (id: number) => `Peržiūrėti įrašą Nr. ${id}`,
  range: (a: number, b: number, n: number) =>
    `Rodoma ${formatInt(a)}–${formatInt(b)} iš ${formatInt(n)}`,
  hideTable: 'Slėpti lentelę',
  // Sheet (mobile).
  sheetExpand: 'Išskleisti skydelį',
  sheetCollapse: 'Suskleisti skydelį',
  closeRecord: 'Uždaryti įrašą',
  segmentSummary: 'Suvestinė',
  segmentTable: 'Lentelė',
  segmentsLabel: 'Rodinys',
  mapButton: 'Žemėlapis',
  railLabel: (n: number) => pluralLt(n, P_OBSERVATION_GEN),
} as const;
