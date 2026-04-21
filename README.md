# Groov2e — an agentic DAW

> Jam with the Agent. A browser-based Digital Audio Workstation where the AI is a bandmate, not a chatbot — it can write tracks into your project with Gemini Lyria and edit them through a typed tool layer.

![status](https://img.shields.io/badge/status-prototype-B3261E?style=flat-square) ![stack](https://img.shields.io/badge/stack-React_18_·_Vite_·_TypeScript_·_Zustand-281C12?style=flat-square) ![ai](https://img.shields.io/badge/AI-Gemini_2.5_·_Lyria_3-2340E8?style=flat-square)

---

## What this is

Groov2e is a working multi-track audio editor in the browser — timeline, clips, cursor, recording, mixer with VU meters, master analyser, metronome, keyboard shortcuts, drag-and-drop import, persistent project state — plus an in-DAW AI collaborator ("the Genie") that drives the project through **27 typed tools** instead of describing what it would do.

Ask it to "generate a punchy 4-bar drum loop and drop it at bar 1" and it will:

1. Call Google's Lyria-3 model to synthesize the audio.
2. Trim it to bar-accurate length against the project BPM.
3. Create a track if needed, drop the clip at the right bar, and push an undo snapshot so you can bail with one click.

## Highlights

- **Agentic, not chatty.** The Gemini router in `src/features/agent/services/agentRouter.ts` runs a multi-round function-calling loop (up to 8 tool calls per turn), injects a live project snapshot into every prompt so the model can't hallucinate track names, and is instructed to prefer tool calls over prose.
- **27 Zod-validated tools** grouped by `read` / `project` / `tracks` / `clips` / `generation` / `transport` in `src/features/agent/tools/agentTools.ts`. Every destructive tool auto-takes an undo snapshot.
- **Real audio pipeline.** Built on a linked `@waveform-playlist/*` workspace (engine, playout, recording, worklets, loaders) with a master analyser and per-track meters.
- **Two AI surfaces in one agent.** Gemini 2.5 Flash for reasoning + tool calling, Lyria-3 for generative audio. The WAV re-encoder in `geminiAudioService.ts` hard-trims Lyria's output to an exact bar count.
- **Crafted UI.** Instrument Serif + Inter Tight + JetBrains Mono, warm/dark themes, density modes, paper-grain overlay, a faux "paired phone" remote controller, and animated Genie transitions.

## Try these prompts

The Genie ships with a curated demo set (`src/features/agent/demoPrompts.ts`):

- `Generate a punchy 4-bar drum loop — tight 808 kick, crispy snare, closed hats — and drop it on the drums track at the playhead.`
- `Add a dub-style sub bassline, 8 bars, in the project's key. Create a new track called 'Sub Bass' if needed and place it from bar 1.`
- `At bar 16 generate a 2-bar riser crescendo on a new 'FX' track, then start playback from bar 14 so I can audition it.`
- `Turn down the keys track by 3 dB and pan it 15% to the left — it's fighting the lead.`
- `Set the tempo to 120 BPM, turn the metronome on, and put the cursor at bar 1.`

> Want to know **how the agent actually decides what to do**? See [`FAQ.md`](./FAQ.md) for a per-turn trace, the tool taxonomy, and the prompting/safety story.

## Architecture at a glance

```
src/
├── App.tsx                    global keyboard map, drop import, persistence bootstrap
├── components/                UI: timeline, lane, genie, mixer, transport, phone, menubar, tweaks
├── controllers/               imperative facades over the Zustand store
│   ├── agentController.ts
│   ├── projectController.ts
│   ├── recordingController.ts
│   ├── trackController.ts
│   └── transportController.ts
├── features/
│   ├── agent/
│   │   ├── services/          agentRouter.ts (Gemini tool loop), geminiAudioService.ts (Lyria + WAV trim), mockAgentService.ts
│   │   ├── tools/             agentTools.ts (27 tools), toolSchemas.ts, toolRouter.ts
│   │   └── demoPrompts.ts
│   ├── audio/services/        audioService, masterAnalyser, metronomeService, recordingService
│   ├── timeline/              playlistAdapter, timelineMath, trackMeters, useDecodedClipBuffers
│   └── project/services/      projectPersistenceService (localStorage) + tauriPersistenceService
├── store/                     useGroovyStore (project/tracks/clips/transport), useUiStore (tweaks/panels)
├── lib/                       musicalTime, formatters, id, constants, mockProject
└── themes.ts                  warm + dark palettes
```

### The agent loop

```
user message
   │
   ▼
contextPreamble(projectSnapshot) ──► Gemini 2.5 Flash (system prompt + function declarations)
   │                                        │
   │                                        ▼
   │                                functionCalls[]?
   │                                        │
   │                            yes ◄───────┴───────► no  ──► final text back to UI
   │                            │
   │                            ▼
   │        for each call: Zod validate → snapshot if destructive → run → envelope result
   │                            │
   └──────── tool responses ────┘   (max 8 rounds, capped)
```

## Getting started

### Prerequisites

- **Node** ≥ 20
- **pnpm** ≥ 9
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- A local checkout of [waveform-playlist](https://github.com/naomiaro/waveform-playlist)'s monorepo at `../Waveform Test/waveform-playlist` (see note below)

### Install

```bash
pnpm install
cp .env.example .env.local
# then paste your Gemini key into VITE_GEMINI_API_KEY
pnpm dev
```

Open http://localhost:5173 and hit the lamp in the bottom bar to summon the Genie.

### Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_GEMINI_API_KEY` | (required for AI) | Google AI Studio key |
| `VITE_GEMINI_CHAT_MODEL` | `gemini-2.5-flash` | Agent / tool-calling model. Use `gemini-2.5-pro` for richer multi-step edits. |
| `VITE_GEMINI_MUSIC_MODEL` | `lyria-3-clip-preview` | Generative audio model. `lyria-3-pro-preview` for full-length clips. |

> Without a key the core DAW still runs (record, arrange, mix). The Genie just surfaces a "not configured" state and the generation tool short-circuits with a friendly error.

### Note on the waveform-playlist dependency

`package.json` currently links the `@waveform-playlist/*` packages from a sibling folder (`../Waveform Test/waveform-playlist/packages/*`). If you don't have that checkout, `pnpm install` will fail on those links. Options:

1. Clone the workspace to that path, or
2. Rewrite the `link:` entries to point at your local path, or
3. Run `pnpm build` once and serve `dist/` — the build artifact in `dist/` is self-contained.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server on :5173 |
| `pnpm build` | `tsc -b && vite build` → static bundle in `dist/` |
| `pnpm preview` | Serve the built bundle |
| `pnpm typecheck` | Strict type check without emitting |

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `S` | Split selected clip at playhead |
| `Backspace` / `Delete` | Delete selected clip |
| `Tweaks` button | Open appearance + panels panel |
| Menubar | Standard DAW commands (see `src/components/menubar/commands.ts`) |

## Roadmap / known limitations

- **Install story** — the linked waveform-playlist deps make a zero-context clone brittle. Vendoring or publishing them is next.
- **Offline demo mode** — `mockAgentService.ts` already exists; a UI toggle to fall back when Wi-Fi or Lyria is flaky is planned.
- **Trace viewer** — expose the tool execution log in-app so you can scrub through an agent turn after the fact.
- **Tauri build** — `tauriPersistenceService.ts` is stubbed for a desktop shell.

## License

Prototype — no license granted yet. Ask before using commercially.
