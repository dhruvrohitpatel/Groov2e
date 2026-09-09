import { getGlobalAudioContext } from "@waveform-playlist/playout";
import { audioService } from "../features/audio/services/audioService";
import { metronomeService } from "../features/audio/services/metronomeService";
import { createInitialGroovyState } from "../lib/mockProject";
import {
  projectPersistenceService,
  BUNDLE_SIZE_WARN_BYTES,
} from "../features/project/services/projectPersistenceService";
import { BundleValidationError } from "../features/project/services/projectBundleSchema";
import {
  chooseProjectDirectoryForOpen,
  chooseProjectDirectoryForSave,
  isTauriRuntime,
} from "../features/project/services/tauriPersistenceService";
import { loadSnapshot as loadAutosaveSnapshot } from "../features/project/services/autosaveHistoryStore";
import { useGroovyStore } from "../store/useGroovyStore";
import { useUiStore } from "../store/useUiStore";

function stopTransportForProjectChange() {
  metronomeService.stop();
  audioService.stop();
}

function applyProjectResetState() {
  const currentState = useGroovyStore.getState();
  const nextState = createInitialGroovyState();

  currentState.replaceProjectState({
    project: nextState.project,
    transport: nextState.transport,
    tracks: nextState.tracks,
    clips: nextState.clips,
    takeGroups: nextState.takeGroups,
    selectedTrackId: nextState.selectedTrackId,
    selectedClipId: nextState.selectedClipId,
    cursorPosition: nextState.cursorPosition,
    timeline: nextState.timeline,
    projectFile: nextState.projectFile,
  });

  useGroovyStore.setState({
    devices: currentState.devices,
    chatMessages: nextState.chatMessages,
    agentRequest: {
      isLoading: false,
      lastPayload: null,
      lastKnownTransportStatus: nextState.transport.status,
    },
  });
}

export const projectController = {
  async newProject() {
    stopTransportForProjectChange();
    applyProjectResetState();
  },

  async openProject() {
    const state = useGroovyStore.getState();

    try {
      const selectedDirectory = await chooseProjectDirectoryForOpen();
      if (!selectedDirectory) {
        return;
      }

      stopTransportForProjectChange();
      const openedProject = await projectPersistenceService.openProjectBundle(selectedDirectory);
      state.replaceProjectState(openedProject);
      state.setProjectFileState({
        lastError: null,
      });
    } catch (error) {
      state.setProjectFileState({
        lastError: error instanceof Error ? error.message : "Project could not be opened.",
      });
    }
  },

  async openProjectFile(file: File, opts?: { skipValidation?: boolean }) {
    const state = useGroovyStore.getState();

    try {
      stopTransportForProjectChange();
      const openedProject = await projectPersistenceService.openBrowserProjectBundle(file, opts);
      state.replaceProjectState(openedProject);
      state.setProjectFileState({
        lastError: null,
      });
    } catch (error) {
      if (error instanceof BundleValidationError) {
        const forceLoad = typeof window !== "undefined"
          ? window.confirm(`${error.message}\n\nLoad anyway?`)
          : false;
        if (forceLoad) {
          await this.openProjectFile(file, { skipValidation: true });
          return;
        }
        useUiStore.getState().showToast(error.message, "error");
        return;
      }
      state.setProjectFileState({
        lastError: error instanceof Error ? error.message : "Project could not be opened.",
      });
    }
  },

  async restoreAutosaveSnapshot(id: number) {
    const state = useGroovyStore.getState();
    try {
      const snapshot = await loadAutosaveSnapshot(id);
      if (!snapshot || typeof snapshot !== "object") {
        useUiStore.getState().showToast("That autosave snapshot could not be loaded.", "error");
        return;
      }
      stopTransportForProjectChange();
      useGroovyStore.setState(snapshot as Parameters<typeof useGroovyStore.setState>[0]);
      state.setProjectFileState({ lastError: null, savingState: "idle", isDirty: false });
      useUiStore.getState().showToast("Restored autosave snapshot.", "info");
    } catch (error) {
      useUiStore.getState().showToast(
        error instanceof Error ? error.message : "Restore failed.",
        "error",
      );
    }
  },

  async saveProject() {
    const state = useGroovyStore.getState();
    const existingDirectory = state.projectFile.projectDirectoryPath;

    if (!isTauriRuntime()) {
      await saveBrowserProjectDownload();
      return;
    }

    if (!existingDirectory) {
      await this.saveProjectAs();
      return;
    }

    state.setProjectFileState({ savingState: "saving" });
    try {
      const result = await projectPersistenceService.saveProjectBundle(existingDirectory);
      useGroovyStore.setState({
        clips: result.runtimeClips,
      });
      state.setProjectFileState({
        projectDirectoryPath: result.persistence.projectDirectoryPath,
        projectFilePath: result.persistence.projectFilePath,
        lastSavedAt: result.persistence.savedAt,
        lastError: null,
        isDirty: false,
        savingState: "idle",
      });
    } catch (error) {
      state.setProjectFileState({
        lastError: error instanceof Error ? error.message : "Project could not be saved.",
        savingState: "error",
      });
    }
  },

  async importFiles(files: FileList | File[], options?: { trackId?: string | null }) {
    const list = Array.from(files as FileList).filter((file) => file.type.startsWith("audio/"));
    if (list.length === 0) return;

    const ctx = getGlobalAudioContext();
    const state = useGroovyStore.getState();

    for (const file of list) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
        const fileUrl = URL.createObjectURL(file);
        state.importAudioAsset({
          fileUrl,
          filePath: null,
          name: file.name,
          duration: decoded.duration,
          trackId: options?.trackId ?? null,
        });
      } catch (error) {
        useGroovyStore.getState().setProjectFileState({
          lastError: error instanceof Error ? error.message : `Could not import ${file.name}.`,
        });
      }
    }
  },

  async saveProjectAs() {
    const state = useGroovyStore.getState();

    if (!isTauriRuntime()) {
      await saveBrowserProjectDownload();
      return;
    }

    try {
      const selectedDirectory = await chooseProjectDirectoryForSave(state.project.name);
      if (!selectedDirectory) {
        return;
      }

      state.setProjectFileState({ savingState: "saving" });
      const result = await projectPersistenceService.saveProjectBundle(selectedDirectory);
      useGroovyStore.setState({
        clips: result.runtimeClips,
      });
      state.setProjectFileState({
        projectDirectoryPath: result.persistence.projectDirectoryPath,
        projectFilePath: result.persistence.projectFilePath,
        lastSavedAt: result.persistence.savedAt,
        lastError: null,
        isDirty: false,
        savingState: "idle",
      });
    } catch (error) {
      state.setProjectFileState({
        lastError: error instanceof Error ? error.message : "Project could not be saved.",
        savingState: "error",
      });
    }
  },
};

async function saveBrowserProjectDownload() {
  const state = useGroovyStore.getState();
  const ui = useUiStore.getState();

  state.setProjectFileState({ savingState: "saving" });

  try {
    const bundle = await projectPersistenceService.createBrowserProjectBundle();

    if (bundle.exceededWarnThreshold) {
      const sizeMb = (bundle.estimatedBytes / (1024 * 1024)).toFixed(0);
      const threshold = (BUNDLE_SIZE_WARN_BYTES / (1024 * 1024)).toFixed(0);
      const proceed = typeof window !== "undefined"
        ? window.confirm(
            `This project bundle is ~${sizeMb} MB (over ${threshold} MB). Saving may be slow or hit browser limits. Continue?`,
          )
        : true;
      if (!proceed) {
        state.setProjectFileState({ savingState: "idle" });
        return;
      }
    }

    downloadTextFile(bundle.fileName, bundle.contents, "application/json");
    const savedAt = new Date().toISOString();
    state.setProjectFileState({
      projectDirectoryPath: null,
      projectFilePath: bundle.fileName,
      lastSavedAt: savedAt,
      lastError: null,
      isDirty: false,
      savingState: "idle",
    });

    if (bundle.failedClips.length > 0) {
      const first = bundle.failedClips.slice(0, 3).join(", ");
      const more = bundle.failedClips.length > 3 ? ` and ${bundle.failedClips.length - 3} more` : "";
      ui.showToast(`Saved with ${bundle.failedClips.length} missing clips: ${first}${more}`, "warn");
    }
  } catch (error) {
    state.setProjectFileState({
      lastError: error instanceof Error ? error.message : "Project could not be saved.",
      savingState: "error",
    });
  }
}

function downloadTextFile(fileName: string, contents: string, mimeType: string) {
  if (typeof document === "undefined") return;

  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
