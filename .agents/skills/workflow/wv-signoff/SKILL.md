---
name: wv-signoff
description: Verify readiness of the PostHog impact dashboard for the current revision, including an end check against the assignment's evaluation criteria and red flags.
---

# Sign off a revision

Read [AGENTS.md](../../../../AGENTS.md) and
[validation](../../../references/validation.md).

1. Record branch, HEAD and dirty files.
2. Run `npm run check`. For UI changes also do the visual check (both themes,
   1440×900, top 5 visible without scrolling, drawer, window toggle).
3. Check the assignment red flags and say pass/fail for each: link loads, data
   complete for at least 90 days, UI not broken, loads in under 10 s, answers
   "who are the top 5 and why", no number without a visible derivation, bots
   filtered, real PR links.
4. Repair in-scope failures and rerun. Never weaken tests.

Report scope, commands and results, the red-flag table, and open issues. Local
success is not hosted CI or a deployed URL.
