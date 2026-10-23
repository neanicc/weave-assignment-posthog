import { isBot } from './bots.ts';
import type { Dataset, PrRecord, PrType, ReviewKind } from './types.ts';
import { WEIGHTS } from './weights.ts';

export type Pillar = 'ship' | 'fix';

export interface ScoredPr extends PrRecord {
  pillar: Pillar;
  points: number;
  base: number;
  size: number;
  hot: number;
  bonus: number;
  capped: boolean;
}

export interface ScoredReview {
  pr: number;
  title: string;
  prAuthor: string;
  kind: ReviewKind;
  points: number;
  submittedAt: string;
  capped: boolean;
}

export interface EngineerScore {
  login: string;
  avatar: string;
  total: number;
  ship: number;
  fix: number;
  unblock: number;
  prs: ScoredPr[];
  reviews: ScoredReview[];
  stats: {
    prCount: number;
    byType: Partial<Record<PrType, number>>;
    reviewCount: number;
    authorsHelped: number;
    areas: number;
    hotShare: number;
  };
}

export function sizeFactor(churn: number): number {
  const { floor, logCap } = WEIGHTS.size;
  return floor + (1 - floor) * Math.min(1, Math.log10(1 + churn) / logCap);
}

const FIX_TYPES: PrType[] = ['fix', 'revert'];

/** Points for one PR. A PR is either a fix (Fix pillar) or not (Ship pillar), never both. */
export function prPoints(pr: PrRecord): Omit<ScoredPr, keyof PrRecord | 'capped'> {
  const size = sizeFactor(pr.churn);
  const hot = 1 + WEIGHTS.hot.maxBoost * pr.hotShare;
  if (FIX_TYPES.includes(pr.type)) {
    const base = WEIGHTS.fix.base;
    const bonus = pr.closesIssue ? WEIGHTS.fix.linkedIssueBonus : 0;
    return { pillar: 'fix', base, size, hot, bonus, points: base * size * hot + bonus };
  }
  const base = WEIGHTS.ship[pr.type as keyof typeof WEIGHTS.ship];
  return { pillar: 'ship', base, size, hot, bonus: 0, points: base * size * hot };
}

/** Keep the best `cap` items per UTC day; zero out and flag the rest. */
function applyDailyCap<T extends { points: number; capped: boolean }>(items: T[], dayOf: (t: T) => string, cap: number): void {
  const byDay = new Map<string, T[]>();
  for (const it of items) {
    const d = dayOf(it).slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(it);
  }
  for (const group of byDay.values()) {
    group.sort((a, b) => b.points - a.points);
    for (const it of group.slice(cap)) {
      it.capped = true;
      it.points = 0;
    }
  }
}

function reviewPoints(kind: ReviewKind, prIsBot: boolean): number {
  if (kind === 'approve' && prIsBot) return WEIGHTS.review.bareApproveOfBotPr;
  return WEIGHTS.review[kind];
}

/** Rank humans by Ship + Fix + Unblock over the `days` before the dataset's windowEnd. */
export function scoreEngineers(ds: Dataset, days: number): EngineerScore[] {
  const cutoff = Date.parse(ds.windowEnd) - days * 86400e3;
  const byNumber = new Map(ds.prs.map((p) => [p.n, p]));
  const people = new Map<string, EngineerScore>();
  const get = (login: string): EngineerScore => {
    let e = people.get(login);
    if (!e) {
      e = {
        login,
        avatar: ds.avatars[login] ?? `https://github.com/${login}.png?size=80`,
        total: 0,
        ship: 0,
        fix: 0,
        unblock: 0,
        prs: [],
        reviews: [],
        stats: { prCount: 0, byType: {}, reviewCount: 0, authorsHelped: 0, areas: 0, hotShare: 0 },
      };
      people.set(login, e);
    }
    return e;
  };

  for (const pr of ds.prs) {
    if (pr.bot || isBot(pr.author) || Date.parse(pr.mergedAt) < cutoff) continue;
    get(pr.author).prs.push({ ...pr, ...prPoints(pr), capped: false });
  }

  const best = new Map<string, ScoredReview & { reviewer: string }>();
  for (const r of ds.reviews) {
    const pr = byNumber.get(r.pr);
    if (!pr || isBot(r.reviewer) || r.reviewer === pr.author || Date.parse(r.submittedAt) < cutoff) continue;
    const points = reviewPoints(r.kind, pr.bot || isBot(pr.author));
    const key = `${r.reviewer}#${r.pr}`;
    const prev = best.get(key);
    if (!prev || points > prev.points) {
      best.set(key, { reviewer: r.reviewer, pr: r.pr, title: pr.title, prAuthor: pr.author, kind: r.kind, points, submittedAt: r.submittedAt, capped: false });
    }
  }
  for (const { reviewer, ...review } of best.values()) get(reviewer).reviews.push(review);

  const out = [...people.values()];
  for (const e of out) {
    applyDailyCap(e.prs, (p) => p.mergedAt, WEIGHTS.caps.prsPerDay);
    applyDailyCap(e.reviews, (r) => r.submittedAt, WEIGHTS.caps.reviewsPerDay);
    for (const p of e.prs) e[p.pillar] += p.points;
    e.unblock = e.reviews.reduce((s, r) => s + r.points, 0);
    e.total = e.ship + e.fix + e.unblock;
    e.prs.sort((a, b) => b.points - a.points);
    e.reviews.sort((a, b) => b.points - a.points);
    const byType: Partial<Record<PrType, number>> = {};
    for (const p of e.prs) byType[p.type] = (byType[p.type] ?? 0) + 1;
    e.stats = {
      prCount: e.prs.length,
      byType,
      reviewCount: e.reviews.length,
      authorsHelped: new Set(e.reviews.map((r) => r.prAuthor)).size,
      areas: new Set(e.prs.flatMap((p) => p.areas)).size,
      hotShare: e.prs.length ? e.prs.reduce((s, p) => s + p.hotShare, 0) / e.prs.length : 0,
    };
  }
  return out.sort((a, b) => b.total - a.total || b.stats.areas - a.stats.areas || a.login.localeCompare(b.login));
}
