// Floating transport pill — BPM, key, time, transport controls, Genie lamp
// Lives centered at bottom of screen.

function TransportPill({ project, playing, recording, position, onPlay, onRecord, onStop, onRewind, metronome, setMetronome, onLampClick, genieActive, theme }) {
  return (
    <div style={{
      position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'stretch',
      background: theme.pillBg,
      border: `1px solid ${theme.pillBorder}`,
      borderRadius: 999,
      boxShadow: '0 6px 24px rgba(20,18,16,0.18), 0 1px 0 rgba(255,255,255,0.5) inset',
      overflow: 'hidden',
      zIndex: 20,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      color: theme.pillText,
      letterSpacing: '0.04em',
    }}>
      {/* Project section */}
      <div style={{
        padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 1,
        borderRight: `1px solid ${theme.pillDivider}`,
        minWidth: 120,
      }}>
        <div style={{fontSize:9, opacity:0.55, textTransform:'uppercase'}}>project</div>
        <div style={{fontFamily:'var(--display)', fontSize:14, color: theme.pillTextStrong, letterSpacing:'-0.01em'}}>{project.name}</div>
      </div>

      {/* BPM */}
      <PillStat label="bpm" value={project.bpm} theme={theme}/>
      {/* Key */}
      <PillStat label="key" value={project.key} theme={theme} mono={false}/>
      {/* Time sig */}
      <PillStat label="sig" value={project.timeSig} theme={theme}/>

      {/* Transport buttons */}
      <div style={{display:'flex', alignItems:'center', gap: 6, padding: '0 14px',
        borderLeft: `1px solid ${theme.pillDivider}`, borderRight: `1px solid ${theme.pillDivider}`}}>
        <PillBtn onClick={onRewind} title="Rewind"><Icon.Rewind c={theme.pillTextStrong}/></PillBtn>
        <PillBtn onClick={onPlay} title={playing ? "Pause" : "Play"} primary>
          {playing ? <Icon.Pause s={16} c="#fff"/> : <Icon.Play s={16} c="#fff"/>}
        </PillBtn>
        <PillBtn onClick={onStop} title="Stop"><Icon.Stop c={theme.pillTextStrong}/></PillBtn>
        <PillBtn onClick={onRecord} title="Record" recording={recording}>
          <Icon.Record s={14} c={recording ? '#fff' : '#B3261E'}/>
        </PillBtn>
      </div>

      {/* Position readout */}
      <div style={{
        padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 2,
        borderRight: `1px solid ${theme.pillDivider}`,
        minWidth: 150,
      }}>
        <div style={{fontFamily:'var(--mono)', fontSize:16, color: theme.pillTextStrong, letterSpacing:'0.05em', fontVariantNumeric:'tabular-nums'}}>
          {formatBarsBeats(position, project.bpm)}
        </div>
        <div style={{fontSize: 9.5, opacity: 0.55, fontVariantNumeric:'tabular-nums'}}>
          {formatTime(position)}
        </div>
      </div>

      {/* Metronome */}
      <PillBtnBig on={metronome} onClick={() => setMetronome(!metronome)} theme={theme}>
        <Icon.Metronome c={metronome ? theme.accent : theme.pillTextStrong}/>
      </PillBtnBig>

      {/* Genie lamp */}
      <button onClick={onLampClick} title="Summon the Genie" style={{
        padding: '0 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: genieActive ? theme.genieActiveBg : theme.genieBg,
        border: 'none', cursor: 'pointer',
        position: 'relative',
        borderLeft: `1px solid ${theme.pillDivider}`,
      }}>
        <Icon.Lamp s={26} c={genieActive ? '#2340E8' : theme.lampBrass} glow={genieActive}/>
        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
          <div style={{fontFamily:'var(--display)', fontSize:13, color: genieActive ? '#2340E8' : theme.pillTextStrong, fontStyle:'italic', letterSpacing:'-0.01em'}}>genie</div>
          <div style={{fontFamily:'var(--mono)', fontSize:8.5, opacity:0.55, letterSpacing:'0.08em', textTransform:'uppercase'}}>rub to summon</div>
        </div>
        {genieActive && (
          <div style={{position:'absolute', top: -32, left: 18, pointerEvents:'none', animation:'smokeRise 2s ease-out infinite'}}>
            <Icon.Smoke s={18} c="#2340E8"/>
          </div>
        )}
      </button>
    </div>
  );
}

function PillStat({ label, value, theme, mono=true }) {
  return (
    <div style={{
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 1,
      borderRight: `1px solid ${theme.pillDivider}`,
      minWidth: 56,
    }}>
      <div style={{fontSize:9, opacity:0.55, textTransform:'uppercase'}}>{label}</div>
      <div style={{
        fontFamily: mono ? 'var(--mono)' : 'var(--display)',
        fontSize: 14, color: theme.pillTextStrong,
        letterSpacing: mono ? '0.05em' : '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  );
}

function PillBtn({ children, onClick, title, primary, recording }) {
  const bg = primary ? '#141210' : recording ? '#B3261E' : 'transparent';
  return (
    <button onClick={onClick} title={title} style={{
      width: primary ? 34 : 28, height: primary ? 34 : 28,
      borderRadius: '50%',
      background: bg,
      border: primary || recording ? 'none' : '1px solid rgba(20,18,16,0.15)',
      cursor: 'pointer', padding: 0,
      display:'flex', alignItems:'center', justifyContent:'center',
      animation: recording ? 'recordPulse 1.2s ease-in-out infinite' : 'none',
    }}>{children}</button>
  );
}

function PillBtnBig({ children, onClick, on, theme }) {
  return (
    <button onClick={onClick} style={{
      padding: '0 14px',
      background: on ? theme.metroOn : 'transparent',
      border: 'none', cursor: 'pointer',
      borderRight: `1px solid ${theme.pillDivider}`,
    }}>{children}</button>
  );
}

window.TransportPill = TransportPill;
