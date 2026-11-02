import { layoutTimeline } from './timeline';

const byKey = (placements: ReturnType<typeof layoutTimeline>) =>
  Object.fromEntries(placements.map((p) => [p.key, [p.column, p.columns]]));

describe('layoutTimeline', () => {
  it('gives items that do not overlap the full width', () => {
    const result = layoutTimeline([
      { key: 'a', start: 60, end: 120 },
      { key: 'b', start: 120, end: 180 },
    ]);
    expect(byKey(result)).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it('puts overlapping items side by side', () => {
    const result = layoutTimeline([
      { key: 'a', start: 60, end: 180 },
      { key: 'b', start: 90, end: 150 },
    ]);
    expect(byKey(result)).toEqual({ a: [0, 2], b: [1, 2] });
  });

  it('reuses a column once it is free, keeping the group width', () => {
    // a overlaps b and c; b and c do not overlap, so c reuses b's column.
    const result = layoutTimeline([
      { key: 'a', start: 0, end: 240 },
      { key: 'b', start: 30, end: 90 },
      { key: 'c', start: 120, end: 180 },
      { key: 'd', start: 300, end: 360 },
    ]);
    expect(byKey(result)).toEqual({ a: [0, 2], b: [1, 2], c: [1, 2], d: [0, 1] });
  });

  it('uses as many columns as items overlapping at once', () => {
    const result = layoutTimeline([
      { key: 'a', start: 0, end: 60 },
      { key: 'b', start: 0, end: 60 },
      { key: 'c', start: 0, end: 60 },
    ]);
    expect(result.map((p) => p.column).sort()).toEqual([0, 1, 2]);
    expect(result.every((p) => p.columns === 3)).toBe(true);
  });

  it('handles zero-length items', () => {
    const result = layoutTimeline([
      { key: 'a', start: 60, end: 60 },
      { key: 'b', start: 60, end: 60 },
    ]);
    expect(byKey(result)).toEqual({ a: [0, 2], b: [1, 2] });
  });
});
