export function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}

export function formatBarsBeats(sec: number, bpm: number, timeSig: [number, number] = [4, 4]) {
  const beats = (sec * bpm) / 60;
  const bar = Math.floor(beats / timeSig[0]) + 1;
  const beat = Math.floor(beats % timeSig[0]) + 1;
  const tick = Math.floor((beats % 1) * 960);
  return `${String(bar).padStart(3, "0")}.${beat}.${String(tick).padStart(3, "0")}`;
}

export function formatTime(sec: number) {
  const safe = Math.max(0, sec);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}
