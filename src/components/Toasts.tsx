import { useUiStore } from '../store/useUiStore';
import type { Theme } from '../types';

interface Props { theme: Theme }

export function Toasts({ theme }: Props) {
  const toasts = useUiStore((state) => state.toasts);
  const dismiss = useUiStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 140, transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      zIndex: 40, pointerEvents: 'none',
    }}>
      {toasts.map((toast) => {
        const accent =
          toast.tone === 'error' ? '#B3261E' : toast.tone === 'warn' ? '#B98400' : theme.pillTextStrong;
        return (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            style={{
              pointerEvents: 'auto',
              padding: '8px 14px',
              background: theme.pillBg,
              border: `1px solid ${theme.pillBorder}`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: 6,
              boxShadow: '0 12px 30px rgba(20,18,16,0.18)',
              fontFamily: 'var(--mono)', fontSize: 11,
              color: theme.pillTextStrong, letterSpacing: '0.04em',
              cursor: 'pointer',
              maxWidth: 360,
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
