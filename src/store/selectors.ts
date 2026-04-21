import { formatBarsBeats } from "../features/timeline/lib/timelineMath";
import type { RemoteStateSnapshot } from "../features/remote/types";
import type { Clip, TakeGroup, Track } from "../types/models";
import type { GroovyStoreStatePublic } from "./stateTypes";

export function getTrackLaneById(tracks: Track[], trackId: string | null): Track | null {
  return trackId ? tracks.find((track) => track.id === trackId) ?? null : null;
}

export function getTrackLaneClips(track: Track | null, clips: Record<string, Clip>): Clip[] {
  if (!track) {
    return [];
  }

  return track.clips
    .map((clipId) => clips[clipId])
    .filter((clip): clip is Clip => Boolean(clip))
    .sort((left, right) => left.startTime - right.startTime);
}

export function getTakeGroupsForTrack(
  takeGroups: Record<string, TakeGroup>,
  trackId: string | null,
): TakeGroup[] {
  if (!trackId) {
    return [];
  }

  return Object.values(takeGroups)
    .filter((group) => group.trackId === trackId)
    .sort((left, right) => left.regionStartTime - right.regionStartTime);
}

export function getActiveTakeForTrackRegion(
  takeGroups: Record<string, TakeGroup>,
  trackId: string,
  startTime: number,
  duration: number,
): TakeGroup | null {
  return (
    Object.values(takeGroups).find(
      (group) =>
        group.trackId === trackId &&
        Math.abs(group.regionStartTime - startTime) <= 0.25 &&
        Math.abs(group.regionDuration - duration) <= Math.max(0.5, duration * 0.5),
    ) ?? null
  );
}

export function getRecordingTargetTrack(tracks: Track[], armedTrackId: string | null, selectedTrackId: string | null) {
  return getTrackLaneById(tracks, armedTrackId) ?? getTrackLaneById(tracks, selectedTrackId);
}

export function buildRemoteStateSnapshot(state: GroovyStoreStatePublic): RemoteStateSnapshot {
  return {
    transportStatus: state.recording.isRecording ? "recording" : state.transport.status,
    currentTime: state.transport.currentTime,
    barsBeats: formatBarsBeats(state.transport.currentTime, state.project.bpm),
    bpm: state.project.bpm,
    metronomeEnabled: state.transport.metronomeEnabled,
    tracks: state.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      armed: track.armed,
      muted: track.muted,
      solo: track.solo,
      clipCount: track.clips.length,
    })),
    selectedTrackId: state.selectedTrackId,
    armedTrackIds: state.tracks.filter((track) => track.armed).map((track) => track.id),
    recording: {
      isRecording: state.recording.isRecording,
      targetTrackId: state.recording.armedTrackId,
    },
    agent: {
      isLoading: state.agentRequest.isLoading,
      lastPromptPreview: state.agentRequest.lastPayload?.prompt ?? null,
    },
  };
}
