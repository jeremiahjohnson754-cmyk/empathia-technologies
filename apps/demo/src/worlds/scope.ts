/**
 * Scoped state for the worlds (v1.8 §3.2, V18-JOURNEY-06/07): everything a screen holds for one context — a search query, an open
 * panel, a selection, a draft — belongs to that context and is reset BEFORE another context renders. A context is the world, the
 * role configuration and the View-as role together.
 *
 *   - `enterContext(key)` is called synchronously while the new context's host renders, before any of its children: every registered
 *     store is reset and the epoch advances.
 *   - `scopedStore(initial)` is a tiny store that registers its own reset.
 *   - `current(epoch)` answers whether work started in an earlier context may still paint: a chunk or a timer that resolves after a
 *     switch is dropped (late work fails closed).
 * Nothing here is persisted: a world or role choice lives in the address only.
 */
type Reset = () => void;
const resets = new Set<Reset>();
let key = '';
let epoch = 0;

export const registerScoped = (reset: Reset): (() => void) => { resets.add(reset); return () => { resets.delete(reset); }; };
/** Enter a context. Returns true when it is a different one (every scoped store has then been reset). Idempotent for the same key. */
export function enterContext(next: string): boolean {
  if (next === key) return false;
  for (const r of [...resets]) r();
  key = next; epoch += 1;
  return true;
}
export const contextKey = (): string => key;
export const contextEpoch = (): number => epoch;
/** May work that started at `started` still paint? */
export const current = (started: number): boolean => started === epoch;
export const contextOf = (world: string, config: string, role: string): string => `${world}|${config}|${role}`;

export interface Scoped<T> { get: () => T; set: (v: T | ((p: T) => T)) => void; subscribe: (f: () => void) => () => void; reset: Reset }
/** A store whose value is dropped whenever the context changes. */
export function scopedStore<T>(initial: () => T): Scoped<T> {
  let v = initial(); const subs = new Set<() => void>();
  const tell = () => { for (const f of [...subs]) f(); };
  const s: Scoped<T> = {
    get: () => v,
    set: (n) => { v = typeof n === 'function' ? (n as (p: T) => T)(v) : n; tell(); },
    subscribe: (f) => { subs.add(f); return () => { subs.delete(f); }; },
    reset: () => { v = initial(); tell(); },
  };
  registerScoped(s.reset);
  return s;
}
