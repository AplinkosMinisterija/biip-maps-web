// Apžvalga: the landing cards, one per topic (SPEC2 §6.1). Card texts come from the same pure
// functions as the topic panels, so the numbers cannot disagree. The wolf card reads only the
// hand-maintained official figures (`meta.static.wolves`) and the real Vilnius day: staging's
// live wolves never mix with production numbers (§0.10).
import { seasonOfDay } from '../../dates';
import { ATTRIBUTION_RULE, TOPIC_SUBTITLES, TOPIC_TABS } from '../strings';
import type { TopicDef } from '../types';
import { seasonsDesc } from './common';

// The current season by the real Vilnius day (§3.3); Apžvalga never shows older seasons.
// The cards themselves come from each topic's `overview()` (Vilkai: topics/vilkai.ts).
export const overviewSeason = (today: string) => seasonOfDay(today);

export const about = {
  source: [
    'Kortelės rodo tuos pačius skaičius kaip temų skiltys: BĮIP duomenų momentinę kopiją ir oficialius AM skaičius apie vilkus.',
  ],
  meaning: [
    'Kiekviena kortelė atsako į vieną klausimą apie einamąjį sezoną; ankstesni sezonai – temų skiltyse.',
    ATTRIBUTION_RULE,
  ],
  missing: ['Asmens duomenų, MPV lygmens duomenų, tikslių vietų ir datų.'],
  compare: ['Žr. kiekvienos temos „Apie duomenis“.'],
};

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
};

export default apzvalga;
