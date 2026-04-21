import { useGroovyStore } from '../../store/useGroovyStore';
import type { Theme } from '../../types';
import { MixerStrip } from './MixerStrip';
import { MasterStrip } from './MasterStrip';

interface Props {
  theme: Theme;
  open: boolean;
}

export function MixerDrawer({ theme, open }: Props) {
  const tracks = useGroovyStore((state) => state.tracks);
  const selectedTrackId = useGroovyStore((state) => state.selectedTrackId);

  if (!open) return null;

  return (
    <div style={{
      height: 240,
      flexShrink: 0,
      borderTop: `1px solid ${theme.rule}`,
      background: theme.trackHeadBg,
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      minHeight: 0,
    }}>
      <div style={{
        height: 26, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px',
        borderBottom: `1px solid ${theme.pillDivider}`,
        fontFamily: 'var(--mono)', fontSize: 10,
        color: theme.pillText, letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        <span>mixer · {tracks.length} strip{tracks.length === 1 ? '' : 's'}</span>
        <span style={{ opacity: 0.45 }}>live</span>
      </div>

      <div style={{
        flex: 1, minHeight: 0, display: 'flex',
        overflowX: 'auto', overflowY: 'hidden',
        padding: '10px 10px',
        gap: 8,
      }}>
        {tracks.map((track, index) => (
          <MixerStrip
            key={track.id}
            track={track}
            trackIndex={index}
            theme={theme}
            selected={selectedTrackId === track.id}
          />
        ))}
        <div style={{
          width: 1, flexShrink: 0, alignSelf: 'stretch',
          background: theme.pillDivider, opacity: 0.6, margin: '0 6px',
        }}/>
        <MasterStrip theme={theme}/>
      </div>
    </div>
  );
}
