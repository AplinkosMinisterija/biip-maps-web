// postMessage bridge between the embedded hub and the WordPress "Medžioklės duomenys" page
// (SPEC §5.4). Called by the route (`src/routes/hunting/data.vue`) after provide(), only in
// embed mode with a validated parent origin; on the production host ctx is null and this
// never runs.
//
// iframe → WP: one `ready` per document load, then `state` (debounced, deduplicated).
// WP → iframe: `set` (topic and/or map/table view) and `about`.
import { onMounted, onScopeDispose, watch } from 'vue';
import { useRoute } from 'vue-router';
import { watchDebounced } from '@vueuse/core';
import type { HubContext } from '@/composables/hunting/hub/context';
import { setTableOpen, type HubShell } from '@/components/hunting/hub/shell/shell';
import {
  parseCommand,
  readyMessage,
  stateMessage,
  stateQuery,
  type EmbedProvenance,
  type EmbedState,
  type EmbedView,
} from '@/utils/hunting/hub/embed';
import { TOPIC_TABS } from '@/utils/hunting/hub/strings';
import { getTopic } from '@/utils/hunting/hub/topics';

// Debounce of outgoing `state` messages (§5.4).
const STATE_DEBOUNCE_MS = 150;

export function useEmbedBridge(ctx: HubContext, shell: HubShell | null): void {
  if (!ctx.embed || !ctx.parentOrigin) return;
  // Not inside a frame: there is no parent page to talk to.
  if (window.parent === window) return;
  const parentOrigin = ctx.parentOrigin;
  const route = useRoute();

  const post = (msg: unknown) => {
    try {
      window.parent.postMessage(msg, parentOrigin);
    } catch (err) {
      // A detached or navigating parent: nothing to do, WP falls back after its timeout.
    }
  };

  // The view a `set` asked for on the live topic before its controls registered. Applied at
  // most once (when `embedLive` next changes) and cleared by every `set`, so a stale request
  // never reaches a later visit of the topic.
  let pendingLive: EmbedView | null = null;

  function onMessage(e: MessageEvent) {
    if (e.source !== window.parent || e.origin !== parentOrigin) return;
    const cmd = parseCommand(e.data);
    if (!cmd) return;
    if (cmd.type === 'about') {
      ctx.openAbout();
      return;
    }
    pendingLive = null;
    if (cmd.tema && cmd.tema !== ctx.sel.value.topic) {
      ctx.setTopic(cmd.tema, { openTable: cmd.view === 'table' });
      if (getTopic(cmd.tema).kind === 'live' && cmd.view) pendingLive = cmd.view;
      return;
    }
    if (!cmd.view) return;
    const open = cmd.view === 'table';
    const kind = ctx.topic.value.kind;
    if (kind === 'snapshot') {
      setTableOpen(ctx, open);
    } else if (kind === 'live') {
      const live = ctx.embedLive.value;
      if (live) live.setTableOpen(open);
      else pendingLive = cmd.view;
    }
    // Overview: no map/table view, ignored.
  }

  window.addEventListener('message', onMessage);
  onScopeDispose(() => window.removeEventListener('message', onMessage));

  watch(ctx.embedLive, (controls) => {
    if (controls && pendingLive) controls.setTableOpen(pendingLive === 'table');
    pendingLive = null;
  });

  // ---- State.

  // The "Dalintis" link: the live topic's own builder when it registered one (period always
  // explicit), else the hub's.
  const shareHref = () =>
    shell?.shareOverride.value ? shell.shareOverride.value() : ctx.shareUrl();

  function buildState(): EmbedState {
    const sel = ctx.sel.value;
    const tema = sel.topic;
    const kind = ctx.topic.value.kind;
    const overview = kind === 'overview';
    const view: EmbedView | null = overview ? null : sel.table !== null ? 'table' : 'map';

    let hasTable: boolean;
    if (overview) hasTable = false;
    else if (kind === 'live')
      hasTable = ctx.embedLive.value ? ctx.embedLive.value.hasTable.value : true;
    else hasTable = ctx.view.value ? ctx.view.value.tables.length > 0 : true;

    // route.query lags the selection by up to URL_DEBOUNCE_MS (300 ms, longer than the
    // 150 ms debounce here) for snapshot topics: `tema` and `lentele` always follow the
    // selection, so `('lentele' in query) === (view === 'table')` and
    // `('tema' in query) === (tema !== 'apzvalga')` hold in every message.
    const consistent = (q: Record<string, string>): Record<string, string> => {
      const out = { ...q };
      delete out.tema;
      delete out.lentele;
      if (tema !== 'apzvalga') out.tema = tema;
      if (sel.table !== null && view === 'table') out.lentele = sel.table;
      return out;
    };

    const query = consistent(stateQuery(route.query));
    let shareQuery: Record<string, string>;
    try {
      const href = shareHref();
      shareQuery = consistent(stateQuery(Object.fromEntries(new URL(href).searchParams)));
    } catch (err) {
      shareQuery = { ...query };
    }

    const environment: EmbedProvenance['environment'] = ctx.isProductionHost
      ? 'production'
      : ctx.isStagingHost
        ? 'staging'
        : 'other';
    let provenance: EmbedProvenance;
    if (overview) {
      provenance = {
        kind: 'snapshot',
        asOf: ctx.data.snapshot.value?.meta?.snapshotDate || null,
        environment,
      };
    } else if (kind === 'live') {
      provenance = { kind: 'live', asOf: null, environment };
    } else {
      const p = ctx.view.value?.provenance;
      provenance = { kind: p?.kind ?? 'snapshot', asOf: p?.asOf || null, environment };
    }

    return { tema, view, hasTable, title: TOPIC_TABS[tema], query, shareQuery, provenance };
  }

  // `ready` goes first: the route can mount later than the state debounce (async child
  // components), so a change during setup must not post a state before it.
  let readySent = false;
  let lastSent = '';
  function postState() {
    if (!readySent) return;
    let msg: ReturnType<typeof stateMessage>;
    try {
      msg = stateMessage(buildState());
    } catch (err) {
      return;
    }
    const json = JSON.stringify(msg);
    if (json === lastSent) return;
    lastSent = json;
    post(msg);
  }

  onMounted(() => {
    post(readyMessage());
    readySent = true;
    postState();
  });

  watchDebounced(
    [
      () => route.fullPath,
      () => ctx.sel.value.topic,
      () => ctx.sel.value.table,
      () => ctx.view.value?.tables.length ?? -1,
      () => ctx.embedLive.value,
      () => ctx.embedLive.value?.hasTable.value,
      // Not in the URL: the overview's snapshot date, and the live topic's share link
      // (registered on mount; its default period can settle after its data loads).
      () => ctx.data.snapshot.value?.meta?.snapshotDate,
      () => {
        try {
          return shareHref();
        } catch (err) {
          return '';
        }
      },
    ],
    postState,
    { debounce: STATE_DEBOUNCE_MS },
  );
}
