// Timeline: ruler + tracks with clips. Full-bleed, top-to-bottom.
// PX_PER_SEC scales with zoom. density controls row height.

function useDrag(onDrag, onEnd) {
  return React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const move = (ev) => onDrag(ev.clientX - startX, ev);
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onEnd && onEnd(ev);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [onDrag, onEnd]);
}

function Ruler({ pxPerSec, length, offset, bpm, theme }) {
  // Show bar numbers at each bar (4 beats = barDur sec)
  const barDur = (60 / bpm) * 4;
  const bars = Math.ceil(length / barDur);
  const items = [];
  for (let i = 0; i <= bars; i++) {
    const x = i * barDur * pxPerSec;
    items.push(
      <div key={i} style={{
        position: 'absolute', left: x, top: 0, bottom: 0,
        borderLeft: `1px solid ${theme.rule}`,
        paddingLeft: 6, paddingTop: 6,
        fontFamily: 'var(--mono)', fontSize: 10, color: theme.rulerText,
        letterSpacing: '0.02em',
      }}>
        {i + 1}
      </div>
    );
    // subdivisions (beats)
    for (let j = 1; j < 4; j++) {
      const sx = x + j * (barDur / 4) * pxPerSec;
      items.push(
        <div key={`${i}-${j}`} style={{
          position: 'absolute', left: sx, top: '60%', bottom: 0,
          borderLeft: `1px solid ${theme.ruleFaint}`,
        }}/>
      );
    }
  }
  return <div style={{ position: 'relative', height: 28, width: length * pxPerSec, borderBottom: `1px solid ${theme.rule}` }}>{items}</div>;
}

function Clip({ clip, pxPerSec, color, height, waveStyle, theme, onDrag, selected, onSelect, onDelete }) {
  const [dragDx, setDragDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const start = useDrag(
    (dx) => { setDragDx(dx); setDragging(true); },
    () => { onDrag(dragDx / pxPerSec); setDragDx(0); setDragging(false); }
  );
  // IMPORTANT: dragDx doesn't close over in handlers. Capture via ref.
  const dxRef = React.useRef(0);
  dxRef.current = dragDx;
  const startHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const move = (ev) => { dxRef.current = ev.clientX - sx; setDragDx(dxRef.current); setDragging(true); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onDrag(dxRef.current / pxPerSec);
      setDragDx(0); setDragging(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    onSelect && onSelect();
  };

  const x = clip.start * pxPerSec + dragDx;
  const w = Math.max(20, clip.dur * pxPerSec);
  const h = height - 6;

  return (
    <div
      onPointerDown={startHandler}
      style={{
        position: 'absolute', left: x, top: 3, width: w, height: h,
        background: theme.clipBg,
        border: `1px solid ${selected ? theme.accent : theme.clipBorder}`,
        borderLeft: `2px solid ${color}`,
        borderRadius: 2,
        overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab',
        boxShadow: dragging ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
        transition: dragging ? 'none' : 'box-shadow 120ms',
        userSelect: 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 14,
        padding: '2px 5px',
        fontFamily: 'var(--mono)', fontSize: 9, color: theme.clipLabel,
        letterSpacing: '0.04em',
        display: 'flex', justifyContent: 'space-between',
        background: theme.clipLabelBg,
        borderBottom: `1px solid ${theme.clipBorder}`,
      }}>
        <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0}}>{clip.label}</span>
        <span style={{marginLeft:6, marginRight: selected ? 4 : 0}}>{clip.dur.toFixed(1)}s</span>
        {selected && (
          <button
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete && onDelete(); }}
            title="Remove clip (⌫)"
            style={{
              width: 14, height: 12, border: 'none',
              background: 'rgba(179,38,30,0.9)', color: '#fff',
              borderRadius: 2, cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 9, lineHeight: 1,
              marginLeft: 2,
            }}
          >×</button>
        )}
      </div>
      <div style={{position:'absolute', top:14, left:0, right:0, bottom:0}}>
        <Waveform
          style={waveStyle}
          seed={clip.seed}
          color={color}
          width={w}
          height={h - 14}
          bars={Math.floor(w / (waveStyle === 'bars' ? 3 : 1.5))}
          energy={clip.energy || 1}
          density={clip.density || 1}
        />
      </div>
      {clip._justInserted && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(35,64,232,0.35), transparent 70%)',
          animation: 'insertFlash 1.2s ease-out forwards',
          pointerEvents: 'none',
        }}/>
      )}
    </div>
  );
}

function TrackRow({ track, pxPerSec, length, height, waveStyle, theme, selectedTrack, onSelect, onToggle, onClipDrag, onClipSelect, selectedClip, onClipDelete, onUpdate, onDelete, onSplit, onPickInput, onPickOutput }) {
  const isSel = selectedTrack === track.id;
  const HEAD_W = 280;
  return (
    <div style={{
      display: 'flex',
      borderBottom: `1px solid ${theme.rule}`,
      background: isSel ? theme.trackSelBg : theme.trackBg,
      height,
      cursor: 'pointer',
      position: 'relative',
    }} onClick={() => onSelect(track.id)}>
      {/* Selection indicator stripe */}
      {isSel && <div style={{position:'absolute', left:0, top:0, bottom:0, width:2, background: theme.accent, zIndex:1}}/>}

      {/* Track head — pro layout */}
      <div style={{
        width: HEAD_W, flexShrink: 0,
        padding: '6px 8px 6px 10px',
        borderRight: `1px solid ${theme.rule}`,
        display: 'flex', flexDirection: 'column', gap: 4,
        background: isSel ? theme.trackSelBg : theme.trackHeadBg,
      }} onClick={(e) => { e.stopPropagation(); onSelect(track.id); }}>
        {/* Row 1: name + I/O selectors + delete */}
        <div style={{display:'flex', alignItems:'center', gap: 6, height: 18}}>
          <div style={{width: 6, height: 18, background: track.color, borderRadius: 1, flexShrink: 0}}/>
          <input
            value={track.name}
            onChange={(e) => onUpdate(track.id, {name: e.target.value})}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, minWidth: 0,
              fontFamily: 'var(--display)', fontSize: 14, color: theme.trackName,
              fontWeight: 500, letterSpacing: '-0.01em',
              background: 'transparent', border: 'none', outline: 'none', padding: 0,
            }}
          />
          <button onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
            title="Delete track" style={{
              width: 16, height: 16, border:'none', background:'transparent',
              cursor:'pointer', opacity: 0.4, padding: 0,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><Icon.Close c={theme.trackName}/></button>
        </div>

        {/* Row 2: I/O selectors */}
        <div style={{display:'flex', gap: 4, marginLeft: 12, height: 18}} onClick={(e) => e.stopPropagation()}>
          <IOPill label="IN"  value={track.input}  options={INPUT_SOURCES}  onChange={(v) => onUpdate(track.id, {input: v})}  theme={theme} active={track.armed}/>
          <IOPill label="OUT" value={track.output} options={OUTPUT_SOURCES} onChange={(v) => onUpdate(track.id, {output: v})} theme={theme}/>
        </div>

        {/* Row 3: M/S/R + gain knob + pan + fader + meter */}
        <div style={{display:'flex', alignItems:'center', gap: 6, marginLeft: 12, marginTop: 2}}>
          <div style={{display:'flex', gap: 3}}>
            <TrackBtn on={track.muted} onClick={(e) => { e.stopPropagation(); onToggle(track.id, 'muted'); }} title="Mute" activeBg="#6B6B6B" activeColor="#fff">M</TrackBtn>
            <TrackBtn on={track.solo}  onClick={(e) => { e.stopPropagation(); onToggle(track.id, 'solo');  }} title="Solo" activeBg="#C89A4B" activeColor="#1a1210">S</TrackBtn>
            <TrackBtn on={track.armed} onClick={(e) => { e.stopPropagation(); onToggle(track.id, 'armed'); }} title="Arm"  activeBg="#B3261E" activeColor="#fff" pulse={track.armed}>●</TrackBtn>
          </div>
          {/* Gain knob (preamp / trim, -12..+24 dB) */}
          <div onClick={(e) => e.stopPropagation()} title={`Gain ${fmtGain(track.gain || 0)}`} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:0}}>
            <Knob value={track.gain || 0} min={-12} max={24} size={18} theme={theme} color={track.color}
              onChange={(v) => onUpdate(track.id, {gain: v})}/>
            <div style={{fontFamily:'var(--mono)', fontSize:8, color: theme.trackSub, marginTop:1, letterSpacing:'0.04em'}}>GAIN</div>
          </div>
          {/* Pan slider */}
          <div onClick={(e) => e.stopPropagation()} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:0}}>
            <PanSlider value={track.pan || 0} onChange={(v) => onUpdate(track.id, {pan: v})} theme={theme} color={track.color} width={56}/>
            <div style={{fontFamily:'var(--mono)', fontSize:8, color: theme.trackSub, marginTop:1, letterSpacing:'0.04em'}}>{fmtPan(track.pan || 0)}</div>
          </div>
          <div style={{flex:1}}/>
          {/* Mini fader + meter */}
          <div onClick={(e) => e.stopPropagation()} style={{display:'flex', alignItems:'center', gap: 3}}>
            <MiniFader value={track.vol} onChange={(v) => onUpdate(track.id, {vol: v})} theme={theme} color={track.color} height={Math.max(28, height - 50)}/>
            <Meter vol={track.vol} muted={track.muted} color={track.color} accent={theme.accent} bg={theme.clipBg} border={theme.pillDivider} height={Math.max(28, height - 50)}/>
            <div style={{fontFamily:'var(--mono)', fontSize: 9, color: theme.trackSub, width: 32, textAlign:'right', letterSpacing:'0.02em', fontVariantNumeric:'tabular-nums'}}>
              {fmtDb(track.vol)}
            </div>
          </div>
        </div>

        {/* Row 4: split-at-playhead button (appears when selected) */}
        {isSel && (
          <div style={{display:'flex', gap: 4, marginLeft: 12, marginTop: 2}} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onSplit(track.id)} title="Split clip(s) at playhead (⌘E)" style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.06em',
              padding:'2px 6px', borderRadius: 3,
              border: `1px solid ${theme.pillDivider}`,
              background:'transparent', color: theme.trackName,
              cursor:'pointer', display:'flex', alignItems:'center', gap:4,
              textTransform:'uppercase',
            }}>
              <Icon.Scissors s={10} c={theme.trackName}/> split
            </button>
          </div>
        )}
      </div>

      {/* Lane */}
      <div style={{ position: 'relative', flex: 1, height, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: length * pxPerSec, height }}>
          {track.clips.map((c) => (
            <Clip key={c.id} clip={c} pxPerSec={pxPerSec} color={track.color}
              height={height} waveStyle={waveStyle} theme={theme}
              selected={selectedClip === c.id}
              onSelect={() => onClipSelect(c.id)}
              onDelete={() => onClipDelete && onClipDelete(track.id, c.id)}
              onDrag={(deltaSec) => onClipDrag(track.id, c.id, deltaSec)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function IOPill({ label, value, options, onChange, theme, active }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    setTimeout(() => window.addEventListener('click', close), 0);
    return () => window.removeEventListener('click', close);
  }, [open]);
  const short = value.replace(/Scarlett 2i2 · /, '2i2·').replace(/Audient EVO 4 · /, 'EVO·');
  return (
    <div ref={ref} style={{position:'relative', flex: 1, minWidth: 0}}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%',
        display:'flex', alignItems:'center', gap: 4,
        padding: '2px 6px',
        background: active && label==='IN' ? 'rgba(179,38,30,0.08)' : (open ? theme.pillDivider : 'transparent'),
        border: `1px solid ${active && label==='IN' ? '#B3261E' : theme.pillDivider}`,
        borderRadius: 3, cursor:'pointer',
        fontFamily:'var(--mono)', fontSize: 9, color: theme.trackName,
        letterSpacing:'0.04em',
        overflow:'hidden',
      }}>
        <span style={{opacity:0.5}}>{label}</span>
        <span style={{flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{short}</span>
        <span style={{opacity:0.4, fontSize:7}}>▼</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 3px)', left:0, minWidth: 180,
          background: theme.pillBg, border:`1px solid ${theme.pillBorder}`, borderRadius: 6,
          boxShadow:'0 8px 24px rgba(20,18,16,0.18)', padding:4, zIndex:30,
        }}>
          {options.map(o => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); }} style={{
              padding:'4px 8px', borderRadius:4,
              fontFamily:'var(--sans)', fontSize: 11, color: theme.trackName,
              background: o === value ? theme.pillDivider : 'transparent',
              cursor:'pointer', whiteSpace:'nowrap',
            }}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Meter({ vol, muted, color, accent, bg, border, height=42 }) {
  // Animated peak meter
  const [level, setLevel] = React.useState(0);
  React.useEffect(() => {
    if (muted) { setLevel(0); return; }
    const id = setInterval(() => {
      setLevel(Math.min(1, vol * (0.6 + Math.random() * 0.5)));
    }, 90);
    return () => clearInterval(id);
  }, [vol, muted]);
  return (
    <div style={{
      width: 6, height, background: bg, borderRadius: 1,
      border: `1px solid ${border}`, position:'relative', overflow:'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        position:'absolute', left:0, right:0, bottom:0,
        height: `${level * 100}%`,
        background: `linear-gradient(to top, ${color} 0%, ${color} 60%, #C89A4B 80%, #B3261E 100%)`,
        transition: 'height 80ms linear',
      }}/>
    </div>
  );
}

function TrackBtn({ children, on, onClick, title, activeBg, activeColor, pulse }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 20, height: 18,
      border: `1px solid ${on ? activeBg : 'rgba(0,0,0,0.18)'}`,
      background: on ? activeBg : 'transparent',
      color: on ? activeColor : 'rgba(0,0,0,0.6)',
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
      cursor: 'pointer', padding: 0,
      borderRadius: 2,
      animation: pulse ? 'armPulse 1.4s ease-in-out infinite' : 'none',
    }}>{children}</button>
  );
}

window.Ruler = Ruler;
window.Clip = Clip;
window.TrackRow = TrackRow;
