/**
 * Where Instant Room keeps photographs: on this device only, in the browser's own database, scaled down. Nothing is uploaded in this
 * demonstration. If the browser will not keep a database (private windows, blocked storage) the photographs last until the page is
 * closed, and the page says so. NOT BUILT: encryption of what is kept here; upload, progress and resuming an upload.
 */
export interface Kept { key: string; shot: string; image: string; at: string; bytes: number; width: number; height: number }
const DB = 'empathia-instant'; const STORE = 'photos'; export const MAX_PHOTOS = 40; export const MAX_IMAGE_CHARS = 900_000;
const memory = new Map<string, Kept>(); let durable: boolean | null = null;
const shape = (k: unknown): k is Kept => !!k && typeof k === 'object' && /^IRP-[A-Z0-9]{8}$/.test(String((k as Kept).key)) && typeof (k as Kept).shot === 'string' && typeof (k as Kept).image === 'string' && (k as Kept).image.startsWith('data:image/jpeg') && (k as Kept).image.length <= MAX_IMAGE_CHARS;

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' }); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}
function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then((db) => new Promise<T | undefined>((resolve) => {
    if (!db) { durable = false; resolve(undefined); return; }
    try { const tx = db.transaction(STORE, mode); const rq = fn(tx.objectStore(STORE)); tx.oncomplete = () => { durable = true; db.close(); resolve(rq.result); }; tx.onerror = tx.onabort = () => { db.close(); resolve(undefined); }; }
    catch { durable = false; resolve(undefined); }
  }));
}
/** true when photographs survive a reload on this device */
export async function isDurable(): Promise<boolean> { if (durable === null) await run('readonly', (s) => s.count()); return durable === true; }
export async function listPhotos(): Promise<Kept[]> { const all = await run<unknown[]>('readonly', (s) => s.getAll() as IDBRequest<unknown[]>); const list = (durable ? all || [] : [...memory.values()]).filter(shape); return list.sort((a, b) => a.at.localeCompare(b.at)); }
export async function keepPhoto(k: Kept): Promise<boolean> { if (!shape(k)) return false; memory.set(k.key, k); if ((await listPhotos()).length > MAX_PHOTOS) { memory.delete(k.key); return false; } await run('readwrite', (s) => s.put(k)); return true; }
export async function dropPhoto(key: string): Promise<void> { memory.delete(key); await run('readwrite', (s) => s.delete(key)); }
export async function dropAll(): Promise<void> { memory.clear(); await run('readwrite', (s) => s.clear()); }
export function newKey(): string { const a = new Uint8Array(8); crypto.getRandomValues(a); const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return `IRP-${[...a].map((b) => abc[b % abc.length]).join('')}`; }
