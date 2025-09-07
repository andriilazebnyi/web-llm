import { useEffect, useMemo, useState } from 'react';
import { useChatStore } from '../ui/chat/useChatStore';
import { ChatPanel } from '../ui/chat/ChatPanel';
import { useEngine } from '../ui/model/useEngine';
import { usePrebuiltModels } from '../ui/model/usePrebuiltModels';

export default function App() {
  const modelList = usePrebuiltModels();
  const [selectedModel, setSelectedModel] = useState<string>(modelList[0]?.id || '');
  const engine = useEngine();
  const chat = useChatStore(selectedModel);

  useEffect(() => {
    if (!selectedModel && modelList.length > 0) {
      setSelectedModel(modelList[0]?.id ?? '');
    }
  }, [modelList, selectedModel]);

  const current = useMemo(
    () => modelList.find((m) => m.id === selectedModel)!,
    [modelList, selectedModel]
  );

  useEffect(() => {
    document.title = `Web LLM • ${current?.label ?? ''}`;
  }, [current]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="row">
          <div className="brand">Web LLM Starter</div>
          <div className="muted">React + WebGPU</div>
        </div>
        <div className="row">
          <span className="muted">Tok/s</span>
          <span className="stat">{engine.stats.tps.toFixed(1)}</span>
          <span className="muted">| Tokens</span>
          <span className="stat">{engine.stats.tokens}</span>
        </div>
      </header>

      <main className="container">
        <aside className="sidebar">
          <div className="col">
            <label>Model</label>
            <select
              className="select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={engine.state === 'loading' || engine.state === 'ready'}
            >
              {modelList.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>

            {engine.state !== 'ready' ? (
              <button
                className="btn"
                onClick={() => current && engine.load(current)}
                disabled={engine.state === 'loading'}
              >
                {engine.state === 'idle' && 'Load model'}
                {engine.state === 'loading' && `Loading… ${engine.progress.pct}%`}
              </button>
            ) : (
              <button className="btn" onClick={engine.unload}>Unload</button>
            )}

            {engine.state === 'loading' && (
              <div className="col">
                <div className="row" style={{justifyContent:'space-between'}}>
                  <div className="muted">{engine.progress.phase}</div>
                  <div className="stat">{engine.progress.pct}%</div>
                </div>
                <progress className="progress" max={100} value={engine.progress.pct} />
                <div className="col" style={{ marginTop: 8 }}>
                  <div className="muted">Artifacts</div>
                  {engine.progress.artifacts.map(a => (
                    <div key={a.label} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="muted" title={a.label}>{a.label}</span>
                      <span className="kbd">{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="row" style={{marginTop: 8}}>
              <button className="btn" onClick={chat.clear} disabled={chat.items.length === 0}>Clear chat</button>
              <button className="btn" onClick={engine.clearCaches}>Clear caches</button>
            </div>

            <div className="col" style={{marginTop: 8}}>
              <div className="muted">Persistence</div>
              <div className="row">
                <span className="kbd">IndexedDB</span>
                <span className="kbd">Cache Storage</span>
              </div>
            </div>

          </div>
        </aside>

        <section className="content">
          {engine.streaming && (
            <div className="thinking-pill" aria-live="polite">
              <span className="spinner" />
              <span>Assistant is thinking</span>
            </div>
          )}
          <div className="chat">
            <ChatPanel
              messages={chat.items}
              streaming={engine.streaming}
            />
          </div>
          <form
            className="inputbar"
            onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem('q') as HTMLInputElement);
              const text = input.value.trim();
              if (!text) return;
              input.value = '';
              if (engine.state !== 'ready') return;

              const { appendUser, appendAssistant, updateAssistant } = chat;
              const userMsg = appendUser(text);
              const asstMsg = appendAssistant('');

              try {
                // Build the prompt history up to the user message (exclude placeholder assistant)
                const history = [...chat.items, userMsg];
                await engine.generate(history, {
                  onToken: (t) => updateAssistant(asstMsg.id, (prev) => prev + t),
                });
              } catch (err) {
                updateAssistant(asstMsg.id, (prev) => prev + `\n[Error] ${(err as Error).message}`);
              }
            }}
          >
            <input
              name="q"
              className="textfield"
              placeholder={engine.state === 'ready' ? 'Ask something…' : 'Load a model to start'}
              disabled={engine.state !== 'ready' || engine.streaming}
              autoComplete="off"
            />
            <button className="btn" disabled={engine.state !== 'ready' || engine.streaming}>
              {engine.streaming ? <><span className="spinner"/> Thinking…</> : 'Send'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
