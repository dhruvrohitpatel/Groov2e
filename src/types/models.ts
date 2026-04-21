export type MusicalKey = string;

export interface Project {
  name: string;
  bpm: number;
  key: MusicalKey;
  sampleRate?: number;
  // V2 cosmetic fields.
  timeSig?: string;
  length?: number;
  masterOut?: string;
}

export type ClipSourceKind = "appAsset" | "file";

export interface Clip {
  id: string;
  trackId: string;
  fileUrl: string;
  filePath?: string | null;
  sourceKind?: ClipSourceKind;
  startTime: number;
  duration: number;
  sourceOffset: number;
  name: string;
  muted: boolean;
  takeGroupId?: string;
  waveformPeaks?: number[];
}

export interface TakeGroup {
  id: string;
  trackId: string;
  regionStartTime: number;
  regionDuration: number;
  activeClipId: string | null;
  clipIds: string[];
}

export interface ProjectFileState {
  projectDirectoryPath: string | null;
  projectFilePath: string | null;
  lastSavedAt: string | null;
  lastError: string | null;
}

export interface Track {
  id: string;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  clips: string[];
  // V2 cosmetic fields used by the track-head UI.
  sub?: string;
  color?: string;
  gain?: number;
  vol?: number;
  input?: string;
  output?: string;
}

export type TransportStatus = "stopped" | "playing" | "paused";

export interface TransportState {
  status: TransportStatus;
  currentTime: number;
  isRecording: boolean;
  metronomeEnabled: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  countInEnabled: boolean;
  countInBars: number;
  isCountInActive: boolean;
  countInBeatsRemaining: number | null;
  armedTrackId: string | null;
  activeRecordingTrackId: string | null;
  recordStartTime: number | null;
  recordingInputId: string | null;
  pendingTakeGroupId: string | null;
  lastRecordingNote: string | null;
  lastError: string | null;
}

export interface TimelineViewState {
  zoomPxPerSecond: number;
  scrollLeft: number;
  visibleDuration: number;
}

export interface AudioDeviceOption {
  id: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

export interface DeviceState {
  inputs: AudioDeviceOption[];
  outputs: AudioDeviceOption[];
  selectedInputId: string | null;
  selectedOutputId: string | null;
  outputSelectionSupported: boolean;
  error: string | null;
}
