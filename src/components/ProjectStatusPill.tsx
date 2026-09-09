import { useEffect, useState } from 'react';
import type { Theme } from '../types';
import { useGroovyStore } from '../store/useGroovyStore';
import { localProjectSnapshot } from '../features/project/services/projectPersistenceService';

interface Props {
  theme: Theme;
}

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return 'not saved';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'not saved';
  const diff = Math.max(0, now - then);
  if (diff < 30_000) return 'saved just now';
  if (diff < 60_000) return 'saved <1m ago';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `saved ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `saved ${hours}h ago`;
}

export function ProjectStatusPill({ theme }: Props) {
  const isDirty = useGroovyStore((s) => s.projectFile.isDirty);
  const savingState = useGroovyStore((s) => s.projectFile.savingState);
  const lastSavedAt = useGroovyStore((s) => s.projectFile.lastSavedAt);
  const lastError = useGroovyStore((s) => s.projectFile.lastError);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  let label: string;
  let color = theme.pillText;

  if (savingState === 'saving') {
    label = 'saving…';
  } else if (savingState === 'error') {
    label = lastError ? `save failed — retry` : 'save failed — retry';
    color = '#B3261E';
  } else if (isDirty) {
    label = 'unsaved';
    color = '#B98400';
  } else {
    label = formatRelative(lastSavedAt, now);
  }

  const canRetry = savingState === 'error';

  return (
    <button
      onClick={canRetry ? () => { localProjectSnapshot.save(); } : undefined}
      disabled={!canRetry}
      title={lastError ?? undefined}
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        border: `1px solid ${theme.pillDivider}`,
        background: savingState === 'error' ? 'rgba(179,38,30,0.08)' : 'transparent',
        color,
        cursor: canRetry ? 'pointer' : 'default',
      }}
    >
      {label}
    </button>
  );
}
