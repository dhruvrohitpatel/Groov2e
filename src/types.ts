export interface Clip {
  id: string;
  start: number;
  dur: number;
  seed: number;
  label: string;
  energy?: number;
  density?: number;
  _justInserted?: boolean;
}

export interface Track {
  id: string;
  name: string;
  sub: string;
  color: string;
  armed: boolean;
  muted: boolean;
  solo: boolean;
  vol: number;
  gain: number;
  pan: number;
  input: string;
  output: string;
  clips: Clip[];
}

export interface Project {
  name: string;
  bpm: number;
  key: string;
  timeSig: string;
  length: number;
  masterOut: string;
}

export type ThemeName = 'warm' | 'light' | 'dark';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type SnapMode = 'bar' | 'beat' | 'off';

export interface Tweaks {
  theme: ThemeName;
  density: Density;
  mixer: boolean;
  phone: boolean;
}

export interface Theme {
  bg: string;
  paper: string;
  rule: string;
  ruleFaint: string;
  rulerText: string;
  trackBg: string;
  trackHeadBg: string;
  trackSelBg: string;
  trackName: string;
  trackSub: string;
  clipBg: string;
  clipBorder: string;
  clipLabel: string;
  clipLabelBg: string;
  accent: string;
  playhead: string;
  pillBg: string;
  pillBorder: string;
  pillDivider: string;
  pillText: string;
  pillTextStrong: string;
  lampBrass: string;
  genieBg: string;
  genieActiveBg: string;
  geniePanelBg: string;
  geniePanelText: string;
  genieInputBg: string;
  userMsgBg: string;
  userMsgText: string;
  clipCardBg: string;
  clipCardWave: string;
  metroOn: string;
  phoneBg: string;
  phoneText: string;
  phoneWaveBg: string;
  tweakBg: string;
  topBarBg: string;
  topBarText: string;
}

export type ChatMessage =
  | { role: 'genie' | 'user'; text: string; pending?: boolean }
  | {
      role: 'clip';
      meta: { seed: number; dur: number; bpm: number; key: string; label: string };
      inserted: boolean;
    };
