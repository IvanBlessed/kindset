import { actions, eventPlayers, useAppState } from '@/data/store';
import type { AppData } from '@/data/types';
import { useLocale, useT } from '@/lib/useT';
import { Eyebrow, who } from '@/components/ui';

export function RankingPage({ d }: { d: AppData }) {
  const { busy } = useAppState();
  const t = useT();
  const locale = useLocale();
  const candidates = eventPlayers(d).filter((id) => id !== d.me.id);
  const hasAwards = !!(d.awards.winner || d.awards.newbie || d.awards.spirit);
  const award = (id: string | undefined, label: string) => (
    <div className="ks-award"><small>{label}</small><b>{id ? who(d.players, id).name : '—'}</b></div>
  );

  return (
    <>
      <section className="ks-raised">
        <small>{t('raised')}</small>
        <b className="ks-num">{d.chapter.raised.toLocaleString(locale)} {d.chapter.currency}</b>
      </section>

      <Eyebrow>{t('awards')}</Eyebrow>
      {hasAwards
        ? <div className="ks-awards">{award(d.awards.winner, t('winner'))}{award(d.awards.newbie, t('newbie'))}{award(d.awards.spirit, t('spirit'))}</div>
        : <p className="ks-card ks-pad ks-muted">{t('noAwards')}</p>}

      {candidates.length > 0 && (
        <>
          <Eyebrow>{t('vote')}</Eyebrow>
          <div className="ks-chips">
            {candidates.map((id) => (
              <button key={id} className="ks-pill" disabled={busy} aria-pressed={d.myVote === id} onClick={() => actions.vote(id)}>{who(d.players, id).name}</button>
            ))}
          </div>
          <p className="ks-small ks-muted">{t('voteHint')}</p>
        </>
      )}

      <Eyebrow>{t('season')} {d.chapter.season}</Eyebrow>
      {d.season.length ? (
        <>
          <div className="ks-card ks-scroll">
            <table className="ks-table">
              <thead><tr><th>#</th><th /><th className="r">{t('wk')}</th><th className="r">{t('pts')}</th></tr></thead>
              <tbody>
                {d.season.map((r, i) => (
                  <tr key={r.id} className={[i === 7 ? 'is-cut' : '', r.id === d.me.id ? 'is-me' : ''].join(' ')}>
                    <td className="ks-num ks-muted">{i + 1}</td><td>{who(d.players, r.id).name}</td>
                    <td className="r ks-num">{r.weeks}</td><td className="r ks-num">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ks-small ks-muted">{t('finals')}</p>
        </>
      ) : <p className="ks-card ks-pad ks-muted">{t('noSeason')}</p>}
    </>
  );
}
