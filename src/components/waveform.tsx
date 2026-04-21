import { useMemo } from 'react';

// Decorative synthetic-waveform renderer. Used only by Phone and Genie cards
// to show a playful stylised waveform preview. The real timeline waveforms
// come from waveform-playlist; this file exists purely for UI ornament.
function hash(seed: number, i: number) {
  const x = Math.sin(seed * 9999 + i * 137.7) * 43758.5453;
  return x - Math.floor(x);
}

function envelope(t: number) {
  const attack = 0.03, release = 0.08;
  if (t < attack) return t / attack;
  if (t > 1 - release) return (1 - t) / release;
  return 1;
}

function buildSamples({
  seed, bars, density = 1, energy = 1,
}: { seed: number; bars: number; density?: number; energy?: number }) {
  const samples: number[] = [];
  for (let i = 0; i < bars; i++) {
    const t = i / bars;
    const env = envelope(t);
    const n1 = hash(seed, i);
    const n2 = hash(seed + 1, i * 0.3);
    const n3 = hash(seed + 2, i * 0.08);
    const v =
      (0.3 + 0.5 * n3) *
      (0.4 + 0.6 * Math.abs(Math.sin(i * 0.15 * density))) *
      (0.7 + 0.3 * n1);
    let s = Math.min(1, v * env * energy);
    if (n2 > 0.95) s = Math.min(1, s * 1.6);
    samples.push(s);
  }
  return samples;
}

interface WaveProps {
  seed: number;
  color: string;
  width: number;
  height: number;
  bars?: number;
  density?: number;
  energy?: number;
}

export function Waveform({ seed, color, width, height, bars = 80, density = 1, energy = 1 }: WaveProps) {
  const samples = useMemo(() => buildSamples({ seed, bars, density, energy }), [seed, bars, density, energy]);
  const barW = width / bars;
  const gap = Math.max(0.5, barW * 0.25);
  const actualW = barW - gap;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {samples.map((v, i) => {
        const h = Math.max(1, v * height * 0.9);
        return (
          <rect key={i} x={i * barW} y={(height - h) / 2} width={actualW} height={h}
            fill={color} rx={actualW > 2 ? 0.5 : 0}/>
        );
      })}
    </svg>
  );
}
