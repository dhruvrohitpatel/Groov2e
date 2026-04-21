export interface DemoPrompt {
  label: string;
  prompt: string;
  group: "generate" | "edit" | "arrange" | "transport";
}

// Curated demo prompts that showcase the full agent surface — music
// generation with bar counts, surgical track edits, and mixer moves. Keep this
// list tight (~8 prompts) so the Genie panel never feels crowded.
export const demoPrompts: DemoPrompt[] = [
  {
    label: "Drums: punchy 4 bars",
    prompt:
      "Generate a punchy 4-bar drum loop — tight 808 kick, crispy snare, closed hats — and drop it on the drums track at the playhead.",
    group: "generate",
  },
  {
    label: "Bass: dub, 8 bars",
    prompt:
      "Add a dub-style sub bassline, 8 bars, in the project's key. Create a new track called 'Sub Bass' if needed and place it from bar 1.",
    group: "generate",
  },
  {
    label: "Split vocals at bar 4",
    prompt:
      "Split the vocal track at bar 4 so I can swap takes there.",
    group: "edit",
  },
  {
    label: "Duck the keys -3 dB",
    prompt:
      "Turn down the keys track by 3 dB and pan it 15% to the left — it's fighting the lead.",
    group: "edit",
  },
  {
    label: "Build drop at bar 16",
    prompt:
      "At bar 16 generate a 2-bar riser crescendo on a new 'FX' track, then start playback from bar 14 so I can audition it.",
    group: "arrange",
  },
  {
    label: "Mute everything but drums",
    prompt:
      "Solo the drums for me so I can focus on the rhythm section.",
    group: "edit",
  },
  {
    label: "120 BPM, metronome on",
    prompt:
      "Set the tempo to 120 BPM, turn the metronome on, and put the cursor at bar 1.",
    group: "transport",
  },
  {
    label: "Guitar solo, 8 bars",
    prompt:
      "Generate an 8-bar bluesy guitar solo in the current key. Put it on a new track named 'Solo' and start it four bars before the end.",
    group: "generate",
  },
];
