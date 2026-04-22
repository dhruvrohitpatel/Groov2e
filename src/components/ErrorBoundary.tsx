import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Groov2e] Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 16, fontFamily: 'sans-serif',
        background: '#1a1512', color: '#e8d5b0', padding: 32, textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <pre style={{
          fontSize: 11, background: '#0e0c0a', padding: '12px 16px', borderRadius: 8,
          maxWidth: 600, overflowX: 'auto', textAlign: 'left', color: '#c9a96e',
        }}>
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 20px', borderRadius: 8, border: '1px solid #5a4a3a',
            background: 'transparent', color: '#e8d5b0', cursor: 'pointer', fontSize: 13,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
