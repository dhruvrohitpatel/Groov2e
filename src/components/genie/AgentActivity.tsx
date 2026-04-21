import type { Theme } from '../../types';
import type { AgentToolActivity } from '../../store/stateTypes';

interface Props {
  activity: AgentToolActivity[];
  theme: Theme;
}

const CATEGORY_EMOJI: Record<string, string> = {
  generateAndInsertClip: '✨',
  addTrack: '＋',
  deleteTrack: '－',
  splitTrackAtBar: '✂︎',
  deleteClip: '⌫',
  moveClip: '↔︎',
  trimClip: '⇥',
};

export function AgentActivity({ activity, theme }: Props) {
  if (activity.length === 0) return null;

  return (
    <div
      style={{
        margin: '0 0 4px',
        padding: '8px 10px',
        background: theme.clipCardBg,
        border: `1px solid ${theme.pillDivider}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: 0.55,
          color: theme.geniePanelText,
        }}
      >
        Agent · actions
      </div>
      {activity.map((a) => (
        <ActivityRow key={a.id} a={a} theme={theme} />
      ))}
    </div>
  );
}

function ActivityRow({ a, theme }: { a: AgentToolActivity; theme: Theme }) {
  const glyph = CATEGORY_EMOJI[a.name] ?? '•';
  const color =
    a.status === 'ok'
      ? '#2e7d32'
      : a.status === 'error'
      ? '#b3261e'
      : theme.geniePanelText;
  const label = formatLabel(a.name, a.args);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--mono)',
        fontSize: 10.5,
        color: theme.geniePanelText,
      }}
    >
      <span
        style={{
          width: 14,
          textAlign: 'center',
          color,
          opacity: a.status === 'running' ? 0.6 : 1,
        }}
      >
        {a.status === 'running' ? '…' : a.status === 'ok' ? '✓' : '!'}
      </span>
      <span style={{ opacity: 0.75 }}>{glyph}</span>
      <span style={{ flex: 1 }}>
        <b style={{ fontWeight: 600 }}>{a.name}</b>
        {label ? <span style={{ opacity: 0.7 }}> · {label}</span> : null}
      </span>
      {a.snapshotPushed && a.status === 'ok' ? (
        <span
          title="Reversible via Undo Last AI Change (⌘⇧Z)"
          style={{ opacity: 0.55, fontSize: 10 }}
        >
          ⟲
        </span>
      ) : null}
      {a.status !== 'running' && typeof a.durationMs === 'number' ? (
        <span style={{ opacity: 0.4, fontSize: 9.5 }}>{a.durationMs}ms</span>
      ) : null}
    </div>
  );
}

function formatLabel(name: string, args: unknown): string {
  if (!args || typeof args !== 'object') return '';
  const record = args as Record<string, unknown>;

  // Best-effort human labels for the most common tools.
  switch (name) {
    case 'generateAndInsertClip':
      return `${record.bars ?? '?'} bars · "${truncate(record.prompt)}"`;
    case 'addTrack':
      return String(record.name ?? '');
    case 'setTrackVolumeDb':
      return `${record.track ?? ''} → ${record.db ?? 0} dB`;
    case 'setTrackPan':
      return `${record.track ?? ''} pan ${record.percent ?? 0}%`;
    case 'splitTrackAtBar':
      return `${record.track ?? ''} @ bar ${record.bar ?? '?'}`;
    case 'seekToBar':
      return `bar ${record.bar ?? '?'}`;
    case 'setBpm':
      return `${record.bpm ?? '?'} BPM`;
    case 'setProjectName':
      return truncate(record.name);
    default: {
      const keys = Object.keys(record);
      if (keys.length === 0) return '';
      const first = keys[0]!;
      return `${first}=${truncate(record[first])}`;
    }
  }
}

function truncate(v: unknown): string {
  const s = String(v ?? '');
  return s.length > 40 ? `${s.slice(0, 37)}…` : s;
}
