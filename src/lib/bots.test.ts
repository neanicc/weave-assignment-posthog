import { describe, expect, it } from 'vitest';
import { isBot } from './bots.ts';

describe('isBot', () => {
  it.each([
    'dependabot[bot]',
    'dependabot-preview',
    'posthog',
    'stamphog',
    'github-actions',
    'greptile-apps',
    'copilot-swe-agent',
    'posthog-js-upgrader',
    'scheduled-actions-posthog',
    'renovate-bot',
  ])('%s is a bot', (login) => expect(isBot(login)).toBe(true));

  it('GraphQL Bot typename is a bot', () => expect(isBot('anyone', 'Bot')).toBe(true));
  it('deleted accounts (no author) are excluded', () => {
    expect(isBot(undefined)).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it.each(['pauldambra', 'jordanm-posthog', 'haacked'])('%s is human', (login) =>
    expect(isBot(login, 'User')).toBe(false),
  );
});
