import type { Theme } from '../types';
import { formatBarsBeats, formatTime } from '../lib/formatters';
import { Icon } from './icons';
import { Waveform } from './waveform';
import { useGroovyStore } from '../store/useGroovyStore';
import { transportController } from '../controllers/transportController';
import { recordingController } from '../controllers/recordingController';

interface Props {
  theme: Theme;
  genieActive: boolean;
  setGenieActive: (v: boolean) => void;
}

export function PhoneController({ theme, genieActive, setGenieActive }: Props) {
  const project = useGroovyStore((s) => s.project);
  const transportStatus = useGroovyStore((s) => s.transport.status);
  const cursorPosition = useGroovyStore((s) => s.cursorPosition);
  const isRecording = useGroovyStore((s) => s.recording.isRecording);
  const armedTrackId = useGroovyStore((s) => s.recording.armedTrackId);
  const tracks = useGroovyStore((s) => s.tracks);
  const armedTrack = tracks.find((t) => t.id === armedTrackId) ?? null;
  const playing = transportStatus === 'playing';

  const handlePlay = () => {
    if (playing) transportController.pause();
    else transportController.play();
  };
  const handleRecord = () => {
    void recordingController.toggleRecord();
  };

  return (
    <div style={{
      width: 220, height: 440, borderRadius: 36,
      background: '#141210', padding: 8,
      boxShadow: '0 18px 50px rgba(20,18,16,0.35), 0 2px 0 rgba(255,255,255,0.08) inset',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 30,
        background: theme.phoneBg, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
          width: 72, height: 18, background: '#141210', borderRadius: 10, zIndex: 2,
        }}/>
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '8px 20px 4px',
          fontFamily: 'var(--mono)', fontSize: 9, color: theme.phoneText, letterSpacing: '0.06em',
        }}>
          <span>9:24</span>
          <span style={{ opacity: 0.4 }}>· · ·</span>
        </div>

        <div style={{ padding: '18px 16px 6px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, opacity: 0.55, color: theme.phoneText, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {isRecording ? 'recording' : 'standby'}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: theme.phoneText, letterSpacing: '-0.02em', marginTop: 2 }}>{project.name}</div>
        </div>

        <div style={{ padding: '6px 16px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 22, color: theme.phoneText,
            letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums', marginTop: 20,
          }}>{formatBarsBeats(cursorPosition, project.bpm)}</div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.5, color: theme.phoneText,
            letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums',
          }}>{formatTime(cursorPosition)}</div>
        </div>

        <div style={{ padding: '10px 16px' }}>
          <div style={{
            height: 50, border: `1px solid ${theme.pillDivider}`, borderRadius: 6,
            background: theme.phoneWaveBg, padding: 4, overflow: 'hidden',
          }}>
            <Waveform seed={Math.floor(cursorPosition * 4)} color={theme.accent} width={180} height={40} bars={40} energy={isRecording ? 1 : 0.5}/>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 6, height: 6 }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const active = isRecording && Math.random() > i / 26;
              const isRed = i > 20;
              return (
                <div key={i} style={{
                  flex: 1,
                  background: active ? (isRed ? '#B3261E' : theme.accent) : theme.pillDivider,
                  borderRadius: 1,
                  opacity: active ? 1 : 0.35,
                }}/>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '8px 16px', flex: 1, overflow: 'hidden' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, opacity: 0.5, color: theme.phoneText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>armed</div>
          {armedTrack ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px',
              border: `1px solid ${theme.accent}`,
              borderRadius: 8,
              background: `${theme.accent}15`,
            }}>
              <div style={{ width: 6, height: 6, background: '#B3261E', borderRadius: '50%', animation: 'armPulse 1.4s ease-in-out infinite' }}/>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: theme.phoneText }}>{armedTrack.name}</div>
              <div style={{ flex: 1 }}/>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.5, color: theme.phoneText }}>
                {armedTrack.input ?? 'No input'}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '8px 10px', border: `1px dashed ${theme.pillDivider}`, borderRadius: 8,
              fontFamily: 'var(--mono)', fontSize: 10, color: theme.phoneText, opacity: 0.55,
              letterSpacing: '0.06em',
            }}>
              arm a track to record
            </div>
          )}
        </div>

        <div style={{
          padding: '14px 20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          borderTop: `1px solid ${theme.pillDivider}`,
        }}>
          <button onClick={() => setGenieActive(!genieActive)} style={{
            width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: genieActive ? 'rgba(35,64,232,0.15)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.Lamp s={20} c={genieActive ? '#2340E8' : theme.lampBrass}/>
          </button>
          <button onClick={handlePlay} style={{
            width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#141210',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {playing ? <Icon.Pause s={20} c="#fff"/> : <Icon.Play s={20} c="#fff"/>}
          </button>
          <button onClick={handleRecord} style={{
            width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
            background: isRecording ? '#B3261E' : 'transparent',
            border: isRecording ? 'none' : '1.5px solid #B3261E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isRecording ? 'recordPulse 1.2s ease-in-out infinite' : 'none',
          }}>
            <Icon.Record s={14} c={isRecording ? '#fff' : '#B3261E'}/>
          </button>
        </div>
      </div>
    </div>
  );
}
