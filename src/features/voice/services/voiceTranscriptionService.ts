// Trust boundary: voice audio is streamed once over TLS to the active provider
// and discarded locally — no at-rest audio storage. The resulting transcript
// follows the existing chatMessages lifecycle (in-memory + the localStorage
// project snapshot). Do not route voice input through third-party services
// without updating this comment and confirming the transit is still TLS-only.
import { hasAgentKey, transcribeAudio as geminiTranscribeAudio } from "../../agent/services/agentRouter";

export interface TranscriptionResult {
  text: string;
  durationMs: number;
}

export interface TranscriptionOptions {
  signal?: AbortSignal;
}

export interface VoiceTranscriptionService {
  readonly id: "gemini";
  isAvailable(): boolean;
  transcribe(
    blob: Blob,
    mimeType: string,
    opts?: TranscriptionOptions,
  ): Promise<TranscriptionResult>;
}

const geminiService: VoiceTranscriptionService = {
  id: "gemini",
  isAvailable() {
    return hasAgentKey();
  },
  async transcribe(blob, mimeType) {
    const started = performance.now();
    const { text } = await geminiTranscribeAudio(blob, mimeType);
    return { text, durationMs: performance.now() - started };
  },
};

export function getActiveTranscriptionService(): VoiceTranscriptionService {
  return geminiService;
}
