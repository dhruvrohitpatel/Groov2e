import { getGlobalAudioContext } from "@waveform-playlist/playout";
import { audioService } from "../features/audio/services/audioService";
import { metronomeService } from "../features/audio/services/metronomeService";
import { createInitialGroovyState } from "../lib/mockProject";
import { projectPersistenceService } from "../features/project/services/projectPersistenceService";
import {
  chooseProjectDirectoryForOpen,
  chooseProjectDirectoryForSave,
} from "../features/project/services/tauriPersistenceService";
import { useGroovyStore } from "../store/useGroovyStore";

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

  async saveProject() {
    const state = useGroovyStore.getState();
    const existingDirectory = state.projectFile.projectDirectoryPath;

    if (!existingDirectory) {
      await this.saveProjectAs();
      return;
    }

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
      });
    } catch (error) {
      state.setProjectFileState({
        lastError: error instanceof Error ? error.message : "Project could not be saved.",
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

    try {
      const selectedDirectory = await chooseProjectDirectoryForSave(state.project.name);
      if (!selectedDirectory) {
        return;
      }

      const result = await projectPersistenceService.saveProjectBundle(selectedDirectory);
      useGroovyStore.setState({
        clips: result.runtimeClips,
      });
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
  },
};
