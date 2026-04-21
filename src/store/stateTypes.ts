import type { AgentMessage, AgentRequestState } from "../types/agent";
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

// Snapshot stored by the agent undo stack. Each tool call that mutates state
// pushes one of these before running so a single click reverts the AI's last
// change. Capped at 20 entries.
export interface AgentSnapshot {
  id: string;
  label: string;
  createdAt: number;
  project: Project;
  tracks: Track[];
  clips: Record<string, Clip>;
  takeGroups: Record<string, TakeGroup>;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  cursorPosition: number;
}

// Live feed of tool calls the agent is executing inside the current turn.
// Consumed by the Genie panel to render a step-by-step progress list.
export interface AgentToolActivity {
  id: string;
  name: string;
  args: unknown;
  status: "running" | "ok" | "error";
  message?: string;
  destructive: boolean;
  snapshotPushed: boolean;
  durationMs?: number;
  startedAt: number;
}

export interface GroovyStoreStatePublic {
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
  agentRequest: AgentRequestState;
  devices: DeviceState;
  agentUndoStack: AgentSnapshot[];
  agentLocked: boolean;
  agentActivity: AgentToolActivity[];
}
