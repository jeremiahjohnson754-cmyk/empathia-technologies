/**
 * Working a deficiency through the engine's state machine (@empathia/commissioning-engine deficiencies.ts) in the demonstration: each
 * deficiency starts from the room record's issue (an OPEN issue is OPEN; a RESOLVED one is CLOSED) and every step taken here is kept in
 * this browser and written to the workspace's audit trail. Who may take which step is the persona's authority (a view, never
 * authentication); the separation-of-duties and evidence rules are the engine's and hold for every persona, the Product Architect too.
 *
 * Whether a deficiency may be excepted is read from what it is against: anything touching safety, security, evidence or separation of
 * duties is not open to exception. Synthetic: the issues are the demonstration's seeded records.
 */
import { newDeficiency, type Deficiency, type DeficiencyAction, type DeficiencySeverity } from '@empathia/commissioning-engine';
import type { RoomRecord, Issue } from '../campus/design.js';
import { holds } from '../build/store.js';

const KEY = 'empathia.demo.deficiencies.v1';
type Store = Record<string, Deficiency>;
export const keyOf = (r: RoomRecord, i: Issue) => `${r.outline.id}:${i.id}`;
const NOT_WAIVABLE = /earth|ground|safety|fall|rig|mount|load|security|password|credential|tenant|evidence|separation/i;
export const waivableOf = (i: Issue) => !NOT_WAIVABLE.test(`${i.title} ${i.source}`);

function read(): Store { try { const s = localStorage.getItem(KEY); const d = s ? JSON.parse(s) : null; return d && typeof d === 'object' ? d as Store : {}; } catch { return {}; } }
function write(s: Store): string | null { try { localStorage.setItem(KEY, JSON.stringify(s)); return null; } catch { return 'this browser could not keep it; nothing was saved'; } }

/** the deficiency as worked so far, or as the record seeds it */
export function deficiencyOf(r: RoomRecord, i: Issue, openedAt: string): Deficiency {
  const k = keyOf(r, i); const hit = read()[k]; if (hit) return hit;
  const sev: DeficiencySeverity = i.severity === 'High' ? 'High' : i.severity === 'Low' ? 'Low' : 'Medium';
  const d = newDeficiency({ id: k, title: i.title, severity: sev, waivable: waivableOf(i), openedAt: `${openedAt.slice(0, 10)}T09:00:00.000Z`, by: 'cxeng' });
  if (i.state === 'RESOLVED') return { ...d, state: 'CLOSED', closedBy: 'cxeng', history: [...d.history, { at: d.openedAt, by: 'cxeng', from: 'OPEN', to: 'CLOSED', note: 'closed on the room record (seeded)' }] };
  return d;
}
export function save(d: Deficiency): string | null { const s = read(); s[d.id] = d; return write(s); }
export const worked = (): Deficiency[] => Object.values(read());

/** the authority a persona needs for each step (any of) */
export const STEP_AUTHORITY: Record<DeficiencyAction['kind'], string[]> = {
  start: ['deficiency.open', 'issue.assign'], fixed: ['work.evidence', 'deviation.raise'], retest: ['tests.verify.all', 'test.verify', 'test.verify.audio', 'test.verify.video', 'test.verify.control'],
  verify: ['tests.verify.all', 'baseline.approve'], except: ['baseline.approve'], defer: ['issue.assign', 'baseline.approve'], resume: ['deficiency.open', 'issue.assign'], reopen: ['service.reopen', 'deficiency.open'],
};
export const mayStep = (persona: string, k: DeficiencyAction['kind']) => STEP_AUTHORITY[k].some((a) => holds(persona, a));
export const STEP_LABEL: Record<DeficiencyAction['kind'], string> = { start: 'Start: name the owner and a target date', fixed: 'Record the fix', retest: 'Record the retest', verify: 'Verify and close', except: 'Approve an exception', defer: 'Defer', resume: 'Resume', reopen: 'Reopen' };
