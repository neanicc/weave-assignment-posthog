---
name: wv-commit
description: Stage focused changes and create Conventional Commits for the PostHog impact dashboard; push the task branch when requested or as part of PR delivery.
---

# Commit changes

Follow [AGENTS.md](../../../../AGENTS.md). A commit-only request stays local.

1. Inspect status, staged and unstaged diffs and untracked files. Preserve
   unrelated work.
2. Work on a `wv/<nn>-<slug>` branch from `main`; never commit on `main`.
3. Reuse passing checks for unchanged inputs; run missing focused checks from
   [validation](../../../references/validation.md).
4. Stage explicit paths and inspect `git diff --cached`. Never commit
   `node_modules/`, `dist/`, `data/raw/`, `.env` files or tokens.
   `public/data.json` is committed on purpose.
5. Message: `type(scope): imperative summary`, under 72 characters, no final
   period. Scopes: `data`, `scoring`, `ui`, `docs`, `ci`. No AI attribution,
   no co-author trailers.
6. Honor hooks; never `--no-verify`, never amend a pushed commit, never
   force-push. Verify the remote SHA after pushing.

Report the commit hash, push state and checks run.
