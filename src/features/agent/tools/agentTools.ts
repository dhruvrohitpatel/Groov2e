import { z } from "zod";
import { useGroovyStore } from "../../../store/useGroovyStore";
import { trackController } from "../../../controllers/trackController";
import { transportController } from "../../../controllers/transportController";
import { metronomeService } from "../../audio/services/metronomeService";
import { generateMusicClip, hasGeminiKey } from "../services/geminiAudioService";
import {
  barToSeconds,
  secondsPerBar,
  secondsToBar,
} from "../../../lib/musicalTime";
import type { Clip, Track } from "../../../types/models";
import { createId } from "../../../lib/id";
import { putBlob, IDB_PREFIX } from "../../project/services/audioBlobStore";
import { getOrCreateUrl } from "../../audio/services/blobUrlRegistry";

// --------------------------------------------------------------------------
// Tool registry for the agent. Every tool is a Zod-validated function that
// returns a uniform { ok, message, data } envelope so the model can chain.
// Tools marked `destructive` push a snapshot before executing so the user
// gets a one-click undo in the Genie footer.
// --------------------------------------------------------------------------

export interface ToolResult<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
}

export type ToolHandler<Args> = (args: Args) => Promise<ToolResult> | ToolResult;

export interface ToolDefinition<Args = unknown> {
  name: string;
  description: string;
  category: "read" | "project" | "tracks" | "clips" | "generation" | "transport";
  destructive?: boolean;
  schema: z.ZodType<Args>;
  handler: ToolHandler<Args>;
}

// ------------------------ helpers ------------------------

function findTrackByName(pattern: string): Track | null {
  const tracks = useGroovyStore.getState().tracks;
  const target = pattern.trim().toLowerCase();
  if (!target) return null;
  return (
    tracks.find((t) => t.name.toLowerCase() === target) ??
    tracks.find((t) => t.name.toLowerCase().includes(target)) ??
    null
  );
}

function getClip(clipId: string): Clip | null {
  return useGroovyStore.getState().clips[clipId] ?? null;
}

function clipAtBarOnTrack(track: Track, bar: number): Clip | null {
  const state = useGroovyStore.getState();
  const seconds = barToSeconds(bar, state.project.bpm);
  for (const clipId of track.clips) {
    const clip = state.clips[clipId];
    if (!clip) continue;
    if (seconds >= clip.startTime && seconds <= clip.startTime + clip.duration) {
      return clip;
    }
  }
  return null;
}

function snapshot(label: string) {
  return useGroovyStore.getState().snapshotForAgent(label);
}

function linearToDb(linear: number): number {
  if (linear <= 0.0001) return -60;
  return 20 * Math.log10(linear);
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

function panPercentToRatio(percent: number): number {
  const clamped = Math.max(-100, Math.min(100, percent));
  return clamped / 100;
}

function projectSummary() {
  const state = useGroovyStore.getState();
  const cursorSeconds = Number.isFinite(state.cursorPosition) ? state.cursorPosition : 0;
  return {
    name: state.project.name,
    bpm: state.project.bpm,
    key: state.project.key,
    cursorBar: Number(secondsToBar(cursorSeconds, state.project.bpm).toFixed(2)),
    cursorSeconds: Number(cursorSeconds.toFixed(2)),
    transportStatus: state.transport.status,
    selectedTrack:
      state.tracks.find((t) => t.id === state.selectedTrackId)?.name ?? null,
    selectedClipId: state.selectedClipId,
    tracks: state.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      clipCount: track.clips.length,
      volumeDb: Number(linearToDb(track.volume ?? 0.8).toFixed(2)),
      panPercent: Number((track.pan * 100).toFixed(1)),
      gainDb: Number((track.gain ?? 0).toFixed(2)),
      muted: track.muted,
      solo: track.solo,
      armed: track.armed,
    })),
  };
}

// ------------------------ read tools ------------------------

const read_getProjectSummary: ToolDefinition<Record<string, never>> = {
  name: "getProjectSummary",
  description:
    "Return the current project name, BPM, key, cursor bar, selected track, and a list of tracks with their clip counts and mixer state.",
  category: "read",
  schema: z.object({}),
  handler: () => ({
    ok: true,
    message: "Project summary fetched.",
    data: projectSummary(),
  }),
};

const read_listTracks: ToolDefinition<Record<string, never>> = {
  name: "listTracks",
  description: "List all tracks in the project by name with clip counts.",
  category: "read",
  schema: z.object({}),
  handler: () => {
    const tracks = useGroovyStore.getState().tracks;
    return {
      ok: true,
      message: `${tracks.length} tracks.`,
      data: tracks.map((t) => ({ id: t.id, name: t.name, clipCount: t.clips.length })),
    };
  },
};

const listClipsSchema = z.object({
  trackName: z.string().optional().describe("Optional track name filter."),
});
const read_listClips: ToolDefinition<z.infer<typeof listClipsSchema>> = {
  name: "listClips",
  description: "List clips, optionally filtered to a single track by name.",
  category: "read",
  schema: listClipsSchema,
  handler: ({ trackName }) => {
    const state = useGroovyStore.getState();
    const { bpm } = state.project;
    const filter = trackName ? findTrackByName(trackName) : null;
    const allClips: Clip[] = filter
      ? filter.clips.map((id) => state.clips[id]).filter((c): c is Clip => Boolean(c))
      : Object.values(state.clips);
    return {
      ok: true,
      message: `${allClips.length} clips.`,
      data: allClips.map((clip) => ({
        id: clip.id,
        name: clip.name,
        trackId: clip.trackId,
        startBar: Number(secondsToBar(clip.startTime, bpm).toFixed(2)),
        durationBars: Number((clip.duration / secondsPerBar(bpm)).toFixed(2)),
        muted: clip.muted,
      })),
    };
  },
};

const findTrackSchema = z.object({
  pattern: z.string().describe("Substring or exact name to match."),
});
const read_findTrackByName: ToolDefinition<z.infer<typeof findTrackSchema>> = {
  name: "findTrackByName",
  description:
    "Locate a track by name. Use this before any mutation tool to confirm the intended target exists.",
  category: "read",
  schema: findTrackSchema,
  handler: ({ pattern }) => {
    const match = findTrackByName(pattern);
    if (!match) return { ok: false, message: `No track matches "${pattern}".` };
    return {
      ok: true,
      message: `Found track "${match.name}".`,
      data: { id: match.id, name: match.name, clipCount: match.clips.length },
    };
  },
};

// ------------------------ project meta ------------------------

const setProjectNameSchema = z.object({ name: z.string().min(1) });
const project_setProjectName: ToolDefinition<z.infer<typeof setProjectNameSchema>> = {
  name: "setProjectName",
  description: "Rename the current project.",
  category: "project",
  schema: setProjectNameSchema,
  handler: ({ name }) => {
    snapshot(`Rename project to "${name}"`);
    useGroovyStore.getState().setProjectName(name);
    return { ok: true, message: `Project renamed to "${name}".` };
  },
};

const setBpmSchema = z.object({ bpm: z.number().min(40).max(220) });
const project_setBpm: ToolDefinition<z.infer<typeof setBpmSchema>> = {
  name: "setBpm",
  description: "Set the project tempo. BPM is clamped to 40-220.",
  category: "project",
  schema: setBpmSchema,
  handler: ({ bpm }) => {
    const prev = useGroovyStore.getState().project.bpm;
    snapshot(`Tempo ${prev} → ${bpm} BPM`);
    useGroovyStore.getState().setBpm(bpm);
    transportController.syncMetronomeToTempoIfPlaying(prev, bpm);
    return { ok: true, message: `Tempo set to ${bpm} BPM.` };
  },
};

const setKeySchema = z.object({
  key: z
    .string()
    .describe("Musical key like 'A minor', 'F# major', 'Cm', or 'Eb maj'."),
});
const project_setKey: ToolDefinition<z.infer<typeof setKeySchema>> = {
  name: "setKey",
  description: "Set the project musical key.",
  category: "project",
  schema: setKeySchema,
  handler: ({ key }) => {
    snapshot(`Key → ${key}`);
    useGroovyStore.getState().setKey(key);
    return { ok: true, message: `Key set to ${key}.` };
  },
};

// ------------------------ tracks ------------------------

const addTrackSchema = z.object({
  name: z.string().min(1),
});
const tracks_addTrack: ToolDefinition<z.infer<typeof addTrackSchema>> = {
  name: "addTrack",
  description: "Create a new empty audio track.",
  category: "tracks",
  schema: addTrackSchema,
  handler: ({ name }) => {
    snapshot(`Add track "${name}"`);
    const id = trackController.addTrack(name);
    return { ok: true, message: `Added track "${name}".`, data: { trackId: id, name } };
  },
};

const renameTrackSchema = z.object({
  trackName: z.string(),
  newName: z.string().min(1),
});
const tracks_renameTrack: ToolDefinition<z.infer<typeof renameTrackSchema>> = {
  name: "renameTrack",
  description: "Rename a track by its current name.",
  category: "tracks",
  schema: renameTrackSchema,
  handler: ({ trackName, newName }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`Rename ${track.name} → ${newName}`);
    trackController.updateTrack(track.id, { name: newName });
    return { ok: true, message: `Renamed "${trackName}" to "${newName}".` };
  },
};

const deleteTrackSchema = z.object({ trackName: z.string() });
const tracks_deleteTrack: ToolDefinition<z.infer<typeof deleteTrackSchema>> = {
  name: "deleteTrack",
  description: "Delete a track and all clips on it.",
  category: "tracks",
  destructive: true,
  schema: deleteTrackSchema,
  handler: ({ trackName }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`Delete track "${track.name}"`);
    trackController.deleteTrack(track.id);
    return { ok: true, message: `Deleted "${track.name}".` };
  },
};

const setTrackVolumeSchema = z.object({
  trackName: z.string(),
  db: z.number().min(-60).max(12),
});
const tracks_setTrackVolumeDb: ToolDefinition<z.infer<typeof setTrackVolumeSchema>> = {
  name: "setTrackVolumeDb",
  description: "Set a track's fader level in dB. Range -60 to +12.",
  category: "tracks",
  schema: setTrackVolumeSchema,
  handler: ({ trackName, db }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    const linear = Math.min(2, Math.max(0, dbToLinear(db)));
    snapshot(`${track.name} vol → ${db.toFixed(1)} dB`);
    trackController.updateTrack(track.id, { volume: linear, vol: linear });
    return { ok: true, message: `${track.name} set to ${db.toFixed(1)} dB.` };
  },
};

const setTrackPanSchema = z.object({
  trackName: z.string(),
  percent: z.number().min(-100).max(100),
});
const tracks_setTrackPan: ToolDefinition<z.infer<typeof setTrackPanSchema>> = {
  name: "setTrackPan",
  description: "Set a track's pan. -100 is hard left, +100 is hard right.",
  category: "tracks",
  schema: setTrackPanSchema,
  handler: ({ trackName, percent }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`${track.name} pan → ${percent}%`);
    trackController.updateTrack(track.id, { pan: panPercentToRatio(percent) });
    return { ok: true, message: `${track.name} panned to ${percent}%.` };
  },
};

const setTrackGainSchema = z.object({
  trackName: z.string(),
  db: z.number().min(-12).max(24),
});
const tracks_setTrackGain: ToolDefinition<z.infer<typeof setTrackGainSchema>> = {
  name: "setTrackGain",
  description: "Set a track's input gain in dB. Stacks on top of the fader.",
  category: "tracks",
  schema: setTrackGainSchema,
  handler: ({ trackName, db }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`${track.name} gain → ${db.toFixed(1)} dB`);
    trackController.updateTrack(track.id, { gain: db });
    return { ok: true, message: `${track.name} gain ${db.toFixed(1)} dB.` };
  },
};

const toggleMuteSchema = z.object({ trackName: z.string() });
const tracks_toggleMute: ToolDefinition<z.infer<typeof toggleMuteSchema>> = {
  name: "toggleMute",
  description: "Toggle mute on a track.",
  category: "tracks",
  schema: toggleMuteSchema,
  handler: ({ trackName }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`${track.name} mute ${track.muted ? "off" : "on"}`);
    trackController.toggleTrackMute(track.id);
    return {
      ok: true,
      message: `${track.name} ${track.muted ? "unmuted" : "muted"}.`,
    };
  },
};

const tracks_toggleSolo: ToolDefinition<z.infer<typeof toggleMuteSchema>> = {
  name: "toggleSolo",
  description: "Toggle solo on a track.",
  category: "tracks",
  schema: toggleMuteSchema,
  handler: ({ trackName }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`${track.name} solo ${track.solo ? "off" : "on"}`);
    trackController.toggleTrackSolo(track.id);
    return {
      ok: true,
      message: `${track.name} solo ${track.solo ? "off" : "on"}.`,
    };
  },
};

const tracks_toggleArm: ToolDefinition<z.infer<typeof toggleMuteSchema>> = {
  name: "toggleArm",
  description: "Arm or unarm a track for recording.",
  category: "tracks",
  schema: toggleMuteSchema,
  handler: ({ trackName }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`${track.name} arm toggle`);
    trackController.toggleTrackArm(track.id);
    return { ok: true, message: `${track.name} arm toggled.` };
  },
};

const duplicateTrackSchema = z.object({
  trackName: z.string(),
  newName: z.string().optional(),
});
const tracks_duplicateTrack: ToolDefinition<z.infer<typeof duplicateTrackSchema>> = {
  name: "duplicateTrack",
  description: "Duplicate a track (including its clips) and optionally rename it.",
  category: "tracks",
  schema: duplicateTrackSchema,
  handler: ({ trackName, newName }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    snapshot(`Duplicate ${track.name}`);
    const newId = trackController.duplicateTrack(track.id);
    if (!newId) return { ok: false, message: `Could not duplicate "${trackName}".` };
    if (newName) {
      trackController.updateTrack(newId, { name: newName });
    }
    return {
      ok: true,
      message: `Duplicated "${track.name}"${newName ? ` as "${newName}"` : ""}.`,
      data: { trackId: newId },
    };
  },
};

// ------------------------ clips ------------------------

const splitAtBarSchema = z.object({
  trackName: z.string(),
  bar: z.number().min(1),
});
const clips_splitTrackAtBar: ToolDefinition<z.infer<typeof splitAtBarSchema>> = {
  name: "splitTrackAtBar",
  description:
    "Split whatever clip is currently under the given bar position on the named track.",
  category: "clips",
  schema: splitAtBarSchema,
  handler: ({ trackName, bar }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    const clip = clipAtBarOnTrack(track, bar);
    if (!clip) {
      return {
        ok: false,
        message: `Bar ${bar} on "${track.name}" has no clip to split.`,
      };
    }
    snapshot(`Split ${track.name} at bar ${bar}`);
    const state = useGroovyStore.getState();
    state.selectClip(clip.id);
    state.setCursorPosition(barToSeconds(bar, state.project.bpm));
    state.splitSelectedClipAtCursor();
    return { ok: true, message: `Split "${track.name}" at bar ${bar}.` };
  },
};

const deleteClipSchema = z.object({
  trackName: z.string(),
  bar: z.number().min(1),
});
const clips_deleteClip: ToolDefinition<z.infer<typeof deleteClipSchema>> = {
  name: "deleteClip",
  description: "Delete the clip at the given bar on the named track.",
  category: "clips",
  destructive: true,
  schema: deleteClipSchema,
  handler: ({ trackName, bar }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    const clip = clipAtBarOnTrack(track, bar);
    if (!clip) {
      return { ok: false, message: `No clip at bar ${bar} on "${track.name}".` };
    }
    snapshot(`Delete clip "${clip.name}"`);
    trackController.deleteClip(clip.id);
    return { ok: true, message: `Deleted "${clip.name}".` };
  },
};

const moveClipSchema = z.object({
  trackName: z.string(),
  bar: z.number().min(1).describe("Bar where the clip currently lives."),
  toBar: z.number().min(1).describe("Target bar."),
});
const clips_moveClip: ToolDefinition<z.infer<typeof moveClipSchema>> = {
  name: "moveClip",
  description: "Move a clip located at `bar` on `trackName` to `toBar`.",
  category: "clips",
  schema: moveClipSchema,
  handler: ({ trackName, bar, toBar }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    const clip = clipAtBarOnTrack(track, bar);
    if (!clip) return { ok: false, message: `No clip at bar ${bar}.` };
    snapshot(`Move "${clip.name}" → bar ${toBar}`);
    const bpm = useGroovyStore.getState().project.bpm;
    const targetStart = barToSeconds(toBar, bpm);
    const delta = targetStart - clip.startTime;
    trackController.moveClipByDelta(clip.id, delta);
    return { ok: true, message: `Moved "${clip.name}" to bar ${toBar}.` };
  },
};

const trimClipSchema = z.object({
  trackName: z.string(),
  bar: z.number().min(1),
  startBar: z.number().optional(),
  endBar: z.number().optional(),
});
const clips_trimClip: ToolDefinition<z.infer<typeof trimClipSchema>> = {
  name: "trimClip",
  description: "Trim a clip to new start/end bars. Either bound may be omitted.",
  category: "clips",
  schema: trimClipSchema,
  handler: ({ trackName, bar, startBar, endBar }) => {
    const track = findTrackByName(trackName);
    if (!track) return { ok: false, message: `No track "${trackName}".` };
    const clip = clipAtBarOnTrack(track, bar);
    if (!clip) return { ok: false, message: `No clip at bar ${bar}.` };
    const state = useGroovyStore.getState();
    const bpm = state.project.bpm;
    const nextStart = startBar != null ? barToSeconds(startBar, bpm) : clip.startTime;
    const nextEnd =
      endBar != null ? barToSeconds(endBar, bpm) : clip.startTime + clip.duration;
    if (nextEnd <= nextStart) {
      return { ok: false, message: "Trim result has no length." };
    }
    snapshot(`Trim "${clip.name}"`);
    const offsetDelta = nextStart - clip.startTime;
    const updated: Clip = {
      ...clip,
      startTime: nextStart,
      duration: nextEnd - nextStart,
      sourceOffset: clip.sourceOffset + Math.max(0, offsetDelta),
    };
    useGroovyStore.setState((s) => ({
      clips: { ...s.clips, [clip.id]: updated },
    }));
    return {
      ok: true,
      message: `Trimmed "${clip.name}" to bars ${startBar ?? "?"}-${endBar ?? "?"}.`,
    };
  },
};

// ------------------------ generation ------------------------

const generateAndInsertSchema = z.object({
  trackName: z
    .string()
    .describe("Target track. Created automatically if createTrackIfMissing is true."),
  startBar: z.number().min(1),
  bars: z.number().min(1).max(32).describe("Exact length of the clip in bars."),
  prompt: z.string().min(4).describe("Description of the musical idea."),
  instrument: z
    .string()
    .optional()
    .describe("Single-instrument focus: e.g. 'drum kit', 'sub bass', 'acoustic guitar'. Forces isolation."),
  styleHints: z
    .string()
    .optional()
    .describe("Extra mood / style / era hints."),
  negativePrompt: z.string().optional(),
  createTrackIfMissing: z.boolean().optional().default(true),
});
const generation_generateAndInsertClip: ToolDefinition<
  z.infer<typeof generateAndInsertSchema>
> = {
  name: "generateAndInsertClip",
  description:
    "Generate a new audio clip via Gemini Lyria and insert it at `startBar` on `trackName`. Returns the final clip id + snapped bar position.",
  category: "generation",
  schema: generateAndInsertSchema,
  handler: async ({
    trackName,
    startBar,
    bars,
    prompt,
    instrument,
    styleHints,
    negativePrompt,
    createTrackIfMissing,
  }) => {
    if (!hasGeminiKey()) {
      return {
        ok: false,
        message:
          "VITE_GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      };
    }

    const state = useGroovyStore.getState();
    const { bpm, key } = state.project;
    const targetSeconds = bars * secondsPerBar(bpm);
    const barsText = `${bars} bar${bars === 1 ? "" : "s"}`;

    const style = [
      `Key: ${key}.`,
      styleHints,
      negativePrompt ? `Do not include: ${negativePrompt}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    let result;
    try {
      result = await generateMusicClip(prompt, {
        trackName,
        bars,
        bpm,
        instrument,
        styleHints: style || undefined,
      });
    } catch (error) {
      // Surface Lyria/decoder failures as tool errors so the agent narrates
      // accurately ("Lyria is overloaded, try again in 30s") instead of
      // confidently claiming the clip was inserted.
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Audio generation failed for an unknown reason.",
      };
    }

    // Push the undo snapshot only now — the Lyria call succeeded and we're
    // about to mutate project state. This keeps the undo footer honest when
    // generation fails and nothing actually changed.
    snapshot(`Generate ${barsText} on ${trackName}`);

    let track = findTrackByName(trackName);
    if (!track) {
      if (!createTrackIfMissing) {
        return { ok: false, message: `No track "${trackName}".` };
      }
      const newId = trackController.addTrack(trackName);
      track = useGroovyStore.getState().tracks.find((t) => t.id === newId) ?? null;
      if (!track) {
        return { ok: false, message: "Failed to create track." };
      }
    }

    // Trim to bar-accurate length: use sourceOffset 0 and clamp duration to
    // the requested seconds, never longer than Lyria's actual output.
    const actualSeconds = Math.min(targetSeconds, result.duration);
    const clipId = createId("clip");

    // Persist to IndexedDB so the clip survives a page reload (M5 fix).
    // The registry creates exactly one blob URL per clip for the current session.
    try {
      await putBlob(clipId, result.blob);
    } catch (err) {
      const isQuota = err instanceof DOMException && err.name === "QuotaExceededError";
      return {
        ok: false,
        message: isQuota
          ? "Storage full — delete projects to continue, then try again."
          : "Failed to save audio to local storage.",
      };
    }
    const fileUrl = getOrCreateUrl(clipId, result.blob);

    const nextClip: Clip = {
      id: clipId,
      trackId: track.id,
      fileUrl,
      filePath: `${IDB_PREFIX}${clipId}`,
      sourceKind: "appAsset",
      startTime: barToSeconds(startBar, bpm),
      duration: actualSeconds,
      sourceOffset: 0,
      name: `${trackName} · ${barsText}`,
      muted: false,
    };

    useGroovyStore.setState((s) => ({
      clips: { ...s.clips, [clipId]: nextClip },
      tracks: s.tracks.map((t) =>
        t.id === track!.id ? { ...t, clips: [...t.clips, clipId] } : t,
      ),
      selectedTrackId: track!.id,
      selectedClipId: clipId,
    }));

    return {
      ok: true,
      message: `Generated ${barsText} on ${track.name} at bar ${startBar}.`,
      data: {
        clipId,
        trackName: track.name,
        startBar,
        actualSeconds,
        commentary: result.commentary,
      },
    };
  },
};

// ------------------------ transport ------------------------

const seekToBarSchema = z.object({ bar: z.number().min(1) });
const transport_seekToBar: ToolDefinition<z.infer<typeof seekToBarSchema>> = {
  name: "seekToBar",
  description: "Move the playhead to a specific bar.",
  category: "transport",
  schema: seekToBarSchema,
  handler: ({ bar }) => {
    const { bpm } = useGroovyStore.getState().project;
    transportController.seek(barToSeconds(bar, bpm));
    return { ok: true, message: `Playhead at bar ${bar}.` };
  },
};

const transport_play: ToolDefinition<Record<string, never>> = {
  name: "play",
  description: "Start playback from the cursor.",
  category: "transport",
  schema: z.object({}),
  handler: () => {
    transportController.play();
    return { ok: true, message: "Playing." };
  },
};

const transport_pause: ToolDefinition<Record<string, never>> = {
  name: "pause",
  description: "Pause playback, keeping the cursor.",
  category: "transport",
  schema: z.object({}),
  handler: () => {
    transportController.pause();
    return { ok: true, message: "Paused." };
  },
};

const transport_stop: ToolDefinition<Record<string, never>> = {
  name: "stop",
  description: "Stop playback and return the cursor to zero.",
  category: "transport",
  schema: z.object({}),
  handler: () => {
    transportController.stop();
    return { ok: true, message: "Stopped." };
  },
};

const setMetronomeSchema = z.object({ on: z.boolean() });
const transport_setMetronome: ToolDefinition<z.infer<typeof setMetronomeSchema>> = {
  name: "setMetronome",
  description: "Enable or disable the metronome click.",
  category: "transport",
  schema: setMetronomeSchema,
  handler: ({ on }) => {
    const state = useGroovyStore.getState();
    if (state.transport.metronomeEnabled === on) {
      return { ok: true, message: `Metronome already ${on ? "on" : "off"}.` };
    }
    transportController.toggleMetronome();
    metronomeService.setEnabled(on);
    return { ok: true, message: `Metronome ${on ? "on" : "off"}.` };
  },
};

// ------------------------ registry ------------------------

export const agentTools: ToolDefinition[] = [
  read_getProjectSummary as ToolDefinition,
  read_listTracks as ToolDefinition,
  read_listClips as ToolDefinition,
  read_findTrackByName as ToolDefinition,
  project_setProjectName as ToolDefinition,
  project_setBpm as ToolDefinition,
  project_setKey as ToolDefinition,
  tracks_addTrack as ToolDefinition,
  tracks_renameTrack as ToolDefinition,
  tracks_deleteTrack as ToolDefinition,
  tracks_setTrackVolumeDb as ToolDefinition,
  tracks_setTrackPan as ToolDefinition,
  tracks_setTrackGain as ToolDefinition,
  tracks_toggleMute as ToolDefinition,
  tracks_toggleSolo as ToolDefinition,
  tracks_toggleArm as ToolDefinition,
  tracks_duplicateTrack as ToolDefinition,
  clips_splitTrackAtBar as ToolDefinition,
  clips_deleteClip as ToolDefinition,
  clips_moveClip as ToolDefinition,
  clips_trimClip as ToolDefinition,
  generation_generateAndInsertClip as ToolDefinition,
  transport_seekToBar as ToolDefinition,
  transport_play as ToolDefinition,
  transport_pause as ToolDefinition,
  transport_stop as ToolDefinition,
  transport_setMetronome as ToolDefinition,
];

// Handy map for the router.
export const agentToolsByName = new Map(agentTools.map((t) => [t.name, t]));

// Separate hint for Genie: snapshot the project each turn so the model can
// answer "which tracks exist?" without calling getProjectSummary repeatedly.
export { projectSummary as buildProjectSnapshot };

// Re-export clip helper so the generation tool can be imported from outside.
export { getClip };
