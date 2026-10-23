import { useEffect, useRef } from 'react';
import { fmt, prUrl, summary } from '../lib/format.ts';
import type { EngineerScore, ScoredPr } from '../lib/score.ts';

interface Props {
  engineer: EngineerScore | null;
  days: number;
  onClose: () => void;
}

const KIND_LABEL = { approve: 'approved', comment: 'commented', changes: 'requested changes' } as const;

function formula(p: ScoredPr): string {
  if (p.capped) return 'over daily cap';
  const core = `${p.base} × ${p.size.toFixed(2)} × ${p.hot.toFixed(2)}`;
  return p.bonus ? `${core} + ${p.bonus}` : core;
}

/** Every scored PR and review for one engineer, so any number can be checked against GitHub. */
export function EngineerDrawer({ engineer: e, days, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (e && !d.open) d.showModal();
    if (!e && d.open) d.close();
  }, [e]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="drawer-title"
      onClose={onClose}
      onClick={(ev) => ev.target === ref.current && ref.current?.close()}
    >
      {e && (
        <div className="drawer-inner">
          <header className="drawer-head">
            <img className="avatar" src={e.avatar} alt="" width={44} height={44} />
            <div>
              <h2 id="drawer-title" className="drawer-title">
                <a href={`https://github.com/${e.login}`} target="_blank" rel="noreferrer">
                  {e.login}
                </a>
              </h2>
              <p className="drawer-sub">
                {summary(e)} · last {days} days
              </p>
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => ref.current?.close()}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <dl className="drawer-totals">
            {(
              [
                ['Total', e.total],
                ['Ship', e.ship],
                ['Fix', e.fix],
                ['Unblock', e.unblock],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className={`total total-${label.toLowerCase()}`}>
                <dt>{label}</dt>
                <dd className="num">{fmt(v)}</dd>
              </div>
            ))}
          </dl>

          <section className="drawer-section" aria-labelledby="drawer-prs">
            <h3 id="drawer-prs" className="drawer-h">
              Pull requests <span className="count">{e.prs.length}</span>
              <span className="drawer-hint">points = type weight × size × hot (+ linked-issue bonus)</span>
            </h3>
            <table className="ledger">
              <tbody>
                {e.prs.map((p) => (
                  <tr key={p.n} className={p.capped ? 'is-capped' : undefined}>
                    <td className="col-num">
                      <a href={prUrl(p.n)} target="_blank" rel="noreferrer">
                        #{p.n}
                      </a>
                    </td>
                    <td className="col-title">{p.title}</td>
                    <td className="col-type">
                      <span className={`pill pill-${p.pillar}`}>{p.type}</span>
                    </td>
                    <td className="col-formula num">{formula(p)}</td>
                    <td className="col-pts num">{fmt(p.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="drawer-section" aria-labelledby="drawer-reviews">
            <h3 id="drawer-reviews" className="drawer-h">
              Reviews of others&rsquo; PRs <span className="count">{e.reviews.length}</span>
            </h3>
            <table className="ledger">
              <tbody>
                {e.reviews.map((r) => (
                  <tr key={r.pr} className={r.capped ? 'is-capped' : undefined}>
                    <td className="col-num">
                      <a href={prUrl(r.pr)} target="_blank" rel="noreferrer">
                        #{r.pr}
                      </a>
                    </td>
                    <td className="col-title">
                      {r.title} <span className="muted">by {r.prAuthor}</span>
                    </td>
                    <td className="col-type">{KIND_LABEL[r.kind]}</td>
                    <td className="col-formula num">{r.capped ? 'over daily cap' : ''}</td>
                    <td className="col-pts num">{fmt(r.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </dialog>
  );
}
