import { computed } from 'vue';
import type { HubContext } from '@/composables/hunting/hub/context';
import type { Badge, SeasonState } from '@/utils/hunting/hub/types';
import { seasonLabel } from '@/utils/hunting/dates';

export interface SeasonOption {
  season: number;
  label: string;
  badge?: Badge;
}

const BADGE_OF: Record<SeasonState, Badge | undefined> = {
  vyksta: 'vyksta',
  preliminarus: 'preliminarus',
  dalinis: 'dalinis',
  galutinis: undefined,
};

// Seasons the active topic offers, newest first, with the badge of each non-final one.
export function useSeasonOptions(ctx: HubContext) {
  return computed<SeasonOption[]>(() => {
    const meta = ctx.data.snapshot.value?.meta;
    const topic = ctx.topic.value;
    if (!meta) return [];
    return topic.seasons(meta).map((season) => ({
      season,
      label: seasonLabel(season),
      badge: BADGE_OF[topic.seasonState(season, meta)],
    }));
  });
}
