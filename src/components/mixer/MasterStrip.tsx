import { useCallback } from 'react';
import type { Theme } from '../../types';
import { getMasterAnalyser } from '../../features/audio/services/masterAnalyser';
import { useMeterLevels } from './useMeterLevels';
import { VuMeter } from './VuMeter';

interface Props { theme: Theme }

export function MasterStrip({ theme }: Props) {
  const getAnalyser = useCallback(
    () => getMasterAnalyser() as unknown as { getValue: () => number | Float32Array | number[] } | null,
    [],
  );
  const levels = useMeterLevels(getAnalyser);

  return (
    <div style={{
      width: 112, flexShrink: 0,
      borderRadius: 6,
      border: `1px solid ${theme.pillDivider}`,
      background: theme.trackSelBg,
      padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'relative',
    }}>
      <div style={{
        fontFamily: 'var(--display)', fontSize: 13, fontStyle: 'italic',
        color: theme.trackName, letterSpacing: '-0.01em',
      }}>Master</div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9,
        color: theme.trackSub, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>stereo bus</div>

      <div style={{ flex: 1 }}/>

      <div style={{
        display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 4,
        height: 110,
      }}>
        <VuMeter rms={levels.rmsLeft || levels.rms} peak={levels.peak} height={110} theme={theme}/>
        <VuMeter rms={levels.rmsRight || levels.rms} peak={levels.peak} height={110} theme={theme}/>
      </div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, color: theme.trackSub,
        textAlign: 'center', letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {levels.peak > 0.001 ? `${(20 * Math.log10(levels.peak)).toFixed(1)} dB` : '—'}
      </div>
    </div>
  );
}
