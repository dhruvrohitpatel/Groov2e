import { getGlobalAudioContext } from "@waveform-playlist/playout";
import { audioService } from "../features/audio/services/audioService";
import { metronomeService } from "../features/audio/services/metronomeService";
import { createInitialGroovyState } from "../lib/mockProject";
import {
  projectPersistenceService,
  localProjectSnapshot,
  rehydrateSnapshotClips,
} from "../features/project/services/projectPersistenceService";
import {
  chooseProjectDirectoryForOpen,
  chooseProjectDirectoryForSave,
  isTauriRuntime,
} from "../features/project/services/tauriPersistenceService";
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

async function switchActiveProject(projectId: string) {
  stopTransportForProjectChange();
  localProjectSnapshot.setActiveId(projectId);
  const snapshot = localProjectSnapshot.loadSnapshot(projectId);
  const currentState = useGroovyStore.getState();

  if (!snapshot) {
    applyProjectResetState();
    return;
  }

  const { clips } = await rehydrateSnapshotClips(snapshot.clips);
  const fresh = createInitialGroovyState();
  currentState.replaceProjectState({
    project: snapshot.project ?? fresh.project,
    transport: {
      ...fresh.transport,
      metronomeEnabled: snapshot.transport?.metronomeEnabled ?? fresh.transport.metronomeEnabled,
    },
    tracks: snapshot.tracks ?? fresh.tracks,
    clips,
    takeGroups: snapshot.takeGroups ?? fresh.takeGroups,
    selectedTrackId: snapshot.selectedTrackId ?? null,
    selectedClipId: snapshot.selectedClipId ?? null,
    cursorPosition: snapshot.cursorPosition ?? 0,
    timeline: fresh.timeline,
    projectFile: fresh.projectFile,
  });
}

export const projectController = {
  async newProject() {
    if (isTauriRuntime()) {
      stopTransportForProjectChange();
      applyProjectResetState();
      return;
    }
    useUiStore.getState().setProjectsDialogOpen(true);
  },

  async openProject() {
    if (isTauriRuntime()) {
      const state = useGroovyStore.getState();
      try {
        const selectedDirectory = await chooseProjectDirectoryForOpen();
        if (!selectedDirectory) return;
        stopTransportForProjectChange();
        const openedProject = await projectPersistenceService.openProjectBundle(selectedDirectory);
        state.replaceProjectState(openedProject);
        state.setProjectFileState({ lastError: null });
      } catch (error) {
        state.setProjectFileState({
          lastError: error instanceof Error ? error.message : "Project could not be opened.",
        });
      }
      return;
    }
    useUiStore.getState().setProjectsDialogOpen(true);
  },

  async saveProject() {
    if (isTauriRuntime()) {
      const state = useGroovyStore.getState();
      const existingDirectory = state.projectFile.projectDirectoryPath;
      if (!existingDirectory) {
        await this.saveProjectAs();
        return;
      }
      try {
        const result = await projectPersistenceService.saveProjectBundle(existingDirectory);
        useGroovyStore.setState({ clips: result.runtimeClips });
        state.setProjectFileState({
          projectDirectoryPath: result.persistence.projectDirectoryPath,
          projectFilePath: result.persistence.projectFilePath,
          lastSavedAt: result.persistence.savedAt,
          lastError: null,
        });
      } catch (error) {
        state.setProjectFileState({
          lastError: error instanceof Error ? error.message : "Project could not be saved.",
        });
      }
      return;
    }
    localProjectSnapshot.saveActive();
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
        const persisted = await projectPersistenceService.persistImportedAudio({
          blob: file,
          mimeType: file.type || "audio/wav",
        });
        state.importAudioAsset({
          fileUrl: persisted.fileUrl,
          filePath: persisted.filePath,
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
    if (isTauriRuntime()) {
      const state = useGroovyStore.getState();
      try {
        const selectedDirectory = await chooseProjectDirectoryForSave(state.project.name);
        if (!selectedDirectory) return;
        const result = await projectPersistenceService.saveProjectBundle(selectedDirectory);
        useGroovyStore.setState({ clips: result.runtimeClips });
        state.setProjectFileState({
          projectDirectoryPath: result.persistence.projectDirectoryPath,
          projectFilePath: result.persistence.projectFilePath,
          lastSavedAt: result.persistence.savedAt,
          lastError: null,
        });
      } catch (error) {
        state.setProjectFileState({
          lastError: error instanceof Error ? error.message : "Project could not be saved.",
        });
      }
      return;
    }
    useUiStore.getState().setProjectsDialogOpen(true);
  },

  createBrowserProject(name: string) {
    localProjectSnapshot.saveActive();
    const entry = localProjectSnapshot.createProject(name);
    stopTransportForProjectChange();
    localProjectSnapshot.setActiveId(entry.id);
    applyProjectResetState();
    useGroovyStore.getState().setProjectName(entry.name);
    localProjectSnapshot.saveActive();
    return entry;
  },

  async switchToBrowserProject(projectId: string) {
    localProjectSnapshot.saveActive();
    await switchActiveProject(projectId);
  },

  renameBrowserProject(projectId: string, name: string) {
    localProjectSnapshot.renameProject(projectId, name);
    if (localProjectSnapshot.getActiveId() === projectId) {
      useGroovyStore.getState().setProjectName(name);
      localProjectSnapshot.saveActive();
    }
  },

  async deleteBrowserProject(projectId: string) {
    const wasActive = localProjectSnapshot.getActiveId() === projectId;
    await localProjectSnapshot.deleteProject(projectId);
    if (wasActive) {
      const nextId = localProjectSnapshot.getActiveId();
      if (nextId) {
        await switchActiveProject(nextId);
      } else {
        this.createBrowserProject("Untitled");
      }
    }
  },
};
