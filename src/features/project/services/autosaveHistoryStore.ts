const DB_NAME = "groov2e.autosaveHistory.v1";
const STORE_NAME = "snapshots";
const TIMESTAMP_INDEX = "timestamp";
const DEFAULT_RETENTION = 5;

export interface AutosaveRecord {
  id?: number;
  timestamp: number;
  snapshot: unknown;
}

export interface AutosaveRecordMeta {
  id: number;
  timestamp: number;
}

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
      store.createIndex(TIMESTAMP_INDEX, "timestamp", { unique: false });
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function appendSnapshot(snapshot: unknown): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).add({
      timestamp: Date.now(),
      snapshot,
    } satisfies AutosaveRecord);
    req.onsuccess = () => resolve(req.result as number);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
  });
}

export async function listSnapshots(): Promise<AutosaveRecordMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index(TIMESTAMP_INDEX);
    const results: AutosaveRecordMeta[] = [];
    const req = index.openCursor(null, "prev");
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(results);
        return;
      }
      const value = cursor.value as AutosaveRecord;
      if (typeof value.id === "number") {
        results.push({ id: value.id, timestamp: value.timestamp });
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadSnapshot(id: number): Promise<unknown | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      const record = req.result as AutosaveRecord | undefined;
      resolve(record?.snapshot ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function pruneOldest(keep = DEFAULT_RETENTION): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const index = tx.objectStore(STORE_NAME).index(TIMESTAMP_INDEX);
    const req = index.openCursor(null, "prev");
    let seen = 0;
    let deleted = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(deleted);
        return;
      }
      seen += 1;
      if (seen > keep) {
        cursor.delete();
        deleted += 1;
      }
      cursor.continue();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export const AUTOSAVE_RETENTION = DEFAULT_RETENTION;
