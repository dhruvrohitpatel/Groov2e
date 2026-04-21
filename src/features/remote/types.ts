export type RemoteCommand =
  | { type: "transport.play" }
  | { type: "transport.stop" }
  | { type: "transport.recordToggle" }
  | { type: "transport.metronomeToggle" }
  | { type: "track.select"; trackId: string }
  | { type: "track.arm"; trackId: string }
  | { type: "track.mute"; trackId: string }
  | { type: "track.solo"; trackId: string }
  | { type: "agent.open" }
  | { type: "agent.submitText"; prompt: string }
  | { type: "remote.voiceInputReceived"; transcript: string; source?: "phone" | "desktop" };

export interface RemoteTrackSummary {
  id: string;
  name: string;
  armed: boolean;
  muted: boolean;
  solo: boolean;
  clipCount: number;
}

export interface RemoteStateSnapshot {
  transportStatus: string;
  currentTime: number;
  barsBeats: string;
  bpm: number;
  metronomeEnabled: boolean;
  tracks: RemoteTrackSummary[];
  selectedTrackId: string | null;
  armedTrackIds: string[];
  recording: {
    isRecording: boolean;
    targetTrackId: string | null;
  };
  agent: {
    isLoading: boolean;
    lastPromptPreview: string | null;
  };
}
