import { listAudioDevices } from "../features/devices/services/deviceService";
import { recordingService } from "../features/audio/services/recordingService";
import { metronomeService } from "../features/audio/services/metronomeService";
import { audioService } from "../features/audio/services/audioService";
import { useGroovyStore } from "../store/useGroovyStore";
import {
  buildDefaultRecordedTakeName,
  projectPersistenceService,
} from "../features/project/services/projectPersistenceService";
import { getBarDurationSeconds, getBeatDurationSeconds } from "../features/timeline/lib/timelineMath";
import { createId } from "../lib/id";

function startMetronomeAtCursor(startTimeSeconds: number) {
  const state = useGroovyStore.getState();
  metronomeService.setEnabled(state.transport.metronomeEnabled);

  if (!state.transport.metronomeEnabled) {
    return;
  }

  void metronomeService.start({
    bpm: state.project.bpm,
    startTimeSeconds,
  });
}

const BEATS_PER_BAR = 4;

export const recordingController = {
  countInTimeoutId: null as number | null,
  countInIntervalId: null as number | null,

  clearCountInTimers() {
    if (this.countInTimeoutId !== null) {
      window.clearTimeout(this.countInTimeoutId);
      this.countInTimeoutId = null;
    }

    if (this.countInIntervalId !== null) {
      window.clearInterval(this.countInIntervalId);
      this.countInIntervalId = null;
    }
  },

  async toggleRecord() {
    const state = useGroovyStore.getState();

    if (state.recording.isRecording) {
      await this.stopRecording();
      return;
    }

    if (state.recording.isCountInActive) {
      this.cancelCountIn();
      return;
    }

    await this.startRecording();
  },

  async startRecording() {
    const state = useGroovyStore.getState();
    const originalCursor = state.cursorPosition;

    try {
      await recordingService.prepare({
        inputDeviceId: state.devices.selectedInputId,
      });

      const refreshedDevices = await listAudioDevices();
      useGroovyStore.getState().setAvailableDevices(refreshedDevices);

      if (useGroovyStore.getState().recording.countInEnabled) {
        this.startCountIn(originalCursor);
        return;
      }

      await this.beginPreparedRecording(originalCursor);
    } catch (error) {
      this.handleRecordingStartFailure(error);
    }
  },

  startCountIn(originalCursor: number) {
    const state = useGroovyStore.getState();
    const totalBeats = state.recording.countInBars * BEATS_PER_BAR;
    const beatDurationSeconds = getBeatDurationSeconds(state.project.bpm);
    const countInDurationMs = getBarDurationSeconds(state.project.bpm) * state.recording.countInBars * 1000;

    this.clearCountInTimers();
    state.startCountIn(totalBeats);

    // Count-in is pre-roll only. The playhead stays anchored at the original
    // cursor while the user hears one bar of clicks before transport starts.
    metronomeService.setEnabled(true);
    void metronomeService.start({
      bpm: state.project.bpm,
      startTimeSeconds: 0,
    });

    let beatsRemaining = totalBeats;
    this.countInIntervalId = window.setInterval(() => {
      beatsRemaining -= 1;

      const nextState = useGroovyStore.getState();
      if (!nextState.recording.isCountInActive) {
        this.clearCountInTimers();
        return;
      }

      if (beatsRemaining > 0) {
        nextState.setCountInBeatsRemaining(beatsRemaining);
      }
    }, beatDurationSeconds * 1000);

    this.countInTimeoutId = window.setTimeout(() => {
      void this.finishCountInAndStart(originalCursor);
    }, countInDurationMs);
  },

  async finishCountInAndStart(originalCursor: number) {
    this.clearCountInTimers();
    metronomeService.stop();

    const state = useGroovyStore.getState();
    if (!state.recording.isCountInActive) {
      return;
    }

    state.finishCountIn();

    try {
      await this.beginPreparedRecording(originalCursor);
    } catch (error) {
      this.handleRecordingStartFailure(error);
    }
  },

  cancelCountIn() {
    this.clearCountInTimers();
    metronomeService.stop();
    audioService.stop();
    recordingService.cancel();

    const state = useGroovyStore.getState();
    state.cancelCountIn();
    state.setTransportStatus("stopped");
  },

  async beginPreparedRecording(startTime: number) {
    const state = useGroovyStore.getState();

    audioService.playFrom(startTime);
    startMetronomeAtCursor(startTime);
    await recordingService.startPrepared();

    // The app owns the canonical recordStartTime. Clip placement later uses
    // this original cursor, not any count-in wall clock offset.
    state.startRecordingSession(startTime, state.devices.selectedInputId);
    state.setTransportStatus("playing");
  },

  handleRecordingStartFailure(error: unknown) {
    this.clearCountInTimers();
    metronomeService.stop();
    audioService.stop();
    recordingService.cancel();

    const state = useGroovyStore.getState();
    state.cancelCountIn();
    state.cancelRecordingSession();
    state.failRecordingSession(error instanceof Error ? error.message : "Recording could not start.");
    state.setTransportStatus("stopped");
  },

  async stopRecording() {
    this.clearCountInTimers();

    const state = useGroovyStore.getState();

    try {
      const result = await recordingService.stop();
      const recordTargetTrack =
        (state.recording.armedTrackId
          ? state.tracks.find((track) => track.id === state.recording.armedTrackId)
          : null) ??
        (state.selectedTrackId ? state.tracks.find((track) => track.id === state.selectedTrackId) : null);

      const clipId = createId("clip");
      const persistedAudio = await projectPersistenceService.persistRecordedAudio({
        blob: result.blob,
        mimeType: result.mimeType,
        preferredBaseName: buildDefaultRecordedTakeName(recordTargetTrack?.name ?? "recording"),
        projectDirectoryPath: state.projectFile.projectDirectoryPath,
        clipId,
      });

      metronomeService.stop();
      audioService.stop();
      state.finishRecordingSession({
        fileUrl: persistedAudio.fileUrl,
        filePath: persistedAudio.filePath,
        durationSeconds: result.durationSeconds,
        mimeType: result.mimeType,
      });
      state.setTransportStatus("stopped");
    } catch (error) {
      metronomeService.stop();
      audioService.stop();
      state.failRecordingSession(error instanceof Error ? error.message : "Recording could not be finalized.");
      state.setTransportStatus("stopped");
    }
  },
};
