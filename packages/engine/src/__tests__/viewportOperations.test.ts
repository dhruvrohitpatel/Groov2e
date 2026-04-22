import { describe, it, expect } from 'vitest';
import {
  calculateViewportBounds,
  getVisibleChunkIndices,
  shouldUpdateViewport,
} from '../operations/viewportOperations';

describe('calculateViewportBounds', () => {
  it('includes buffer on both sides', () => {
    const result = calculateViewportBounds(500, 1000);
    expect(result.visibleStart).toBe(0); // max(0, 500 - 1500)
    expect(result.visibleEnd).toBe(3000); // 500 + 1000 + 1500
  });

  it('clamps visibleStart to 0', () => {
    const result = calculateViewportBounds(100, 1000);
    expect(result.visibleStart).toBe(0);
  });

  it('respects custom buffer ratio', () => {
    const result = calculateViewportBounds(5000, 1000, 2.0);
    expect(result.visibleStart).toBe(3000);
    expect(result.visibleEnd).toBe(8000);
  });
});

describe('getVisibleChunkIndices', () => {
  it('returns all chunks when viewport covers everything', () => {
    const result = getVisibleChunkIndices(3000, 1000, 0, 5000);
    expect(result).toEqual([0, 1, 2]);
  });

  it('filters out chunks outside viewport', () => {
    const result = getVisibleChunkIndices(5000, 1000, 1500, 3500);
    expect(result).toEqual([1, 2, 3]);
  });

  it('handles partial last chunk', () => {
    const result = getVisibleChunkIndices(2500, 1000, 0, 5000);
    expect(result).toEqual([0, 1, 2]);
  });

  it('returns empty array for zero width', () => {
    const result = getVisibleChunkIndices(0, 1000, 0, 5000);
    expect(result).toEqual([]);
  });
});

describe('shouldUpdateViewport', () => {
  it('returns false for small scroll changes', () => {
    expect(shouldUpdateViewport(100, 150)).toBe(false);
  });

  it('returns true for scroll changes above threshold', () => {
    expect(shouldUpdateViewport(100, 250)).toBe(true);
  });

  it('respects custom threshold', () => {
    expect(shouldUpdateViewport(100, 140, 50)).toBe(false);
    expect(shouldUpdateViewport(100, 160, 50)).toBe(true);
  });
});
