/**
 * Mexicano engine.
 *
 * Round 1 pairs players by level. Every later round pairs them by points scored
 * tonight. Within each group of four (sorted best to worst) the pairing is
 * 1 + 4 vs 2 + 3, so games stay even and partners keep changing.
 * When there are more players than court places, the players with the fewest
 * games play first, so everyone gets the same number of games over the night.
 */

export type PlayerId = string;

export interface Match {
  court: number;
  a: [PlayerId, PlayerId];
  b: [PlayerId, PlayerId];
  scoreA: number;
  scoreB: number;
  done: boolean;
}

export interface Round {
  matches: Match[];
  resting: PlayerId[];
}

export interface Tally {
  points: Record<PlayerId, number>;
  games: Record<PlayerId, number>;
  wins: Record<PlayerId, number>;
}

export function tally(rounds: Round[]): Tally {
  const points: Record<PlayerId, number> = {};
  const games: Record<PlayerId, number> = {};
  const wins: Record<PlayerId, number> = {};
  for (const r of rounds) {
    for (const m of r.matches) {
      if (!m.done) continue;
      const add = (ids: PlayerId[], pts: number, won: boolean) => ids.forEach((id) => {
        points[id] = (points[id] ?? 0) + pts;
        games[id] = (games[id] ?? 0) + 1;
        wins[id] = (wins[id] ?? 0) + (won ? 1 : 0);
      });
      add(m.a, m.scoreA, m.scoreA > m.scoreB);
      add(m.b, m.scoreB, m.scoreB > m.scoreA);
    }
  }
  return { points, games, wins };
}

export function nextRound(
  players: PlayerId[],
  rounds: Round[],
  levelOf: (id: PlayerId) => number,
  courts: number,
  target: number,
): Round {
  const { points, games } = tally(rounds);
  const r = rounds.length;
  const lastResting = r ? rounds[r - 1].resting : [];
  const slots = Math.min(courts * 4, Math.floor(players.length / 4) * 4);
  const rotation = (id: PlayerId) => (players.indexOf(id) + r * 5) % players.length;

  const order = [...players].sort((x, y) =>
    (games[x] ?? 0) - (games[y] ?? 0)
    || Number(lastResting.includes(y)) - Number(lastResting.includes(x))
    || rotation(x) - rotation(y));

  const playing = order.slice(0, slots);
  const resting = players.filter((id) => !playing.includes(id));

  const ranked = [...playing].sort((x, y) => (r === 0
    ? levelOf(y) - levelOf(x)
    : (points[y] ?? 0) - (points[x] ?? 0) || levelOf(y) - levelOf(x)));

  const matches: Match[] = [];
  for (let c = 0; c < slots / 4; c++) {
    const g = ranked.slice(c * 4, c * 4 + 4);
    matches.push({
      court: c + 1,
      a: [g[0], g[3]],
      b: [g[1], g[2]],
      scoreA: Math.ceil(target / 2),
      scoreB: Math.floor(target / 2),
      done: false,
    });
  }
  return { matches, resting };
}

/** Tonight's table: points, then win count, then fewer games. */
export function standings(players: PlayerId[], rounds: Round[]) {
  const t = tally(rounds);
  return [...players]
    .map((id) => ({ id, points: t.points[id] ?? 0, games: t.games[id] ?? 0, wins: t.wins[id] ?? 0 }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games);
}
