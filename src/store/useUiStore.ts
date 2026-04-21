import { create } from 'zustand';
import type { Density, SnapMode, ThemeName, Tweaks } from '../types';
import { TIMELINE_SAMPLES_PER_PIXEL } from '../features/timeline/lib/timelineLayout';
import { audioService } from '../features/audio/services/audioService';

const STORAGE_KEY = 'groovy.ui.v1';

const TWEAKS_DEFAULT: Tweaks = {
  theme: 'warm',
  density: 'comfortable',
  mixer: false,
  phone: true,
};

export const ZOOM_LEVELS = [256, 512, 1024, 2048, 4096, 8192] as const;
export const DEFAULT_ZOOM_LEVEL = TIMELINE_SAMPLES_PER_PIXEL;

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'warn' | 'error';
}

interface UiState {
  tweaks: Tweaks;
  tweaksOpen: boolean;
  genieOpen: boolean;
  snap: SnapMode;
  samplesPerPixel: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  toasts: Toast[];
  shortcutsModalOpen: boolean;
  aboutModalOpen: boolean;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  setTweaksOpen: (open: boolean) => void;
  setGenieOpen: (open: boolean) => void;
  setSnap: (snap: SnapMode) => void;
  setSamplesPerPixel: (samplesPerPixel: number) => void;
  setZoomBounds: (canZoomIn: boolean, canZoomOut: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  showToast: (message: string, tone?: Toast['tone']) => string;
  dismissToast: (id: string) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setAboutModalOpen: (open: boolean) => void;
}

function loadTweaks(): Tweaks {
  if (typeof window === 'undefined') return TWEAKS_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return TWEAKS_DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Tweaks>;
    return {
      theme: (parsed.theme as ThemeName) ?? TWEAKS_DEFAULT.theme,
      density: (parsed.density as Density) ?? TWEAKS_DEFAULT.density,
      mixer: parsed.mixer ?? TWEAKS_DEFAULT.mixer,
      phone: parsed.phone ?? TWEAKS_DEFAULT.phone,
    };
  } catch {
    return TWEAKS_DEFAULT;
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  tweaks: loadTweaks(),
  tweaksOpen: false,
  genieOpen: false,
  snap: 'bar',
  samplesPerPixel: DEFAULT_ZOOM_LEVEL,
  canZoomIn: true,
  canZoomOut: true,
  toasts: [],
  shortcutsModalOpen: false,
  aboutModalOpen: false,
  setTweak: (key, value) =>
    set((state) => ({ tweaks: { ...state.tweaks, [key]: value } })),
  setTweaksOpen: (tweaksOpen) => set({ tweaksOpen }),
  setGenieOpen: (genieOpen) => set({ genieOpen }),
  setSnap: (snap) => set({ snap }),
  setSamplesPerPixel: (samplesPerPixel) => set({ samplesPerPixel }),
  setZoomBounds: (canZoomIn, canZoomOut) => {
    const current = get();
    if (current.canZoomIn === canZoomIn && current.canZoomOut === canZoomOut) return;
    set({ canZoomIn, canZoomOut });
  },
  // Delegates to wfpl's engine via audioService. wfpl owns the authoritative
  // zoom state and mirrors samplesPerPixel + canZoomIn/Out back into the store.
  zoomIn: () => {
    audioService.zoomIn();
  },
  zoomOut: () => {
    audioService.zoomOut();
  },
  showToast: (message, tone = 'info') => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    const duration = tone === 'error' ? 4500 : 2800;
    if (typeof window !== 'undefined') {
      window.setTimeout(() => get().dismissToast(id), duration);
    }
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  setShortcutsModalOpen: (shortcutsModalOpen) => set({ shortcutsModalOpen }),
  setAboutModalOpen: (aboutModalOpen) => set({ aboutModalOpen }),
}));

if (typeof window !== 'undefined') {
  useUiStore.subscribe((state) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tweaks));
    } catch {
      // ignore quota errors
    }
  });
}
