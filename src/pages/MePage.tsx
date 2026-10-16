import { useState } from 'react';

import { actions, ME, useAppState } from '@/data/store';
import { tally } from '@/lib/mexicano';
import { useT } from '@/lib/useT';
import { Eyebrow, initials } from '@/components/ui';
import { seasonTable } from '@/pages/RankingPage';

export function MePage() {
  const s = useAppState();
  const t = useT();
  const [asking, setAsking] = useState(false);
  const { points, games } = tally(s.rounds);
  const rank = seasonTable(s).findIndex((r) => r.id === ME.id) + 1;

  return (
    <>
      <section className="ks-card ks-pad">
        <div className="ks-profile">
          <div className="ks-avatar ks-avatar--lg">{initials(ME.name)}</div>
          <div>
            <h1 className="ks-profile__name">{ME.name}</h1>
            <p className="ks-small ks-muted">{t('level')} <b className="ks-num">{ME.level.toFixed(1)}</b> · {t('languages')}: {ME.langs}</p>
          </div>
        </div>
        <div className="ks-stats">
          <div><b className="ks-num">{games[ME.id] ?? 0}</b><small>{t('games')}</small></div>
          <div><b className="ks-num">{points[ME.id] ?? 0}</b><small>{t('pts')} · {t('tonight').toLowerCase()}</small></div>
          <div><b className="ks-num">{rank || '–'}</b><small>{t('rank')}</small></div>
        </div>
      </section>

      <Eyebrow>{t('organizer')}</Eyebrow>
      <div className="ks-card ks-pad ks-toggle">
        <div><b>{t('organizer')}</b><p className="ks-small ks-muted">{t('organizerHint')}</p></div>
        <button className="ks-switch" aria-pressed={s.organizer} aria-label={t('organizer')} onClick={actions.toggleOrganizer} />
      </div>
      {s.organizer && (asking ? (
        <div className="ks-card ks-pad ks-stack">
          <p>{t('resetAsk')}</p>
          <div className="ks-two">
            <button className="ks-btn ks-btn--ghost" onClick={() => setAsking(false)}>{t('no')}</button>
            <button className="ks-btn" onClick={() => { actions.reset(); setAsking(false); }}>{t('yes')}</button>
          </div>
        </div>
      ) : (
        <button className="ks-btn ks-btn--ghost ks-mt" onClick={() => setAsking(true)}>{t('reset')}</button>
      ))}
      <p className="ks-note ks-mt">{t('localNote')}</p>
    </>
  );
}
