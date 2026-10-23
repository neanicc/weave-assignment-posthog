import { useMemo, useState } from 'react';
import { fmt } from '../lib/format.ts';
import { reviewGraph, type ReviewEdge } from '../lib/graph.ts';
import type { EngineerScore } from '../lib/score.ts';
import type { Dataset } from '../lib/types.ts';

interface Props {
  data: Dataset;
  days: number;
  engineers: EngineerScore[];
  onOpen: (login: string) => void;
}

const W = 770;
const H = 620;
const CX = W / 2;
const CY = H / 2;
const RING = 222;
const MIN_LINK = 2;

function partnersOf(login: string, edges: ReviewEdge[]) {
  return edges
    .filter((e) => e.a === login || e.b === login)
    .map((e) =>
      e.a === login
        ? { who: e.b, gave: e.aReviewedB, got: e.bReviewedA }
        : { who: e.a, gave: e.bReviewedA, got: e.aReviewedB },
    )
    .sort((x, y) => y.gave + y.got - (x.gave + x.got));
}

/** The top engineers on a ring; a line's thickness is how often a pair reviewed each other's PRs. */
export function ReviewNetwork({ data, days, engineers, onOpen }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const logins = useMemo(() => engineers.map((e) => e.login), [engineers]);
  const edges = useMemo(() => reviewGraph(data, days, logins), [data, days, logins]);
  const shown = edges.filter((e) => e.aReviewedB + e.bReviewedA >= MIN_LINK);
  const maxW = Math.max(1, ...shown.map((e) => e.aReviewedB + e.bReviewedA));
  const maxTotal = engineers[0]?.total ?? 1;

  const pos = new Map(
    engineers.map((e, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / engineers.length;
      const r = 15 + 15 * Math.sqrt(e.total / maxTotal);
      return [e.login, { x: CX + RING * Math.cos(angle), y: CY + RING * Math.sin(angle), r, angle }];
    }),
  );
  const linked = (login: string) => active === login || shown.some((e) => (e.a === active && e.b === login) || (e.b === active && e.a === login));
  const activeEng = engineers.find((e) => e.login === active);
  const partners = active ? partnersOf(active, edges) : [];
  const gave = partners.reduce((s, p) => s + p.gave, 0);
  const got = partners.reduce((s, p) => s + p.got, 0);

  return (
    <div className="network">
      <div className="network-note" aria-live="polite">
        {activeEng ? (
          <>
            <p className="network-note-title">
              {activeEng.login} <span className="muted">· {fmt(activeEng.total)} points</span>
            </p>
            <p>
              Reviewed {gave} PRs from this group and got {got} reviews back.
            </p>
            {partners.length > 0 && (
              <ul className="network-partners">
                {partners.slice(0, 4).map((p) => (
                  <li key={p.who}>
                    <span>{p.who}</span>
                    <span className="num muted">
                      gave {p.gave} · got {p.got}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted">Click to see every point.</p>
          </>
        ) : (
          <>
            <p className="network-note-title">Who reviews whom</p>
            <p>
              The top {engineers.length} engineers, last {days} days. A thicker line means two people reviewed each
              other&rsquo;s PRs more often. Bigger circles have more points.
            </p>
            <p className="muted">Hover or tab to a person to see their links.</p>
          </>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="network-svg" role="img" aria-label="Review network of the top engineers">
        <g className="network-edges">
          {shown.map((e) => {
            const p = pos.get(e.a)!;
            const q = pos.get(e.b)!;
            const w = e.aReviewedB + e.bReviewedA;
            const mx = (p.x + q.x) / 2;
            const my = (p.y + q.y) / 2;
            const cx = mx + (CX - mx) * 0.45;
            const cy = my + (CY - my) * 0.45;
            const on = active !== null && (e.a === active || e.b === active);
            const off = active !== null && !on;
            return (
              <path
                key={`${e.a}|${e.b}`}
                d={`M${p.x},${p.y} Q${cx},${cy} ${q.x},${q.y}`}
                className={`edge${on ? ' is-on' : ''}${off ? ' is-off' : ''}`}
                style={{ strokeWidth: 1 + 6 * (w / maxW), opacity: off ? undefined : 0.16 + 0.5 * (w / maxW) }}
              />
            );
          })}
        </g>
        {engineers.map((e, i) => {
          const p = pos.get(e.login)!;
          const lx = CX + (RING + p.r + 14) * Math.cos(p.angle);
          const ly = CY + (RING + p.r + 14) * Math.sin(p.angle);
          const anchor = Math.abs(Math.cos(p.angle)) < 0.3 ? 'middle' : Math.cos(p.angle) > 0 ? 'start' : 'end';
          const dim = active !== null && !linked(e.login);
          return (
            <g
              key={e.login}
              className={`node${dim ? ' is-dim' : ''}${active === e.login ? ' is-active' : ''}`}
              style={{ ['--i' as string]: i }}
              tabIndex={0}
              role="button"
              aria-label={`${e.login}, rank ${i + 1}, ${fmt(e.total)} points`}
              onMouseEnter={() => setActive(e.login)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(e.login)}
              onBlur={() => setActive(null)}
              onClick={() => onOpen(e.login)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onOpen(e.login);
                }
              }}
            >
              <clipPath id={`clip-${i}`}>
                <circle cx={p.x} cy={p.y} r={p.r} />
              </clipPath>
              <circle className="node-ring" cx={p.x} cy={p.y} r={p.r + 3} />
              <image
                href={e.avatar}
                x={p.x - p.r}
                y={p.y - p.r}
                width={p.r * 2}
                height={p.r * 2}
                clipPath={`url(#clip-${i})`}
                preserveAspectRatio="xMidYMid slice"
              />
              <text x={lx} y={ly + 4} textAnchor={anchor} className="node-label">
                {i + 1}. {e.login}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
