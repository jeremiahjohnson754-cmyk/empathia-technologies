/**
 * The Phase 5 tracker's own record in this browser: the events a role has added after the seeded history, and the field captures that
 * have been synchronised. Both are read back as untrusted: an event that is not the shape of an event is discarded here, and one the
 * rules refuse is dropped by the engine's replay under the authority of the role it names.
 *
 * The dossier reads this (proof/store.ts): a required document that is not complete stops acceptance.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DOSSIER_4218 as D, attemptDoc, replay, replayDocs, wellFormedDocEvent, type Actor, type Blocker, type DocContext, type DocEvent, type DocsWorking, type Working } from '@empathia/proof-registry';
import { contextOf, docPolicy, trackedSet } from './model.js';
import { EVT as DOSSIER_EVT, loadEvents as dossierEvents } from '../proof/store.js';

const KEY = 'empathia.demo.docs5.v1'; const CAP_KEY = 'empathia.demo.docs5.captures.v1'; const DOSSIER_KEY = 'empathia.demo.dossier.v1';
/** fired in this tab when the tracker changes, so the dossier on the same page reads its blockers again */
export const DOCS_EVT = 'empathia:docs5';
const tell = () => { try { window.dispatchEvent(new Event(DOCS_EVT)); } catch { /* no listeners */ } };
export const nowIso = () => new Date().toISOString();

export function loadDocEvents(): DocEvent[] {
  try { const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown; return Array.isArray(raw) ? raw.filter(wellFormedDocEvent).slice(0, 400) : []; } catch { return []; }
}
const saveDocEvents = (e: DocEvent[]) => { try { localStorage.setItem(KEY, JSON.stringify(e)); } catch { /* storage unavailable: the steps last this visit */ } tell(); };

/** A measurement as it was read: nothing here is ever filled in for the person. */
export interface Measurement { quantity: string; value: number; unit: string; instrument: string; method: string }
/** A field capture after it was synchronised. The photograph itself stays in this browser's own store, under `key`. */
export interface Capture { key: string; target: { kind: 'test' | 'doc'; id: string }; note: string; measurements: Measurement[]; photo: { name: string; bytes: number; sha256: string; annotated: boolean } | null; by: Actor; at: string }
const text = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max;
export function wellFormedCapture(c: unknown): c is Capture {
  if (!c || typeof c !== 'object') return false; const x = c as Capture;
  return /^CAP-[A-Z0-9]{6,12}$/.test(String(x.key)) && !!x.target && (x.target.kind === 'test' || x.target.kind === 'doc') && text(x.target.id, 2, 40) && typeof x.note === 'string' && x.note.length <= 600
    && Array.isArray(x.measurements) && x.measurements.length <= 12 && x.measurements.every((m) => !!m && text(m.quantity, 2, 60) && typeof m.value === 'number' && Number.isFinite(m.value) && text(m.unit, 1, 16) && text(m.instrument, 2, 80) && text(m.method, 2, 120))
    && (x.photo === null || (!!x.photo && text(x.photo.name, 1, 160) && Number.isInteger(x.photo.bytes) && x.photo.bytes > 0 && /^[0-9a-f]{64}$/.test(String(x.photo.sha256)) && typeof x.photo.annotated === 'boolean'))
    && !!x.by && /^[a-z]{2,12}$/.test(String(x.by.role)) && text(x.by.label, 2, 60) && typeof x.at === 'string' && !Number.isNaN(Date.parse(x.at)) && (x.note.trim().length > 0 || x.measurements.length > 0 || x.photo !== null);
}
export function loadCaptures(): Capture[] {
  try { const raw = JSON.parse(localStorage.getItem(CAP_KEY) || '[]') as unknown; if (!Array.isArray(raw)) return []; const seen = new Set<string>(); return raw.filter(wellFormedCapture).filter((c) => !seen.has(c.key) && !!seen.add(c.key)).slice(0, 60); } catch { return []; }
}
/** Commit a capture exactly once: a second synchronisation of the same draft, here or in another tab, adds nothing. */
export function commitCapture(c: Capture): 'added' | 'already' | 'refused' {
  if (!wellFormedCapture(c)) return 'refused'; const all = loadCaptures(); if (all.some((x) => x.key === c.key)) return 'already';
  try { localStorage.setItem(CAP_KEY, JSON.stringify([...all, c])); } catch { return 'refused'; } return 'added';
}

/** The room's record for the rules, as it stands with the dossier's tests replayed (without the documents: the tests do not depend on them). */
export function docContext(dossier?: Working): DocContext | null { const t = trackedSet(); return t ? contextOf(t.record, dossier ?? replay(D, dossierEvents())) : null; }
/** Read the tracker. */
export function readDocs(events: readonly DocEvent[] = loadDocEvents(), dossier?: Working, asOf: string = nowIso(), until?: string): DocsWorking | null {
  const t = trackedSet(); const ctx = docContext(dossier); if (!t || !ctx) return null;
  return replayDocs(t.set, events, ctx, docPolicy, asOf, until ? { until } : {});
}
/** For the dossier: the documents that stop acceptance, as they stood at a moment. The dossier passes its own tests so nothing is read twice. */
export const docBlockersFor = (dossier: Working) => (at: string): readonly Blocker[] => readDocs(loadDocEvents(), dossier, at, at)?.blockers ?? [];

export function useDocs() {
  const [events, setEvents] = useState<DocEvent[]>(() => loadDocEvents()); const [captures, setCaptures] = useState<Capture[]>(() => loadCaptures()); const [tick, setTick] = useState(0);
  // another tab, or the dossier in this one, changed what the rules read: read it again
  useEffect(() => { const on = (e: StorageEvent) => { if (e.key === null || e.key === KEY || e.key === CAP_KEY || e.key === DOSSIER_KEY) { setEvents(loadDocEvents()); setCaptures(loadCaptures()); setTick((n) => n + 1); } }; const local = () => setTick((n) => n + 1); window.addEventListener('storage', on); window.addEventListener(DOSSIER_EVT, local); return () => { window.removeEventListener('storage', on); window.removeEventListener(DOSSIER_EVT, local); }; }, []);
  const dossier = useMemo(() => replay(D, dossierEvents(), nowIso()), [tick, events]);                                   // eslint-disable-line react-hooks/exhaustive-deps
  const ctx = useMemo(() => docContext(dossier), [dossier]);
  const working = useMemo(() => readDocs(events, dossier), [events, dossier]);
  /** Try a step. Returns why it was refused, or null. The record is read again first, so a step taken in another tab is not undone. */
  const act = useCallback((e: DocEvent): string | null => {
    const t = trackedSet(); const c = docContext(); if (!t || !c) return 'The room’s record could not be read.';
    const fresh = loadDocEvents(); const r = attemptDoc(t.set, fresh, e, c, docPolicy);
    if ('refused' in r) { setEvents(fresh); return r.refused; }
    saveDocEvents(r.events); setEvents(r.events); return null;
  }, []);
  const sync = useCallback((c: Capture) => { const r = commitCapture(c); setCaptures(loadCaptures()); return r; }, []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); localStorage.removeItem(CAP_KEY); } catch { /* nothing stored */ } setEvents([]); setCaptures([]); tell(); }, []);
  const refresh = useCallback(() => { setEvents(loadDocEvents()); setCaptures(loadCaptures()); setTick((n) => n + 1); }, []);
  return { events, working, dossier, ctx, captures, act, sync, reset, refresh };
}
