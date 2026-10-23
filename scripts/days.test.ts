import { describe, expect, it } from 'vitest';
import { needsFetch, windowDays } from './days.ts';

const NOW = Date.parse('2026-10-23T03:00:00Z');

describe('windowDays', () => {
  it('lists the last n UTC days, newest first', () => {
    expect(windowDays(NOW, 3)).toEqual(['2026-10-23', '2026-10-22', '2026-10-21']);
  });
});

describe('needsFetch', () => {
  it('fetches days with no file', () => expect(needsFetch('2026-10-20', null)).toBe(true));
  it('refetches a day whose file was written before the day ended', () => {
    expect(needsFetch('2026-10-20', Date.parse('2026-10-20T22:00:00Z'))).toBe(true);
  });
  it('refetches within an hour after the day ended (search indexing lag)', () => {
    expect(needsFetch('2026-10-20', Date.parse('2026-10-21T00:30:00Z'))).toBe(true);
  });
  it('keeps a file written well after the day ended', () => {
    expect(needsFetch('2026-10-20', Date.parse('2026-10-21T05:00:00Z'))).toBe(false);
  });
});
