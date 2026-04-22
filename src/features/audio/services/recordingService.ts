export interface RecordingPrepareOptions {
  inputDeviceId: string | null;
}

export interface RecordingStartResult {
  inputDeviceId: string | null;
  mimeType: string;
}

export interface RecordingStopResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

const MIME_TYPE_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const GET_USER_MEDIA_TIMEOUT_MS = 10_000;

// This service owns only the browser-media capture pipeline.
// The app still owns transport state and clip insertion, so a prepared recorder
// can be started in sync with playback/metronome and then stopped into a normal
// clip object URL later. Speaker playback can still bleed into the mic unless
// headphones are used.
class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private chunks: BlobPart[] = [];
  private startedAtMs: number | null = null;
  private preparedInputDeviceId: string | null = null;
  private preparedMimeType = "audio/webm";
  onStreamLost: (() => void) | null = null;

  isSupported(): boolean {
    return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
  }

  async prepare(options: RecordingPrepareOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("Recording is not supported in this browser or WebView.");
    }

    if (this.mediaRecorder || this.mediaStream) {
      throw new Error("A recording session is already prepared or running.");
    }

    const constraints: MediaStreamConstraints = {
      audio: options.inputDeviceId ? { deviceId: { exact: options.inputDeviceId } } : true,
      video: false,
    };

    const mediaStream = await Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Microphone access timed out after 10 s. Check browser permissions.")),
          GET_USER_MEDIA_TIMEOUT_MS,
        )
      ),
    ]);

    const mimeType = pickSupportedMimeType();
    const mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);

    this.mediaStream = mediaStream;
    this.mediaRecorder = mediaRecorder;
    this.chunks = [];
    this.startedAtMs = null;
    this.preparedInputDeviceId = options.inputDeviceId;
    this.preparedMimeType = mediaRecorder.mimeType || mimeType || "audio/webm";

    mediaStream.addEventListener("inactive", this.handleStreamLost);
    for (const track of mediaStream.getTracks()) {
      track.addEventListener("ended", this.handleStreamLost);
    }

    mediaRecorder.addEventListener("dataavailable", this.handleDataAvailable);
    mediaRecorder.addEventListener("error", this.handleRecorderError);
  }

  async startPrepared(): Promise<RecordingStartResult> {
    const mediaRecorder = this.mediaRecorder;
    if (!mediaRecorder || !this.mediaStream) {
      throw new Error("Recording was not prepared before start.");
    }

    if (mediaRecorder.state !== "inactive") {
      throw new Error("Prepared recording has already started.");
    }

    this.startedAtMs = performance.now();
    mediaRecorder.start();

    return {
      inputDeviceId: this.preparedInputDeviceId,
      mimeType: this.preparedMimeType,
    };
  }

  async stop(): Promise<RecordingStopResult> {
    const mediaRecorder = this.mediaRecorder;
    if (!mediaRecorder) {
      throw new Error("No active recording session to stop.");
    }

    if (mediaRecorder.state === "inactive" && this.startedAtMs === null) {
      this.cleanup();
      throw new Error("Prepared recording never started.");
    }

    return new Promise<RecordingStopResult>((resolve, reject) => {
      const handleError = (event: Event) => {
        this.cleanup();
        this.chunks = [];
        this.startedAtMs = null;
        reject(extractMediaRecorderError(event));
      };

      const handleStop = () => {
        const blob = new Blob(this.chunks, {
          type: mediaRecorder.mimeType || this.preparedMimeType,
        });
        const durationSeconds = this.startedAtMs
          ? Math.max(0.1, (performance.now() - this.startedAtMs) / 1000)
          : 0.1;

        this.cleanup();

        if (blob.size === 0) {
          this.chunks = [];
          this.startedAtMs = null;
          reject(new Error("The recording finished, but no audio data was captured."));
          return;
        }

        const result: RecordingStopResult = {
          blob,
          mimeType: blob.type || this.preparedMimeType,
          durationSeconds,
        };

        this.chunks = [];
        this.startedAtMs = null;
        resolve(result);
      };

      mediaRecorder.addEventListener("stop", handleStop, { once: true });
      mediaRecorder.addEventListener("error", handleError, { once: true });

      if (mediaRecorder.state === "inactive") {
        handleStop();
        return;
      }

      mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (!this.mediaRecorder && !this.mediaStream) {
      return;
    }

    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    }

    this.cleanup();
    this.chunks = [];
    this.startedAtMs = null;
  }

  private cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.removeEventListener("dataavailable", this.handleDataAvailable);
      this.mediaRecorder.removeEventListener("error", this.handleRecorderError);
    }

    if (this.mediaStream) {
      this.mediaStream.removeEventListener("inactive", this.handleStreamLost);
      for (const track of this.mediaStream.getTracks()) {
        track.removeEventListener("ended", this.handleStreamLost);
        track.stop();
      }
    }
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.preparedInputDeviceId = null;
    this.preparedMimeType = "audio/webm";
  }

  private handleStreamLost = () => {
    this.onStreamLost?.();
    this.cleanup();
    this.chunks = [];
    this.startedAtMs = null;
  };

  private handleDataAvailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      this.chunks.push(event.data);
    }
  };

  private handleRecorderError = () => {
    this.cleanup();
  };
}

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return null;
  }

  return MIME_TYPE_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? null;
}

function extractMediaRecorderError(event: Event): Error {
  const recorderEvent = event as Event & {
    error?: DOMException;
  };

  return recorderEvent.error ?? new Error("Recording failed while stopping MediaRecorder.");
}

export const recordingService = new RecordingService();
