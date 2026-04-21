// Deterministic pseudo-random waveform generators in three styles.
function hash(seed, i) {
  let x = Math.sin(seed * 9999 + i * 137.7) * 43758.5453;
  return x - Math.floor(x);
}

// Envelope gives clips a natural attack/sustain/release feel
function envelope(t, length) {
  const attack = 0.03, release = 0.08;
  if (t < attack) return t / attack;
  if (t > 1 - release) return (1 - t) / release;
  return 1;
}

function buildSamples({seed, bars, length, density=1, energy=1}) {
  const samples = [];
  for (let i = 0; i < bars; i++) {
    const t = i / bars;
    const env = envelope(t, length);
    const n1 = hash(seed, i);
    const n2 = hash(seed + 1, i * 0.3);
    const n3 = hash(seed + 2, i * 0.08);
    // combine: low-freq shape + mid + hi-freq noise
    const v = (0.3 + 0.5 * n3) * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.15 * density))) * (0.7 + 0.3 * n1);
    samples.push(Math.min(1, v * env * energy));
    // occasional transients
    if (n2 > 0.95) samples[i] = Math.min(1, samples[i] * 1.6);
  }
  return samples;
}

// ─ Bars style: clean filled rectangles, thin gaps
function BarsWave({seed, color, width, height, bars=80, density=1, energy=1}) {
  const samples = React.useMemo(() => buildSamples({seed, bars, length: bars, density, energy}), [seed, bars, density, energy]);
  const barW = width / bars;
  const gap = Math.max(0.5, barW * 0.25);
  const actualW = barW - gap;
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      {samples.map((v, i) => {
        const h = Math.max(1, v * height * 0.9);
        return <rect key={i} x={i*barW} y={(height-h)/2} width={actualW} height={h} fill={color} rx={actualW > 2 ? 0.5 : 0}/>;
      })}
    </svg>
  );
}

// ─ Filled style: mirrored continuous shape (solid area)
function FilledWave({seed, color, width, height, bars=120, density=1, energy=1}) {
  const samples = React.useMemo(() => buildSamples({seed, bars, length: bars, density, energy}), [seed, bars, density, energy]);
  const mid = height / 2;
  const step = width / (bars - 1);
  const top = samples.map((v,i) => `${i===0?'M':'L'}${i*step},${mid - v*height*0.45}`).join(' ');
  const bot = samples.map((v,i) => `L${(bars-1-i)*step},${mid + samples[bars-1-i]*height*0.45}`).join(' ');
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      <path d={`${top} ${bot} Z`} fill={color}/>
    </svg>
  );
}

// ─ Line style: thin stroked line, vintage scope feel
function LineWave({seed, color, width, height, bars=200, density=1, energy=1}) {
  const samples = React.useMemo(() => buildSamples({seed, bars, length: bars, density, energy}), [seed, bars, density, energy]);
  const mid = height / 2;
  const step = width / (bars - 1);
  // center line bouncing above/below mid
  const path = samples.map((v,i) => {
    const sign = i % 2 === 0 ? -1 : 1;
    return `${i===0?'M':'L'}${i*step},${mid + sign * v * height * 0.45}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      <path d={path} stroke={color} strokeWidth="1" fill="none"/>
    </svg>
  );
}

function Waveform({style='bars', ...rest}) {
  if (style === 'filled') return <FilledWave {...rest}/>;
  if (style === 'line') return <LineWave {...rest}/>;
  return <BarsWave {...rest}/>;
}

window.Waveform = Waveform;
