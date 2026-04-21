import { useCallback, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { setMasterAnalyser } from '../features/audio/services/masterAnalyser';
import {
  ClipInteractionProvider,
  Waveform,
  WaveformPlaylistProvider,
  useMasterAnalyser,
  usePlaybackAnimation,
  usePlaylistControls,
  usePlaylistData,
  usePlaylistState,
  useExportWav,
} from '@waveform-playlist/browser';
import type { ClipTrack } from '@waveform-playlist/core';
import { BeatsAndBarsProvider } from '@waveform-playlist/ui-components';
import { audioService } from '../features/audio/services/audioService';
import { trackController } from '../controllers/trackController';
import { useDecodedClipBuffers } from '../features/timeline/hooks/useDecodedClipBuffers';
import {
  buildPlaylistRows,
  computeEffectiveVolume,
  createPlaylistRowCache,
} from '../features/timeline/lib/playlistAdapter';
import type { Density } from '../types';

const DENSITY_TRACK_HEIGHT: Record<Density, number> = {
  compact: 60,
  comfortable: 84,
  spacious: 112,
};
import { useGroovyStore } from '../store/useGroovyStore';
import { useUiStore } from '../store/useUiStore';
import { buildGroovyWaveformTheme } from '../theme/waveformTheme';
import type { Theme, ThemeName } from '../types';
import { TrackHead } from './trackHead';
import { TRACK_HEAD_WIDTH } from './timeline';

interface LaneProps {
  theme: Theme;
  themeName: ThemeName;
}

function EditorBridge({ appSelectedTrackId }: { appSelectedTrackId: string | null }) {
  const { currentTime, isPlaying } = usePlaybackAnimation();
  const {
    play, pause, stop, seekTo, setSelectedTrackId,
    zoomIn: wfplZoomIn, zoomOut: wfplZoomOut,
  } = usePlaylistControls();
  const playlistState = usePlaylistState();
  const playlistData = usePlaylistData();
  const { exportWav } = useExportWav();
  const previousIsPlayingRef = useRef(false);
  const hasInitializedSelectionSyncRef = useRef(false);
  const previousAppSelectedTrackIdRef = useRef<string | null>(appSelectedTrackId);
  const previousPlaylistSelectedTrackIdRef = useRef<string | null>(playlistState.selectedTrackId);

  const playlistDataRef = useRef(playlistData);
  useEffect(() => {
    playlistDataRef.current = playlistData;
  }, [playlistData]);

  // Keep zoom callbacks in a ref so audioService always sees the latest ones
  // without forcing a re-register on every wfpl state change.
  const zoomControlsRef = useRef({ zoomIn: wfplZoomIn, zoomOut: wfplZoomOut });
  useEffect(() => {
    zoomControlsRef.current = { zoomIn: wfplZoomIn, zoomOut: wfplZoomOut };
  }, [wfplZoomIn, wfplZoomOut]);

  useEffect(() => {
    return audioService.registerTimeline({
      play: (startAt) => {
        void play(startAt);
      },
      pause: () => {
        pause();
      },
      stop: () => {
        stop();
      },
      seek: (time) => {
        seekTo(time);
      },
      exportWav: async () => {
        const { tracks: wfTracks } = playlistDataRef.current;
        const state = useGroovyStore.getState();
        const { project } = state;
        // Build TrackStates from our store rather than wfpl's React state.
        // wfpl's trackStates can be stale when multiple setters fire in a
        // single tick (its useCallback closure captures a pre-update snapshot),
        // which would lead to silent / wrong-mute exports.
        const tracksById = new Map(state.tracks.map((t) => [t.id, t]));
        const trackStates = wfTracks.map((wfTrack) => {
          const track = tracksById.get(wfTrack.id);
          const fader = track?.volume ?? 0.8;
          const gainDb = track?.gain ?? 0;
          return {
            name: track?.name ?? wfTrack.name,
            muted: Boolean(track?.muted),
            soloed: Boolean(track?.solo),
            volume: computeEffectiveVolume(fader, gainDb),
            pan: track?.pan ?? 0,
          };
        });
        const filename = (project.name || 'groovy-mix').replace(/[^\w\-]+/g, '_');
        return exportWav(wfTracks, trackStates, {
          filename,
          mode: 'master',
          bitDepth: 16,
          applyEffects: true,
          autoDownload: true,
        });
      },
      zoomIn: () => {
        zoomControlsRef.current.zoomIn();
      },
      zoomOut: () => {
        zoomControlsRef.current.zoomOut();
      },
    });
  }, [exportWav, pause, play, seekTo, stop]);

  // Mirror wfpl's authoritative zoom state back into the UI store so buttons,
  // menu commands, and any readers stay in sync with the engine.
  useEffect(() => {
    const uiState = useUiStore.getState();
    if (uiState.samplesPerPixel !== playlistData.samplesPerPixel) {
      uiState.setSamplesPerPixel(playlistData.samplesPerPixel);
    }
    uiState.setZoomBounds(playlistData.canZoomIn, playlistData.canZoomOut);
  }, [playlistData.samplesPerPixel, playlistData.canZoomIn, playlistData.canZoomOut]);

  useEffect(() => {
    useGroovyStore.getState().setCursorPosition(currentTime);
  }, [currentTime]);

  useEffect(() => {
    if (!hasInitializedSelectionSyncRef.current) {
      hasInitializedSelectionSyncRef.current = true;
      previousAppSelectedTrackIdRef.current = appSelectedTrackId;
      previousPlaylistSelectedTrackIdRef.current = playlistState.selectedTrackId;

      if (playlistState.selectedTrackId !== appSelectedTrackId) {
        setSelectedTrackId(appSelectedTrackId);
      }
      return;
    }

    if (previousAppSelectedTrackIdRef.current === appSelectedTrackId) return;

    previousAppSelectedTrackIdRef.current = appSelectedTrackId;
    if (playlistState.selectedTrackId !== appSelectedTrackId) {
      setSelectedTrackId(appSelectedTrackId);
    }
  }, [appSelectedTrackId, playlistState.selectedTrackId, setSelectedTrackId]);

  useEffect(() => {
    if (!hasInitializedSelectionSyncRef.current) return;
    if (previousPlaylistSelectedTrackIdRef.current === playlistState.selectedTrackId) return;

    previousPlaylistSelectedTrackIdRef.current = playlistState.selectedTrackId;
    const state = useGroovyStore.getState();
    if (playlistState.selectedTrackId !== state.selectedTrackId) {
      trackController.selectTrack(playlistState.selectedTrackId);
    }
  }, [playlistState.selectedTrackId]);

  useEffect(() => {
    const state = useGroovyStore.getState();
    const wasPlaying = previousIsPlayingRef.current;

    if (wasPlaying && !isPlaying && !state.recording.isRecording && state.transport.status === 'playing') {
      state.setTransportStatus('stopped');
    }
    previousIsPlayingRef.current = isPlaying;
  }, [isPlaying]);

  return null;
}

// Pushes per-track pan/volume/mute/solo changes directly into wfpl's audio
// graph. wfpl only reads these values from the `tracks` prop on initial mount
// and internally owns them afterwards, so the store has to talk to wfpl
// imperatively or knob turns are silent.
//
// Two paths:
//  - Delta path (normal user toggles a single field): use wfpl's React
//    setters, which update both the engine and wfpl's `trackStates`.
//  - Forced resync (engine rebuild after track add/remove, or isReady
//    flipping true): write straight to the engine via `playoutRef` to
//    avoid wfpl's useCallback closure bug, where multiple setters fired
//    in one tick all start from the same pre-update `trackStates` snapshot
//    and the last `setTrackStates` call clobbers everything before it.
//    The engine is the source of truth for playback, so direct writes
//    reliably apply mute/solo/volume/pan after a rebuild.
function TrackStateSync({ trackIds }: { trackIds: string[] }) {
  const { setTrackVolume, setTrackPan, setTrackMute, setTrackSolo } = usePlaylistControls();
  const { playoutRef, isReady } = usePlaylistData();
  const tracks = useGroovyStore((state) => state.tracks);
  const lastAppliedRef = useRef<Map<string, { volume: number; pan: number; muted: boolean; solo: boolean }>>(
    new Map(),
  );
  const lastTrackIdsRef = useRef<string[] | null>(null);
  const wasReadyRef = useRef(false);

  useEffect(() => {
    if (!isReady) {
      wasReadyRef.current = false;
      return;
    }

    const previousIds = lastTrackIdsRef.current;
    const trackListChanged =
      !previousIds ||
      previousIds.length !== trackIds.length ||
      previousIds.some((id, index) => id !== trackIds[index]);
    const justBecameReady = !wasReadyRef.current;
    wasReadyRef.current = true;
    lastTrackIdsRef.current = trackIds;

    const forceFullSync = justBecameReady || trackListChanged;
    if (forceFullSync) {
      lastAppliedRef.current.clear();
    } else {
      const stillPresent = new Set(trackIds);
      for (const trackId of Array.from(lastAppliedRef.current.keys())) {
        if (!stillPresent.has(trackId)) {
          lastAppliedRef.current.delete(trackId);
        }
      }
    }

    const engine = playoutRef.current;

    tracks.forEach((track) => {
      const trackIndex = trackIds.indexOf(track.id);
      if (trackIndex === -1) return;

      const fader = track.volume ?? 0.8;
      const gainDb = track.gain ?? 0;
      const nextVolume = computeEffectiveVolume(fader, gainDb);
      const nextPan = track.pan ?? 0;
      const nextMuted = Boolean(track.muted);
      const nextSolo = Boolean(track.solo);

      const previous = lastAppliedRef.current.get(track.id);

      if (forceFullSync && engine) {
        engine.setTrackVolume(track.id, nextVolume);
        engine.setTrackPan(track.id, nextPan);
        engine.setTrackMute(track.id, nextMuted);
        engine.setTrackSolo(track.id, nextSolo);
      } else {
        if (!previous || previous.volume !== nextVolume) {
          setTrackVolume(trackIndex, nextVolume);
        }
        if (!previous || previous.pan !== nextPan) {
          setTrackPan(trackIndex, nextPan);
        }
        if (!previous || previous.muted !== nextMuted) {
          setTrackMute(trackIndex, nextMuted);
        }
        if (!previous || previous.solo !== nextSolo) {
          setTrackSolo(trackIndex, nextSolo);
        }
      }

      lastAppliedRef.current.set(track.id, {
        volume: nextVolume,
        pan: nextPan,
        muted: nextMuted,
        solo: nextSolo,
      });
    });
  }, [tracks, trackIds, isReady, playoutRef, setTrackVolume, setTrackPan, setTrackMute, setTrackSolo]);

  return null;
}

export function Lane({ theme, themeName }: LaneProps) {
  const { analyserRef, masterEffects } = useMasterAnalyser(1024);
  const laneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Publish a lazy getter. setMasterAnalyser returns null when wfpl has not
    // built the audio graph yet so the mixer shows silence instead of a pegged
    // meter (0 raw value would be misread as 0 dBFS by our dB converter).
    setMasterAnalyser({
      getValue: () => {
        const current = analyserRef.current as unknown as {
          getValue: () => number | Float32Array | number[];
        } | null;
        if (!current) return -Infinity;
        return current.getValue();
      },
    });
    return () => setMasterAnalyser(null);
  }, [analyserRef]);

  const tracks = useGroovyStore((state) => state.tracks);
  const clips = useGroovyStore((state) => state.clips);
  const selectedTrackId = useGroovyStore((state) => state.selectedTrackId);
  const selectedClipId = useGroovyStore((state) => state.selectedClipId);
  const project = useGroovyStore((state) => state.project);
  const recording = useGroovyStore((state) => state.recording);
  const cursorPosition = useGroovyStore((state) => state.cursorPosition);
  const snap = useUiStore((state) => state.snap);
  const samplesPerPixel = useUiStore((state) => state.samplesPerPixel);
  const density = useUiStore((state) => state.tweaks.density);
  const { buffersBySource, isReady, lastError } = useDecodedClipBuffers(clips);

  const playlistRowCacheRef = useRef(createPlaylistRowCache());

  const trackHeight = DENSITY_TRACK_HEIGHT[density];

  const waveformTracks = useMemo(
    () =>
      buildPlaylistRows(
        tracks,
        clips,
        project.sampleRate ?? 44100,
        buffersBySource,
        playlistRowCacheRef.current,
        trackHeight,
      ),
    [buffersBySource, clips, project.sampleRate, tracks, trackHeight],
  );

  const waveformTrackIds = useMemo(
    () => waveformTracks.map((track) => track.id),
    [waveformTracks],
  );

  const decodingClipCount = useMemo(() => {
    let pending = 0;
    for (const clip of Object.values(clips)) {
      const key = clip.filePath ?? clip.fileUrl;
      if (!buffersBySource[key]) pending += 1;
    }
    return pending;
  }, [buffersBySource, clips]);

  const recordingPreviewState = useMemo(() => {
    if (
      !recording.isRecording ||
      !recording.activeRecordingTrackId ||
      recording.recordStartTime === null
    ) {
      return undefined;
    }

    const sampleRate = project.sampleRate ?? 44100;
    const startSample = Math.max(0, Math.floor(recording.recordStartTime * sampleRate));
    const durationSamples = Math.max(0, Math.floor((cursorPosition - recording.recordStartTime) * sampleRate));
    const peakCount = Math.max(1, Math.ceil(durationSamples / samplesPerPixel));
    const channelPeaks = new Int8Array(peakCount);

    for (let index = 0; index < peakCount; index += 1) {
      channelPeaks[index] = index % 2 === 0 ? 52 : 34;
    }

    return {
      isRecording: true,
      trackId: recording.activeRecordingTrackId,
      startSample,
      durationSamples,
      peaks: [channelPeaks],
      bits: 8 as const,
    };
  }, [
    cursorPosition,
    project.sampleRate,
    recording.activeRecordingTrackId,
    recording.isRecording,
    recording.recordStartTime,
    samplesPerPixel,
  ]);

  const handleTracksChange = useCallback((nextTracks: ClipTrack[]) => {
    trackController.applyWaveformTracksChange(nextTracks);
  }, []);

  // wfpl only tracks selected *tracks*, not clips. Intercept clicks on the
  // clip header (which carries data-clip-id) so the user's explicit choice
  // drives selectedClipId — and Delete never guesses.
  const handleLaneMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const header = target.closest<HTMLElement>('[data-clip-id]');
    if (!header) return;
    const clipId = header.dataset.clipId;
    if (!clipId) return;
    trackController.selectClip(clipId);
  }, []);

  // Paint a clear ring around the single clip the user actually selected so
  // track-level "selected" shading doesn't mislead which clip Delete acts on.
  useEffect(() => {
    const root = laneRef.current;
    if (!root) return;
    const headers = root.querySelectorAll<HTMLElement>('[data-clip-id]');
    const accent = theme.accent || '#3b82f6';
    headers.forEach((el) => {
      if (el.dataset.clipId === selectedClipId) {
        el.style.outline = `2px solid ${accent}`;
        el.style.outlineOffset = '-2px';
        el.style.boxShadow = `0 0 0 2px ${accent}40`;
      } else {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.boxShadow = '';
      }
    });
  }, [selectedClipId, waveformTracks, theme]);

  const groovyWaveformTheme = useMemo(
    () => buildGroovyWaveformTheme(theme, themeName),
    [theme, themeName],
  );

  const renderTrackControls = useCallback(
    (trackIndex: number) => {
      const trackId = waveformTracks[trackIndex]?.id;
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return null;
      return (
        <TrackHead
          track={track}
          theme={theme}
          selected={selectedTrackId === track.id}
          height={trackHeight}
        />
      );
    },
    [waveformTracks, tracks, theme, selectedTrackId, trackHeight],
  );

  return (
    <div
      ref={laneRef}
      onMouseDownCapture={handleLaneMouseDown}
      className="lane-scroll"
      style={{
        // Block layout (not flex) so inner playlist content sizes to its
        // intrinsic height and overflows the lane — otherwise flex-shrink
        // collapses it and the scrollbar never appears.
        height: '100%', minHeight: 0, overflowX: 'hidden', overflowY: 'auto',
        background: theme.trackBg, color: theme.trackName,
        position: 'relative',
        // Contain wfpl's internal stacking (playhead z:100, clip headers z:110)
        // so they don't paint over menubar dropdowns, modals, and transport pill.
        isolation: 'isolate',
      }}
    >
      <BeatsAndBarsProvider bpm={project.bpm} timeSignature={[4, 4]} snapTo={snap}>
        <WaveformPlaylistProvider
          automaticScroll
          controls={{ show: true, width: TRACK_HEAD_WIDTH }}
          effects={masterEffects}
          onTracksChange={handleTracksChange}
          sampleRate={project.sampleRate}
          samplesPerPixel={samplesPerPixel}
          theme={groovyWaveformTheme}
          timescale
          tracks={waveformTracks}
        >
          <EditorBridge appSelectedTrackId={selectedTrackId} />
          <TrackStateSync trackIds={waveformTrackIds} />
          <ClipInteractionProvider snap={snap !== 'off'}>
            <Waveform
              interactiveClips
              recordingState={recordingPreviewState}
              renderTrackControls={renderTrackControls}
              showClipHeaders
            />
          </ClipInteractionProvider>
        </WaveformPlaylistProvider>
      </BeatsAndBarsProvider>

      {!isReady && decodingClipCount > 0 ? (
        <div style={{
          position: 'absolute', top: 8, right: 12,
          padding: '4px 10px',
          background: theme.pillBg, border: `1px solid ${theme.pillBorder}`, borderRadius: 999,
          fontFamily: 'var(--mono)', fontSize: 10,
          color: theme.pillText, letterSpacing: '0.08em', textTransform: 'uppercase',
          pointerEvents: 'none', opacity: 0.9, zIndex: 5,
        }}>
          decoding {decodingClipCount} clip{decodingClipCount === 1 ? '' : 's'}…
        </div>
      ) : null}

      {lastError ? (
        <div style={{
          borderTop: `1px solid ${theme.rule}`, padding: '6px 12px',
          fontFamily: 'var(--mono)', fontSize: 11, color: '#B3261E',
        }}>{lastError}</div>
      ) : null}
    </div>
  );
}
