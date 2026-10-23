import { fmt, pct, prUrl, summary } from '../lib/format.ts';
import type { EngineerScore } from '../lib/score.ts';
import { PillarBar } from './PillarBar.tsx';

interface Props {
  rank: number;
  engineer: EngineerScore;
  max: number;
  onOpen: (login: string) => void;
}

export function EngineerCard({ rank, engineer: e, max, onOpen }: Props) {
  const feats = e.stats.byType.feat ?? 0;
  const fixes = (e.stats.byType.fix ?? 0) + (e.stats.byType.revert ?? 0);
  const top = e.prs.slice(0, 3);
  return (
    <article className="card" style={{ ['--i' as string]: rank - 1 }}>
      <div className="card-main">
        <span className="card-rank" aria-label={`Rank ${rank}`}>
          {rank}
        </span>
        <img className="avatar" src={e.avatar} alt="" width={40} height={40} loading="lazy" />
        <div className="card-id">
          <h3 className="card-name">
            <button type="button" className="stretched" onClick={() => onOpen(e.login)}>
              {e.login}
            </button>
          </h3>
          <p className="card-summary">{summary(e)}</p>
        </div>
        <div className="card-total">
          <span className="num">{fmt(e.total)}</span>
          <span className="card-total-label">points</span>
        </div>
      </div>
      <PillarBar ship={e.ship} fix={e.fix} unblock={e.unblock} max={max} />
      <div className="card-foot">
        <p className="card-stats">
          <span className="num">{fmt(e.ship)}</span> ship · <span className="num">{fmt(e.fix)}</span> fix ·{' '}
          <span className="num">{fmt(e.unblock)}</span> unblock
          <br />
          {e.stats.prCount.toLocaleString()} PRs ({feats} feat, {fixes} fix) · reviewed {e.stats.authorsHelped} people ·{' '}
          {e.stats.areas} areas · {pct(e.stats.hotShare)} hot
        </p>
        <ul className="card-prs" aria-label="Highest-value PRs">
          {top.map((p) => (
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
