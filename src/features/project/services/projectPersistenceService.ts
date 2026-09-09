// Browser-only stubs: Tauri file APIs are unavailable in V2.
const convertFileSrc = (filePath: string): string => filePath;
const join = async (...segments: string[]): Promise<string> => segments.filter(Boolean).join("/");
import { createId } from "../../../lib/id";
import { createInitialGroovyState } from "../../../lib/mockProject";
import type { Clip, TakeGroup } from "../../../types/models";
import type { PersistedClip, PersistedProjectFile, ProjectPersistenceResult } from "../types";
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
import {
  audioBlobStore,
  buildAudioKey,
  isIdbUrl,
  keyFromIdbUrl,
} from "./audioBlobStore";

interface RecordedAssetResult {
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
    projectId?: string;
  }): Promise<RecordedAssetResult> {
    if (!isTauriRuntime()) {
      const projectId = options.projectId ?? localProjectSnapshot.getActiveId();
      const fileUrl = URL.createObjectURL(options.blob);
      if (!projectId) {
        return { fileUrl, filePath: null, mimeType: options.mimeType, persisted: false };
      }
      const blobId = createId("aud");
      const key = buildAudioKey(projectId, blobId);
      try {
        await audioBlobStore.putBlob(key, options.blob, options.mimeType);
        return {
          fileUrl,
          filePath: `idb://${key}`,
          mimeType: options.mimeType,
          persisted: true,
        };
      } catch {
        return { fileUrl, filePath: null, mimeType: options.mimeType, persisted: false };
      }
    }

    const bytes = new Uint8Array(await options.blob.arrayBuffer());
    const extension = await inferExtensionFromMimeType(options.mimeType);
    const fileName = `${options.preferredBaseName}-${Date.now()}.${extension}`;
    const targetDirectoryPath =
      options.projectDirectoryPath ?? (await buildScratchAudioDirectory());

    if (!targetDirectoryPath) {
      return {
        fileUrl: URL.createObjectURL(options.blob),
        filePath: null,
        mimeType: options.mimeType,
        persisted: false,
      };
    }

    const targetPath = options.projectDirectoryPath
      ? await buildProjectAudioPath(targetDirectoryPath, fileName)
      : await join(targetDirectoryPath, fileName);

    await writeBinaryFile({ targetPath, bytes });

    return {
      fileUrl: await createRuntimeAssetUrl(targetPath),
      filePath: targetPath,
      mimeType: options.mimeType,
      persisted: true,
    };
  }

  async persistImportedAudio(options: {
    blob: Blob;
    mimeType: string;
    projectId?: string;
  }): Promise<{ fileUrl: string; filePath: string | null }> {
    const projectId = options.projectId ?? localProjectSnapshot.getActiveId();
    const fileUrl = URL.createObjectURL(options.blob);
    if (!projectId || isTauriRuntime()) {
      return { fileUrl, filePath: null };
    }
    const blobId = createId("aud");
    const key = buildAudioKey(projectId, blobId);
    try {
      await audioBlobStore.putBlob(key, options.blob, options.mimeType);
      return { fileUrl, filePath: `idb://${key}` };
    } catch {
      return { fileUrl, filePath: null };
    }
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

// ---------------------------------------------------------------------------
// Browser multi-project registry.
// LocalStorage keys:
//   groovy.v2.projects          — ProjectListEntry[]
//   groovy.v2.project.<id>      — LocalSnapshotShape (per project)
//   groovy.v2.activeProjectId   — string
// Audio blobs live in IndexedDB, keyed `<projectId>:<blobId>`.
// ---------------------------------------------------------------------------

const PROJECTS_KEY = "groovy.v2.projects";
const ACTIVE_KEY = "groovy.v2.activeProjectId";
const PROJECT_KEY_PREFIX = "groovy.v2.project.";
const LEGACY_SNAPSHOT_KEY = "groovy.v2.snapshot.v1";

export interface ProjectListEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalSnapshotShape {
  project: ReturnType<typeof useGroovyStore.getState>["project"];
  tracks: ReturnType<typeof useGroovyStore.getState>["tracks"];
  clips: Record<string, Clip>;
  takeGroups: Record<string, TakeGroup>;
  cursorPosition: number;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  transport: { metronomeEnabled: boolean };
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readList(): ProjectListEntry[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectListEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(list: ProjectListEntry[]): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

function writeSnapshot(id: string, snapshot: LocalSnapshotShape): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(PROJECT_KEY_PREFIX + id, JSON.stringify(snapshot));
}

function readSnapshot(id: string): LocalSnapshotShape | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(PROJECT_KEY_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSnapshotShape;
  } catch {
    return null;
  }
}

function migrateLegacySnapshot(): void {
  if (!hasWindow()) return;
  const existing = readList();
  if (existing.length > 0) return;
  const legacyRaw = window.localStorage.getItem(LEGACY_SNAPSHOT_KEY);
  if (!legacyRaw) return;
  try {
    const legacy = JSON.parse(legacyRaw) as LocalSnapshotShape;
    const id = createId("proj");
    const now = Date.now();
    const entry: ProjectListEntry = {
      id,
      name: legacy.project?.name ?? "Untitled",
      createdAt: now,
      updatedAt: now,
    };
    writeList([entry]);
    writeSnapshot(id, legacy);
    window.localStorage.setItem(ACTIVE_KEY, id);
    window.localStorage.removeItem(LEGACY_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

function snapshotFromStore(): LocalSnapshotShape {
  const state = useGroovyStore.getState();
  return {
    project: state.project,
    tracks: state.tracks,
    clips: { ...state.clips },
    takeGroups: state.takeGroups,
    cursorPosition: state.cursorPosition,
    selectedTrackId: state.selectedTrackId,
    selectedClipId: state.selectedClipId,
    transport: { metronomeEnabled: state.transport.metronomeEnabled },
  };
}

export const localProjectSnapshot = {
  init(): { activeId: string; snapshot: LocalSnapshotShape | null } {
    migrateLegacySnapshot();
    let list = readList();
    let activeId = hasWindow() ? window.localStorage.getItem(ACTIVE_KEY) : null;

    if (!activeId || !list.some((p) => p.id === activeId)) {
      if (list.length === 0) {
        const id = createId("proj");
        const now = Date.now();
        list = [{ id, name: "Untitled", createdAt: now, updatedAt: now }];
        writeList(list);
      }
      activeId = list[0].id;
      if (hasWindow()) window.localStorage.setItem(ACTIVE_KEY, activeId);
    }

    return { activeId, snapshot: readSnapshot(activeId) };
  },

  getActiveId(): string | null {
    if (!hasWindow()) return null;
    return window.localStorage.getItem(ACTIVE_KEY);
  },

  setActiveId(id: string): void {
    if (!hasWindow()) return;
    window.localStorage.setItem(ACTIVE_KEY, id);
  },

  listProjects(): ProjectListEntry[] {
    return readList().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createProject(name: string): ProjectListEntry {
    const id = createId("proj");
    const now = Date.now();
    const entry: ProjectListEntry = {
      id,
      name: name.trim() || "Untitled",
      createdAt: now,
      updatedAt: now,
    };
    const list = [...readList(), entry];
    writeList(list);
    return entry;
  },

  renameProject(id: string, name: string): void {
    const list = readList().map((p) =>
      p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p,
    );
    writeList(list);
  },

  async deleteProject(id: string): Promise<void> {
    const list = readList().filter((p) => p.id !== id);
    writeList(list);
    if (hasWindow()) {
      window.localStorage.removeItem(PROJECT_KEY_PREFIX + id);
      if (window.localStorage.getItem(ACTIVE_KEY) === id) {
        const nextId = list[0]?.id ?? null;
        if (nextId) window.localStorage.setItem(ACTIVE_KEY, nextId);
        else window.localStorage.removeItem(ACTIVE_KEY);
      }
    }
    try {
      await audioBlobStore.deleteByProject(id);
    } catch {
      // ignore
    }
  },

  loadSnapshot(id: string): LocalSnapshotShape | null {
    return readSnapshot(id);
  },

  saveActive(): void {
    if (!hasWindow()) return;
    const activeId = window.localStorage.getItem(ACTIVE_KEY);
    if (!activeId) return;
    try {
      const snapshot = snapshotFromStore();
      writeSnapshot(activeId, snapshot);
      const list = readList().map((p) =>
        p.id === activeId
          ? { ...p, name: snapshot.project?.name ?? p.name, updatedAt: Date.now() }
          : p,
      );
      writeList(list);
    } catch {
      // ignore
    }
  },

  clearActive(): void {
    if (!hasWindow()) return;
    const activeId = window.localStorage.getItem(ACTIVE_KEY);
    if (activeId) window.localStorage.removeItem(PROJECT_KEY_PREFIX + activeId);
  },
};

// Rehydrates `idb://` clip references into usable object URLs. Returns the
// refreshed clips map plus the list of object URLs created so callers can
// revoke them on teardown.
export async function rehydrateSnapshotClips(
  clips: Record<string, Clip>,
): Promise<{ clips: Record<string, Clip>; createdUrls: string[] }> {
  const next: Record<string, Clip> = {};
  const createdUrls: string[] = [];
  for (const [id, clip] of Object.entries(clips)) {
    if (isIdbUrl(clip.filePath ?? undefined)) {
      const key = keyFromIdbUrl(clip.filePath as string);
      try {
        const blob = await audioBlobStore.getBlob(key);
        if (blob) {
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          next[id] = { ...clip, fileUrl: url };
          continue;
        }
      } catch {
        // fall through to missing
      }
      next[id] = { ...clip, fileUrl: "" };
    } else {
      next[id] = clip;
    }
  }
  return { clips: next, createdUrls };
}
