# Codex Audit — Groov2e
**Done by:** Codex  
**Completed:** Thursday, April 23, 2026, 1:36 PM MST  
**Scope reviewed:** `README.md`, `FAQ.md`, `SECURITY.md`, prior `audits/security-reliability-audit-2026-04-21.md`, main React app, Zustand store, project persistence, transport/count-in UI, timeline adapter, and playout mute/solo path.

## 1. Security Vulnerabilities And Room For Improvement

- The docs are honest that `VITE_GEMINI_API_KEY` ships in the client bundle. That is acceptable for local prototype use, but any deployed version needs a server-side Gemini/Lyria proxy with per-user auth, rate limits, budget caps, and request logging.
- Browser project files now save embedded audio in a JSON `.groovy` bundle. This improves portability, but large projects can create very large files. Add an explicit size warning before save/export once bundle size crosses a threshold such as 100 MB.
- Project bundle loading parses user-provided JSON. It should add schema validation before replacing the store so malformed or hostile bundles cannot create invalid track/clip graphs.
- Track, clip, and project names are sanitized at store/LLM boundaries, which reduces prompt-injection risk. Continue applying the same rule to any future metadata fields that are sent to the agent.
- IndexedDB/localStorage quota failures are surfaced better than before, but project save/load should also report partial audio export failures with a list of affected clips.
- Autosave is convenient, but there is still no version history or recovery UI. A bad edit or corrupted snapshot can overwrite the last good state.

## 2. UX Improvements

- The count-in button was ambiguous because it always read `COUNT / 1`. It now shows `count-in / off`, `count-in / 1 bar`, or an active beat countdown.
- Explicit project save/load existed in the menu, but the browser build was using unavailable Tauri stubs. I added browser `.groovy` bundle save/load so the File menu now does real work in this app.
- The app would benefit from a project status indicator near the project name: unsaved changes, saved timestamp, autosaved, and save failure.
- Import/export should show progress for large audio files. Audio generation, decoding, save bundling, and load hydration can all take long enough to need visible progress.
- Add clearer empty states in the timeline: "drop audio here", "arm a track to record", and "ask the agent to generate a loop" as contextual affordances, not a landing page.
- Clip selection needs a more precise editing affordance. The current selected clip ring helps, but users still need drag handles and a clear selected-region overlay.

## 3. Making The Agent More Conversational

- Move from a text box as the primary surface to a voice-first "jam session" mode: press/hold or tap-to-talk, live transcription, and spoken confirmations for completed edits.
- Let the agent narrate intent before destructive actions: "I can delete the muted bass take. Want me to do that?" Keep low-risk actions immediate.
- Add conversational memory at the project level: preferred genres, naming conventions, common track roles, and "what we tried last time." Store this separately from chat history so reloads keep useful context.
- Make the agent point at the DAW, not just reply in a panel: highlight the target track, flash the inserted clip, preview a suggested region, and show inline accept/retry controls.
- Support quick natural follow-ups: "make that half as long", "try a darker bass", "undo the last thing", "solo what you just made." The tool layer already has enough project context to support this.
- Consider a "conversation lane" tied to the playhead where generated ideas and decisions are anchored to bars instead of chat turns.

## 4. Selecting A Portion Of An Audio Track

Do not implement this as just a visual drag rectangle. Treat it as a first-class timeline range.

- Add store state for `selectionRange`: track id, start time, end time, and optional clip id.
- Support drag-to-select on the waveform body with snap options: off, beat, bar.
- Show trim/split actions against the range: split at range edges, crop to range, delete range, duplicate range, loop range, bounce range, and generate into selected range.
- Make selection work across one clip first, then expand to multi-clip/multi-track ranges.
- Let the agent use it naturally: "replace this section", "extend the selected part", "make the selected vocal quieter", "generate drums for this range."
- Preserve non-destructive editing by storing source offsets and clip boundaries instead of rewriting audio immediately.

## Implementation Notes From This Pass

- Explicit browser project save/load is now implemented through File menu `.groovy` bundles with embedded audio assets.
- The count-in button now communicates its state instead of showing a static `1`.
- The mute/solo bug was in the playout layer: `setMute()` updated the raw track mute directly even while solo masking was active. It now updates manual mute state and reapplies the solo mask.
- Added tests covering mute changes during active solo and restoration of manual mute state after solo is disabled.
