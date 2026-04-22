/**
 * Viewport operations for virtual scrolling.
 *
 * Pure math helpers that determine which portion of the timeline
 * is visible and which canvas chunks need to be mounted.
 */

/**
 * Calculate the visible region with an overscan buffer for virtual scrolling.
 *
 * The buffer extends the visible range on both sides so that chunks are
 * mounted slightly before they scroll into view, preventing flicker.
 *
 * @param scrollLeft - Current horizontal scroll position in pixels
 * @param containerWidth - Width of the scroll container in pixels
 * @param bufferRatio - Multiplier for buffer size (default 1.5x container width)
 * @returns Object with visibleStart and visibleEnd in pixels
 */
export function calculateViewportBounds(
  scrollLeft: number,
  containerWidth: number,
  bufferRatio: number = 1.5
): { visibleStart: number; visibleEnd: number } {
  const buffer = containerWidth * bufferRatio;
  return {
    visibleStart: Math.max(0, scrollLeft - buffer),
    visibleEnd: scrollLeft + containerWidth + buffer,
  };
}

/**
 * Get an array of chunk indices that overlap the visible viewport.
 *
 * Chunks are fixed-width segments of the total timeline width. Only chunks
 * that intersect [visibleStart, visibleEnd) are included. The last chunk
 * may be narrower than chunkWidth if totalWidth is not evenly divisible.
 *
 * @param totalWidth - Total width of the timeline in pixels
 * @param chunkWidth - Width of each chunk in pixels
 * @param visibleStart - Left edge of the visible region in pixels
 * @param visibleEnd - Right edge of the visible region in pixels
 * @returns Array of chunk indices (0-based) that are visible
 */
export function getVisibleChunkIndices(
  totalWidth: number,
  chunkWidth: number,
  visibleStart: number,
  visibleEnd: number
): number[] {
  const totalChunks = Math.ceil(totalWidth / chunkWidth);
  const indices: number[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkLeft = i * chunkWidth;
    const thisChunkWidth = Math.min(totalWidth - chunkLeft, chunkWidth);
    const chunkEnd = chunkLeft + thisChunkWidth;

    if (chunkEnd <= visibleStart || chunkLeft >= visibleEnd) {
      continue;
    }

    indices.push(i);
  }

  return indices;
}

/**
 * Determine whether a scroll change is large enough to warrant
 * recalculating the viewport and re-rendering chunks.
 *
 * Small scroll movements are ignored to avoid excessive recomputation
 * during smooth scrolling.
 *
 * @param oldScrollLeft - Previous scroll position in pixels
 * @param newScrollLeft - Current scroll position in pixels
 * @param threshold - Minimum pixel delta to trigger an update (default 100)
 * @returns true if the scroll delta meets or exceeds the threshold
 */
export function shouldUpdateViewport(
  oldScrollLeft: number,
  newScrollLeft: number,
  threshold: number = 100
): boolean {
  return Math.abs(oldScrollLeft - newScrollLeft) >= threshold;
}
