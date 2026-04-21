declare module "waveform-playlist" {
  export interface WaveformPlaylistEventEmitter {
    emit(event: string, ...args: unknown[]): void;
    on(event: string, handler: (...args: any[]) => void): void;
    off?(event: string, handler: (...args: any[]) => void): void;
  }

  export interface WaveformPlaylistTrackInput {
    src: string | Blob | File | AudioBuffer;
    name?: string;
    gain?: number;
    muted?: boolean;
    soloed?: boolean;
    start?: number;
    cuein?: number;
    cueout?: number;
    customClass?: string;
    waveOutlineColor?: string;
    peaks?: {
      type: "WebAudio";
      mono: boolean;
    };
    states?: {
      cursor?: boolean;
      select?: boolean;
      shift?: boolean;
      fadein?: boolean;
      fadeout?: boolean;
    };
  }

  export interface WaveformPlaylistTrackInstance {
    name?: string;
    customClass?: string;
    startTime?: number;
  }

  export interface WaveformPlaylistOptions {
    container: HTMLElement;
    ac?: AudioContext;
    sampleRate?: number;
    samplesPerPixel?: number;
    mono?: boolean;
    waveHeight?: number;
    collapsedWaveHeight?: number;
    barWidth?: number;
    barGap?: number;
    state?: "cursor" | "select" | "shift" | "fadein" | "fadeout";
    timescale?: boolean;
    colors?: {
      waveOutlineColor?: string;
      timeColor?: string;
      fadeColor?: string;
    };
    controls?: {
      show: boolean;
      width?: number;
      widgets?: {
        muteOrSolo?: boolean;
        volume?: boolean;
        stereoPan?: boolean;
        collapse?: boolean;
        remove?: boolean;
      };
    };
    zoomLevels?: number[];
    seekStyle?: "line" | "fill";
  }

  export interface WaveformPlaylistInstance {
    load(trackList: WaveformPlaylistTrackInput[]): Promise<void>;
    getEventEmitter(): WaveformPlaylistEventEmitter;
  }

  export type WaveformPlaylistFactory = (
    options: WaveformPlaylistOptions,
    ee?: WaveformPlaylistEventEmitter,
  ) => WaveformPlaylistInstance;

  const waveformPlaylistModule:
    | WaveformPlaylistFactory
    | {
        default?: WaveformPlaylistFactory;
        init?: WaveformPlaylistFactory;
      };

  export default waveformPlaylistModule;
}
