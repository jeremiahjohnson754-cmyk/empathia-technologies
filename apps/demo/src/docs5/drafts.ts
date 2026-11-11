/**
 * Field-capture drafts, kept on the device so a capture made in a room with no signal is not lost: IndexedDB, with the photograph as a
 * small image inside the draft. If IndexedDB is not available the drafts last for the visit and the page says so.
 * A draft is never sent anywhere. Synchronising writes its facts (not the photograph) into the tracker's record, once.
 */
export interface Mark { kind: 'arrow' | 'box' | 'label'; x1: number; y1: number; x2: number; y2: number; text?: string }
export interface DraftMeasurement { quantity: string; value: string; unit: string; instrument: string; method: string }
export interface Draft {
  key: string; target: string; frame: string; note: string; measurements: DraftMeasurement[];
  /** the photograph, scaled down, as a data URL; null when none was taken */ image: string | null; marks: Mark[];
  photo: { name: string; bytes: number; sha256: string } | null; savedAt: string; syncedAt: string | null;
}
const DB = 'empathia-docs5'; const STORE = 'drafts'; export const MAX_DRAFTS = 20; export const MAX_IMAGE_CHARS = 900_000;
const memory = new Map<string, Draft>(); let durable: boolean | null = null;

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
const shape = (d: unknown): d is Draft => !!d && typeof d === 'object' && /^CAP-[A-Z0-9]{6,12}$/.test(String((d as Draft).key)) && Array.isArray((d as Draft).measurements) && Array.isArray((d as Draft).marks) && typeof (d as Draft).note === 'string'
  && ((d as Draft).image === null || (typeof (d as Draft).image === 'string' && (d as Draft).image!.startsWith('data:image/') && (d as Draft).image!.length <= MAX_IMAGE_CHARS));

/** true when drafts survive a reload on this device */
export async function isDurable(): Promise<boolean> { if (durable === null) await run('readonly', (s) => s.count()); return durable === true; }
export async function listDrafts(): Promise<Draft[]> {
  const all = (await run<Draft[]>('readonly', (s) => s.getAll() as IDBRequest<Draft[]>)) ?? [...memory.values()];
  return all.filter(shape).sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, MAX_DRAFTS);
}
export async function saveDraft(d: Draft): Promise<boolean> {
  if (!shape(d)) return false; const all = await listDrafts(); if (!all.some((x) => x.key === d.key) && all.length >= MAX_DRAFTS) return false;
  memory.set(d.key, d); await run('readwrite', (s) => s.put(d)); return true;
}
export async function deleteDraft(key: string): Promise<void> { memory.delete(key); await run('readwrite', (s) => s.delete(key)); }
export function newKey(): string { const a = new Uint8Array(8); crypto.getRandomValues(a); const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return `CAP-${[...a].map((b) => abc[b % abc.length]).join('')}`; }
