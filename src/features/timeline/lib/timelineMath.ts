import { TIMELINE_SAMPLES_PER_PIXEL } from "./timelineLayout";

const BEATS_PER_BAR = 4;
const DEFAULT_SAMPLE_RATE = 44100;

export interface TimelineTick {
  timeSeconds: number;
  leftPx: number;
  beatInBar: number;
  barNumber: number;
  isBarStart: boolean;
  label: string | null;
}

export function secondsToPixels(seconds: number, zoomPxPerSecond: number): number {
  return Math.max(0, seconds) * zoomPxPerSecond;
}

export function pixelsToSeconds(pixels: number, zoomPxPerSecond: number): number {
  if (zoomPxPerSecond <= 0) {
    return 0;
  }

  return Math.max(0, pixels) / zoomPxPerSecond;
}

export function getBeatDurationSeconds(bpm: number): number {
  return 60 / Math.max(1, bpm);
}

export function getBarDurationSeconds(bpm: number): number {
  return getBeatDurationSeconds(bpm) * BEATS_PER_BAR;
}

export function getTimelineZoomPxPerSecond(sampleRate = DEFAULT_SAMPLE_RATE): number {
  return Math.max(1, sampleRate) / TIMELINE_SAMPLES_PER_PIXEL;
}

export function formatBarsBeats(seconds: number, bpm: number): string {
  const beatDuration = getBeatDurationSeconds(bpm);
  const totalBeats = Math.max(0, seconds) / beatDuration;
  const wholeBeats = Math.floor(totalBeats);
  const barNumber = Math.floor(wholeBeats / BEATS_PER_BAR) + 1;
  const beatInBar = (wholeBeats % BEATS_PER_BAR) + 1;
  return `${barNumber}.${beatInBar}`;
}

export function buildTimelineTicks(
  durationSeconds: number,
  bpm: number,
  zoomPxPerSecond: number,
): TimelineTick[] {
  const beatDuration = getBeatDurationSeconds(bpm);
  const totalBeats = Math.ceil(durationSeconds / beatDuration) + BEATS_PER_BAR;
  const ticks: TimelineTick[] = [];

  for (let beatIndex = 0; beatIndex <= totalBeats; beatIndex += 1) {
    const timeSeconds = beatIndex * beatDuration;
    const beatInBar = (beatIndex % BEATS_PER_BAR) + 1;
    const barNumber = Math.floor(beatIndex / BEATS_PER_BAR) + 1;
    const isBarStart = beatInBar === 1;

    ticks.push({
      timeSeconds,
      leftPx: secondsToPixels(timeSeconds, zoomPxPerSecond),
      beatInBar,
      barNumber,
      isBarStart,
      label: isBarStart ? `${barNumber}.1` : null,
    });
  }

  return ticks;
}
