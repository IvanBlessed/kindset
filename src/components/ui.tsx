import type { ReactNode } from 'react';
import { PLAYERS } from '@/data/store';

export const initials = (name: string) => name.split(' ').map((s) => s[0]).join('').slice(0, 2);

export function PlayerRow({ id, right }: { id: string; right?: ReactNode }) {
  const p = PLAYERS[id];
  return (
    <div className="ks-row">
      <div className="ks-avatar">{initials(p.name)}</div>
      <div className="ks-row__name">{p.name}</div>
      {right ?? (<><span className="ks-chip">{p.level.toFixed(1)}</span><span className="ks-chip">{p.langs}</span></>)}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="ks-eyebrow">{children}</h2>;
}
