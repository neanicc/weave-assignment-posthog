// Normalize data/raw/<day>.json pages into the compact public/data.json the page loads.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isBot } from '../src/lib/bots.ts';
import { areaOf, churnOf, isNoiseFile, parseType, reviewKind } from '../src/lib/classify.ts';
import { computeHotAreas } from '../src/lib/hot.ts';
import type { Dataset, PrRecord, ReviewRecord } from '../src/lib/types.ts';
import { FETCH_LIMITS } from '../src/lib/limits.ts';
import { WEIGHTS } from '../src/lib/weights.ts';
import { WINDOW_DAYS } from './fetch-config.ts';

const ROOT = join(import.meta.dirname, '..');
const RAW_DIR = join(ROOT, 'data', 'raw');
const OUT = join(ROOT, 'public', 'data.json');
const MAX_TITLE = 120;

interface RawFile { path: string; additions: number; deletions: number }
interface RawAuthor { login: string; __typename: string; avatarUrl?: string }
interface RawPr {
  number: number;
  title: string;
  mergedAt: string;
  author: RawAuthor | null;
  files: { nodes: RawFile[] };
  reviews: { totalCount: number; nodes: { author: RawAuthor | null; state: string; body: string; submittedAt: string | null; comments: { totalCount: number } }[] };
  closingIssuesReferences: { nodes: { number: number }[] };
}

// Only the newest WINDOW_DAYS files: older days left behind by earlier runs are dropped.
const days = readdirSync(RAW_DIR).filter((f) => f.endsWith('.json')).sort().slice(-WINDOW_DAYS);
for (let i = 1; i < days.length; i++) {
  const gap = (Date.parse(days[i].slice(0, 10)) - Date.parse(days[i - 1].slice(0, 10))) / 86400e3;
  if (gap !== 1) throw new Error(`missing raw days between ${days[i - 1]} and ${days[i]}; rerun npm run fetch`);
}
const raw = new Map<number, RawPr>();
for (const day of days) {
  for (const pr of JSON.parse(readFileSync(join(RAW_DIR, day), 'utf8')) as RawPr[]) raw.set(pr.number, pr);
}

const truncatedReviews = [...raw.values()].filter((r) => r.reviews.totalCount > r.reviews.nodes.length).length;
const avatars: Record<string, string> = {};
const filesByPr = new Map<number, string[]>();
const prs: PrRecord[] = [];
const reviews: ReviewRecord[] = [];

for (const r of [...raw.values()].sort((a, b) => a.number - b.number)) {
  const login = r.author?.login ?? 'ghost';
  const bot = isBot(r.author?.login, r.author?.__typename);
  if (!bot && r.author?.avatarUrl) avatars[login] = r.author.avatarUrl;
  const codeFiles = r.files.nodes.map((f) => f.path).filter((p) => !isNoiseFile(p));
  filesByPr.set(r.number, codeFiles);
  const { type, scope } = parseType(r.title);
  prs.push({
    n: r.number,
    title: r.title.length > MAX_TITLE ? `${r.title.slice(0, MAX_TITLE - 1)}…` : r.title,
    author: login,
    bot,
    mergedAt: r.mergedAt,
    type,
    scope,
    churn: churnOf(r.files.nodes),
    areas: [...new Set(codeFiles.map(areaOf))],
    hotShare: 0,
    closesIssue: r.closingIssuesReferences.nodes.length > 0,
  });
  for (const rv of r.reviews.nodes) {
    const reviewer = rv.author?.login;
    const kind = reviewKind(rv.state, rv.body ?? '', rv.comments.totalCount);
    if (!kind || !reviewer || !rv.submittedAt || isBot(reviewer, rv.author?.__typename) || reviewer === login) continue;
    reviews.push({ pr: r.number, reviewer, kind, submittedAt: rv.submittedAt });
  }
}

const hotAreas = computeHotAreas(prs, WEIGHTS.hot.topShare);
const hot = new Set(hotAreas);
for (const pr of prs) {
  const files = filesByPr.get(pr.n)!;
  pr.hotShare = files.length ? Math.round((files.filter((f) => hot.has(areaOf(f))).length / files.length) * 1000) / 1000 : 0;
}

const windowStart = `${days[0].slice(0, 10)}T00:00:00Z`;
const windowEnd = new Date(Date.parse(`${days[days.length - 1].slice(0, 10)}T00:00:00Z`) + 86400e3).toISOString();
const dataset: Dataset = {
  repo: 'PostHog/posthog',
  generatedAt: new Date().toISOString(),
  windowStart,
  windowEnd,
  hotAreas,
  avatars,
  prs,
  reviews,
};
const json = JSON.stringify(dataset);
writeFileSync(OUT, json);

const humans = prs.filter((p) => !p.bot);
console.log(`days ${days.length} (${days[0].slice(0, 10)} → ${days[days.length - 1].slice(0, 10)})`);
console.log(`PRs ${prs.length}, human ${humans.length}, bot ${prs.length - humans.length}`);
console.log(`reviews ${reviews.length}, engineers ${new Set(humans.map((p) => p.author)).size}`);
console.log(`PRs with reviews beyond the first ${FETCH_LIMITS.reviewsPerPr}: ${truncatedReviews}`);
console.log(`hot areas (${hotAreas.length}): ${hotAreas.join(', ')}`);
console.log(`wrote ${OUT} ${(json.length / 1e6).toFixed(2)} MB`);
