import type { Theme } from '../../types';

interface Props {
  rms: number;
  peak: number;
  height: number;
  theme: Theme;
}

export function VuMeter({ rms, peak, height, theme }: Props) {
  const rmsPct = Math.max(0, Math.min(1, rms));
  const peakPct = Math.max(0, Math.min(1, peak));

  return (
    <div style={{
      width: 10, height,
      background: theme.clipBg, border: `1px solid ${theme.pillDivider}`,
      borderRadius: 2, position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: `${rmsPct * 100}%`,
        background: `linear-gradient(to top, #547A5A 0%, #8FB572 55%, #C89A4B 80%, #B3261E 100%)`,
        transition: 'height 70ms linear',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0,
        bottom: `calc(${peakPct * 100}% - 1px)`,
        height: 2, background: peakPct > 0.95 ? '#B3261E' : '#E8D4AC', opacity: 0.9,
      }}/>
    </div>
  );
}
