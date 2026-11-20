/**
 * Who touched what, and the experience it builds (founder, 14 Nov 2026: "we want to be able to track everyone that touched the project as
 * well for dispatch and search party and the relationships … projects done by a person can increase their expertise scores depending on
 * the complexity of work and type of work control systems audio etc").
 *
 * Experience is EVIDENCE FROM THE RECORD — what a person has worked on, weighted by how complex the room was and what kind of work it
 * was — shown by layer (audio, video, display, control, network, power) and by quarter. It is never a credential, never "certified", and
 * grants no authority: dispatch's hard gates (competency records, licences, site access, availability) still decide who may take a job;
 * experience is at most a stated ranking preference beside them.
 *
 * People come from two places: the workspace's own work orders (the technician on each), and the synthetic service history, whose jobs
 * are given to a person of the vendor's roster deterministically (internal jobs to the internal team; each vendor's to its own synthetic
 * field engineers). Both are labelled. Nothing here is a real person.
 */
import { syntheticHistory, workspaceJobs, INTERNAL, quarterKey, type ServiceJob, type Layer } from '../service/history.js';
import { VENDORS } from '../parity/core.js';
import { roomRecord, type RoomRecord } from '../campus/design.js';
import type * as S from '../workspace/store.js';

export interface Person { id: string; name: string; org: string; internal: boolean; vendor: string }
const INTERNAL_TEAM: Person[] = [
  { id: 'tech-ana', name: 'Ana Reyes (synthetic)', org: 'Internal service team', internal: true, vendor: INTERNAL },
  { id: 'tech-ben', name: 'Ben Okafor (synthetic)', org: 'Internal service team', internal: true, vendor: INTERNAL },
  { id: 'tech-dev', name: 'Dev Shah (synthetic)', org: 'Internal service team', internal: true, vendor: INTERNAL },
  { id: 'tech-eli', name: 'Eli Brandt (synthetic)', org: 'Internal service team', internal: true, vendor: INTERNAL },
  { id: 'tech-fay', name: 'Fay Moreno (synthetic)', org: 'Internal service team', internal: true, vendor: INTERNAL },
];
/** each vendor's synthetic field engineers (Brightwater's first is the workspace's own Cara Lind) */
function vendorRoster(vendor: string): Person[] {
  const name = VENDORS.find((v) => v[0] === vendor)?.[1] || vendor; const short = name.split(' ')[0]!;
  if (vendor === 'VN-BRIGHTWATER') return [{ id: 'tech-cara', name: 'Cara Lind — Brightwater AV (synthetic)', org: name, internal: false, vendor }, { id: `fe-${vendor}-2`, name: `${short} field engineer 2 (synthetic)`, org: name, internal: false, vendor }];
  return [1, 2].map((k) => ({ id: `fe-${vendor}-${k}`, name: `${short} field engineer ${k} (synthetic)`, org: name, internal: false, vendor }));
}
export function roster(): Person[] { const vs = [...new Set(VENDORS.map((v) => v[0]))]; return [...INTERNAL_TEAM, ...vs.flatMap(vendorRoster)]; }
export const personOf = (id: string): Person | undefined => roster().find((p) => p.id === id) || (id === 'tech-gus' ? { id, name: 'Gus Haldane — Northwind AV (synthetic)', org: 'Northwind AV Services', internal: false, vendor: INTERNAL } : undefined);

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** who did a job: the work order's technician, or (synthetic history) a person of the vendor's roster chosen from the job's ID */
export function technicianOf(j: ServiceJob): string {
  if (j.tech) return j.tech;
  const team = j.vendor === INTERNAL ? INTERNAL_TEAM : vendorRoster(j.vendor);
  return team[hash(j.id) % team.length]!.id;
}

/** how complex the room is: by capacity, and more when it divides or carries more than one mode */
export function roomComplexity(r: RoomRecord | null): { weight: number; why: string } {
  if (!r) return { weight: 1, why: 'room not on record' };
  const cap = r.outline.capacity; let w = cap <= 6 ? 1 : cap <= 14 ? 1.5 : cap <= 40 ? 2 : 3; const why = [`${cap} people`];
  if (r.outline.divisible) { w += 0.5; why.push('divisible'); }
  return { weight: w, why: why.join(', ') };
}
export const KIND_WEIGHT: Record<ServiceJob['kind'], number> = { 'break-fix': 1, preventive: 0.5, change: 1.5 };
export const SEVERITY_WEIGHT: Record<ServiceJob['severity'], number> = { 'Mission critical': 1.5, High: 1.2, Standard: 1 };
/** the experience one job gives: room complexity × kind × severity, rounded to a tenth */
export function jobPoints(j: ServiceJob): number { return Math.round(roomComplexity(roomRecord(j.roomId)).weight * KIND_WEIGHT[j.kind] * SEVERITY_WEIGHT[j.severity] * 10) / 10; }

export const LEVELS: Array<{ min: number; name: string }> = [{ min: 0, name: 'Started' }, { min: 10, name: 'Practised' }, { min: 40, name: 'Experienced' }, { min: 100, name: 'Deep experience' }];
export const levelOf = (pts: number) => [...LEVELS].reverse().find((l) => pts >= l.min)!.name;
export const LAYERS: Layer[] = ['audio', 'video', 'display', 'control', 'network', 'power'];

export interface Involvement {
  person: Person; jobs: ServiceJob[]; rooms: string[]; projects: string[]; points: number; level: string;
  byLayer: Record<Layer, number>; byQuarter: Record<string, number>; reopened: number; last: string | null;
}
/** everyone's involvement over the jobs given (worked jobs only: one with a response or a restore) */
export function involvement(jobs: ServiceJob[]): Involvement[] {
  const by = new Map<string, ServiceJob[]>();
  for (const j of jobs) { if (!j.respondedAt && !j.restoredAt) continue; const t = technicianOf(j); (by.get(t) || by.set(t, []).get(t)!).push(j); }
  const out: Involvement[] = [];
  for (const [id, js] of by) {
    const person = personOf(id); if (!person) continue;
    const byLayer = Object.fromEntries(LAYERS.map((l) => [l, 0])) as Record<Layer, number>; const byQuarter: Record<string, number> = {}; let pts = 0;
    for (const j of js) { const p = jobPoints(j); pts += p; byLayer[j.layer] = Math.round((byLayer[j.layer] + p) * 10) / 10; const q = quarterKey(j.openedAt); byQuarter[q] = Math.round(((byQuarter[q] || 0) + p) * 10) / 10; }
    out.push({ person, jobs: js, rooms: [...new Set(js.map((j) => j.roomId))], projects: [...new Set(js.map((j) => j.projectId).filter((x): x is string => !!x))], points: Math.round(pts * 10) / 10, level: levelOf(pts),
      byLayer, byQuarter, reopened: js.filter((j) => j.reopened).length, last: js.map((j) => j.restoredAt || j.respondedAt || j.openedAt).sort().pop() || null });
  }
  return out.sort((a, b) => b.points - a.points);
}
/** everyone who touched a room (or every room of a project): the people from its jobs, and the roles from its commissioning record */
export function whoTouched(jobs: ServiceJob[], roomIds: string[]): { people: Array<{ person: Person; jobs: number; layers: Layer[]; last: string }>; roles: Array<{ role: string; steps: number; last: string }> } {
  const mine = jobs.filter((j) => roomIds.includes(j.roomId) && (j.respondedAt || j.restoredAt)); const m = new Map<string, ServiceJob[]>();
  for (const j of mine) { const t = technicianOf(j); (m.get(t) || m.set(t, []).get(t)!).push(j); }
  const people = [...m].map(([id, js]) => ({ person: personOf(id)!, jobs: js.length, layers: [...new Set(js.map((j) => j.layer))], last: js.map((j) => j.openedAt).sort().pop()! })).filter((x) => x.person).sort((a, b) => b.jobs - a.jobs);
  const r = new Map<string, { steps: number; last: string }>();
  for (const id of roomIds) for (const e of roomRecord(id)?.events || []) { if (e.outcome === 'DENIED') continue; const x = r.get(e.by) || { steps: 0, last: '' }; x.steps++; if (e.at > x.last) x.last = e.at; r.set(e.by, x); }
  return { people, roles: [...r].map(([role, v]) => ({ role, ...v })).sort((a, b) => b.steps - a.steps) };
}
/** the jobs the people pages read: the synthetic history and the workspace's own */
export const allJobs = (w: S.Workspace, projectOf: (room: string) => string | null) => [...syntheticHistory(projectOf), ...workspaceJobs(w, projectOf)];
