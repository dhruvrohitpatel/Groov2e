// Main Groovy app — stitches timeline, transport pill, genie, phone, tweaks.
// Full-bleed. Everything lives on the warm paper surface.

const THEMES = {
  warm: {
    bg: '#EBE1D2',
    paper: '#F3E9D8',
    rule: 'rgba(40,28,18,0.14)',
    ruleFaint: 'rgba(40,28,18,0.06)',
    rulerText: 'rgba(40,28,18,0.5)',
    trackBg: '#F3E9D8',
    trackHeadBg: '#EAE0CE',
    trackSelBg: '#F0E2C7',
    trackName: '#2B241C',
    trackSub: 'rgba(40,28,18,0.55)',
    clipBg: '#F8F0E0',
    clipBorder: 'rgba(40,28,18,0.18)',
    clipLabel: 'rgba(40,28,18,0.7)',
    clipLabelBg: 'rgba(40,28,18,0.04)',
    accent: '#2340E8',
    playhead: '#2340E8',
    pillBg: '#F5EFE4',
    pillBorder: 'rgba(40,28,18,0.18)',
    pillDivider: 'rgba(40,28,18,0.12)',
    pillText: '#6B5841',
    pillTextStrong: '#2B241C',
    lampBrass: '#B8823A',
    genieBg: 'rgba(35,64,232,0.04)',
    genieActiveBg: 'rgba(35,64,232,0.1)',
    geniePanelBg: '#F5EFE4',
    geniePanelText: '#2B241C',
    genieInputBg: 'rgba(40,28,18,0.03)',
    userMsgBg: '#2340E8',
    userMsgText: '#F5EFE4',
    clipCardBg: 'rgba(40,28,18,0.03)',
    clipCardWave: 'rgba(35,64,232,0.05)',
    metroOn: 'rgba(35,64,232,0.12)',
    phoneBg: '#F3E9D8',
    phoneText: '#2B241C',
    phoneWaveBg: '#EAE0CE',
    tweakBg: '#F5EFE4',
    topBarBg: '#EAE0CE',
    topBarText: '#2B241C',
  },
  light: {
    bg: '#F5F2EC',
    paper: '#FFFFFF',
    rule: 'rgba(20,18,16,0.1)',
    ruleFaint: 'rgba(20,18,16,0.05)',
    rulerText: 'rgba(20,18,16,0.5)',
    trackBg: '#FFFFFF',
    trackHeadBg: '#FAF7F2',
    trackSelBg: '#F0EEE8',
    trackName: '#141210',
    trackSub: 'rgba(20,18,16,0.5)',
    clipBg: '#FAF7F2',
    clipBorder: 'rgba(20,18,16,0.12)',
    clipLabel: 'rgba(20,18,16,0.6)',
    clipLabelBg: 'rgba(20,18,16,0.02)',
    accent: '#2340E8',
    playhead: '#2340E8',
    pillBg: '#FFFFFF',
    pillBorder: 'rgba(20,18,16,0.12)',
    pillDivider: 'rgba(20,18,16,0.08)',
    pillText: '#54504A',
    pillTextStrong: '#141210',
    lampBrass: '#B8823A',
    genieBg: 'rgba(35,64,232,0.03)',
    genieActiveBg: 'rgba(35,64,232,0.08)',
    geniePanelBg: '#FFFFFF',
    geniePanelText: '#141210',
    genieInputBg: 'rgba(20,18,16,0.025)',
    userMsgBg: '#2340E8',
    userMsgText: '#FFFFFF',
    clipCardBg: 'rgba(20,18,16,0.02)',
    clipCardWave: 'rgba(35,64,232,0.04)',
    metroOn: 'rgba(35,64,232,0.1)',
    phoneBg: '#FFFFFF',
    phoneText: '#141210',
    phoneWaveBg: '#FAF7F2',
    tweakBg: '#FFFFFF',
    topBarBg: '#FAF7F2',
    topBarText: '#141210',
  },
  dark: {
    bg: '#161310',
    paper: '#1E1A16',
    rule: 'rgba(245,239,228,0.08)',
    ruleFaint: 'rgba(245,239,228,0.04)',
    rulerText: 'rgba(245,239,228,0.4)',
    trackBg: '#1E1A16',
    trackHeadBg: '#181510',
    trackSelBg: '#252016',
    trackName: '#F0E8D6',
    trackSub: 'rgba(245,239,228,0.45)',
    clipBg: '#2A241C',
    clipBorder: 'rgba(245,239,228,0.1)',
    clipLabel: 'rgba(245,239,228,0.65)',
    clipLabelBg: 'rgba(245,239,228,0.03)',
    accent: '#6B82FF',
    playhead: '#6B82FF',
    pillBg: '#221E18',
    pillBorder: 'rgba(245,239,228,0.1)',
    pillDivider: 'rgba(245,239,228,0.08)',
    pillText: 'rgba(245,239,228,0.55)',
    pillTextStrong: '#F0E8D6',
    lampBrass: '#D4A256',
    genieBg: 'rgba(107,130,255,0.05)',
    genieActiveBg: 'rgba(107,130,255,0.15)',
    geniePanelBg: '#221E18',
    geniePanelText: '#F0E8D6',
    genieInputBg: 'rgba(245,239,228,0.04)',
    userMsgBg: '#6B82FF',
    userMsgText: '#141210',
    clipCardBg: 'rgba(245,239,228,0.02)',
    clipCardWave: 'rgba(107,130,255,0.08)',
    metroOn: 'rgba(107,130,255,0.15)',
    phoneBg: '#1E1A16',
    phoneText: '#F0E8D6',
    phoneWaveBg: '#181510',
    tweakBg: '#221E18',
    topBarBg: '#181510',
    topBarText: '#F0E8D6',
  },
};

const DENSITY = {
  compact:    { trackH: 56,  pxPerSec: 26 },
  comfortable:{ trackH: 78,  pxPerSec: 34 },
  spacious:   { trackH: 102, pxPerSec: 40 },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "warm",
  "density": "comfortable",
  "waveStyle": "bars",
  "mixer": false,
  "phone": true
}/*EDITMODE-END*/;

function App() {
  // ─── Persist playback position ───
  const [tracks, setTracks] = React.useState(TRACKS_INIT);
  const [project] = React.useState(PROJECT_INIT);
  const [position, setPosition] = React.useState(() => {
    const n = parseFloat(localStorage.getItem('groovy:position') || '6');
    return isNaN(n) ? 6 : n;
  });
  const [playing, setPlaying] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [metronome, setMetronome] = React.useState(true);
  const [genieOpen, setGenieOpen] = React.useState(false);
  const [selectedTrack, setSelectedTrack] = React.useState('keys');
  const [selectedClip, setSelectedClip] = React.useState(null);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [editModeActive, setEditModeActive] = React.useState(false);
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);

  const theme = THEMES[tweaks.theme] || THEMES.warm;
  const { trackH, pxPerSec } = DENSITY[tweaks.density] || DENSITY.comfortable;

  // ─── Edit-mode protocol ───
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode')   { setEditModeActive(true); setTweaksOpen(true); }
      if (e.data?.type === '__deactivate_edit_mode') { setEditModeActive(false); setTweaksOpen(false); }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTweak = (k, v) => {
    setTweaks(t => ({...t, [k]: v}));
    window.parent.postMessage({type:'__edit_mode_set_keys', edits: {[k]: v}}, '*');
  };

  // ─── Playback loop (simulated) ───
  React.useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const tick = (t) => {
      const dt = (t - last) / 1000; last = t;
      setPosition(p => {
        const next = p + dt;
        if (next >= project.length) { setPlaying(false); return project.length; }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, project.length]);

  React.useEffect(() => {
    localStorage.setItem('groovy:position', String(position));
  }, [position]);

  // ─── Genie chat state ───
  const [messages, setMessages] = React.useState([
    { role: 'genie', text: GENIE_OPENERS[0] },
  ]);

  const onLampClick = () => setGenieOpen(v => !v);

  const sendToGenie = (text) => {
    const userMsg = { role: 'user', text };
    setMessages(m => [...m, userMsg, { role: 'genie', text: 'Conjuring…', pending: true }]);
    // Fake generation after a beat
    setTimeout(() => {
      const seed = Math.floor(Math.random() * 10000);
      const dur = 8 + Math.floor(Math.random() * 6);
      const label = text.length > 26 ? text.slice(0, 26) + '…' : text;
      const clipMeta = { seed, dur, bpm: project.bpm, key: project.key, label };
      setMessages(m => {
        const copy = m.slice(0, -1);
        copy.push({ role: 'genie', text: `Poured this out of the lamp for "${label}". Want it in the timeline?` });
        copy.push({
          role: 'clip', meta: clipMeta,
          inserted: false,
          onInsert: () => insertGenieClip(clipMeta),
          onRegenerate: () => regenerateGenieClip(clipMeta),
        });
        return copy;
      });
    }, 1100);
  };

  const insertGenieClip = (meta) => {
    const newClip = {
      id: 'g' + Math.random().toString(36).slice(2, 7),
      start: position,
      dur: meta.dur,
      seed: meta.seed,
      label: meta.label + '.wav',
      energy: 0.85,
      _justInserted: true,
    };
    const targetId = selectedTrack || 'keys';
    setTracks(ts => ts.map(t =>
      t.id === targetId ? {...t, clips: [...t.clips, newClip]} : t
    ));
    setMessages(ms => ms.map(m => m.role === 'clip' && m.meta.seed === meta.seed ? {...m, inserted: true} : m));
    setTimeout(() => {
      setTracks(ts => ts.map(t =>
        t.id === targetId ? {...t, clips: t.clips.map(c => c.id === newClip.id ? {...c, _justInserted: false} : c)} : t
      ));
    }, 1500);
  };

  const regenerateGenieClip = (meta) => {
    setMessages(ms => ms.map(m => m.role === 'clip' && m.meta.seed === meta.seed
      ? {...m, meta: {...m.meta, seed: Math.floor(Math.random() * 10000)}, inserted: false}
      : m));
  };

  // ─── Track interactions ───
  const toggleTrack = (id, key) => {
    setTracks(ts => ts.map(t => t.id === id ? {...t, [key]: !t[key]} : t));
  };
  const moveClip = (trackId, clipId, deltaSec) => {
    setTracks(ts => ts.map(t => t.id !== trackId ? t : {
      ...t,
      clips: t.clips.map(c => c.id === clipId ? {...c, start: Math.max(0, c.start + deltaSec)} : c)
    }));
  };
  const deleteClip = (trackId, clipId) => {
    setTracks(ts => ts.map(t => t.id !== trackId ? t : {
      ...t,
      clips: t.clips.filter(c => c.id !== clipId)
    }));
    setSelectedClip(null);
  };
  const updateTrack = (trackId, patch) => {
    setTracks(ts => ts.map(t => t.id === trackId ? {...t, ...patch} : t));
  };
  const deleteTrack = (trackId) => {
    setTracks(ts => ts.filter(t => t.id !== trackId));
    if (selectedTrack === trackId) setSelectedTrack(null);
  };
  const splitTrackAtPlayhead = (trackId) => {
    setTracks(ts => ts.map(t => {
      if (t.id !== trackId) return t;
      const out = [];
      for (const c of t.clips) {
        const end = c.start + c.dur;
        if (position > c.start && position < end) {
          out.push({...c, id: c.id + 'a', dur: position - c.start});
          out.push({...c, id: c.id + 'b', start: position, dur: end - position});
        } else {
          out.push(c);
        }
      }
      return {...t, clips: out};
    }));
  };

  // Keyboard: Backspace / Delete removes selected clip
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedClip) {
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        for (const t of tracks) {
          if (t.clips.some(c => c.id === selectedClip)) {
            deleteClip(t.id, selectedClip);
            break;
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedClip, tracks]);

  // ─── Transport ───
  const onPlay = () => setPlaying(p => !p);
  const onRecord = () => { setRecording(r => !r); setPlaying(true); };
  const onStop = () => { setPlaying(false); setRecording(false); };
  const onRewind = () => setPosition(0);

  // ─── Timeline click-to-seek ───
  const timelineBodyRef = React.useRef(null);
  const seekToX = (clientX) => {
    if (!timelineBodyRef.current) return;
    const r = timelineBodyRef.current.getBoundingClientRect();
    const x = clientX - r.left - 280; // subtract track head
    setPosition(Math.max(0, Math.min(project.length, x / pxPerSec)));
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: theme.bg,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'var(--sans)',
      color: theme.trackName,
    }}>
      {/* Paper grain texture */}
      <div style={{
        position:'absolute', inset: 0, pointerEvents:'none',
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'220\' height=\'220\'><filter id=\'n\'><feTurbulence baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 0.15 0 0 0 0 0.1 0 0 0 0 0.05 0 0 0 0.08 0\'/></filter><rect width=\'220\' height=\'220\' filter=\'url(%23n)\'/></svg>")',
        opacity: tweaks.theme === 'dark' ? 0.5 : 0.7,
        mixBlendMode: tweaks.theme === 'dark' ? 'screen' : 'multiply',
      }}/>

      {/* Top bar — minimal */}
      <div style={{
        height: 40, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding: '0 18px',
        borderBottom: `1px solid ${theme.rule}`,
        background: theme.topBarBg,
        position:'relative', zIndex: 2,
      }}>
        <div style={{display:'flex', alignItems:'center', gap: 14}}>
          <div style={{fontFamily:'var(--display)', fontSize:22, fontStyle:'italic', letterSpacing:'-0.03em', color: theme.topBarText}}>Groovy</div>
          <div style={{width:1, height:18, background: theme.rule}}/>
          <div style={{fontFamily:'var(--mono)', fontSize:10, color: theme.pillText, letterSpacing:'0.08em', textTransform:'uppercase'}}>
            file · edit · track · view · help
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <div style={{fontFamily:'var(--mono)', fontSize:10, color: theme.pillText, letterSpacing:'0.06em'}}>
            unsaved · autosave in 38s
          </div>
          <button onClick={() => setTweaksOpen(o => !o)} style={{
            fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.06em',
            padding:'4px 10px', border:`1px solid ${theme.pillDivider}`,
            background:'transparent', color: theme.topBarText, cursor:'pointer',
            borderRadius: 4, textTransform:'uppercase',
          }}>tweaks</button>
        </div>
      </div>

      {/* Timeline area */}
      <div style={{
        position:'absolute', top: 40, left: 0, right: 0, bottom: 0,
        display:'flex', flexDirection:'column',
      }}>
        {/* Ruler row with track-head gutter */}
        <div style={{display:'flex', borderBottom:`1px solid ${theme.rule}`, background: theme.trackHeadBg, position:'relative', zIndex:1}}
          onClick={(e) => seekToX(e.clientX)}>
          <div style={{width: 280, flexShrink: 0, padding:'8px 12px', borderRight:`1px solid ${theme.rule}`, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{fontFamily:'var(--mono)', fontSize:9.5, color: theme.pillText, letterSpacing:'0.1em', textTransform:'uppercase'}}>tracks · {tracks.length}</div>
            <button onClick={(e) => { e.stopPropagation(); const id = 'new'+Math.random().toString(36).slice(2,5); setTracks(t => [...t, {id, name:'Untitled', sub:'—', color:'#7A5D3A', armed:false, muted:false, solo:false, vol:0.7, gain:0, pan:0, input:'No input', output:'Master', clips:[]}]); }}
              style={{width:22, height:22, borderRadius:4, border:`1px solid ${theme.pillDivider}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: theme.pillText}}>
              <Icon.Plus/>
            </button>
          </div>
          <div style={{flex:1, overflow:'hidden'}}>
            <Ruler pxPerSec={pxPerSec} length={project.length} offset={0} bpm={project.bpm} theme={theme}/>
          </div>
        </div>

        {/* Track rows */}
        <div ref={timelineBodyRef} onClick={(e) => {
          // only seek if clicked on the body, not a clip
          if (e.target === e.currentTarget || e.target.parentElement === e.currentTarget) seekToX(e.clientX);
        }} style={{
          flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative',
          background: theme.trackBg,
        }}>
          {tracks.map(t => (
            <TrackRow key={t.id} track={t} pxPerSec={pxPerSec} length={project.length}
              height={trackH} waveStyle={tweaks.waveStyle} theme={theme}
              selectedTrack={selectedTrack} onSelect={setSelectedTrack}
              onToggle={toggleTrack} onClipDrag={moveClip}
              onClipSelect={setSelectedClip} selectedClip={selectedClip}
              onClipDelete={deleteClip}
              onUpdate={updateTrack} onDelete={deleteTrack} onSplit={splitTrackAtPlayhead}/>
          ))}
          {/* Global playhead overlay */}
          <Playhead position={position} pxPerSec={pxPerSec} trackCount={tracks.length} trackH={trackH} theme={theme}/>
          {/* Empty space filler */}
          <div style={{height: 100, background: theme.trackBg, borderTop:`1px dashed ${theme.rule}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--mono)', fontSize:10, color: theme.pillText,
            letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.6,
          }}>
            drop audio · or summon the genie
          </div>
        </div>

        {/* Mixer strip */}
        {tweaks.mixer && <MixerStrip tracks={tracks} theme={theme}/>}
      </div>

      {/* Phone preview */}
      {tweaks.phone && (
        <div style={{position:'absolute', right: 24, top: 60, zIndex: 5, pointerEvents:'auto', transform:'scale(0.86)', transformOrigin:'top right'}}>
          <div style={{fontFamily:'var(--mono)', fontSize:9.5, color: theme.pillText, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom: 8, textAlign:'right'}}>
            phone controller · paired
          </div>
          <PhoneController project={project} playing={playing} recording={recording} position={position}
            onPlay={onPlay} onRecord={onRecord} onStop={onStop} theme={theme}
            genieActive={genieOpen} setGenieActive={setGenieOpen}/>
        </div>
      )}

      {/* Transport pill */}
      <TransportPill project={project} playing={playing} recording={recording} position={position}
        onPlay={onPlay} onRecord={onRecord} onStop={onStop} onRewind={onRewind}
        metronome={metronome} setMetronome={setMetronome}
        onLampClick={onLampClick} genieActive={genieOpen} theme={theme}/>

      {/* Genie panel */}
      {genieOpen && (
        <GeniePanel open={genieOpen} onClose={() => setGenieOpen(false)}
          messages={messages} onSend={sendToGenie}
          suggestionClick={sendToGenie}
          project={project} theme={theme}/>
      )}

      {/* Tweaks */}
      <TweaksPanel tweaks={tweaks} setTweak={setTweak} open={tweaksOpen} onClose={() => setTweaksOpen(false)} theme={theme}/>

      {/* Record level-meter indicator floating beside pill */}
      {recording && <RecordingBadge theme={theme}/>}
    </div>
  );
}

function Playhead({ position, pxPerSec, trackCount, trackH, theme }) {
  const x = 280 + position * pxPerSec;
  return (
    <div style={{
      position:'absolute', left: x, top: 0, bottom: 0, width: 1,
      background: theme.playhead,
      pointerEvents: 'none',
      zIndex: 10,
      boxShadow: `0 0 0 0.5px ${theme.playhead}`,
    }}>
      <div style={{
        position:'absolute', top: -1, left: -5, width: 11, height: 10,
        background: theme.playhead,
        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
      }}/>
      <div style={{
        position:'absolute', top: -20, left: -24, padding:'2px 6px',
        fontFamily:'var(--mono)', fontSize:9, color: '#fff',
        background: theme.playhead,
        borderRadius: 3, letterSpacing:'0.04em',
        whiteSpace:'nowrap',
      }}>{position.toFixed(2)}s</div>
    </div>
  );
}

function MixerStrip({ tracks, theme }) {
  return (
    <div style={{
      height: 140,
      borderTop: `1px solid ${theme.rule}`,
      background: theme.trackHeadBg,
      display:'flex', overflowX:'auto',
    }}>
      {tracks.map(t => (
        <div key={t.id} style={{
          width: 120, flexShrink: 0, padding: '10px 12px',
          borderRight: `1px solid ${theme.rule}`,
          display:'flex', flexDirection:'column', gap: 6,
        }}>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <div style={{width:6, height:6, background:t.color, borderRadius:1}}/>
            <div style={{fontFamily:'var(--display)', fontSize:13, color:theme.trackName, letterSpacing:'-0.01em'}}>{t.name}</div>
          </div>
          {/* fader */}
          <div style={{flex:1, display:'flex', gap: 8, alignItems:'flex-end'}}>
            <div style={{width:18, height:80, background:theme.clipBg, borderRadius:2, border:`1px solid ${theme.pillDivider}`, position:'relative'}}>
              <div style={{position:'absolute', bottom: `${t.vol * 100}%`, left: -2, right: -2, height: 8, background: theme.trackName, borderRadius:2}}/>
            </div>
            {/* meter */}
            <div style={{width:12, height:80, background:theme.clipBg, borderRadius:2, border:`1px solid ${theme.pillDivider}`, position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', left:0, right:0, bottom:0, height: `${t.muted ? 0 : t.vol * 80}%`, background: `linear-gradient(to top, ${t.color}, ${theme.accent})`, opacity: 0.85}}/>
            </div>
          </div>
          <div style={{display:'flex', gap: 4, justifyContent:'center'}}>
            <div style={{fontFamily:'var(--mono)', fontSize:9, color: theme.pillText, letterSpacing:'0.04em'}}>-{(20 - t.vol * 24).toFixed(1)}dB</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordingBadge({ theme }) {
  const [levels, setLevels] = React.useState(Array(18).fill(0));
  React.useEffect(() => {
    const id = setInterval(() => {
      setLevels(Array.from({length: 18}, () => Math.random() * 0.9 + 0.1));
    }, 80);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      position:'absolute', bottom: 96, left: 24,
      display:'flex', alignItems:'center', gap: 10,
      padding:'8px 12px',
      background:'#B3261E', color:'#F5EFE4', borderRadius: 999,
      fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase',
      boxShadow: '0 6px 24px rgba(179,38,30,0.35)',
      zIndex: 21,
    }}>
      <div style={{width:8, height:8, borderRadius:'50%', background:'#F5EFE4', animation:'recordPulse 1.2s ease-in-out infinite'}}/>
      <span>Recording · Keys</span>
      <div style={{display:'flex', gap:1.5, marginLeft:4}}>
        {levels.map((l, i) => (
          <div key={i} style={{
            width:2, height: 3 + l*14,
            background:'#F5EFE4', opacity: 0.5 + l*0.5,
            borderRadius: 1,
          }}/>
        ))}
      </div>
    </div>
  );
}

window.App = App;
