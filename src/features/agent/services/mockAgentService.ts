import type { AgentRequestPayload } from "../../../types/agent";
import type { GroovyStoreSnapshot } from "./types";

// Kept as a lightweight utility so both the Gemini path and any future remote
// agent integration can share the same project-aware context payload.
export function buildAgentPayload(state: GroovyStoreSnapshot, prompt: string): AgentRequestPayload {
  const selectedTrack = state.tracks.find((track) => track.id === state.selectedTrackId) ?? null;

  return {
    prompt,
    context: {
      bpm: state.project.bpm,
      key: state.project.key,
      trackNames: state.tracks.map((track) => track.name),
      selectedTrack: selectedTrack?.name ?? null,
      cursor: state.cursorPosition,
    },
  };
}
