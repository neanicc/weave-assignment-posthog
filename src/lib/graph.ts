import type { Dataset } from './types.ts';

export interface ReviewEdge {
  a: string;
  b: string;
  aReviewedB: number;
  bReviewedA: number;
}

/** How often each pair in `logins` reviewed each other's merged PRs in the window. One count per reviewer per PR. */
export function reviewGraph(ds: Dataset, days: number, logins: string[]): ReviewEdge[] {
  const members = new Set(logins);
  const cutoff = Date.parse(ds.windowEnd) - days * 86400e3;
  const authorOf = new Map(ds.prs.map((p) => [p.n, p.author]));
  const seen = new Set<string>();
  const edges = new Map<string, ReviewEdge>();
  for (const r of ds.reviews) {
    const author = authorOf.get(r.pr);
    if (!author || author === r.reviewer || !members.has(author) || !members.has(r.reviewer)) continue;
    if (Date.parse(r.submittedAt) < cutoff) continue;
    const once = `${r.reviewer}#${r.pr}`;
    if (seen.has(once)) continue;
    seen.add(once);
    const [a, b] = [r.reviewer, author].sort();
    const key = `${a}|${b}`;
    const e = edges.get(key) ?? { a, b, aReviewedB: 0, bReviewedA: 0 };
    if (r.reviewer === a) e.aReviewedB++;
    else e.bReviewedA++;
    edges.set(key, e);
  }
  return [...edges.values()].sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}
