import { useEffect, useMemo, useState } from 'react';
import { useIndexedDB } from '../../utils/useIndexedDB';
import type { ChatMessage } from './ChatPanel';

type RecordShape = { id: string; modelId: string; items: ChatMessage[]; updatedAt: number };

export function useChatStore(modelId: string) {
  const db = useIndexedDB<RecordShape>('web-llm-db', 'chats');
  const [items, setItems] = useState<ChatMessage[]>([]);
  const key = useMemo(() => `chat:${modelId}`, [modelId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rec = await db.get(key);
      if (!cancelled && rec) setItems(rec.items);
    })();
    return () => { cancelled = true; };
  }, [db, key]);

  useEffect(() => {
    const rec: RecordShape = { id: key, modelId, items, updatedAt: Date.now() };
    db.put(rec, key).catch(() => {});
  }, [items, db, key, modelId]);

  const appendUser = (text: string) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setItems((s) => [...s, msg]);
    return msg;
  };

  const appendAssistant = (text: string) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: text };
    setItems((s) => [...s, msg]);
    return msg;
  };

  const updateAssistant = (id: string, updater: (prev: string) => string) => {
    setItems((s) => s.map((m) => m.id === id ? { ...m, content: updater(m.content) } : m));
  };

  const clear = () => setItems([]);

  return { items, appendUser, appendAssistant, updateAssistant, clear };
}

