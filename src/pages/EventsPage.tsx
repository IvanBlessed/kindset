import { CHAPTER } from '@/data/config';
import { actions, eventPlayers, ME, useAppState, waitlist } from '@/data/store';
import { useLocale, useT } from '@/lib/useT';
import { Eyebrow, PlayerRow } from '@/components/ui';

export function EventsPage() {
  const s = useAppState();
  const t = useT();
  const locale = useLocale();
  const players = eventPlayers(s);
  const wait = waitlist(s);
  const pos = s.registered.indexOf(ME.id);
  const start = new Date(CHAPTER.nextEvent);
  const end = new Date(start.getTime() + CHAPTER.durationMin * 60000);
  const day = start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' });
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

  return (
    <>
      <section className="ks-hero">
        <p className="ks-hero__eyebrow">{t('next')}</p>
        <h1 className="ks-hero__title">{day} · {time(start)}–{time(end)}</h1>
        <p className="ks-hero__meta">{CHAPTER.venue} · {CHAPTER.priceTry} {CHAPTER.currency} · Mexicano · {CHAPTER.target}</p>
        <div className="ks-bar"><i style={{ width: `${Math.min(100, (s.registered.length / CHAPTER.capacity) * 100)}%` }} /></div>
        <p className="ks-hero__meta">
          <b className="ks-num">{players.length}/{CHAPTER.capacity}</b> {t('spots')}
          {wait.length > 0 && <> · +{wait.length} {t('waitlist').toLowerCase()}</>}
        </p>
        {pos < 0 ? (
          <button className="ks-btn ks-btn--light" onClick={actions.join}>
            {s.registered.length >= CHAPTER.capacity ? t('joinWait') : t('join')}
          </button>
        ) : (
          <>
            <p className="ks-hero__status">{pos < CHAPTER.capacity ? t('youreIn') : `${t('onWait')}${pos - CHAPTER.capacity + 1}`}</p>
            <button className="ks-btn ks-btn--outline-light" onClick={actions.leave}>{t('leave')}</button>
          </>
        )}
      </section>

      <Eyebrow>{t('players')} · {t('sample')}</Eyebrow>
      <div className="ks-card ks-list">{players.map((id) => <PlayerRow key={id} id={id} />)}</div>
      {wait.length > 0 && (
        <>
          <Eyebrow>{t('waitlist')}</Eyebrow>
          <div className="ks-card ks-list">{wait.map((id) => <PlayerRow key={id} id={id} />)}</div>
        </>
      )}
    </>
  );
}
