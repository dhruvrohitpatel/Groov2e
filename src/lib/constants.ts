import type { MusicalKey } from "../types/models";

export const MAX_NAME_LENGTH = 255;
export const MAX_RECORDING_MS = 30 * 60 * 1000; // 30 minutes

/** Strip newlines and control chars from user-supplied name fields.
 *  Applied at store boundaries (M4) and again at the LLM context boundary (H2). */
export function sanitizeName(raw: string): string {
  return raw.replace(/[\r\n\t\x00-\x1f]/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

// Chromatic pitch class list, using sharps. Spellings match what downstream
// prompts (Lyria, Gemini chat preamble) expect and what the MusicalKey type
// alias allows — MusicalKey is a free-form string.
const PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const MUSICAL_KEYS: MusicalKey[] = [
  ...PITCHES.map((p) => `${p} major` as MusicalKey),
  ...PITCHES.map((p) => `${p} minor` as MusicalKey),
];

export const INPUT_SOURCES = [
  "No input",
  "Built-in mic",
  "MBP mic",
  "Scarlett 2i2 · In 1",
  "Scarlett 2i2 · In 2",
  "Scarlett 2i2 · Stereo (1+2)",
  "Audient EVO 4 · In 1",
  "Audient EVO 4 · In 2",
  "BlackHole 2ch (loopback)",
];

export const OUTPUT_SOURCES = [
  "Master",
  "Bus 1 · Drums",
  "Bus 2 · Reverb send",
  "Bus 3 · Parallel comp",
  "Headphones cue",
];

export const MASTER_OUTPUTS = [
  "Built-in output",
  "MacBook Pro Speakers",
  "Scarlett 2i2 · Out 1+2",
  "AirPods Pro",
  "BlackHole 2ch",
];
