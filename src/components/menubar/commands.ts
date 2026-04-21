import { trackController } from '../../controllers/trackController';
import { projectController } from '../../controllers/projectController';
import { transportController } from '../../controllers/transportController';
import { audioService } from '../../features/audio/services/audioService';
import { localProjectSnapshot } from '../../features/project/services/projectPersistenceService';
import { useGroovyStore } from '../../store/useGroovyStore';
import { useUiStore } from '../../store/useUiStore';
import type { Density, ThemeName } from '../../types';

export type MenuGroupId = 'file' | 'edit' | 'track' | 'view' | 'help';

export interface MenuCommand {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void | Promise<void>;
  enabled?: () => boolean;
  isChecked?: () => boolean;
}

export interface MenuGroup {
  id: MenuGroupId;
  label: string;
  sections: MenuCommand[][];
}

function openFilePicker(accept: string, onFiles: (files: FileList) => void) {
  if (typeof window === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = true;
  input.style.display = 'none';
  input.addEventListener('change', () => {
    if (input.files) onFiles(input.files);
    input.remove();
  });
  document.body.appendChild(input);
  input.click();
}

function toast(message: string, tone: 'info' | 'warn' | 'error' = 'info') {
  useUiStore.getState().showToast(message, tone);
}

function comingSoon(label: string) {
  return () => toast(`${label} · coming soon`, 'info');
}

function formatShortcut(parts: string[]): string {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return parts
    .map((part) => {
      if (part === 'Mod') return isMac ? '⌘' : 'Ctrl';
      if (part === 'Shift') return isMac ? '⇧' : 'Shift';
      if (part === 'Alt') return isMac ? '⌥' : 'Alt';
      return part;
    })
    .join(isMac ? '' : '+');
}

const SC = {
  new: formatShortcut(['Mod', 'N']),
  open: formatShortcut(['Mod', 'O']),
  save: formatShortcut(['Mod', 'S']),
  saveAs: formatShortcut(['Mod', 'Shift', 'S']),
  import: formatShortcut(['Mod', 'I']),
  exportWav: formatShortcut(['Mod', 'Shift', 'E']),
  undo: formatShortcut(['Mod', 'Z']),
  redo: formatShortcut(['Mod', 'Shift', 'Z']),
  delete: 'Delete',
  split: 'S',
  selectAll: formatShortcut(['Mod', 'A']),
  addTrack: formatShortcut(['Mod', 'T']),
  deleteTrack: formatShortcut(['Mod', 'Shift', 'T']),
  duplicateTrack: formatShortcut(['Mod', 'D']),
  zoomIn: formatShortcut(['Mod', '=']),
  zoomOut: formatShortcut(['Mod', '-']),
  toggleMixer: formatShortcut(['Mod', 'M']),
  toggleGenie: formatShortcut(['Mod', 'G']),
};

function selectedTrackId(): string | null {
  return useGroovyStore.getState().selectedTrackId;
}

function selectedClipId(): string | null {
  return useGroovyStore.getState().selectedClipId;
}

function canSplitNow(): boolean {
  const { clips, selectedClipId: sel, cursorPosition } = useGroovyStore.getState();
  const clip = sel ? clips[sel] ?? null : null;
  if (!clip) return false;
  return cursorPosition > clip.startTime && cursorPosition < clip.startTime + clip.duration;
}

export function buildMenuGroups(): MenuGroup[] {
  return [
    {
      id: 'file',
      label: 'File',
      sections: [
        [
          {
            id: 'file.new',
            label: 'New Project',
            shortcut: SC.new,
            run: () => projectController.newProject(),
          },
          {
            id: 'file.open',
            label: 'Open…',
            shortcut: SC.open,
            run: () => projectController.openProject(),
          },
        ],
        [
          {
            id: 'file.save',
            label: 'Save',
            shortcut: SC.save,
            run: () => {
              void projectController.saveProject();
              localProjectSnapshot.save();
              toast('Project saved', 'info');
            },
          },
          {
            id: 'file.saveAs',
            label: 'Save As…',
            shortcut: SC.saveAs,
            run: () => projectController.saveProjectAs(),
          },
        ],
        [
          {
            id: 'file.import',
            label: 'Import Audio…',
            shortcut: SC.import,
            run: () =>
              openFilePicker('audio/*', (files) => {
                void projectController.importFiles(files);
              }),
          },
          {
            id: 'file.export',
            label: 'Export WAV…',
            shortcut: SC.exportWav,
            run: async () => {
              const result = await audioService.exportWav();
              if (!result) {
                toast('Waveform not ready to export yet', 'warn');
                return;
              }
              toast('WAV export downloaded', 'info');
            },
          },
          {
            id: 'file.exportStems',
            label: 'Export Stems…',
            run: comingSoon('Export Stems'),
          },
        ],
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      sections: [
        [
          {
            id: 'edit.undo',
            label: 'Undo Last AI Change',
            shortcut: SC.undo,
            run: () => {
              const snapshot = useGroovyStore.getState().undoLastAgentChange();
              if (!snapshot) {
                toast('Nothing to undo', 'warn');
                return;
              }
              toast(`Reverted: ${snapshot.label}`, 'info');
            },
            enabled: () => useGroovyStore.getState().agentUndoStack.length > 0,
          },
          {
            id: 'edit.redo',
            label: 'Redo',
            shortcut: SC.redo,
            run: comingSoon('Redo'),
          },
        ],
        [
          {
            id: 'edit.cut',
            label: 'Cut',
            shortcut: formatShortcut(['Mod', 'X']),
            run: comingSoon('Cut'),
          },
          {
            id: 'edit.copy',
            label: 'Copy',
            shortcut: formatShortcut(['Mod', 'C']),
            run: comingSoon('Copy'),
          },
          {
            id: 'edit.paste',
            label: 'Paste',
            shortcut: formatShortcut(['Mod', 'V']),
            run: comingSoon('Paste'),
          },
        ],
        [
          {
            id: 'edit.deleteClip',
            label: 'Delete Clip',
            shortcut: SC.delete,
            run: () => trackController.deleteSelectedClip(),
            enabled: () => Boolean(selectedClipId()),
          },
          {
            id: 'edit.splitAtPlayhead',
            label: 'Split at Playhead',
            shortcut: SC.split,
            run: () => trackController.splitSelectedClipAtCursor(),
            enabled: canSplitNow,
          },
          {
            id: 'edit.selectAll',
            label: 'Select All Clips on Track',
            shortcut: SC.selectAll,
            run: () => {
              const state = useGroovyStore.getState();
              const track = state.tracks.find((t) => t.id === state.selectedTrackId);
              if (!track || track.clips.length === 0) {
                toast('Select a track with clips first', 'warn');
                return;
              }
              state.selectClip(track.clips[0]);
            },
            enabled: () => Boolean(selectedTrackId()),
          },
        ],
      ],
    },
    {
      id: 'track',
      label: 'Track',
      sections: [
        [
          {
            id: 'track.add',
            label: 'Add Track',
            shortcut: SC.addTrack,
            run: () => trackController.addTrack(),
          },
          {
            id: 'track.duplicate',
            label: 'Duplicate Track',
            shortcut: SC.duplicateTrack,
            run: () => {
              const id = trackController.duplicateSelectedTrack();
              if (!id) toast('Select a track first', 'warn');
            },
            enabled: () => Boolean(selectedTrackId()),
          },
          {
            id: 'track.delete',
            label: 'Delete Track',
            shortcut: SC.deleteTrack,
            run: () => trackController.deleteSelectedTrack(),
            enabled: () => Boolean(selectedTrackId()),
          },
        ],
        [
          {
            id: 'track.arm',
            label: 'Arm Selected Track',
            run: () => {
              const id = selectedTrackId();
              if (id) trackController.toggleTrackArm(id);
              else toast('Select a track first', 'warn');
            },
            enabled: () => Boolean(selectedTrackId()),
          },
          {
            id: 'track.mute',
            label: 'Mute Selected Track',
            run: () => {
              const id = selectedTrackId();
              if (id) trackController.toggleTrackMute(id);
              else toast('Select a track first', 'warn');
            },
            enabled: () => Boolean(selectedTrackId()),
          },
          {
            id: 'track.solo',
            label: 'Solo Selected Track',
            run: () => {
              const id = selectedTrackId();
              if (id) trackController.toggleTrackSolo(id);
              else toast('Select a track first', 'warn');
            },
            enabled: () => Boolean(selectedTrackId()),
          },
        ],
        [
          {
            id: 'track.freeze',
            label: 'Freeze Track',
            run: comingSoon('Freeze Track'),
          },
        ],
      ],
    },
    {
      id: 'view',
      label: 'View',
      sections: [
        [
          {
            id: 'view.toggleMixer',
            label: 'Mixer',
            shortcut: SC.toggleMixer,
            run: () => {
              const ui = useUiStore.getState();
              ui.setTweak('mixer', !ui.tweaks.mixer);
            },
            isChecked: () => useUiStore.getState().tweaks.mixer,
          },
          {
            id: 'view.toggleGenie',
            label: 'Agent',
            shortcut: SC.toggleGenie,
            run: () => {
              const ui = useUiStore.getState();
              ui.setGenieOpen(!ui.genieOpen);
            },
            isChecked: () => useUiStore.getState().genieOpen,
          },
          {
            id: 'view.togglePhone',
            label: 'Phone',
            run: () => {
              const ui = useUiStore.getState();
              ui.setTweak('phone', !ui.tweaks.phone);
            },
            isChecked: () => useUiStore.getState().tweaks.phone,
          },
          {
            id: 'view.toggleTweaks',
            label: 'Tweaks',
            run: () => {
              const ui = useUiStore.getState();
              ui.setTweaksOpen(!ui.tweaksOpen);
            },
            isChecked: () => useUiStore.getState().tweaksOpen,
          },
        ],
        [
          {
            id: 'view.zoomIn',
            label: 'Zoom In',
            shortcut: SC.zoomIn,
            run: () => useUiStore.getState().zoomIn(),
          },
          {
            id: 'view.zoomOut',
            label: 'Zoom Out',
            shortcut: SC.zoomOut,
            run: () => useUiStore.getState().zoomOut(),
          },
          {
            id: 'view.zoomFit',
            label: 'Fit to Screen',
            run: () => {
              useUiStore.getState().setSamplesPerPixel(2048);
              toast('Fit applied', 'info');
            },
          },
        ],
        ...(() => {
          const themes: ThemeName[] = ['warm', 'light', 'dark'];
          const densities: Density[] = ['compact', 'comfortable', 'spacious'];
          return [
            themes.map<MenuCommand>((name) => ({
              id: `view.theme.${name}`,
              label: `Theme · ${name}`,
              run: () => useUiStore.getState().setTweak('theme', name),
              isChecked: () => useUiStore.getState().tweaks.theme === name,
            })),
            densities.map<MenuCommand>((name) => ({
              id: `view.density.${name}`,
              label: `Density · ${name}`,
              run: () => useUiStore.getState().setTweak('density', name),
              isChecked: () => useUiStore.getState().tweaks.density === name,
            })),
          ];
        })(),
      ],
    },
    {
      id: 'help',
      label: 'Help',
      sections: [
        [
          {
            id: 'help.shortcuts',
            label: 'Keyboard Shortcuts',
            shortcut: '?',
            run: () => useUiStore.getState().setShortcutsModalOpen(true),
          },
          {
            id: 'help.about',
            label: 'About Groov2e',
            run: () => useUiStore.getState().setAboutModalOpen(true),
          },
        ],
      ],
    },
  ];
}

// Shortcut bindings for the global keydown handler. Matches against
// `event.code` / `event.key` with modifier awareness. Returns true if a
// command ran so the caller can preventDefault.
export interface ShortcutBinding {
  match: (event: KeyboardEvent) => boolean;
  commandId: string;
}

const isMod = (event: KeyboardEvent) => (event.metaKey || event.ctrlKey) && !event.altKey;

export function buildShortcutBindings(): ShortcutBinding[] {
  return [
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 'n',
      commandId: 'file.new',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 'o',
      commandId: 'file.open',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 's',
      commandId: 'file.save',
    },
    {
      match: (event) => isMod(event) && event.shiftKey && event.key.toLowerCase() === 's',
      commandId: 'file.saveAs',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 'i',
      commandId: 'file.import',
    },
    {
      match: (event) => isMod(event) && event.shiftKey && event.key.toLowerCase() === 'e',
      commandId: 'file.export',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 'z',
      commandId: 'edit.undo',
    },
    {
      match: (event) => isMod(event) && event.shiftKey && event.key.toLowerCase() === 'z',
      commandId: 'edit.redo',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 't',
      commandId: 'track.add',
    },
    {
      match: (event) => isMod(event) && event.shiftKey && event.key.toLowerCase() === 't',
      commandId: 'track.delete',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 'd',
      commandId: 'track.duplicate',
    },
    {
      match: (event) => isMod(event) && (event.key === '=' || event.key === '+'),
      commandId: 'view.zoomIn',
    },
    {
      match: (event) => isMod(event) && event.key === '-',
      commandId: 'view.zoomOut',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 'm',
      commandId: 'view.toggleMixer',
    },
    {
      match: (event) => isMod(event) && !event.shiftKey && event.key.toLowerCase() === 'g',
      commandId: 'view.toggleGenie',
    },
    {
      match: (event) => !isMod(event) && event.key === '?',
      commandId: 'help.shortcuts',
    },
    {
      match: (event) => !isMod(event) && !event.altKey && event.key === 'Escape',
      commandId: 'edit.escape',
    },
  ];
}

export function findCommand(id: string): MenuCommand | null {
  if (id === 'edit.escape') {
    return {
      id,
      label: 'Escape',
      run: () => {
        const ui = useUiStore.getState();
        ui.setShortcutsModalOpen(false);
        ui.setAboutModalOpen(false);
      },
    };
  }
  const groups = buildMenuGroups();
  for (const group of groups) {
    for (const section of group.sections) {
      for (const command of section) {
        if (command.id === id) return command;
      }
    }
  }
  return null;
}

export function runCommand(id: string) {
  const command = findCommand(id);
  if (!command) return;
  if (command.enabled && !command.enabled()) {
    toast(`${command.label} not available right now`, 'warn');
    return;
  }
  void command.run();
}

export function shortcutsForCheatsheet(): Array<{ label: string; shortcut: string }> {
  const groups = buildMenuGroups();
  const out: Array<{ label: string; shortcut: string }> = [];
  for (const group of groups) {
    for (const section of group.sections) {
      for (const command of section) {
        if (command.shortcut) {
          out.push({ label: `${group.label} · ${command.label}`, shortcut: command.shortcut });
        }
      }
    }
  }
  out.push({ label: 'Transport · Play / Pause', shortcut: 'Space' });
  out.push({ label: 'Transport · Record', shortcut: 'R' });
  return out;
}

// Re-export toast helpers so callers outside menubar can share the transport.
export { toast as menubarToast };

// Shortcut label helpers for menubar rendering.
export { formatShortcut };

// Re-export shortcut bindings helper.
export { isMod };

// Expose transport commands for the menubar's Transport section if needed later.
export { transportController };
