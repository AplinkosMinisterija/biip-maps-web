// Shared Lithuanian UI strings of the hunting data hub (SPEC2 §12, §2.2, §3.4, §5).
// Topic-specific texts live in the topic modules (`topics/*.ts`). Forbidden in UI text:
// "būrelis" (use "medžioklės plotų naudotojas" / "MPV naudotojas"), "ūkiai"/"ūkių" for
// reporters, "viršyta", "pažeidimas", "populiacija".
import type { PluralForms } from '@/utils/hunting/dates';
import type { Badge, TopicId } from './types';

// Link of the prototype line "Pastabos apie prototipą"; the link is hidden while empty.
export const FEEDBACK_URL = '';

export const TOPIC_ORDER: TopicId[] = ['apzvalga', 'vilkai', 'laimikiai', 'limitai', 'zala'];

// Tab labels and mobile menu subtitles (§2.2). Topic modules use the same texts in TopicDef.
export const TOPIC_TABS: Record<TopicId, string> = {
  apzvalga: 'Apžvalga',
  vilkai: 'Vilkai',
  laimikiai: 'Laimikiai',
  limitai: 'Briedžių limitai',
  zala: 'Žala',
};
export const TOPIC_SUBTITLES: Record<TopicId, string> = {
  apzvalga: 'Šio sezono būklė vienoje vietoje',
  vilkai: 'Sumedžioti vilkai ir sezono limitas',
  laimikiai: 'Kiek ir kokių gyvūnų sumedžiota',
  limitai: 'Kiek briedžių leista ir kiek panaudota',
  zala: 'Pranešimai apie laukinių gyvūnų padarytą žalą',
};

export const BADGE_LABELS: Record<Badge, string> = {
  vyksta: 'Vyksta',
  preliminarus: 'Preliminarūs',
  dalinis: 'Dalinis sezonas',
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
  seasonChip: (season: string) => `Sezonas ${season}`,
  placeChip: (name: string) => `Vieta: ${name}`,
  placeAll: 'Visa Lietuva',
  placeSearch: 'Ieškoti savivaldybės',
  placeNone: 'Nerasta',
  filtersChip: (n: number) => `Filtrai (${n})`,
  moreFilters: (n: number) => `Daugiau filtrų (${n})`,
  viewMap: 'Žemėlapis',
  viewTable: 'Lentelė',
  railExpand: 'Išskleisti skydelį',
  segmentSummary: 'Suvestinė',
  segmentTable: 'Lentelė',
  segmentFilters: 'Filtrai',
  showOnMap: 'Rodyti žemėlapyje',
  showInTable: 'Rodyti lentelėje',
  close: 'Uždaryti',
  csv: 'Atsisiųsti CSV',
  totalsRow: 'Iš viso',
  legendChip: (legendTitle: string) => `Legenda: ${legendTitle}`,
  legendNoMpv: 'Nėra MPV',
  legendNoData: 'Duomenų nėra',
  legendPooled: 'Neskelbiama (< 3 MPV)',
  legendFixedClasses: 'Klasės vienodos visiems sezonams.',
  otherRowsHeading: 'Kiti rodikliai čia',
  loading: 'Įkeliami duomenys…',
  loadError: 'Nepavyko įkelti duomenų.',
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
  provenanceSnapshot: (date: string) => `Duomenys: ${date} momentinė kopija · BĮIP`,
  provenanceLive: (time: string) => `Duomenys atnaujinti ${time} · BĮIP ir BIOMON`,
  provenanceLink: 'Apie duomenis', // appended as a link after " · "
  provenanceSnapshotTitle: (date: string) =>
    `Prototipas rodo ${date} parengtą BĮIP suvestinių kopiją. Duomenys neatsinaujina.`,
  provenanceCsv: (date: string) => `# Duomenys: ${date} momentinė kopija; BĮIP`,
  prototypeLine: 'Bandomoji versija',
  prototypeFeedback: 'Pastabos apie prototipą',
  documentTitle: (tab: string) => `${tab} – Medžioklės duomenys – BĮIP žemėlapiai`,
  mapRegion: (answer: string) => `Žemėlapis: ${answer}`,
  // Coercion notices shared by the hub state (§3.4); topic-specific ones live in topics/*.ts.
  noticeSeasonOnly: (season: string) =>
    `Šie duomenys skelbiami tik sezonais – rodomas ${season} sezonas.`,
  noticeSeasonMissing: (topic: string, season: string, fallback: string) =>
    `${topic} duomenų už ${season} nėra – rodomas ${fallback} sezonas.`,
} as const;

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
