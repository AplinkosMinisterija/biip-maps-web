// Apžvalga: the landing cards, one per topic (SPEC2 §6.1). Card texts come from the same pure
// functions as the topic panels, so the numbers cannot disagree. The wolf card reads only the
// hand-maintained official figures (`meta.static.wolves`) and the real Vilnius day: staging's
// live wolves never mix with production numbers (§0.10).
import { seasonOfDay } from '../../dates';
import { ABOUT_LOCALE_RULE, TOPIC_SUBTITLES, TOPIC_TABS } from '../strings';
import type { TopicDef } from '../types';
import { seasonsDesc } from './common';

// The current season by the real Vilnius day (§3.3); Apžvalga never shows older seasons.
// The cards themselves come from each topic's `overview()` (Vilkai: topics/vilkai.ts).
export const overviewSeason = (today: string) => seasonOfDay(today);

// About (OVERVIEW-27): what the cards show now – the snapshot, the live wolf counter and
// the live observations; each figure names its season.
export const about = {
  source: [
    'Kortelės rodo tuos pačius skaičius kaip temų skiltys. Laimikiai, limitai ir žala – iš BĮIP ' +
      'duomenų kopijos (jos data – eilutėje „Duomenys … būklei“); vilkų skaitiklis ir ' +
      'stebėjimai – tiesiogiai iš BĮIP; praėjusio sezono vilkų skaičius – oficialus AM.',
  ],
  meaning: [
    'Kiekviena kortelė atsako į vieną klausimą. Virš skaičiaus nurodytas jo sezonas: kol ' +
      'einamojo sezono skaičiai nepilni, rodomas ankstesnis sezonas; vykstančio sezono skaičiai ' +
      'dar keisis.',
    'Laimikių ir briedžių limitų savivaldybės skaičiai – jai priskirtų MPV suma; žalos ir ' +
      'stebėjimų – pagal pranešime nurodytą vietą.',
  ],
  missing: ['Asmens duomenų ir MPV lygmens laimikių, limitų ar žalos duomenų.'],
  compare: ['Žr. kiekvienos temos „Apie duomenis“.'],
};

const aboutCommon = [
  ABOUT_LOCALE_RULE,
  'Asmens duomenys neskelbiami. Stebėjimai rodomi su pranešime nurodyta vieta, vilkai – ' +
    'apytiksliai (1 km tinklelio langelio centre); kitų temų skaičiai – savivaldybių ir ' +
    'Lietuvos sumos.',
];

export const apzvalga: TopicDef = {
  id: 'apzvalga',
  tab: TOPIC_TABS.apzvalga,
  menuSubtitle: TOPIC_SUBTITLES.apzvalga,
  kind: 'overview',
  files: ['meta', 'loots', 'limits', 'damages', 'wolves'],
  // Apžvalga always shows the season of the real Vilnius day (§4.4: the season chip is
  // disabled); `sel.season` is not read.
  seasons: seasonsDesc,
  seasonState: () => 'vyksta',
  defaultSeason: (_meta, today) => overviewSeason(today),
  dims: [],
  defaultTable: '',
  about,
  aboutCommon,
};

export default apzvalga;
