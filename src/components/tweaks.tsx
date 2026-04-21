import type { Theme, Tweaks } from '../types';
import { Icon } from './icons';

interface Props {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => void;
  open: boolean;
  onClose: () => void;
  theme: Theme;
}

export function TweaksPanel({ tweaks, setTweak, open, onClose, theme }: Props) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      width: 280, background: theme.tweakBg,
      border: `1px solid ${theme.pillDivider}`, borderRadius: 12,
      boxShadow: '0 12px 40px rgba(20,18,16,0.25)',
      fontFamily: 'var(--sans)', color: theme.pillTextStrong, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.pillDivider}`,
      }}>
        <div style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 16, letterSpacing: '-0.01em' }}>Tweaks</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.6 }}>
          <Icon.Close c={theme.pillTextStrong}/>
        </button>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TweakRow label="theme">
          <Seg options={[
            { v: 'warm', l: 'warm' },
            { v: 'light', l: 'paper' },
            { v: 'dark', l: 'ink' },
          ]} value={tweaks.theme} onChange={(v) => setTweak('theme', v)}/>
        </TweakRow>
        <TweakRow label="density">
          <Seg options={[
            { v: 'compact', l: 'compact' },
            { v: 'comfortable', l: 'cozy' },
            { v: 'spacious', l: 'room' },
          ]} value={tweaks.density} onChange={(v) => setTweak('density', v)}/>
        </TweakRow>
        <TweakRow label="mixer">
          <Seg options={[{ v: true, l: 'show' }, { v: false, l: 'hide' }]} value={tweaks.mixer} onChange={(v) => setTweak('mixer', v)}/>
        </TweakRow>
        <TweakRow label="phone">
          <Seg options={[{ v: true, l: 'show' }, { v: false, l: 'hide' }]} value={tweaks.phone} onChange={(v) => setTweak('phone', v)}/>
        </TweakRow>
      </div>
    </div>
  );
}

function TweakRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9.5, opacity: 0.55,
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Seg<V extends string | boolean>({
  options, value, onChange,
}: { options: { v: V; l: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <div style={{
      display: 'flex', border: '1px solid rgba(20,18,16,0.15)',
      borderRadius: 6, padding: 2, background: 'rgba(20,18,16,0.03)',
    }}>
      {options.map((o) => (
        <button key={String(o.v)} onClick={() => onChange(o.v)} style={{
          flex: 1, padding: '5px 0',
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.03em',
          border: 'none',
          background: value === o.v ? '#141210' : 'transparent',
          color: value === o.v ? '#F5EFE4' : 'inherit',
          borderRadius: 4, cursor: 'pointer', textTransform: 'lowercase',
        }}>{o.l}</button>
      ))}
    </div>
  );
}
