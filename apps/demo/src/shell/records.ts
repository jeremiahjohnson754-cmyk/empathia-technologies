/**
 * The shell's view of the demonstration's records (loaded on first use, so the main bundle stays small):
 *   - quick find's entity groups after the 3 Nov reference: physical units, logical positions, incidents — each record with the room it
 *     belongs to and the address that opens it there (?device= selects the position in the room view);
 *   - View as's coverage: how many of the records a role may see, by V2.5.3's entity authority (AZ_ENTITY), counted from the same records.
 * Nothing here is typed in: every row and every count comes from the generated room records (campus/design.ts) and the campus canon.
 * No make, model or serial is invented: a unit is named by its asset code, its position label and its identity state.
 */
import { allRecords } from '../campus/design.js';
import { BUILDINGS, ROOMS, roomHref, shortName, fullName } from '../campus/canon.js';
import { allows } from '../access/policy.js';
import type { RoleKey } from '../registry.types.js';

export type Group = 'unit' | 'position' | 'issue';
export interface Entry { id: string; group: Group; entity: string; title: string; sub: string; href: string; cat?: string; chip: string; hay: string }

let built: Entry[] | null = null;
export function entries(): Entry[] {
  if (built) return built;
  const out: Entry[] = [];
  for (const rec of allRecords()) {
    const o = rec.outline; const room = shortName(o); const at = roomHref(o);
    for (const p of rec.positions) {
      if (p.furniture) continue;
      const href = `${at}?device=${encodeURIComponent(p.code)}`;
      out.push({ id: `pos:${o.id}:${p.code}`, group: 'position', entity: 'Device', title: `${p.label} (${o.number})`, sub: `${p.catLabel} · ${room} · position ${p.code}`, href, cat: p.cat, chip: 'Position', hay: `${p.label} ${p.catLabel} ${p.cat} ${room} ${o.name} ${p.code}`.toLowerCase() });
      if (p.asset) out.push({ id: `unit:${p.asset}`, group: 'unit', entity: 'Asset', title: `${p.asset} · ${p.label}`, sub: `identity ${p.identity} · synthetic unit at ${p.code} · ${room}`, href, cat: p.cat, chip: 'Unit', hay: `${p.asset} ${p.label} ${p.catLabel} ${p.cat} ${room} ${o.name} ${p.identity}`.toLowerCase() });
    }
    for (const i of rec.issues) {
      const pos = rec.positions.find((p) => i.positions.includes(p.code));
      out.push({ id: `iss:${o.id}:${i.id}`, group: 'issue', entity: 'Issue', title: `${i.id} · ${i.title}`, sub: `${i.severity} · ${i.state.replace('_', ' ')} · ${room}`, href: pos ? `${at}?device=${encodeURIComponent(pos.code)}` : at, cat: pos?.cat, chip: 'Incident', hay: `${i.id} ${i.title} ${i.severity} ${i.state} ${room} ${o.name} ${pos?.label || ''} ${pos?.catLabel || ''} ${pos?.cat || ''}`.toLowerCase() });
    }
  }
  built = out; return out;
}

/** Every token must appear; a title hit outranks a description hit; physical units first, as the reference shows them. */
export function match(q: string, may: (e: Entry) => boolean): Record<Group, { hits: Entry[]; total: number }> {
  const words = q.toLowerCase().normalize('NFKD').replace(/[^a-z0-9.\- ]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 6);
  const res: Record<Group, { hits: Entry[]; total: number }> = { unit: { hits: [], total: 0 }, position: { hits: [], total: 0 }, issue: { hits: [], total: 0 } };
  if (!words.length) return res;
  const scored = entries().filter((e) => words.every((w) => e.hay.includes(w)) && may(e))
    .map((e) => ({ e, s: words.reduce((n, w) => n + (e.title.toLowerCase().includes(w) ? 2 : 1), 0) }))
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title));
  for (const { e } of scored) { res[e.group].total += 1; res[e.group].hits.push(e); }
  return res;
}

/** The records a role may see (V2.5.3 azRecords): each record counts once, under its entity type's authority. */
export function coverage(role: RoleKey): { records: number; of: number } {
  const counts: Array<[string, number]> = [['Campus', 1], ['Building', BUILDINGS.length], ['Room', ROOMS.length]];
  const add = (t: string, n: number) => { const c = counts.find((x) => x[0] === t); if (c) c[1] += n; else counts.push([t, n]); };
  for (const r of allRecords()) {
    add('Device', r.positions.filter((p) => !p.furniture).length); add('Furniture', r.positions.filter((p) => p.furniture).length);
    add('Asset', r.installations.length); add('Issue', r.issues.length); add('LifecycleEvent', r.events.length);
    add('CommissioningBaseline', r.baselines.length); add('Design', r.findings.length);
  }
  let records = 0, of = 0;
  for (const [t, n] of counts) { of += n; if (allows({ entity: t }, role)) records += n; }
  return { records, of };
}
export const roomName = (id: string) => { const r = ROOMS.find((x) => x.id === id); return r ? fullName(r) : id; };
