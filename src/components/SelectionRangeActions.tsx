import type { Theme } from '../types';
import { useGroovyStore } from '../store/useGroovyStore';
import { useUiStore, type SelectionSnap } from '../store/useUiStore';

interface Props {
  theme: Theme;
}

const SNAP_OPTIONS: SelectionSnap[] = ['off', 'beat', 'bar'];

export function SelectionRangeActions({ theme }: Props) {
  const selectionSnap = useUiStore((s) => s.selectionSnap);
  const setSelectionSnap = useUiStore((s) => s.setSelectionSnap);

  const cropToSelectionRange = useGroovyStore((s) => s.cropToSelectionRange);
  const deleteSelectionRange = useGroovyStore((s) => s.deleteSelectionRange);
  const duplicateSelectionRange = useGroovyStore((s) => s.duplicateSelectionRange);
  const clearSelectionRange = useGroovyStore((s) => s.clearSelectionRange);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 92,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: theme.pillBg,
        border: `1px solid ${theme.pillBorder}`,
        borderRadius: 999,
        boxShadow: '0 6px 20px rgba(20,18,16,0.18)',
        fontFamily: 'var(--mono)',
        fontSize: 10.5,
        color: theme.pillTextStrong,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        zIndex: 19,
      }}
    >
      <span style={{ opacity: 0.55 }}>range</span>

      <div style={{ display: 'flex', gap: 2, padding: '0 6px', borderRight: `1px solid ${theme.pillDivider}` }}>
        {SNAP_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => setSelectionSnap(option)}
            title={`Snap to ${option}`}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              background: selectionSnap === option ? theme.pillDivider : 'transparent',
              border: 'none',
              color: theme.pillTextStrong,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              opacity: selectionSnap === option ? 1 : 0.55,
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <button onClick={cropToSelectionRange} style={actionBtn(theme)}>crop</button>
      <button onClick={() => { duplicateSelectionRange(); }} style={actionBtn(theme)}>duplicate</button>
      <button
        onClick={deleteSelectionRange}
        style={{
          ...actionBtn(theme),
          color: '#B3261E',
          borderColor: 'rgba(179,38,30,0.35)',
        }}
      >
        delete
      </button>
      <button onClick={clearSelectionRange} style={{ ...actionBtn(theme), opacity: 0.55 }}>
        clear
      </button>
    </div>
  );
}

function actionBtn(theme: Theme): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    background: 'transparent',
    border: `1px solid ${theme.pillDivider}`,
    color: theme.pillTextStrong,
    fontFamily: 'var(--mono)',
    fontSize: 10.5,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  };
}
