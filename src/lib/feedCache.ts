import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'under-pines';
const DB_VERSION = 1;
const FEED_STORE = 'feed-cache';
const CAMPFIRE_STORE = 'campfire-cache';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(FEED_STORE)) {
          db.createObjectStore(FEED_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CAMPFIRE_STORE)) {
          db.createObjectStore(CAMPFIRE_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const cacheFeedPosts = async (posts: any[]) => {
  try {
    const db = await getDB();
    const tx = db.transaction(FEED_STORE, 'readwrite');
    await tx.store.clear();
    for (const post of posts.slice(0, 50)) {
      await tx.store.put({ ...post, _cachedAt: Date.now() });
    }
    await tx.done;
  } catch { /* IndexedDB may be unavailable */ }
};

export const getCachedFeedPosts = async (): Promise<any[]> => {
  try {
    const db = await getDB();
    return await db.getAll(FEED_STORE);
  } catch { return []; }
};

export const cacheCampfireMessages = async (campfireId: string, messages: any[]) => {
  try {
    const db = await getDB();
    const tx = db.transaction(CAMPFIRE_STORE, 'readwrite');
    for (const msg of messages.slice(0, 100)) {
      await tx.store.put({ ...msg, _campfireId: campfireId, _cachedAt: Date.now() });
    }
    await tx.done;
  } catch { /* IndexedDB may be unavailable */ }
};

export const getCachedCampfireMessages = async (campfireId: string): Promise<any[]> => {
  try {
    const db = await getDB();
    const all = await db.getAll(CAMPFIRE_STORE);
    return all.filter((m: any) => m._campfireId === campfireId);
  } catch { return []; }
};
