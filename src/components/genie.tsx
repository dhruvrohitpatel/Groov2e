import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../types';
import type { AgentMessage } from '../types/agent';
import { Icon } from './icons';
import { Waveform } from './waveform';
import { useGroovyStore } from '../store/useGroovyStore';
import { agentController } from '../controllers/agentController';
import { AgentActivity } from './genie/AgentActivity';
import { AgentUndoFooter } from './genie/AgentUndoFooter';
import { demoPrompts } from '../features/agent/demoPrompts';

interface Props {
  open: boolean;
  onClose: () => void;
  theme: Theme;
}

export function GeniePanel({ open, onClose, theme }: Props) {
  const messages = useGroovyStore((s) => s.chatMessages);
  const project = useGroovyStore((s) => s.project);
  const isLoading = useGroovyStore((s) => s.agentRequest.isLoading);
  const activity = useGroovyStore((s) => s.agentActivity);

  const [input, setInput] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages]);

  const send = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    void agentController.submitText(trimmed);
  };
  const submit = () => {
    send(input);
    setInput('');
  };

  return (
    <div style={{
      position: 'absolute', bottom: 92, right: 24,
      width: 380, maxHeight: 'calc(100vh - 140px)',
      background: theme.geniePanelBg,
      border: `1px solid ${theme.pillBorder}`,
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(20,18,16,0.22)',
      display: 'flex', flexDirection: 'column', zIndex: 19,
      fontFamily: 'var(--sans)',
      transformOrigin: 'bottom right',
      animation: open ? 'genieOpen 380ms cubic-bezier(.2,.9,.3,1.1) both' : 'genieClose 180ms ease-in both',
      pointerEvents: open ? 'auto' : 'none',
    }}>
      <div style={{
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${theme.pillDivider}`,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #5A76FF 0%, #2340E8 55%, #0E22A0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 2px rgba(35,64,232,0.12), 0 0 16px rgba(35,64,232,0.35)',
          animation: 'genieOrb 3.6s ease-in-out infinite',
        }}>
          <Icon.Lamp s={14} c="#F5EFE4"/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontStyle: 'italic', color: theme.geniePanelText, letterSpacing: '-0.01em' }}>the agent</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, opacity: 0.55, color: theme.geniePanelText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isLoading ? 'jamming…' : 'ready to jam'} · {project.bpm} bpm · {project.key}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.55 }} title="Dismiss">
          <Icon.Close c={theme.geniePanelText}/>
        </button>
      </div>

      <div ref={scrollerRef} style={{
        flex: 1, overflowY: 'auto', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map((m) => (
          <GenieMessage
            key={m.id}
            m={m}
            theme={theme}
            bpm={project.bpm}
            musicalKey={project.key}
          />
        ))}
        <AgentActivity activity={activity} theme={theme} />
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: theme.geniePanelText, opacity: 0.55,
          }}>
            agent is jamming…
          </div>
        )}
      </div>

      <AgentUndoFooter theme={theme} />

      {messages.length < 3 && (
        <div style={{ padding: '8px 12px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {demoPrompts.slice(0, 6).map((p) => (
            <button key={p.label} onClick={() => send(p.prompt)} style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.02em',
              padding: '5px 9px', borderRadius: 999,
              border: `1px solid ${theme.pillDivider}`,
              background: 'transparent', color: theme.geniePanelText,
              cursor: 'pointer', opacity: 0.8,
            }}>{p.label}</button>
          ))}
        </div>
      )}

      <div style={{
        padding: '10px 12px 12px',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        borderTop: `1px solid ${theme.pillDivider}`, marginTop: 10,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-end',
          border: `1px solid ${theme.pillDivider}`, borderRadius: 10,
          padding: '6px 10px', background: theme.genieInputBg,
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="what should we jam on next?"
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--sans)', fontSize: 13, color: theme.geniePanelText,
              lineHeight: 1.4, minHeight: 18, maxHeight: 80,
            }}
          />
        </div>
        <button onClick={submit} disabled={!input.trim() || isLoading} style={{
          width: 32, height: 32, borderRadius: '50%',
          background: input.trim() && !isLoading ? '#2340E8' : 'rgba(35,64,232,0.2)',
          border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 160ms',
        }}>
          <Icon.Send s={14} c="#fff"/>
        </button>
      </div>
    </div>
  );
}

function GenieMessage({
  m, theme, bpm, musicalKey,
}: {
  m: AgentMessage;
  theme: Theme;
  bpm: number;
  musicalKey: string;
}) {
  if (m.role === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
        <div style={{
          background: theme.userMsgBg, color: theme.userMsgText,
          padding: '8px 12px', borderRadius: '14px 14px 2px 14px',
          fontSize: 13, lineHeight: 1.4,
        }}>{m.content}</div>
      </div>
    );
  }

  const textBubble = (
    <div style={{
      fontFamily: 'var(--display)', fontStyle: 'italic',
      color: theme.geniePanelText, fontSize: 14, lineHeight: 1.45, padding: '2px 0',
    }}>
      <span style={{
        opacity: 0.55, fontFamily: 'var(--mono)', fontSize: 9,
        fontStyle: 'normal', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8,
      }}>agent</span>
      {m.content}
    </div>
  );

  if (!m.attachment) {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
        {textBubble}
      </div>
    );
  }

  const att = m.attachment;
  const seed = att.seed ?? 1234;
  const label = att.label ?? att.trackName;

  return (
    <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>{textBubble}</div>
      <div style={{
        border: `1px solid ${theme.pillDivider}`,
        borderRadius: 10, overflow: 'hidden',
        background: theme.clipCardBg,
      }}>
        <div style={{
          padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: `1px solid ${theme.pillDivider}`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2340E8' }}/>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: theme.geniePanelText, opacity: 0.7,
          }}>
            generated · {att.duration.toFixed(1)}s · {bpm} bpm · {musicalKey}
          </div>
        </div>
        <div style={{ background: theme.clipCardWave, padding: '6px 10px' }}>
          <Waveform seed={seed} color="#2340E8" width={330} height={42} bars={80} energy={0.9}/>
        </div>
        <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 14, color: theme.geniePanelText }}>
            "{label}"
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { void agentController.regenerateAttachment(m.id); }} style={tinyBtn(theme, false)}>regenerate</button>
            <button onClick={() => agentController.insertAttachment(m.id)} disabled={att.inserted} style={tinyBtn(theme, true, att.inserted)}>
              {att.inserted ? '✓ inserted' : 'insert at playhead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function tinyBtn(theme: Theme, primary: boolean, disabled?: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.04em',
    padding: '5px 10px', borderRadius: 6,
    cursor: disabled ? 'default' : 'pointer',
    border: primary ? 'none' : `1px solid ${theme.pillDivider}`,
    background: primary ? (disabled ? 'rgba(35,64,232,0.4)' : '#2340E8') : 'transparent',
    color: primary ? '#fff' : theme.geniePanelText,
    opacity: disabled ? 0.9 : 1,
    textTransform: 'lowercase',
  };
}
