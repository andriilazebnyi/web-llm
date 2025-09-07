import { useCallback, useMemo, useRef, useState } from 'react';
import type { ModelInfo } from './usePrebuiltModels';
import type { ChatMessage } from '../chat/ChatPanel';
import * as webllm from '@mlc-ai/web-llm';

type State = 'idle' | 'loading' | 'ready';

type ArtifactState = { label: string; status: 'pending' | 'downloading' | 'done' };

export function useEngine() {
  const engineRef = useRef<webllm.MLCEngineInterface | null>(null);
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState<{ pct: number; phase: string; artifacts: ArtifactState[] }>({ pct: 0, phase: '', artifacts: [] });
  const [streaming, setStreaming] = useState(false);
  const [stats, setStats] = useState({ tokens: 0, tps: 0 });
  const activeArtifactRef = useRef<string | null>(null);

  const load = useCallback(async (model: ModelInfo) => {
    if (state !== 'idle') return;
    if (!('gpu' in navigator)) {
      console.warn('WebGPU not detected; fallback paths may be slow.');
    }
    setState('loading');
    setProgress({ pct: 0, phase: 'Initializing', artifacts: [] });
    activeArtifactRef.current = null;
    try {
      const engine = await webllm.CreateMLCEngine(model.id, {
        appConfig: webllm.prebuiltAppConfig,
        initProgressCallback: (p) => {
          const pct = Math.round((p.progress ?? 0) * 100);
          const phase = p.text ?? '';
          const label = extractArtifactLabel(phase);

          setProgress((prev) => {
            let artifacts = [...prev.artifacts];
            if (label) {
              const idx = artifacts.findIndex(a => a.label === label);
              const currentActive = activeArtifactRef.current;
              if (currentActive && currentActive !== label) {
                const j = artifacts.findIndex(a => a.label === currentActive);
                if (j >= 0) {
                  const cur = artifacts[j]!;
                  if (cur.status !== 'done') artifacts[j] = { label: cur.label, status: 'downloading' };
                }
              }
              if (idx === -1) {
                artifacts.push({ label, status: 'downloading' });
              } else {
                const cur = artifacts[idx]!;
                if (cur.status === 'pending') artifacts[idx] = { label: cur.label, status: 'downloading' };
              }
              activeArtifactRef.current = label;
            }
            if (pct >= 100) {
              artifacts = artifacts.map(a => ({ label: a.label, status: 'done' }));
              activeArtifactRef.current = null;
            }
            return { pct, phase, artifacts };
          });
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
    setProgress({ pct: 0, phase: '', artifacts: [] });
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
      // Streaming tokens via async iterator
      const stream = await engine.chat.completions.create({
        messages: seq.map(m => ({ role: m.role as any, content: m.content })),
        stream: true,
      } as any);
      let totalChars = 0;
      // @ts-ignore - AsyncIterable yielded chunks with delta content
      for await (const chunk of stream) {
        const piece = chunk?.choices?.[0]?.delta?.content ?? '';
        if (piece) {
          totalChars += piece.length;
          opts?.onToken?.(piece);
        }
      }
      const t1 = performance.now();
      const seconds = Math.max(0.001, (t1 - t0) / 1000);
      const tokensApprox = Math.max(1, Math.round(totalChars / 4));
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

function extractArtifactLabel(text: string): string | '' {
  if (!text) return '';
  // Common WebLLM progress texts include file paths or names.
  // Heuristics: last path segment or last token with a dot
  const parts = text.split(/\s+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const token = parts[i];
    if (token?.includes('/') || token?.includes('\\')) {
      const seg = token.split(/[\\/]/).pop() || token;
      if (seg.length > 2) return seg;
    }
    if (token?.includes('.')) {
      if (token.endsWith('...')) continue;
      if (token.length > 2) return token;
    }
  }
  // Fallback: short phase text
  return text.length > 40 ? text.slice(0, 40) + '…' : text;
}
