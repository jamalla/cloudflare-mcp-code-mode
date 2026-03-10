// Add this import at the top of App.jsx
import { useChat } from 'ai/react';

// Add this component before the export default
function WeatherChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: 'http://localhost:8787/chat',
  });

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 20, overflow: 'hidden', margin: '48px 0'
    }}>
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>⚡ Live Demo — Code Mode in Action</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
            Real LLM · Real MCP · Real V8 isolate
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(57,211,83,0.1)', border: '1px solid rgba(57,211,83,0.3)',
          color: '#39D353', fontSize: 12, padding: '5px 12px', borderRadius: 20,
          fontFamily: 'Space Mono, monospace'
        }}>
          <div style={{ width: 6, height: 6, background: '#39D353', borderRadius: '50%' }} />
          Connected
        </div>
      </div>

      <div style={{ padding: 28 }}>
        {/* Messages */}
        <div style={{
          minHeight: 200, maxHeight: 400, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24
        }}>
          {messages.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              Ask about the weather anywhere in the world.<br />
              <span style={{ color: 'var(--orange)', fontSize: 12 }}>
                Try: "What's the weather like in Tokyo this week?"
              </span>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{
              display: 'flex', gap: 12,
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: m.role === 'user' ? 'var(--orange)' : 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
              }}>
                {m.role === 'user' ? '👤' : '⚡'}
              </div>
              <div style={{
                background: m.role === 'user' ? 'var(--orange-dim)' : 'var(--code-bg)',
                border: `1px solid ${m.role === 'user' ? 'var(--border)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12, padding: '12px 16px',
                fontSize: 14, lineHeight: 1.7, maxWidth: '80%',
                whiteSpace: 'pre-wrap'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
              }}>⚡</div>
              <div style={{
                background: 'var(--code-bg)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--muted)'
              }}>
                Writing TypeScript → running in isolate...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12 }}>
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about weather anywhere... e.g. 'Compare London and NYC weather this week'"
            style={{
              flex: 1, background: 'var(--code-bg)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '12px 16px', color: 'var(--text)',
              fontSize: 14, fontFamily: 'Syne, sans-serif', outline: 'none',
            }}
          />
          <button type="submit" disabled={isLoading} style={{
            background: isLoading ? 'var(--surface2)' : 'var(--orange)',
            color: isLoading ? 'var(--muted)' : '#000',
            border: 'none', borderRadius: 10, padding: '12px 20px',
            fontWeight: 700, fontSize: 14, cursor: isLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne, sans-serif', transition: 'all 0.2s'
          }}>
            {isLoading ? '...' : 'Ask →'}
          </button>
        </form>
      </div>
    </div>
  );
}