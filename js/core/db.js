// Low-level IndexedDB access. Nothing outside js/core/dataProvider.js and
// js/core/indexedDbProvider.js should import this module directly — the rest
// of the app talks to Repositories, which talk to the DataProvider interface.
// This keeps IndexedDB swappable for a SupabaseProvider later (see
// docs/MIGRATION_TO_SUPABASE.md) without touching a single module.

export const DB_NAME = 'dielly_os';
export const SCHEMA_VERSION = 1;

const STORE_DEFS = [
  {
    name: 'users',
    keyPath: 'id',
    indexes: [
      { name: 'username', keyPath: 'username', unique: true },
      { name: 'email', keyPath: 'email', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
    ],
  },
  {
    name: 'audit_log',
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'userId', keyPath: 'userId', unique: false },
      { name: 'action', keyPath: 'action', unique: false },
    ],
  },
  {
    name: 'notifications',
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
      { name: 'module', keyPath: 'module', unique: false },
    ],
  },
  {
    name: 'tasks',
    keyPath: 'id',
    indexes: [
      { name: 'module', keyPath: 'module', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'owner', keyPath: 'owner', unique: false },
      { name: 'dueDate', keyPath: 'dueDate', unique: false },
      { name: 'deletedAt', keyPath: 'deletedAt', unique: false },
    ],
  },
  {
    // Generic polymorphic store for the majority of domain entities
    // (family, church, finance, hobbies, health, work, career, jobs,
    // english, studies, personal CRM, decisions, pains, ideas, memories,
    // projects, goals...). `entityType` discriminates the logical
    // collection (e.g. 'family.child', 'finance.transaction').
    name: 'records',
    keyPath: 'id',
    indexes: [
      { name: 'entityType', keyPath: 'entityType', unique: false },
      { name: 'ownerId', keyPath: 'ownerId', unique: false },
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
      { name: 'deletedAt', keyPath: 'deletedAt', unique: false },
      { name: 'visibility', keyPath: 'visibility', unique: false },
    ],
  },
  {
    name: 'connectors_meta',
    keyPath: 'id',
    indexes: [],
  },
  {
    name: 'settings',
    keyPath: 'id',
    indexes: [],
  },
  {
    name: 'permissions_overrides',
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId', unique: false },
      { name: 'module', keyPath: 'module', unique: false },
    ],
  },
];

let dbPromise = null;

export function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      for (const def of STORE_DEFS) {
        let store;
        if (!db.objectStoreNames.contains(def.name)) {
          store = db.createObjectStore(def.name, { keyPath: def.keyPath });
        } else {
          store = req.transaction.objectStore(def.name);
        }
        for (const idx of def.indexes) {
          if (!store.indexNames.contains(idx.name)) {
            store.createIndex(idx.name, idx.keyPath, { unique: !!idx.unique });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another open tab.'));
  });
  return dbPromise;
}

export function storeNames() {
  return STORE_DEFS.map((d) => d.name);
}

function tx(db, storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function dbPut(storeName, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, 'readwrite').put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(storeName, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, 'readonly').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, 'readwrite').delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAllByIndex(storeName, indexName, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const store = tx(db, storeName, 'readonly');
    const idx = store.index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearStore(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, 'readwrite').clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function dbCount(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, 'readonly').count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

export async function estimateStorage() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      return await navigator.storage.estimate();
    } catch {
      return null;
    }
  }
  return null;
}
