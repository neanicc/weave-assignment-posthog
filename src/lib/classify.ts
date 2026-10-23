import type { PrType, ReviewKind } from './types.ts';

const PREFIX = /^(\w+)(\(([^)]*)\))?!?:/i;
const CHORE_WORDS = new Set(['chore', 'docs', 'test', 'tests', 'ci', 'build', 'style']);
const KNOWN = new Map<string, PrType>([['feat', 'feat'], ['fix', 'fix'], ['perf', 'perf'], ['refactor', 'refactor'], ['revert', 'revert']]);

/** Type and scope from a Conventional Commits title; hotfix and Revert titles count as fixes. */
export function parseType(title: string): { type: PrType; scope: string | null } {
  const m = PREFIX.exec(title.trim());
  const word = m?.[1].toLowerCase();
  const scope = m?.[3]?.trim().toLowerCase() || null;
  let type: PrType = !word ? 'other' : (KNOWN.get(word) ?? (CHORE_WORDS.has(word) ? 'chore' : 'other'));
  if (/^revert\b/i.test(title.trim())) type = 'revert';
  else if (/hotfix/i.test(title) && type !== 'revert') type = 'fix';
  return { type, scope };
}

/** Product area a file belongs to, coarse enough to rank by distinct authors. */
export function areaOf(path: string): string {
  const parts = path.split('/');
  if (parts.length === 1) return '(root)';
  if (parts[0] === 'frontend' && parts[1] === 'src' && parts[2] === 'scenes' && parts.length > 4) {
    return parts.slice(0, 4).join('/');
  }
  if ((parts[0] === 'frontend' || parts[0] === 'nodejs' || parts[0] === 'plugin-server') && parts[1] === 'src' && parts.length > 3) {
    return parts.slice(0, 3).join('/');
  }
  return parts.slice(0, 2).join('/');
}

/** Lockfiles, snapshots and generated JSON: churn there says nothing about effort. */
export function isNoiseFile(path: string): boolean {
  return (
    /(^|\/)[^/]*lock[^/]*\.(yaml|json)$/.test(path) ||
    /\.lock$/.test(path) ||
    /\.(ambr|snap)$/.test(path) ||
    path.includes('__snapshots__/') ||
    path.includes('/generated/') ||
    /(^|\/)snapshots\.yml$/.test(path) ||
    /^posthog\/schema(_enums)?\.py$/.test(path) ||
    path.endsWith('.json')
  );
}

export function churnOf(files: { path: string; additions: number; deletions: number }[]): number {
  return files.reduce((sum, f) => (isNoiseFile(f.path) ? sum : sum + f.additions + f.deletions), 0);
}

/** How much a review helped: bare approval < comment/discussion < changes requested. */
export function reviewKind(state: string, body: string, commentCount: number): ReviewKind | null {
  if (state === 'CHANGES_REQUESTED') return 'changes';
  if (state === 'APPROVED') return body.trim() || commentCount > 0 ? 'comment' : 'approve';
  if (state === 'COMMENTED') return 'comment';
  return null;
}
