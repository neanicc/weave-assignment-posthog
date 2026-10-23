import { describe, expect, it } from 'vitest';
import { areaOf, churnOf, isNoiseFile, parseType, reviewKind } from './classify.ts';

describe('parseType', () => {
  it.each([
    ['feat(flags): x', 'feat', 'flags'],
    ['fix: x', 'fix', null],
    ['Feat(Data-Warehouse): x', 'feat', 'data-warehouse'],
    ['feat(api)!: x', 'feat', 'api'],
    ['Revert "feat: x"', 'revert', null],
    ['chore(ci): hotfix deploy', 'fix', 'ci'],
    ['docs(x): y', 'chore', 'x'],
    ['test: y', 'chore', null],
    ['ci: y', 'chore', null],
    ['build: y', 'chore', null],
    ['style: y', 'chore', null],
    ['perf(query): y', 'perf', 'query'],
    ['refactor(hogql): y', 'refactor', 'hogql'],
    ['Update README', 'other', null],
    ['61 fix action url', 'other', null],
    ['constructor: allow empty options', 'other', null],
    ['toString(x): y', 'other', 'x'],
  ])('%s → %s', (title, type, scope) => {
    expect(parseType(title)).toEqual({ type, scope });
  });
});

describe('areaOf', () => {
  it.each([
    ['products/feature_flags/backend/a.py', 'products/feature_flags'],
    ['frontend/src/scenes/insights/a.tsx', 'frontend/src/scenes/insights'],
    ['frontend/src/lib/a.ts', 'frontend/src/lib'],
    ['posthog/hogql/parser.py', 'posthog/hogql'],
    ['rust/capture/src/a.rs', 'rust/capture'],
    ['nodejs/src/cdp/a.ts', 'nodejs/src/cdp'],
    ['plugin-server/src/worker/a.ts', 'plugin-server/src/worker'],
    ['ee/billing/a.py', 'ee/billing'],
    ['docker/compose.yml', 'docker/compose.yml'],
    ['README.md', '(root)'],
  ])('%s → %s', (path, area) => {
    expect(areaOf(path)).toBe(area);
  });
});

describe('isNoiseFile', () => {
  it.each(['pnpm-lock.yaml', 'uv.lock', 'a/__snapshots__/b.ambr', 'x.snap', 'frontend/src/queries/schema.json', 'frontend/snapshots.yml', 'posthog/schema.py', 'posthog/schema_enums.py', 'frontend/src/generated/core/api.ts'])(
    '%s is noise',
    (path) => expect(isNoiseFile(path)).toBe(true),
  );
  it('real code is not noise', () => expect(isNoiseFile('posthog/models/a.py')).toBe(false));
});

describe('churnOf', () => {
  it('ignores noise files', () => {
    expect(
      churnOf([
        { path: 'a.py', additions: 10, deletions: 5 },
        { path: 'pnpm-lock.yaml', additions: 900, deletions: 900 },
      ]),
    ).toBe(15);
  });
});

describe('reviewKind', () => {
  it('bare approval', () => expect(reviewKind('APPROVED', '', 0)).toBe('approve'));
  it('approval with text is a comment', () => expect(reviewKind('APPROVED', 'lgtm but…', 0)).toBe('comment'));
  it('inline comments', () => expect(reviewKind('COMMENTED', '', 2)).toBe('comment'));
  it('changes requested', () => expect(reviewKind('CHANGES_REQUESTED', '', 0)).toBe('changes'));
  it('dismissed and pending do not count', () => {
    expect(reviewKind('DISMISSED', 'x', 1)).toBeNull();
    expect(reviewKind('PENDING', '', 0)).toBeNull();
  });
});
