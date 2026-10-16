import { actions, eventPlayers, ME, PLAYERS, useAppState } from '@/data/store';
import { standings, type Match } from '@/lib/mexicano';
import { useT } from '@/lib/useT';
import { Eyebrow } from '@/components/ui';

function Court({ m, round, editable }: { m: Match; round: number; editable: boolean }) {
  const t = useT();
  const team = (ids: string[]) => <div className="ks-team">{ids.map((id) => <span key={id}>{PLAYERS[id].name}</span>)}</div>;
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

export function LivePage() {
  const s = useAppState();
  const t = useT();
  const players = eventPlayers(s);

  if (!s.rounds.length) {
    return (
      <div className="ks-card ks-pad">
        <p>{t('notStarted')}</p>
        {s.organizer ? (
          <>
            <button className="ks-btn" disabled={players.length < 8} onClick={actions.startOrNext}>{t('start')}</button>
            <p className="ks-small ks-muted">{t('startHint')}</p>
          </>
        ) : <p className="ks-small ks-muted">{t('waitOrganizer')}</p>}
      </div>
    );
  }

  const ri = s.rounds.length - 1;
  const round = s.rounds[ri];
  const allDone = round.matches.every((m) => m.done);
  const mine = round.matches.find((m) => [...m.a, ...m.b].includes(ME.id));
  const table = standings(players, s.rounds);

  return (
    <>
      <div className="ks-roundhead"><h1><i className="ks-dot" />{t('round')} {ri + 1}</h1><span className="ks-muted ks-small">{t('tonight')}</span></div>
      {!s.organizer && players.includes(ME.id) && (
        <p className="ks-note">{mine ? `${t('yourCourt')}: ${mine.court}` : t('youRest')}</p>
      )}
      <div className="ks-courts">{round.matches.map((m) => <Court key={m.court} m={m} round={ri} editable={s.organizer} />)}</div>
      {round.resting.length > 0 && (
        <>
          <Eyebrow>{t('resting')}</Eyebrow>
          <div className="ks-chips">{round.resting.map((id) => <span key={id} className="ks-pill">{PLAYERS[id].name}</span>)}</div>
        </>
      )}
      {s.organizer && (
        <div className="ks-stack">
          <button className="ks-btn" disabled={!allDone} onClick={() => { actions.startOrNext(); window.scrollTo(0, 0); }}>
            {t('nextRound')} → {ri + 2}
          </button>
          {!allDone && <p className="ks-small ks-muted">{t('finishHint')}</p>}
        </div>
      )}
      <Eyebrow>{t('tonight')}</Eyebrow>
      <div className="ks-card ks-scroll">
        <table className="ks-table">
          <thead><tr><th>#</th><th /><th className="r">{t('games')}</th><th className="r">{t('pts')}</th></tr></thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={row.id} className={row.id === ME.id ? 'is-me' : ''}>
                <td className="ks-num ks-muted">{i + 1}</td><td>{PLAYERS[row.id].name}</td>
                <td className="r ks-num">{row.games}</td><td className="r ks-num">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
