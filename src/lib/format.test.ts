import { describe, expect, it } from 'vitest';
import { fmt, prUrl, summary } from './format.ts';
import type { EngineerScore } from './score.ts';

function eng(over: Partial<EngineerScore>): EngineerScore {
  return {
    login: 'a',
    avatar: '',
    total: 0,
    ship: 0,
    fix: 0,
    unblock: 0,
    prs: [],
    reviews: [],
    stats: { prCount: 0, byType: {}, reviewCount: 0, authorsHelped: 0, areas: 0, hotShare: 0 },
    ...over,
  };
}

const scoredPr = (scope: string | null, points: number) =>
  ({ scope, points }) as EngineerScore['prs'][number];

describe('format', () => {
  it('formats points to one decimal', () => {
    expect(fmt(12.345)).toBe('12.3');
    expect(fmt(1234.5)).toBe('1,234.5');
  });

  it('links PRs to GitHub', () => {
    expect(prUrl(123)).toBe('https://github.com/PostHog/posthog/pull/123');
  });

  it('summarizes a feature shipper by their top scopes', () => {
    const e = eng({
      ship: 80,
      fix: 10,
      unblock: 10,
      total: 100,
      prs: [scoredPr('flags', 30), scoredPr('flags', 20), scoredPr('hogql', 25), scoredPr(null, 5)],
    });
    expect(summary(e)).toBe('Mostly ships new work in flags and hogql');
  });

  it('summarizes a fixer', () => {
    const e = eng({ ship: 20, fix: 60, unblock: 20, total: 100, prs: [scoredPr('ingestion', 10)] });
    expect(summary(e)).toBe('Mostly fixes what breaks in ingestion');
  });

  it('summarizes a reviewer by who they unblock', () => {
    const e = eng({ ship: 10, fix: 0, unblock: 90, total: 100, stats: { ...eng({}).stats, authorsHelped: 14 } });
    expect(summary(e)).toBe('Mostly unblocks others, reviewing work from 14 engineers');
  });
});
