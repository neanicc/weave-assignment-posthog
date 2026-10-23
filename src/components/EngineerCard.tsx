import { fmt, prUrl, summary } from '../lib/format.ts';
import type { EngineerScore } from '../lib/score.ts';
import { PillarBar } from './PillarBar.tsx';

interface Props {
  rank: number;
  engineer: EngineerScore;
  max: number;
  onOpen: (login: string) => void;
}

export function EngineerCard({ rank, engineer: e, max, onOpen }: Props) {
  const prs =
    e.stats.prCount > e.stats.countedPrs
      ? `${e.stats.prCount.toLocaleString()} PRs, ${e.stats.countedPrs} counted`
      : `${e.stats.prCount} PRs`;
  return (
    <article className="card" style={{ ['--i' as string]: rank - 1 }}>
      <div className="card-main">
        <span className="card-rank" aria-label={`Rank ${rank}`}>
          {rank}
        </span>
        <img className="avatar" src={e.avatar} alt="" width={32} height={32} loading="lazy" />
        <div className="card-id">
          <h3 className="card-name">
            <button type="button" className="stretched" onClick={() => onOpen(e.login)}>
              {e.login}
            </button>
          </h3>
          <p className="card-summary">{summary(e)}</p>
        </div>
        <PillarBar ship={e.ship} fix={e.fix} unblock={e.unblock} max={max} />
        <div className="card-total">
          <span className="num">{fmt(e.total)}</span>
          <span className="card-total-label">pts</span>
        </div>
      </div>
      <div className="card-foot">
        <div className="subbox">
          <p className="pillars">
            <span>
              <i className="swatch swatch-ship" aria-hidden /> Ship <b className="num">{fmt(e.ship)}</b>
            </span>
            <span>
              <i className="swatch swatch-fix" aria-hidden /> Fix <b className="num">{fmt(e.fix)}</b>
            </span>
            <span>
              <i className="swatch swatch-unblock" aria-hidden /> Unblock <b className="num">{fmt(e.unblock)}</b>
            </span>
          </p>
          <p className="card-stats">
            {prs} · reviewed {e.stats.authorsHelped} people · {e.stats.areas} areas
          </p>
        </div>
        <ul className="subbox card-prs" aria-label="Highest value PRs">
          {e.prs.slice(0, 2).map((p) => (
            <li key={p.n}>
              <a className="pr-link" href={prUrl(p.n)} target="_blank" rel="noreferrer">
                <span className="pr-num">#{p.n}</span>
                <span className="pr-title">{p.title}</span>
                <span className="pr-pts num">+{fmt(p.points)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
