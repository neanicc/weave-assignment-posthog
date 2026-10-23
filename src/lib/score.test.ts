import { describe, expect, it } from 'vitest';
import { prPoints, scoreEngineers, sizeFactor } from './score.ts';
import type { Dataset, PrRecord, ReviewRecord } from './types.ts';

const END = '2026-10-22T00:00:00Z';
const daysAgo = (d: number) => new Date(Date.parse(END) - d * 86400e3).toISOString();

function pr(n: number, over: Partial<PrRecord> = {}): PrRecord {
  return {
    n,
    title: `feat: pr ${n}`,
    author: 'alice',
    bot: false,
    mergedAt: daysAgo(1),
    type: 'feat',
    scope: null,
    churn: 999,
    areas: ['posthog/hogql'],
    hotShare: 0,
    closesIssue: false,
    ...over,
  };
}

function review(prN: number, reviewer: string, over: Partial<ReviewRecord> = {}): ReviewRecord {
  return { pr: prN, reviewer, kind: 'comment', submittedAt: daysAgo(1), ...over };
}

function dataset(prs: PrRecord[], reviews: ReviewRecord[] = []): Dataset {
  return {
    repo: 'PostHog/posthog',
    generatedAt: END,
    windowStart: daysAgo(120),
    windowEnd: END,
    hotAreas: [],
    avatars: {},
    prs,
    reviews,
  };
}

describe('sizeFactor', () => {
  it('floors at 0.5 and caps at 1', () => {
    expect(sizeFactor(0)).toBe(0.5);
    expect(sizeFactor(999)).toBeCloseTo(1.0, 9);
    expect(sizeFactor(9)).toBeCloseTo(0.6667, 4);
    expect(sizeFactor(1e6)).toBe(1);
  });
});

describe('prPoints', () => {
  it('a large feature in a cold area is worth 3', () => {
    const p = prPoints(pr(1));
    expect(p.pillar).toBe('ship');
    expect(p.points).toBeCloseTo(3, 9);
  });
  it('a small hot fix that closes an issue is worth about 3', () => {
    const p = prPoints(pr(2, { type: 'fix', churn: 9, hotShare: 1, closesIssue: true }));
    expect(p.pillar).toBe('fix');
    expect(p.points).toBeCloseTo(2 * 0.6667 * 1.5 + 1, 3);
    expect(p.bonus).toBe(1);
  });
  it('reverts are fixes, chores are cheap ship', () => {
    expect(prPoints(pr(3, { type: 'revert' })).pillar).toBe('fix');
    const chore = prPoints(pr(4, { type: 'chore', churn: 9, hotShare: 0.5 }));
    expect(chore.pillar).toBe('ship');
    expect(chore.points).toBeCloseTo(0.5 * 0.6667 * 1.25, 3);
  });
});

describe('scoreEngineers', () => {
  it('counts every PR in exactly one pillar', () => {
    const ds = dataset([
      pr(1),
      pr(2, { type: 'fix' }),
      pr(3, { type: 'revert', author: 'bob' }),
      pr(4, { type: 'chore', author: 'bob' }),
    ]);
    const out = scoreEngineers(ds, 90);
    const seen = out.flatMap((e) => e.prs.map((p) => p.n));
    expect(seen.sort()).toEqual([1, 2, 3, 4]);
    for (const e of out) {
      expect(e.ship + e.fix).toBeCloseTo(e.prs.reduce((s, p) => s + p.points, 0), 9);
      expect(e.ship).toBeCloseTo(e.prs.filter((p) => p.pillar === 'ship').reduce((s, p) => s + p.points, 0), 9);
    }
  });

  it('keeps the best review per reviewer and PR', () => {
    const ds = dataset([pr(1)], [review(1, 'bob', { kind: 'approve' }), review(1, 'bob', { kind: 'changes' })]);
    const bob = scoreEngineers(ds, 90).find((e) => e.login === 'bob')!;
    expect(bob.reviews).toHaveLength(1);
    expect(bob.unblock).toBe(1.5);
  });

  it('excludes self-reviews and bot reviewers', () => {
    const ds = dataset([pr(1)], [review(1, 'alice'), review(1, 'stamphog')]);
    const out = scoreEngineers(ds, 90);
    expect(out.map((e) => e.login)).toEqual(['alice']);
    expect(out[0].unblock).toBe(0);
  });

  it('credits humans who review bot-authored PRs', () => {
    const ds = dataset([pr(1, { author: 'posthog', bot: true })], [review(1, 'carol')]);
    const out = scoreEngineers(ds, 90);
    expect(out.map((e) => e.login)).toEqual(['carol']);
    expect(out[0].unblock).toBe(1);
    expect(out[0].reviews[0].prAuthor).toBe('posthog');
  });

  it('gives nothing for a bare approval of a bot PR', () => {
    const ds = dataset(
      [pr(1, { author: 'dependabot[bot]', bot: true }), pr(2, { author: 'posthog', bot: true })],
      [review(1, 'carol', { kind: 'approve' }), review(2, 'carol', { kind: 'changes' })],
    );
    const carol = scoreEngineers(ds, 90).find((e) => e.login === 'carol')!;
    expect(carol.unblock).toBe(1.5);
    expect(carol.reviews.find((r) => r.pr === 1)!.points).toBe(0);
  });

  it('counts distinct authors helped', () => {
    const ds = dataset([pr(1), pr(2), pr(3, { author: 'dan' })], [review(1, 'bob'), review(2, 'bob'), review(3, 'bob')]);
    expect(scoreEngineers(ds, 90).find((e) => e.login === 'bob')!.stats.authorsHelped).toBe(2);
  });

  it('filters PRs by mergedAt and reviews by submittedAt', () => {
    const ds = dataset(
      [pr(1, { mergedAt: daysAgo(40) }), pr(2, { author: 'dan' })],
      [review(2, 'bob', { submittedAt: daysAgo(40) })],
    );
    expect(scoreEngineers(ds, 30).map((e) => e.login)).toEqual(['dan']);
    const at90 = scoreEngineers(ds, 90).map((e) => e.login);
    expect(at90).toContain('alice');
    expect(at90).toContain('bob');
  });

  it('never ranks bots or deleted accounts', () => {
    const ds = dataset([pr(1, { author: 'ghost', bot: true }), pr(2, { author: 'dependabot[bot]', bot: true }), pr(3)]);
    expect(scoreEngineers(ds, 90).map((e) => e.login)).toEqual(['alice']);
  });

  it('breaks ties by breadth of areas', () => {
    const ds = dataset([
      pr(1, { author: 'narrow', areas: ['a'] }),
      pr(2, { author: 'broad', areas: ['a', 'b'] }),
    ]);
    expect(scoreEngineers(ds, 90).map((e) => e.login)).toEqual(['broad', 'narrow']);
  });

  it('returns nothing for an empty window', () => {
    expect(scoreEngineers(dataset([], []), 30)).toEqual([]);
  });
});
