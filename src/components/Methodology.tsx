import { WEIGHTS } from '../lib/weights.ts';

const W = WEIGHTS;

export function Methodology({ hotAreas }: { hotAreas: string[] }) {
  return (
    <section className="panel method" aria-labelledby="method-title">
      <h2 id="method-title" className="panel-title">
        How the points work
      </h2>
      <p className="method-lede">
        Each merged PR lands in <b>Ship</b> or <b>Fix</b>, never both. Each review on someone else&rsquo;s PR adds to{' '}
        <b>Unblock</b>. Rank = Ship + Fix + Unblock; ties go to whoever shipped in more areas.
      </p>
      <dl className="method-rows">
        <div className="method-row">
          <dt>
            <i className="swatch swatch-ship" aria-hidden /> Ship
          </dt>
          <dd>
            type × size × hot. feat {W.ship.feat} · perf {W.ship.perf} · refactor {W.ship.refactor} · untyped {W.ship.other} ·
            chore/docs/test {W.ship.chore}
          </dd>
        </div>
        <div className="method-row">
          <dt>
            <i className="swatch swatch-fix" aria-hidden /> Fix
          </dt>
          <dd>
            fix, revert or hotfix PRs: {W.fix.base} × size × hot, +{W.fix.linkedIssueBonus} if it closes a linked issue
          </dd>
        </div>
        <div className="method-row">
          <dt>
            <i className="swatch swatch-unblock" aria-hidden /> Unblock
          </dt>
          <dd>
            best review per PR: approve {W.review.approve} · comment {W.review.comment} · changes requested {W.review.changes}.
            A bare approval of a bot PR earns {W.review.bareApproveOfBotPr}
          </dd>
        </div>
      </dl>
      <ul className="method-notes">
        <li>
          <b>Size</b> {W.size.floor}–1.0 by log of lines changed (1,000+ lines = 1.0), ignoring lockfiles, snapshots and generated
          code.
        </li>
        <li>
          <b>Hot</b> up to {1 + W.hot.maxBoost}× for files in the {hotAreas.length} areas touched by the most engineers, e.g.{' '}
          {hotAreas.slice(0, 4).join(', ')}.
        </li>
        <li>
          <b>Daily cap</b>: only a person&rsquo;s best {W.caps.prsPerDay} PRs and {W.caps.reviewsPerDay} reviews per day count, so
          agent-driven volume and rubber-stamping can&rsquo;t buy rank.
        </li>
        <li>Bots and deleted accounts are excluded; humans who review bot PRs still earn Unblock.</li>
      </ul>
      <details className="method-limits">
        <summary>Known limits</summary>
        <p>
          Only merged PRs are counted, so reviews on unmerged PRs are missing. PR type comes from the author&rsquo;s own title. Files
          after the first 100 in a PR are ignored. GitHub can&rsquo;t reliably tell staff from community contributors.
        </p>
      </details>
    </section>
  );
}
