/** Areas touched by the most distinct human authors: the shared, high-traffic code. */
export function computeHotAreas(prs: { author: string; bot: boolean; areas: string[] }[], topShare: number): string[] {
  const authors = new Map<string, Set<string>>();
  for (const pr of prs) {
    if (pr.bot) continue;
    for (const area of pr.areas) {
      if (!authors.has(area)) authors.set(area, new Set());
      authors.get(area)!.add(pr.author);
    }
  }
  const ranked = [...authors].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
  if (ranked.length === 0) return [];
  return ranked.slice(0, Math.max(1, Math.ceil(ranked.length * topShare))).map(([area]) => area);
}
