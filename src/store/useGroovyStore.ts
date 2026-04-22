import { create } from "zustand";
import type { ClipTrack } from "@waveform-playlist/core";
import type { AgentMessage, AgentRequestPayload, AgentResponse } from "../types/agent";
import type {
  AudioDeviceOption,
  Clip,
  DeviceState,
  ProjectFileState,
  TakeGroup,
  TimelineViewState,
  Track,
  TransportState,
} from "../types/models";
import { getTimelineZoomPxPerSecond } from "../features/timeline/lib/timelineMath";
import { createId } from "../lib/id";
import { createInitialGroovyState } from "../lib/mockProject";
import type { PersistedClipLoadResult } from "../features/project/types";
import type { AgentSnapshot, GroovyStoreStatePublic } from "./stateTypes";

const AGENT_UNDO_STACK_LIMIT = 20;

// This store is the source of truth for the prototype.
// UI components, the agent flow, and the timeline adapter all coordinate through
// this state instead of mutating waveform-playlist directly.
// Future recording insertion and split-at-cursor behavior should be added here first.
interface GroovyStoreState extends GroovyStoreStatePublic {}

interface GroovyStoreActions {
  setBpm: (bpm: number) => void;
  setKey: (key: GroovyStoreState["project"]["key"]) => void;
  setTransportStatus: (status: TransportState["status"]) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  setCursorPosition: (cursorPosition: number) => void;
  setTimelineScrollLeft: (scrollLeft: number) => void;
  setTimelineVisibleDuration: (visibleDuration: number) => void;
  setTimelineZoomPxPerSecond: (zoomPxPerSecond: number) => void;
  selectTrack: (trackId: string | null) => void;
  selectClip: (clipId: string | null) => void;
  addTrack: (name?: string) => string;
  duplicateTrack: (trackId: string) => string | null;
  deleteTrack: (trackId: string) => void;
  deleteSelectedTrack: () => void;
  updateTrack: (trackId: string, patch: Partial<Track>) => void;
  toggleTrackArm: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleClipMute: (clipId: string) => void;
  activateTake: (clipId: string) => void;
  applyWaveformTracksChange: (nextTracks: ClipTrack[]) => void;
  moveClipByDelta: (clipId: string, deltaTime: number) => void;
  splitSelectedClipAtCursor: () => void;
  deleteClip: (clipId: string) => void;
  setProjectName: (name: string) => void;
  appendChatMessage: (message: AgentMessage) => void;
  setAgentLoading: (isLoading: boolean) => void;
  setAgentPayload: (payload: AgentRequestPayload | null) => void;
  insertGeneratedClip: (response: AgentResponse) => void;
  insertAttachmentClip: (messageId: string) => void;
  replaceAttachment: (messageId: string, attachment: AgentMessage["attachment"]) => void;
  importAudioAsset: (input: {
    fileUrl: string;
    filePath?: string | null;
    name: string;
    duration: number;
    trackId?: string | null;
  }) => void;
  setAvailableDevices: (
    nextDevices: Pick<DeviceState, "inputs" | "outputs" | "outputSelectionSupported" | "error">,
  ) => void;
  setSelectedInput: (deviceId: string | null) => void;
  setSelectedOutput: (deviceId: string | null) => void;
  setCountInEnabled: (enabled: boolean) => void;
  startCountIn: (totalBeats: number) => void;
  setCountInBeatsRemaining: (beatsRemaining: number | null) => void;
  finishCountIn: () => void;
  cancelCountIn: () => void;
  startRecordingSession: (startTime: number, inputDeviceId: string | null, trackId?: string | null) => string;
  finishRecordingSession: (result: {
    fileUrl: string;
    filePath?: string | null;
    durationSeconds: number;
    mimeType: string;
  }) => void;
  failRecordingSession: (message: string) => void;
  cancelRecordingSession: () => void;
  replaceProjectState: (nextState: {
    project: GroovyStoreState["project"];
    transport: TransportState;
    tracks: Track[];
    clips: Record<string, PersistedClipLoadResult>;
    takeGroups: Record<string, TakeGroup>;
    selectedTrackId: string | null;
    selectedClipId: string | null;
    cursorPosition: number;
    timeline?: Partial<TimelineViewState>;
    projectFile: ProjectFileState;
  }) => void;
  setProjectFileState: (nextState: Partial<ProjectFileState>) => void;
  snapshotForAgent: (label: string) => string;
  undoLastAgentChange: () => AgentSnapshot | null;
  clearAgentUndoStack: () => void;
  setAgentLocked: (locked: boolean) => void;
  startAgentActivity: (id: string, name: string, args: unknown) => void;
  finishAgentActivity: (id: string, patch: {
    status: "ok" | "error";
    message?: string;
    destructive: boolean;
    snapshotPushed: boolean;
    durationMs: number;
  }) => void;
  clearAgentActivity: () => void;
}

type GroovyStore = GroovyStoreState & GroovyStoreActions;

const initialState = createInitialGroovyState();

// Tracks are created in app state first, then translated into waveform rows later.
function buildTrack(name: string): Track {
  return {
    id: createId("track"),
    name,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    clips: [],
  };
}

function createAgentMessage(content: string, role: AgentMessage["role"]): AgentMessage {
  return {
    id: createId("message"),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

interface ClipInsertInput {
  trackId?: string;
  trackNameIfMissing?: string;
  fileUrl: string;
  filePath?: string | null;
  sourceKind?: Clip["sourceKind"];
  name: string;
  startTime: number;
  duration: number;
  sourceOffset?: number;
  muted?: boolean;
  takeGroupId?: string;
  appendAssistantMessage?: string | null;
}

interface RecordingTargetResolution {
  track: Track;
  tracks: Track[];
}

interface RecordingTakeResolution {
  takeGroup: TakeGroup;
  mutedClipIds: string[];
  trackClipsInGroup: string[];
}

const TAKE_GROUP_START_TOLERANCE_SECONDS = 0.25;

function resolveManualTargetTrack(state: GroovyStoreState): Track | null {
  if (state.selectedTrackId) {
    return state.tracks.find((track) => track.id === state.selectedTrackId) ?? null;
  }

  if (state.recording.armedTrackId) {
    return state.tracks.find((track) => track.id === state.recording.armedTrackId) ?? null;
  }

  return null;
}

function insertClipIntoState(state: GroovyStoreState, input: ClipInsertInput): Partial<GroovyStoreState> {
  // Manual clip loading and AI insertion both share this app-owned path so the
  // adapter only ever redraws from Zustand state instead of being mutated directly.
  let targetTrack =
    (input.trackId ? state.tracks.find((track) => track.id === input.trackId) : null) ??
    (input.trackNameIfMissing
      ? state.tracks.find((track) => track.name === input.trackNameIfMissing) ?? null
      : null);

  const nextTracks = [...state.tracks];

  if (!targetTrack) {
    const fallbackName = input.trackNameIfMissing ?? `Track ${nextTracks.length + 1}`;
    targetTrack = buildTrack(fallbackName);
    nextTracks.push(targetTrack);
  }

  const clipId = createId("clip");
  const nextClip: Clip = {
    id: clipId,
    trackId: targetTrack.id,
    fileUrl: input.fileUrl,
    filePath: input.filePath ?? null,
    sourceKind: input.sourceKind ?? "appAsset",
    startTime: input.startTime,
    duration: input.duration,
    sourceOffset: input.sourceOffset ?? 0,
    name: input.name,
    muted: input.muted ?? false,
    takeGroupId: input.takeGroupId,
  };

  const updatedTracks = nextTracks.map((track) =>
    track.id === targetTrack.id
      ? {
          ...track,
          clips: [...track.clips, clipId],
        }
      : track,
  );

  return {
    tracks: updatedTracks,
    clips: {
      ...state.clips,
      [clipId]: nextClip,
    },
    selectedTrackId: targetTrack.id,
    selectedClipId: clipId,
    chatMessages:
      input.appendAssistantMessage === undefined
        ? state.chatMessages
        : input.appendAssistantMessage
          ? [...state.chatMessages, createAgentMessage(input.appendAssistantMessage, "assistant")]
          : state.chatMessages,
  };
}

function isRecordedTake(clip: Clip): boolean {
  return clip.name.startsWith("Recorded Take") || Boolean(clip.takeGroupId);
}

function resolveRecordedTakeGroup(
  state: GroovyStoreState,
  trackId: string,
  startTime: number,
  durationSeconds: number,
): RecordingTakeResolution {
  const matchingTakeGroup =
    Object.values(state.takeGroups).find(
      (group) =>
        group.trackId === trackId &&
        Math.abs(group.regionStartTime - startTime) <= TAKE_GROUP_START_TOLERANCE_SECONDS,
    ) ?? null;

  if (!matchingTakeGroup) {
    return {
      takeGroup: {
        id: createId("take-group"),
        trackId,
        regionStartTime: startTime,
        regionDuration: durationSeconds,
        activeClipId: null,
        clipIds: [],
      },
      mutedClipIds: [],
      trackClipsInGroup: [],
    };
  }

  const matchingClips = matchingTakeGroup.clipIds
    .map((clipId) => state.clips[clipId])
    .filter(
      (clip): clip is Clip =>
        Boolean(clip) &&
        clip.trackId === trackId &&
        isRecordedTake(clip) &&
        Math.abs(clip.startTime - startTime) <= TAKE_GROUP_START_TOLERANCE_SECONDS,
    );

  return {
    takeGroup: {
      ...matchingTakeGroup,
      regionDuration: Math.max(matchingTakeGroup.regionDuration, durationSeconds),
    },
    mutedClipIds: matchingClips.map((clip) => clip.id),
    trackClipsInGroup: matchingTakeGroup.clipIds,
  };
}

function replaceClipIdsInTrack(track: Track, previousClipId: string, nextClipIds: string[]): Track {
  const clipIndex = track.clips.indexOf(previousClipId);
  if (clipIndex === -1) {
    return track;
  }

  const trackClips = [...track.clips];
  trackClips.splice(clipIndex, 1, ...nextClipIds);

  return {
    ...track,
    clips: trackClips,
  };
}

function clipBelongsToTakeGroup(clip: Clip, takeGroupId: string | undefined): boolean {
  return Boolean(takeGroupId) && clip.takeGroupId === takeGroupId;
}

function rebuildTrackTakeGroupMembership(
  takeGroups: Record<string, TakeGroup>,
  clips: Record<string, Clip>,
): Record<string, TakeGroup> {
  return Object.fromEntries(
    Object.values(takeGroups).map((group) => {
      const clipIds = group.clipIds.filter((clipId) => {
        const clip = clips[clipId];
        return clip && clipBelongsToTakeGroup(clip, group.id);
      });

      const activeClipId =
        clipIds.includes(group.activeClipId ?? "") ? group.activeClipId : clipIds.find((clipId) => !clips[clipId]?.muted) ?? null;

      return [
        group.id,
        {
          ...group,
          clipIds,
          activeClipId,
        },
      ] satisfies [string, TakeGroup];
    }),
  );
}

function resolveRecordingTarget(
  state: GroovyStoreState,
  explicitTrackId?: string | null,
): RecordingTargetResolution {
  const existingTrack =
    (explicitTrackId ? state.tracks.find((track) => track.id === explicitTrackId) : null) ??
    (state.recording.armedTrackId
      ? state.tracks.find((track) => track.id === state.recording.armedTrackId) ?? null
      : null) ??
    (state.selectedTrackId
      ? state.tracks.find((track) => track.id === state.selectedTrackId) ?? null
      : null);

  if (existingTrack) {
    return {
      track: existingTrack,
      tracks: state.tracks,
    };
  }

  const nextTrack = buildTrack(`Track ${state.tracks.length + 1}`);

  return {
    track: nextTrack,
    tracks: [...state.tracks, nextTrack],
  };
}

function isCursorInsideClip(clip: Clip, cursorPosition: number): boolean {
  const clipEnd = clip.startTime + clip.duration;
  return cursorPosition > clip.startTime && cursorPosition < clipEnd;
}

function normalizeTakeGroupsFromClips(
  takeGroups: Record<string, TakeGroup>,
  clips: Record<string, Clip>,
): Record<string, TakeGroup> {
  const nextTakeGroups = rebuildTrackTakeGroupMembership(takeGroups, clips);

  return Object.fromEntries(
    Object.values(nextTakeGroups).map((group) => {
      const activeClip =
        (group.activeClipId ? clips[group.activeClipId] ?? null : null) ??
        (group.clipIds.length ? clips[group.clipIds[0]] ?? null : null);

      return [
        group.id,
        {
          ...group,
          regionStartTime: activeClip?.startTime ?? group.regionStartTime,
          regionDuration: activeClip?.duration ?? group.regionDuration,
        },
      ] satisfies [string, TakeGroup];
    }),
  );
}

export const useGroovyStore = create<GroovyStore>((set, get) => ({
  ...initialState,
  projectFile: initialState.projectFile,
  agentRequest: {
    isLoading: false,
    lastPayload: null,
    lastKnownTransportStatus: initialState.transport.status,
  },
  agentUndoStack: [],
  agentLocked: false,
  agentActivity: [],

  startAgentActivity: (id, name, args) =>
    set((state) => ({
      agentActivity: [
        ...state.agentActivity,
        {
          id,
          name,
          args,
          status: "running",
          destructive: false,
          snapshotPushed: false,
          startedAt: Date.now(),
        },
      ],
    })),

  finishAgentActivity: (id, patch) =>
    set((state) => ({
      agentActivity: state.agentActivity.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: patch.status,
              message: patch.message,
              destructive: patch.destructive,
              snapshotPushed: patch.snapshotPushed,
              durationMs: patch.durationMs,
            }
          : entry,
      ),
    })),

  clearAgentActivity: () => set({ agentActivity: [] }),

  snapshotForAgent: (label) => {
    const state = get();
    const snapshot: AgentSnapshot = {
      id: createId("snap"),
      label,
      createdAt: Date.now(),
      project: state.project,
      tracks: state.tracks,
      clips: state.clips,
      takeGroups: state.takeGroups,
      selectedTrackId: state.selectedTrackId,
      selectedClipId: state.selectedClipId,
      cursorPosition: state.cursorPosition,
    };
    set((current) => ({
      agentUndoStack: [...current.agentUndoStack, snapshot].slice(-AGENT_UNDO_STACK_LIMIT),
    }));
    return snapshot.id;
  },

  undoLastAgentChange: () => {
    const state = get();
    const last = state.agentUndoStack[state.agentUndoStack.length - 1];
    if (!last) return null;
    set((current) => ({
      agentUndoStack: current.agentUndoStack.slice(0, -1),
      project: last.project,
      tracks: last.tracks,
      clips: last.clips,
      takeGroups: last.takeGroups,
      selectedTrackId: last.selectedTrackId,
      selectedClipId: last.selectedClipId,
      cursorPosition: last.cursorPosition,
      transport: {
        ...current.transport,
        currentTime: last.cursorPosition,
      },
    }));
    return last;
  },

  clearAgentUndoStack: () => set({ agentUndoStack: [] }),

  setAgentLocked: (locked) => set({ agentLocked: locked }),

  setBpm: (bpm) =>
    set((state) => ({
      project: {
        ...state.project,
        bpm: Math.min(220, Math.max(40, Math.round(bpm))),
      },
    })),

  setKey: (key) =>
    set((state) => ({
      project: {
        ...state.project,
        key,
      },
    })),

  setProjectName: (name) =>
    set((state) => ({
      project: {
        ...state.project,
        name: name.trim() || state.project.name,
      },
    })),

  setTransportStatus: (status) =>
    set((state) => ({
      transport: {
        ...state.transport,
        status,
        isRecording: state.recording.isRecording,
      },
      agentRequest: {
        ...state.agentRequest,
        lastKnownTransportStatus: status,
      },
    })),

  setMetronomeEnabled: (enabled) =>
    set((state) => ({
      transport: {
        ...state.transport,
        metronomeEnabled: enabled,
      },
    })),

  setCursorPosition: (cursorPosition) =>
    set((state) => ({
      cursorPosition,
      transport: {
        ...state.transport,
        currentTime: cursorPosition,
      },
    })),

  setTimelineScrollLeft: (scrollLeft) =>
    set((state) => {
      const nextScrollLeft = Math.max(0, scrollLeft);

      if (Math.abs(state.timeline.scrollLeft - nextScrollLeft) < 1) {
        return state;
      }

      return {
        timeline: {
          ...state.timeline,
          scrollLeft: nextScrollLeft,
        },
      };
    }),

  setTimelineVisibleDuration: (visibleDuration) =>
    set((state) => {
      const nextVisibleDuration = Math.max(1, visibleDuration);

      if (Math.abs(state.timeline.visibleDuration - nextVisibleDuration) < 0.01) {
        return state;
      }

      return {
        timeline: {
          ...state.timeline,
          visibleDuration: nextVisibleDuration,
        },
      };
    }),

  setTimelineZoomPxPerSecond: (zoomPxPerSecond) =>
    set((state) => {
      const nextZoom = Math.max(16, zoomPxPerSecond);

      if (Math.abs(state.timeline.zoomPxPerSecond - nextZoom) < 1) {
        return state;
      }

      return {
        timeline: {
          ...state.timeline,
          zoomPxPerSecond: nextZoom,
        },
      };
    }),

  selectTrack: (trackId) =>
    set((state) => {
      const selectedTrack = trackId ? state.tracks.find((track) => track.id === trackId) ?? null : null;
      const currentSelectedClip =
        state.selectedClipId ? state.clips[state.selectedClipId] ?? null : null;
      // Keep the clip selection only when the clip actually lives on the
      // newly selected track. Otherwise clear it — Delete/Backspace should
      // never act on a clip the user did not explicitly click.
      const nextSelectedClipId =
        selectedTrack === null
          ? null
          : currentSelectedClip?.trackId === selectedTrack.id
            ? currentSelectedClip.id
            : null;

      if (state.selectedTrackId === trackId && state.selectedClipId === nextSelectedClipId) {
        return state;
      }

      return {
        selectedTrackId: trackId,
        selectedClipId: nextSelectedClipId,
      };
    }),

  selectClip: (clipId) =>
    set((state) => {
      const nextSelectedTrackId = clipId ? state.clips[clipId]?.trackId ?? state.selectedTrackId : state.selectedTrackId;

      if (state.selectedClipId === clipId && state.selectedTrackId === nextSelectedTrackId) {
        return state;
      }

      return {
        selectedClipId: clipId,
        selectedTrackId: nextSelectedTrackId,
      };
    }),

  addTrack: (name) => {
    const trackName = name?.trim() || `Track ${get().tracks.length + 1}`;
    const nextTrack = buildTrack(trackName);

    set((state) => ({
      tracks: [...state.tracks, nextTrack],
      selectedTrackId: nextTrack.id,
    }));

    return nextTrack.id;
  },

  duplicateTrack: (trackId) => {
    const state = get();
    const source = state.tracks.find((track) => track.id === trackId);
    if (!source) return null;

    const nextTrack: Track = {
      ...source,
      id: createId("track"),
      name: `${source.name} copy`,
      clips: [],
    };

    const duplicatedClips: Record<string, Clip> = {};
    const duplicatedClipIds: string[] = [];
    for (const sourceClipId of source.clips) {
      const sourceClip = state.clips[sourceClipId];
      if (!sourceClip) continue;
      const newClipId = createId("clip");
      duplicatedClips[newClipId] = {
        ...sourceClip,
        id: newClipId,
        trackId: nextTrack.id,
      };
      duplicatedClipIds.push(newClipId);
    }
    nextTrack.clips = duplicatedClipIds;

    const insertionIndex = state.tracks.findIndex((track) => track.id === trackId);
    const nextTracks = [...state.tracks];
    nextTracks.splice(insertionIndex + 1, 0, nextTrack);

    set({
      tracks: nextTracks,
      clips: { ...state.clips, ...duplicatedClips },
      selectedTrackId: nextTrack.id,
    });

    return nextTrack.id;
  },

  deleteTrack: (trackId) =>
    set((state) => {
      const trackToDelete = state.tracks.find((track) => track.id === trackId);
      if (!trackToDelete) {
        return state;
      }

      const nextClips = { ...state.clips };
      for (const clipId of trackToDelete.clips) {
        delete nextClips[clipId];
      }

      const nextTracks = state.tracks.filter((track) => track.id !== trackId);
      const nextSelectedTrackId =
        state.selectedTrackId === trackId ? nextTracks[0]?.id ?? null : state.selectedTrackId;
      const nextSelectedClipId =
        state.selectedClipId && trackToDelete.clips.includes(state.selectedClipId)
          ? null
          : state.selectedClipId;

      const nextTakeGroups = Object.fromEntries(
        Object.entries(state.takeGroups).filter(([, group]) => group.trackId !== trackId),
      );

      return {
        tracks: nextTracks,
        clips: nextClips,
        takeGroups: nextTakeGroups,
        selectedTrackId: nextSelectedTrackId,
        selectedClipId: nextSelectedClipId,
        recording: {
          ...state.recording,
          armedTrackId: state.recording.armedTrackId === trackId ? null : state.recording.armedTrackId,
        },
      };
    }),

  deleteSelectedTrack: () => {
    const { selectedTrackId, deleteTrack } = get();
    if (selectedTrackId) {
      deleteTrack(selectedTrackId);
    }
  },

  updateTrack: (trackId, patch) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, ...patch } : track,
      ),
    })),

  toggleTrackArm: (trackId) =>
    set((state) => {
      const isAlreadyArmed = state.recording.armedTrackId === trackId;
      const nextArmedTrackId = isAlreadyArmed ? null : trackId;

      return {
        tracks: state.tracks.map((track) => ({
          ...track,
          armed: track.id === nextArmedTrackId,
        })),
        selectedTrackId: trackId,
        recording: {
          ...state.recording,
          armedTrackId: nextArmedTrackId,
        },
      };
    }),

  toggleTrackMute: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              muted: !track.muted,
            }
          : track,
      ),
    })),

  toggleTrackSolo: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              solo: !track.solo,
            }
          : track,
      ),
    })),

  toggleClipMute: (clipId) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (!clip) {
        return state;
      }

      if (clip.takeGroupId && clip.muted) {
        const nextClips = { ...state.clips };
        const takeGroup = state.takeGroups[clip.takeGroupId];
        const nextTakeGroups = { ...state.takeGroups };

        if (takeGroup) {
          for (const siblingClipId of takeGroup.clipIds) {
            const sibling = nextClips[siblingClipId];
            if (!sibling) {
              continue;
            }

            nextClips[siblingClipId] = {
              ...sibling,
              muted: sibling.id !== clip.id,
            };
          }

          nextTakeGroups[takeGroup.id] = {
            ...takeGroup,
            activeClipId: clip.id,
          };
        }

        return {
          clips: nextClips,
          takeGroups: nextTakeGroups,
        };
      }

      return {
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            muted: !clip.muted,
          },
        },
      };
    }),

  activateTake: (clipId) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (!clip?.takeGroupId) {
        return state;
      }

      const nextClips = { ...state.clips };
      const takeGroup = state.takeGroups[clip.takeGroupId];
      if (!takeGroup) {
        return state;
      }

      for (const candidateClipId of takeGroup.clipIds) {
        const candidate = state.clips[candidateClipId];
        if (!candidate) {
          continue;
        }

        nextClips[candidate.id] = {
          ...candidate,
          muted: candidate.id !== clip.id,
        };
      }

      return {
        clips: nextClips,
        takeGroups: {
          ...state.takeGroups,
          [takeGroup.id]: {
            ...takeGroup,
            activeClipId: clip.id,
          },
        },
        selectedClipId: clip.id,
        selectedTrackId: clip.trackId,
      };
    }),

  applyWaveformTracksChange: (nextWaveformTracks) =>
    set((state) => {
      const existingTracksById = new Map(state.tracks.map((track) => [track.id, track]));
      const nextClips = { ...state.clips };
      const nextTracks = nextWaveformTracks.map((waveformTrack) => {
        const existingTrack = existingTracksById.get(waveformTrack.id) ?? null;
        const nextClipIds = waveformTrack.clips
          .map((waveformClip) => {
            const existingClip = state.clips[waveformClip.id];
            if (!existingClip) {
              return null;
            }

            nextClips[waveformClip.id] = {
              ...existingClip,
              trackId: waveformTrack.id,
              startTime: waveformClip.startSample / waveformClip.sampleRate,
              duration: waveformClip.durationSamples / waveformClip.sampleRate,
              sourceOffset: waveformClip.offsetSamples / waveformClip.sampleRate,
              name: waveformClip.name ?? existingClip.name,
            };

            return waveformClip.id;
          })
          .filter((clipId): clipId is string => Boolean(clipId));

        const base = existingTrack ?? buildTrack(waveformTrack.name);
        return {
          ...base,
          id: waveformTrack.id,
          name: waveformTrack.name,
          clips: nextClipIds,
        };
      });

      const nextTakeGroups = normalizeTakeGroupsFromClips(state.takeGroups, nextClips);
      const nextSelectedTrack =
        nextTracks.find((track) => track.id === state.selectedTrackId) ?? nextTracks[0] ?? null;
      // Preserve the user's explicit clip selection across waveform-originated
      // track updates, but don't invent one — surface only what they chose.
      const nextSelectedClipId =
        state.selectedClipId && nextClips[state.selectedClipId]
          ? state.selectedClipId
          : null;

      return {
        tracks: nextTracks,
        clips: nextClips,
        takeGroups: nextTakeGroups,
        selectedTrackId: nextSelectedTrack?.id ?? null,
        selectedClipId: nextSelectedClipId,
      };
    }),

  moveClipByDelta: (clipId, deltaTime) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (!clip) {
        return state;
      }

      // waveform-playlist may emit a drag/shift action, but the app still owns
      // the true clip position by updating Zustand here.
      return {
        clips: {
          ...state.clips,
          [clipId]: {
            ...clip,
            startTime: Math.max(0, clip.startTime + deltaTime),
          },
        },
      };
    }),

  splitSelectedClipAtCursor: () =>
    set((state) => {
      const selectedClipId = state.selectedClipId;
      if (!selectedClipId) {
        return state;
      }

      const originalClip = state.clips[selectedClipId];
      if (!originalClip || !isCursorInsideClip(originalClip, state.cursorPosition)) {
        return state;
      }

      const splitTime = state.cursorPosition;
      const leftDuration = splitTime - originalClip.startTime;
      const rightDuration = originalClip.duration - leftDuration;

      // Split is metadata-only. Both new clips keep the same source file and
      // only change timeline placement plus source offsets into that file.
      const leftClipId = createId("clip");
      const rightClipId = createId("clip");

      const leftClip: Clip = {
        ...originalClip,
        id: leftClipId,
        duration: leftDuration,
        name: `${originalClip.name} Part 1`,
      };

      const rightClip: Clip = {
        ...originalClip,
        id: rightClipId,
        startTime: splitTime,
        duration: rightDuration,
        sourceOffset: originalClip.sourceOffset + leftDuration,
        name: `${originalClip.name} Part 2`,
      };

      const nextClips = { ...state.clips };
      delete nextClips[selectedClipId];
      nextClips[leftClipId] = leftClip;
      nextClips[rightClipId] = rightClip;

      const nextTracks = state.tracks.map((track) => {
        if (track.id !== originalClip.trackId) {
          return track;
        }

        return replaceClipIdsInTrack(track, selectedClipId, [leftClipId, rightClipId]);
      });

      let nextTakeGroups = state.takeGroups;

      if (originalClip.takeGroupId) {
        const takeGroup = state.takeGroups[originalClip.takeGroupId];
        if (takeGroup) {
          nextTakeGroups = rebuildTrackTakeGroupMembership(
            {
              ...state.takeGroups,
              [takeGroup.id]: {
                ...takeGroup,
                clipIds: takeGroup.clipIds.filter((clipId) => clipId !== originalClip.id),
                activeClipId: takeGroup.activeClipId === originalClip.id ? null : takeGroup.activeClipId,
              },
            },
            nextClips,
          );
        }
      }

      return {
        tracks: nextTracks,
        clips: nextClips,
        takeGroups: nextTakeGroups,
        selectedClipId: rightClipId,
        selectedTrackId: originalClip.trackId,
      };
    }),

  deleteClip: (clipId) =>
    set((state) => {
      const target = state.clips[clipId];
      if (!target) {
        return state;
      }

      const nextClips = { ...state.clips };
      delete nextClips[clipId];

      const nextTracks = state.tracks.map((track) => {
        if (track.id !== target.trackId) return track;
        return { ...track, clips: track.clips.filter((id) => id !== clipId) };
      });

      let nextTakeGroups = state.takeGroups;
      if (target.takeGroupId && state.takeGroups[target.takeGroupId]) {
        const takeGroup = state.takeGroups[target.takeGroupId];
        nextTakeGroups = rebuildTrackTakeGroupMembership(
          {
            ...state.takeGroups,
            [takeGroup.id]: {
              ...takeGroup,
              clipIds: takeGroup.clipIds.filter((id) => id !== clipId),
              activeClipId: takeGroup.activeClipId === clipId ? null : takeGroup.activeClipId,
            },
          },
          nextClips,
        );
      }

      return {
        clips: nextClips,
        tracks: nextTracks,
        takeGroups: nextTakeGroups,
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      };
    }),

  appendChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  setAgentLoading: (isLoading) =>
    set((state) => ({
      agentRequest: {
        ...state.agentRequest,
        isLoading,
      },
    })),

  setAgentPayload: (payload) =>
    set((state) => ({
      agentRequest: {
        ...state.agentRequest,
        lastPayload: payload,
      },
    })),

  insertGeneratedClip: (response) =>
    set((state) => {
      const clipName = `${response.trackName} Idea`;
      const nextState = insertClipIntoState(state, {
        trackNameIfMissing: response.trackName,
        fileUrl: response.audioUrl,
        name: clipName,
        startTime: response.startTime,
        duration: response.duration,
        sourceOffset: 0,
        appendAssistantMessage: `Inserted "${clipName}" on ${response.trackName} at ${response.startTime.toFixed(1)}s.`,
      });

      return {
        ...nextState,
        cursorPosition: response.startTime,
        transport: {
          ...state.transport,
          currentTime: response.startTime,
        },
      };
    }),

  insertAttachmentClip: (messageId) =>
    set((state) => {
      const message = state.chatMessages.find((m) => m.id === messageId);
      if (!message?.attachment || message.attachment.inserted) return {};

      const att = message.attachment;
      const clipName = att.label ?? `${att.trackName} Idea`;
      const nextState = insertClipIntoState(state, {
        trackNameIfMissing: att.trackName,
        fileUrl: att.audioUrl,
        name: clipName,
        startTime: att.startTime,
        duration: att.duration,
        sourceOffset: 0,
      });

      const chatMessages = (nextState.chatMessages ?? state.chatMessages).map((m) =>
        m.id === messageId && m.attachment
          ? { ...m, attachment: { ...m.attachment, inserted: true } }
          : m,
      );

      return {
        ...nextState,
        chatMessages,
        cursorPosition: att.startTime,
        transport: {
          ...state.transport,
          currentTime: att.startTime,
        },
      };
    }),

  replaceAttachment: (messageId, attachment) =>
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === messageId ? { ...m, attachment } : m,
      ),
    })),

  importAudioAsset: (input) =>
    set((state) => {
      const target = input.trackId
        ? state.tracks.find((t) => t.id === input.trackId) ?? null
        : resolveManualTargetTrack(state);

      return insertClipIntoState(state, {
        trackId: target?.id,
        trackNameIfMissing: target ? undefined : input.name.replace(/\.[^.]+$/, ""),
        fileUrl: input.fileUrl,
        filePath: input.filePath ?? null,
        sourceKind: "file",
        name: input.name,
        startTime: state.cursorPosition,
        duration: input.duration,
        sourceOffset: 0,
        appendAssistantMessage: null,
      });
    }),

  setAvailableDevices: (nextDevices) =>
    set((state) => {
      const selectedInputId = selectDeviceId(state.devices.selectedInputId, nextDevices.inputs);
      const selectedOutputId = selectDeviceId(state.devices.selectedOutputId, nextDevices.outputs);

      return {
        devices: {
          ...state.devices,
          ...nextDevices,
          selectedInputId,
          selectedOutputId,
        },
      };
    }),

  setSelectedInput: (deviceId) =>
    set((state) => ({
      devices: {
        ...state.devices,
        selectedInputId: deviceId,
      },
    })),

  setSelectedOutput: (deviceId) =>
    set((state) => ({
      devices: {
        ...state.devices,
        selectedOutputId: deviceId,
      },
    })),

  setCountInEnabled: (enabled) =>
    set((state) => ({
      recording: {
        ...state.recording,
        countInEnabled: enabled,
      },
    })),

  startCountIn: (totalBeats) =>
    set((state) => ({
      recording: {
        ...state.recording,
        isCountInActive: true,
        countInBeatsRemaining: totalBeats,
        lastRecordingNote: `Count-in active. Recording will start in ${totalBeats} beats.`,
        lastError: null,
      },
    })),

  setCountInBeatsRemaining: (beatsRemaining) =>
    set((state) => ({
      recording: {
        ...state.recording,
        countInBeatsRemaining: beatsRemaining,
      },
    })),

  finishCountIn: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isCountInActive: false,
        countInBeatsRemaining: null,
        lastRecordingNote: "Count-in complete. Recording started.",
      },
    })),

  cancelCountIn: () =>
    set((state) => ({
      recording: {
        ...state.recording,
        isCountInActive: false,
        countInBeatsRemaining: null,
        lastRecordingNote: "Count-in cancelled.",
        lastError: null,
      },
      transport: {
        ...state.transport,
        isRecording: false,
      },
    })),

  startRecordingSession: (startTime, inputDeviceId, trackId) => {
    const { track, tracks } = resolveRecordingTarget(get(), trackId);

    set((state) => ({
      tracks: tracks.map((candidate) =>
        candidate.id === track.id
          ? {
              ...candidate,
              armed: true,
            }
          : candidate,
      ),
      selectedTrackId: track.id,
      recording: {
        ...state.recording,
        isRecording: true,
        isCountInActive: false,
        countInBeatsRemaining: null,
        // Count-in is pre-roll only. The app records the original cursor as the
        // canonical start time so take placement stays deterministic.
        armedTrackId: track.id,
        activeRecordingTrackId: track.id,
        recordStartTime: startTime,
        recordingInputId: inputDeviceId,
        pendingTakeGroupId: null,
        lastRecordingNote: `Recording on ${track.name}. Stop recording to insert the take into the timeline.`,
        lastError: null,
      },
      transport: {
        ...state.transport,
        isRecording: true,
      },
    }));

    return track.id;
  },

  finishRecordingSession: (result) =>
    set((state) => {
      const recordStartTime = state.recording.recordStartTime ?? state.cursorPosition;
      const targetTrack = resolveRecordingTarget(state, state.recording.armedTrackId).track;
      const takeResolution = resolveRecordedTakeGroup(state, targetTrack.id, recordStartTime, result.durationSeconds);
      const nextRecordedTakeNumber =
        Object.values(state.clips).filter((clip) => clip.trackId === targetTrack.id && isRecordedTake(clip)).length + 1;
      const clipLabel = `Recorded Take ${nextRecordedTakeNumber}`;
      const nextClips = { ...state.clips };
      const nextTakeGroups = { ...state.takeGroups };

      for (const clipId of takeResolution.mutedClipIds) {
        const clip = nextClips[clipId];
        if (!clip) {
          continue;
        }

        nextClips[clipId] = {
          ...clip,
          muted: true,
        };
      }

      const insertedClipState = insertClipIntoState(
        {
          ...state,
          clips: nextClips,
        },
        {
          trackId: targetTrack.id,
          fileUrl: result.fileUrl,
          filePath: result.filePath ?? null,
          sourceKind: result.filePath && !result.filePath.startsWith("idb://") ? "file" : "appAsset",
          name: clipLabel,
          startTime: recordStartTime,
          duration: result.durationSeconds,
          sourceOffset: 0,
          muted: false,
          takeGroupId: takeResolution.takeGroup.id,
          appendAssistantMessage: null,
        },
      );

      const insertedClipId = insertedClipState.selectedClipId ?? null;
      if (insertedClipId) {
        nextTakeGroups[takeResolution.takeGroup.id] = {
          ...takeResolution.takeGroup,
          clipIds: [...takeResolution.trackClipsInGroup.filter((clipId) => clipId !== insertedClipId), insertedClipId],
          activeClipId: insertedClipId,
          regionDuration: Math.max(takeResolution.takeGroup.regionDuration, result.durationSeconds),
        };
      }

      const nextCursor = recordStartTime + result.durationSeconds;

      return {
        ...insertedClipState,
        takeGroups: nextTakeGroups,
        cursorPosition: nextCursor,
        recording: {
          ...state.recording,
          isRecording: false,
          isCountInActive: false,
          countInBeatsRemaining: null,
          activeRecordingTrackId: null,
          recordStartTime: null,
          recordingInputId: null,
          pendingTakeGroupId: null,
          lastRecordingNote: `Inserted "${clipLabel}" on ${targetTrack.name}. Recorded audio now uses a durable app-managed path when available.`,
          lastError: null,
        },
        transport: {
          ...state.transport,
          currentTime: nextCursor,
          isRecording: false,
        },
        timeline: {
          ...state.timeline,
          zoomPxPerSecond: getTimelineZoomPxPerSecond(state.project.sampleRate),
        },
      };
    }),

  failRecordingSession: (message) =>
    set((state) => ({
        recording: {
          ...state.recording,
          isRecording: false,
          isCountInActive: false,
          countInBeatsRemaining: null,
          activeRecordingTrackId: null,
          recordStartTime: null,
          recordingInputId: null,
          pendingTakeGroupId: null,
          lastRecordingNote: "Recording did not complete.",
          lastError: message,
        },
      transport: {
        ...state.transport,
        isRecording: false,
      },
    })),

  cancelRecordingSession: () =>
    set((state) => ({
        recording: {
          ...state.recording,
          isRecording: false,
          isCountInActive: false,
          countInBeatsRemaining: null,
          activeRecordingTrackId: null,
          recordStartTime: null,
          recordingInputId: null,
          pendingTakeGroupId: null,
          lastRecordingNote: "Recording cancelled.",
          lastError: null,
        },
      transport: {
        ...state.transport,
        isRecording: false,
      },
    })),

  replaceProjectState: (nextState) =>
    set((state) => ({
      project: nextState.project,
      transport: {
        ...state.transport,
        ...nextState.transport,
        currentTime: nextState.cursorPosition,
      },
      tracks: nextState.tracks,
      clips: nextState.clips,
      takeGroups: nextState.takeGroups,
      selectedTrackId: nextState.selectedTrackId,
      selectedClipId: nextState.selectedClipId,
      cursorPosition: nextState.cursorPosition,
      timeline: {
        ...state.timeline,
        ...nextState.timeline,
      },
      projectFile: nextState.projectFile,
      recording: {
        ...state.recording,
        isRecording: false,
        isCountInActive: false,
        countInBeatsRemaining: null,
        activeRecordingTrackId: null,
        recordStartTime: null,
        recordingInputId: null,
        pendingTakeGroupId: null,
      },
    })),

  setProjectFileState: (nextState) =>
    set((state) => ({
      projectFile: {
        ...state.projectFile,
        ...nextState,
      },
    })),
}));

function selectDeviceId(currentId: string | null, devices: AudioDeviceOption[]): string | null {
  if (currentId && devices.some((device) => device.id === currentId)) {
    return currentId;
  }

  return devices[0]?.id ?? null;
}
