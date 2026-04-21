import { Fragment } from 'react';
import { useUiStore } from '../store/useUiStore';
import { shortcutsForCheatsheet } from './menubar/commands';
import type { Theme } from '../types';

interface Props { theme: Theme }

export function HelpModals({ theme }: Props) {
  const shortcutsOpen = useUiStore((state) => state.shortcutsModalOpen);
  const aboutOpen = useUiStore((state) => state.aboutModalOpen);
  const setShortcutsOpen = useUiStore((state) => state.setShortcutsModalOpen);
  const setAboutOpen = useUiStore((state) => state.setAboutModalOpen);

  if (!shortcutsOpen && !aboutOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(20,18,16,0.45)',
      padding: 24,
    }} onClick={() => { setShortcutsOpen(false); setAboutOpen(false); }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.pillBg,
          border: `1px solid ${theme.pillBorder}`,
          borderRadius: 10,
          boxShadow: '0 24px 60px rgba(20,18,16,0.3)',
          padding: '18px 22px',
          minWidth: 340, maxWidth: 520, maxHeight: '80vh', overflowY: 'auto',
          fontFamily: 'var(--mono)', color: theme.pillTextStrong,
        }}>
        {shortcutsOpen ? <Shortcuts theme={theme} onClose={() => setShortcutsOpen(false)}/> : null}
        {aboutOpen ? <About theme={theme} onClose={() => setAboutOpen(false)}/> : null}
      </div>
    </div>
  );
}

function Shortcuts({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const rows = shortcutsForCheatsheet();
  return (
    <>
      <Header title="Keyboard Shortcuts" onClose={onClose} theme={theme}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 24px', marginTop: 12 }}>
        {rows.map((row, index) => (
          <Fragment key={`${row.label}-${index}`}>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{row.label}</div>
            <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: '0.04em' }}>{row.shortcut}</div>
          </Fragment>
        ))}
      </div>
    </>
  );
}

function About({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  return (
    <>
      <Header title="About Groovy" onClose={onClose} theme={theme}/>
      <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6, opacity: 0.9 }}>
        Groovy is an AI-assisted, paper-warm DAW. Jam with the Agent — a
        Gemini-powered collaborator wired directly into the timeline. Ask it
        to add tracks, generate loops, or split a clip at bar 4 and it plays
        along.
      </div>
      <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.55, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        prototype · v2
      </div>
    </>
  );
}

function Header({ title, onClose, theme }: { title: string; onClose: () => void; theme: Theme }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${theme.pillDivider}`, paddingBottom: 10,
    }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontStyle: 'italic' }}>{title}</div>
      <button onClick={onClose} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: theme.pillText,
      }}>close</button>
    </div>
  );
}
