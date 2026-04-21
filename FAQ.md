# Groov2e — FAQ

Everything you'd want to know about how the agent actually works under the hood. If you're presenting this project and get asked a "wait, but how?" question, the answer is in here.

---

## Table of contents

1. [What is "the Agent," really?](#1-what-is-the-agent-really)
2. [Which models power it?](#2-which-models-power-it)
3. [What can the Agent actually do? (tool catalogue)](#3-what-can-the-agent-actually-do-tool-catalogue)
4. [End-to-end: what happens when I ask "generate a 4-bar drum loop at bar 1"?](#4-end-to-end-what-happens-when-i-ask-generate-a-4-bar-drum-loop-at-bar-1)
5. [How does it decide *which* tools to call, and in what order?](#5-how-does-it-decide-which-tools-to-call-and-in-what-order)
6. [How do we stop it from hallucinating track names?](#6-how-do-we-stop-it-from-hallucinating-track-names)
7. [What happens when the Agent messes up? (safety + undo)](#7-what-happens-when-the-agent-messes-up-safety--undo)
8. [Does it remember previous turns?](#8-does-it-remember-previous-turns)
9. [How many tools can it chain per turn, and why?](#9-how-many-tools-can-it-chain-per-turn-and-why)
10. [Where does the audio come from — how does Lyria fit in?](#10-where-does-the-audio-come-from--how-does-lyria-fit-in)
11. [Why does generation return bar-accurate clips?](#11-why-does-generation-return-bar-accurate-clips)
12. [What are the big limitations I should be honest about?](#12-what-are-the-big-limitations-i-should-be-honest-about)
13. [How do I add a new tool?](#13-how-do-i-add-a-new-tool)
14. [Can I run this without the AI?](#14-can-i-run-this-without-the-ai)

---

## 1. What is "the Agent," really?

The Agent — called "the Genie" in the UI — is a thin control plane around Google's **Gemini 2.5** with **function calling** enabled. It is not a chatbot that prints advice. It is an autonomous driver of the Zustand store that runs this DAW.

The contract is:

- **You talk to it in natural language.** "Add a dub bassline 8 bars at bar 1."
- **It talks to the project in typed tool calls.** `generateAndInsertClip({ trackName: "Sub Bass", startBar: 1, bars: 8, prompt: "dub-style sub bassline", instrument: "sub bass" })`.
- **You see the result on the timeline**, plus one-line narration ("laid down a dub sub-bass at bar 1").

The code that implements this lives in three files:

| File | Responsibility |
|---|---|
| [`src/features/agent/services/agentRouter.ts`](./src/features/agent/services/agentRouter.ts) | The loop: chat session, context injection, tool-round dispatch, termination. |
| [`src/features/agent/tools/agentTools.ts`](./src/features/agent/tools/agentTools.ts) | 27 tools defined as `{ name, description, category, schema (Zod), handler }`. |
| [`src/features/agent/tools/toolRouter.ts`](./src/features/agent/tools/toolRouter.ts) | Validates, executes, times, and marks a tool invocation as destructive/snapshotted. |

## 2. Which models power it?

Two, doing different jobs, both from Google:

| Role | Default model | Env override | Why |
|---|---|---|---|
| Chat + tool calling | `gemini-2.5-flash` | `VITE_GEMINI_CHAT_MODEL` | Fast, cheap, strong at structured output. `gemini-2.5-pro` is a drop-in upgrade for multi-step reasoning. |
| Generative audio | `lyria-3-clip-preview` | `VITE_GEMINI_MUSIC_MODEL` | ~30s clips, bar/tempo aware, decoded to a `Float32Array` client-side. `lyria-3-pro-preview` goes longer. |

Both are reached through the `@google/genai` SDK with a single `VITE_GEMINI_API_KEY`. No other providers, no self-hosting.

## 3. What can the Agent actually do? (tool catalogue)

27 tools, grouped by intent. Every tool has a Zod schema, a one-sentence description the model sees, and a handler that returns `{ ok, message, data }`.

| Category | Tools |
|---|---|
| **Read** (safe, info-only) | `getProjectSummary`, `listTracks`, `listClips`, `findTrackByName` |
| **Project** | `setProjectName`, `setBpm`, `setKey` |
| **Tracks** | `addTrack`, `renameTrack`, `deleteTrack`*, `setTrackVolumeDb`, `setTrackPan`, `setTrackGain`, `toggleMute`, `toggleSolo`, `toggleArm`, `duplicateTrack` |
| **Clips** | `splitTrackAtBar`, `deleteClip`*, `moveClip`, `trimClip` |
| **Generation** | `generateAndInsertClip` (hits Lyria, trims, inserts) |
| **Transport** | `seekToBar`, `play`, `pause`, `stop`, `setMetronome` |

\* = marked `destructive: true`, which means an undo snapshot is pushed **before** execution.

Every tool is declared with a Zod schema so the model gets a strongly-typed parameter contract via the Gemini function declaration format. Invalid arguments never reach the handler — they short-circuit with a helpful error message that the model can read and correct on the next round.

## 4. End-to-end: what happens when I ask "generate a 4-bar drum loop at bar 1"?

Here is the full trace, from keystroke to audio on the timeline.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. User types in Genie panel                                               │
│    "Generate a punchy 4-bar drum loop — 808 kick, snare, closed hats — and │
│    drop it on the drums track at the playhead."                            │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 2. agentController.send(userMessage)                                       │
│    - Appends a user ChatMessage to the store                               │
│    - Flips agentRequest.isLoading = true                                   │
│    - Calls runAgentTurn(userMessage, events, history)                      │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 3. agentRouter builds the prompt                                           │
│                                                                            │
│    systemInstruction:                                                      │
│      "You are Groov2e's in-DAW AI collaborator — 'the Agent'. …            │
│       Prefer tool calls over prose. Call getProjectSummary when you need   │
│       context. For music generation, always call generateAndInsertClip     │
│       with an explicit bar count."                                         │
│                                                                            │
│    contextPreamble (rebuilt every turn from live state):                   │
│      • Name: Untitled · BPM: 120 · Key: A min                              │
│      • Cursor: bar 1.00 (0.00s)                                            │
│      • Transport: stopped                                                  │
│      • Tracks: Drums[0 clips], Vocals[0 clips]                             │
│                                                                            │
│    tools: 27 functionDeclarations built from the Zod schemas               │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 4. Round 1 — Gemini returns functionCalls[] (no prose yet)                 │
│                                                                            │
│    [                                                                       │
│      {                                                                     │
│        name: "findTrackByName",                                            │
│        args: { pattern: "drums" }                                          │
│      }                                                                     │
│    ]                                                                       │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 5. toolRouter.executeTool                                                  │
│    - Zod validates args                                                    │
│    - snapshotPushed = false (read tool, not destructive)                   │
│    - handler returns { ok: true, data: { id, name: "Drums", clipCount: 0 }}│
│    - onToolFinish fires → UI lights up "findTrackByName ✓" chip            │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 6. Round 2 — tool response sent back, Gemini picks the next call           │
│                                                                            │
│    [                                                                       │
│      {                                                                     │
│        name: "generateAndInsertClip",                                      │
│        args: {                                                             │
│          trackName: "Drums",                                               │
│          startBar: 1,                                                      │
│          bars: 4,                                                          │
│          prompt: "punchy drum loop — tight 808 kick, crispy snare,         │
│                   closed hats, no melodic content",                        │
│          instrument: "drum kit",                                           │
│          createTrackIfMissing: false                                       │
│        }                                                                   │
│      }                                                                     │
│    ]                                                                       │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 7. The generation handler (destructive = false, but *slow*)                │
│    a. snapshot("Generate 4 bars on Drums") → push undo state               │
│    b. buildStructuredPrompt adds:                                          │
│         "Length: exactly 4 bars (8.0 seconds at 120 BPM).                  │
│          Begin strictly on beat 1; end cleanly on the last beat.           │
│          Instrumentation: drum kit. Do NOT include any other layers.       │
│          Key: A min."                                                      │
│    c. Lyria-3 returns base64 audio (typically ~30s of MP3/OGG)             │
│    d. Decode into the shared AudioContext                                  │
│    e. Trim to 8.0s, re-encode as 16-bit PCM WAV (encodeBufferToWav)        │
│    f. Create an object URL for the blob                                    │
│    g. Build a Clip with startTime = bar 1 → 0s, duration 8.0s              │
│    h. store.setState: add clip + attach to Drums track                     │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 8. Round 3 — Gemini emits final text                                       │
│    "Laid down a 4-bar drum loop on Drums at bar 1."                        │
│                                                                            │
│    - text is appended as an assistant ChatMessage                          │
│    - agentRequest.isLoading = false                                        │
│    - Genie panel shows the run: 2 tool chips + narration                   │
│    - Timeline re-renders, waveform decodes the WAV, clip shows up at bar 1 │
└────────────────────────────────────────────────────────────────────────────┘
```

Total wall time is usually dominated by step 7c (Lyria). The chat/tool rounds themselves are small and fast.

## 5. How does it decide *which* tools to call, and in what order?

The model decides. There is no hand-written router that says "if the user said 'generate,' call X." The decision comes from three inputs:

1. **The system prompt** (`SYSTEM_PROMPT` in `agentRouter.ts`). It encodes the policy: prefer tool calls over prose; call `getProjectSummary`/`listTracks` when context is missing; always pass a bar count to `generateAndInsertClip`; chain up to 8 tools; ask one clarifying question if ambiguous.
2. **The tool descriptions and Zod schemas.** Every tool's `description` field is surfaced to the model. The descriptions are intentionally verb-first and say what the tool is *for*, not how it's implemented — e.g. `"Generate a new audio clip via Gemini Lyria and insert it at startBar on trackName."`. The field names and types in the Zod schemas guide argument construction.
3. **The live project snapshot** injected as `contextPreamble()`. The model sees what tracks exist, the BPM, the cursor position, which track is selected, every turn. This is what makes "at the playhead" resolve to a concrete bar number without a separate tool call.

The pattern that usually emerges from this:

- **Ambiguous input → a read tool first.** The model grounds itself by calling `findTrackByName` or `getProjectSummary` before it tries to mutate.
- **Compound requests → a chain.** "At bar 16 generate a 2-bar riser on a new FX track, then start playback from bar 14" resolves to roughly `generateAndInsertClip` → `seekToBar` → `play`.
- **Surgical input → one call.** "Mute the bass" becomes a single `toggleMute`.

## 6. How do we stop it from hallucinating track names?

Three layers:

1. **Context preamble.** Every turn starts with a ground-truth dump of the project: all track names, BPM, cursor bar. The model doesn't have to guess.
2. **`findTrackByName` before mutation.** The system prompt tells it to. The helper does case-insensitive exact-match, then substring fallback.
3. **Schema-level rejection.** If the model passes a `trackName` that doesn't exist, the handler returns `{ ok: false, message: 'No track "xyz".' }`. That error is shipped back into the next round, so the model self-corrects — usually by calling `listTracks` and retrying with the right name.

## 7. What happens when the Agent messes up? (safety + undo)

Four backstops:

- **Zod schemas** on every tool. The model literally cannot pass a BPM of 9000 — it's clamped at 40–220 before the handler runs. Volume is clamped to −60..+12 dB, pan to −100..+100%, bars to 1..32.
- **Destructive flag.** Any tool that loses data (`deleteTrack`, `deleteClip`) is marked `destructive: true`. The tool router pushes an undo snapshot to `agentUndoStack` before execution.
- **Agent undo footer.** The Genie panel renders a one-click "Undo '<last label>'" footer that pops the last snapshot. See `src/components/genie/AgentUndoFooter.tsx`.
- **Uniform error envelope.** Every handler returns `{ ok, message, data }`. If `ok: false`, the model gets the failure message verbatim as a function response and typically corrects itself on the next round.

## 8. Does it remember previous turns?

Yes — within the session.

`agentController.ts` keeps a `Content[]` history and passes it to each new `runAgentTurn` call. That means a turn 2 prompt like "now turn it down 3 dB" correctly refers to the track you created in turn 1, because that turn is in the model's conversation history.

Across browser reloads: **no**. The chat history is in-memory. The *project* state is persisted to localStorage (`projectPersistenceService.ts`), so the music survives, but the Agent starts fresh.

## 9. How many tools can it chain per turn, and why?

Hard cap of **8 rounds per turn** (`MAX_TOOL_ROUNDS = 8` in `agentRouter.ts`). Each round can emit multiple tool calls in parallel.

Why a cap:

- **Latency budget.** Each round is one network round-trip to Gemini. 8 rounds is the practical upper bound where the user still feels like "pressing enter did something."
- **Runaway protection.** If a buggy tool returns an error that the model keeps re-trying the same way, we want to stop rather than melt the quota.
- **Composability ceiling.** The hardest demo prompts ("build a drop at bar 16") resolve in 3–5 rounds. 8 leaves headroom without being infinite.

## 10. Where does the audio come from — how does Lyria fit in?

`geminiAudioService.generateMusicClip(prompt, opts)` is the single entry point. It:

1. Builds a structured prompt by appending length/tempo/instrumentation qualifiers to the user prompt. This is where the rubber meets the road for quality — we tell Lyria *exactly* "4 bars = 8.0 seconds at 120 BPM, start on beat 1, no melodic content" instead of relying on the model to figure it out from "punchy drum loop."
2. Calls `ai.models.generateContent({ model: MODEL_ID, contents: structured })`.
3. Parses `response.candidates[0].content.parts`, finds the part with `inlineData.data` (base64-encoded audio).
4. Decodes the base64 into a `Uint8Array`.
5. Decodes into an `AudioBuffer` via the shared `AudioContext` from `@waveform-playlist/playout`.
6. Re-encodes to 16-bit PCM WAV, trimmed to the exact target duration.
7. Wraps it in a Blob, creates an object URL, returns `{ audioUrl, mimeType, duration, trackName, commentary, model }`.

## 11. Why does generation return bar-accurate clips?

Lyria generates ~30s of audio even when you ask for 4 bars. It's a generative model — "4 bars at 120 BPM" is a hint, not a hard constraint. If we dropped the raw output onto the timeline, you'd get 30 seconds of audio where bars 5–15 don't align to anything.

So `encodeBufferToWav(buffer, seconds)` (in `geminiAudioService.ts`):

1. Takes the decoded `AudioBuffer`.
2. Computes `frames = Math.round(seconds * sampleRate)` where `seconds = bars * 60 * 4 / bpm`.
3. Interleaves channels, writes a fresh WAV header, encodes 16-bit PCM samples.
4. Returns a clean blob that is **exactly** N bars long.

The clip's `duration` in the store is also set to the bar-accurate target, so moving/splitting/aligning just works.

## 12. What are the big limitations I should be honest about?

- **Latency.** Lyria calls take several seconds. A busy turn ("generate drums, then bass, then riser") can take 20+ seconds because the round-trips serialize.
- **Quality variance.** Lyria does not always match the requested instrumentation. "Only drums" may still ship with a faint pad. Re-running the prompt with more specific negatives often fixes it.
- **Single-tenant key.** The API key is client-side (`VITE_GEMINI_API_KEY`). Fine for a prototype, not OK for production. A server-side proxy is the obvious next step.
- **No traces view.** The ToolExecution objects are computed but only partially rendered. A per-turn "trace" drawer with args, timings, and results would make the agent legible during demos — it's on the list.
- **No multi-agent / planner.** Everything is one model. A heavier task could benefit from a planner that decomposes before calling tools, but 2.5 Flash is good enough that we haven't needed one.
- **No streaming yet.** The router waits for `sendMessage` to resolve. Swapping to `sendMessageStream` is a small lift and would make the UI feel faster.

## 13. How do I add a new tool?

Four steps, all in [`src/features/agent/tools/agentTools.ts`](./src/features/agent/tools/agentTools.ts):

```ts
// 1. Zod schema
const mySchema = z.object({
  trackName: z.string(),
  amount: z.number().min(0).max(10),
});

// 2. Tool definition
const tracks_myTool: ToolDefinition<z.infer<typeof mySchema>> = {
  name: "myTool",
  description: "One verb-first sentence the model will read.",
  category: "tracks",
  destructive: false, // flip true if it deletes/replaces data
  schema: mySchema,
  handler: ({ trackName, amount }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`myTool ${track.name}`); // for undo
    // …mutate the store…
    return { ok: true, message: `Did the thing on ${track.name}.` };
  },
};

// 3. Register it
export const agentTools: ToolDefinition[] = [
  // …
  tracks_myTool as ToolDefinition,
];
```

The Gemini function declaration is built automatically from the Zod schema via `buildGeminiFunctionDeclarations()` in `toolSchemas.ts`, so the model picks it up on the next reload.

## 14. Can I run this without the AI?

Yes. The DAW is functionally independent:

- Click `+` in the track head to add tracks.
- Drag an audio file onto the window to import.
- Arm a track and hit the red dot to record.
- Use the mixer drawer for gain/pan/mute/solo.
- Space plays, S splits, Delete removes.
- Projects autosave to localStorage and reload on refresh.

Without `VITE_GEMINI_API_KEY` set, the Genie panel shows a "not configured" state and the generation tool short-circuits with a friendly error. Everything else is local.

---

*If a question isn't here, the answer probably lives in* [`src/features/agent/services/agentRouter.ts`](./src/features/agent/services/agentRouter.ts) *or* [`src/features/agent/tools/agentTools.ts`](./src/features/agent/tools/agentTools.ts). *Grep for the capability, read the handler — every tool is ~20 lines and does one thing.*
