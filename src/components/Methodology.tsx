import { useMemo } from 'react';
import { FETCH_LIMITS } from '../lib/limits.ts';
import type { Dataset } from '../lib/types.ts';
import { WEIGHTS } from '../lib/weights.ts';

const W = WEIGHTS;

/** The most PRs one person merged in a single UTC day, the reason the daily cap exists. */
function busiestDay(data: Dataset): number {
  const counts = new Map<string, number>();
  for (const p of data.prs) {
    if (p.bot) continue;
    const key = `${p.author}#${p.mergedAt.slice(0, 10)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

export function Methodology({ data }: { data: Dataset }) {
  const hotAreas = data.hotAreas;
  const busiest = useMemo(() => busiestDay(data), [data]);
  const windowDays = Math.round((Date.parse(data.windowEnd) - Date.parse(data.windowStart)) / 86400e3);
  return (
    <section className="panel method" aria-labelledby="method-title">
      <h2 id="method-title" className="panel-title">
        How the points work
      </h2>
      <p className="method-lede">
        Every merged PR scores in Ship or Fix, never both. Every review of someone else&rsquo;s PR scores in Unblock. Rank is
        the sum of the three.
      </p>
      <div className="method-pillars">
        <div className="subbox">
          <p className="method-name">
            <i className="swatch swatch-ship" aria-hidden /> Ship
          </p>
          <p>
            Feature {W.ship.feat}, perf {W.ship.perf}, refactor {W.ship.refactor}, untyped {W.ship.other}, chore or docs{' '}
            {W.ship.chore}. Then × size × hot.
          </p>
        </div>
        <div className="subbox">
          <p className="method-name">
            <i className="swatch swatch-fix" aria-hidden /> Fix
          </p>
          <p>
            Fix, revert or hotfix: {W.fix.base} × size × hot. Plus {W.fix.linkedIssueBonus} if it closes an issue.
          </p>
        </div>
        <div className="subbox">
          <p className="method-name">
            <i className="swatch swatch-unblock" aria-hidden /> Unblock
          </p>
          <p>
            Approve {W.review.approve}, comment {W.review.comment}, request changes {W.review.changes}. Best review per PR.
          </p>
        </div>
      </div>
      <ul className="method-notes">
        <li>
          <b>Size</b> runs from {W.size.floor} to 1. A {(10 ** W.size.logCap).toLocaleString()} line PR gets the full 1.
          Lockfiles and generated files don&rsquo;t count.
        </li>
        <li>
          <b>Hot</b> adds up to {1 + W.hot.maxBoost}× for code many engineers touch, such as {hotAreas.slice(0, 2).join(' and ')}.
        </li>
        <li>
          <b>Daily cap.</b> Only a person&rsquo;s best {W.caps.prsPerDay} PRs and {W.caps.reviewsPerDay} reviews per day count.
          One person merged {busiest} PRs in a single day.
        </li>
        <li>
          <b>Bots</b> and deleted accounts are left out. Approving a bot&rsquo;s PR without a comment earns{' '}
          {W.review.bareApproveOfBotPr}. Ties go to whoever worked in more areas.
        </li>
      </ul>
      <details className="method-limits">
        <summary>Known limits</summary>
        <p>
          Only merged PRs count, so reviews on unmerged PRs are missing. The PR type comes from its title. A PR&rsquo;s files
          past the first {FETCH_LIMITS.filesPerPr} and reviews past the first {FETCH_LIMITS.reviewsPerPr} are skipped. Hot areas
          use all {windowDays} days. GitHub can&rsquo;t tell staff from community
          contributors.
        </p>
      </details>
    </section>
  );
}
