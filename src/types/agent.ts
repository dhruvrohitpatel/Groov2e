import type { TransportStatus } from "./models";

export interface AgentClipAttachment {
  kind: "clip";
  trackName: string;
  audioUrl: string;
  startTime: number;
  duration: number;
  inserted: boolean;
  /** Optional decorative seed for V2's waveform SVG preview bubble. */
  seed?: number;
  /** Optional label shown on the clip card (defaults to trackName). */
  label?: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachment?: AgentClipAttachment;
}

export interface AgentRequestContext {
  bpm: number;
  key: string;
  trackNames: string[];
  selectedTrack: string | null;
  cursor: number;
}

export interface AgentRequestPayload {
  prompt: string;
  context: AgentRequestContext;
}

export interface AgentResponse {
  action: "insert_generated_audio";
  trackName: string;
  audioUrl: string;
  startTime: number;
  duration: number;
}

export interface AgentRequestState {
  isLoading: boolean;
  lastPayload: AgentRequestPayload | null;
  lastKnownTransportStatus: TransportStatus;
}
