// Fetch every merged PR in PostHog/posthog for the last WINDOW_DAYS UTC days,
// one GraphQL search per day (search caps at 1,000 results per query).
// Raw pages land in data/raw/<day>.json; reruns skip days already on disk.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const REPO = 'PostHog/posthog';
export const WINDOW_DAYS = 120;
const RAW_DIR = join(import.meta.dirname, '..', 'data', 'raw');
const CONCURRENCY = 4;
const PAGE_SIZE = 50;

const QUERY = `query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: ${PAGE_SIZE}, after: $after) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes { ... on PullRequest {
      number title url mergedAt createdAt additions deletions
      author { login __typename avatarUrl }
      labels(first: 10) { nodes { name } }
      files(first: 100) { nodes { path additions deletions } }
      reviews(first: 40) { nodes { author { login __typename } state body submittedAt comments { totalCount } } }
      closingIssuesReferences(first: 3) { nodes { number } }
    } }
  }
  rateLimit { cost remaining }
}`;

function token(): string {
  return process.env.GITHUB_TOKEN ?? execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql(tok: string, variables: Record<string, unknown>): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables }),
    });
    const body: any = res.ok ? await res.json() : null;
    if (res.ok && !body.errors) return body.data;
    if (attempt >= 3) {
      throw new Error(`GraphQL failed (${res.status}): ${JSON.stringify(body?.errors ?? (await res.text()))}`);
    }
    await sleep(2000 * 2 ** attempt);
  }
}

function utcDay(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

async function fetchDay(tok: string, day: string): Promise<void> {
  const q = `repo:${REPO} is:pr is:merged merged:${day}..${day}`;
  const nodes: unknown[] = [];
  let after: string | null = null;
  let issueCount = 0;
  let remaining = 0;
  do {
    const data = await gql(tok, { q, after });
    issueCount = data.search.issueCount;
    if (issueCount > 1000) throw new Error(`${day}: ${issueCount} PRs exceeds the 1,000 search cap`);
    nodes.push(...data.search.nodes);
    remaining = data.rateLimit.remaining;
    after = data.search.pageInfo.hasNextPage ? data.search.pageInfo.endCursor : null;
  } while (after);
  if (nodes.length !== issueCount) throw new Error(`${day}: fetched ${nodes.length} of ${issueCount} PRs`);
  writeFileSync(join(RAW_DIR, `${day}.json`), JSON.stringify(nodes));
  console.log(`${day}  ${String(nodes.length).padStart(4)} PRs  rate remaining ${remaining}`);
}

async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  const tok = token();
  // Today and yesterday are always refetched because they may still be filling in.
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => utcDay(i)).filter(
    (day, i) => i < 2 || !existsSync(join(RAW_DIR, `${day}.json`)),
  );
  console.log(`fetching ${days.length} days`);
  const queue = [...days];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let day = queue.shift(); day; day = queue.shift()) await fetchDay(tok, day);
    }),
  );
  console.log('done');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
