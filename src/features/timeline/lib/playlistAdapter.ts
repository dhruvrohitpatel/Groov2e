import { createClipFromSeconds, createTrack, type ClipTrack } from "@waveform-playlist/core";
import type { Clip, Track } from "../../../types/models";
import { trackMeterRegistry } from "./trackMeters";

export const TRACK_COLORS = ["#c89b62", "#b66c4f", "#8b7d62", "#748568", "#a87f62", "#6f7666"];

function getClipSourceKey(clip: Clip): string {
  return clip.filePath ?? clip.fileUrl;
}

function buildTrackClip(
  clip: Clip,
  trackColor: string,
  sampleRate: number,
  buffersBySource: Record<string, AudioBuffer>,
) {
  const audioBuffer = buffersBySource[getClipSourceKey(clip)];
  const resolvedSampleRate = audioBuffer?.sampleRate ?? sampleRate;
  const resolvedSourceDuration = audioBuffer?.duration ?? clip.sourceOffset + clip.duration;
  const waveformClip = createClipFromSeconds({
    audioBuffer,
    sampleRate: resolvedSampleRate,
    sourceDuration: resolvedSourceDuration,
    startTime: clip.startTime,
    duration: clip.duration,
    offset: clip.sourceOffset,
    name: clip.name,
    color: trackColor,
    gain: clip.muted ? 0 : 1,
  });

  waveformClip.id = clip.id;

  return waveformClip;
}

// Gain (dB) and the UI fader are both collapsed into wfpl's linear per-track
// volume so that "setTrackVolume" can keep the audio graph in sync with the
// store. The imperative sync layer recomputes this every time either value
// changes without rebuilding the engine.
export function computeEffectiveVolume(fader: number, gainDb: number): number {
  return Math.min(MAX_EFFECTIVE_VOLUME, Math.max(0, fader * dbToLinear(gainDb)));
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

const MAX_EFFECTIVE_VOLUME = 4;

interface CachedTrack {
  signature: string;
  clipTrack: ClipTrack;
}

export interface PlaylistRowCache {
  byTrackId: Map<string, CachedTrack>;
}

export function createPlaylistRowCache(): PlaylistRowCache {
  return { byTrackId: new Map() };
}

// The signature intentionally excludes pan/volume/mute/solo/gain. Those are
// pushed to wfpl imperatively via setTrackVolume/setTrackPan/etc. so that
// twisting a knob does not invalidate the ClipTrack reference and trigger a
// full engine rebuild (which would tear down the audio graph, stop playback,
// and re-register the timeline bridge).
function computeTrackSignature(
  track: Track,
  trackIndex: number,
  clips: Record<string, Clip>,
  buffersBySource: Record<string, AudioBuffer>,
  sampleRate: number,
  trackHeight: number,
): { signature: string; orderedClips: Clip[] } {
  const orderedClips = track.clips
    .map((clipId) => clips[clipId])
    .filter((clip): clip is Clip => Boolean(clip))
    .sort((left, right) => left.startTime - right.startTime);

  const clipPart = orderedClips
    .map((clip) => {
      const key = getClipSourceKey(clip);
      const hasBuffer = Boolean(buffersBySource[key]);
      return `${clip.id}|${key}|${hasBuffer ? 1 : 0}|${clip.startTime}|${clip.duration}|${clip.sourceOffset}|${clip.name}|${clip.muted ? 1 : 0}`;
    })
    .join(",");

  const signature = [
    track.id,
    trackIndex,
    track.name,
    sampleRate,
    trackHeight,
    clipPart,
  ].join("##");

  return { signature, orderedClips };
}

// Reads the current CSS --track-height so that the audio engine's row heights
// match the chrome. Falls back to 84 for SSR / first-render-before-css cases.
export function readTrackHeightFromCss(): number {
  if (typeof document === "undefined") return 84;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--track-height")
    .trim();
  if (!raw) return 84;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 84;
}

// The app still owns project persistence, take-group metadata, and clip IDs.
// This adapter only translates that state into the ClipTrack model expected by
// the modern waveform-playlist React provider.
export function buildPlaylistRows(
  tracks: Track[],
  clips: Record<string, Clip>,
  sampleRate: number,
  buffersBySource: Record<string, AudioBuffer>,
  cache?: PlaylistRowCache,
  trackHeight: number = 84,
): ClipTrack[] {
  const activeTrackIds = new Set<string>();

  const rows = tracks.map((track, trackIndex) => {
    const trackColor = TRACK_COLORS[trackIndex % TRACK_COLORS.length];
    const fader = track.volume ?? 0.8;
    const gainDb = track.gain ?? 0;
    const effectiveVolume = computeEffectiveVolume(fader, gainDb);

    const { signature, orderedClips } = computeTrackSignature(
      track,
      trackIndex,
      clips,
      buffersBySource,
      sampleRate,
      trackHeight,
    );

    activeTrackIds.add(track.id);

    if (cache) {
      const cached = cache.byTrackId.get(track.id);
      if (cached && cached.signature === signature) {
        return cached.clipTrack;
      }
    }

    const waveformTrack = createTrack({
      name: track.name,
      clips: orderedClips.map((clip) =>
        buildTrackClip(clip, trackColor, sampleRate, buffersBySource),
      ),
      muted: track.muted,
      soloed: track.solo,
      volume: effectiveVolume,
      pan: track.pan,
      color: trackColor,
      height: trackHeight,
    });

    waveformTrack.id = track.id;
    waveformTrack.effects = trackMeterRegistry.effectsFor(track.id);

    if (cache) {
      cache.byTrackId.set(track.id, { signature, clipTrack: waveformTrack });
    }

    return waveformTrack;
  });

  if (cache) {
    for (const trackId of Array.from(cache.byTrackId.keys())) {
      if (!activeTrackIds.has(trackId)) {
        cache.byTrackId.delete(trackId);
      }
    }
  }

  trackMeterRegistry.pruneMissing(activeTrackIds);

  return rows;
}
