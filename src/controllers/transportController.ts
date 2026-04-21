import { audioService } from "../features/audio/services/audioService";
import { metronomeService } from "../features/audio/services/metronomeService";
import { recordingController } from "./recordingController";
import { useGroovyStore } from "../store/useGroovyStore";

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

export const transportController = {
  play() {
    const state = useGroovyStore.getState();
    audioService.playFrom(state.cursorPosition);
    startMetronomeAtCursor(state.cursorPosition);
    state.setTransportStatus("playing");
  },

  pause() {
    const state = useGroovyStore.getState();

    if (state.recording.isCountInActive) {
      recordingController.cancelCountIn();
      state.setTransportStatus("paused");
      return;
    }

    metronomeService.stop();
    audioService.pause();
    state.setTransportStatus("paused");
  },

  stop(options?: { resetCursor?: boolean }) {
    const state = useGroovyStore.getState();

    if (state.recording.isCountInActive) {
      recordingController.cancelCountIn();
      return;
    }

    metronomeService.stop();
    audioService.stop();
    state.setTransportStatus("stopped");

    if (options?.resetCursor ?? true) {
      state.setCursorPosition(0);
    }
  },

  seek(timeSeconds: number) {
    const state = useGroovyStore.getState();
    state.setCursorPosition(timeSeconds);
    audioService.seek(timeSeconds);
  },

  toggleMetronome() {
    const state = useGroovyStore.getState();
    const nextEnabled = !state.transport.metronomeEnabled;
    state.setMetronomeEnabled(nextEnabled);

    if (!nextEnabled) {
      metronomeService.stop();
      return;
    }

    if (state.transport.status === "playing") {
      startMetronomeAtCursor(state.cursorPosition);
    }
  },

  syncMetronomeToTempoIfPlaying(previousBpm: number, nextBpm: number) {
    const state = useGroovyStore.getState();
    if (previousBpm === nextBpm) {
      return;
    }

    if (state.transport.status === "playing" && state.transport.metronomeEnabled) {
      startMetronomeAtCursor(state.transport.currentTime);
    }
  },
};
