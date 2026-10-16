import { useState } from 'react';

import { actions, eventPlayers, isOrganizer, useAppState } from '@/data/store';
import type { AppData } from '@/data/types';
import { standings, type Match } from '@/lib/mexicano';
import { useT } from '@/lib/useT';
import { Eyebrow, who } from '@/components/ui';

function Court({ d, m, round, editable }: { d: AppData; m: Match; round: number; editable: boolean }) {
  const t = useT();
  const team = (ids: string[]) => <div className="ks-team">{ids.map((id) => <span key={id}>{who(d.players, id).name}</span>)}</div>;
  return (
    <div className="ks-court">
      <div className="ks-court__head"><span>{t('court')} {m.court}</span>{m.done && <span className="ks-court__saved">✓ {t('saved')}</span>}</div>
      <div className="ks-half ks-half--top">{team(m.a)}<div className="ks-score">{m.scoreA}</div></div>
      <div className="ks-net" />
      <div className="ks-half ks-half--bottom">{team(m.b)}<div className="ks-score">{m.scoreB}</div></div>
      {editable && (m.done ? (
        <div className="ks-steps"><button onClick={() => actions.setDone(round, m.court, false)}>{t('edit')}</button></div>
      ) : (
        <div className="ks-steps">
          <button aria-label="−1" onClick={() => actions.step(round, m.court, -1)}>−</button>
          <button aria-label="+1" onClick={() => actions.step(round, m.court, 1)}>+</button>
          <button className="ks-steps__ok" onClick={() => actions.setDone(round, m.court, true)}>{t('save')}</button>
        </div>
      ))}
    </div>
  );
}

function FinishNight({ currency }: { currency: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [raised, setRaised] = useState('');
  if (!open) return <button className="ks-btn ks-btn--ghost" onClick={() => setOpen(true)}>{t('finish')}</button>;
  return (
    <div className="ks-card ks-pad ks-stack" style={{ marginTop: 0 }}>
      <p className="ks-small ks-muted">{t('finishNightHint')}</p>
      <label className="ks-small" htmlFor="raised">{t('raisedLabel')} ({currency})</label>
      <input id="raised" className="ks-input" inputMode="numeric" value={raised} onChange={(e) => setRaised(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
      <div className="ks-two">
        <button className="ks-btn ks-btn--ghost" onClick={() => setOpen(false)}>{t('no')}</button>
        <button className="ks-btn" onClick={() => { void actions.finish(Number(raised || 0)); setOpen(false); }}>{t('finishConfirm')}</button>
      </div>
    </div>
  );
}

export function LivePage({ d }: { d: AppData }) {
  const { busy, mode } = useAppState();
  const t = useT();
  const org = isOrganizer(d);
  const players = eventPlayers(d);

  if (!d.rounds.length) {
    return (
      <div className="ks-card ks-pad">
        <p>{t('notStarted')}</p>
        {org ? (
          <>
            <button className="ks-btn" disabled={players.length < 8 || busy} onClick={actions.nextRound}>{t('start')}</button>
            <p className="ks-small ks-muted">{t('startHint')}</p>
          </>
        ) : <p className="ks-small ks-muted">{t('waitOrganizer')}</p>}
      </div>
    );
  }

  const ri = d.rounds.length - 1;
  const round = d.rounds[ri];
  const allDone = round.matches.every((m) => m.done);
  const mine = round.matches.find((m) => [...m.a, ...m.b].includes(d.me.id));
  const table = standings(players, d.rounds);

  return (
    <>
      <div className="ks-roundhead"><h1><i className="ks-dot" />{t('round')} {ri + 1}</h1><span className="ks-muted ks-small">{t('tonight')}</span></div>
      {mode === 'shared' && !org && <p className="ks-small ks-muted">{t('sharedNote')}</p>}
      {players.includes(d.me.id) && (
        <p className="ks-note">{mine ? `${t('yourCourt')}: ${mine.court}` : t('youRest')}</p>
      )}
      <div className="ks-courts">{round.matches.map((m) => <Court key={m.court} d={d} m={m} round={ri} editable={org} />)}</div>
      {round.resting.length > 0 && (
        <>
          <Eyebrow>{t('resting')}</Eyebrow>
          <div className="ks-chips">{round.resting.map((id) => <span key={id} className="ks-pill">{who(d.players, id).name}</span>)}</div>
        </>
      )}
      {org && (
        <div className="ks-stack">
          <button className="ks-btn" disabled={!allDone || busy} onClick={() => { void actions.nextRound(); window.scrollTo(0, 0); }}>
            {t('nextRound')} → {ri + 2}
          </button>
          {!allDone && <p className="ks-small ks-muted">{t('finishHint')}</p>}
          {allDone && <FinishNight currency={d.chapter.currency} />}
        </div>
      )}
      <Eyebrow>{t('tonight')}</Eyebrow>
      <div className="ks-card ks-scroll">
        <table className="ks-table">
          <thead><tr><th>#</th><th /><th className="r">{t('games')}</th><th className="r">{t('pts')}</th></tr></thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={row.id} className={row.id === d.me.id ? 'is-me' : ''}>
                <td className="ks-num ks-muted">{i + 1}</td><td>{who(d.players, row.id).name}</td>
                <td className="r ks-num">{row.games}</td><td className="r ks-num">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
