/**
 * The working record of the Atlas 4.218 dossier in this browser: the events recorded after the reference snapshot. The snapshot itself
 * is a constant of @empathia/proof-registry and is never written. Stored state is treated as untrusted: only well-formed events are
 * read back, and replay() decides what they amount to (a hand-edited "ACCEPT" or "COUNTERSIGN" accepts nothing while a blocker stands,
 * out of order, from one role twice, or from a role that did the work; a hand-edited "WAIVE" covers nothing it could not have been
 * granted for, and nothing past its date).
 */
import { useCallback, useEffect, useState } from 'react';
import { DOSSIER_4218, attempt, replay, type DossierEvent, type Authority, type Working } from '@empathia/proof-registry';

const KEY = 'empathia.demo.dossier.v1';
const EVT = 'empathia:dossier';
const isActor = (a: unknown): boolean => !!a && typeof a === 'object' && typeof (a as { role?: unknown }).role === 'string' && typeof (a as { label?: unknown }).label === 'string' && (a as { role: string }).role.length <= 20 && (a as { label: string }).label.length <= 60;
const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
function wellFormed(e: unknown): e is DossierEvent {
  if (!e || typeof e !== 'object') return false; const x = e as Record<string, unknown>;
  if (!isActor(x['by']) || !str(x['at'], 40) || Number.isNaN(Date.parse(x['at'] as string))) return false;
  if (x['kind'] === 'ACCEPT' || x['kind'] === 'COUNTERSIGN') return x['waivers'] === undefined || (Number.isInteger(x['waivers']) && (x['waivers'] as number) >= 0 && (x['waivers'] as number) <= 40);
  if (x['kind'] === 'ATTEST') return str(x['statement'], 400);
  if (!str(x['test'], 20) || !/^T-SIM-\d{3}$/.test(x['test'] as string)) return false;
  if (x['kind'] === 'RETEST') return (x['result'] === 'PASS' || x['result'] === 'FAIL') && (x['evidence'] === null || str(x['evidence'], 40));
  if (x['kind'] === 'EVIDENCE') return str(x['evidence'], 40);
  if (x['kind'] === 'VERIFY') return true;
  if (x['kind'] === 'WAIVE') return str(x['reason'], 600) && str(x['basis'], 200) && str(x['owner'], 60) && str(x['plan'], 400) && str(x['expires'], 10) && /^\d{4}-\d{2}-\d{2}$/.test(x['expires'] as string);
  if (x['kind'] === 'RAISE') return str(x['id'], 20) && str(x['statement'], 400);
  return false;
}
export function loadEvents(): DossierEvent[] {
  try { const s = localStorage.getItem(KEY); if (!s) return []; const a: unknown = JSON.parse(s); return Array.isArray(a) ? a.filter(wellFormed).slice(0, 200) : []; } catch { return []; }
}
function saveEvents(ev: DossierEvent[]): void {
  try { if (ev.length) localStorage.setItem(KEY, JSON.stringify(ev)); else localStorage.removeItem(KEY); } catch { /* the record lasts the page */ }
  try { window.dispatchEvent(new Event(EVT)); } catch { /* no listeners */ }
}

export interface DossierStore { events: DossierEvent[]; working: Working; act: (e: DossierEvent, may: Authority) => string | null; reset: () => void }
/** The working dossier and the one way to change it. `act` returns the refusal, or null when the step was recorded. */
export function useDossier(): DossierStore {
  const [events, setEvents] = useState<DossierEvent[]>(loadEvents);
  useEffect(() => { const on = () => setEvents(loadEvents()); window.addEventListener(EVT, on); window.addEventListener('storage', on); return () => { window.removeEventListener(EVT, on); window.removeEventListener('storage', on); }; }, []);
  const act = useCallback((e: DossierEvent, may: Authority): string | null => {
    const r = attempt(DOSSIER_4218, loadEvents(), e, may); if ('refused' in r) return r.refused;
    saveEvents(r.events); setEvents(r.events); return null;
  }, []);
  const reset = useCallback(() => { saveEvents([]); setEvents([]); }, []);
  return { events, working: replay(DOSSIER_4218, events, nowIso()), act, reset };   // read as of now: a waiver is dated
}

/** The demonstration clock for new events: real time, since these are things the visitor does now. */
export const nowIso = (): string => new Date().toISOString();
