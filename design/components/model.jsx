// Track model — names, colors, clips positioned in seconds
const TRACKS_INIT = [
  { id: 'vocals', name: 'Vocals',  sub: 'Verse take 3',     color: '#C89A4B', armed: false, muted: false, solo: false, vol: 0.82, gain: 0,   pan: 0,    input: 'Scarlett 2i2 · In 1', output: 'Master',
    clips: [
      { id: 'v1', start: 2,   dur: 7,  seed: 11, label: 'v3.wav',     energy: 0.9 },
      { id: 'v2', start: 12,  dur: 9,  seed: 12, label: 'v3.wav',     energy: 1.0 },
      { id: 'v3', start: 23,  dur: 6,  seed: 13, label: 'adlib.wav',  energy: 0.7 },
    ]},
  { id: 'drums',  name: 'Drums',   sub: 'Loop · 92 bpm',    color: '#7A5D3A', armed: false, muted: false, solo: false, vol: 0.68, gain: 0,   pan: 0,    input: 'No input',           output: 'Bus 1 · Drums',
    clips: [
      { id: 'd1', start: 0,   dur: 32, seed: 21, label: 'breakbeat.wav', energy: 1.0, density: 2.2 },
    ]},
  { id: 'keys',   name: 'Keys',    sub: 'Upright · A min',   color: '#2340E8', armed: true,  muted: false, solo: false, vol: 0.55, gain: 4.5, pan: -0.18, input: 'Built-in mic',       output: 'Master',
    clips: [
      { id: 'k1', start: 4,   dur: 14, seed: 31, label: 'keys_idea.wav', energy: 0.6 },
      { id: 'k2', start: 20,  dur: 8,  seed: 32, label: 'keys_idea.wav', energy: 0.7 },
    ]},
  { id: 'bass',   name: 'Bass',    sub: 'DI · Fender P',     color: '#3D2F22', armed: false, muted: true,  solo: false, vol: 0.6,  gain: 2,   pan: 0.12, input: 'Scarlett 2i2 · In 2', output: 'Master',
    clips: [
      { id: 'b1', start: 2,   dur: 18, seed: 41, label: 'bass_sub.wav', energy: 0.85, density: 0.6 },
      { id: 'b2', start: 22,  dur: 9,  seed: 42, label: 'bass_sub.wav', energy: 0.9,  density: 0.6 },
    ]},
];

const PROJECT_INIT = {
  name: 'night drive · idea 02',
  bpm: 92,
  key: 'A minor',
  timeSig: '4/4',
  length: 32,
  masterOut: 'Scarlett 2i2 · Out 1+2',
};

const INPUT_SOURCES = [
  'No input', 'Built-in mic', 'MBP mic',
  'Scarlett 2i2 · In 1', 'Scarlett 2i2 · In 2', 'Scarlett 2i2 · Stereo (1+2)',
  'Audient EVO 4 · In 1', 'Audient EVO 4 · In 2',
  'BlackHole 2ch (loopback)',
];
const OUTPUT_SOURCES = ['Master', 'Bus 1 · Drums', 'Bus 2 · Reverb send', 'Bus 3 · Parallel comp', 'Headphones cue'];
const MASTER_OUTPUTS = ['Built-in output', 'MacBook Pro Speakers', 'Scarlett 2i2 · Out 1+2', 'AirPods Pro', 'BlackHole 2ch'];
const KEYS = ['C major','C minor','C# minor','D major','D minor','Eb major','E minor','F major','F# minor','G major','G minor','Ab major','A major','A minor','Bb major','B minor'];
const BPMS = [60,72,80,88,90,92,95,100,110,120,128,140,160,174];

window.TRACKS_INIT = TRACKS_INIT;
window.PROJECT_INIT = PROJECT_INIT;
window.INPUT_SOURCES = INPUT_SOURCES;
window.OUTPUT_SOURCES = OUTPUT_SOURCES;
window.MASTER_OUTPUTS = MASTER_OUTPUTS;
window.KEYS = KEYS;
window.BPMS = BPMS;

function formatBarsBeats(sec, bpm, timeSig=[4,4]) {
  const beats = sec * bpm / 60;
  const bar = Math.floor(beats / timeSig[0]) + 1;
  const beat = Math.floor(beats % timeSig[0]) + 1;
  const tick = Math.floor((beats % 1) * 960);
  return `${String(bar).padStart(3,'0')}.${beat}.${String(tick).padStart(3,'0')}`;
}
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
}
window.formatBarsBeats = formatBarsBeats;
window.formatTime = formatTime;
