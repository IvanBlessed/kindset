import { useState } from 'react';

import { actions, isOrganizer, useAppState } from '@/data/store';
import type { AppData } from '@/data/types';
import { tally } from '@/lib/mexicano';
import { useT } from '@/lib/useT';
import { Eyebrow, initials } from '@/components/ui';

export function MePage({ d }: { d: AppData }) {
  const { mode } = useAppState();
  const t = useT();
  const [asking, setAsking] = useState(false);
  const { points, games } = tally(d.rounds);
  const rank = d.season.findIndex((r) => r.id === d.me.id) + 1;
  const org = isOrganizer(d);

  return (
    <>
      <section className="ks-card ks-pad">
        <div className="ks-profile">
          <div className="ks-avatar ks-avatar--lg">{initials(d.me.name)}</div>
          <div>
            <h1 className="ks-profile__name">{d.me.name}</h1>
            <p className="ks-small ks-muted">{t('level')} <b className="ks-num">{d.me.level.toFixed(1)}</b>{d.me.langs && <> · {t('languages')}: {d.me.langs}</>}</p>
          </div>
        </div>
        <div className="ks-stats">
          <div><b className="ks-num">{games[d.me.id] ?? 0}</b><small>{t('games')}</small></div>
          <div><b className="ks-num">{points[d.me.id] ?? 0}</b><small>{t('pts')} · {t('tonight').toLowerCase()}</small></div>
          <div><b className="ks-num">{rank || '–'}</b><small>{t('rank')}</small></div>
        </div>
      </section>

      {mode === 'preview' && (
        <>
          <Eyebrow>{t('organizer')}</Eyebrow>
          <div className="ks-card ks-pad ks-toggle">
            <div><b>{t('organizer')}</b><p className="ks-small ks-muted">{t('organizerHint')}</p></div>
            <button className="ks-switch" aria-pressed={org} aria-label={t('organizer')} onClick={actions.toggleOrganizer} />
          </div>
        </>
      )}
      {mode === 'shared' && org && <><Eyebrow>{t('organizer')}</Eyebrow><p className="ks-note">✓ {t('organizerHint')}</p></>}

      {org && (asking ? (
        <div className="ks-card ks-pad ks-stack">
          <p>{t('resetAsk')}</p>
          <div className="ks-two">
            <button className="ks-btn ks-btn--ghost" onClick={() => setAsking(false)}>{t('no')}</button>
            <button className="ks-btn" onClick={() => { void actions.reset(); setAsking(false); }}>{t('yes')}</button>
          </div>
        </div>
      ) : (
        <button className="ks-btn ks-btn--ghost ks-mt" onClick={() => setAsking(true)}>{t('reset')}</button>
      ))}
      {mode === 'preview' && <p className="ks-note ks-mt">{t('localNote')}</p>}
      <p className="ks-small ks-muted ks-mt">Kindset v{__BUILD__}</p>
    </>
  );
}
