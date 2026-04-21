export const DEFAULT_BEATS_PER_BAR = 4;

export function secondsPerBeat(bpm: number): number {
  return 60 / Math.max(1, bpm);
}

export function secondsPerBar(bpm: number, beatsPerBar = DEFAULT_BEATS_PER_BAR): number {
  return secondsPerBeat(bpm) * beatsPerBar;
}

// Bars / beats are 1-indexed for display. Ticks are sixteenth-note subdivisions
// within a beat (1..4). "BAR 3.2.1" means bar 3, beat 2, first sixteenth.
export interface BarBeatTick {
  bar: number;
  beat: number;
  tick: number;
}

export function secondsToBarBeatTick(
  seconds: number,
  bpm: number,
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
): BarBeatTick {
  const safeSeconds = Math.max(0, seconds);
  const totalBeats = safeSeconds / secondsPerBeat(bpm);
  const beatIndex = Math.floor(totalBeats);
  const tickFraction = totalBeats - beatIndex;
  const bar = Math.floor(beatIndex / beatsPerBar) + 1;
  const beat = (beatIndex % beatsPerBar) + 1;
  const tick = Math.floor(tickFraction * 4) + 1;
  return { bar, beat, tick };
}

export function formatBarBeatTick(value: BarBeatTick): string {
  return `${value.bar}.${value.beat}.${value.tick}`;
}

export function barToSeconds(bar: number, bpm: number, beatsPerBar = DEFAULT_BEATS_PER_BAR): number {
  const barZeroBased = Math.max(0, bar - 1);
  return barZeroBased * secondsPerBar(bpm, beatsPerBar);
}

export function secondsToBar(seconds: number, bpm: number, beatsPerBar = DEFAULT_BEATS_PER_BAR): number {
  return Math.max(0, seconds) / secondsPerBar(bpm, beatsPerBar) + 1;
}

export function snapToBar(seconds: number, bpm: number, beatsPerBar = DEFAULT_BEATS_PER_BAR): number {
  const barLen = secondsPerBar(bpm, beatsPerBar);
  return Math.round(seconds / barLen) * barLen;
}

export function snapToBeat(seconds: number, bpm: number): number {
  const beatLen = secondsPerBeat(bpm);
  return Math.round(seconds / beatLen) * beatLen;
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainderSeconds = safe - minutes * 60;
  const whole = Math.floor(remainderSeconds);
  const milliseconds = Math.round((remainderSeconds - whole) * 1000);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(whole).padStart(2, "0");
  const ms = String(milliseconds).padStart(3, "0");
  return `${mm}:${ss}.${ms}`;
}

// Bars count toward how much timeline to allocate. "32 bars" is the default
// ruler length wfpl shows when we haven't committed to a real project length.
export function barsFromDuration(seconds: number, bpm: number): number {
  return Math.ceil(secondsToBar(seconds, bpm));
}
