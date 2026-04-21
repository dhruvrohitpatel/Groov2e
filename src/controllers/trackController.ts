import type { ClipTrack } from "@waveform-playlist/core";
import type { Track } from "../types/models";
import { useGroovyStore } from "../store/useGroovyStore";

// Track controller is the app-facing command boundary for lane/clip actions.
// Remote commands should call this layer instead of touching the store directly.
export const trackController = {
  addTrack(name?: string) {
    return useGroovyStore.getState().addTrack(name);
  },

  deleteSelectedTrack() {
    useGroovyStore.getState().deleteSelectedTrack();
  },

  selectTrack(trackId: string | null) {
    useGroovyStore.getState().selectTrack(trackId);
  },

  selectClip(clipId: string | null) {
    useGroovyStore.getState().selectClip(clipId);
  },

  updateTrack(trackId: string, patch: Partial<Track>) {
    useGroovyStore.getState().updateTrack(trackId, patch);
  },

  deleteTrack(trackId: string) {
    useGroovyStore.getState().deleteTrack(trackId);
  },

  duplicateTrack(trackId: string) {
    return useGroovyStore.getState().duplicateTrack(trackId);
  },

  duplicateSelectedTrack() {
    const { selectedTrackId, duplicateTrack } = useGroovyStore.getState();
    if (!selectedTrackId) return null;
    return duplicateTrack(selectedTrackId);
  },

  toggleTrackArm(trackId: string) {
    useGroovyStore.getState().toggleTrackArm(trackId);
  },

  toggleTrackMute(trackId: string) {
    useGroovyStore.getState().toggleTrackMute(trackId);
  },

  toggleTrackSolo(trackId: string) {
    useGroovyStore.getState().toggleTrackSolo(trackId);
  },

  toggleClipMute(clipId: string) {
    useGroovyStore.getState().toggleClipMute(clipId);
  },

  activateTake(clipId: string) {
    useGroovyStore.getState().activateTake(clipId);
  },

  applyWaveformTracksChange(nextTracks: ClipTrack[]) {
    useGroovyStore.getState().applyWaveformTracksChange(nextTracks);
  },

  splitSelectedClipAtCursor() {
    useGroovyStore.getState().splitSelectedClipAtCursor();
  },

  deleteClip(clipId: string) {
    useGroovyStore.getState().deleteClip(clipId);
  },

  deleteSelectedClip() {
    const state = useGroovyStore.getState();
    if (state.selectedClipId) {
      state.deleteClip(state.selectedClipId);
    }
  },

  moveClipByDelta(clipId: string, deltaTime: number) {
    useGroovyStore.getState().moveClipByDelta(clipId, deltaTime);
  },
};
