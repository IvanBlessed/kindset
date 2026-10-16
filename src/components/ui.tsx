import type { ReactNode } from 'react';
import type { Player } from '@/data/types';

export const initials = (name: string) => name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

const UNKNOWN: Player = { id: '?', name: '—', level: 0, langs: '' };
export const who = (players: Record<string, Player>, id?: string) => (id && players[id]) || UNKNOWN;

export function PlayerRow({ p, right }: { p: Player; right?: ReactNode }) {
  return (
    <div className="ks-row">
      <div className="ks-avatar">{initials(p.name)}</div>
      <div className="ks-row__name">{p.name}</div>
      {right ?? (<><span className="ks-chip">{p.level.toFixed(1)}</span>{p.langs && <span className="ks-chip">{p.langs}</span>}</>)}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="ks-eyebrow">{children}</h2>;
}
