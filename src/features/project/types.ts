import type { Clip, ClipSourceKind, Project, TakeGroup, Track, TransportState } from "../../types/models";

export interface PersistedAssetReference {
  kind: ClipSourceKind | "externalFile";
  path: string;
}

export interface PersistedClip {
  id: string;
  trackId: string;
  asset: PersistedAssetReference;
  startTime: number;
  duration: number;
  sourceOffset: number;
  name: string;
  muted: boolean;
  takeGroupId?: string;
}

export interface PersistedProjectSelection {
  selectedTrackId: string | null;
  selectedClipId: string | null;
  cursorPosition: number;
}

export interface PersistedProjectFile {
  formatVersion: 1;
  project: Project;
  transport: Pick<TransportState, "metronomeEnabled">;
  tracks: Track[];
  clips: PersistedClip[];
  takeGroups: TakeGroup[];
  selection: PersistedProjectSelection;
}

export interface ProjectPersistenceResult {
  projectDirectoryPath: string;
  projectFilePath: string;
  savedAt: string;
}

export interface PersistedClipLoadResult extends Omit<Clip, "fileUrl"> {
  fileUrl: string;
}
