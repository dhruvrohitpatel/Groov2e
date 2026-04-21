// Genie chat panel — conjured from the lamp with a smoke/glow transition.
// Sits as a floating panel near the transport. Chat-like; user types, genie generates a clip.

const GENIE_OPENERS = [
  "What are we cooking? Tempo and key are locked in.",
  "The lamp is warm. Speak your wish.",
  "A loop, a pad, a crunchy kick? Say the word.",
];

const GENIE_SUGGESTIONS = [
  "soft piano loop, 8 bars",
  "warm analog sub bass, A minor",
  "vinyl hiss + room tone",
  "shaker pattern, swung",
];

function GeniePanel({ open, onClose, messages, onSend, suggestionClick, project, theme }) {
  const [input, setInput] = React.useState('');
  const scrollerRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages]);

  const submit = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 92,
      right: 24,
      width: 380,
      maxHeight: 'calc(100vh - 140px)',
      background: theme.geniePanelBg,
      border: `1px solid ${theme.pillBorder}`,
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(20,18,16,0.22)',
      display: 'flex', flexDirection: 'column',
      zIndex: 19,
      fontFamily: 'var(--sans)',
      transformOrigin: 'bottom right',
      animation: open ? 'genieOpen 380ms cubic-bezier(.2,.9,.3,1.1) both' : 'genieClose 180ms ease-in both',
      pointerEvents: open ? 'auto' : 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        display:'flex', alignItems:'center', gap: 10,
        borderBottom: `1px solid ${theme.pillDivider}`,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #5A76FF 0%, #2340E8 55%, #0E22A0 100%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: '0 0 0 2px rgba(35,64,232,0.12), 0 0 16px rgba(35,64,232,0.35)',
          animation: 'genieOrb 3.6s ease-in-out infinite',
        }}>
          <Icon.Lamp s={14} c="#F5EFE4"/>
        </div>
        <div style={{flex: 1}}>
          <div style={{fontFamily:'var(--display)', fontSize:17, fontStyle:'italic', color: theme.geniePanelText, letterSpacing:'-0.01em'}}>the genie</div>
          <div style={{fontFamily:'var(--mono)', fontSize:9.5, opacity:0.55, color: theme.geniePanelText, letterSpacing:'0.08em', textTransform:'uppercase'}}>
            listening · {project.bpm} bpm · {project.key}
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 24, height: 24, border:'none', background:'transparent', cursor:'pointer',
          opacity: 0.55,
        }} title="Dismiss">
          <Icon.Close c={theme.geniePanelText}/>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollerRef} style={{
        flex: 1, overflowY: 'auto', padding: '14px 16px',
        display:'flex', flexDirection:'column', gap: 12,
      }}>
        {messages.map((m, i) => (
          <GenieMessage key={i} m={m} theme={theme}/>
        ))}
      </div>

      {/* Suggestions row */}
      {messages.length < 3 && (
        <div style={{
          padding: '8px 12px 0', display:'flex', gap: 6, flexWrap:'wrap',
        }}>
          {GENIE_SUGGESTIONS.map(s => (
            <button key={s} onClick={() => suggestionClick(s)} style={{
              fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.02em',
              padding: '5px 9px', borderRadius: 999,
              border: `1px solid ${theme.pillDivider}`,
              background: 'transparent', color: theme.geniePanelText,
              cursor: 'pointer', opacity: 0.8,
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '10px 12px 12px',
        display:'flex', gap: 8, alignItems:'flex-end',
        borderTop: `1px solid ${theme.pillDivider}`,
        marginTop: 10,
      }}>
        <div style={{
          flex:1, display:'flex', alignItems:'flex-end',
          border: `1px solid ${theme.pillDivider}`, borderRadius: 10,
          padding: '6px 10px',
          background: theme.genieInputBg,
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder="describe a sound, or a wish…"
            rows={1}
            style={{
              flex:1, resize:'none', border:'none', outline:'none', background:'transparent',
              fontFamily:'var(--sans)', fontSize:13, color: theme.geniePanelText,
              lineHeight: 1.4, minHeight: 18, maxHeight: 80,
            }}
          />
        </div>
        <button onClick={submit} style={{
          width:32, height:32, borderRadius:'50%',
          background: input.trim() ? '#2340E8' : 'rgba(35,64,232,0.2)',
          border:'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition: 'background 160ms',
        }}>
          <Icon.Send s={14} c="#fff"/>
        </button>
      </div>
    </div>
  );
}

function GenieMessage({ m, theme }) {
  if (m.role === 'user') {
    return (
      <div style={{alignSelf:'flex-end', maxWidth:'82%'}}>
        <div style={{
          background: theme.userMsgBg,
          color: theme.userMsgText,
          padding: '8px 12px', borderRadius: '14px 14px 2px 14px',
          fontSize:13, lineHeight:1.4,
        }}>{m.text}</div>
      </div>
    );
  }
  if (m.role === 'genie') {
    return (
      <div style={{alignSelf:'flex-start', maxWidth:'92%'}}>
        <div style={{
          fontFamily:'var(--display)', fontStyle:'italic',
          color: theme.geniePanelText, fontSize:14, lineHeight:1.45,
          padding: '2px 0',
        }}>
          <span style={{opacity:0.55, fontFamily:'var(--mono)', fontSize:9, fontStyle:'normal', letterSpacing:'0.1em', textTransform:'uppercase', marginRight:8}}>genie</span>
          {m.text}
        </div>
      </div>
    );
  }
  if (m.role === 'clip') {
    return (
      <div style={{alignSelf:'stretch'}}>
        <div style={{
          border: `1px solid ${theme.pillDivider}`,
          borderRadius: 10, overflow:'hidden',
          background: theme.clipCardBg,
        }}>
          <div style={{padding:'8px 10px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${theme.pillDivider}`}}>
            <div style={{width:6, height:6, borderRadius:'50%', background:'#2340E8'}}/>
            <div style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase', color: theme.geniePanelText, opacity:0.7}}>
              generated · {m.meta.dur}s · {m.meta.bpm} bpm · {m.meta.key}
            </div>
          </div>
          <div style={{background: theme.clipCardWave, padding: '6px 10px'}}>
            <Waveform style="bars" seed={m.meta.seed} color="#2340E8" width={330} height={42} bars={80} energy={0.9}/>
          </div>
          <div style={{padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontFamily:'var(--display)', fontStyle:'italic', fontSize:14, color: theme.geniePanelText}}>
              "{m.meta.label}"
            </div>
            <div style={{display:'flex', gap:6}}>
              <button onClick={m.onRegenerate} style={tinyBtn(theme, false)}>regenerate</button>
              <button onClick={m.onInsert} disabled={m.inserted} style={tinyBtn(theme, true, m.inserted)}>
                {m.inserted ? '✓ inserted' : 'insert at playhead'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function tinyBtn(theme, primary, disabled) {
  return {
    fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.04em',
    padding:'5px 10px', borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
    border: primary ? 'none' : `1px solid ${theme.pillDivider}`,
    background: primary ? (disabled ? 'rgba(35,64,232,0.4)' : '#2340E8') : 'transparent',
    color: primary ? '#fff' : theme.geniePanelText,
    opacity: disabled ? 0.9 : 1,
    textTransform:'lowercase',
  };
}

window.GeniePanel = GeniePanel;
window.GENIE_OPENERS = GENIE_OPENERS;
