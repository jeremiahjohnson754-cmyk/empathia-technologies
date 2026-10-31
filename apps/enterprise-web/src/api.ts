/**
 * Data layer: one EmpathiaClient for the app and two small hooks with a shared cache — useQuery (load, cache by key, refetch on
 * invalidate) and useMutation (run, then invalidate the keys it affects). It is the minimal equivalent of React Query for an offline
 * build; a team with registry access can swap it for @tanstack/react-query without touching the pages' call sites much.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { EmpathiaClient, ApiProblem } from '@empathia/api-client';
import { reportApiProblem } from './telemetry.js';

// The API origin is fixed at build time (EMPATHIA_API_BASE) or by the deployment (window.EMPATHIA_API set by the server's index.html);
// a ?api= override exists only in development builds (red-team RT-05: a phishing link must not be able to redirect sign-in and tokens).
declare const EMPATHIA_DEV_BUILD: boolean;
const devOverride = typeof EMPATHIA_DEV_BUILD !== 'undefined' && EMPATHIA_DEV_BUILD ? new URLSearchParams(location.search).get('api') : null;
const metaApi = (document.querySelector('meta[name="empathia-api"]') as HTMLMetaElement | null)?.content || null;   // written by the serving process from its --api / API_URL
export const API_BASE = devOverride || metaApi || (window as unknown as { EMPATHIA_API?: string }).EMPATHIA_API || 'http://127.0.0.1:4100';
const STORE = 'empathia.enterprise-web.session';

function saved(): string | null { try { return sessionStorage.getItem(STORE); } catch { return null; } }
export const api = new EmpathiaClient({ baseUrl: API_BASE, token: saved(), onUnauthenticated: () => session.clear() });

// ------------------------------------------------------------------------------------------------ session (token only; the principal comes from /v1/me)
type Listener = () => void;
const listeners = new Set<Listener>();
export const session = {
  get token() { return api.token; },
  set(token: string) { api.token = token; try { sessionStorage.setItem(STORE, token); } catch { /* storage unavailable */ } cache.clear(); listeners.forEach((l) => l()); },
  clear() { api.signOut(); try { sessionStorage.removeItem(STORE); } catch { /* */ } cache.clear(); listeners.forEach((l) => l()); },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};
export function useToken(): string | null { return useSyncExternalStore(session.subscribe, () => api.token); }

// ------------------------------------------------------------------------------------------------ cache
interface Entry { data?: unknown; error?: ApiProblem | Error; at: number; promise?: Promise<void> }
const cache = new Map<string, Entry>();
const subs = new Map<string, Set<Listener>>();
const notify = (k: string) => subs.get(k)?.forEach((l) => l());
export function invalidate(prefix: string) { for (const k of [...cache.keys()]) if (k.startsWith(prefix)) { cache.delete(k); notify(k); } }

export interface Query<T> { data: T | undefined; error: (ApiProblem | Error) | undefined; loading: boolean; reload: () => void }
export function useQuery<T>(key: string | null, fn: () => Promise<T>): Query<T> {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!key) return;
    const set = subs.get(key) || new Set(); subs.set(key, set);
    const l = () => bump((n) => n + 1); set.add(l);
    return () => { set.delete(l); };
  }, [key]);
  const e = key ? cache.get(key) : undefined;
  useEffect(() => {
    if (!key || (e && (e.data !== undefined || e.error || e.promise))) return;
    const entry: Entry = { at: Date.now() };
    entry.promise = fn().then((d) => { entry.data = d; }, (err: unknown) => { entry.error = err as Error; reportApiProblem(err, `query ${key}`); }).finally(() => { entry.promise = undefined; notify(key); });
    cache.set(key, entry);
  });
  return { data: e?.data as T | undefined, error: e?.error, loading: !!key && (!e || !!e.promise), reload: () => key && invalidate(key) };
}

export interface Mutation<A, R> { run: (a: A) => Promise<R | undefined>; busy: boolean; error: ApiProblem | Error | undefined; reset: () => void }
export function useMutation<A, R>(fn: (a: A) => Promise<R>, affects: string[] = []): Mutation<A, R> {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiProblem | Error | undefined>(undefined);
  return {
    busy, error, reset: () => setError(undefined),
    run: async (a: A) => {
      setBusy(true); setError(undefined);
      try { const r = await fn(a); affects.forEach(invalidate); return r; }
      catch (e) { setError(e as Error); reportApiProblem(e, 'mutation'); return undefined; }
      finally { setBusy(false); }
    },
  };
}

export const newKey = () => `web-${crypto.randomUUID()}`;
