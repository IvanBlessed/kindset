import { useSyncExternalStore } from 'react';
import { hapticFeedback, initData } from '@tma.js/sdk-react';

import { CHAPTER } from '@/data/config';
import { SAMPLE_PLAYERS, type Player } from '@/data/sample';
import { detectLang, type Lang } from '@/lib/i18n';
import { nextRound, type Round } from '@/lib/mexicano';

/**
 * App state for one chapter's current event.
 *
 * Today it lives in this phone's storage. The shape matches supabase/schema.sql,
 * so step 2 swaps load/save for database calls without touching the screens.
 */
export interface State {
  lang: Lang;
  organizer: boolean;
  registered: string[]; // order = sign-up order; beyond capacity = waitlist
  rounds: Round[];
  vote: string | null;
}

const KEY = `kindset:${CHAPTER.slug}:v1`;

function currentUser(): Player {
  let u;
  try { u = initData.user(); } catch { /* not in Telegram */ }
  return {
    id: 'me',
    name: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : 'You',
    level: 3.1,
    langs: (u?.language_code ?? 'en').slice(0, 2).toUpperCase(),
  };
}

export const ME = currentUser();
export const PLAYERS: Record<string, Player> = Object.fromEntries(
  [...SAMPLE_PLAYERS, ME].map((p) => [p.id, p]),
);

function initial(): State {
  let code: string | undefined;
  try { code = initData.user()?.language_code; } catch { /* empty */ }
  return {
    lang: detectLang(code ?? navigator.language),
    organizer: true,
    registered: SAMPLE_PLAYERS.map((p) => p.id),
    rounds: [],
    vote: null,
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial(), ...JSON.parse(raw) };
  } catch { /* empty */ }
  return initial();
}

let state = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* empty */ }
  try { hapticFeedback.impactOccurred.ifAvailable('light'); } catch { /* empty */ }
  listeners.forEach((l) => l());
}

export function useAppState(): State {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
  );
}

const clone = (r: Round[]): Round[] => JSON.parse(JSON.stringify(r));
const inEvent = () => state.registered.slice(0, CHAPTER.capacity);

export const actions = {
  setLang: (lang: Lang) => set({ ...state, lang }),
  toggleOrganizer: () => set({ ...state, organizer: !state.organizer }),
  join: () => !state.registered.includes(ME.id) && set({ ...state, registered: [...state.registered, ME.id] }),
  leave: () => set({ ...state, registered: state.registered.filter((id) => id !== ME.id) }),
  vote: (id: string) => set({ ...state, vote: state.vote === id ? null : id }),
  startOrNext: () => set({
    ...state,
    rounds: [...state.rounds, nextRound(inEvent(), state.rounds, (id) => PLAYERS[id]?.level ?? 0, CHAPTER.courts, CHAPTER.target)],
  }),
  step: (round: number, court: number, delta: number) => {
    const rounds = clone(state.rounds);
    const m = rounds[round].matches.find((x) => x.court === court)!;
    m.scoreA = Math.max(0, Math.min(CHAPTER.target, m.scoreA + delta));
    m.scoreB = CHAPTER.target - m.scoreA;
    set({ ...state, rounds });
  },
  setDone: (round: number, court: number, done: boolean) => {
    const rounds = clone(state.rounds);
    rounds[round].matches.find((x) => x.court === court)!.done = done;
    set({ ...state, rounds });
  },
  reset: () => set({ ...state, rounds: [], vote: null }),
};

export const eventPlayers = (s: State) => s.registered.slice(0, CHAPTER.capacity);
export const waitlist = (s: State) => s.registered.slice(CHAPTER.capacity);
