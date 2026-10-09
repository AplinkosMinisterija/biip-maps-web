// Loads the hub's snapshot files on demand (SPEC2 §8.3, §8.4). `ensure(files)` fetches what
// is missing (meta always) and merges it into one `SnapshotData`. `phase` describes the
// files the current topic needs (`primary`), so a background load (the area card's
// "Kiti rodikliai čia") never blanks the panel. All files must come from the same snapshot
// day; a mix (a half-finished deploy) is an error, never a partial number (§5).
import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue';
import { adapters, resetAdapters } from '@/utils/hunting/hub/adapters';
import type { HubContext } from '@/composables/hunting/hub/context';
import type { SnapshotData, SnapshotFile } from '@/utils/hunting/hub/types';

export const SLOW_AFTER_MS = 400;

type FileStatus = 'loading' | 'ready' | 'error';

export function useSnapshot(
  opts: {
    // Files the visible topic needs; defaults to the files of the last `ensure` call.
    primary?: () => SnapshotFile[];
  } = {},
): HubContext['data'] {
  const snapshot = shallowRef<SnapshotData | null>(null);
  const status = ref<Partial<Record<SnapshotFile, FileStatus>>>({});
  const slow = ref(false);
  const lastRequested = ref<SnapshotFile[]>(['meta']);
  const controller = new AbortController();
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  // Loaded parts not yet merged (they wait for meta, which carries the snapshot day).
  const parts: Partial<SnapshotData> = {};
  const dates: Partial<Record<SnapshotFile, string>> = {};
  const inflight = new Map<SnapshotFile, Promise<void>>();

  const withMeta = (files: SnapshotFile[]) => Array.from(new Set<SnapshotFile>(['meta', ...files]));
  const primary = () => withMeta(opts.primary ? opts.primary() : lastRequested.value);

  const phase = computed<'idle' | 'loading' | 'slow' | 'ready' | 'error'>(() => {
    const files = primary();
    const states = files.map((f) => status.value[f]);
    if (states.some((s) => s === 'error')) return 'error';
    if (states.some((s) => s === 'loading')) return slow.value ? 'slow' : 'loading';
    if (states.every((s) => s === 'ready')) return 'ready';
    return 'idle';
  });

  function setStatus(file: SnapshotFile, value: FileStatus | undefined) {
    const next = { ...status.value };
    if (value) next[file] = value;
    else delete next[file];
    status.value = next;
    const loading = Object.values(next).some((s) => s === 'loading');
    if (loading && !slowTimer && !slow.value) {
      slowTimer = setTimeout(() => {
        slowTimer = undefined;
        if (Object.values(status.value).some((s) => s === 'loading')) slow.value = true;
      }, SLOW_AFTER_MS);
    } else if (!loading) {
      clearTimeout(slowTimer);
      slowTimer = undefined;
      slow.value = false;
    }
  }

  // Publish every loaded part from the same snapshot day as meta.
  function publish() {
    const meta = parts.meta;
    if (!meta) return;
    const next: SnapshotData = { ...(snapshot.value || {}), meta };
    let changed = snapshot.value?.meta !== meta;
    (Object.keys(parts) as SnapshotFile[]).forEach((file) => {
      if (file === 'meta' || (next as any)[file] === (parts as any)[file]) return;
      if (dates[file] !== meta.snapshotDate) {
        // eslint-disable-next-line no-console
        console.warn(
          `[hunting/hub] ${file}.json is from ${dates[file]}, meta from ${meta.snapshotDate}`,
        );
        delete (parts as any)[file];
        resetAdapters(file);
        setStatus(file, 'error');
        return;
      }
      (next as any)[file] = (parts as any)[file];
      changed = true;
    });
    if (changed) snapshot.value = next;
  }

  function load(file: SnapshotFile): Promise<void> {
    const running = inflight.get(file);
    if (running) return running;
    setStatus(file, 'loading');
    const adapter = adapters[file] as (signal: AbortSignal) => Promise<{
      snapshotDate: string;
      value: unknown;
    }>;
    const promise = adapter(controller.signal)
      .then(
        (loaded) => {
          (parts as any)[file] = loaded.value;
          dates[file] = loaded.snapshotDate;
          setStatus(file, 'ready');
          publish();
        },
        (err) => {
          if (controller.signal.aborted) return;
          // eslint-disable-next-line no-console
          console.warn(`[hunting/hub] loading ${file}.json failed`, err);
          setStatus(file, 'error');
        },
      )
      .finally(() => inflight.delete(file));
    inflight.set(file, promise);
    return promise;
  }

  const isLoaded = (file: SnapshotFile) =>
    status.value[file] === 'ready' &&
    (file === 'meta' ? !!snapshot.value : !!(snapshot.value as any)?.[file]);

  async function ensure(files: SnapshotFile[]) {
    const wanted = withMeta(files);
    if (!opts.primary) lastRequested.value = wanted;
    await Promise.all(wanted.filter((f) => !isLoaded(f) && status.value[f] !== 'error').map(load));
  }

  // "Bandyti dar kartą": refetch every failed file the view needs.
  function reload() {
    const failed = (Object.keys(status.value) as SnapshotFile[]).filter(
      (f) => status.value[f] === 'error',
    );
    failed.forEach((f) => {
      resetAdapters(f);
      setStatus(f, undefined);
    });
    ensure(primary());
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      controller.abort();
      clearTimeout(slowTimer);
    });
  }

  return { phase, snapshot, reload, ensure };
}
