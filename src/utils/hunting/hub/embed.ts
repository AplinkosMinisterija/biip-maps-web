// Contract of the hub embedded in the WordPress "Medžioklės duomenys" page (SPEC §5): the
// parent origin allowlist (§5.5), the query keys passed between the page and the hub (§5.1),
// the table ids and topic-owned keys (§5.9) and the postMessage envelope (§5.4). Pure
// functions without Vue reactivity, so ?debug=1 can test them; the WP side keeps a copy.
import { hasTopic } from '@/utils/hunting/hub/topics';
import type { TopicId } from '@/utils/hunting/hub/types';
import { WOLVES_KEYS, queryString, type Query } from '@/utils/hunting/hub/url';

export const EMBED_VERSION = 1;
export const EMBED_KEY = 'biipHunting';

// WP hosts allowed to embed the hub; a new host needs a change here.
export const EMBED_PARENT_ORIGINS = [
  'https://medziokle.biip.lt',
  'https://staging-medziokle.biip.lt',
  'https://dev-medziokle.biip.lt',
];

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
// Same value as PRODUCTION_HOST in useHubState; repeated so this module stays free of Vue.
const PRODUCTION_MAPS_HOST = 'maps.biip.lt';

/** An allowlisted parent origin; local origins only off the production maps host. */
export function isAllowedParent(origin: string, hostname: string): boolean {
  if (typeof origin !== 'string') return false;
  if (EMBED_PARENT_ORIGINS.indexOf(origin) >= 0) return true;
  return hostname !== PRODUCTION_MAPS_HOST && LOCAL_ORIGIN.test(origin);
}

function originOf(value: string): string | null {
  try {
    const origin = new URL(value).origin;
    return origin && origin !== 'null' ? origin : null;
  } catch {
    return null;
  }
}

/**
 * Origin the hub may post to (§5.5): the `parent` query value when it is exactly an
 * allowlisted origin (a trailing '/' tolerated), else the referrer's origin when it is
 * allowlisted, else null (the bridge stays inactive and nothing is posted).
 */
export function resolveParentOrigin(
  parentParam: string | undefined,
  referrer: string,
  hostname: string,
): string | null {
  if (typeof parentParam === 'string' && parentParam) {
    const origin = originOf(parentParam);
    if (origin && origin === parentParam.replace(/\/$/, '') && isAllowedParent(origin, hostname)) {
      return origin;
    }
  }
  if (typeof referrer === 'string' && referrer) {
    const origin = originOf(referrer);
    if (origin && isAllowedParent(origin, hostname)) return origin;
  }
  return null;
}

export const isEmbedQuery = (query: Query) => queryString(query, 'embed') === '1';

// Keys passed between the WP page URL and the hub, each with the regex its value must match
// (§5.1; the WP-only `senoji` is never passed). No prototype: a URL key such as
// `constructor` or `__proto__` must not find Object.prototype members.
export const PASS_KEYS: Readonly<Record<string, RegExp>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, RegExp>, {
    tema: /^(apzvalga|vilkai|laimikiai|limitai|zala|stebejimai)$/,
    lentele: /^[a-z]{3,20}$/,
    sezonas: /^\d{4}-\d{4}$/,
    sav: /^\d{1,3}$/,
    rusis: /^[a-z0-9-]{1,40}$/,
    rodiklis: /^(panaudota|tankis)$/,
    grupe: /^[a-z]{3,20}$/,
    nuo: /^\d{4}-\d{2}-\d{2}$/,
    iki: /^\d{4}-\d{2}-\d{2}$/,
    laikotarpis: /^(30d|visi)$/,
    amzius: /^[A-Za-z_,]{1,80}$/,
    lytis: /^[A-Za-z_,]{1,80}$/,
    budas: /^[A-Za-z_,]{1,80}$/,
    x: /^-?\d{1,8}(\.\d{1,6})?$/,
    y: /^-?\d{1,8}(\.\d{1,6})?$/,
    z: /^\d{1,2}(\.\d{1,3})?$/,
    debug: /^1$/,
  }),
);

/**
 * The PASS_KEYS part of a query whose string values match their regex (§5.1 regex filter
 * only; the hub does its own table fallback). `embed`, `parent`, unknown keys and arrays
 * are never included.
 */
export function stateQuery(query: Query): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([key, value]) =>
        Object.prototype.hasOwnProperty.call(PASS_KEYS, key) &&
        typeof value === 'string' &&
        PASS_KEYS[key].test(value),
    ),
  ) as Record<string, string>;
}

// Table ids (`lentele` values) and topic-owned keys per iframe topic (§5.9). WP keeps a
// commented copy in `biip_hunting_hub_topics()`; ?debug=1 checks they agree.
const EMBED_TOPIC_DEFS = {
  vilkai: {
    defaultTable: 'irasai',
    tables: ['irasai', 'sezonai', 'savivaldybes'],
    keys: WOLVES_KEYS.filter((key) => key !== 'lentele'),
  },
  laimikiai: {
    defaultTable: 'rusys',
    tables: ['rusys', 'vietoves'],
    keys: ['sezonas', 'sav', 'rusis'],
  },
  limitai: {
    defaultTable: 'savivaldybes',
    tables: ['savivaldybes', 'sezonai'],
    keys: ['sezonas', 'sav', 'rodiklis'],
  },
  zala: {
    defaultTable: 'savivaldybes',
    tables: ['savivaldybes', 'menesiai', 'gyvuliai'],
    keys: ['sezonas', 'sav', 'grupe'],
  },
} as const;

// No prototype, as PASS_KEYS: `EMBED_TOPICS[id]` is undefined for anything but these ids.
export const EMBED_TOPICS: typeof EMBED_TOPIC_DEFS = Object.freeze(
  Object.assign(Object.create(null), EMBED_TOPIC_DEFS),
);
export type EmbedTopicId = keyof typeof EMBED_TOPIC_DEFS;

export type EmbedView = 'map' | 'table';

// Commands WP sends to the hub (§5.4).
export type EmbedCommand = { type: 'set'; tema?: TopicId; view?: EmbedView } | { type: 'about' };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';
const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
// An absent field: missing, or explicitly undefined/null (WP sends `view: null` for Apžvalga).
const absent = (obj: Record<string, unknown>, key: string) =>
  !hasOwn(obj, key) || obj[key] === undefined || obj[key] === null;

/**
 * A validated command from the parent page, or null. The result is a new object built
 * only from the validated fields; message values are never used as property names.
 * The caller checks `event.source` and `event.origin` first.
 */
export function parseCommand(data: unknown): EmbedCommand | null {
  if (!isPlainObject(data) || !hasOwn(data, EMBED_KEY)) return null;
  const msg = data[EMBED_KEY];
  if (!isPlainObject(msg)) return null;
  if (!hasOwn(msg, 'v') || msg.v !== EMBED_VERSION) return null;
  if (msg.type === 'about') return { type: 'about' };
  if (msg.type !== 'set') return null;

  const command: { type: 'set'; tema?: TopicId; view?: EmbedView } = { type: 'set' };
  if (!absent(msg, 'tema')) {
    const tema = msg.tema;
    if (!hasTopic(tema)) return null;
    command.tema = tema;
  }
  if (!absent(msg, 'view')) {
    const view = msg.view;
    if (view !== 'map' && view !== 'table') return null;
    command.view = view;
  }
  return command;
}

export interface EmbedProvenance {
  kind: 'snapshot' | 'live';
  asOf: string | null; // 'yyyy-MM-dd'
  environment: 'production' | 'staging' | 'other';
}

// Payload of the `state` message the hub posts to the parent page (§5.4).
export interface EmbedState {
  tema: TopicId;
  view: EmbedView | null; // null for Apžvalga
  hasTable: boolean;
  title: string;
  query: Record<string, string>;
  shareQuery: Record<string, string>;
  provenance: EmbedProvenance;
}

export const readyMessage = () => ({
  biipHunting: { v: EMBED_VERSION, type: 'ready' as const },
});

// Plain copies of the nested objects, so a reactive proxy never reaches postMessage.
export const stateMessage = (s: EmbedState) => ({
  biipHunting: {
    v: EMBED_VERSION,
    type: 'state' as const,
    tema: s.tema,
    view: s.view,
    hasTable: s.hasTable,
    title: s.title,
    query: { ...s.query },
    shareQuery: { ...s.shareQuery },
    provenance: {
      kind: s.provenance.kind,
      asOf: s.provenance.asOf,
      environment: s.provenance.environment,
    },
  },
});

/** In embed, the hub moves focus only while its own document has focus (§5.8). */
export const embedFocusAllowed = (embed: boolean) => !embed || document.hasFocus();
