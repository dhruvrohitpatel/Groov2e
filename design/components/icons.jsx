// Icons — hand-drawn feel, stroke-based. Genie lamp is hero.
const Icon = {
  Play: ({s=14, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M3 2L12 7L3 12V2Z" fill={c}/></svg>
  ),
  Pause: ({s=14, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><rect x="3" y="2" width="3" height="10" fill={c}/><rect x="8" y="2" width="3" height="10" fill={c}/></svg>
  ),
  Stop: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" fill={c}/></svg>
  ),
  Record: ({s=14, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" fill={c}/></svg>
  ),
  Rewind: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M10 2L4 6L10 10V2Z" fill={c}/><rect x="2" y="2" width="1.5" height="8" fill={c}/></svg>
  ),
  Metronome: ({s=14, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="1.3"><path d="M4 12 L10 12 L8.5 2 L5.5 2 Z"/><line x1="7" y1="11" x2="9.5" y2="3.5"/></svg>
  ),
  Mute: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke={c} strokeWidth="1.2"><path d="M2 4.5v3h2l3 2.5v-8L4 4.5H2Z"/><line x1="8.5" y1="4" x2="11" y2="7.5"/><line x1="11" y1="4" x2="8.5" y2="7.5"/></svg>
  ),
  Solo: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><text x="6" y="9" textAnchor="middle" fontSize="8" fontWeight="700" fill={c} fontFamily="ui-monospace,monospace">S</text></svg>
  ),
  Arm: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="3.5" fill={c}/></svg>
  ),
  Plus: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke={c} strokeWidth="1.4"><line x1="6" y1="2.5" x2="6" y2="9.5"/><line x1="2.5" y1="6" x2="9.5" y2="6"/></svg>
  ),
  Close: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke={c} strokeWidth="1.3"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>
  ),
  Scissors: ({s=12, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke={c} strokeWidth="1.2"><circle cx="3" cy="9" r="1.8"/><circle cx="9" cy="9" r="1.8"/><line x1="4.3" y1="7.8" x2="10" y2="2"/><line x1="7.7" y1="7.8" x2="2" y2="2"/></svg>
  ),
  Send: ({s=14, c='currentColor'}) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M2 7L12 2L8 12L7 8L2 7Z" fill={c}/></svg>
  ),
  // Hero: brass genie lamp
  Lamp: ({s=22, c='currentColor', glow=false}) => (
    <svg width={s} height={s} viewBox="0 0 32 24" fill="none">
      {glow && <ellipse cx="16" cy="20" rx="13" ry="1.5" fill="#2340E8" opacity="0.2"/>}
      {/* lamp body — teardrop with spout */}
      <path d="M8 18 C6 18 5 16.5 5 14.5 C5 11 8 8 13 8 L18 8 C19 8 20 8.3 21 9 L26 7 L25 11 L24.5 12 C25.5 13 26 14 26 15.5 C26 17 25 18 23 18 L8 18 Z"
        fill={c} stroke="#1a1210" strokeWidth="0.6"/>
      {/* handle */}
      <path d="M5 14 C3 13 2 12 2 11 C2 10 3 9.5 4.5 10" stroke={c} strokeWidth="1.4" fill="none"/>
      {/* lid knob */}
      <circle cx="14" cy="7.5" r="1.3" fill={c} stroke="#1a1210" strokeWidth="0.5"/>
      <rect x="13.4" y="5" width="1.2" height="2.5" fill={c}/>
      {/* highlight */}
      <path d="M9 11 C10 10 12 9.5 14 10" stroke="#fff" strokeWidth="0.6" opacity="0.5" fill="none"/>
    </svg>
  ),
  // Wisp of smoke rising from lamp spout
  Smoke: ({s=32, c='#2340E8'}) => (
    <svg width={s} height={s*2} viewBox="0 0 32 64" fill="none">
      <path d="M26 58 Q28 50 24 44 Q20 38 24 30 Q28 22 22 14 Q18 8 22 2"
        stroke={c} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M26 58 Q29 52 26 46 Q22 40 27 32 Q30 24 26 16"
        stroke={c} strokeWidth="3" fill="none" opacity="0.2" strokeLinecap="round"/>
    </svg>
  ),
};
window.Icon = Icon;
