# Groov2e — an agentic DAW

> A browser-based Digital Audio Workstation where the AI is a bandmate, not a chatbot — it writes tracks into your project using Gemini and edits them through a typed tool layer.

![status](https://img.shields.io/badge/status-prototype-B3261E?style=flat-square) ![stack](https://img.shields.io/badge/stack-React_18_·_Vite_·_TypeScript_·_Zustand-281C12?style=flat-square) ![ai](https://img.shields.io/badge/AI-Gemini_2.5_·_Lyria_3-2340E8?style=flat-square) ![license](https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square)

---

## Quick start

```bash
git clone https://github.com/dhruvpatel/groov2e
cd groov2e
pnpm install
cp .env.example .env.local
# open .env.local and paste your Gemini key
pnpm dev
```

Open **http://localhost:5173** and hit the lamp icon in the bottom bar to summon the Genie.

### What you'll need

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) · macOS: `brew install node` |
| pnpm | ≥ 9 | `corepack enable && corepack prepare pnpm@latest --activate` |
| Gemini API key | — | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free tier works) |

### What works without an API key

The full DAW runs locally with no key — record, arrange, mix, drag-and-drop audio, keyboard shortcuts, projects autosave. The Genie panel shows a "not configured" state and the generation tool returns a friendly error. Everything else is independent.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_GEMINI_API_KEY` | *(required for AI)* | Your Google AI Studio key |
| `VITE_GEMINI_CHAT_MODEL` | `gemini-2.5-flash` | Agent model. Use `gemini-2.5-pro` for richer edits. |
| `VITE_GEMINI_MUSIC_MODEL` | `lyria-3-clip-preview` | Generative audio. `lyria-3-pro-preview` for longer clips. |

---

## What this is

Groov2e is a working multi-track audio editor — timeline, clips, cursor, recording, mixer with VU meters, master analyser, metronome, keyboard shortcuts, drag-and-drop import, persistent project state — plus an in-DAW AI collaborator ("the Genie") that drives the project through **27 typed tools** instead of describing what it would do.

Ask it to *"generate a punchy 4-bar drum loop and drop it at bar 1"* and it will:

1. Call Google's Lyria-3 model to synthesise the audio.
2. Trim it to bar-accurate length against the project BPM.
3. Create a track if needed, drop the clip at the right bar, and push an undo snapshot so you can bail with one click.

## Try these prompts

- `Generate a punchy 4-bar drum loop — tight 808 kick, crispy snare, closed hats — and drop it on the drums track at the playhead.`
- `Add a dub-style sub bassline, 8 bars, in the project's key. Create a new track called 'Sub Bass' if needed and place it from bar 1.`
- `At bar 16 generate a 2-bar riser crescendo on a new 'FX' track, then start playback from bar 14 so I can audition it.`
- `Turn down the keys track by 3 dB and pan it 15% to the left — it's fighting the lead.`
- `Set the tempo to 120 BPM, turn the metronome on, and put the cursor at bar 1.`

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `S` | Split selected clip at playhead |
| `Backspace` / `Delete` | Delete selected clip |
| Lamp icon | Open Genie panel |
| Tweaks button | Appearance + panels settings |

---

## Security model

`VITE_GEMINI_API_KEY` is embedded in the **client JavaScript bundle** — it is visible to anyone who inspects the page source. This is fine for local development and personal use.

**Never deploy a build with a personal or high-quota key.** For any Internet-facing deployment, use a server-side proxy that holds the key and exposes rate-limited endpoints to the front end. See [FAQ §12](./FAQ.md#12-what-are-the-big-limitations-i-should-be-honest-about) for the full limitations story.

---

## Architecture at a glance

```
src/
├── App.tsx                    global keyboard map, drop import, persistence bootstrap
├── components/                UI: timeline, lane, genie, mixer, transport, phone, menubar
├── controllers/               imperative facades over the Zustand store
│   ├── agentController.ts
│   ├── projectController.ts
│   ├── recordingController.ts
│   ├── trackController.ts
│   └── transportController.ts
├── features/
│   ├── agent/
│   │   ├── services/          agentRouter.ts (Gemini tool loop), geminiAudioService.ts (Lyria + WAV trim)
│   │   ├── tools/             agentTools.ts (27 tools), toolSchemas.ts, toolRouter.ts
│   │   └── demoPrompts.ts
│   ├── audio/services/        audioService, masterAnalyser, metronomeService, recordingService
│   ├── project/services/      projectPersistenceService (localStorage + IndexedDB), audioBlobStore
│   └── timeline/              playlistAdapter, timelineMath, trackMeters
├── store/                     useGroovyStore (project/tracks/clips/transport), useUiStore
└── lib/                       musicalTime, formatters, constants
packages/                      vendored @waveform-playlist/* workspace packages
```

### The agent loop

```
user message
   │
   ▼
contextPreamble(projectSnapshot) ──► Gemini 2.5 Flash (system prompt + 27 function declarations)
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

Highlights:
- **Agentic, not chatty.** 27 Zod-validated tools grouped by `read / project / tracks / clips / generation / transport`. Every destructive tool auto-takes an undo snapshot.
- **Live project snapshot** injected into every prompt so the model can't hallucinate track names.
- **Two AI surfaces.** Gemini 2.5 Flash for reasoning + tool calling; Lyria-3 for generative audio. The WAV re-encoder hard-trims Lyria's output to an exact bar count.

See [`FAQ.md`](./FAQ.md) for a full per-turn trace, the tool taxonomy, and the prompting/safety story.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server on :5173 |
| `pnpm build` | `tsc -b && vite build` → static bundle in `dist/` |
| `pnpm preview` | Serve the built bundle |
| `pnpm typecheck` | Strict type check without emitting |

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). TL;DR: open an issue first, `pnpm typecheck && pnpm build` must be green, one concern per PR.

## License

Licensed under [AGPL-3.0-only](LICENSE). If you run a modified version as a network service, you must publish the modified source under the same license.

The vendored `packages/` directory contains MIT-licensed code from [waveform-playlist](https://github.com/naomiaro/waveform-playlist) — see [`ATTRIBUTION.md`](./ATTRIBUTION.md) for details.
