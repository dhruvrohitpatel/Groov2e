// Browser-only stubs: Tauri file APIs are unavailable in V2.
const convertFileSrc = (filePath: string): string => filePath;
const join = async (...segments: string[]): Promise<string> => segments.filter(Boolean).join("/");
import { createId } from "../../../lib/id";
import { createInitialGroovyState } from "../../../lib/mockProject";
import type { Clip, TakeGroup } from "../../../types/models";
import type { PersistedClip, PersistedProjectFile, ProjectPersistenceResult } from "../types";
import { putBlob, IDB_PREFIX } from "./audioBlobStore";
import { getOrCreateUrl } from "../../audio/services/blobUrlRegistry";
import {
  buildProjectAudioPath,
  buildScratchAudioDirectory,
  copyIntoProjectAudioFolder,
  createRuntimeAssetUrl,
  ensureDirectory,
  fileExists,
  inferExtensionFromMimeType,
  inferExtensionFromPath,
  isTauriRuntime,
  readTextFile,
  resolveProjectFilePath,
  writeBinaryFile,
  writeTextFile,
} from "./tauriPersistenceService";
import { useGroovyStore } from "../../../store/useGroovyStore";

export interface RecordedAssetResult {
  fileUrl: string;
  filePath: string | null;
  mimeType: string;
  persisted: boolean;
}

interface SaveProjectBundleResult {
  persistence: ProjectPersistenceResult;
  runtimeClips: Record<string, Clip>;
}

// This service owns project/audio durability. Controllers call into it so the
// rest of the app can keep thinking in DAW state instead of file-system rules.
class ProjectPersistenceService {
  async persistRecordedAudio(options: {
    blob: Blob;
    mimeType: string;
    preferredBaseName: string;
    projectDirectoryPath: string | null;
    clipId: string;
  }): Promise<RecordedAssetResult> {
    if (!isTauriRuntime()) {
      await putBlob(options.clipId, options.blob);
      return {
        fileUrl: getOrCreateUrl(options.clipId, options.blob),
        filePath: `${IDB_PREFIX}${options.clipId}`,
        mimeType: options.mimeType,
        persisted: true,
      };
    }

    const bytes = new Uint8Array(await options.blob.arrayBuffer());
    const extension = await inferExtensionFromMimeType(options.mimeType);
    const fileName = `${options.preferredBaseName}-${Date.now()}.${extension}`;
    const targetDirectoryPath =
      options.projectDirectoryPath ?? (await buildScratchAudioDirectory());

    if (!targetDirectoryPath) {
      await putBlob(options.clipId, options.blob);
      return {
        fileUrl: getOrCreateUrl(options.clipId, options.blob),
        filePath: `${IDB_PREFIX}${options.clipId}`,
        mimeType: options.mimeType,
        persisted: true,
      };
    }

    const targetPath = options.projectDirectoryPath
      ? await buildProjectAudioPath(targetDirectoryPath, fileName)
      : await join(targetDirectoryPath, fileName);

    await writeBinaryFile({
      targetPath,
      bytes,
    });

    return {
      fileUrl: await createRuntimeAssetUrl(targetPath),
      filePath: targetPath,
      mimeType: options.mimeType,
      persisted: true,
    };
  }

  async saveProjectBundle(projectDirectoryPath: string): Promise<SaveProjectBundleResult> {
    const state = useGroovyStore.getState();
    await ensureDirectory(projectDirectoryPath);

    const runtimeClips: Record<string, Clip> = {};
    const persistedClips: PersistedClip[] = [];

    for (const clip of Object.values(state.clips)) {
      const persistedClip = await this.persistClipForProject(clip, projectDirectoryPath);
      runtimeClips[clip.id] = persistedClip.runtimeClip;
      persistedClips.push(persistedClip.persistedClip);
    }

    const projectFilePath = await resolveProjectFilePath(projectDirectoryPath);
    const persistedProject: PersistedProjectFile = {
      formatVersion: 1,
      project: state.project,
      transport: {
        metronomeEnabled: state.transport.metronomeEnabled,
      },
      tracks: state.tracks,
      clips: persistedClips,
      takeGroups: Object.values(state.takeGroups),
      selection: {
        selectedTrackId: state.selectedTrackId,
        selectedClipId: state.selectedClipId,
        cursorPosition: state.cursorPosition,
      },
    };

    await writeTextFile(projectFilePath, JSON.stringify(persistedProject, null, 2));

    return {
      runtimeClips,
      persistence: {
        projectDirectoryPath,
        projectFilePath,
        savedAt: new Date().toISOString(),
      },
    };
  }

  async openProjectBundle(projectDirectoryPath: string) {
    const projectFilePath = await resolveProjectFilePath(projectDirectoryPath);
    const projectJson = await readTextFile(projectFilePath);
    const persistedProject = JSON.parse(projectJson) as PersistedProjectFile;
    const initialTimeline = createInitialGroovyState().timeline;
    const runtimeClips: Record<string, Clip> = {};

    for (const clip of persistedProject.clips) {
      runtimeClips[clip.id] = await this.restoreClipFromPersisted(projectDirectoryPath, clip);
    }

    const takeGroups = Object.fromEntries(
      persistedProject.takeGroups.map((group) => [group.id, normalizeTakeGroup(group, runtimeClips)]),
    );

    return {
      project: persistedProject.project,
      transport: {
        ...createInitialGroovyState().transport,
        ...persistedProject.transport,
      },
      tracks: persistedProject.tracks.map((track) => ({
        ...track,
        pan: track.pan ?? 0,
      })),
      clips: runtimeClips,
      takeGroups,
      selectedTrackId: persistedProject.selection.selectedTrackId,
      selectedClipId: persistedProject.selection.selectedClipId,
      cursorPosition: persistedProject.selection.cursorPosition,
      timeline: {
        ...initialTimeline,
      },
      projectFile: {
        projectDirectoryPath,
        projectFilePath,
        lastSavedAt: new Date().toISOString(),
        lastError: null,
      },
    };
  }

  private async persistClipForProject(clip: Clip, projectDirectoryPath: string) {
    if (clip.sourceKind === "file" && clip.filePath) {
      const extension = await inferExtensionFromPath(clip.filePath);
      const targetFileName = `${clip.id}.${extension}`;
      const projectAudioPath = await copyIntoProjectAudioFolder(clip.filePath, projectDirectoryPath, targetFileName);

      return {
        runtimeClip: {
          ...clip,
          filePath: projectAudioPath,
          fileUrl: await createRuntimeAssetUrl(projectAudioPath),
          sourceKind: "file" as const,
        },
        persistedClip: {
          id: clip.id,
          trackId: clip.trackId,
          asset: {
            kind: "file" as const,
            path: `audio/${targetFileName}`,
          },
          startTime: clip.startTime,
          duration: clip.duration,
          sourceOffset: clip.sourceOffset,
          name: clip.name,
          muted: clip.muted,
          takeGroupId: clip.takeGroupId,
        },
      };
    }

    return {
      runtimeClip: clip,
      persistedClip: {
        id: clip.id,
        trackId: clip.trackId,
        asset: clip.filePath
          ? {
              kind: "externalFile" as const,
              path: clip.filePath,
            }
          : {
              kind: "appAsset" as const,
              path: clip.fileUrl,
            },
        startTime: clip.startTime,
        duration: clip.duration,
        sourceOffset: clip.sourceOffset,
        name: clip.name,
        muted: clip.muted,
        takeGroupId: clip.takeGroupId,
      },
    };
  }

  private async restoreClipFromPersisted(projectDirectoryPath: string, clip: PersistedClip): Promise<Clip> {
    if (clip.asset.kind === "file") {
      const absolutePath = await join(projectDirectoryPath, clip.asset.path);
      const exists = await fileExists(absolutePath);

      if (!exists) {
        throw new Error(`Missing project audio asset: ${clip.asset.path}`);
      }

      return {
        ...clip,
        filePath: absolutePath,
        fileUrl: convertFileSrc(absolutePath),
        sourceKind: "file",
      };
    }

    if (clip.asset.kind === "externalFile") {
      const exists = await fileExists(clip.asset.path);

      if (!exists) {
        throw new Error(`Missing external audio asset: ${clip.asset.path}`);
      }

      return {
        ...clip,
        filePath: clip.asset.path,
        fileUrl: convertFileSrc(clip.asset.path),
        sourceKind: "file",
      };
    }

    return {
      ...clip,
      filePath: null,
      fileUrl: clip.asset.path,
      sourceKind: "appAsset",
    };
  }
}

function normalizeTakeGroup(group: TakeGroup, clips: Record<string, Clip>): TakeGroup {
  const clipIds = group.clipIds.filter((clipId) => Boolean(clips[clipId]));
  const activeClipId =
    group.activeClipId && clipIds.includes(group.activeClipId)
      ? group.activeClipId
      : clipIds.find((clipId) => !clips[clipId]?.muted) ?? null;

  return {
    ...group,
    activeClipId,
    clipIds,
  };
}

export function buildDefaultRecordedTakeName(trackName: string): string {
  return `${trackName.replace(/\s+/g, "-").toLowerCase() || "track"}-take-${createId("rec")}`;
}

export const projectPersistenceService = new ProjectPersistenceService();

/**
 * Browser localStorage snapshot for V2. Persists a slim subset of state
 * (project metadata, tracks, app-asset clips, cursor) so a reload restores
 * the last layout. Object URLs for imported files cannot survive a reload,
 * so those clips are skipped on save.
 */
const LOCAL_SNAPSHOT_KEY = "groovy.v2.snapshot.v1";

interface LocalSnapshotShape {
  version: number;
  project: ReturnType<typeof useGroovyStore.getState>["project"];
  tracks: ReturnType<typeof useGroovyStore.getState>["tracks"];
  clips: Record<string, Clip>;
  takeGroups: Record<string, TakeGroup>;
  cursorPosition: number;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  transport: { metronomeEnabled: boolean };
}

export const localProjectSnapshot = {
  _lastSavedVersion: 0,

  save() {
    if (typeof window === "undefined") return;
    try {
      const state = useGroovyStore.getState();
      const persistableClips: Record<string, Clip> = {};
      for (const [id, clip] of Object.entries(state.clips)) {
        if (clip.sourceKind === "appAsset" || (clip.sourceKind === "file" && clip.filePath)) {
          persistableClips[id] = clip;
        }
      }
      const nextVersion = this._lastSavedVersion + 1;
      const snapshot: LocalSnapshotShape = {
        version: nextVersion,
        project: state.project,
        tracks: state.tracks,
        clips: persistableClips,
        takeGroups: state.takeGroups,
        cursorPosition: state.cursorPosition,
        selectedTrackId: state.selectedTrackId,
        selectedClipId: state.selectedClipId,
        transport: { metronomeEnabled: state.transport.metronomeEnabled },
      };
      window.localStorage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(snapshot));
      this._lastSavedVersion = nextVersion;
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError") {
        import("../../../store/useUiStore").then(({ useUiStore }) => {
          useUiStore.getState().showToast("Storage full — delete projects to continue.", "error");
        });
      }
    }
  },

  load(): LocalSnapshotShape | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LOCAL_SNAPSHOT_KEY);
      if (!raw) return null;
      const snapshot = JSON.parse(raw) as LocalSnapshotShape;
      this._lastSavedVersion = snapshot.version ?? 0;
      return snapshot;
    } catch {
      return null;
    }
  },

  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LOCAL_SNAPSHOT_KEY);
    this._lastSavedVersion = 0;
  },

  listenForCrossTabChanges() {
    if (typeof window === "undefined") return;
    window.addEventListener("storage", (event) => {
      if (event.key !== LOCAL_SNAPSHOT_KEY || event.newValue === null) return;
      try {
        const incoming = JSON.parse(event.newValue) as LocalSnapshotShape;
        // Only notify if the version advanced beyond what this tab last wrote.
        if ((incoming.version ?? 0) > this._lastSavedVersion) {
          import("../../../store/useUiStore").then(({ useUiStore }) => {
            useUiStore.getState().showToast(
              "Another tab saved changes to this project. Reload to get the latest state.",
              "warn",
            );
          });
        }
      } catch { /* ignore malformed storage events */ }
    });
  },
};
