import type { InjectionKey, Ref, ComputedRef } from 'vue';
import type {
  Interval,
  PresetId,
  SeasonInfo,
  StatusModel,
  WolfRecord,
  WolfTotals,
  WolvesDataset,
  HistogramBin,
} from '@/utils/hunting/types';
export interface WolvesContext {
  today: string; // local 'yyyy-MM-dd'
  currentSeason: number;
  data: {
    phase: Ref<'loading' | 'slow' | 'ready' | 'error'>;
    dataset: Ref<WolvesDataset | null>;
    totals: Ref<WolfTotals | null>;
    totalsFailed: Ref<boolean>;
    seasons: Ref<SeasonInfo[]>;
    fetchedAt: Ref<Date | null>;
    fromCache: Ref<'fresh' | 'stale' | null>;
    error: Ref<string | null>;
    reload(): void;
    reloadTotals(): void;
  };
  state: {
    interval: Ref<Interval>;
    preset: Ref<PresetId>;
    history: Ref<Interval[]>;
    tableOpen: Ref<boolean>;
    tableTab: Ref<'irasai' | 'sezonai' | 'savivaldybes'>;
    selection: Ref<{ ids: string[]; index: number } | null>;
    sav: Ref<number | null>;
    attrs: Ref<{ age: string[]; sex: string[]; method: string[] }>;
    mapExtent3346: Ref<[number, number, number, number] | null>;
    setInterval(i: Interval, preset?: PresetId, pushHistory?: boolean): void;
    back(): void;
    reset(): void;
    select(ids: string[], opts?: { zoom?: boolean }): void;
    clearSelection(): void;
  };
  derived: {
    filtered: ComputedRef<WolfRecord[]>;
    intervalSeason: ComputedRef<number | null>; // season start if interval == one full season
    defaultSeason: ComputedRef<number>;
    histogram: ComputedRef<HistogramBin[]>;
    status: ComputedRef<StatusModel>;
    sentence: ComputedRef<string>; // the full "Rodoma: …" text
  };
  isMobile: Ref<boolean>; // matchMedia('(max-width: 767px)')
}
export const WOLVES_CTX: InjectionKey<WolvesContext> = Symbol('huntingWolves');
