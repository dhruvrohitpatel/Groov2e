import type { AgentMessage, AgentRequestState } from "../../../types/agent";
import type {
  Clip,
  DeviceState,
  Project,
  RecordingState,
  TimelineViewState,
  Track,
  TransportState,
} from "../../../types/models";

export interface GroovyStoreSnapshot {
  project: Project;
  transport: TransportState;
  tracks: Track[];
  clips: Record<string, Clip>;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  cursorPosition: number;
  timeline: TimelineViewState;
  recording: RecordingState;
  chatMessages: AgentMessage[];
  agentRequest: AgentRequestState;
  devices: DeviceState;
}
