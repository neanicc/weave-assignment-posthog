# Weave assignment: PostHog impact dashboard — agent guide

A one-page static dashboard that answers, for a busy PostHog engineering
leader, **who are the top 5 most impactful engineers right now, and why**.
Impact is Ship + Fix + Unblock points computed from merged PRs and reviews in
`PostHog/posthog`, with every number traceable to a linked PR.

Read [the design](docs/superpowers/specs/2026-10-22-impact-dashboard-design.md)
and [the plan](docs/plan.md) before changing behavior. Time budget for the whole
project is 90 minutes: prefer the smallest change that satisfies the ticket.

## Skills

Canonical skills live in `.agents/skills/workflow/`; `.claude/skills/` holds
relative links to them. Edit the canonical files.

| Request | Skill |
| --- | --- |
| Commit, commit and push | [wv-commit](.agents/skills/workflow/wv-commit/SKILL.md) |
| Create/open PR, write PR description | [wv-create-pr](.agents/skills/workflow/wv-create-pr/SKILL.md) |
| Staff review, review branch, grade PR | [wv-staff-review](.agents/skills/workflow/wv-staff-review/SKILL.md) |
| Babysit PR, fix CI, address review feedback | [wv-babysit](.agents/skills/workflow/wv-babysit/SKILL.md) |
| Signoff, verify readiness | [wv-signoff](.agents/skills/workflow/wv-signoff/SKILL.md) |

UI work uses the owner's design skills: `hallmark` (audit and redesign),
`frontend-design`, `emil-design-eng` (motion), `alis-design` (overlays,
buttons, interaction).

## Stack and layout

Vite + React + TypeScript (strict), Vitest, plain CSS with design tokens, no
chart library. Node 22, npm with a committed lockfile.

| Location | Responsibility |
| --- | --- |
| `scripts/fetch.ts` | GraphQL fetch of merged PRs by day into `data/raw/` (gitignored) |
| `scripts/build-data.ts` | Normalize raw pages into the compact `public/data.json` (committed) |
| `src/lib/` | Pure classification, bot filter, weights and scoring. No I/O |
| `src/components/` | Dashboard UI |

## Invariants

- **Every number is explained.** Any point total on screen links to its
  derivation (drawer or methodology panel) and to real PRs on GitHub.
- **Humans only.** Bots never appear in rankings (see the design's bot rules).
- **One pillar per PR.** A PR scores under Ship or Fix, never both.
- **Weights in one place.** `src/lib/weights.ts` is the single source and is
  rendered by the methodology panel.
- **No GitHub calls at runtime.** The page reads `public/data.json` only and
  must load in well under 10 s.
- Tokens never enter Git, logs or `data.json`.

## Checks

See [validation](.agents/references/validation.md). The gate is
`npm run check` (typecheck, tests, build). Report failing checks; never weaken
a test to get green.

## Git and delivery

- Branches `wv/<nn>-<slug>` from `main`; never commit on `main` after the
  initial scaffold commit.
- Conventional Commits (`type(scope): summary`, under 72 characters).
- PRs close their ticket issue (`Closes #n`). Claude staff review and Greptile
  run on every PR.
- No force-push, no history rewrite. Merging and Vercel deployment only on the
  owner's explicit go-ahead.
- Commit messages and PR bodies carry no AI attribution of any kind.
