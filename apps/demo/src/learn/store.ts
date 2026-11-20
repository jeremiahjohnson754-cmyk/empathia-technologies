/**
 * Lab results in this browser: a passed lab is COMPETENCY EVIDENCE on the person's internal competency record ("lab-evidenced"); it is
 * never a credential and never an authorization to work (dispatch gates read only the competency record's validity, not lab results).
 * The technician perspectives are the pool's people (service = Ana Reyes, installer = Ben Okafor), so their lab evidence shows on the
 * Dispatch board's competency states. Kept under its own key; wrapped (storage may be unavailable or damaged).
 */
import * as S from '../workspace/store.js';

export interface LabResult { lab: string; title: string; domain: string; passed: boolean; at: string; persona: string; attempts: number; mode: 'simulator' | 'calculation' }
export interface LabState { v: 1; results: Record<string, LabResult> }
const KEY = 'empathia.demo.labs.v1';
export function loadLabs(): LabState { try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s) as LabState; if (d.v === 1 && d.results && typeof d.results === 'object') return d; } } catch { /* damaged or unavailable: start empty */ } return { v: 1, results: {} }; }
export function saveLabs(d: LabState) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* the results last the page */ } }
export const resultKey = (persona: string, lab: string) => `${persona}:${lab}`;

/** Which internal competency a lab's domain evidences. */
export const DOMAIN_COMPETENCY: Record<string, string> = { Audio: 'cert.audio', Video: 'cert.video', Camera: 'cert.video', Network: 'cert.network', Control: 'cert.control', Lighting: 'cert.av_field', Power: 'cert.av_field', RF: 'cert.audio' };
/** Lab evidence by technician id, for the dispatch board's competency states. */
export function labEvidence(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const r of Object.values(loadLabs().results)) { if (!r.passed) continue; const id = S.techForPersona(r.persona); const c = DOMAIN_COMPETENCY[r.domain]; if (id && c) (out[id] ||= []).includes(c) || out[id]!.push(c); }
  return out;
}
/** Record a pass (or an attempt) and write the ledger line into the shared workspace. */
export function recordLab(persona: string, r: Omit<LabResult, 'at' | 'persona' | 'attempts'>): LabState {
  const d = loadLabs(); const k = resultKey(persona, r.lab); const prev = d.results[k];
  d.results[k] = { ...r, persona, at: new Date().toISOString(), attempts: (prev?.attempts || 0) + 1, passed: r.passed || !!prev?.passed };
  saveLabs(d);
  const w = S.load(); w.events.unshift({ at: new Date().toISOString(), by: persona, type: 'training.lab_completed', aggregate: r.lab, detail: `${r.title}: ${r.passed ? 'passed' : 'attempted'} (${r.mode}) — competency evidence; never a credential or an authorization to work`, outcome: 'ALLOWED' }); S.save(w);
  return d;
}
