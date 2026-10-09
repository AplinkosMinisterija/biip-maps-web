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
    // T2 addition (optional): E1 fetch duration in ms, shown in DebugPanel.
    fetchMs?: Ref<number | null>;
    // Integration additions (optional, provided by useWolvesData): set after a stale
    // cache was refreshed in the background; E3 failure flag for DebugPanel.
    refreshedAt?: Ref<Date | null>;
    seasonsFailed?: Ref<boolean>;
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
    // T2 additions. `select(ids, { zoom: true })` bumps `zoomRequest`; the map
    // (T4) watches it and centres on those ids. `returnFocus` is the element
    // that was focused when `select()` ran, for Esc to return focus to (§8.3).
    zoomRequest: Ref<{ ids: string[]; seq: number } | null>;
    returnFocus: Ref<HTMLElement | null>;
  };
  derived: {
    filtered: ComputedRef<WolfRecord[]>;
    intervalSeason: ComputedRef<number | null>; // season start if interval == one full season
    defaultSeason: ComputedRef<number>;
    histogram: ComputedRef<HistogramBin[]>;
    status: ComputedRef<StatusModel>;
    sentence: ComputedRef<string>; // the full "Rodoma: …" text
    // T2 additions.
    periodLabel: ComputedRef<string>; // '2025/2026 sezonas', '2025-12-01 – 2026-01-31', …
    seasonList: ComputedRef<number[]>; // preset seasons, newest first (cur … first data season)
    isDefaultView: ComputedRef<boolean>; // interval == default season and no sav/attrs
  };
  isMobile: Ref<boolean>; // matchMedia('(max-width: 767px)')
  debug: boolean; // ?debug=1
}
export const WOLVES_CTX: InjectionKey<WolvesContext> = Symbol('huntingWolves');
