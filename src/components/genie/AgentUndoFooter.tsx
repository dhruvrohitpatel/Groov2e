import type { Theme } from '../../types';
import { useGroovyStore } from '../../store/useGroovyStore';
import { useUiStore } from '../../store/useUiStore';

interface Props {
  theme: Theme;
}

export function AgentUndoFooter({ theme }: Props) {
  const undoStack = useGroovyStore((s) => s.agentUndoStack);
  const last = undoStack[undoStack.length - 1];
  if (!last) return null;

  const undo = () => {
    const reverted = useGroovyStore.getState().undoLastAgentChange();
    if (reverted) {
      useUiStore.getState().pushToast({
        kind: 'info',
        message: `Undid "${reverted.label}"`,
      });
    }
  };

  return (
    <div
      style={{
        margin: '0 12px 10px',
        padding: '8px 10px',
        border: `1px solid ${theme.pillDivider}`,
        borderRadius: 10,
        background: theme.clipCardBg,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: theme.geniePanelText,
      }}
    >
      <span style={{ flex: 1, opacity: 0.8 }}>
        Last AI change · <b style={{ fontWeight: 600 }}>{last.label}</b>
      </span>
      <button
        onClick={undo}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.04em',
          padding: '4px 9px',
          borderRadius: 6,
          border: `1px solid ${theme.pillDivider}`,
          background: 'transparent',
          color: theme.geniePanelText,
          cursor: 'pointer',
        }}
        title="Undo Last AI Change (⌘⇧Z)"
      >
        ⟲ undo
      </button>
    </div>
  );
}
