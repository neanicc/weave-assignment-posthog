---
name: wv-create-pr
description: Create or update a GitHub PR for the PostHog impact dashboard with a Conventional Commits title, Closes links and truthful validation evidence.
---

# Create a pull request

Use [AGENTS.md](../../../../AGENTS.md) and the
[PR template](../../../../.github/pull_request_template.md).

1. Inspect branch, remote, any existing PR and the full diff from `main`.
2. Run `npm run check` and the applicable
   [validation](../../../references/validation.md). Fix in-scope failures;
   disclose anything not run.
3. Commit and push through [wv-commit](../wv-commit/SKILL.md).
4. Title: Conventional Commits summary under 72 characters. Body: fill every
   template section; `Closes #n` for each ticket the PR completes. Validation
   lists only results produced for this head (automated vs visual). No AI
   attribution anywhere in the title or body.
5. `gh pr create --base main --head <branch> --title <t> --body-file <file>`;
   update an existing PR instead of duplicating it. Verify the URL and head SHA.

Do not merge or deploy because a PR was opened.
