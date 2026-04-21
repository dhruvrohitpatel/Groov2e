import type { AudioDeviceOption } from "../../../types/models";

// Device discovery stays separate from UI so it can later be reused by
// recording setup, preferences, or a Tauri-native device layer.
export interface ListedDevices {
  inputs: AudioDeviceOption[];
  outputs: AudioDeviceOption[];
  outputSelectionSupported: boolean;
  error: string | null;
}

function supportsOutputSelection(): boolean {
  return typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
}

export async function listAudioDevices(): Promise<ListedDevices> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return {
      inputs: [],
      outputs: [],
      outputSelectionSupported: false,
      error: "Device enumeration is not supported in this environment.",
    };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return {
      inputs: devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Input ${index + 1}`,
          kind: "audioinput" as const,
        })),
      outputs: devices
        .filter((device) => device.kind === "audiooutput")
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Output ${index + 1}`,
          kind: "audiooutput" as const,
        })),
      outputSelectionSupported: supportsOutputSelection(),
      error: null,
    };
  } catch (error) {
    return {
      inputs: [],
      outputs: [],
      outputSelectionSupported: supportsOutputSelection(),
      error: error instanceof Error ? error.message : "Could not list audio devices.",
    };
  }
}
