import { useGroovyStore } from '../store/useGroovyStore';
import type { Theme } from '../types';
import { TIMELINE_RULER_HEIGHT, TIMELINE_ROW_HEIGHT } from '../features/timeline/lib/timelineLayout';

interface Props {
  theme: Theme;
  trackHeight: number;
  zoomPxPerSecond: number;
  scrollLeft: number;
  laneInnerWidth: number;
  /** Horizontal offset before the timeline body (the track-head gutter). */
  contentOriginLeft: number;
}

export function SelectionRangeOverlay({
  theme,
  trackHeight,
  zoomPxPerSecond,
  scrollLeft,
  laneInnerWidth,
  contentOriginLeft,
}: Props) {
  const range = useGroovyStore((s) => s.selectionRange);
  const tracks = useGroovyStore((s) => s.tracks);

  if (!range) return null;
  const trackIndex = tracks.findIndex((t) => t.id === range.trackId);
  if (trackIndex === -1) return null;

  const rulerHeight = TIMELINE_RULER_HEIGHT;
  const top = rulerHeight + trackIndex * trackHeight;
  const rawLeft = contentOriginLeft + range.startTime * zoomPxPerSecond - scrollLeft;
  const width = Math.max(2, (range.endTime - range.startTime) * zoomPxPerSecond);

  // Clip the overlay to the visible lane area.
  const minLeft = contentOriginLeft;
  const clampedLeft = Math.max(minLeft, rawLeft);
  const clampedWidth = Math.min(laneInnerWidth - (clampedLeft - minLeft), width - (clampedLeft - rawLeft));
  if (clampedWidth <= 0) return null;

  const accent = theme.accent || '#2340E8';

  return (
    <div
      style={{
        position: 'absolute',
        top,
        height: trackHeight,
        left: clampedLeft,
        width: clampedWidth,
        background: `${accent}22`,
        borderLeft: `1.5px solid ${accent}`,
        borderRight: `1.5px solid ${accent}`,
        pointerEvents: 'none',
        zIndex: 6,
      }}
    />
  );
}

// Keep this available for callers that need a default row height value.
export { TIMELINE_ROW_HEIGHT };
