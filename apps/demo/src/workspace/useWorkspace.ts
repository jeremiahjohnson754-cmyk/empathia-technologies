/** React access to the demonstration workspace: one state, every page; a mutation returns the refusal to show, or null. */
import { useCallback, useEffect, useState } from 'react';
import { load, save, reset, type Workspace, type Refusal } from './store.js';

export function useWorkspace() {
  const [w, setW] = useState<Workspace>(() => load());
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  // Another tab changed the workspace: read it again, so the next change here is made on what is true now and does not undo theirs
  // (a meeting confirmed in one tab must be seen by a confirmation in the other). The browser fires `storage` only in other tabs.
  useEffect(() => { const on = (e: StorageEvent) => { if (e.key === null || e.key === 'empathia.demo.workspace.v1') setW(load()); }; window.addEventListener('storage', on); return () => window.removeEventListener('storage', on); }, []);
  /** Run a mutation on a copy; persist and re-render; surface a refusal. Returns true when it was applied. */
  const apply = useCallback(<T,>(fn: (w: Workspace) => T): T => {
    const next = structuredClone(w); const r = fn(next);
    const refused = r && typeof r === 'object' && 'why' in (r as object) && Array.isArray((r as { why?: unknown }).why);
    setRefusal(refused ? (r as unknown as Refusal) : null);
    save(next); setW(next);
    return r;
  }, [w]);
  const doReset = useCallback(() => { const n = reset(); setRefusal(null); setW(n); }, []);
  return { w, apply, refusal, clearRefusal: () => setRefusal(null), reset: doReset };
}
export const isRefusal = (r: unknown): r is Refusal => !!r && typeof r === 'object' && Array.isArray((r as { why?: unknown }).why);
