// Top menu bar with File / Edit / Track / View / Help dropdowns
const MENUS = {
  file: {
    label: 'File',
    items: [
      { label: 'New project', shortcut: '⌘N' },
      { label: 'Open…', shortcut: '⌘O' },
      { label: 'Open recent', sub: ['night drive · idea 02', 'kitchen demo', 'piano fragment 04'] },
      { sep: true },
      { label: 'Save', shortcut: '⌘S' },
      { label: 'Save as…', shortcut: '⇧⌘S' },
      { label: 'Revert to autosave' },
      { sep: true },
      { label: 'Import audio…', shortcut: '⌘I' },
      { label: 'Export', sub: ['Mixdown (.wav)', 'Mixdown (.mp3)', 'Stems', 'Project archive (.groovy)'] },
      { sep: true },
      { label: 'Project settings…' },
      { label: 'Close project', shortcut: '⌘W' },
    ],
  },
  edit: {
    label: 'Edit',
    items: [
      { label: 'Undo move clip', shortcut: '⌘Z' },
      { label: 'Redo', shortcut: '⇧⌘Z' },
      { sep: true },
      { label: 'Cut', shortcut: '⌘X' },
      { label: 'Copy', shortcut: '⌘C' },
      { label: 'Paste at playhead', shortcut: '⌘V' },
      { label: 'Duplicate', shortcut: '⌘D' },
      { label: 'Delete', shortcut: '⌫' },
      { sep: true },
      { label: 'Select all', shortcut: '⌘A' },
      { label: 'Select in time range', shortcut: '⇧⌘A' },
      { sep: true },
      { label: 'Split at playhead', shortcut: '⌘E', action: 'split' },
      { label: 'Join clips', shortcut: '⌘J' },
      { label: 'Crossfade selection', shortcut: '⌘F' },
      { sep: true },
      { label: 'Find & replace…' },
      { label: 'Preferences…', shortcut: '⌘,' },
    ],
  },
  track: {
    label: 'Track',
    items: [
      { label: 'New audio track', shortcut: '⌘T', action: 'addTrack' },
      { label: 'New instrument track', shortcut: '⇧⌘T' },
      { label: 'New aux / bus' },
      { sep: true },
      { label: 'Duplicate track', shortcut: '⌘⇧D' },
      { label: 'Rename track', shortcut: '↩' },
      { label: 'Delete selected track', shortcut: '⌘⌫', action: 'deleteTrack', danger: true },
      { sep: true },
      { label: 'Freeze track' },
      { label: 'Bounce in place' },
      { sep: true },
      { label: 'Track input', sub: ['Built-in mic', 'MBP mic', 'Scarlett 2i2 · In 1', 'Scarlett 2i2 · In 2', 'No input'] },
      { label: 'Track output', sub: ['Master', 'Bus 1 · Drums', 'Bus 2 · Reverb send'] },
      { sep: true },
      { label: 'Track color…' },
    ],
  },
  view: {
    label: 'View',
    items: [
      { label: 'Show mixer', shortcut: '⌘M', action: 'toggleMixer' },
      { label: 'Show phone controller', action: 'togglePhone' },
      { label: 'Show genie', shortcut: '⌘L', action: 'toggleGenie' },
      { sep: true },
      { label: 'Zoom in', shortcut: '⌘+' },
      { label: 'Zoom out', shortcut: '⌘−' },
      { label: 'Fit project', shortcut: '⌘0' },
      { sep: true },
      { label: 'Theme', sub: ['Warm paper', 'Light', 'Ink dark'] },
      { label: 'Density', sub: ['Compact', 'Comfortable', 'Spacious'] },
      { label: 'Waveform style', sub: ['Bars', 'Filled', 'Line'] },
    ],
  },
  help: {
    label: 'Help',
    items: [
      { label: 'Keyboard shortcuts', shortcut: '⌘/' },
      { label: 'Ask the genie' },
      { label: 'Documentation' },
      { sep: true },
      { label: 'Send feedback…' },
      { label: 'About Groovy' },
    ],
  },
};

function MenuBar({ theme, onAction }) {
  const [open, setOpen] = React.useState(null);
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    setTimeout(() => window.addEventListener('click', close, { once: true }), 0);
    return () => window.removeEventListener('click', close);
  }, [open]);
  return (
    <div style={{display:'flex', alignItems:'center', gap: 0}}>
      {Object.entries(MENUS).map(([k, m]) => (
        <div key={k} style={{position:'relative'}}>
          <button
            onMouseEnter={() => open && setOpen(k)}
            onClick={(e) => { e.stopPropagation(); setOpen(open === k ? null : k); }}
            style={{
              padding: '4px 9px',
              background: open === k ? theme.pillDivider : 'transparent',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 10.5,
              color: theme.topBarText,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              borderRadius: 3,
            }}
          >{m.label}</button>
          {open === k && (
            <Dropdown items={m.items} theme={theme} onPick={(item) => {
              setOpen(null);
              if (item.action) onAction(item.action, item);
            }}/>
          )}
        </div>
      ))}
    </div>
  );
}

function Dropdown({ items, theme, onPick, x=0, y=undefined }) {
  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      position: 'absolute', top: y === undefined ? 'calc(100% + 4px)' : y, left: x,
      minWidth: 220,
      background: theme.pillBg,
      border: `1px solid ${theme.pillBorder}`,
      borderRadius: 8,
      boxShadow: '0 12px 36px rgba(20,18,16,0.22)',
      padding: 4,
      zIndex: 60,
      fontFamily: 'var(--sans)',
      animation: 'genieOpen 180ms ease-out both',
      transformOrigin: 'top left',
    }}>
      {items.map((it, i) => it.sep ? (
        <div key={i} style={{height:1, background: theme.pillDivider, margin: '4px 6px'}}/>
      ) : (
        <DropdownItem key={i} item={it} theme={theme} onPick={onPick}/>
      ))}
    </div>
  );
}

function DropdownItem({ item, theme, onPick }) {
  const [hover, setHover] = React.useState(false);
  const hasSub = !!item.sub;
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => !hasSub && onPick(item)}
      style={{
        padding: '6px 10px', display:'flex', alignItems:'center', gap: 10,
        fontSize: 12.5, color: item.danger ? '#B3261E' : theme.pillTextStrong,
        background: hover ? theme.pillDivider : 'transparent',
        borderRadius: 4, cursor: 'pointer', position:'relative',
      }}>
      <span style={{flex:1, whiteSpace:'nowrap'}}>{item.label}</span>
      {item.shortcut && <span style={{fontFamily:'var(--mono)', fontSize:10, opacity:0.5, letterSpacing:'0.06em'}}>{item.shortcut}</span>}
      {hasSub && <span style={{opacity:0.5, fontSize:10}}>▸</span>}
      {hasSub && hover && (
        <div style={{position:'absolute', left:'calc(100% + 2px)', top: -4}}>
          <Dropdown items={item.sub.map(s => typeof s === 'string' ? {label: s} : s)} theme={theme} onPick={onPick}/>
        </div>
      )}
    </div>
  );
}

window.MenuBar = MenuBar;
window.Dropdown = Dropdown;

// ── Selector dropdown for inline use (BPM, key, input source, etc.)
function Selector({ value, options, onChange, theme, width=84, mono=true, allowCustom=false, formatValue }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    setTimeout(() => window.addEventListener('click', close), 0);
    return () => window.removeEventListener('click', close);
  }, [open]);
  return (
    <div ref={ref} style={{position:'relative', width}}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} style={{
        width:'100%', textAlign:'left',
        padding: '4px 8px',
        background: open ? theme.pillDivider : 'transparent',
        border: `1px solid ${open ? theme.accent : 'transparent'}`,
        borderRadius: 4, cursor: 'pointer',
        fontFamily: mono ? 'var(--mono)' : 'var(--display)',
        fontSize: mono ? 14 : 14, color: theme.pillTextStrong,
        letterSpacing: mono ? '0.04em' : '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <span>{formatValue ? formatValue(value) : value}</span>
        <span style={{opacity:0.4, fontSize:8, marginLeft:4}}>▼</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left: 0, minWidth: width + 30,
          background: theme.pillBg, border: `1px solid ${theme.pillBorder}`,
          borderRadius: 6, boxShadow: '0 8px 24px rgba(20,18,16,0.18)',
          padding: 4, zIndex: 60, maxHeight: 280, overflowY:'auto',
          fontFamily: 'var(--sans)',
        }}>
          {options.map(opt => {
            const v = typeof opt === 'object' ? opt.value : opt;
            const l = typeof opt === 'object' ? opt.label : opt;
            return (
              <div key={String(v)} onClick={() => { onChange(v); setOpen(false); }} style={{
                padding:'5px 9px', borderRadius: 4,
                fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
                fontSize: 12, color: theme.pillTextStrong,
                background: v === value ? theme.pillDivider : 'transparent',
                cursor: 'pointer', whiteSpace:'nowrap',
                letterSpacing: mono ? '0.04em' : '0',
              }}>{l}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
window.Selector = Selector;
