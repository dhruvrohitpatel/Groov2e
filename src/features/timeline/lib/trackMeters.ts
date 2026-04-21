import { Tone } from "@waveform-playlist/browser";
import type { TrackEffectsFunction } from "@waveform-playlist/playout";

type ToneMeter = InstanceType<typeof Tone.Meter>;

// Maintains a persistent Tone.Meter per track ID. wfpl's engine calls the
// returned TrackEffectsFunction whenever it (re)builds a track's audio graph,
// and we keep the same Meter instance across rebuilds so the mixer UI can
// subscribe to it stably.
class TrackMeterRegistry {
  private meters = new Map<string, ToneMeter>();

  getOrCreateMeter(trackId: string): ToneMeter {
    let meter = this.meters.get(trackId);
    if (!meter) {
      meter = new Tone.Meter({ channels: 2, normalRange: false, smoothing: 0.8 });
      this.meters.set(trackId, meter);
    }
    return meter;
  }

  getMeter(trackId: string): ToneMeter | null {
    return this.meters.get(trackId) ?? null;
  }

  dispose(trackId: string) {
    const meter = this.meters.get(trackId);
    if (meter) {
      meter.dispose();
      this.meters.delete(trackId);
    }
  }

  pruneMissing(trackIds: Set<string>) {
    for (const id of Array.from(this.meters.keys())) {
      if (!trackIds.has(id)) this.dispose(id);
    }
  }

  effectsFor(trackId: string): TrackEffectsFunction {
    return (graphEnd, destination, isOffline) => {
      if (isOffline) {
        // Don't tap during offline export; keep the audio path clean.
        (graphEnd as unknown as { connect: (node: unknown) => void }).connect(destination);
        return;
      }
      const meter = this.getOrCreateMeter(trackId);
      const gEnd = graphEnd as unknown as { connect: (node: unknown) => void; disconnect: (node: unknown) => void };
      gEnd.connect(destination);
      gEnd.connect(meter as unknown as never);
      return () => {
        try { gEnd.disconnect(destination); } catch { /* noop */ }
        try { gEnd.disconnect(meter as unknown as never); } catch { /* noop */ }
      };
    };
  }
}

export const trackMeterRegistry = new TrackMeterRegistry();
