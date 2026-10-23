import { describe, expect, it } from 'vitest';
import { reviewGraph } from './graph.ts';
import type { Dataset } from './types.ts';

const END = '2026-10-22T00:00:00Z';
const ago = (d: number) => new Date(Date.parse(END) - d * 86400e3).toISOString();
const pr = (n: number, author: string) => ({
  n, title: `pr ${n}`, author, bot: false, mergedAt: ago(1), type: 'feat' as const,
  scope: null, churn: 10, areas: [], hotShare: 0, closesIssue: false,
});
const ds = (reviews: Dataset['reviews']): Dataset => ({
  repo: 'x', generatedAt: END, windowStart: ago(120), windowEnd: END, hotAreas: [], avatars: {},
  prs: [pr(1, 'alice'), pr(2, 'alice'), pr(3, 'bob'), pr(4, 'carol')],
  reviews,
});

describe('reviewGraph', () => {
  it('counts reviews between members in both directions, once per PR', () => {
    const edges = reviewGraph(
      ds([
        { pr: 1, reviewer: 'bob', kind: 'approve', submittedAt: ago(1) },
        { pr: 1, reviewer: 'bob', kind: 'comment', submittedAt: ago(1) },
        { pr: 2, reviewer: 'bob', kind: 'comment', submittedAt: ago(2) },
        { pr: 3, reviewer: 'alice', kind: 'changes', submittedAt: ago(2) },
      ]),
      90,
      ['alice', 'bob'],
    );
    expect(edges).toEqual([{ a: 'alice', b: 'bob', aReviewedB: 1, bReviewedA: 2 }]);
  });

  it('ignores people outside the set and reviews outside the window', () => {
    const edges = reviewGraph(
      ds([
        { pr: 4, reviewer: 'bob', kind: 'comment', submittedAt: ago(1) },
        { pr: 1, reviewer: 'bob', kind: 'comment', submittedAt: ago(40) },
      ]),
      30,
      ['alice', 'bob'],
    );
    expect(edges).toEqual([]);
  });
});
