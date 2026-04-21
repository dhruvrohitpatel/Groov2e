import type { AgentMessage } from "../types/agent";
import { getTimelineZoomPxPerSecond } from "../features/timeline/lib/timelineMath";
import type {
  Clip,
  DeviceState,
  Project,
  ProjectFileState,
  RecordingState,
  TakeGroup,
  TimelineViewState,
  Track,
  TransportState,
} from "../types/models";

export interface InitialGroovyState {
  project: Project;
  transport: TransportState;
  tracks: Track[];
  clips: Record<string, Clip>;
  takeGroups: Record<string, TakeGroup>;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  cursorPosition: number;
  timeline: TimelineViewState;
  recording: RecordingState;
  projectFile: ProjectFileState;
  chatMessages: AgentMessage[];
  devices: DeviceState;
}

const tracks: Track[] = [
  {
    id: "track-vocals",
    name: "Vocals",
    sub: "Verse take 3",
    color: "#C89A4B",
    volume: 0.82, vol: 0.82, gain: 0, pan: 0,
    muted: false, solo: false, armed: false,
    input: "Scarlett 2i2 · In 1", output: "Master",
    clips: [],
  },
  {
    id: "track-drums",
    name: "Drums",
    sub: "Loop · 92 bpm",
    color: "#7A5D3A",
    volume: 0.68, vol: 0.68, gain: 0, pan: 0,
    muted: false, solo: false, armed: false,
    input: "No input", output: "Bus 1 · Drums",
    clips: [],
  },
  {
    id: "track-keys",
    name: "Keys",
    sub: "Upright · A min",
    color: "#2340E8",
    volume: 0.55, vol: 0.55, gain: 4.5, pan: -0.18,
    muted: false, solo: false, armed: true,
    input: "Built-in mic", output: "Master",
    clips: [],
  },
  {
    id: "track-bass",
    name: "Bass",
    sub: "DI · Fender P",
    color: "#3D2F22",
    volume: 0.6, vol: 0.6, gain: 2, pan: 0.12,
    muted: true, solo: false, armed: false,
    input: "Scarlett 2i2 · In 2", output: "Master",
    clips: [],
  },
];

const clips: Record<string, Clip> = {};

const takeGroups: Record<string, TakeGroup> = {};

const chatMessages: AgentMessage[] = [
  {
    id: "message-system-welcome",
    role: "system",
    content: "Mock agent ready. Ask for a loop and I will insert a generated clip into the project state.",
    createdAt: new Date().toISOString(),
  },
];

const devices: DeviceState = {
  inputs: [],
  outputs: [],
  selectedInputId: null,
  selectedOutputId: null,
  outputSelectionSupported: false,
  error: null,
};

const recording: RecordingState = {
  isRecording: false,
  countInEnabled: false,
  countInBars: 1,
  isCountInActive: false,
  countInBeatsRemaining: null,
  armedTrackId: "track-keys",
  activeRecordingTrackId: null,
  recordStartTime: null,
  recordingInputId: null,
  pendingTakeGroupId: null,
  lastRecordingNote: "Recording uses the selected input and writes durable audio files when running in the Tauri desktop shell.",
  lastError: null,
};

const projectFile: ProjectFileState = {
  projectDirectoryPath: null,
  projectFilePath: null,
  lastSavedAt: null,
  lastError: null,
};

const project: Project = {
  name: "night drive · idea 02",
  bpm: 92,
  key: "A minor",
  sampleRate: 44100,
  timeSig: "4/4",
  length: 32,
  masterOut: "Scarlett 2i2 · Out 1+2",
};

const transport: TransportState = {
  status: "stopped",
  currentTime: 0,
  isRecording: false,
  metronomeEnabled: false,
};

const timeline: TimelineViewState = {
  zoomPxPerSecond: getTimelineZoomPxPerSecond(project.sampleRate),
  scrollLeft: 0,
  visibleDuration: 8,
};

export function createInitialGroovyState(): InitialGroovyState {
  return {
    project: structuredClone(project),
    transport: structuredClone(transport),
    tracks: structuredClone(tracks),
    clips: structuredClone(clips),
    takeGroups: structuredClone(takeGroups),
    selectedTrackId: "track-keys",
    selectedClipId: null,
    cursorPosition: 0,
    timeline: structuredClone(timeline),
    recording: structuredClone(recording),
    projectFile: structuredClone(projectFile),
    chatMessages: structuredClone(chatMessages),
    devices: structuredClone(devices),
  };
}
