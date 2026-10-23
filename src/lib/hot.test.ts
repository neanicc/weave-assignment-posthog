import { describe, expect, it } from 'vitest';
import { computeHotAreas } from './hot.ts';

describe('computeHotAreas', () => {
  it('keeps the top share of areas by distinct human authors', () => {
    const prs = [
      ...['u1', 'u2', 'u3', 'u4', 'u5'].map((author) => ({ author, bot: false, areas: ['a'] })),
      ...'bcdefghij'.split('').map((area) => ({ author: 'u1', bot: false, areas: [area] })),
    ];
    expect(computeHotAreas(prs, 0.1)).toEqual(['a']);
  });

  it('ignores bot authors', () => {
    const prs = [
      { author: 'u1', bot: false, areas: ['a'] },
      ...['b1', 'b2', 'b3'].map((author) => ({ author, bot: true, areas: ['b'] })),
      { author: 'u2', bot: false, areas: ['a'] },
    ];
    expect(computeHotAreas(prs, 0.1)).toEqual(['a']);
  });

  it('returns at least one area when any exist', () => {
    expect(computeHotAreas([{ author: 'u1', bot: false, areas: ['x'] }], 0.01)).toEqual(['x']);
    expect(computeHotAreas([], 0.1)).toEqual([]);
  });
});
