const DAY_MS = 86400e3;
// GitHub search can lag a little behind merges; treat a file as final only after this.
const SETTLE_MS = 3600e3;

/** The last `n` UTC days ending at `now`, newest first, as YYYY-MM-DD. */
export function windowDays(now: number, n: number): string[] {
  return Array.from({ length: n }, (_, i) => new Date(now - i * DAY_MS).toISOString().slice(0, 10));
}

/** A cached day is final only if it was written after that day ended (plus a settle margin). */
export function needsFetch(day: string, fileMtimeMs: number | null): boolean {
  return fileMtimeMs === null || fileMtimeMs < Date.parse(`${day}T00:00:00Z`) + DAY_MS + SETTLE_MS;
}
