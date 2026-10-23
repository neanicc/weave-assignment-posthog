# Who's moving PostHog forward

**Live dashboard:** _URL added at deploy_

One page that answers: **who are the 5 most impactful engineers in
[PostHog/posthog](https://github.com/PostHog/posthog) right now, and why?** Every
number on it links back to the PRs that produced it.

## How impact is measured

Counting lines or commits rewards noise. Instead, every merged PR and every
review earns points in one of three buckets:

| Bucket | What counts | Points |
| --- | --- | --- |
| **Ship** | Merged PRs that build something | by type: feature 3, perf 2, refactor 1.5, chore/docs/test 0.5 |
| **Fix** | Merged fix, revert and hotfix PRs | 2, +1 if it closes a reported issue |
| **Unblock** | Reviews of *other people's* PRs | approve 0.5, comment 1, request changes 1.5 |

PR points are then adjusted:

- **Size** scales points from 0.5× to 1×, on a log scale. A 1,000-line PR isn't
  worth 100 small ones, and lockfiles, snapshots and generated code don't count.
- **Hot areas** add up to 1.5× for code that many engineers touch (the API,
  query engine, core frontend and similar). Changing shared, high-traffic code
  carries more risk and more reach.

Some rules keep the ranking honest:

- **Daily cap.** Only a person's best 5 PRs and best 10 reviews per day count.
  The real data needed this: one engineer merged 151 PRs in a single day, which
  is agent-driven volume, and two reviewers left about 400 reviews each, almost
  all on that one person's PRs.
- **Bots don't count.** That covers dependabot, PostHog's own agent accounts and
  deleted users. Humans who *review* bot PRs still earn Unblock, but a bare
  one-click approval of a bot PR earns 0.
- **One bucket per PR.** A PR counts under Ship or under Fix, never both.
- **Ties** go to whoever shipped in more product areas.

## How to check a number

Click any engineer. A drawer lists every PR and review behind their score, each
with its arithmetic (for example `3 × 0.92 × 1.25 = 3.4`) and a link to GitHub.
Items over the daily cap appear at 0 points so nothing is hidden. Every weight
is defined once in `src/lib/weights.ts`, and the "How the points work" panel is
rendered from that same file.

## Data

- All PRs merged into `PostHog/posthog` in the **last 120 days**, about 22,000
  in total, with the 30 / 90 / 120-day windows switchable on the page (90 is the
  default).
- Data is fetched from GitHub's GraphQL API one day at a time, because search
  returns at most 1,000 results. The fetch stops with an error if any day comes
  back incomplete.
- The page loads a static snapshot (`public/data.json`, about 1.4 MB gzipped).
  It never calls GitHub, so it loads in about a second.
- **Limits:** only merged PRs count, so reviews on unmerged PRs are missed. PR
  type comes from the author's own title. Files past the first 100 in a PR are
  ignored. GitHub can't reliably tell staff from community contributors, but the
  top ranks are all sustained, high-volume engineers.

## Run it yourself

```bash
npm install
npm run fetch        # ~3 min, uses `gh auth token` or GITHUB_TOKEN; caches in data/raw/
npm run build-data   # writes public/data.json
npm run dev          # http://localhost:5173
npm run check        # typecheck + tests + build
```

Built with Vite, React and TypeScript, with no chart library. The scoring logic
lives in `src/lib/`, a set of pure functions with unit tests. The design and the
plan behind it are in [`docs/`](docs/).
