# Agent log

Append one entry per PR that makes a substantive decision.

- **2026-10-22 · scaffold.** Defined impact as Ship + Fix + Unblock (breadth as
  the tiebreaker) with the owner. The window is 120 days because a full fetch
  measured at 2 points per 50-PR page. A fix PR scores only under Fix, so no PR
  is counted twice. `authorAssociation` is unreliable for spotting staff, so
  all humans are ranked.
