# PostHog engineering impact dashboard — design

## Intent

One page that answers, for a busy PostHog engineering leader: **who are the top 5
most impactful engineers right now, and why?** Every number must be traceable to
real, linked PRs. Creative, defensible analysis beats pretty charts; counting
lines/commits is explicitly not the answer.

Constraints from the assignment: at least the last 90 days of data, interactive,
fits one laptop screen, hosted, loads in under 10 s, bots filtered out, no
unexplained scores. Total budget 90 minutes including this design.

## Definition of impact (decided with the owner)

Impact = **Ship + Fix + Unblock**, three pillars measured in plain points so a
leader can read "a feature PR is about 3 points, a substantive review about 1".
**Breadth** (distinct product areas) is the tiebreaker only.

All weights live in one file (`src/lib/weights.ts`) and are rendered verbatim in
the "How it's scored" panel.

### Classifying a PR

PostHog titles follow `type(scope): summary`. Type comes from the prefix:
`feat`, `fix`, `perf`, `refactor`, `revert`, `chore|docs|test|ci|build|style`, or
`other` (no prefix). A title containing `hotfix` or starting with `Revert "`
counts as a fix.

- **Size factor** `s = 0.5 + 0.5 * min(1, log10(1 + churn) / 3)`, so 10 lines ≈ 0.67,
  1,000+ lines = 1.0. Churn excludes lockfiles, snapshots (`*.ambr`, `*.snap`,
  `__snapshots__/`), generated schema and `*.json` fixtures. Size can at most
  double a PR's value, so it never dominates.
- **Area** of a file: `products/<x>`, `frontend/src/scenes/<x>`,
  `frontend/src/<x>`, `posthog/<x>`, `ee/<x>`, `rust/<x>`, `nodejs/src/<x>`,
  `plugin-server/src/<x>`, otherwise the first two path segments.
- **Hot areas**: the top 10% of areas ranked by distinct human authors over the
  full fetched window. These are the shared, high-traffic parts of the codebase.
- **Hot boost** `h = 1 + 0.5 * (share of the PR's files in hot areas)`.

### Pillars

| Pillar | Counts | Points per item |
| --- | --- | --- |
| **Ship** | Merged PRs authored, type not fix/revert | type weight × s × h; feat 3, perf 2, refactor 1.5, other 1, chore/docs/test/ci/build/style 0.5 |
| **Fix** | Merged `fix`, `revert`, hotfix PRs | 2 × s × h, +1 if the PR closes a linked issue |
| **Unblock** | Reviews on *other people's* merged PRs | Best review per (reviewer, PR): approve with no text 0.5, comment / review with body or inline comments 1.0, changes requested 1.5 |

**Each PR lands in exactly one pillar.** A PR classified as a fix (`fix`,
`revert`, hotfix) scores only under Fix; every other PR scores only under Ship.
This replaces the "fix 2" Ship weight from the first draft, which would have
counted bug-fix PRs twice. A unit test asserts that no PR scores in both.

Tiebreaker: number of distinct areas shipped in. Shown as a stat, not added.

### Who counts

Humans only. Excluded: GraphQL `__typename == "Bot"`, logins ending in `[bot]`
or `-bot`, and a denylist (`posthog`, `stamphog`, `dependabot*`,
`posthog-js-upgrader`, `scheduled-actions-posthog`, `github-actions`, `greptile*`,
`copilot*`). Bot-authored PRs give no Ship/Fix points, but a human reviewing them
still earns Unblock points for comments or change requests (reviewing agent PRs
is real work). A bare one-click approval of a bot PR earns 0, so rubber-stamping
dependency bumps cannot inflate a ranking.

## Data

- **Source**: GitHub GraphQL `search` over
  `repo:PostHog/posthog is:pr is:merged merged:<day>..<day>`, one query per day for
  **120 days** (search caps at 1,000 results per query; busiest days are about 310).
  Page size 50 with files (first 100), reviews (first 40), labels, linked
  issues. Measured cost: 2 points per page; ~455 pages ≈ 910 points of 5,000/hr.
  Concurrency 4 with retry/backoff.
- **Build-time only**: `npm run fetch` (needs `GITHUB_TOKEN` or `gh auth token`)
  writes raw pages to `data/raw/` (gitignored) and a compact
  `public/data.json` (committed): per PR `{n, title, author, mergedAt, type,
  scope, churn, areas, hotShare, closesIssue}`, per review
  `{pr, reviewer, kind, submittedAt}`, hot-area list, avatars, `generatedAt`, window bounds.
- **Runtime**: the page loads one static JSON, no GitHub calls; scoring runs in the
  browser so the window toggle (30 / 90 / 120 days, default 90) is instant.

Known limits, shown in the methodology panel: only merged PRs (reviews on
unmerged PRs are not counted), files after the first 100 per PR are ignored, the
type comes from the author's own title, hot areas are computed over 120 days,
community contributors are not separated from staff.

## Page (single laptop screen, ~1440×900)

- **Header**: title, one-line definition of impact, window toggle, theme toggle
  (light/dark), "data as of" timestamp, link to the repo.
- **Top 5** (main column): rank, avatar, name (links to GitHub), total points, a
  stacked bar Ship/Fix/Unblock, one-line stats (PRs by type, reviews, distinct
  authors helped, areas, hot share), and the 2–3 highest-value PRs as real links.
- **Runners-up**: compact ranks 6–10 so the leader sees the cut is not arbitrary.
- **How it's scored** panel: the formula, the weight table, bot rules, limits.
- **Drill-down**: clicking an engineer opens a drawer listing every scored PR and
  review with its points and how they were computed, each linked to GitHub. This
  is how a leader validates a number.

Design: modern, two polished themes, restrained motion (bar fill, drawer slide,
rank reorder on window change), respects `prefers-reduced-motion`. Built with the
owner's design skills: hallmark, frontend-design, emil-design-eng, alis-design.

## Stack (builder's call, stated to the owner)

Vite + React + TypeScript, Vitest for the scoring library, plain CSS with tokens,
no chart library. Fetch script in TypeScript run with `tsx`. Static deploy on
Vercel (deployment needs the owner's go-ahead).

## Builder's calls (from the builder check)

- **Who counts as an engineer:** any human contributor. GitHub's
  `authorAssociation` is unreliable here, because PostHog staff with private
  org membership show up as `CONTRIBUTOR` (for example `frankh`, `eli-r-ph`), so
  it can't separate staff from the community. The top 5 come from sustained
  volume plus reviewing, so in practice they are staff. Noted in Limits.
- **Review timing:** each review stores `submittedAt`, and the window filters
  reviews by when they were submitted. PRs are filtered by `mergedAt`.
- **Freshness:** a one-off snapshot with a visible "data as of" date, refreshed
  by rerunning `npm run fetch`. A scheduled refresh is a follow-up.
- **Done for hosting:** production build verified locally, then deployed to
  Vercel on the owner's thumbs-up. The Vercel CLI isn't installed yet, so we
  use `npx vercel` under the owner's login.
- **Delivery and cut order:** two PRs. PR 1 is data + scoring. PR 2 is the UI +
  README, branched from PR 1 so it doesn't have to wait for the merge. If time
  runs short, cut in this order: the rank-reorder animation, then the
  runners-up. The drawer and the methodology panel are never cut.

## Non-goals

Live GitHub calls from the browser, auth, a backend, per-team views, commit-level
analysis, merge-conflict/"babysitting" detection (not reliably measurable),
issue-tracker analysis beyond PR-linked issues.

## Anti-goals

A leaderboard of LOC or commit counts; any number without a visible derivation;
bots in the ranking; a page that needs scrolling to see the top 5; load over 10 s.
