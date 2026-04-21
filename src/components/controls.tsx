import { useRef } from 'react';
import type { Theme } from '../types';

interface KnobProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: number;
  label?: string;
  theme: Theme;
  color?: string;
}

export function Knob({ value, onChange, min = 0, max = 1, size = 22, label, theme, color }: KnobProps) {
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startVal = value;
    const range = max - min;
    const move = (ev: PointerEvent) => {
      const dy = startY - ev.clientY;
      const dv = (dy / 100) * range;
      onChange(Math.max(min, Math.min(max, startVal + dv)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const pct = (value - min) / (max - min);
  const angle = -135 + pct * 270;
  const c = color || theme.pillTextStrong;
  return (
    <div onPointerDown={onPointerDown} title={label} style={{
      width: size, height: size, borderRadius: '50%',
      background: theme.clipBg,
      border: `1px solid ${theme.pillDivider}`,
      position: 'relative', cursor: 'ns-resize', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(${angle}deg)` }}>
        <div style={{
          position: 'absolute', top: 1, left: '50%', width: 1.5, height: size / 2 - 2,
          background: c, transform: 'translateX(-50%)', borderRadius: 1,
        }}/>
      </div>
    </div>
  );
}

interface PanProps { value: number; onChange: (v: number) => void; theme: Theme; color?: string; width?: number }

export function PanSlider({ value, onChange, theme, color, width = 70 }: PanProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = ref.current!.getBoundingClientRect();
    const update = (cx: number) => {
      const v = ((cx - r.left) / r.width) * 2 - 1;
      onChange(Math.max(-1, Math.min(1, v)));
    };
    update(e.clientX);
    const move = (ev: PointerEvent) => update(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const x = ((value + 1) / 2) * width;
  return (
    <div ref={ref} onPointerDown={onPointerDown}
      onDoubleClick={(e) => { e.stopPropagation(); onChange(0); }}
      style={{ width, height: 12, position: 'relative', cursor: 'ew-resize', flexShrink: 0 }}
      title="Pan (double-click to center)">
      <div style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 2, background: theme.pillDivider, borderRadius: 1 }}/>
      <div style={{ position: 'absolute', top: 2, left: width / 2 - 0.5, width: 1, height: 8, background: theme.pillText, opacity: 0.4 }}/>
      <div style={{
        position: 'absolute', top: 5, height: 2,
        left: value < 0 ? x : width / 2,
        width: Math.abs(x - width / 2),
        background: color || theme.accent, borderRadius: 1,
      }}/>
      <div style={{
        position: 'absolute', top: 1, left: x - 5, width: 10, height: 10, borderRadius: '50%',
        background: color || theme.accent, boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}/>
    </div>
  );
}

interface FaderProps { value: number; onChange: (v: number) => void; theme: Theme; color?: string; height?: number; width?: number }

export function MiniFader({ value, onChange, theme, color, height = 42, width = 8 }: FaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = ref.current!.getBoundingClientRect();
    const update = (cy: number) => {
      const v = 1 - (cy - r.top) / r.height;
      onChange(Math.max(0, Math.min(1, v)));
    };
    update(e.clientY);
    const move = (ev: PointerEvent) => update(ev.clientY);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div ref={ref} onPointerDown={onPointerDown} style={{
      width: width + 6, height, position: 'relative', cursor: 'ns-resize', flexShrink: 0,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
    }} title="Volume">
      <div style={{ width: 2, height, background: theme.pillDivider, borderRadius: 1 }}/>
      <div style={{
        position: 'absolute', left: width / 2 + 2, bottom: 0, width: 2,
        height: value * height, background: color || theme.pillTextStrong, borderRadius: 1,
      }}/>
      <div style={{
        position: 'absolute', left: 0, bottom: value * height - 3,
        width: width + 6, height: 6, background: theme.clipBg,
        border: `1px solid ${theme.pillDivider}`, borderRadius: 2,
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }}/>
    </div>
  );
}

function vToDb(v: number) {
  if (v <= 0.001) return -Infinity;
  return 20 * Math.log10(v);
}
export function fmtDb(v: number) {
  const db = vToDb(v);
  if (!isFinite(db)) return '−∞';
  if (db > 0) return '+' + db.toFixed(1);
  return db.toFixed(1);
}
export function fmtPan(p: number) {
  if (Math.abs(p) < 0.02) return 'C';
  return (p < 0 ? 'L' : 'R') + Math.round(Math.abs(p) * 100);
}
export function fmtGain(g: number) {
  return (g > 0 ? '+' : '') + g.toFixed(1) + 'dB';
}
