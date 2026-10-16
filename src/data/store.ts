import { useSyncExternalStore } from 'react';

import { CHAPTER } from '@/data/config';
import { LAST_AWARDS, PAST_SEASON, SAMPLE_PLAYERS } from '@/data/sample';
import type { AppData, Player } from '@/data/types';
import { detectLang, type Lang } from '@/lib/i18n';
import { nextRound, tally, type Round } from '@/lib/mexicano';
import { haptic, inTelegram, rawInitData, tgUser } from '@/lib/tg';

/**
 * Two modes, same screens:
 * - shared: inside Telegram. Data comes from /api (Netlify function + Supabase), refreshed every few seconds.
 * - preview: in a normal browser. Example players, saved on this device only.
 */
export interface State {
  lang: Lang;
  mode: 'shared' | 'preview';
  data: AppData | null;
  error: string | null;
  busy: boolean;
}

const rawInit = rawInitData;
const MODE: State['mode'] = inTelegram ? 'shared' : 'preview';

const LANG_KEY = 'kindset:lang';
function initialLang(): Lang {
  try { const l = localStorage.getItem(LANG_KEY); if (l === 'ru' || l === 'tr' || l === 'en') return l; } catch { /* empty */ }
  return detectLang(tgUser?.language_code ?? navigator.language);
}

/* ---------- preview mode: local sample data ---------- */
interface Local { registered: string[]; rounds: Round[]; vote: string | null; organizer: boolean }
const LOCAL_KEY = `kindset:${CHAPTER.slug}:preview:v2`;
const ME: Player = {
  id: 'me', name: tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : 'You', level: 3.1,
  langs: (tgUser?.language_code ?? 'en').slice(0, 2).toUpperCase(),
};
const SAMPLE: Record<string, Player> = Object.fromEntries([...SAMPLE_PLAYERS, ME].map((p) => [p.id, p]));
let local: Local = { registered: SAMPLE_PLAYERS.map((p) => p.id), rounds: [], vote: null, organizer: true };
try { const raw = localStorage.getItem(LOCAL_KEY); if (raw) local = { ...local, ...JSON.parse(raw) }; } catch { /* empty */ }

function localData(): AppData {
  const tonight = tally(local.rounds).points;
  const playing = new Set(local.rounds.length ? local.registered.slice(0, CHAPTER.capacity) : []);
  const season = Object.keys(SAMPLE).map((id) => ({
    id, points: (PAST_SEASON[id]?.points ?? 0) + (tonight[id] ?? 0), weeks: (PAST_SEASON[id]?.weeks ?? 0) + (playing.has(id) ? 1 : 0),
  })).filter((r) => r.weeks > 0).sort((a, b) => b.points - a.points);
  return {
    me: ME, role: local.organizer ? 'organizer' : 'player',
    chapter: { slug: CHAPTER.slug, city: CHAPTER.city, currency: CHAPTER.currency, season: CHAPTER.season, raised: CHAPTER.raisedTry },
    event: {
      id: 'preview', startsAt: CHAPTER.nextEvent, durationMin: CHAPTER.durationMin, venue: CHAPTER.venue, price: CHAPTER.priceTry,
      capacity: CHAPTER.capacity, courts: CHAPTER.courts, target: CHAPTER.target, status: local.rounds.length ? 'live' : 'open', charityRaised: 0,
    },
    players: SAMPLE, registered: local.registered, rounds: local.rounds, season, awards: LAST_AWARDS, myVote: local.vote,
  };
}

/* ---------- store ---------- */
let state: State = { lang: initialLang(), mode: MODE, data: MODE === 'preview' ? localData() : null, error: null, busy: false };
const listeners = new Set<() => void>();
function set(patch: Partial<State>) { state = { ...state, ...patch }; listeners.forEach((l) => l()); }
const buzz = haptic;

function saveLocal(next: Partial<Local>) {
  local = { ...local, ...next };
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); } catch { /* empty */ }
  set({ data: localData() });
}

async function call(method: 'GET' | 'POST', body?: object) {
  const res = await fetch('/api', {
    method,
    headers: { 'x-telegram-init-data': rawInit, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    lastDetail = json?.detail ?? `HTTP ${res.status}`;
    throw new Error(json?.error ?? 'server_error');
  }
  if (!json?.chapter || !json?.event || !json?.me) throw new Error('server_error');
  return json as AppData;
}

/** A score change waiting to be sent; refreshes pause meanwhile so taps aren't overwritten. */
let pendingScore: ReturnType<typeof setTimeout> | null = null;
let refreshing = false;
/** Technical reason for the last error, shown small under the message. */
export let lastDetail = '';
async function refresh() {
  if (MODE !== 'shared' || refreshing || pendingScore) return;
  refreshing = true;
  try { set({ data: await call('GET'), error: null }); } catch (e) { set({ error: (e as Error).message }); } finally { refreshing = false; }
}
async function send(body: object) {
  set({ busy: true });
  try { set({ data: await call('POST', body), error: null }); } catch (e) { set({ error: (e as Error).message }); } finally { set({ busy: false }); }
}

if (MODE === 'shared') {
  void refresh();
  setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refresh(); });
}

export function useAppState(): State {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}

/* Score taps update the screen at once and reach the server shortly after. */
function patchMatch(round: number, court: number, fn: (m: Round['matches'][number]) => void) {
  const d = state.data!;
  const rounds: Round[] = JSON.parse(JSON.stringify(d.rounds));
  const m = rounds[round].matches.find((x) => x.court === court)!;
  fn(m);
  return { rounds, m };
}

export const actions = {
  setLang: (lang: Lang) => { try { localStorage.setItem(LANG_KEY, lang); } catch { /* empty */ } set({ lang }); },
  retry: () => void refresh(),
  toggleOrganizer: () => MODE === 'preview' && saveLocal({ organizer: !local.organizer }),
  join: () => { buzz(); return MODE === 'preview'
    ? saveLocal({ registered: local.registered.includes(ME.id) ? local.registered : [...local.registered, ME.id] })
    : send({ action: 'join' }); },
  leave: () => { buzz(); return MODE === 'preview'
    ? saveLocal({ registered: local.registered.filter((id) => id !== ME.id) })
    : send({ action: 'leave' }); },
  vote: (id: string) => { buzz(); const next = state.data?.myVote === id ? null : id;
    return MODE === 'preview' ? saveLocal({ vote: next }) : send({ action: 'vote', nominee: next }); },
  nextRound: () => { buzz(); if (MODE === 'shared') return send({ action: 'nextRound' });
    saveLocal({ rounds: [...local.rounds, nextRound(local.registered.slice(0, CHAPTER.capacity), local.rounds, (id) => SAMPLE[id]?.level ?? 0, CHAPTER.courts, CHAPTER.target)] }); },
  step: (round: number, court: number, delta: number) => {
    const target = state.data!.event.target;
    const { rounds, m } = patchMatch(round, court, (x) => { x.scoreA = Math.max(0, Math.min(target, x.scoreA + delta)); x.scoreB = target - x.scoreA; });
    if (MODE === 'preview') return saveLocal({ rounds });
    set({ data: { ...state.data!, rounds } });
    if (pendingScore) clearTimeout(pendingScore);
    pendingScore = setTimeout(() => { pendingScore = null; void send({ action: 'score', round, court, scoreA: m.scoreA, done: false }); }, 700);
  },
  setDone: (round: number, court: number, done: boolean) => {
    buzz();
    const { rounds, m } = patchMatch(round, court, (x) => { x.done = done; });
    if (MODE === 'preview') return saveLocal({ rounds });
    if (pendingScore) { clearTimeout(pendingScore); pendingScore = null; }
    set({ data: { ...state.data!, rounds } });
    void send({ action: 'score', round, court, scoreA: m.scoreA, done });
  },
  reset: () => MODE === 'preview' ? saveLocal({ rounds: [], vote: null }) : send({ action: 'reset' }),
  finish: (raised: number) => MODE === 'preview' ? saveLocal({ rounds: [], vote: null }) : send({ action: 'finish', raised }),
};

export const isOrganizer = (d: AppData) => d.role === 'organizer' || d.role === 'admin';
export const eventPlayers = (d: AppData) => d.registered.slice(0, d.event.capacity);
export const waitlist = (d: AppData) => d.registered.slice(d.event.capacity);
