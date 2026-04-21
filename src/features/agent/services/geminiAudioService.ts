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
  audioUrl: string;
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

// Slices a decoded AudioBuffer to the target duration and re-encodes to a
// 16-bit PCM WAV so downstream `decodeAudioData` can load it anywhere.
function encodeBufferToWav(buffer: AudioBuffer, seconds: number): { blob: Blob; mimeType: string } {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const frames = Math.min(buffer.length, Math.round(seconds * sampleRate));
  const interleaved = new Float32Array(frames * channels);
  for (let c = 0; c < channels; c += 1) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < frames; i += 1) {
      interleaved[i * channels + c] = ch[i];
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

export async function generateMusicClip(prompt: string, opts: GenerateOptions = {}): Promise<GeminiMusicResult> {
  const ai = getClient();
  const structured = buildStructuredPrompt(prompt, opts);

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: structured,
  });

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

  // Try to decode and trim for bar-accurate output. If decoding fails we fall
  // back to the raw blob — some browsers reject partial MP3 streams in
  // decodeAudioData but will still play them via <audio>.
  let finalBlob: Blob = new Blob([sourceBytes.buffer], { type: sourceMime });
  let finalMime = sourceMime;
  let duration = 30;
  try {
    const ctx = getGlobalAudioContext();
    const decodeBuffer = new ArrayBuffer(sourceBytes.byteLength);
    new Uint8Array(decodeBuffer).set(sourceBytes);
    const decoded = await ctx.decodeAudioData(decodeBuffer);
    const usable = targetSeconds ? Math.min(targetSeconds, decoded.duration) : decoded.duration;

    if (targetSeconds && Math.abs(usable - decoded.duration) > 0.05) {
      const wav = encodeBufferToWav(decoded, usable);
      finalBlob = wav.blob;
      finalMime = wav.mimeType;
      duration = usable;
    } else {
      duration = decoded.duration;
    }
  } catch {
    duration = targetSeconds ?? 30;
  }

  const audioUrl = URL.createObjectURL(finalBlob);

  return {
    audioUrl,
    mimeType: finalMime,
    duration,
    trackName: opts.trackName ?? "AI Clip",
    commentary,
    targetSeconds,
    model: MODEL_ID,
  };
}
