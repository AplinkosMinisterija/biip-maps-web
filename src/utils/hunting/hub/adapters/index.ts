// The data source of the hub. P0 reads the committed snapshot files; phase 2 swaps single
// entries for API adapters returning the same tables (SPEC2 §8.4, §15).
import { clearSnapshotCache, snapshotAdapters, type Adapters } from './snapshot';

export type { Adapter, Adapters, Loaded } from './snapshot';
export { clearSnapshotCache, loadSnapshotFile, zip } from './snapshot';

export const adapters: Adapters = snapshotAdapters;

/** Forget cached files before a retry. */
export const resetAdapters = clearSnapshotCache;
