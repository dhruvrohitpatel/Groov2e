// Bridge so that mixer components can subscribe to wfpl's master Analyser
// without living inside the WaveformPlaylistProvider subtree. Lane.tsx
// registers the analyser ref imperatively; the mixer reads it at rAF time.

type Analyserish = { getValue: () => number | Float32Array | number[] };

let analyser: Analyserish | null = null;

export function setMasterAnalyser(next: Analyserish | null) {
  analyser = next;
}

export function getMasterAnalyser(): Analyserish | null {
  return analyser;
}
