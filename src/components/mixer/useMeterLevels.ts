import { useEffect, useRef, useState } from 'react';

type Analyserish = {
  getValue: () => number | Float32Array | Array<number>;
};

export interface MeterSample {
  rms: number;
  peak: number;
  rmsLeft: number;
  rmsRight: number;
}

const SILENT: MeterSample = { rms: 0, peak: 0, rmsLeft: 0, rmsRight: 0 };

function toLinear(db: number): number {
  if (!Number.isFinite(db)) return 0;
  if (db <= -60) return 0;
  return Math.max(0, Math.min(1, Math.pow(10, db / 20)));
}

// Hook that polls a Tone.Meter / Tone.Analyser at ~30fps and returns a
// smoothed RMS + peak-hold value in the 0-1 range. The hook accepts the
// ref lazily because meters don't exist until wfpl wires the audio graph.
export function useMeterLevels(getAnalyser: () => Analyserish | null | undefined): MeterSample {
  const [sample, setSample] = useState<MeterSample>(SILENT);
  const peakRef = useRef(0);
  const peakHoldUntilRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let lastUpdate = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastUpdate < 33) return;
      lastUpdate = now;

      const analyser = getAnalyser();
      if (!analyser) {
        setSample(SILENT);
        return;
      }

      const value = analyser.getValue();
      let left = 0;
      let right = 0;

      if (typeof value === 'number') {
        left = toLinear(value);
        right = left;
      } else if (Array.isArray(value)) {
        left = toLinear(value[0] ?? -Infinity);
        right = toLinear(value[1] ?? left);
      } else if (value instanceof Float32Array) {
        // FFT magnitudes in dB (Tone.Analyser 'fft'). Convert each bin to
        // linear amplitude and sum so loud broadband content scales naturally.
        let linearSum = 0;
        let maxLinear = 0;
        for (let i = 0; i < value.length; i += 1) {
          const linearBin = toLinear(value[i]);
          linearSum += linearBin;
          if (linearBin > maxLinear) maxLinear = linearBin;
        }
        const linear = Math.max(maxLinear, Math.min(1, linearSum / 16));
        left = linear;
        right = linear;
      }

      const rms = (left + right) / 2;
      const peakCandidate = Math.max(left, right);

      if (peakCandidate >= peakRef.current) {
        peakRef.current = peakCandidate;
        peakHoldUntilRef.current = now + 600;
      } else if (now > peakHoldUntilRef.current) {
        peakRef.current = Math.max(peakCandidate, peakRef.current * 0.9);
      }

      setSample({ rms, peak: peakRef.current, rmsLeft: left, rmsRight: right });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getAnalyser]);

  return sample;
}
