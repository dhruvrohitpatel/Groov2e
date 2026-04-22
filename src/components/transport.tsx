import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Theme } from '../types';
import type { MusicalKey } from '../types/models';
import { formatBarsBeats, formatTime } from '../lib/formatters';
import { MUSICAL_KEYS } from '../lib/constants';
import { Icon } from './icons';
import { useGroovyStore } from '../store/useGroovyStore';
import { useUiStore } from '../store/useUiStore';
import { transportController } from '../controllers/transportController';
import { recordingController } from '../controllers/recordingController';

const MIXER_DRAWER_HEIGHT = 240;
const TRANSPORT_PILL_GAP = 24;

interface Props {
  theme: Theme;
  onLampClick: () => void;
  genieActive: boolean;
}

export function TransportPill({ theme, onLampClick, genieActive }: Props) {
  const project = useGroovyStore((s) => s.project);
  const transportStatus = useGroovyStore((s) => s.transport.status);
  const metronomeEnabled = useGroovyStore((s) => s.transport.metronomeEnabled);
  const cursorPosition = useGroovyStore((s) => s.cursorPosition);
  const isRecording = useGroovyStore((s) => s.recording.isRecording);
  const countInEnabled = useGroovyStore((s) => s.recording.countInEnabled);
  const isCountInActive = useGroovyStore((s) => s.recording.isCountInActive);
  const countInBeatsRemaining = useGroovyStore((s) => s.recording.countInBeatsRemaining);
  const setCountInEnabled = useGroovyStore((s) => s.setCountInEnabled);
  const mixerOpen = useUiStore((s) => s.tweaks.mixer);

  const playing = transportStatus === 'playing';

  const handlePlay = () => {
    if (playing) transportController.pause();
    else transportController.play();
  };
  const handleStop = () => transportController.stop({ resetCursor: true });
  const handleRewind = () => transportController.seek(0);
  const handleRecord = () => {
    void recordingController.toggleRecord();
  };
  const handleMetronome = () => transportController.toggleMetronome();

  const bottomOffset = mixerOpen
    ? MIXER_DRAWER_HEIGHT + TRANSPORT_PILL_GAP
    : TRANSPORT_PILL_GAP;

  return (
    <div style={{
      position: 'absolute', bottom: bottomOffset, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'stretch',
      background: theme.pillBg,
      border: `1px solid ${theme.pillBorder}`,
      borderRadius: 999,
      boxShadow: '0 6px 24px rgba(20,18,16,0.18), 0 1px 0 rgba(255,255,255,0.5) inset',
      overflow: 'hidden',
      zIndex: 20,
      fontFamily: 'var(--mono)', fontSize: 11,
      color: theme.pillText, letterSpacing: '0.04em',
      transition: 'bottom 180ms ease',
    }}>
      <ProjectNameStat theme={theme}/>
      <BpmStat theme={theme}/>
      <KeyStat theme={theme}/>
      <PillStat label="sig" value="4/4" theme={theme}/>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
        borderLeft: `1px solid ${theme.pillDivider}`,
        borderRight: `1px solid ${theme.pillDivider}`,
      }}>
        <PillBtn onClick={handleRewind} title="Rewind"><Icon.Rewind c={theme.pillTextStrong}/></PillBtn>
        <PillBtn onClick={handlePlay} title={playing ? 'Pause' : 'Play'} primary>
          {playing ? <Icon.Pause s={16} c="#fff"/> : <Icon.Play s={16} c="#fff"/>}
        </PillBtn>
        <PillBtn onClick={handleStop} title="Stop"><Icon.Stop c={theme.pillTextStrong}/></PillBtn>
        <PillBtn onClick={handleRecord} title="Record" recording={isRecording}>
          <Icon.Record s={14} c={isRecording ? '#fff' : '#B3261E'}/>
        </PillBtn>
      </div>

      <div style={{
        padding: 'var(--transport-pad, 12px) 18px', display: 'flex', flexDirection: 'column', gap: 2,
        borderRight: `1px solid ${theme.pillDivider}`, minWidth: 150,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 16, color: theme.pillTextStrong,
          letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums',
        }}>{formatBarsBeats(cursorPosition, project.bpm)}</div>
        <div style={{ fontSize: 9.5, opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(cursorPosition)}
        </div>
      </div>

      <PillBtnBig on={metronomeEnabled} onClick={handleMetronome} theme={theme}>
        <Icon.Metronome c={metronomeEnabled ? theme.accent : theme.pillTextStrong}/>
      </PillBtnBig>

      <button
        onClick={() => setCountInEnabled(!countInEnabled)}
        title={countInEnabled ? 'Count-in: on (1 bar)' : 'Count-in: off'}
        style={{
          padding: '0 12px',
          background: isCountInActive
            ? theme.accent
            : countInEnabled
              ? theme.metroOn
              : 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRight: `1px solid ${theme.pillDivider}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 1, minWidth: 44,
          fontFamily: 'var(--mono)',
          color: isCountInActive
            ? '#fff'
            : countInEnabled
              ? theme.accent
              : theme.pillTextStrong,
        }}
      >
        <div style={{ fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>
          count
        </div>
        <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {isCountInActive && countInBeatsRemaining !== null ? countInBeatsRemaining : '1'}
        </div>
      </button>

      <button onClick={onLampClick} title="Jam with the Agent" style={{
        padding: '0 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: genieActive ? theme.genieActiveBg : theme.genieBg,
        border: 'none', cursor: 'pointer', position: 'relative',
        borderLeft: `1px solid ${theme.pillDivider}`,
      }}>
        <Icon.Lamp s={26} c={genieActive ? '#2340E8' : theme.lampBrass} glow={genieActive}/>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: genieActive ? '#2340E8' : theme.pillTextStrong, fontStyle: 'italic', letterSpacing: '-0.01em' }}>agent</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, opacity: 0.55, letterSpacing: '0.08em', textTransform: 'uppercase' }}>tap to jam</div>
        </div>
        {genieActive && (
          <div style={{ position: 'absolute', top: -32, left: 18, pointerEvents: 'none', animation: 'smokeRise 2s ease-out infinite' }}>
            <Icon.Smoke s={18} c="#2340E8"/>
          </div>
        )}
      </button>
    </div>
  );
}

function PillStat({ label, value, theme, mono = true }: { label: string; value: string | number; theme: Theme; mono?: boolean }) {
  return (
    <div style={{
      padding: 'var(--transport-pad, 12px) 14px', display: 'flex', flexDirection: 'column', gap: 1,
      borderRight: `1px solid ${theme.pillDivider}`, minWidth: 56,
    }}>
      <div style={{ fontSize: 9, opacity: 0.55, textTransform: 'uppercase' }}>{label}</div>
      <div style={{
        fontFamily: mono ? 'var(--mono)' : 'var(--display)',
        fontSize: 14, color: theme.pillTextStrong,
        letterSpacing: mono ? '0.05em' : '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  );
}

function PillBtn({ children, onClick, title, primary, recording }: {
  children: React.ReactNode; onClick: () => void; title: string; primary?: boolean; recording?: boolean;
}) {
  const bg = primary ? '#141210' : recording ? '#B3261E' : 'transparent';
  return (
    <button onClick={onClick} title={title} style={{
      width: primary ? 34 : 28, height: primary ? 34 : 28,
      borderRadius: '50%', background: bg,
      border: primary || recording ? 'none' : '1px solid rgba(20,18,16,0.15)',
      cursor: 'pointer', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: recording ? 'recordPulse 1.2s ease-in-out infinite' : 'none',
    }}>{children}</button>
  );
}

function PillBtnBig({ children, onClick, on, theme }: {
  children: React.ReactNode; onClick: () => void; on: boolean; theme: Theme;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '0 14px', background: on ? theme.metroOn : 'transparent',
      border: 'none', cursor: 'pointer',
      borderRight: `1px solid ${theme.pillDivider}`,
    }}>{children}</button>
  );
}

function ProjectNameStat({ theme }: { theme: Theme }) {
  const name = useGroovyStore((s) => s.project.name);
  const setProjectName = useGroovyStore((s) => s.setProjectName);
  const [draft, setDraft] = useState(name);
  useEffect(() => { setDraft(name); }, [name]);

  return (
    <div style={{
      padding: 'var(--transport-pad, 12px) 16px', display: 'flex', flexDirection: 'column', gap: 1,
      borderRight: `1px solid ${theme.pillDivider}`, minWidth: 120, maxWidth: 220,
    }}>
      <div style={{ fontSize: 9, opacity: 0.55, textTransform: 'uppercase' }}>project</div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setProjectName(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          if (e.key === 'Escape') { setDraft(name); (e.currentTarget as HTMLInputElement).blur(); }
        }}
        style={{
          fontFamily: 'var(--display)', fontSize: 14, color: theme.pillTextStrong,
          letterSpacing: '-0.01em', background: 'transparent',
          border: 'none', outline: 'none', padding: 0, width: '100%',
        }}
      />
    </div>
  );
}

function BpmStat({ theme }: { theme: Theme }) {
  const bpm = useGroovyStore((s) => s.project.bpm);
  const setBpm = useGroovyStore((s) => s.setBpm);
  const [draft, setDraft] = useState(String(bpm));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setDraft(String(bpm)); }, [bpm]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed > 0) setBpm(parsed);
    else setDraft(String(bpm));
  };

  return (
    <div style={{
      padding: 'var(--transport-pad, 12px) 14px', display: 'flex', flexDirection: 'column', gap: 1,
      borderRight: `1px solid ${theme.pillDivider}`, minWidth: 56,
    }}>
      <div style={{ fontSize: 9, opacity: 0.55, textTransform: 'uppercase' }}>bpm</div>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          if (e.key === 'Escape') { setDraft(String(bpm)); (e.currentTarget as HTMLInputElement).blur(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setBpm(bpm + 1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); setBpm(bpm - 1); }
        }}
        inputMode="numeric"
        style={{
          fontFamily: 'var(--mono)', fontSize: 14, color: theme.pillTextStrong,
          letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums',
          background: 'transparent', border: 'none', outline: 'none',
          padding: 0, width: 44,
        }}
      />
    </div>
  );
}

function KeyStat({ theme }: { theme: Theme }) {
  const musicalKey = useGroovyStore((s) => s.project.key);
  const setKey = useGroovyStore((s) => s.setKey);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<
    { left: number; top?: number; bottom?: number } | null
  >(null);

  const MENU_MAX_HEIGHT = 320;
  /** Above wfpl / modals / mixer — menu is portaled to `document.body`. */
  const MENU_Z = 10_000;

  const computeAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow) {
      return { left: rect.left, bottom: window.innerHeight - rect.top + 4 };
    }
    return { left: rect.left, top: rect.bottom + 4 };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setAnchor(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const next = computeAnchor();
      if (next) setAnchor(next);
    };
    place();
    const onScroll = () => close();
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      const menu = document.getElementById('key-stat-menu');
      if (menu?.contains(target)) return;
      close();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    const t = window.setTimeout(() => window.addEventListener('mousedown', onDoc), 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('mousedown', onDoc);
    };
  }, [open, close, computeAnchor]);

  const majors = MUSICAL_KEYS.filter((k) => k.endsWith('major'));
  const minors = MUSICAL_KEYS.filter((k) => k.endsWith('minor'));

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const next = computeAnchor();
    if (!next) return;
    setAnchor(next);
    setOpen(true);
  };

  // Never nest the dropdown (or its option buttons) inside the trigger `<button>` —
  // that's invalid HTML; browsers rewrite the DOM and clicks / aria updates break.
  const menu =
    open && anchor ? (
      <div
        id="key-stat-menu"
        role="listbox"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: anchor.left,
          top: anchor.top,
          bottom: anchor.bottom,
          zIndex: MENU_Z,
          background: theme.pillBg,
          border: `1px solid ${theme.pillBorder}`,
          borderRadius: 8,
          boxShadow: '0 16px 40px rgba(20,18,16,0.28)',
          padding: 6,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          minWidth: 220,
          maxHeight: MENU_MAX_HEIGHT,
          overflowY: 'auto',
        }}
      >
        <KeyColumn
          label="Major"
          keys={majors}
          current={musicalKey}
          theme={theme}
          onPick={(k) => {
            setKey(k);
            close();
          }}
        />
        <KeyColumn
          label="Minor"
          keys={minors}
          current={musicalKey}
          theme={theme}
          onPick={(k) => {
            setKey(k);
            close();
          }}
        />
      </div>
    ) : null;

  return (
    <>
      <div
        style={{
          padding: 'var(--transport-pad, 12px) 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRight: `1px solid ${theme.pillDivider}`,
          minWidth: 56,
          background: open ? theme.pillDivider : 'transparent',
        }}
      >
        <button
          type="button"
          ref={triggerRef}
          onClick={toggle}
          title="Change project key"
          aria-haspopup="listbox"
          aria-expanded={open}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: 'flex-start',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            font: 'inherit',
            color: 'inherit',
            padding: 0,
            width: '100%',
          }}
        >
          <div style={{ fontSize: 9, opacity: 0.55, textTransform: 'uppercase' }}>key</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              fontFamily: 'var(--display)',
              fontSize: 14,
              color: theme.pillTextStrong,
              letterSpacing: '-0.01em',
            }}
          >
            <span>{musicalKey}</span>
            <span style={{ fontSize: 8, opacity: 0.5, transform: 'translateY(-1px)' }}>▾</span>
          </div>
        </button>
      </div>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}

function KeyColumn({ label, keys, current, theme, onPick }: {
  label: string; keys: MusicalKey[]; current: MusicalKey; theme: Theme;
  onPick: (k: MusicalKey) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', opacity: 0.5, color: theme.pillText,
        padding: '2px 6px 4px',
      }}>{label}</div>
      {keys.map((k) => (
        <button
          type="button"
          key={k}
          onClick={() => onPick(k)}
          role="option"
          aria-selected={k === current}
          style={{
            padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--display)', fontSize: 13,
            color: theme.pillTextStrong,
            background: k === current ? theme.pillDivider : 'transparent',
            border: 'none', textAlign: 'left',
            fontVariantNumeric: 'tabular-nums',
          }}
        >{k.replace(/ (major|minor)$/, (_, mode) => (mode === 'major' ? '' : 'm'))}</button>
      ))}
    </div>
  );
}
