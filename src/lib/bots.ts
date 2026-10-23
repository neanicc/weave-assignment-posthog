// Automation accounts seen in PostHog/posthog. `posthog` opens agent-written
// "self-driving" PRs and `stamphog` is their review bot.
const DENYLIST = new Set([
  'posthog',
  'posthog-bot',
  'stamphog',
  'github-actions',
  'posthog-js-upgrader',
  'scheduled-actions-posthog',
  'ghost',
]);
const PREFIXES = ['dependabot', 'greptile', 'copilot'];

/** True for automation accounts and deleted users (no author). */
export function isBot(login: string | undefined | null, typename?: string): boolean {
  if (!login || typename === 'Bot') return true;
  const l = login.toLowerCase();
  return DENYLIST.has(l) || PREFIXES.some((p) => l.startsWith(p)) || l.endsWith('[bot]') || l.endsWith('-bot');
}
