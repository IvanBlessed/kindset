import type { Round } from '@/lib/mexicano';

export interface Player {
  id: string;
  name: string;
  level: number; // Playtomic-style 0–7
  langs: string;
}

export interface SeasonRow { id: string; points: number; weeks: number }

export interface EventInfo {
  id: string;
  startsAt: string;
  durationMin: number;
  venue: string;
  price: number;
  capacity: number;
  courts: number;
  target: number;
  status: 'open' | 'live' | 'finished' | 'cancelled';
  charityRaised: number;
}

/** Everything a screen needs, from the server (shared) or from sample data (preview). */
export interface AppData {
  me: Player;
  role: 'player' | 'organizer' | 'admin';
  chapter: { slug: string; city: string; currency: string; season: number; raised: number };
  event: EventInfo;
  players: Record<string, Player>;
  registered: string[];
  rounds: Round[];
  season: SeasonRow[];
  awards: { winner?: string; newbie?: string; spirit?: string };
  myVote: string | null;
}
