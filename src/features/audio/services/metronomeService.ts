import { getBeatDurationSeconds } from "../../timeline/lib/timelineMath";

interface StartMetronomeOptions {
  bpm: number;
  startTimeSeconds: number;
}

// The metronome is intentionally simple: it uses short Web Audio clicks and a
// lightweight scheduler that is stable enough for a student demo, not a full
// DAW-grade clock. Beat 1 is accented with a higher pitch and slightly louder
// click so loop recording is easier to follow.
class MetronomeService {
  private audioContext: AudioContext | null = null;
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private nextBeatIndex = 0;
  private bpm = 120;
  private isEnabled = false;

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (!enabled) {
      this.stop();
    }
  }

  async start(options: StartMetronomeOptions): Promise<void> {
    this.bpm = options.bpm;

    if (!this.isEnabled) {
      return;
    }

    const context = this.ensureContext();
    await context.resume();

    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    const beatDuration = getBeatDurationSeconds(options.bpm);
    const completedBeats = Math.floor(options.startTimeSeconds / beatDuration);
    const secondsIntoBeat = options.startTimeSeconds - completedBeats * beatDuration;
    const secondsUntilNextBeat = secondsIntoBeat === 0 ? 0 : beatDuration - secondsIntoBeat;

    this.nextBeatIndex = completedBeats;
    this.nextNoteTime = context.currentTime + Math.max(0.02, secondsUntilNextBeat);

    if (secondsIntoBeat === 0) {
      this.scheduleClick(context.currentTime + 0.02, this.nextBeatIndex);
      this.nextBeatIndex += 1;
      this.nextNoteTime += beatDuration;
    }

    this.schedulerId = window.setInterval(() => {
      this.scheduleAhead();
    }, 50);
  }

  stop(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduleAhead(): void {
    if (!this.isEnabled) {
      return;
    }

    const context = this.audioContext;
    if (!context) {
      return;
    }

    const beatDuration = getBeatDurationSeconds(this.bpm);
    const lookAheadSeconds = 0.15;

    while (this.nextNoteTime < context.currentTime + lookAheadSeconds) {
      this.scheduleClick(this.nextNoteTime, this.nextBeatIndex);
      this.nextNoteTime += beatDuration;
      this.nextBeatIndex += 1;
    }
  }

  private scheduleClick(time: number, beatIndex: number): void {
    const context = this.audioContext;
    if (!context) {
      return;
    }

    const isBarStart = beatIndex % 4 === 0;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = isBarStart ? 1760 : 1320;

    gain.gain.setValueAtTime(isBarStart ? 0.2 : 0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.06);
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    return this.audioContext;
  }
}

export const metronomeService = new MetronomeService();
