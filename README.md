# Who's moving PostHog forward

**Live dashboard: https://weave-assignment-posthog.vercel.app**

This is a one-page answer to a single question. Who are the 5 most impactful
engineers in [PostHog/posthog](https://github.com/PostHog/posthog) right now,
and why? Every number on the page links to the PRs behind it.

## How impact is measured

Counting lines or commits rewards noise, so this page gives points for work
instead. Each merged PR and each review lands in one of three buckets.

| Bucket | What counts | Points |
| --- | --- | --- |
| **Ship** | Merged PRs that build something | feature 3, perf 2, refactor 1.5, chore or docs 0.5 |
| **Fix** | Merged fix, revert and hotfix PRs | 2, plus 1 if the PR closes a reported issue |
| **Unblock** | Reviews of other people's PRs | approve 0.5, comment 1, request changes 1.5 |

Two adjustments scale each PR's points:

- **Size.** Points go from 0.5× to 1× on a log scale, so one 1,000 line PR is not
  worth 100 small ones. Lockfiles, snapshots and generated code don't count.
- **Hot areas.** Code that many engineers touch, such as `posthog/api` and the
  core frontend, earns up to 1.5×. Changes there reach more people and carry more risk.

A few rules keep the ranking fair:

- **Daily cap.** Only a person's best 5 PRs and best 10 reviews per day count.
  The data showed why this is needed. One engineer merged 151 PRs in a single
  day, and two reviewers each approved about 400 of that person's PRs.
- **No bots.** Dependabot, PostHog's own automation accounts and deleted users
  are left out. People who review a bot's PR still earn points. Approving a bot's
  PR without a comment earns 0.
- **One bucket per PR.** A PR counts as Ship or as Fix, never both.
- **Ties** go to whoever worked in more product areas.

## How to check a number

Click any engineer. A side panel lists every PR and review behind their score,
each with its math (for example `3 × 0.92 × 1.25`) and a link to GitHub. Work
over the daily cap shows at 0 points, so nothing is hidden. The weights live in
one file, `src/lib/weights.ts`, and the "How the points work" panel reads from it.

The **Network** view shows the top 12 as a map of who reviews whom. A thicker
line means two people review each other's PRs more often. Hover a person to see
their links, or click to open their points.

## Data

- All PRs merged into `PostHog/posthog` in the last **120 days**, 22,288 in
  total. You can switch between 30, 90 and 120 days on the page (90 is the default).
- The fetch asks GitHub's GraphQL API for one day at a time, because a search
  returns at most 1,000 results. If any day comes back incomplete, it stops with
  an error.
- The page loads a saved snapshot (`public/data.json`, 1.4 MB compressed) and
  never calls GitHub, so it opens in under a second.
- **Limits.** Only merged PRs count, so reviews on unmerged PRs are missing. A
  PR's type comes from its own title. Files and reviews past the first 100 in a
  PR are skipped. GitHub can't tell staff from community contributors, but the
  top ranks are all people with months of steady work.

## Run it yourself

```bash
npm install
npm run fetch        # about 3 minutes; uses `gh auth token` or GITHUB_TOKEN
npm run build-data   # writes public/data.json
npm run dev          # http://localhost:5173
npm run check        # typecheck, tests and build
```

It's built with Vite, React and TypeScript, with no chart library. The scoring
code is in `src/lib/` as plain functions with unit tests. The design and plan
are in [`docs/`](docs/).
