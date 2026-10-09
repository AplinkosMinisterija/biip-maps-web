// Topic registry (SPEC2 §8.1). Every module next to this file (apzvalga, vilkai, laimikiai,
// limitai, zala) exports its TopicDef, as `default` or as a named export; the registry picks
// up each exported TopicDef by its `id`, so a topic cut from P0 (§1) simply drops out.
import { TOPIC_ORDER, TOPIC_SUBTITLES, TOPIC_TABS } from '../strings';
import type { TopicDef, TopicId } from '../types';

const modules = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts'], {
  eager: true,
});

const isTopicDef = (value: unknown): value is TopicDef => {
  const v = value as TopicDef | null;
  return (
    !!v &&
    typeof v === 'object' &&
    TOPIC_ORDER.indexOf(v.id) >= 0 &&
    typeof v.seasons === 'function' &&
    typeof v.defaultSeason === 'function' &&
    Array.isArray(v.files)
  );
};

// No prototype: `?tema=constructor` must not find Object.prototype members.
const found: Partial<Record<TopicId, TopicDef>> = Object.create(null);
Object.keys(modules).forEach((path) => {
  const exports = modules[path];
  Object.keys(exports).forEach((name) => {
    const value = exports[name];
    if (isTopicDef(value) && !found[value.id]) found[value.id] = value;
  });
});

/** Registered topics in tab order. */
export const TOPICS: TopicDef[] = TOPIC_ORDER.filter((id) => found[id]).map((id) => found[id]!);

export const hasTopic = (id: unknown): id is TopicId =>
  typeof id === 'string' && TOPIC_ORDER.indexOf(id as TopicId) >= 0 && !!found[id as TopicId];

/** Topic shown without `tema`: Apžvalga, or Vilkai when Apžvalga is cut (§1). */
export const DEFAULT_TOPIC: TopicId = hasTopic('apzvalga')
  ? 'apzvalga'
  : hasTopic('vilkai')
    ? 'vilkai'
    : (TOPICS[0]?.id ?? 'apzvalga');

// Stand-in while no topic module is registered (a partial build): an empty overview.
const placeholder = (id: TopicId): TopicDef => ({
  id,
  tab: TOPIC_TABS[id],
  menuSubtitle: TOPIC_SUBTITLES[id],
  kind: 'overview',
  files: ['meta'],
  seasons: (meta) => meta.seasons.map((s) => s.season).sort((a, b) => b - a),
  seasonState: () => 'galutinis',
  defaultSeason: (_meta, today) => {
    const year = Number(today.slice(0, 4));
    return Number(today.slice(5, 7)) >= 4 ? year : year - 1;
  },
  dims: [],
  defaultTable: '',
  about: { source: [], meaning: [], missing: [], compare: [] },
});

/** The topic for an id; unknown ids fall back to the default topic. */
export function getTopic(id: unknown): TopicDef {
  if (hasTopic(id)) return found[id]!;
  return found[DEFAULT_TOPIC] || placeholder(DEFAULT_TOPIC);
}
