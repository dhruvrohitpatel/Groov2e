import { GoogleGenAI } from "@google/genai";
import { getGlobalAudioContext } from "@waveform-playlist/playout";

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? undefined;
const MODEL_ID = (import.meta.env.VITE_GEMINI_MUSIC_MODEL as string | undefined) ?? "lyria-3-clip-preview";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!API_KEY) {
    throw new Error(
      "Gemini audio generation is not configured. Set VITE_GEMINI_API_KEY in .env.local to enable it.",
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: API_KEY });
  }
  return client;
}

export function hasGeminiKey(): boolean {
  return Boolean(API_KEY);
}

export interface GeminiMusicResult {
  blob: Blob;
  mimeType: string;
  duration: number;
  trackName: string;
  commentary: string | null;
  /** When a bar count is requested, this is populated with the exact target
   * length in seconds (bar × 60 / bpm × 4). The returned audio is trimmed to
   * this length before being encoded back to a Blob. */
  targetSeconds?: number;
  /** Model that produced the clip, for UI tagging. */
  model: string;
}

export interface GenerateOptions {
  trackName?: string;
  /** When provided, the prompt is wrapped with structural hints that describe
   * the desired length in bars and the audio is trimmed to that length. */
  bars?: number;
  /** Used for bar→seconds math when `bars` is provided. */
  bpm?: number;
  /** Instrument / timbre focus so Lyria stays on topic. */
  instrument?: string;
  /** Additional mood/style hints appended after the prompt. */
  styleHints?: string;
}

function base64ToBytes(base64: string): Uint8Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function buildStructuredPrompt(prompt: string, opts: GenerateOptions): string {
  const lines: string[] = [];
  lines.push(prompt.trim());
  const qualifiers: string[] = [];
  if (opts.bars && opts.bpm) {
    const seconds = (opts.bars * 60 * 4) / opts.bpm;
    qualifiers.push(`Length: exactly ${opts.bars} bar${opts.bars === 1 ? "" : "s"} (${seconds.toFixed(1)} seconds at ${opts.bpm} BPM).`);
    qualifiers.push(`Begin strictly on beat 1; end cleanly on the last beat with no tail.`);
  } else if (opts.bpm) {
    qualifiers.push(`Target tempo ${opts.bpm} BPM with clear downbeats.`);
  }
  if (opts.instrument) {
    qualifiers.push(`Instrumentation: ${opts.instrument}. Do NOT include any other layers.`);
  }
  if (opts.styleHints) {
    qualifiers.push(opts.styleHints);
  }
  if (qualifiers.length > 0) {
    lines.push("", ...qualifiers);
  }
  return lines.join("\n");
}

// Scan the head of a decoded buffer for the first frame whose absolute amplitude
// across any channel crosses the threshold. Lyria frequently hands back 50–300 ms
// of silence/fade-in before the first musical event, which throws the clip off the
// grid when we place it at bar boundaries. Trimming that head pulls the first
// transient onto the downbeat.
const SILENCE_THRESHOLD = 0.01; // ~ -40 dBFS
const SILENCE_SCAN_MAX_SECONDS = 0.5;
const SILENCE_PRE_ATTACK_GUARD_SECONDS = 0.005;

function detectLeadingSilenceFrames(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const maxScan = Math.min(buffer.length, Math.round(SILENCE_SCAN_MAX_SECONDS * sampleRate));
  const channels = buffer.numberOfChannels;

  for (let i = 0; i < maxScan; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      if (Math.abs(buffer.getChannelData(c)[i]) > SILENCE_THRESHOLD) {
        const guard = Math.round(SILENCE_PRE_ATTACK_GUARD_SECONDS * sampleRate);
        return Math.max(0, i - guard);
      }
    }
  }
  return 0;
}

// Slices a decoded AudioBuffer to the target duration and re-encodes to a
// 16-bit PCM WAV so downstream `decodeAudioData` can load it anywhere. The
// slice starts at `startFrame` so leading silence can be trimmed before encode.
function encodeBufferToWav(
  buffer: AudioBuffer,
  seconds: number,
  startFrame = 0,
): { blob: Blob; mimeType: string } {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const available = Math.max(0, buffer.length - startFrame);
  const frames = Math.min(available, Math.round(seconds * sampleRate));
  const interleaved = new Float32Array(frames * channels);
  for (let c = 0; c < channels; c += 1) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < frames; i += 1) {
      interleaved[i * channels + c] = ch[startFrame + i];
    }
  }

  const bytesPerSample = 2;
  const dataLen = interleaved.length * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(arrayBuffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataLen, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return { blob: new Blob([arrayBuffer], { type: "audio/wav" }), mimeType: "audio/wav" };
}

// Map raw Gemini SDK errors — which often come through as long JSON strings
// like `{"error":{"code":503,"message":"...","status":"UNAVAILABLE"}}` —
// into short, human-readable messages. Keeping the model's context clean
// prevents the agent from echoing the raw JSON back to the user and lets it
// offer a useful retry suggestion instead.
function normalizeGenerateError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Audio generation failed for an unknown reason.");
  }

  const raw = error.message ?? "";
  let status: string | undefined;
  let code: number | undefined;
  let message: string | undefined;

  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { status?: string; code?: number; message?: string };
      };
      status = parsed.error?.status;
      code = parsed.error?.code;
      message = parsed.error?.message;
    } catch {
      /* fall through */
    }
  }

  if (status === "UNAVAILABLE" || code === 503) {
    return new Error(
      "Lyria is overloaded right now (high demand). Wait ~30s and try again.",
    );
  }
  if (status === "RESOURCE_EXHAUSTED" || code === 429) {
    return new Error(
      "Lyria quota exhausted — you've hit the per-minute rate limit or run out of credits.",
    );
  }
  if (status === "PERMISSION_DENIED" || code === 403) {
    return new Error(
      "Gemini rejected the API key (403). Check VITE_GEMINI_API_KEY in .env.local.",
    );
  }
  if (status === "INVALID_ARGUMENT" || code === 400) {
    return new Error(
      `Lyria rejected the prompt${message ? `: ${message}` : ""}. Try rephrasing.`,
    );
  }
  return new Error(message || raw || "Audio generation failed.");
}

export async function generateMusicClip(prompt: string, opts: GenerateOptions = {}): Promise<GeminiMusicResult> {
  const ai = getClient();
  const structured = buildStructuredPrompt(prompt, opts);

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: structured,
    });
  } catch (error) {
    throw normalizeGenerateError(error);
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const audioPart = parts.find((part) => part.inlineData?.data);

  if (!audioPart?.inlineData?.data) {
    const blockReason = response.promptFeedback?.blockReason;
    const detail = blockReason ? ` (blocked: ${blockReason})` : "";
    throw new Error(`Gemini did not return audio for this prompt${detail}. Try rephrasing.`);
  }

  const sourceMime = audioPart.inlineData.mimeType ?? "audio/mpeg";
  const bytes = base64ToBytes(audioPart.inlineData.data);
  const sourceBytes = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  sourceBytes.set(bytes);

  const textPart = parts.find((part) => typeof part.text === "string" && part.text.trim().length > 0);
  const commentary = textPart?.text?.trim() ?? null;

  const targetSeconds =
    opts.bars && opts.bpm ? (opts.bars * 60 * 4) / opts.bpm : undefined;

  // Decode the raw Lyria bytes once, then ALWAYS re-encode to PCM WAV before
  // handing the URL back to the app. Previously we only re-encoded when
  // trimming was needed and otherwise kept the raw MP3 blob — but Chrome's
  // `decodeAudioData` is flaky on partial MP3 streams served from blob URLs,
  // which meant the timeline's clip-buffer pipeline would fail to decode the
  // track and the clip would sit on the lane as an empty rectangle even
  // though the tool reported success. Re-encoding to WAV guarantees the
  // downstream decode will work.
  //
  // If decode fails here, the bytes are unusable — throwing is the right
  // call so the tool returns ok:false and the agent can narrate accurately
  // instead of confidently claiming it dropped a clip that silently failed.
  let decoded: AudioBuffer;
  try {
    const ctx = getGlobalAudioContext();
    const decodeBuffer = new ArrayBuffer(sourceBytes.byteLength);
    new Uint8Array(decodeBuffer).set(sourceBytes);
    decoded = await ctx.decodeAudioData(decodeBuffer);
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : "";
    throw new Error(
      `Lyria returned audio that the browser couldn't decode${detail}. This usually clears on retry.`,
    );
  }

  const silenceFrames = detectLeadingSilenceFrames(decoded);
  const trimmedDuration = decoded.duration - silenceFrames / decoded.sampleRate;
  const usable = targetSeconds ? Math.min(targetSeconds, trimmedDuration) : trimmedDuration;
  const { blob: wavBlob, mimeType: wavMime } = encodeBufferToWav(decoded, usable, silenceFrames);

  return {
    blob: wavBlob,
    mimeType: wavMime,
    duration: usable,
    trackName: opts.trackName ?? "AI Clip",
    commentary,
    targetSeconds,
    model: MODEL_ID,
  };
}
