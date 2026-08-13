import { describe, expect, it } from 'vitest';
import { computeHunks } from '../src/diff/computeHunks';

describe('computeHunks (pure diff engine)', () => {
  it('returns no hunks for identical files', () => {
    expect(computeHunks('a\nb\n', 'a\nb\n')).toEqual([]);
  });

  it('detects a pure addition', () => {
    expect(computeHunks('a\n', 'a\nb\n')).toEqual([
      { type: 'added', fromA: 2, toA: 1, fromB: 2, toB: 2, baselineText: '' },
    ]);
  });

  it('detects a pure deletion', () => {
    expect(computeHunks('a\nb\n', 'a\n')).toEqual([
      { type: 'deleted', fromA: 2, toA: 2, fromB: 2, toB: 1, baselineText: 'b\n' },
    ]);
  });

  it('detects a pure modification', () => {
    expect(computeHunks('a\nb\nc\n', 'a\nX\nc\n')).toEqual([
      { type: 'modified', fromA: 2, toA: 2, fromB: 2, toB: 2, baselineText: 'b\n' },
    ]);
  });

  it('detects a multi-line replacement as a single modified hunk', () => {
    expect(computeHunks('a\nb\nc\nd\n', 'a\nX\nY\nd\n')).toEqual([
      { type: 'modified', fromA: 2, toA: 3, fromB: 2, toB: 3, baselineText: 'b\nc\n' },
    ]);
  });

  it('classifies mixed edits in order with correct types', () => {
    const hunks = computeHunks('1\n2\n3\n', '1\nA\n3\n4\n5\n');
    expect(hunks.map((h) => h.type)).toEqual(['modified', 'added']);
    expect(hunks[0]).toMatchObject({ fromB: 2, toB: 2, baselineText: '2\n' });
    expect(hunks[1]).toMatchObject({ fromB: 4, toB: 5, baselineText: '' });
  });

  it('handles an empty baseline filled by content', () => {
    expect(computeHunks('', 'x\n')).toEqual([
      { type: 'added', fromA: 1, toA: 0, fromB: 1, toB: 1, baselineText: '' },
    ]);
  });

  it('handles content fully deleted', () => {
    expect(computeHunks('x\n', '')).toEqual([
      { type: 'deleted', fromA: 1, toA: 1, fromB: 1, toB: 0, baselineText: 'x\n' },
    ]);
  });

  it('keeps invariants: deleted hunks have toB < fromB, others toB >= fromB', () => {
    const hunks = computeHunks('a\nb\nc\nd\ne\n', 'a\nB\nc\nE\nF\n');
    for (const h of hunks) {
      if (h.type === 'deleted') {
        expect(h.toB).toBeLessThan(h.fromB);
      } else {
        expect(h.toB).toBeGreaterThanOrEqual(h.fromB);
      }
    }
  });
});
