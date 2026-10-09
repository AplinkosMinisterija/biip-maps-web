import type { ComputedRef, InjectionKey, Ref, ShallowRef } from 'vue';
import type {
  ChoroplethDef,
  HubSelection,
  SnapshotData,
  SnapshotFile,
  TopicDef,
  TopicId,
  TopicView,
} from '@/utils/hunting/hub/types';

// A choropleth a live topic asks the hub to draw (the Vilkai snapshot fallback): its
// definition, the place it shows, and how a click selects a place.
export interface LiveMap {
  def: ChoroplethDef;
  sav: number | null;
  select(code: number | null): void;
}

// Shared state of the hunting data hub (SPEC2 §8.2). Created once by the route
// (`src/routes/hunting/data.vue`) and provided under HUB_CTX, as the wolves page does
// with WOLVES_CTX.
export interface HubContext {
  today: string; // real Vilnius day 'yyyy-MM-dd'
  isProductionHost: boolean; // hostname === 'maps.biip.lt'
  isStagingHost: boolean;
  isMobile: Ref<boolean>; // < 768 px
  isWide: Ref<boolean> /* ≥1280 */;
  debug: boolean; // ?debug=1
  sel: Ref<HubSelection>;
  topic: ComputedRef<TopicDef>;
  data: {
    phase: Ref<'idle' | 'loading' | 'slow' | 'ready' | 'error'>;
    snapshot: ShallowRef<SnapshotData | null>;
    reload(): void;
    ensure(files: SnapshotFile[]): Promise<void>;
  };
  view: ComputedRef<TopicView | null>;
  notice: Ref<string | null>;
  // Set by a live topic while it needs the hub choropleth (null otherwise).
  liveMap: ShallowRef<LiveMap | null>;
  // `mapPadding` is [top, right, bottom, left] in px, see `utils/hunting/hub/layout.ts`.
  layout: { railed: Ref<boolean>; mapPadding: ComputedRef<number[]> };
  setTopic(id: TopicId): void;
  setSeason(s: number): void;
  setSav(code: number | null): void;
  setDim(key: string, value: string | null): void;
  setTable(tab: string | null): void;
  shareUrl(): string;
  openAbout(topic?: TopicId): void;
}
export const HUB_CTX: InjectionKey<HubContext> = Symbol('huntingHub');
