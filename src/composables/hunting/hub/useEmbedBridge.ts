// postMessage bridge between the embedded hub and the WordPress "Medžioklės duomenys" page
// (SPEC §5.4). Called by the route (`src/routes/hunting/data.vue`) after provide(), only in
// embed mode with a validated parent origin; on the production host ctx is null and this
// never runs.
//
// iframe → WP: one `ready` per document load, then `state` (debounced, deduplicated), and
// `aboutClosed` when the About dialog WP opened is closed inside the frame.
// WP → iframe: `set` (topic and/or map/table view, optionally the table) and `about`.
import { onMounted, onScopeDispose, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { HubContext } from '@/composables/hunting/hub/context';
import { setTableOpen, type HubShell } from '@/components/hunting/hub/shell/shell';
import {
  aboutClosedMessage,
  parseCommand,
  readyMessage,
  stateMessage,
  stateQuery,
  type EmbedProvenance,
  type EmbedState,
  type EmbedView,
} from '@/utils/hunting/hub/embed';
import { S, TOPIC_TABS } from '@/utils/hunting/hub/strings';
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

  // The view (and table) a `set` asked for on the live topic before its controls
  // registered. Applied at most once (when the next controls register) and cleared by every
  // `set`, so a stale request never reaches a later visit of the topic.
  let pendingLive: { view: EmbedView; table?: string } | null = null;

  function onMessage(e: MessageEvent) {
    if (e.source !== window.parent || e.origin !== parentOrigin) return;
    const cmd = parseCommand(e.data);
    if (!cmd) return;
    if (cmd.type === 'about') {
      // Closed by the user inside the frame: WP takes focus back to its button.
      ctx.openAbout(undefined, {
        onClose: (byUser) => {
          if (byUser) post(aboutClosedMessage());
        },
      });
      return;
    }
    // The dialog's backdrop covers only the frame: a WP tab or switch click changes what is
    // behind it, so close it (focus stays on the WP control).
    ctx.closeAbout();
    pendingLive = null;
    // Every `set` gets a `state` answer, also when it changes nothing: WP waits for one.
    answerNextState();
    // The table of the page's history entry (Back/Forward), else the topic's default one.
    const table = cmd.view === 'table' ? cmd.lentele : undefined;
    if (cmd.tema && cmd.tema !== ctx.sel.value.topic) {
      ctx.setTopic(cmd.tema, { openTable: cmd.view === 'table', table });
      if (getTopic(cmd.tema).kind === 'live' && cmd.view) pendingLive = { view: cmd.view, table };
      return;
    }
    if (!cmd.view) return;
    const open = cmd.view === 'table';
    const kind = ctx.topic.value.kind;
    if (kind === 'snapshot') {
      // An unavailable table falls back to the default one (§5.9).
      if (table) ctx.setTable(table);
      else setTableOpen(ctx, open);
    } else if (kind === 'live') {
      const live = ctx.embedLive.value;
      if (live) live.setTableOpen(open, table);
      else pendingLive = { view: cmd.view, table };
    }
    // Overview: no map/table view, ignored.
  }

  window.addEventListener('message', onMessage);
  onScopeDispose(() => window.removeEventListener('message', onMessage));

  watch(ctx.embedLive, (controls) => {
    // A switch between two live topics first unregisters the old host (null): keep the
    // request for the host that registers next.
    if (!controls) return;
    if (pendingLive) controls.setTableOpen(pendingLive.view === 'table', pendingLive.table);
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
    // The live topic's open table comes from its controls: `sel.table` follows the wolves
    // state's URL write, which comes after this debounce.
    const live = kind === 'live' ? ctx.embedLive.value : null;
    const table = live ? live.table.value : sel.table;
    const view: EmbedView | null = overview ? null : table !== null ? 'table' : 'map';

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
      if (table !== null && view === 'table') out.lentele = table;
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
    // `text` (D12a): the one provenance line of the page, shown in the WP header only.
    if (overview) {
      const asOf = ctx.data.snapshot.value?.meta?.snapshotDate || null;
      provenance = {
        kind: 'snapshot',
        asOf,
        environment,
        text: asOf ? S.provenanceOverview(asOf) : undefined,
      };
    } else if (kind === 'live') {
      // The Vilkai snapshot fallback reports the copy it shows, not live data.
      const p = live?.provenance.value;
      provenance = { kind: p?.kind ?? 'live', asOf: p?.asOf || null, environment, text: p?.text };
    } else {
      const p = ctx.view.value?.provenance;
      provenance = {
        kind: p?.kind ?? 'snapshot',
        asOf: p?.asOf || null,
        environment,
        text: p?.text,
      };
    }

    return { tema, view, hasTable, title: TOPIC_TABS[tema], query, shareQuery, provenance };
  }

  // `ready` goes first: the route can mount later than the state debounce (async child
  // components), so a change during setup must not post a state before it.
  let readySent = false;
  let lastSent = '';
  let stateTimer: ReturnType<typeof setTimeout> | undefined;
  function postState() {
    clearTimeout(stateTimer);
    stateTimer = undefined;
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

  const schedulePost = () => {
    clearTimeout(stateTimer);
    stateTimer = setTimeout(postState, STATE_DEBOUNCE_MS);
  };
  // A `set` that leaves the hub as it was (two sets that cancel out within the debounce, or
  // one for the state already shown) would otherwise post nothing, and WP would take the
  // next in-frame change for the answer. Forget the last message, so the next post goes out.
  function answerNextState() {
    lastSent = '';
    schedulePost();
  }
  onScopeDispose(() => clearTimeout(stateTimer));

  onMounted(() => {
    post(readyMessage());
    readySent = true;
    postState();
  });

  watch(
    [
      () => route.fullPath,
      () => ctx.sel.value.topic,
      () => ctx.sel.value.table,
      () => ctx.view.value?.tables.length ?? -1,
      () => ctx.embedLive.value,
      () => ctx.embedLive.value?.hasTable.value,
      () => ctx.embedLive.value?.table.value,
      () => ctx.embedLive.value?.provenance.value.kind,
      () => ctx.embedLive.value?.provenance.value.asOf,
      () => ctx.embedLive.value?.provenance.value.text,
      () => ctx.view.value?.provenance.text,
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
    schedulePost,
  );
}
