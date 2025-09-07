import { useCallback, useMemo, useRef, useState } from 'react';
import type { ModelInfo } from './usePrebuiltModels';
import type { ChatMessage } from '../chat/ChatPanel';
import * as webllm from '@mlc-ai/web-llm';

type State = 'idle' | 'loading' | 'ready';

export function useEngine() {
  const engineRef = useRef<webllm.MLCEngineInterface | null>(null);
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState<{ pct: number; phase: string }>({ pct: 0, phase: '' });
  const [streaming, setStreaming] = useState(false);
  const [stats, setStats] = useState({ tokens: 0, tps: 0 });

  const load = useCallback(async (model: ModelInfo) => {
    if (state !== 'idle') return;
    if (!('gpu' in navigator)) {
      console.warn('WebGPU not detected; fallback paths may be slow.');
    }
    setState('loading');
    setProgress({ pct: 0, phase: 'Initializing' });
    try {
      const engine = await webllm.CreateMLCEngine(model.id, {
        appConfig: webllm.prebuiltAppConfig,
        initProgressCallback: (p) => {
          const pct = Math.round((p.progress ?? 0) * 100);
          setProgress({ pct, phase: p.text ?? '' });
        },
      });
      engineRef.current = engine;
      setState('ready');
    } catch (err) {
      console.error(err);
      setState('idle');
      throw err;
    }
  }, [state]);

  const unload = useCallback(() => {
    engineRef.current = null;
    setState('idle');
    setProgress({ pct: 0, phase: '' });
  }, []);

  const clearCaches = useCallback(async () => {
    // Clear likely MLC-related caches
    try {
      const names = await caches.keys();
      await Promise.all(names
        .filter(n => /mlc|web-llm|webllm/i.test(n))
        .map(n => caches.delete(n)));
    } catch {}
    // Best effort clear of our own DB
    try { indexedDB.deleteDatabase('web-llm-db'); } catch {}
  }, []);

  const generate = useCallback(async (
    messages: ChatMessage[],
    opts?: { onToken?: (t: string) => void }
  ) => {
    const engine = engineRef.current;
    if (!engine) throw new Error('Engine not ready');
    setStreaming(true);
    const t0 = performance.now();
    try {
      const seq = (messages || []).filter(Boolean) as ChatMessage[];
      if (seq.length === 0) throw new Error('No prompt messages');
      // Non-streaming for simplicity; append full content at once.
      const result = await engine.chat.completions.create({
        messages: seq.map(m => ({ role: m.role as any, content: m.content })),
      } as any);
      const content = result?.choices?.[0]?.message?.content ?? '';
      if (content && opts?.onToken) opts.onToken(content);

      const t1 = performance.now();
      const seconds = Math.max(0.001, (t1 - t0) / 1000);
      const tokensApprox = Math.max(1, Math.round(content.length / 4));
      setStats({ tokens: tokensApprox, tps: tokensApprox / seconds });
    } finally {
      setStreaming(false);
    }
  }, []);

  return useMemo(() => ({
    state,
    progress,
    stats,
    streaming,
    load,
    unload,
    clearCaches,
    generate,
  }), [state, progress, stats, streaming, load, unload, clearCaches, generate]);
}
