import type { DevSession } from './protocol/types.js';

const DEFAULT_QUOTA_BYTES = 200 * 1024 * 1024;

interface CacheEntry {
  sessionId: string;
  session: DevSession;
  bytes: number;
  lastAccess: number;
}

export interface SessionCache {
  put(sessionId: string, session: DevSession): Promise<void>;
  get(sessionId: string): Promise<DevSession | null>;
  size(): Promise<number>;
}

/** Storage abstraction so unit tests can inject an in-memory map instead of IndexedDB. */
interface SessionStorageAdapter {
  keys(): Promise<string[]>;
  get(sessionId: string): Promise<CacheEntry | undefined>;
  set(sessionId: string, entry: CacheEntry): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

function memoryAdapter(): SessionStorageAdapter {
  const map = new Map<string, CacheEntry>();
  return {
    async keys() { return [...map.keys()]; },
    async get(sessionId) { return map.get(sessionId); },
    async set(sessionId, entry) { map.set(sessionId, entry); },
    async delete(sessionId) { map.delete(sessionId); },
  };
}

function idbAdapter(dbName = 'nop-debugger-sessions'): SessionStorageAdapter {
  return {
    async keys() {
      const db = await openDb(dbName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const request = tx.objectStore('sessions').getAllKeys();
        request.onsuccess = () => resolve(request.result.map(String));
        request.onerror = () => reject(request.error);
      });
    },
    async get(sessionId) {
      const db = await openDb(dbName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const request = tx.objectStore('sessions').get(sessionId);
        request.onsuccess = () => resolve(request.result as CacheEntry | undefined);
        request.onerror = () => reject(request.error);
      });
    },
    async set(sessionId, entry) {
      const db = await openDb(dbName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').put(entry, sessionId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async delete(sessionId) {
      const db = await openDb(dbName);
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').delete(sessionId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}

function openDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('sessions');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createSessionCache(adapter?: SessionStorageAdapter, quotaBytes: number = DEFAULT_QUOTA_BYTES): SessionCache {
  const storage = adapter ?? (typeof indexedDB !== 'undefined' ? idbAdapter() : memoryAdapter());
  const QUOTA_BYTES = quotaBytes;

  return {
    async put(sessionId, session) {
      const bytes = JSON.stringify(session).length;
      await storage.set(sessionId, { sessionId, session, bytes, lastAccess: Date.now() });
      // LRU evict while over quota
      const keys = await storage.keys();
      const entries: Array<{ key: string; entry: CacheEntry }> = [];
      for (const key of keys) {
        const entry = await storage.get(key);
        if (entry) entries.push({ key, entry });
      }
      let total = entries.reduce((sum, item) => sum + item.entry.bytes, 0);
      entries.sort((a, b) => a.entry.lastAccess - b.entry.lastAccess);
      while (total > QUOTA_BYTES && entries.length > 1) {
        const oldest = entries.shift()!;
        await storage.delete(oldest.key);
        total -= oldest.entry.bytes;
      }
    },
    async get(sessionId) {
      const entry = await storage.get(sessionId);
      if (!entry) return null;
      await storage.set(sessionId, { ...entry, lastAccess: Date.now() });
      return entry.session;
    },
    async size() {
      const keys = await storage.keys();
      return keys.length;
    },
  };
}
