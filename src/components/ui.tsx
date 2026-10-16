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

/** Level stepper (0–7). Big buttons for court-side use. */
export function LevelEditor({ value, onChange, doneLabel, onDone }: {
  value: number; onChange: (v: number) => void; doneLabel?: string; onDone?: () => void;
}) {
  const btn = (delta: number, label: string) => (
    <button type="button" aria-label={label} onClick={() => onChange(Math.max(0, Math.min(7, Math.round((value + delta) * 10) / 10)))}>{label}</button>
  );
  return (
    <div className="ks-level">
      {btn(-0.5, '−0.5')}{btn(-0.1, '−0.1')}
      <b className="ks-num" aria-live="polite">{value.toFixed(1)}</b>
      {btn(0.1, '+0.1')}{btn(0.5, '+0.5')}
      {onDone && <button type="button" className="ks-level__done" onClick={onDone}>{doneLabel}</button>}
    </div>
  );
}
