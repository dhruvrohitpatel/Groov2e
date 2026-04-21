import { useEffect } from 'react';
import type { Theme } from './types';
import { useGroovyStore } from './store/useGroovyStore';
import { useUiStore } from './store/useUiStore';
import { THEMES } from './themes';
import { Icon } from './components/icons';
import { TRACK_HEAD_WIDTH } from './components/timeline';
import { TimelineStatusStrip } from './components/TimelineStatusStrip';
import { TransportPill } from './components/transport';
import { GeniePanel } from './components/genie';
import { PhoneController } from './components/phone';
import { TweaksPanel } from './components/tweaks';
import { Lane } from './components/Lane';
import { Menubar } from './components/menubar/Menubar';
import { buildShortcutBindings, runCommand } from './components/menubar/commands';
import { Toasts } from './components/Toasts';
import { HelpModals } from './components/HelpModals';
import { MixerDrawer } from './components/mixer/MixerDrawer';
import { trackController } from './controllers/trackController';
import { projectController } from './controllers/projectController';
import { transportController } from './controllers/transportController';
import { localProjectSnapshot } from './features/project/services/projectPersistenceService';

export function App() {
  const project = useGroovyStore((s) => s.project);
  const tracks = useGroovyStore((s) => s.tracks);
  const clips = useGroovyStore((s) => s.clips);
  const cursorPosition = useGroovyStore((s) => s.cursorPosition);
  const isRecording = useGroovyStore((s) => s.recording.isRecording);
  const selectedClipId = useGroovyStore((s) => s.selectedClipId);
  const selectedClip = selectedClipId ? clips[selectedClipId] ?? null : null;
  const canSplit = !!selectedClip
    && cursorPosition > selectedClip.startTime
    && cursorPosition < selectedClip.startTime + selectedClip.duration;

  const tweaks = useUiStore((s) => s.tweaks);
  const tweaksOpen = useUiStore((s) => s.tweaksOpen);
  const genieOpen = useUiStore((s) => s.genieOpen);
  const setTweak = useUiStore((s) => s.setTweak);
  const setTweaksOpen = useUiStore((s) => s.setTweaksOpen);
  const setGenieOpen = useUiStore((s) => s.setGenieOpen);

  const theme: Theme = THEMES[tweaks.theme] || THEMES.warm;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-density', tweaks.density);
    document.documentElement.setAttribute('data-theme', tweaks.theme);
  }, [tweaks.density, tweaks.theme]);

  useEffect(() => {
    const snapshot = localProjectSnapshot.load();
    if (!snapshot) return;

    useGroovyStore.setState((state) => ({
      project: snapshot.project ?? state.project,
      tracks: snapshot.tracks ?? state.tracks,
      clips: snapshot.clips ?? state.clips,
      takeGroups: snapshot.takeGroups ?? state.takeGroups,
      cursorPosition: snapshot.cursorPosition ?? state.cursorPosition,
      selectedTrackId: snapshot.selectedTrackId ?? state.selectedTrackId,
      selectedClipId: snapshot.selectedClipId ?? state.selectedClipId,
      transport: {
        ...state.transport,
        metronomeEnabled: snapshot.transport?.metronomeEnabled ?? state.transport.metronomeEnabled,
        currentTime: snapshot.cursorPosition ?? state.transport.currentTime,
      },
    }));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGroovyStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => localProjectSnapshot.save(), 1500);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      if (!Array.from(e.dataTransfer.types).includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer || e.dataTransfer.files.length === 0) return;
      e.preventDefault();
      void projectController.importFiles(e.dataTransfer.files);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  useEffect(() => {
    const shortcutBindings = buildShortcutBindings();

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() || '';
      const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable;

      if (e.code === 'Space' && !isEditable) {
        e.preventDefault();
        const status = useGroovyStore.getState().transport.status;
        if (status === 'playing') transportController.pause();
        else transportController.play();
        return;
      }
      if (!isEditable && (e.key === 'Backspace' || e.key === 'Delete') && selectedClipId) {
        e.preventDefault();
        trackController.deleteSelectedClip();
        return;
      }
      if (!isEditable && (e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        trackController.splitSelectedClipAtCursor();
        return;
      }

      for (const binding of shortcutBindings) {
        if (binding.match(e)) {
          if (isEditable && !(e.metaKey || e.ctrlKey)) continue;
          e.preventDefault();
          runCommand(binding.commandId);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedClipId]);

  return (
    <div style={{
      width: '100vw', height: '100vh', background: theme.bg, overflow: 'hidden',
      position: 'relative', fontFamily: 'var(--sans)', color: theme.trackName,
    }}>
      <PaperGrain dark={tweaks.theme === 'dark'}/>

      <div style={{
        height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px',
        borderBottom: `1px solid ${theme.rule}`,
        background: theme.topBarBg,
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.03em', color: theme.topBarText }}>Groovy</div>
          <div style={{ width: 1, height: 18, background: theme.rule }}/>
          <Menubar theme={theme}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: theme.pillText, letterSpacing: '0.06em' }}>
            {project.name} · {tracks.length} tracks
          </div>
          <button onClick={() => setTweaksOpen(!tweaksOpen)} style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em',
            padding: '4px 10px', border: `1px solid ${theme.pillDivider}`,
            background: 'transparent', color: theme.topBarText, cursor: 'pointer',
            borderRadius: 4, textTransform: 'uppercase',
          }}>tweaks</button>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 40, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', borderBottom: `1px solid ${theme.rule}`,
          background: theme.trackHeadBg, position: 'relative', zIndex: 1,
        }}>
          <div style={{
            width: TRACK_HEAD_WIDTH, flexShrink: 0, padding: '8px 12px',
            borderRight: `1px solid ${theme.rule}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9.5, color: theme.pillText,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>tracks · {tracks.length}</div>
            <button onClick={() => trackController.addTrack()} style={{
              width: 22, height: 22, borderRadius: 4,
              border: `1px solid ${theme.pillDivider}`, background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.pillText,
            }}>
              <Icon.Plus/>
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TimelineStatusStrip theme={theme}/>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, position: 'relative', background: theme.trackBg }}>
          <Lane theme={theme} themeName={tweaks.theme}/>
        </div>

        <MixerDrawer theme={theme} open={tweaks.mixer}/>
      </div>

      {tweaks.phone && (
        <div style={{
          position: 'absolute', right: 24, top: 60, zIndex: 5, pointerEvents: 'auto',
          transform: 'scale(0.86)', transformOrigin: 'top right',
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9.5, color: theme.pillText,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'right',
          }}>
            phone controller · paired
          </div>
          <PhoneController
            theme={theme}
            genieActive={genieOpen}
            setGenieActive={setGenieOpen}
          />
        </div>
      )}

      <TransportPill
        theme={theme}
        onLampClick={() => setGenieOpen(!genieOpen)}
        genieActive={genieOpen}
      />

      {genieOpen && (
        <GeniePanel
          open={genieOpen}
          onClose={() => setGenieOpen(false)}
          theme={theme}
        />
      )}

      <TweaksPanel
        tweaks={tweaks} setTweak={setTweak}
        open={tweaksOpen} onClose={() => setTweaksOpen(false)}
        theme={theme}
      />

      {selectedClipId && (
        <ClipActions canSplit={canSplit} theme={theme}/>
      )}

      {isRecording && <RecordingBadge/>}

      <Toasts theme={theme}/>
      <HelpModals theme={theme}/>
    </div>
  );
}

function ClipActions({ canSplit, theme }: { canSplit: boolean; theme: Theme }) {
  return (
    <div style={{
      position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
      background: theme.pillBg, border: `1px solid ${theme.pillBorder}`, borderRadius: 999,
      boxShadow: '0 6px 20px rgba(20,18,16,0.18)',
      fontFamily: 'var(--mono)', fontSize: 10.5, color: theme.pillTextStrong,
      letterSpacing: '0.06em', textTransform: 'uppercase', zIndex: 19,
    }}>
      <span style={{ opacity: 0.55 }}>clip</span>
      <button
        onClick={() => trackController.splitSelectedClipAtCursor()}
        disabled={!canSplit}
        title={canSplit ? 'Split at playhead (S)' : 'Move playhead inside the clip to split'}
        style={{
          padding: '4px 10px', borderRadius: 6, cursor: canSplit ? 'pointer' : 'not-allowed',
          background: canSplit ? theme.pillDivider : 'transparent',
          border: `1px solid ${theme.pillDivider}`, color: theme.pillTextStrong,
          fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em',
          opacity: canSplit ? 1 : 0.45, textTransform: 'uppercase',
        }}
      >split</button>
      <button
        onClick={() => trackController.deleteSelectedClip()}
        title="Delete clip (Delete / Backspace)"
        style={{
          padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
          background: 'transparent',
          border: '1px solid rgba(179,38,30,0.35)',
          color: '#B3261E',
          fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >delete</button>
    </div>
  );
}

function PaperGrain({ dark }: { dark: boolean }) {
  const svg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.15 0 0 0 0 0.1 0 0 0 0 0.05 0 0 0 0.08 0'/></filter><rect width='220' height='220' filter='url(%23n)'/></svg>")`;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: svg,
      opacity: dark ? 0.5 : 0.7,
      mixBlendMode: dark ? 'screen' : 'multiply',
    }}/>
  );
}

function RecordingBadge() {
  return (
    <div style={{
      position: 'absolute', bottom: 96, left: 24,
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: '#B3261E', color: '#F5EFE4', borderRadius: 999,
      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
      boxShadow: '0 6px 24px rgba(179,38,30,0.35)',
      zIndex: 21,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5EFE4', animation: 'recordPulse 1.2s ease-in-out infinite' }}/>
      <span>Recording</span>
    </div>
  );
}
