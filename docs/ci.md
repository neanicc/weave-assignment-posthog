# CI and review

| Workflow | Runs | Needs |
| --- | --- | --- |
| `check.yml` | `npm ci` + `npm run check` (typecheck, Vitest, build) on PRs and `main`. Skips with a notice until `package.json` exists | nothing |
| `claude-review.yml` | `wv-staff-review` skill from the **base** commit; posts one scored comment per head | `CLAUDE_CODE_OAUTH_TOKEN` secret and the Claude GitHub App on this repo |
| Greptile | `.greptile/config.json` rules (one pillar per PR, weights single source, humans only, no runtime GitHub, no secrets) | Greptile app with access to this repo |

The data refresh (`npm run fetch && npm run build-data`) runs locally because a
full 120-day fetch costs about 900 GraphQL points, more than the 1,000 points an
hour `GITHUB_TOKEN` gets in Actions. A scheduled refresh with a PAT secret is a
follow-up.
