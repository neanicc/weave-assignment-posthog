// The single source of every scoring weight. The methodology panel renders
// these values directly, so changing a number here changes the explanation too.
export const WEIGHTS = {
  ship: { feat: 3, perf: 2, refactor: 1.5, other: 1, chore: 0.5 },
  fix: { base: 2, linkedIssueBonus: 1 },
  review: { approve: 0.5, comment: 1, changes: 1.5, bareApproveOfBotPr: 0 },
  size: { floor: 0.5, logCap: 3 }, // s = floor + (1 - floor) * min(1, log10(1 + churn) / logCap)
  hot: { maxBoost: 0.5, topShare: 0.1 }, // h = 1 + maxBoost * hotShare
} as const;
