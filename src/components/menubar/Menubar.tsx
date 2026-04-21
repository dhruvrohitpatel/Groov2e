import { useEffect, useMemo, useRef, useState } from 'react';
import type { Theme } from '../../types';
import { buildMenuGroups, runCommand, type MenuGroup, type MenuGroupId } from './commands';

interface Props {
  theme: Theme;
}

export function Menubar({ theme }: Props) {
  const [openMenu, setOpenMenu] = useState<MenuGroupId | null>(null);
  const [hoveringOpenId, setHoveringOpenId] = useState<MenuGroupId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => buildMenuGroups(), [openMenu]);

  useEffect(() => {
    if (!openMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (event.target instanceof Node && containerRef.current.contains(event.target)) return;
      setOpenMenu(null);
      setHoveringOpenId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setHoveringOpenId(null);
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
      {groups.map((group) => (
        <MenuTrigger
          key={group.id}
          group={group}
          theme={theme}
          isOpen={openMenu === group.id}
          onOpen={(id) => {
            setOpenMenu(id);
            setHoveringOpenId(id);
          }}
          onClose={() => {
            setOpenMenu(null);
            setHoveringOpenId(null);
          }}
          onHoverTo={(id) => {
            if (hoveringOpenId) setOpenMenu(id);
          }}
        />
      ))}
    </div>
  );
}

interface TriggerProps {
  group: MenuGroup;
  theme: Theme;
  isOpen: boolean;
  onOpen: (id: MenuGroupId) => void;
  onClose: () => void;
  onHoverTo: (id: MenuGroupId) => void;
}

function MenuTrigger({ group, theme, isOpen, onOpen, onClose, onHoverTo }: TriggerProps) {
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => onHoverTo(group.id)}
    >
      <button
        onClick={() => (isOpen ? onClose() : onOpen(group.id))}
        style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          color: theme.pillText, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
          background: isOpen ? theme.pillBg : 'transparent',
          border: 'none',
        }}
      >
        {group.label}
      </button>
      {isOpen ? <Dropdown group={group} theme={theme} onClose={onClose} /> : null}
    </div>
  );
}

interface DropdownProps {
  group: MenuGroup;
  theme: Theme;
  onClose: () => void;
}

function Dropdown({ group, theme, onClose }: DropdownProps) {
  return (
    <div
      role="menu"
      style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 40,
        minWidth: 220,
        background: theme.pillBg,
        border: `1px solid ${theme.pillBorder}`,
        borderRadius: 6,
        boxShadow: '0 12px 36px rgba(20,18,16,0.22)',
        padding: '6px 0',
        fontFamily: 'var(--mono)', fontSize: 11, color: theme.pillTextStrong,
      }}
    >
      {group.sections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          {sectionIndex > 0 ? (
            <div style={{ height: 1, margin: '6px 8px', background: theme.pillDivider, opacity: 0.6 }}/>
          ) : null}
          {section.map((command) => {
            const enabled = command.enabled ? command.enabled() : true;
            const checked = command.isChecked ? command.isChecked() : false;
            return (
              <button
                key={command.id}
                role="menuitem"
                disabled={!enabled}
                onClick={() => {
                  runCommand(command.id);
                  onClose();
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, padding: '6px 14px',
                  background: 'transparent', border: 'none', cursor: enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.45, color: theme.pillTextStrong,
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.04em',
                  textAlign: 'left',
                }}
                onMouseEnter={(event) => {
                  if (!enabled) return;
                  (event.currentTarget as HTMLButtonElement).style.background = theme.pillDivider;
                }}
                onMouseLeave={(event) => {
                  (event.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 10, textAlign: 'center',
                    opacity: checked ? 1 : 0,
                    color: theme.pillTextStrong,
                  }}>✓</span>
                  {command.label}
                </span>
                {command.shortcut ? (
                  <span style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.04em' }}>
                    {command.shortcut}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
