export type PrType = 'feat' | 'fix' | 'perf' | 'refactor' | 'revert' | 'chore' | 'other';
export type ReviewKind = 'approve' | 'comment' | 'changes';

export interface PrRecord {
  n: number;
  title: string;
  author: string;
  bot: boolean;
  mergedAt: string;
  type: PrType;
  scope: string | null;
  churn: number;
  areas: string[];
  hotShare: number;
  closesIssue: boolean;
}

export interface ReviewRecord {
  pr: number;
  reviewer: string;
  kind: ReviewKind;
  submittedAt: string;
}

export interface Dataset {
  repo: string;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  hotAreas: string[];
  avatars: Record<string, string>;
  prs: PrRecord[];
  reviews: ReviewRecord[];
}
