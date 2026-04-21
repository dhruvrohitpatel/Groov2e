import { useCallback } from 'react';
import type { Track } from '../../types/models';
import type { Theme } from '../../types';
import { trackController } from '../../controllers/trackController';
import { Knob, MiniFader, PanSlider, fmtDb, fmtGain, fmtPan } from '../controls';
import { trackMeterRegistry } from '../../features/timeline/lib/trackMeters';
import { useMeterLevels } from './useMeterLevels';
import { VuMeter } from './VuMeter';
import { TRACK_COLORS } from '../../features/timeline/lib/playlistAdapter';

interface Props {
  track: Track;
  trackIndex: number;
  theme: Theme;
  selected: boolean;
}

export function MixerStrip({ track, trackIndex, theme, selected }: Props) {
  const color = track.color ?? TRACK_COLORS[trackIndex % TRACK_COLORS.length];
  const vol = track.vol ?? track.volume ?? 0.8;
  const gain = track.gain ?? 0;

  const getAnalyser = useCallback(
    () => trackMeterRegistry.getMeter(track.id) as unknown as { getValue: () => number | Float32Array | number[] } | null,
    [track.id],
  );
  const levels = useMeterLevels(getAnalyser);

  return (
    <div
      onClick={() => trackController.selectTrack(track.id)}
      style={{
        width: 112, flexShrink: 0,
        borderRadius: 6,
        border: `1px solid ${selected ? theme.accent : theme.pillDivider}`,
        background: selected ? theme.trackSelBg : theme.trackBg,
        padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <div style={{ width: 6, height: 14, background: color, borderRadius: 1, flexShrink: 0 }}/>
        <div style={{
          flex: 1, minWidth: 0,
          fontFamily: 'var(--display)', fontSize: 12, color: theme.trackName,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{track.name}</div>
      </div>

      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        <StripBtn on={track.muted} onClick={() => trackController.toggleTrackMute(track.id)} title="Mute" activeBg="#6B6B6B" activeColor="#fff">M</StripBtn>
        <StripBtn on={track.solo} onClick={() => trackController.toggleTrackSolo(track.id)} title="Solo" activeBg="#C89A4B" activeColor="#1a1210">S</StripBtn>
        <StripBtn on={track.armed} onClick={() => trackController.toggleTrackArm(track.id)} title="Arm" activeBg="#B3261E" activeColor="#fff" pulse={track.armed}>R</StripBtn>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Knob value={gain} min={-12} max={24} size={18} theme={theme} color={color}
            onChange={(v) => trackController.updateTrack(track.id, { gain: v })}/>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: theme.trackSub, letterSpacing: '0.04em' }}>
            {fmtGain(gain)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <PanSlider value={track.pan} onChange={(v) => trackController.updateTrack(track.id, { pan: v })} theme={theme} color={color} width={48}/>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: theme.trackSub, letterSpacing: '0.04em' }}>
            {fmtPan(track.pan)}
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 4,
        minHeight: 80, paddingTop: 2,
      }}>
        <MiniFader value={vol} onChange={(v) => trackController.updateTrack(track.id, { vol: v, volume: v })} theme={theme} color={color} height={80}/>
        <VuMeter rms={levels.rms} peak={levels.peak} height={80} theme={theme}/>
      </div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, color: theme.trackSub,
        textAlign: 'center', letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{fmtDb(vol)}</div>
    </div>
  );
}

function StripBtn({ children, on, onClick, title, activeBg, activeColor, pulse }: {
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
  title: string;
  activeBg: string;
  activeColor: string;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        width: 22, height: 18, borderRadius: 3,
        border: `1px solid ${on ? activeBg : 'rgba(0,0,0,0.18)'}`,
        background: on ? activeBg : 'transparent',
        color: on ? activeColor : 'rgba(0,0,0,0.6)',
        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
        cursor: 'pointer', padding: 0,
        animation: pulse ? 'armPulse 1.4s ease-in-out infinite' : 'none',
      }}
    >{children}</button>
  );
}
