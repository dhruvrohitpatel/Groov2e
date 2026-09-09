import type { Theme } from '../types';

interface Props {
  theme: Theme;
  variant: 'no-tracks' | 'no-clips';
  onAddTrack?: () => void;
  onOpenAgent?: () => void;
}

export function TimelineEmptyState({ theme, variant, onAddTrack, onOpenAgent }: Props) {
  const headline = variant === 'no-tracks'
    ? 'no tracks yet'
    : 'arm a track to record';
  const hint = variant === 'no-tracks'
    ? 'ask the agent to generate a loop — or drop audio here'
    : 'or drop audio here to import a clip';

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 300,
        right: 16,
        bottom: 24,
        border: `1px dashed ${theme.pillDivider}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        pointerEvents: 'none',
        color: theme.pillText,
        opacity: 0.8,
        zIndex: 3,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--display)',
          fontStyle: 'italic',
          fontSize: 18,
          color: theme.trackName,
          letterSpacing: '-0.01em',
        }}
      >
        {headline}
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          opacity: 0.75,
        }}
      >
        {hint}
      </div>
      {variant === 'no-tracks' ? (
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button
            onClick={onAddTrack}
            style={pillButton(theme, false)}
          >
            add track
          </button>
          <button
            onClick={onOpenAgent}
            style={pillButton(theme, true)}
          >
            ask the agent
          </button>
        </div>
      ) : null}
    </div>
  );
}

function pillButton(theme: Theme, primary: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '5px 12px',
    borderRadius: 999,
    border: primary ? 'none' : `1px solid ${theme.pillDivider}`,
    background: primary ? '#2340E8' : 'transparent',
    color: primary ? '#fff' : theme.pillTextStrong,
    cursor: 'pointer',
  };
}
