interface TimelineTransportApi {
  play: (startAt?: number) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  exportWav?: () => Promise<{ blob: Blob; duration: number }>;
  zoomIn?: () => void;
  zoomOut?: () => void;
}

// audioService is a thin bridge between app controls and the timeline adapter.
// That keeps transport UI independent from waveform-playlist's event emitter.
class AudioService {
  private timelineApi: TimelineTransportApi | null = null;

  registerTimeline(api: TimelineTransportApi): () => void {
    this.timelineApi = api;

    return () => {
      if (this.timelineApi === api) {
        this.timelineApi = null;
      }
    };
  }

  playFrom(time: number): void {
    this.timelineApi?.play(time);
  }

  pause(): void {
    this.timelineApi?.pause();
  }

  stop(): void {
    this.timelineApi?.stop();
  }

  seek(time: number): void {
    this.timelineApi?.seek(time);
  }

  async exportWav(): Promise<{ blob: Blob; duration: number } | null> {
    if (!this.timelineApi?.exportWav) return null;
    return this.timelineApi.exportWav();
  }

  zoomIn(): void {
    this.timelineApi?.zoomIn?.();
  }

  zoomOut(): void {
    this.timelineApi?.zoomOut?.();
  }
}

export const audioService = new AudioService();
