import { useEffect, useMemo, useState } from 'react';
import type { Theme } from '../../types';
import { useUiStore } from '../../store/useUiStore';
import { useGroovyStore } from '../../store/useGroovyStore';
import { projectController } from '../../controllers/projectController';
import {
  localProjectSnapshot,
  type ProjectListEntry,
} from '../../features/project/services/projectPersistenceService';
import { audioBlobStore } from '../../features/project/services/audioBlobStore';

interface Props {
  theme: Theme;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatWhen(ts: number): string {
  const now = Date.now();
  const delta = Math.max(0, now - ts);
  const m = Math.floor(delta / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function ProjectsDialog({ theme }: Props) {
  const open = useUiStore((s) => s.projectsDialogOpen);
  const setOpen = useUiStore((s) => s.setProjectsDialogOpen);

  const [entries, setEntries] = useState<ProjectListEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [newName, setNewName] = useState('');
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);

  const refresh = () => {
    setEntries(localProjectSnapshot.listProjects());
    setActiveId(localProjectSnapshot.getActiveId());
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    void audioBlobStore.estimateQuota().then(setQuota).catch(() => setQuota(null));
  }, [open]);

  const quotaPct = useMemo(() => {
    if (!quota || quota.quota === 0) return null;
    return Math.min(100, (quota.usage / quota.quota) * 100);
  }, [quota]);

  if (!open) return null;

  const createNew = () => {
    const name = newName.trim() || 'Untitled';
    const entry = projectController.createBrowserProject(name);
    setNewName('');
    setOpen(false);
    refresh();
    useUiStore.getState().showToast(`Created "${entry.name}"`, 'info');
  };

  const openProject = async (id: string) => {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    await projectController.switchToBrowserProject(id);
    setOpen(false);
    useUiStore.getState().showToast('Project loaded', 'info');
  };

  const commitRename = (id: string) => {
    const next = renameDraft.trim();
    if (next) {
      projectController.renameBrowserProject(id, next);
      if (id === activeId) {
        useGroovyStore.getState().setProjectName(next);
      }
    }
    setRenamingId(null);
    setRenameDraft('');
    refresh();
  };

  const deleteProject = async (id: string, name: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`Delete project "${name}"? Audio will be removed.`);
      if (!ok) return;
    }
    await projectController.deleteBrowserProject(id);
    refresh();
    useUiStore.getState().showToast(`Deleted "${name}"`, 'info');
  };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(20,18,16,0.45)', padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.pillBg,
          border: `1px solid ${theme.pillBorder}`,
          borderRadius: 10,
          boxShadow: '0 24px 60px rgba(20,18,16,0.3)',
          padding: '18px 22px',
          width: 540, maxHeight: '80vh', overflowY: 'auto',
          fontFamily: 'var(--mono)', color: theme.pillTextStrong,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: 'var(--display)', fontSize: 20, fontStyle: 'italic',
            letterSpacing: '-0.02em', color: theme.topBarText,
          }}>
            Projects
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em',
              padding: '4px 10px', border: `1px solid ${theme.pillDivider}`,
              background: 'transparent', color: theme.pillTextStrong, cursor: 'pointer',
              borderRadius: 4, textTransform: 'uppercase',
            }}
          >close</button>
        </div>

        <div style={{
          display: 'flex', gap: 8, marginBottom: 16,
          padding: '10px 12px',
          border: `1px dashed ${theme.pillDivider}`, borderRadius: 8,
        }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createNew(); }}
            placeholder="New project name"
            style={{
              flex: 1, padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12,
              border: `1px solid ${theme.pillDivider}`, background: 'transparent',
              color: theme.pillTextStrong, borderRadius: 4, outline: 'none',
            }}
          />
          <button
            onClick={createNew}
            style={{
              padding: '6px 14px', fontFamily: 'var(--mono)', fontSize: 10,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              border: `1px solid ${theme.pillBorder}`, background: theme.pillDivider,
              color: theme.pillTextStrong, cursor: 'pointer', borderRadius: 4,
            }}
          >create</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.length === 0 && (
            <div style={{ fontSize: 11, opacity: 0.6, padding: '12px 0' }}>
              No projects yet. Create one above.
            </div>
          )}
          {entries.map((entry) => {
            const isActive = entry.id === activeId;
            const isRenaming = renamingId === entry.id;
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 6,
                  border: `1px solid ${isActive ? theme.pillBorder : theme.pillDivider}`,
                  background: isActive ? theme.pillDivider : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(entry.id);
                        if (e.key === 'Escape') { setRenamingId(null); setRenameDraft(''); }
                      }}
                      onBlur={() => commitRename(entry.id)}
                      style={{
                        width: '100%', padding: '4px 6px', fontFamily: 'var(--mono)',
                        fontSize: 12, border: `1px solid ${theme.pillDivider}`,
                        background: 'transparent', color: theme.pillTextStrong,
                        borderRadius: 4, outline: 'none',
                      }}
                    />
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 8,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entry.name}
                      </div>
                      {isActive && (
                        <span style={{
                          fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                          opacity: 0.7,
                        }}>active</span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>
                    updated {formatWhen(entry.updatedAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {!isActive && (
                    <button
                      onClick={() => { void openProject(entry.id); }}
                      style={pillBtnStyle(theme)}
                    >open</button>
                  )}
                  <button
                    onClick={() => {
                      setRenamingId(entry.id);
                      setRenameDraft(entry.name);
                    }}
                    style={pillBtnStyle(theme)}
                  >rename</button>
                  <button
                    onClick={() => { void deleteProject(entry.id, entry.name); }}
                    style={{
                      ...pillBtnStyle(theme),
                      color: '#B3261E',
                      borderColor: 'rgba(179,38,30,0.35)',
                    }}
                  >delete</button>
                </div>
              </div>
            );
          })}
        </div>

        {quota && (
          <div style={{ marginTop: 18, fontSize: 10, opacity: 0.7 }}>
            <div style={{ marginBottom: 4 }}>
              Browser storage · {formatBytes(quota.usage)} of {formatBytes(quota.quota)}
              {quotaPct !== null && ` (${quotaPct.toFixed(1)}%)`}
            </div>
            <div style={{
              height: 4, borderRadius: 2, background: theme.pillDivider, overflow: 'hidden',
            }}>
              <div style={{
                width: `${quotaPct ?? 0}%`, height: '100%',
                background: (quotaPct ?? 0) > 80 ? '#B3261E' : theme.pillBorder,
              }}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function pillBtnStyle(theme: Theme): React.CSSProperties {
  return {
    padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 10,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    border: `1px solid ${theme.pillDivider}`, background: 'transparent',
    color: theme.pillTextStrong, cursor: 'pointer', borderRadius: 4,
  };
}
