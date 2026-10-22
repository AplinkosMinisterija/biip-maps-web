// Shared Lithuanian UI strings of the hunting data hub (SPEC2 §12, §2.2, §3.4, §5).
// Topic-specific texts live in the topic modules (`topics/*.ts`). Forbidden in UI text:
// "būrelis" (use "medžioklės plotų naudotojas" / "MPV naudotojas"), "ūkiai"/"ūkių" for
// reporters, "viršyta", "pažeidimas", "populiacija".
import type { PluralForms } from '@/utils/hunting/dates';
import type { Badge, SeasonState, TopicId } from './types';

// Link of the staging line "Pastabos apie puslapį"; the link is hidden while empty.
export const FEEDBACK_URL = '';

export const TOPIC_ORDER: TopicId[] = [
  'apzvalga',
  'vilkai',
  'laimikiai',
  'limitai',
  'zala',
  'stebejimai',
];

// Tab labels and mobile menu subtitles (§2.2). Topic modules use the same texts in TopicDef.
export const TOPIC_TABS: Record<TopicId, string> = {
  apzvalga: 'Apžvalga',
  vilkai: 'Vilkai',
  laimikiai: 'Laimikiai',
  limitai: 'Briedžių limitai',
  zala: 'Žala',
  stebejimai: 'Stebėjimai',
};
export const TOPIC_SUBTITLES: Record<TopicId, string> = {
  apzvalga: 'Šio sezono būklė vienoje vietoje',
  vilkai: 'Sumedžioti vilkai ir sezono limitas',
  laimikiai: 'Kiek ir kokių gyvūnų sumedžiota',
  limitai: 'Kiek briedžių leista ir kiek panaudota',
  zala: 'Pranešimai apie laukinių gyvūnų padarytą žalą',
  stebejimai: 'Pranešimai apie stebėtus vilkus, lūšis, lokius ir stumbrus',
};

// A badge on its own (D10, OVERVIEW-18): the label says what it qualifies.
export const BADGE_LABELS: Record<Badge, string> = {
  vyksta: 'Sezonas vyksta',
  preliminarus: 'Preliminarūs duomenys',
  dalinis: 'Dalinis sezonas',
  bandomoji: 'Bandomoji aplinka',
};
// Right after a season label ("2026/2027 sezonas [vyksta]"): the season is already named.
export const BADGE_LABELS_AFTER_SEASON: Record<Badge, string> = {
  vyksta: 'vyksta',
  preliminarus: 'preliminarūs duomenys',
  dalinis: 'dalinis sezonas',
  bandomoji: 'Bandomoji aplinka',
};
export const BANDOMOJI_TOOLTIP =
  'Rodomi bandomosios sistemos duomenys; jie gali skirtis nuo oficialių.';

export const ABOUT_HEADINGS = {
  source: 'Šaltinis ir atnaujinimas',
  meaning: 'Ką reiškia skaičiai',
  missing: 'Ko čia nėra',
  compare: 'Kaip palyginti su oficialiais duomenimis',
  common: 'Bendros taisyklės',
} as const;

// Locale rule of the About dialog's "Bendros taisyklės" block (every topic).
export const ABOUT_LOCALE_RULE =
  'Datos rašomos formatu metai-mėnuo-diena (pvz., 2026-10-09), laikas – 24 valandų formatu, ' +
  'trupmenos – su kableliu.';

// The sources in plain words, once per About dialog (JOURNEYS-14): the dialog opens
// "Šaltinis ir atnaujinimas" with the BĮIP line, Vilkai adds the BIOMON line. The same
// expansions are the titles of the acronyms in the provenance line.
// TODO(product owner): confirm the official names before the release.
export const SOURCE_BIIP =
  'BĮIP – Biologinės įvairovės informacinė platforma (biip.lt): čia medžiotojai pildo ' +
  'elektroninį medžioklės lapą, o gyventojai teikia pranešimus.';
export const SOURCE_BIOMON =
  'BIOMON – vilkų sumedžiojimo vietų duomenys iki 2026-03-31 (nuo tada – BĮIP el. medžioklės ' +
  'lapas).';
export const SOURCE_TITLES: Record<string, string> = {
  BĮIP: 'Biologinės įvairovės informacinė platforma (biip.lt)',
  BIOMON: 'Vilkų sumedžiojimo vietų duomenys iki 2026-03-31',
};

// Attribution rule, part of every About "Ką reiškia skaičiai" (§3.5).
export const ATTRIBUTION_RULE =
  'Savivaldybės skaičiai – jai priskirtų medžioklės plotų vienetų (MPV) suma. Kiekvienas MPV ' +
  'priskirtas vienai savivaldybei, nors apie 15 % MPV iš dalies yra kitoje savivaldybėje, todėl ' +
  'savivaldybių skaičiai apytiksliai.';

export const S = {
  appTitle: 'Medžioklės duomenys',
  share: 'Dalintis',
  shareDone: 'Nuoroda nukopijuota',
  shareFail: 'Nepavyko nukopijuoti. Nukopijuokite adresą iš naršyklės adreso juostos.',
  about: 'Apie duomenis',
  topic: 'Tema', // tablet <select> label
  topicsNav: 'Temos', // nav aria-label
  season: 'Sezonas', // popover title
  // Filter chips: "Name: value", the value lower-case unless it is a proper noun (§OVERVIEW-20).
  seasonChip: (season: string) => `Sezonas: ${season}`,
  place: 'Vieta',
  placeChip: (name: string) => `Vieta: ${name}`,
  placeAll: 'Visa Lietuva',
  placeAllLower: 'visa Lietuva',
  placeSearch: 'Ieškoti savivaldybės',
  placeNone: 'Nerasta',
  filters: 'Filtrai',
  filtersChip: (n: number) => (n ? `Filtrai (${n})` : 'Filtrai'),
  moreFilters: (n: number) => (n ? `Daugiau filtrų (${n})` : 'Daugiau filtrų'),
  // Reset: "Atstatyti filtrus" in the bar, "Atstatyti" in sheet footers and popovers.
  resetFilters: 'Atstatyti filtrus',
  reset: 'Atstatyti',
  species: 'Rūšis',
  speciesAll: 'visos',
  speciesSearch: 'Ieškoti rūšies',
  animals: 'Gyvūnai',
  metricSwitch: 'Žemėlapyje rodoma',
  viewMap: 'Žemėlapis',
  viewTable: 'Lentelė',
  railExpand: 'Išskleisti skydelį',
  segmentSummary: 'Suvestinė',
  segmentTable: 'Lentelė',
  segmentFilters: 'Filtrai',
  showOnMap: 'Rodyti žemėlapyje',
  // Apžvalga (D8).
  overviewLead:
    'Kol einamojo sezono skaičiai nepilni, kortelėje rodomas ankstesnis sezonas – jis nurodytas virš skaičiaus.',
  overviewMap: 'Rodyti žemėlapyje',
  overviewTable: 'Rodyti lentelę',
  overviewReportTitle: 'Pastebėjote žalą, stambų plėšrūną ar stumbrą?',
  overviewReportText: 'Praneškite – jūsų pranešimai papildo šiuos duomenis.',
  overviewReportDamage: 'Pranešti apie žalą',
  overviewReportObservation: 'Pildyti stebėjimo anketą',
  showInTable: 'Rodyti lentelėje',
  close: 'Uždaryti',
  csv: 'Atsisiųsti CSV',
  totalsRow: 'Iš viso',
  legendChip: (legendTitle: string) => `Legenda: ${legendTitle}`,
  legendNoMpv: 'Nėra MPV',
  legendNoData: 'Duomenų nėra',
  legendPooled: 'Neskelbiama (mažiau nei 3 MPV)', // the same wording as `pooledShort`
  legendFixedClasses: 'Klasės vienodos visiems sezonams.',
  otherRowsHeading: 'Kiti šios savivaldybės rodikliai',
  loading: 'Įkeliami duomenys…',
  loadError: 'Nepavyko įkelti duomenų. Patikrinkite ryšį ir bandykite dar kartą.',
  retry: 'Bandyti dar kartą',
  empty: 'Pasirinktam sezonui ir vietai duomenų nėra.',
  emptyShowAll: 'Rodyti visą Lietuvą',
  emptyShowSeason: (season: string) => `Rodyti ${season} sezoną`,
  noMpv: 'Šioje savivaldybėje medžioklės plotų vienetų nėra.',
  // Suppressed small counts (§5; owner decision: damages report counts too).
  suppressed: '<3',
  suppressedReporters: 'Mažiau nei 3 skirtingi pranešėjai – tikslus skaičius neskelbiamas.',
  suppressedReports: 'Mažiau nei 3 pranešimai (0, 1 arba 2) – tikslus skaičius neskelbiamas.',
  withheld: 'neskelbiama',
  pooled:
    'Savivaldybėje mažiau nei 3 MPV, todėl jos skaičiai atskirai neskelbiami (jie įtraukti į Lietuvos sumą).',
  pooledShort: 'neskelbiama (mažiau nei 3 MPV)',
  pooledNote: (names: string) =>
    `${names}: mažiau nei 3 MPV – skaičiai atskirai neskelbiami, bet įtraukti į sumą „Iš viso“.`,
  withheldTooltip: 'Neskelbiama, kad iš sumų nebūtų galima apskaičiuoti mažesnių nei 3 skaičių.',
  deltaSuppressed: 'Per maži skaičiai procentams palyginti.',
  deltaSame: 'tiek pat',
  // Provenance (§5).
  // One wording per kind (OVERVIEW-09); embedded, the hub sends the line to the WP header
  // (`state.provenance.text`), which shows it once for the whole page.
  provenanceSnapshot: (date: string) => `Duomenys ${date} būklei · BĮIP`,
  // `at` = 'yyyy-MM-dd HH:mm' (Vilnius).
  provenanceLive: (at: string) => `Duomenys atnaujinti ${at} · BĮIP ir BIOMON`,
  provenanceOverview: (date: string) =>
    `Duomenys ${date} būklei · vilkai ir stebėjimai – tiesiogiai iš BĮIP`,
  provenanceLink: 'Apie duomenis', // appended as a link after " · "
  provenanceSnapshotTitle: (date: string) =>
    `Rodoma ${date} parengta BĮIP suvestinių kopija; vėlesni įrašai į ją nepatenka.`,
  provenanceCsv: (date: string) => `# Duomenys: ${date} momentinė kopija; BĮIP`,
  // The staging marker (standalone app off production only; embedded, the WP header has it).
  prototypeLine: 'Bandomoji aplinka',
  prototypeFeedback: 'Pastabos apie puslapį',
  prototypeClose: 'Uždaryti pranešimą apie bandomąją aplinką',
  documentTitle: (tab: string) => `${tab} – Medžioklės duomenys – BĮIP žemėlapiai`,
  mapRegion: (answer: string) =>
    `${answer ? `Žemėlapis: ${answer.replace(/\.$/, '')}` : 'Žemėlapis'}. Tie patys duomenys – rodinyje „Lentelė“.`,
  mapToTable: 'Žemėlapio duomenys lentelėje',
  // Coercion notices shared by the hub state (§3.4); topic-specific ones live in topics/*.ts.
  noticeSeasonOnly: (season: string) =>
    `Šie duomenys skelbiami tik sezonais – rodomas ${season} sezonas.`,
  // A topic switch landed on another season (J-06): the target's default one.
  noticeSeasonDefault: (topic: string, season: string, state: SeasonState) =>
    state === 'galutinis'
      ? `${topic}: rodomas ${season} sezonas – naujausias, kurio duomenys pilni.`
      : state === 'vyksta'
        ? `${topic}: rodomas ${season} sezonas – jis dar vyksta, skaičiai keisis.`
        : `${topic}: rodomas ${season} sezonas (${BADGE_LABELS_AFTER_SEASON[state]}).`,
  // A linked table this selection does not offer (embed, §5.9): the one shown instead.
  noticeTableFallback: (shown: string) =>
    `Nuorodoje nurodyta lentelė šiam pasirinkimui neskelbiama – rodoma lentelė „${shown}“.`,
  noticeSeasonMissing: (topic: string, season: string, fallback: string) =>
    `${topic} duomenų už ${season} nėra – rodomas ${fallback} sezonas.`,
} as const;

// A chip value after "Name: " starts lower-case ("Rūšis: briedis"); proper nouns (places)
// are passed as they are.
export const chipValue = (label: string) =>
  label.charAt(0).toLocaleLowerCase('lt') + label.slice(1);

// Plural forms (§12), for `pluralLt` from `utils/hunting/dates.ts`.
export const P_HUNTED: PluralForms = ['sumedžiotas', 'sumedžioti', 'sumedžiota'];
export const P_ANIMAL: PluralForms = ['gyvūnas', 'gyvūnai', 'gyvūnų'];
export const P_ANIMAL_GEN: PluralForms = ['gyvūno', 'gyvūnų', 'gyvūnų'];
export const P_RECEIVED: PluralForms = ['gautas', 'gauti', 'gauta'];
export const P_REPORT: PluralForms = ['pranešimas', 'pranešimai', 'pranešimų'];
export const P_REPORTER_GEN: PluralForms = ['pranešėjo', 'pranešėjų', 'pranešėjų'];
export const P_MOOSE: PluralForms = ['briedis', 'briedžiai', 'briedžių'];
export const P_ATTACKED_LIVESTOCK: PluralForms = [
  'užpultas ūkinis gyvūnas',
  'užpulti ūkiniai gyvūnai',
  'užpultų ūkinių gyvūnų',
];
export const P_SPECIFIED: PluralForms = ['nurodytas', 'nurodyti', 'nurodyta'];
