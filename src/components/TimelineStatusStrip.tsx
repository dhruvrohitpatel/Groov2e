import { useUiStore } from '../store/useUiStore';
import { useGroovyStore } from '../store/useGroovyStore';
import { formatBarBeatTick, formatTimecode, secondsToBarBeatTick } from '../lib/musicalTime';
import type { SnapMode, Theme } from '../types';

interface Props {
  theme: Theme;
}

const SNAP_OPTIONS: Array<{ value: SnapMode; label: string }> = [
  { value: 'bar', label: 'bar' },
  { value: 'beat', label: 'beat' },
  { value: 'off', label: 'off' },
];

export function TimelineStatusStrip({ theme }: Props) {
  const cursorPosition = useGroovyStore((state) => state.cursorPosition);
  const bpm = useGroovyStore((state) => state.project.bpm);
  const key = useGroovyStore((state) => state.project.key);
  const snap = useUiStore((state) => state.snap);
  const setSnap = useUiStore((state) => state.setSnap);
  const canZoomIn = useUiStore((state) => state.canZoomIn);
  const canZoomOut = useUiStore((state) => state.canZoomOut);
  const zoomIn = useUiStore((state) => state.zoomIn);
  const zoomOut = useUiStore((state) => state.zoomOut);

  const barBeatTick = secondsToBarBeatTick(cursorPosition, bpm);
  const isAtMinZoom = !canZoomIn;
  const isAtMaxZoom = !canZoomOut;

  return (
    <div style={{
      height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 14px', gap: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'var(--mono)', fontSize: 11, color: theme.pillTextStrong,
        letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ opacity: 0.55, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.12em' }}>bar</span>
        <span style={{ fontWeight: 600 }}>{formatBarBeatTick(barBeatTick)}</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <span style={{ opacity: 0.75 }}>{formatTimecode(cursorPosition)}</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <span style={{ opacity: 0.75 }}>{bpm} bpm</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <span style={{ opacity: 0.75 }}>{key}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--mono)', fontSize: 9.5, color: theme.pillText,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          <span style={{ opacity: 0.55 }}>snap</span>
          <div style={{
            display: 'flex',
            border: `1px solid ${theme.pillDivider}`,
            borderRadius: 4, overflow: 'hidden',
          }}>
            {SNAP_OPTIONS.map((option) => (
              <button key={option.value} onClick={() => setSnap(option.value)} style={{
                padding: '3px 8px',
                background: snap === option.value ? '#141210' : 'transparent',
                color: snap === option.value ? '#F5EFE4' : theme.pillText,
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 9.5,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{option.label}</button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'var(--mono)', fontSize: 9.5, color: theme.pillText,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          <span style={{ opacity: 0.55 }}>zoom</span>
          <button
            onClick={zoomOut}
            disabled={isAtMaxZoom}
            title="Zoom out"
            style={{
              width: 22, height: 20, borderRadius: 4,
              border: `1px solid ${theme.pillDivider}`, background: 'transparent',
              cursor: isAtMaxZoom ? 'not-allowed' : 'pointer', color: theme.pillTextStrong,
              opacity: isAtMaxZoom ? 0.35 : 1,
              fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >−</button>
          <button
            onClick={zoomIn}
            disabled={isAtMinZoom}
            title="Zoom in"
            style={{
              width: 22, height: 20, borderRadius: 4,
              border: `1px solid ${theme.pillDivider}`, background: 'transparent',
              cursor: isAtMinZoom ? 'not-allowed' : 'pointer', color: theme.pillTextStrong,
              opacity: isAtMinZoom ? 0.35 : 1,
              fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >+</button>
        </div>
      </div>
    </div>
  );
}
