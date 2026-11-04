/**
 * The shared demonstration workspace for the operational pages. Every mutation runs on a copy of the LATEST committed state (a ref, not
 * the render's closure), so a rapid double-tap applies the second action to the result of the first — which the rules then refuse —
 * instead of applying the same action twice. Snapshot restore backs Undo. Another tab's changes arrive through the storage event.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as S from '../workspace/store.js';
import { personaOf, type WX } from './kit.js';

const KEY = 'empathia.demo.workspace.v1';
const isRef = (r: unknown): r is S.Refusal => !!r && typeof r === 'object' && Array.isArray((r as { why?: unknown }).why);

export function useOps(perspective: string) {
  const [w, setW] = useState<WX>(() => S.load() as WX);
  const cur = useRef<WX>(w);
  const [refusal, setRefusal] = useState<S.Refusal | null>(null);
  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === KEY) { const n = S.load() as WX; cur.current = n; setW(n); } };
    addEventListener('storage', on); return () => removeEventListener('storage', on);
  }, []);
  const commit = (n: WX) => { cur.current = n; S.save(n); setW(n); };
  const apply = useCallback(<T,>(fn: (w: WX) => T): T => {
    const next = structuredClone(cur.current); const r = fn(next);
    setRefusal(isRef(r) ? r : null); commit(next); return r;
  }, []);
  const replace = (snap: WX) => { setRefusal(null); commit(structuredClone(snap)); };
  return {
    w, apply, refusal, clearRefusal: () => setRefusal(null), persona: personaOf(perspective),
    snapshot: () => structuredClone(cur.current),
    restore: replace,
    /** Reset to the seed (the caller safeguards it), returning the previous state for Undo. */
    resetAll: () => { const prev = structuredClone(cur.current); replace(S.seed() as WX); return prev; },
  };
}
