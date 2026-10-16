import { describe, expect, it } from 'vitest';
import { nextRound, tally, type Round } from './mexicano';

const ids = Array.from({ length: 16 }, (_, i) => `p${i + 1}`);
const level = (id: string) => 7 - Number(id.slice(1)) * 0.3;

function play(players: string[], n: number) {
  const rounds: Round[] = [];
  for (let i = 0; i < n; i++) {
    const r = nextRound(players, rounds, level, 2, 21);
    r.matches.forEach((m, k) => { m.scoreA = 9 + ((i + k) % 7); m.scoreB = 21 - m.scoreA; m.done = true; });
    rounds.push(r);
  }
  return rounds;
}

describe('mexicano', () => {
  it('gives 16 players on 2 courts equal games over 8 rounds', () => {
    const { games } = tally(play(ids, 8));
    expect(new Set(ids.map((id) => games[id])).size).toBe(1);
    expect(games.p1).toBe(4);
  });

  it('keeps every round valid: 8 different players, rest sit out', () => {
    for (const r of play(ids, 8)) {
      const on = r.matches.flatMap((m) => [...m.a, ...m.b]);
      expect(new Set(on).size).toBe(8);
      expect(r.resting.length).toBe(8);
    }
  });

  it('pairs 1+4 vs 2+3 by level in round 1', () => {
    const r = nextRound(ids.slice(0, 8), [], level, 2, 21);
    expect(r.matches[0].a).toEqual(['p1', 'p4']);
    expect(r.matches[0].b).toEqual(['p2', 'p3']);
  });

  it('handles 12 players fairly', () => {
    const { games } = tally(play(ids.slice(0, 12), 6));
    expect(new Set(ids.slice(0, 12).map((id) => games[id])).size).toBe(1);
  });
});
