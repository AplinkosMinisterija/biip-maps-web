// Stebėjimai topic of the hunting data hub (STEB-SPEC §4.1, §3.8): citizen reports of
// observed wolves, lynx, bears and bison. The tab is live (`kind: 'live'`): the route mounts
// `HuntingHubTopicsStebejimaiStebejimaiTopic` (LIVE_HOSTS), which loads the records from the
// environment's public proxy and owns its filters, URL keys, map layers, tables and card.
// This module holds only the TopicDef: the hub's registry entry, seasons for a topic
// switch and the About texts. No snapshot view, no Apžvalga card, no "Kiti rodikliai" row.
import { seasonOfDay } from '@/utils/hunting/dates';
import { ABOUT_LOCALE_RULE, TOPIC_SUBTITLES, TOPIC_TABS } from '../strings';
import type { AboutDef, Meta, SeasonState, TopicDef } from '../types';
import { seasonsDesc } from './common';

const currentSeasonOf = (meta: Meta) =>
  meta.seasons.find((s) => s.current)?.season ?? seasonOfDay(meta.snapshotDate);

function stebejimaiSeasonState(season: number, meta: Meta): SeasonState {
  return season >= currentSeasonOf(meta) ? 'vyksta' : 'galutinis';
}

const about: AboutDef = {
  source: [
    'BĮIP Medžioklės sistemoje užregistruoti pranešimai apie stebėtus vilkus, lūšis, lokius ir ' +
      'stumbrus.',
    'Duomenys gaunami tiesiogiai iš BĮIP kiekvieną kartą atidarius šią temą.',
  ],
  meaning: [
    'Vienas įrašas – vienas pranešimas: kada ir kur gyvūnas stebėtas, kokia rūšis, kiek gyvūnų ir ' +
      'kas pastebėta (gyvas gyvūnas, pėdsakai, balsas ir kt.).',
    'Taškas žemėlapyje – pranešime nurodyta vieta. Savivaldybė, seniūnija ir medžioklės plotų ' +
      'vienetas (MPV) rodomi taip, kaip įrašyti BĮIP.',
    'Data ir laikas rodomi Lietuvos laiku.',
    'Duomenys rodomi tokie, kokie pateikti, be perskaičiavimų.',
  ],
  missing: [
    'Pranešėjų vardai, telefonai, el. pašto adresai, pastabos ir nuotraukos neskelbiami.',
    'Plėšrūnų užpulti gyvūnai nurodomi įrašo puslapyje (nuoroda „Peržiūrėti įrašą“).',
  ],
  compare: [
    'Įrašo puslapis medžioklės svetainėje rodo tą patį įrašą.',
    'Ankstesnis žemėlapis rodė tuos pačius pranešimus sluoksnyje „Stebėti gyvūnai“.',
  ],
};

// Replaces the default "Bendros taisyklės" lines, which promise sums without MPV or exact
// places: this topic shows every record at its reported point (owner decision 2026-10-20).
const aboutCommon = [
  ABOUT_LOCALE_RULE,
  'Asmens duomenys neskelbiami: pranešėjų vardai ir kontaktai nerodomi.',
];

export const stebejimai: TopicDef = {
  id: 'stebejimai',
  tab: TOPIC_TABS.stebejimai,
  menuSubtitle: TOPIC_SUBTITLES.stebejimai,
  kind: 'live',
  // Meta only: municipality names and codes for the place filter and the season list.
  files: ['meta'],
  seasons: seasonsDesc,
  seasonState: stebejimaiSeasonState,
  defaultSeason: (_meta, today) => seasonOfDay(today),
  dims: [],
  defaultTable: 'irasai',
  about,
  aboutCommon,
};

export default stebejimai;
