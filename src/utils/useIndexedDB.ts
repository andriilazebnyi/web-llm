import { useEffect, useMemo, useRef } from 'react';

// Minimal IndexedDB helper with a React hook interface.

export type DBApi<T> = {
  get: (id: string) => Promise<T | undefined>;
  put: (value: T, id: string) => Promise<void>;
  del: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
};

export function useIndexedDB<T = unknown>(dbName: string, storeName: string): DBApi<T> {
  const dbRef = useRef<IDBDatabase | null>(null);
  const ready = useRef<Promise<IDBDatabase> | null>(null);

  useEffect(() => {
    ready.current = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      req.onsuccess = () => { dbRef.current = req.result; resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
    return () => { dbRef.current?.close(); dbRef.current = null; };
  }, [dbName, storeName]);

  return useMemo(() => ({
    async get(id: string) {
      const db = await ready.current!;
      return new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      });
    },
    async put(value: T, id: string) {
      const db = await ready.current!;
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(storeName).put(value as unknown as IDBValidKey, id);
      });
    },
    async del(id: string) {
      const db = await ready.current!;
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(storeName).delete(id);
      });
    },
    async clear() {
      const db = await ready.current!;
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(storeName).clear();
      });
    },
    async keys() {
      const db = await ready.current!;
      return new Promise<string[]>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAllKeys();
        req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
        req.onerror = () => reject(req.error);
      });
    },
  }), [storeName]);
}

