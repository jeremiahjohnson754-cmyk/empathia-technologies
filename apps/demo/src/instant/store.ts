/**
 * Instant Room's two records.
 *  - The capture in progress: kept in this browser (`empathia.demo.instant.v1`) so a person can stop, lose signal or reload and carry
 *    on. It holds what was typed and which photographs were taken; the photographs themselves are in photos.ts. Read back as
 *    untrusted: anything of the wrong shape starts a clean capture.
 *  - A proposed design: saved to the shared workspace with one ledger line. It is a PROPOSAL. It changes no room's record, no
 *    drawing and no equipment list; a designer reads it. Accepting a proposal into a room's record is NOT BUILT.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import type * as S from '../workspace/store.js';
import { deny, log, personaOf, type WX } from '../hardening/kit.js';
import { SCOPES, coverage, emptyCapture, planOf, shotById, type Capture, type Detail, type Dim, type Photo, type Place, type Scope, type Verdict } from './model.js';

/** Founder, §11: "A technician, employee, designer, or authorized field engineer should be able to use their phone to document and model a space." */
export const IR_ROLES: readonly RoleKey[] = ['service', 'employee', 'sitechamp', 'designer', 'installer', 'cxeng', 'syseng', 'architect'];
export const mayCapture = (r: RoleKey) => IR_ROLES.includes(r);
/** Who reads proposals: the people who would turn one into a design. */
export const IR_READERS: readonly RoleKey[] = ['designer', 'syseng', 'architect'];

const KEY = 'empathia.demo.instant.v1';
const VERDICTS: readonly Verdict[] = ['ok', 'blurry', 'dark', 'washed-out', 'small', 'upright']; const PLACES: readonly Place[] = ['front', 'rear', 'left', 'right', 'ceiling', 'table', 'rack']; const HOWS = ['measured', 'paced', 'estimated'];
const isDate = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));
const dim = (x: unknown): Dim | null => { const d = x as Dim | null; return d && typeof d === 'object' && typeof d.m === 'number' && d.m > 0 && d.m < 100 && HOWS.includes(d.how) ? { m: d.m, how: d.how } : null; };
/** Read a stored capture. Unknown shots, verdicts, places and categories are dropped; text is cut to length. */
export function readCapture(raw: unknown, isCategory: (c: string) => boolean): Capture | null {
  const c = raw as Capture | null; if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !(c.scope in SCOPES)) return null;
  const photos: Photo[] = (Array.isArray(c.photos) ? c.photos : []).filter((p) => p && shotById(p.shot) && /^IRP-[A-Z0-9]{8}$/.test(String(p.key)) && isDate(p.at) && p.quality && VERDICTS.includes(p.quality.verdict))
    .slice(-40).map((p) => ({ shot: p.shot, key: p.key, at: p.at, keptAnyway: p.keptAnyway === true && p.quality.verdict !== 'ok', quality: { verdict: p.quality.verdict, sharpness: Number(p.quality.sharpness) || 0, light: Number(p.quality.light) || 0, say: String(p.quality.say || '').slice(0, 200) } }));
  const details: Detail[] = (Array.isArray(c.details) ? c.details : []).filter((d) => d && typeof d.id === 'string' && isCategory(String(d.category)) && PLACES.includes(d.place)).slice(0, 40)
    .map((d) => ({ id: d.id.slice(0, 20), category: d.category, place: d.place, label: String(d.label || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 80), shot: d.shot && shotById(d.shot) ? d.shot : null }));
  return { roomId: typeof c.roomId === 'string' && /^R-[A-Z]{3}-\d-\d{3}$/.test(c.roomId) ? c.roomId : null, name: c.name.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 80), scope: c.scope as Scope, photos, details,
    width: dim(c.width), length: dim(c.length), height: dim(c.height), seats: Number.isInteger(c.seats) && (c.seats as number) > 0 && (c.seats as number) <= 2000 ? c.seats : null };
}
export function loadCapture(isCategory: (c: string) => boolean): Capture | null { try { return readCapture(JSON.parse(localStorage.getItem(KEY) || 'null'), isCategory); } catch { return null; } }
export function saveCapture(c: Capture): boolean { try { localStorage.setItem(KEY, JSON.stringify(c)); return true; } catch { return false; } }
export function clearCapture(): void { try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ } }
export const startCapture = (roomId: string | null, name: string): Capture => emptyCapture(roomId, name.trim().slice(0, 80));

export interface Proposal {
  id: string; roomId: string | null; name: string; at: string; by: RoleKey; scope: Scope; width: Dim; length: Dim; height: Dim | null; seats: number | null;
  photos: Array<{ shot: string; key: string; at: string; verdict: Verdict; keptAnyway: boolean }>; details: Detail[]; /** the layout option chosen from the study, when one was run */ option: string | null;
  assumptions: string[]; findings: string[]; basis: 'MEASURED' | 'PART-ESTIMATED'; state: 'PROPOSED';
}
type WI = WX & { ir?: { proposals: Proposal[] } };
export function proposalsOf(w: S.Workspace | null): Proposal[] {
  const list = (w as WI | null)?.ir?.proposals; if (!Array.isArray(list)) return [];
  return list.filter((p) => p && /^IR-\d{4}$/.test(String(p.id)) && typeof p.name === 'string' && isDate(p.at) && dim(p.width) && dim(p.length) && Array.isArray(p.assumptions) && Array.isArray(p.photos) && p.state === 'PROPOSED' && mayCapture(p.by)).slice(0, 50);
}
/** A proposal as one role may see it: its author's roles and the readers see it whole; nobody else sees any. */
export const proposalsFor = (role: RoleKey, w: S.Workspace | null): Proposal[] => (IR_READERS.includes(role) ? proposalsOf(w) : proposalsOf(w).filter((p) => p.by === role));

export type Refusal = { why: string[] };
/**
 * Save what was captured as a proposed design. Refused unless the capture is enough to draw (model.ts › planOf says what is
 * missing, in words). `option` is a layout the study produced, or null when no study was run. Nothing else changes.
 */
export function savePropose(w: S.Workspace, role: RoleKey, c: Capture, option: string | null, extra: { studyAssumed: string[]; findings: string[] }): Refusal | Proposal {
  const persona = personaOf(role);
  if (!mayCapture(role)) return deny(w, persona, 'instant.proposed', c.roomId || 'instant:new', [`The ${ROLES[role].label} does not capture rooms here.`]);
  if (!c.name.trim()) return { why: ['Name the space, so the proposal can be found again.'] };
  const plan = planOf(c); if ('why' in plan) return { why: plan.why };
  if (option !== null && !['A', 'B', 'C'].includes(option)) return { why: ['Choose one of the layouts the study produced, or save without one.'] };
  const wi = w as WI; const list = (wi.ir ||= { proposals: [] }).proposals = proposalsOf(w); if (list.length >= 50) return { why: ['Fifty proposals are already saved. Ask a designer to clear some.'] };
  const cov = coverage(c);
  const p: Proposal = { id: `IR-${String(list.length + 1).padStart(4, '0')}`, roomId: c.roomId, name: c.name.trim(), at: new Date().toISOString(), by: role, scope: c.scope, width: c.width!, length: c.length!, height: c.height, seats: c.seats,
    photos: cov.shots.filter((s) => s.photo).map((s) => ({ shot: s.shot.id, key: s.photo!.key, at: s.photo!.at, verdict: s.photo!.quality.verdict, keptAnyway: s.photo!.keptAnyway })), details: c.details, option,
    assumptions: [...plan.ok.assumptions, ...(option ? extra.studyAssumed : [])].slice(0, 20), findings: extra.findings.slice(0, 20), basis: plan.ok.basis, state: 'PROPOSED' };
  list.unshift(p);
  log(w, persona, 'instant.proposed', c.roomId || p.id, `${p.id}: a proposed design for ${p.name} (${p.width.m} m by ${p.length.m} m, ${p.basis === 'MEASURED' ? 'measured' : 'partly estimated'}; ${p.photos.length} photographs kept on the device${option ? `; layout ${option}` : ''}). A proposal: no record was changed`);
  return p;
}
