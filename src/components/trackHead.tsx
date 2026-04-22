import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '../types/models';
import type { Theme } from '../types';
import { INPUT_SOURCES, OUTPUT_SOURCES } from '../lib/constants';
import { Icon } from './icons';
import { Knob, MiniFader, PanSlider, fmtDb, fmtGain, fmtPan } from './controls';
import { trackController } from '../controllers/trackController';
import { trackMeterRegistry } from '../features/timeline/lib/trackMeters';
import { useMeterLevels } from './mixer/useMeterLevels';

const TRACK_COLOR_FALLBACK = '#C89A4B';

function IOPill({ label, value, options, onChange, theme, active }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  theme: Theme;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const t = setTimeout(() => window.addEventListener('click', close), 0);
    return () => { clearTimeout(t); window.removeEventListener('click', close); };
  }, [open]);
  const short = value.replace(/Scarlett 2i2 · /, '2i2·').replace(/Audient EVO 4 · /, 'EVO·');
  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 4,
        padding: '2px 6px',
        background: active && label === 'IN' ? 'rgba(179,38,30,0.08)' : open ? theme.pillDivider : 'transparent',
        border: `1px solid ${active && label === 'IN' ? '#B3261E' : theme.pillDivider}`,
        borderRadius: 3, cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 9, color: theme.trackName,
        letterSpacing: '0.04em', overflow: 'hidden',
      }}>
        <span style={{ opacity: 0.5 }}>{label}</span>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{short}</span>
        <span style={{ opacity: 0.4, fontSize: 7 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, minWidth: 180,
          background: theme.pillBg, border: `1px solid ${theme.pillBorder}`, borderRadius: 6,
          boxShadow: '0 8px 24px rgba(20,18,16,0.18)', padding: 4, zIndex: 30,
        }}>
          {options.map((o) => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); }} style={{
              padding: '4px 8px', borderRadius: 4,
              fontFamily: 'var(--sans)', fontSize: 11, color: theme.trackName,
              background: o === value ? theme.pillDivider : 'transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Real-time VU meter tapped off the wfpl track's post-fader signal via
// trackMeterRegistry (see features/timeline/lib/trackMeters.ts). Silent when
// the track is muted or before the audio graph is built. Peak-hold tick sits
// above the RMS bar and goes red when clipping.
function Meter({ trackId, muted, color, bg, border, height = 42 }: {
  trackId: string; muted: boolean; color: string; bg: string; border: string; height?: number;
}) {
  const getAnalyser = useCallback(
    () =>
      trackMeterRegistry.getMeter(trackId) as unknown as {
        getValue: () => number | Float32Array | number[];
      } | null,
    [trackId],
  );
  const levels = useMeterLevels(getAnalyser);
  const rmsPct = muted ? 0 : Math.max(0, Math.min(1, levels.rms));
  const peakPct = muted ? 0 : Math.max(0, Math.min(1, levels.peak));
  return (
    <div style={{
      width: 6, height, background: bg, borderRadius: 1,
      border: `1px solid ${border}`, position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: `${rmsPct * 100}%`,
        background: `linear-gradient(to top, ${color} 0%, ${color} 60%, #C89A4B 80%, #B3261E 100%)`,
        transition: 'height 70ms linear',
      }}/>
      {peakPct > 0.02 ? (
        <div style={{
          position: 'absolute', left: 0, right: 0,
          bottom: `calc(${peakPct * 100}% - 1px)`,
          height: 1,
          background: peakPct > 0.95 ? '#B3261E' : '#E8D4AC',
          opacity: 0.9,
        }}/>
      ) : null}
    </div>
  );
}

function TrackBtn({ children, on, onClick, title, activeBg, activeColor, pulse }: {
  children: React.ReactNode; on: boolean; onClick: (e: React.MouseEvent) => void; title: string;
  activeBg: string; activeColor: string; pulse?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 20, height: 18,
      border: `1px solid ${on ? activeBg : 'rgba(0,0,0,0.18)'}`,
      background: on ? activeBg : 'transparent',
      color: on ? activeColor : 'rgba(0,0,0,0.6)',
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
      cursor: 'pointer', padding: 0, borderRadius: 2,
      animation: pulse ? 'armPulse 1.4s ease-in-out infinite' : 'none',
    }}>{children}</button>
  );
}

interface Props {
  track: Track;
  theme: Theme;
  selected: boolean;
  height?: number;
}

export function TrackHead({ track, theme, selected, height }: Props) {
  const color = track.color ?? TRACK_COLOR_FALLBACK;
  const vol = track.vol ?? track.volume ?? 0.8;
  const gain = track.gain ?? 0;
  const input = track.input ?? 'No input';
  const output = track.output ?? 'Master';

  return (
    <div onClick={(e) => { e.stopPropagation(); trackController.selectTrack(track.id); }} style={{
      width: '100%', height: height ?? '100%',
      padding: 'var(--track-head-pad, 6px) 8px var(--track-head-pad, 6px) 10px',
      display: 'flex', flexDirection: 'column', gap: 4,
      background: selected ? theme.trackSelBg : theme.trackHeadBg,
      position: 'relative',
    }}>
      {selected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: theme.accent, zIndex: 1 }}/>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 18 }}>
        <div style={{ width: 6, height: 18, background: color, borderRadius: 1, flexShrink: 0 }}/>
        <input
          value={track.name}
          onChange={(e) => trackController.updateTrack(track.id, { name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1, minWidth: 0,
            fontFamily: 'var(--display)', fontSize: 'var(--font-track-name, 14px)', color: theme.trackName,
            fontWeight: 500, letterSpacing: '-0.01em',
            background: 'transparent', border: 'none', outline: 'none', padding: 0,
          }}
        />
        <button onClick={(e) => { e.stopPropagation(); trackController.deleteTrack(track.id); }}
          title="Delete track" style={{
            width: 16, height: 16, border: 'none', background: 'transparent',
            cursor: 'pointer', opacity: 0.4, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Icon.Close c={theme.trackName}/>
        </button>
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 4, marginLeft: 12, height: 18 }}>
        <IOPill label="IN"  value={input}  options={INPUT_SOURCES}  onChange={(v) => trackController.updateTrack(track.id, { input: v })}  theme={theme} active={track.armed}/>
        <IOPill label="OUT" value={output} options={OUTPUT_SOURCES} onChange={(v) => trackController.updateTrack(track.id, { output: v })} theme={theme}/>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12, marginTop: 2 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          <TrackBtn on={track.muted} onClick={(e) => { e.stopPropagation(); trackController.toggleTrackMute(track.id); }} title="Mute" activeBg="#6B6B6B" activeColor="#fff">M</TrackBtn>
          <TrackBtn on={track.solo}  onClick={(e) => { e.stopPropagation(); trackController.toggleTrackSolo(track.id); }} title="Solo" activeBg="#C89A4B" activeColor="#1a1210">S</TrackBtn>
          <TrackBtn on={track.armed} onClick={(e) => { e.stopPropagation(); trackController.toggleTrackArm(track.id); }} title="Arm"  activeBg="#B3261E" activeColor="#fff" pulse={track.armed}>●</TrackBtn>
        </div>
        <div onClick={(e) => e.stopPropagation()} title={`Gain ${fmtGain(gain)}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Knob value={gain} min={-12} max={24} size={18} theme={theme} color={color}
            onChange={(v) => trackController.updateTrack(track.id, { gain: v })}/>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: theme.trackSub, marginTop: 1, letterSpacing: '0.04em' }}>GAIN</div>
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <PanSlider value={track.pan} onChange={(v) => trackController.updateTrack(track.id, { pan: v })} theme={theme} color={color} width={56}/>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: theme.trackSub, marginTop: 1, letterSpacing: '0.04em' }}>{fmtPan(track.pan)}</div>
        </div>
        <div style={{ flex: 1 }}/>
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <MiniFader value={vol} onChange={(v) => trackController.updateTrack(track.id, { vol: v, volume: v })} theme={theme} color={color} height={Math.max(28, (height ?? 84) - 50)}/>
          <Meter trackId={track.id} muted={track.muted} color={color} bg={theme.clipBg} border={theme.pillDivider} height={Math.max(28, (height ?? 84) - 50)}/>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: theme.trackSub, width: 32, textAlign: 'right', letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {fmtDb(vol)}
          </div>
        </div>
      </div>
    </div>
  );
}
