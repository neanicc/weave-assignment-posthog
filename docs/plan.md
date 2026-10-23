# PostHog Impact Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static one-page dashboard that ranks the top 5 most impactful PostHog engineers with Ship + Fix + Unblock points, where every number traces back to linked PRs.

**Architecture:** A build-time script fetches 120 days of merged PRs from GitHub GraphQL (one search per day) into `data/raw/`. A second script normalizes them into a compact `public/data.json`. The browser loads that JSON and scores it with a pure library, so the 30/90/120-day toggle is instant and nothing calls GitHub at runtime.

**Tech Stack:** Vite + React 18 + TypeScript (strict), Vitest, tsx, plain CSS tokens. Hosted on Vercel.

**Spec:** [docs/superpowers/specs/2026-10-22-impact-dashboard-design.md](superpowers/specs/2026-10-22-impact-dashboard-design.md)

## Global Constraints

- Window: fetch **120 days** ending today (UTC). The UI toggle offers 30 / 90 / 120 days, default **90**.
- Each PR scores in exactly one pillar: fix/revert/hotfix → Fix, everything else → Ship.
- Weights live only in `src/lib/weights.ts`, and the methodology panel renders them from there.
- Humans only. Bot-authored PRs earn nothing. Humans reviewing bot PRs still earn Unblock.
- No GitHub calls from the browser. The page must load in under 10 s; aim for under 1 s.
- Must fit one laptop screen (1440×900) with the top 5 visible and no scrolling. Light and dark themes. Respect `prefers-reduced-motion`.
- Every PR mention is a link to `https://github.com/PostHog/posthog/pull/<n>`.
- Commits follow Conventional Commits with no AI attribution. Branches are `wv/<nn>-<slug>`.
- Delivery is two PRs. **PR 1 = WV-01..03** (branch `wv/01-data-scoring`). **PR 2 = WV-04..05** (branch `wv/04-dashboard`, stacked on PR 1).

## Review Focus

1. **Deleted accounts (`author: null`, shown as "ghost")** are treated as bots and excluded, with no crash. Tests: `isBot(undefined)` in Task 1 and a ghost PR in the Task 2 fixture.
2. **Messy titles** (no prefix, uppercase `Feat(X)`, breaking `feat(x)!:`, `Revert "…"`, `hotfix` inside a chore) classify the way a human would. Tests are in Task 1.
3. **Silent truncation from the search cap or a missed page.** A day with `issueCount > 1000`, or fewer PRs fetched than `issueCount`, fails the fetch loudly instead of under-counting. The check is in `scripts/fetch.ts` (Task 3).
4. **A sparse window** (fewer than 10 engineers, or no data at all) renders what exists, without crashing or showing empty cards. Test: `scoreEngineers(emptyDataset, 30)` returns `[]` (Task 2); the UI guards on length (Task 4).
5. **Humans with names that look like bots** (`jordanm-posthog` is a person) are never filtered out. Test is in Task 1.

---

### Task 1 (WV-01): Project setup, types, classification, bot filter

**Files:**
- Create: the Vite React-TS app at the repo root (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`)
- Create: `src/lib/types.ts`, `src/lib/classify.ts`, `src/lib/bots.ts`
- Test: `src/lib/classify.test.ts`, `src/lib/bots.test.ts`

**Interfaces — Produces:**
```ts
// types.ts
export type PrType = 'feat' | 'fix' | 'perf' | 'refactor' | 'revert' | 'chore' | 'other';
export type ReviewKind = 'approve' | 'comment' | 'changes';
export interface PrRecord { n: number; title: string; author: string; bot: boolean; mergedAt: string;
  type: PrType; scope: string | null; churn: number; areas: string[]; hotShare: number; closesIssue: boolean }
export interface ReviewRecord { pr: number; reviewer: string; kind: ReviewKind; submittedAt: string }
export interface Dataset { repo: string; generatedAt: string; windowStart: string; windowEnd: string;
  hotAreas: string[]; avatars: Record<string, string>; prs: PrRecord[]; reviews: ReviewRecord[] }
// classify.ts
export function parseType(title: string): { type: PrType; scope: string | null };
export function areaOf(path: string): string;
export function isNoiseFile(path: string): boolean;
export function churnOf(files: { path: string; additions: number; deletions: number }[]): number;
export function reviewKind(state: string, body: string, commentCount: number): ReviewKind | null;
// bots.ts
export function isBot(login: string | undefined | null, typename?: string): boolean;
```

- [ ] **Step 1: Scaffold the app.** Run `npm create vite@latest tmpapp -- --template react-ts`, move its files to the root, then `npm i` and `npm i -D vitest tsx @types/node`. Add these scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `typecheck` (`tsc -b --noEmit` or the equivalent), `check` (`npm run typecheck && npm test && npm run build`), `fetch` (`tsx scripts/fetch.ts`), `build-data` (`tsx scripts/build-data.ts`). Pin exact versions (`save-exact=true` in `.npmrc`).
- [ ] **Step 2: Write failing tests.**
  - `parseType`:
    - `'feat(flags): x'` → `{feat,'flags'}`
    - `'fix: x'` → `{fix,null}`
    - `'Feat(Data-Warehouse): x'` → `{feat,'data-warehouse'}`
    - `'feat(api)!: x'` → `feat`
    - `'Revert "feat: x"'` → `revert`
    - `'chore(ci): hotfix deploy'` → `fix`
    - `'docs(x): y'`, `'test: y'`, `'ci: y'`, `'build: y'`, `'style: y'` → `chore`
    - `'perf(query): y'` → `perf`
    - `'Update README'` → `{other,null}`
    - `'61 fix action url'` → `other`
  - `areaOf`:
    - `'products/feature_flags/backend/a.py'` → `'products/feature_flags'`
    - `'frontend/src/scenes/insights/a.tsx'` → `'frontend/src/scenes/insights'`
    - `'frontend/src/lib/a.ts'` → `'frontend/src/lib'`
    - `'posthog/hogql/parser.py'` → `'posthog/hogql'`
    - `'rust/capture/src/a.rs'` → `'rust/capture'`
    - `'nodejs/src/cdp/a.ts'` → `'nodejs/src/cdp'`
    - `'ee/billing/a.py'` → `'ee/billing'`
    - `'docker/compose.yml'` → `'docker/compose.yml'`
    - `'README.md'` → `'(root)'`
  - `isNoiseFile`:
    - true for `pnpm-lock.yaml`, `uv.lock`, `a/__snapshots__/b.ambr`, `x.snap`, `frontend/src/queries/schema.json`
    - false for `posthog/models/a.py`
  - `churnOf([{path:'a.py',additions:10,deletions:5},{path:'pnpm-lock.yaml',additions:900,deletions:900}])` → `15`
  - `reviewKind`:
    - `('APPROVED','',0)` → `approve`
    - `('APPROVED','lgtm but…',0)` → `comment`
    - `('COMMENTED','',2)` → `comment`
    - `('CHANGES_REQUESTED','',0)` → `changes`
    - `('DISMISSED','x',1)` and `('PENDING','',0)` → `null`
  - `isBot`:
    - true for `'dependabot[bot]'`, `'dependabot-preview'`, `'posthog'`, `'stamphog'`, `'github-actions'`, `'greptile-apps'`, `'copilot-swe-agent'`, `'posthog-js-upgrader'`, `'scheduled-actions-posthog'`, `'renovate-bot'`, `('anyone','Bot')`, `undefined`, `null`
    - false for `'pauldambra'`, `'jordanm-posthog'`, `'haacked'`
- [ ] **Step 3: Run** `npx vitest run src/lib`. Expected: FAIL (the modules don't exist yet).
- [ ] **Step 4: Implement** `classify.ts` and `bots.ts`. The type regex runs case-insensitively on `^(\w+)(\(([^)]*)\))?!?:`. Map docs/test/ci/build/style/chore to `chore` and any unknown word to `other`. `hotfix` anywhere in the title, or a title starting with `Revert`, overrides the type to fix or revert. For areas, apply the first matching rule: `frontend/src/scenes/<x>` keeps 4 segments; `frontend/src/<x>`, `nodejs/src/<x>` and `plugin-server/src/<x>` keep 3; a single-segment path becomes `(root)`; anything else keeps its first 2 segments (this covers `products/<x>`, `posthog/<x>`, `ee/<x>` and `rust/<x>`). Bots: exact denylist plus the prefixes `dependabot`, `greptile`, `copilot`, and the suffixes `[bot]` and `-bot`.
- [ ] **Step 5: Run** `npx vitest run src/lib && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit** on `wv/01-data-scoring`: `feat(scoring): add PR classification and bot filter`.

### Task 2 (WV-02): Weights and scoring

**Files:**
- Create: `src/lib/weights.ts`, `src/lib/hot.ts`, `src/lib/score.ts`
- Test: `src/lib/score.test.ts`, `src/lib/hot.test.ts`

**Interfaces — Consumes:** the Task 1 types. **Produces:**
```ts
// weights.ts (values verbatim from the spec)
export const WEIGHTS = {
  ship: { feat: 3, perf: 2, refactor: 1.5, other: 1, chore: 0.5 },
  fix: { base: 2, linkedIssueBonus: 1 },
  review: { approve: 0.5, comment: 1, changes: 1.5 },
  size: { floor: 0.5, logCap: 3 },      // s = floor + (1-floor) * min(1, log10(1+churn)/logCap)
  hot: { maxBoost: 0.5, topShare: 0.1 } // h = 1 + maxBoost * hotShare
} as const;
// hot.ts
export function computeHotAreas(prs: { author: string; bot: boolean; areas: string[] }[], topShare: number): string[];
// score.ts
export type Pillar = 'ship' | 'fix';
export interface ScoredPr extends PrRecord { pillar: Pillar; points: number; base: number; size: number; hot: number; bonus: number }
export interface ScoredReview { pr: number; title: string; prAuthor: string; kind: ReviewKind; points: number; submittedAt: string }
export interface EngineerScore { login: string; avatar: string; total: number; ship: number; fix: number; unblock: number;
  prs: ScoredPr[]; reviews: ScoredReview[];
  stats: { prCount: number; byType: Partial<Record<PrType, number>>; reviewCount: number; authorsHelped: number; areas: number; hotShare: number } }
export function sizeFactor(churn: number): number;
export function prPoints(pr: PrRecord): Omit<ScoredPr, keyof PrRecord>;
export function scoreEngineers(ds: Dataset, days: number): EngineerScore[]; // sorted by total desc, then stats.areas desc, then login
```

- [ ] **Step 1: Write failing tests** against a small fixture dataset built in the test file (`windowEnd = '2026-10-22T00:00:00Z'`).
  - `sizeFactor(0) === 0.5`; `sizeFactor(999)` ≈ `1.0`; `sizeFactor(9)` ≈ `0.6667` (to 4 decimal places); `sizeFactor(1e6) === 1`.
  - feat, churn 999, hotShare 0 → points `3` (±1e-9).
  - fix, churn 9, hotShare 1, closesIssue → `2*0.6667*1.5 + 1` ≈ `3.0`, pillar `'fix'`.
  - revert → pillar `'fix'`. chore → points `0.5 * size * hot`, pillar `'ship'`.
  - **One pillar:** for every engineer, `ship + fix === sum(prs.points)`, and each PR number appears in exactly one engineer's `prs` exactly once.
  - Reviews:
    - the same reviewer approving a PR and later requesting changes → one `ScoredReview` worth `1.5`
    - a self-review is excluded
    - a reviewer `'stamphog'` is excluded
    - a review on a bot-authored PR counts
    - `authorsHelped` counts distinct PR authors
  - Window:
    - a PR merged 40 days before `windowEnd` is excluded at `days=30` and included at `days=90`
    - a review submitted 40 days back is likewise excluded at 30
  - Bots and ghosts: no `EngineerScore.login` is a bot or `'ghost'`.
  - Tie: two engineers with equal totals sort by `stats.areas` descending.
  - Empty: `scoreEngineers({...ds, prs: [], reviews: []}, 30)` → `[]`.
  - `computeHotAreas`: with 10 areas where area `a` has 5 distinct human authors and the rest have 1, at topShare 0.1 → `['a']`. Bot authors don't count. At least 1 area is returned when any areas exist.
- [ ] **Step 2: Run** `npx vitest run src/lib/score.test.ts src/lib/hot.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `scoreEngineers`, `cutoff = Date.parse(windowEnd) - days*86400e3`. Filter PRs by `mergedAt` and reviews by `submittedAt`. Look up each review's PR through a `Map<number, PrRecord>`; skip reviews whose PR is missing. Keep the max-points review per `reviewer#pr`. `hotShare` in stats is the churn-unweighted average of the PRs' `hotShare`. `computeHotAreas` ranks by distinct human authors and keeps `max(1, ceil(n*topShare))`.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(scoring): score ship, fix and unblock points`.

### Task 3 (WV-03): Data pipeline and committed `data.json` → open PR 1

**Files:**
- Create: `scripts/fetch.ts`, `scripts/build-data.ts`, `public/data.json` (generated)

**Interfaces — Consumes:** `parseType`, `areaOf`, `churnOf`, `reviewKind`, `isBot`, `computeHotAreas`, `WEIGHTS.hot.topShare`, `Dataset`.

- [ ] **Step 1: `scripts/fetch.ts`.**
  - **Token:** `process.env.GITHUB_TOKEN`, else `execSync('gh auth token')`. Never log the token.
  - **Days:** for each UTC day in `[today-119, today]`, run the GraphQL `search(query:"repo:PostHog/posthog is:pr is:merged merged:D..D", type:ISSUE, first:50, after)`. Fields:
    - `number title url mergedAt createdAt additions deletions`
    - `author{login __typename avatarUrl}`
    - `labels(first:10){nodes{name}}`
    - `files(first:100){nodes{path additions deletions}}`
    - `reviews(first:40){nodes{author{login __typename} state body submittedAt comments{totalCount}}}`
    - `closingIssuesReferences(first:3){nodes{number}}`
    - `rateLimit{cost remaining}`
  - **Concurrency and retries:** 4 days at a time. Retry 3× with exponential backoff (2 s, 4 s, 8 s) on HTTP 5xx, 403 secondary limit or a GraphQL `errors` field.
  - **Completeness:** throw if `issueCount > 1000`, or if fetched nodes `!== issueCount` for a day.
  - **Caching:** write `data/raw/<day>.json`. Skip days already on disk, except today and yesterday, so reruns resume.
  - **Logging:** each day's count and the remaining rate limit.
- [ ] **Step 2: Run** `npm run fetch`. Expected: 120 files in `data/raw/`, about 22.7k PRs total, cost under 1,500 points, roughly 5–10 minutes. Run it in the background while you write Step 3.
- [ ] **Step 3: `scripts/build-data.ts`.**
  - Read all raw days and dedupe PRs by number.
  - Map each PR to a `PrRecord`: `bot = isBot(author?.login, author?.__typename)`, `author = login ?? 'ghost'`, `areas` = unique `areaOf` over non-noise files.
  - Compute `hotAreas` with `computeHotAreas`, then set each PR's `hotShare` (the share of its non-noise files in hot areas, 0 when there are none).
  - Keep reviews where `reviewKind` is not null, the reviewer is not a bot and the reviewer is not the PR author.
  - Store avatars for human logins only.
  - Set `windowStart` and `windowEnd` (ISO) and `generatedAt`.
  - Write minified `public/data.json`, sorted by PR number for determinism.
  - Print: total PRs, human PRs, reviews, distinct engineers, hot areas, file size.
- [ ] **Step 4: Run** `npm run build-data`. Expected: `public/data.json` under about 6 MB (well under 1 MB gzipped is ideal; if it's larger, drop `title` lengths over 120 characters). Then `node -e` a quick sanity check: run `scoreEngineers(ds, 90)` through tsx and print the top 10 with ship/fix/unblock. Eyeball that no bots appear and the names are plausible PostHog staff.
- [ ] **Step 5: Run** `npm run check`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(data): fetch 120 days of PostHog PRs into data.json`. Push, then open **PR 1** with `wv-create-pr` (Closes WV-01, WV-02, WV-03). Claude staff review and Greptile run on it.

### Task 4 (WV-04): Dashboard UI

Branch `wv/04-dashboard` from `wv/01-data-scoring`. Invoke the `frontend-design`, `hallmark`, `emil-design-eng` and `alis-design` skills before writing the UI, and use them together.

**Files:**
- Create: `src/App.tsx`, `src/hooks/useDataset.ts`, `src/lib/format.ts`
- Create: `src/components/Header.tsx`, `WindowToggle.tsx`, `ThemeToggle.tsx`, `EngineerCard.tsx`, `PillarBar.tsx`, `RunnersUp.tsx`, `Methodology.tsx`, `EngineerDrawer.tsx`
- Create: `src/styles/tokens.css`, `src/styles/app.css`
- Delete: Vite boilerplate (`App.css`, the logos)

**Interfaces — Consumes:** `scoreEngineers`, `EngineerScore`, `ScoredPr`, `ScoredReview`, `WEIGHTS`, `Dataset`. **Produces:** `useDataset(): { data: Dataset | null; error: string | null }` (fetches `/data.json` once); `fmt(points: number): string` (one decimal place); `prUrl(n: number): string`.

- [ ] **Step 1: Layout at 1440×900, no page scroll.**
  - **Header:** title "Who's driving PostHog right now", the one-line definition "Impact = Ship + Fix + Unblock, from merged PRs and reviews", WindowToggle (30/90/120, default 90), ThemeToggle, "Data as of <generatedAt>" and a repo link.
  - **Main grid:**
    - Left (about 62%): the 5 `EngineerCard`s.
    - Right: `Methodology`, then `RunnersUp` (ranks 6–10).
- [ ] **Step 2: `EngineerCard`.**
  - Rank, avatar, login linking to `github.com/<login>`, total points.
  - `PillarBar`: a stacked bar of ship/fix/unblock, scaled against rank 1's total, with a legend.
  - A stats line: `N PRs (x feat · y fix) · R reviews for A engineers · K areas · H% in hot areas`.
  - Top 3 PRs by points as links `#n title (+p pts)`.
  - The whole card is a button that opens the drawer.
- [ ] **Step 3: `Methodology`.** Render the pillar table and the size/hot formulas *from `WEIGHTS`* (no hard-coded numbers). Also show the bot rule, the hot-area list (first 8 plus a count) and the spec's known limits.
- [ ] **Step 4: `EngineerDrawer`.** A right-side overlay with a focus trap, Esc/backdrop to close, and focus returned to the card. It holds:
  - the pillar totals
  - a PR table with `#n` link, title, type, base × size × hot + bonus = points
  - a review table with `#n` link, PR author, kind and points
  - both sorted by points, scrolling inside the drawer only
- [ ] **Step 5: Themes and motion.**
  - Tokens on `:root[data-theme]`. The default follows `prefers-color-scheme`, and the choice persists in `localStorage` inside try/catch.
  - Motion: bars fill on mount and on window change, the drawer slides in, a short opacity/translate change when ranks shift.
  - All motion is disabled under `prefers-reduced-motion`.
- [ ] **Step 6: Guards.** Show a loading skeleton, then an error message if `/data.json` fails. Render fewer than 5 cards if fewer engineers exist.
- [ ] **Step 7: Verify.** Run `npm run check` (expect PASS), then `npm run preview`. In a browser at 1440×900, check:
  - the top 5 are visible without scrolling, in light and dark
  - the drawer opens and closes with keyboard and mouse
  - the toggle re-ranks
  - PR links resolve
  - the first load is under 2 s
- [ ] **Step 8: Commit** `feat(ui): add top 5 impact dashboard with drill-down`.

### Task 5 (WV-05): README, signoff, deploy prep → open PR 2

**Files:** Modify `README.md` and `docs/agent-log.md`.

- [ ] **Step 1: README for a busy leader**, at most about 80 lines:
  - what the page answers and the live URL
  - how impact is defined (3 pillars, 1 line each, plus the tiebreaker)
  - why not LOC or commit counts
  - how to validate a number (the drawer, then PR links)
  - data window and limits
  - the run-locally commands (`npm i`, `npm run fetch`, `npm run build-data`, `npm run dev`)
  - the time taken
- [ ] **Step 2: Run `wv-signoff`.** Fill its red-flag table pass/fail against the assignment.
- [ ] **Step 3: Open PR 2.** Commit `docs: add README for the impact dashboard`, push, and open PR 2 with `wv-create-pr` (Closes WV-04, WV-05). Babysit Claude/Greptile findings with `wv-babysit`.
- [ ] **Step 4: Deploy only on the owner's thumbs-up.** `npx vercel link`, then `npx vercel --prod` (framework Vite, output `dist`). Then confirm the URL loads in under 10 s in a fresh browser and put it in the README.
