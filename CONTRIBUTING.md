# Contributing to Groov2e

Thanks for wanting to contribute. This doc covers everything from first run to opening a PR.

---

## Quick setup

```bash
git clone https://github.com/dhruvpatel/groov2e   # swap for your fork
cd groov2e
pnpm install          # resolves all @waveform-playlist/* from packages/
cp .env.example .env.local
# Paste a Gemini key from https://aistudio.google.com/apikey
pnpm dev              # → http://localhost:5173
```

Node ≥ 20 and pnpm ≥ 9 are required. Install them with:

```bash
# macOS (Homebrew)
brew install node
corepack enable && corepack prepare pnpm@latest --activate

# Windows / Linux
# Install Node from https://nodejs.org, then:
corepack enable
```

---

## Before you push

```bash
pnpm typecheck   # must pass with zero errors
pnpm build       # must complete successfully
```

CI runs both on every push and PR. A failing check blocks merge.

---

## Project layout

```
src/
├── components/          UI components (timeline, mixer, genie panel, transport)
├── controllers/         Imperative facades — call these from the UI, not the store directly
├── features/
│   ├── agent/           Gemini loop, 27 tools, Lyria audio service
│   ├── audio/           AudioContext, recording, metronome, master analyser
│   ├── project/         localStorage/IndexedDB persistence, blob store
│   └── timeline/        waveform-playlist adapter, track meters
├── store/               Zustand stores (useGroovyStore, useUiStore)
└── lib/                 Constants, formatters, musical-time helpers
packages/                Vendored @waveform-playlist/* workspace packages
```

See [`README.md`](README.md) for a deeper architecture walkthrough and the agent-loop diagram.

---

## Contribution guidelines

- **Open an issue first** for anything non-trivial — a quick alignment saves time.
- **One concern per PR.** Mixing a bug fix with a refactor makes review harder.
- **CI must be green.** Typecheck and build must pass.
- **Follow existing patterns.** New agent tools go in `agentTools.ts` (see FAQ §13 for the 4-step recipe). New UI state goes in `useUiStore`.
- **No comments explaining *what* the code does.** Only comment *why* when it's non-obvious.

### Branch + merge flow

```
feature/your-branch → main
```

- Squash merge preferred for small changes; merge commit for large features.
- PR title should be imperative, ≤ 70 chars: `Add stream-loss detection to recording service`.

### Good first issues

Browse [`good first issue`](https://github.com/dhruvpatel/groov2e/issues?q=is%3Aopen+label%3A%22good+first+issue%22) labels for a curated list of well-scoped tasks.

---

## Code of Conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
