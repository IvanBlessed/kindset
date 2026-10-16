import { actions, eventPlayers, useAppState, waitlist } from '@/data/store';
import type { AppData } from '@/data/types';
import { useLocale, useT } from '@/lib/useT';
import { Eyebrow, PlayerRow, who } from '@/components/ui';

export function EventsPage({ d }: { d: AppData }) {
  const { mode, busy } = useAppState();
  const t = useT();
  const locale = useLocale();
  const ev = d.event;
  const players = eventPlayers(d);
  const wait = waitlist(d);
  const pos = d.registered.indexOf(d.me.id);
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
        ? <div className="ks-card ks-list">{players.map((id) => <PlayerRow key={id} p={who(d.players, id)} />)}</div>
        : <p className="ks-card ks-pad ks-muted">{t('noPlayers')}</p>}
      {wait.length > 0 && (
        <>
          <Eyebrow>{t('waitlist')}</Eyebrow>
          <div className="ks-card ks-list">{wait.map((id) => <PlayerRow key={id} p={who(d.players, id)} />)}</div>
        </>
      )}
    </>
  );
}
