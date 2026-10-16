import { CHAPTER } from '@/data/config';
import { LAST_AWARDS, PAST_SEASON } from '@/data/sample';
import { actions, eventPlayers, ME, PLAYERS, useAppState, type State } from '@/data/store';
import { tally } from '@/lib/mexicano';
import { useLocale, useT } from '@/lib/useT';
import { Eyebrow } from '@/components/ui';

export function seasonTable(s: State) {
  const tonight = tally(s.rounds).points;
  const playing = new Set(s.rounds.length ? eventPlayers(s) : []);
  return Object.keys(PLAYERS)
    .map((id) => ({
      id,
      points: (PAST_SEASON[id]?.points ?? 0) + (tonight[id] ?? 0),
      weeks: (PAST_SEASON[id]?.weeks ?? 0) + (playing.has(id) ? 1 : 0),
    }))
    .filter((r) => r.weeks > 0)
    .sort((a, b) => b.points - a.points);
}

export function RankingPage() {
  const s = useAppState();
  const t = useT();
  const locale = useLocale();
  const table = seasonTable(s);
  const candidates = eventPlayers(s).filter((id) => id !== ME.id);
  const award = (k: keyof typeof LAST_AWARDS, label: string) => (
    <div className="ks-award"><small>{label}</small><b>{PLAYERS[LAST_AWARDS[k]].name}</b></div>
  );

  return (
    <>
      <section className="ks-raised">
        <small>{t('raised')}</small>
        <b className="ks-num">{CHAPTER.raisedTry.toLocaleString(locale)} {CHAPTER.currency}</b>
      </section>
      <Eyebrow>{t('awards')}</Eyebrow>
      <div className="ks-awards">{award('winner', t('winner'))}{award('newbie', t('newbie'))}{award('spirit', t('spirit'))}</div>
      <Eyebrow>{t('vote')}</Eyebrow>
      <div className="ks-chips">
        {candidates.map((id) => (
          <button key={id} className="ks-pill" aria-pressed={s.vote === id} onClick={() => actions.vote(id)}>{PLAYERS[id].name}</button>
        ))}
      </div>
      <p className="ks-small ks-muted">{t('voteHint')}</p>
      <Eyebrow>{t('season')} {CHAPTER.season}</Eyebrow>
      <div className="ks-card ks-scroll">
        <table className="ks-table">
          <thead><tr><th>#</th><th /><th className="r">{t('wk')}</th><th className="r">{t('pts')}</th></tr></thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={r.id} className={[i === 7 ? 'is-cut' : '', r.id === ME.id ? 'is-me' : ''].join(' ')}>
                <td className="ks-num ks-muted">{i + 1}</td><td>{PLAYERS[r.id].name}</td>
                <td className="r ks-num">{r.weeks}</td><td className="r ks-num">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ks-small ks-muted">{t('finals')}</p>
    </>
  );
}
