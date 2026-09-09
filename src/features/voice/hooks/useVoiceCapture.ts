import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RECORDING_MS = 30_000;

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

export interface VoiceCaptureResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface UseVoiceCaptureOptions {
  onComplete: (result: VoiceCaptureResult) => void;
  onError?: (error: Error) => void;
}

export function useVoiceCapture({ onComplete, onError }: UseVoiceCaptureOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const cancelRef = useRef<boolean>(false);
  const autoStopRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onError?.(new Error("Microphone access is not supported in this browser."));
      return;
    }
    const mimeType = pickMimeType();
    if (mimeType === null) {
      onError?.(new Error("MediaRecorder is not available in this browser."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      startedAtRef.current = performance.now();

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const durationMs = performance.now() - startedAtRef.current;
        const cancelled = cancelRef.current;
        const blob = new Blob(chunksRef.current, { type: actualMime });
        cleanup();
        setIsRecording(false);
        if (!cancelled && blob.size > 0) {
          onComplete({ blob, mimeType: actualMime, durationMs });
        }
      });
      recorder.addEventListener("error", (event) => {
        const err = (event as unknown as { error?: Error }).error;
        onError?.(err instanceof Error ? err : new Error("Recording failed."));
        cleanup();
        setIsRecording(false);
      });

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      autoStopRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, MAX_RECORDING_MS);
    } catch (error) {
      cleanup();
      setIsRecording(false);
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : error instanceof Error
            ? error.message
            : "Could not start recording.";
      onError?.(new Error(message));
    }
  }, [cleanup, onComplete, onError]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    cancelRef.current = false;
    recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      cleanup();
      setIsRecording(false);
      return;
    }
    cancelRef.current = true;
    recorder.stop();
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { isRecording, start, stop, cancel };
}
