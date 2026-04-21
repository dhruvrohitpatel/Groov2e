// Phone controller preview — a stripped-down mobile transport that mirrors the desktop.
// Shown next to desktop view as a small floating device.

function PhoneController({ project, playing, recording, position, onPlay, onRecord, onStop, theme, genieActive, setGenieActive }) {
  return (
    <div style={{
      width: 220, height: 440,
      borderRadius: 36,
      background: '#141210',
      padding: 8,
      boxShadow: '0 18px 50px rgba(20,18,16,0.35), 0 2px 0 rgba(255,255,255,0.08) inset',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 30,
        background: theme.phoneBg,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        {/* notch */}
        <div style={{
          position:'absolute', top:6, left:'50%', transform:'translateX(-50%)',
          width: 72, height: 18, background:'#141210', borderRadius: 10, zIndex: 2,
        }}/>
        {/* status bar */}
        <div style={{
          display:'flex', justifyContent:'space-between', padding:'8px 20px 4px',
          fontFamily:'var(--mono)', fontSize:9, color: theme.phoneText, letterSpacing:'0.06em',
        }}>
          <span>9:24</span>
          <span style={{opacity:0.4}}>· · ·</span>
        </div>

        {/* header */}
        <div style={{padding:'18px 16px 6px'}}>
          <div style={{fontFamily:'var(--mono)', fontSize:8.5, opacity:0.55, color:theme.phoneText, letterSpacing:'0.12em', textTransform:'uppercase'}}>now recording</div>
          <div style={{fontFamily:'var(--display)', fontSize:18, color:theme.phoneText, letterSpacing:'-0.02em', marginTop:2}}>{project.name}</div>
        </div>

        {/* big position readout */}
        <div style={{padding:'6px 16px', textAlign:'center'}}>
          <div style={{
            fontFamily:'var(--mono)', fontSize:22, color: theme.phoneText,
            letterSpacing:'0.05em', fontVariantNumeric:'tabular-nums', marginTop: 20,
          }}>{formatBarsBeats(position, project.bpm)}</div>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10, opacity:0.5, color: theme.phoneText,
            letterSpacing:'0.04em', fontVariantNumeric:'tabular-nums',
          }}>{formatTime(position)}</div>
        </div>

        {/* mini waveform */}
        <div style={{padding:'10px 16px'}}>
          <div style={{
            height: 50,
            border: `1px solid ${theme.pillDivider}`,
            borderRadius: 6,
            background: theme.phoneWaveBg,
            padding: 4, overflow:'hidden',
          }}>
            <Waveform style="bars" seed={Math.floor(position*4)} color={theme.accent} width={180} height={40} bars={40} energy={recording ? 1 : 0.5}/>
          </div>
          {/* level meter */}
          <div style={{display:'flex', gap: 3, marginTop: 6, height: 6}}>
            {Array.from({length:24}).map((_, i) => {
              const active = recording && Math.random() > (i/26);
              const isRed = i > 20;
              return <div key={i} style={{
                flex:1,
                background: active ? (isRed ? '#B3261E' : theme.accent) : theme.pillDivider,
                borderRadius: 1,
                opacity: active ? 1 : 0.35,
              }}/>;
            })}
          </div>
        </div>

        {/* track chips */}
        <div style={{padding:'8px 16px', flex: 1, overflow:'hidden'}}>
          <div style={{fontFamily:'var(--mono)', fontSize:8.5, opacity:0.5, color:theme.phoneText, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom: 6}}>armed</div>
          <div style={{
            display:'flex', alignItems:'center', gap: 8,
            padding: '8px 10px',
            border: `1px solid ${theme.accent}`,
            borderRadius: 8,
            background: `${theme.accent}15`,
          }}>
            <div style={{width:6, height:6, background:'#B3261E', borderRadius:'50%',
              animation:'armPulse 1.4s ease-in-out infinite'}}/>
            <div style={{fontFamily:'var(--display)', fontSize:14, color: theme.phoneText}}>Keys</div>
            <div style={{flex:1}}/>
            <div style={{fontFamily:'var(--mono)', fontSize:9, opacity:0.5, color: theme.phoneText}}>MBP mic</div>
          </div>
        </div>

        {/* transport */}
        <div style={{
          padding:'14px 20px 24px',
          display:'flex', alignItems:'center', justifyContent:'space-around',
          borderTop: `1px solid ${theme.pillDivider}`,
        }}>
          <button onClick={() => setGenieActive(!genieActive)} style={{
            width: 38, height: 38, borderRadius: 10, border:'none', cursor:'pointer',
            background: genieActive ? 'rgba(35,64,232,0.15)' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Icon.Lamp s={20} c={genieActive ? '#2340E8' : theme.lampBrass}/>
          </button>
          <button onClick={onPlay} style={{
            width: 54, height: 54, borderRadius:'50%', border:'none', cursor:'pointer',
            background: '#141210',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {playing ? <Icon.Pause s={20} c="#fff"/> : <Icon.Play s={20} c="#fff"/>}
          </button>
          <button onClick={onRecord} style={{
            width: 38, height: 38, borderRadius:'50%', border:'none', cursor:'pointer',
            background: recording ? '#B3261E' : 'transparent',
            border: recording ? 'none' : `1.5px solid #B3261E`,
            display:'flex', alignItems:'center', justifyContent:'center',
            animation: recording ? 'recordPulse 1.2s ease-in-out infinite' : 'none',
          }}>
            <Icon.Record s={14} c={recording ? '#fff' : '#B3261E'}/>
          </button>
        </div>
      </div>
    </div>
  );
}

window.PhoneController = PhoneController;
