import type { EngineerScore } from './score.ts';

const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmt = (points: number): string => nf.format(points);

export const prUrl = (n: number): string => `https://github.com/PostHog/posthog/pull/${n}`;

export const pct = (share: number): string => `${Math.round(share * 100)}%`;

function topScopes(e: EngineerScore, pillar: 'ship' | 'fix', count = 2): string[] {
  const byScope = new Map<string, number>();
  for (const p of e.prs) {
    if (!p.scope || (p.pillar && p.pillar !== pillar)) continue;
    byScope.set(p.scope, (byScope.get(p.scope) ?? 0) + p.points);
  }
  return [...byScope].sort((a, b) => b[1] - a[1]).slice(0, count).map(([s]) => s);
}

/** One plain sentence on where this person's points come from. */
export function summary(e: EngineerScore): string {
  const lead = (['ship', 'fix', 'unblock'] as const).reduce((a, b) => (e[b] > e[a] ? b : a));
  if (lead === 'unblock') return `Mostly unblocks others, reviewing work from ${e.stats.authorsHelped} engineers`;
  const scopes = topScopes(e, lead);
  const where = scopes.length ? ` in ${scopes.join(' and ')}` : '';
  return lead === 'ship' ? `Mostly ships new work${where}` : `Mostly fixes what breaks${where}`;
}
