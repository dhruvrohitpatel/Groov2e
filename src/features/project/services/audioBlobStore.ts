// IndexedDB-backed store for recorded/imported audio blobs so they survive
// page refreshes. Keys are `<projectId>:<clipId>`; the `projectId` index
// supports bulk delete when a project is removed.

const DB_NAME = "groovy.v2.audio";
const DB_VERSION = 1;
const STORE = "blobs";

interface BlobRecord {
  key: string;
  projectId: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("by_project", "projectId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    });
  }
  return dbPromise;
}

function projectIdFromKey(key: string): string {
  const idx = key.indexOf(":");
  return idx === -1 ? "" : key.slice(0, idx);
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const maybe = fn(store);
    let result: T | undefined;
    if (maybe instanceof Promise) {
      maybe.then((value) => {
        result = value;
      }, reject);
    } else {
      maybe.onsuccess = () => {
        result = maybe.result;
      };
      maybe.onerror = () => reject(maybe.error);
    }
    tx.oncomplete = () => resolve(result as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const audioBlobStore = {
  async putBlob(key: string, blob: Blob, mimeType: string): Promise<void> {
    const record: BlobRecord = {
      key,
      projectId: projectIdFromKey(key),
      blob,
      mimeType,
      sizeBytes: blob.size,
      createdAt: Date.now(),
    };
    await runTransaction<IDBValidKey>("readwrite", (store) => store.put(record));
  },

  async getBlob(key: string): Promise<Blob | null> {
    const record = await runTransaction<BlobRecord | undefined>(
      "readonly",
      (store) => store.get(key) as IDBRequest<BlobRecord | undefined>,
    );
    return record?.blob ?? null;
  },

  async deleteBlob(key: string): Promise<void> {
    await runTransaction<undefined>("readwrite", (store) => store.delete(key));
  },

  async deleteByProject(projectId: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const index = store.index("by_project");
      const cursorReq = index.openCursor(IDBKeyRange.only(projectId));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async listKeys(projectId?: string): Promise<string[]> {
    const db = await openDb();
    return new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = projectId
        ? store.index("by_project").getAllKeys(IDBKeyRange.only(projectId))
        : store.getAllKeys();
      req.onsuccess = () => resolve((req.result as IDBValidKey[]).map((k) => String(k)));
      req.onerror = () => reject(req.error);
    });
  },

  async estimateQuota(): Promise<{ usage: number; quota: number } | null> {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
    const result = await navigator.storage.estimate();
    return { usage: result.usage ?? 0, quota: result.quota ?? 0 };
  },
};

export function buildAudioKey(projectId: string, clipId: string): string {
  return `${projectId}:${clipId}`;
}

export function isIdbUrl(filePath: string | null | undefined): boolean {
  return typeof filePath === "string" && filePath.startsWith("idb://");
}

export function keyFromIdbUrl(filePath: string): string {
  return filePath.slice("idb://".length);
}
