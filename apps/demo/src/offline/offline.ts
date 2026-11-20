/**
 * Offline use, page side. One small store:
 *   - whether the browser is connected (navigator.onLine and its events — a hint, not proof: a captive portal still says "online");
 *   - whether the app is saved on this device (the worker in dist/sw.js, written by build.offline.mjs), and which build;
 *   - the visitor's choice (kept in localStorage): 'on', 'off', or unset, which means "save unless the browser asks sites to save data".
 * And the packs: optional data a visitor may keep (SIGNAL seasons, the library, narration). The page writes packs into the same cache
 * the worker reads ('ed-data-v1'), so keeping a pack needs no message protocol.
 *
 * Nothing here ever reports a failure to the console: a blocked or unsupported worker is a state the page shows in words.
 */
export type Phase = 'unsupported' | 'off' | 'saving' | 'ready' | 'failed';
export interface OfflineState { phase: Phase; online: boolean; version: string | null; files: number; why: string }
export interface Pack { id: string; kind: 'story' | 'library' | 'media'; label: string; files: string[]; bytes: number; sharedBytes: number; chapters?: number }
export type Kept = 'kept' | 'part' | 'none';

const PREF = 'empathia.demo.offline';
const DATA = 'ed-data-v1';
const pref = (): 'on' | 'off' | null => { try { const v = localStorage.getItem(PREF); return v === 'on' || v === 'off' ? v : null; } catch { return null; } };
const setPref = (v: 'on' | 'off') => { try { localStorage.setItem(PREF, v); } catch { /* the choice lasts for this visit only */ } };
const abs = (p: string) => new URL(p, document.baseURI).href;
const savesData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

let state: OfflineState = { phase: 'off', online: typeof navigator === 'undefined' ? true : navigator.onLine, version: null, files: 0, why: '' };
const subs = new Set<() => void>();
const set = (patch: Partial<OfflineState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
export const offlineState = () => state;
export const subscribeOffline = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

const supported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined' && window.isSecureContext;

/** Ask the controlling worker which build it holds. */
function askVersion(sw: ServiceWorker): Promise<{ version: string; files: number } | null> {
  return new Promise((ok) => {
    const ch = new MessageChannel(); const t = setTimeout(() => ok(null), 2000);
    ch.port1.onmessage = (e: MessageEvent) => { clearTimeout(t); ok(e.data && typeof e.data.version === 'string' ? { version: e.data.version, files: Number(e.data.files) || 0 } : null); };
    try { sw.postMessage({ type: 'version' }, [ch.port2]); } catch { clearTimeout(t); ok(null); }
  });
}

async function register(): Promise<void> {
  set({ phase: 'saving', why: '' });
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    if (!reg) { set({ phase: 'failed', why: 'This browser did not allow the app to be saved (a privacy setting or a managed policy can do that).' }); return; }
    const settle = async () => {
      const sw = reg.active; if (!sw) return;
      const v = await askVersion(sw);
      set({ phase: 'ready', version: v?.version ?? null, files: v?.files ?? 0, why: '' });
    };
    const watch = (sw: ServiceWorker | null) => { if (!sw) return; sw.addEventListener('statechange', () => { if (sw.state === 'activated') void settle(); if (sw.state === 'redundant' && !reg.active) set({ phase: 'failed', why: 'Saving the app did not finish: a file could not be fetched. It is tried again the next time this page loads with a connection.' }); }); };
    if (reg.active && !reg.installing) await settle();
    watch(reg.installing); watch(reg.waiting);
    reg.addEventListener('updatefound', () => watch(reg.installing));
  } catch (e) {
    set({ phase: 'failed', why: navigator.onLine ? `The app could not be saved on this device (${e instanceof Error ? e.message : 'the browser refused'}).` : 'The app could not be saved while offline. It is tried again when this page loads with a connection.' });
  }
}

let started = false;
/** Called once when the app mounts. */
export function startOffline(): void {
  if (started || typeof window === 'undefined') return; started = true;
  window.addEventListener('online', () => set({ online: true }));
  window.addEventListener('offline', () => set({ online: false }));
  if (!supported()) { set({ phase: 'unsupported', why: 'This browser cannot save the app for offline use (it needs service workers and a secure address).' }); return; }
  const p = pref();
  if (p === 'off') { set({ phase: 'off', why: 'Saving is turned off on this device.' }); return; }
  if (p !== 'on' && savesData()) { set({ phase: 'off', why: 'Your browser asks sites to use less data, so the app was not saved without asking.' }); return; }
  // after first paint: saving the app must never compete with showing the page
  const go = () => { void register(); };
  if (document.readyState === 'complete') setTimeout(go, 0); else window.addEventListener('load', go, { once: true });
}
/** The visitor asked to save the app (also the answer to "use less data"). */
export async function turnOn(): Promise<void> { setPref('on'); if (supported()) await register(); }
/** The visitor asked to remove everything saved for offline use: the worker and every cache it reads. */
export async function turnOff(): Promise<void> {
  setPref('off');
  try {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) if (k.startsWith('ed-')) await caches.delete(k);
  } catch { /* nothing was saved, or the browser already removed it */ }
  set({ phase: 'off', version: null, files: 0, why: 'Saving is turned off on this device.' });
}

// ---------------------------------------------------------------------------------------------------------------- packs
let packsOnce: Promise<Pack[]> | null = null;
export const loadPacks = (): Promise<Pack[]> => (packsOnce ||= fetch('offline-packs.json').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ packs: Pack[] }>; }).then((j) => j.packs).catch((e) => { packsOnce = null; throw e; }));

export async function keptState(pack: Pack): Promise<Kept> {
  if (!(await caches.has(DATA))) return 'none';   // asking must not create the store: "nothing saved" stays literally true
  const c = await caches.open(DATA); let n = 0;
  for (const f of pack.files) if (await c.match(abs(f))) n += 1;
  return n === pack.files.length ? 'kept' : n === 0 ? 'none' : 'part';
}
/** Fetch every file of the pack that is not already saved. Nothing partial is ever written for a file: a response that is not 200 is not kept. */
export async function keepPack(pack: Pack, onProgress: (done: number, total: number) => void): Promise<{ failed: string[] }> {
  const c = await caches.open(DATA); const failed: string[] = []; let done = 0; const todo = [...pack.files];
  try { await navigator.storage?.persist?.(); } catch { /* the browser decides; the page says which */ }
  const one = async () => {
    for (let f = todo.shift(); f; f = todo.shift()) {
      try {
        if (!(await c.match(abs(f)))) { const r = await fetch(abs(f), { cache: 'no-cache' }); if (r.status !== 200) throw new Error(String(r.status)); await c.put(abs(f), r); }
      } catch { failed.push(f); }
      done += 1; onProgress(done, pack.files.length);
    }
  };
  await Promise.all([one(), one(), one(), one()]);
  return { failed };
}
/** Remove a pack's files, except the ones another kept pack still needs. */
export async function dropPack(pack: Pack, all: Pack[]): Promise<void> {
  if (!(await caches.has(DATA))) return;
  const c = await caches.open(DATA); const needed = new Set<string>();
  for (const other of all) if (other.id !== pack.id && (await keptState(other)) === 'kept') other.files.forEach((f) => needed.add(f));
  for (const f of pack.files) if (!needed.has(f)) await c.delete(abs(f));
}
export async function storage(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  try { const e = await navigator.storage.estimate(); return { usage: e.usage || 0, quota: e.quota || 0, persisted: await navigator.storage.persisted() }; } catch { return null; }
}
export const mib = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
