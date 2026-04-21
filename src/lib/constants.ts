import type { MusicalKey } from "../types/models";

export const MUSICAL_KEYS: MusicalKey[] = [
  "C major",
  "G major",
  "D major",
  "A major",
  "E major",
  "F major",
  "A minor",
  "E minor",
  "B minor",
  "D minor",
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
