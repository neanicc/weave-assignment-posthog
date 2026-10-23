# Repository foundation

A slimmed copy of the agent-hotline / teachAR scaffold, sized for a 90-minute
build. It has one agent guide (`AGENTS.md`, imported by `CLAUDE.md`),
canonical skills in `.agents/skills/workflow/` with links in `.claude/skills/`,
a validation reference, a PR template, a ticket template, Claude staff review
plus Greptile on every PR, and a plan with five tickets delivered in two PRs.

Cut for this size: autopilot, merge-gate hook and scripts, subagent roles,
rulesets bootstrap, eval thresholds, catchup/cleanup/grill-me/manual-flows
skills. `.claude/settings.json` keeps the deny rules for force-push, admin
merge, secret changes and production deploys.
