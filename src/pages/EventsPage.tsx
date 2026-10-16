import { useState } from 'react';

import { actions, eventPlayers, isOrganizer, useAppState, waitlist } from '@/data/store';
import type { AppData } from '@/data/types';
import { useLocale, useT } from '@/lib/useT';
import { Eyebrow, LevelEditor, PlayerRow, who } from '@/components/ui';

export function EventsPage({ d }: { d: AppData }) {
  const { mode, busy } = useAppState();
  const t = useT();
  const locale = useLocale();
  const ev = d.event;
  const players = eventPlayers(d);
  const wait = waitlist(d);
  const pos = d.registered.indexOf(d.me.id);
  const org = isOrganizer(d);
  const [editing, setEditing] = useState<string | null>(null);
  const row = (id: string) => {
    const p = who(d.players, id);
    const can = org || id === d.me.id;
    return (
      <div key={id}>
        {can
          ? <button type="button" className="ks-rowbtn" aria-expanded={editing === id} onClick={() => setEditing(editing === id ? null : id)}><PlayerRow p={p} /></button>
          : <PlayerRow p={p} />}
        {editing === id && (
          <LevelEditor value={p.level} onChange={(v) => actions.setLevel(id, v)} doneLabel={t('done')} onDone={() => setEditing(null)} />
        )}
      </div>
    );
  };
  const start = new Date(ev.startsAt);
  const end = new Date(start.getTime() + ev.durationMin * 60000);
  const tz = { timeZone: 'Europe/Istanbul' } as const;
  const day = start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', ...tz });
  const time = (x: Date) => x.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', ...tz });

  return (
    <>
      <section className="ks-hero">
        <p className="ks-hero__eyebrow">{t('next')}</p>
        <h1 className="ks-hero__title">{day} · {time(start)}–{time(end)}</h1>
        <p className="ks-hero__meta">{ev.venue} · {ev.price} {d.chapter.currency} · Mexicano · {ev.target}</p>
        <div className="ks-bar"><i style={{ width: `${Math.min(100, (d.registered.length / ev.capacity) * 100)}%` }} /></div>
        <p className="ks-hero__meta">
          <b className="ks-num">{players.length}/{ev.capacity}</b> {t('spots')}
          {wait.length > 0 && <> · +{wait.length} {t('waitlist').toLowerCase()}</>}
        </p>
        {pos < 0 ? (
          <button className="ks-btn ks-btn--light" disabled={busy} onClick={actions.join}>
            {d.registered.length >= ev.capacity ? t('joinWait') : t('join')}
          </button>
        ) : (
          <>
            <p className="ks-hero__status">{pos < ev.capacity ? t('youreIn') : `${t('onWait')}${pos - ev.capacity + 1}`}</p>
            <button className="ks-btn ks-btn--outline-light" disabled={busy} onClick={actions.leave}>{t('leave')}</button>
          </>
        )}
      </section>

      <Eyebrow>{t('players')}{mode === 'preview' ? ` · ${t('sample')}` : ''}</Eyebrow>
      {players.length
        ? <div className="ks-card ks-list">{players.map(row)}</div>
        : <p className="ks-card ks-pad ks-muted">{t('noPlayers')}</p>}
      {org && players.length > 0 && <p className="ks-small ks-muted ks-mt">{t('tapToLevel')} {t('levelHint')}</p>}
      {wait.length > 0 && (
        <>
          <Eyebrow>{t('waitlist')}</Eyebrow>
          <div className="ks-card ks-list">{wait.map(row)}</div>
        </>
      )}
    </>
  );
}
