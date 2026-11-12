/**
 * SIGNAL Mission Control, restored 12 November 2026 to the founder's build package (docs/04-engine-specs.md §14 and the reference
 * runtime app.js renderHome / points / level / crewTrust / sysMap; the reference wins). Pure: it reads the reader's stored progress and
 * the build's signal/mission.json.
 *
 * Points: a quiz's best score; +3 per passed drill; an incident proven +6, partial +3; +4 per passed lab; +1 per canonical decision
 * (Method); a meltdown proven +12, partial +6, otherwise +1; +1 per chapter opened. Level: L0 Explorer (0), L1 Foundation (25),
 * L2 Operator (90), L3 Technician (200), L4 Systems Engineer (360), L5 Lead Engineer (560) — provisional (RV-20). Per domain E0 (< 3),
 * E1 (≥ 3), E2 (≥ 8), E3 (≥ 15).
 */
import type { Progress } from './story.js';

export interface SysNode { id: string; label: string; x: number; y: number; w: number; h: number; unlock: string[] }
export interface SysMap { title?: string; view?: [number, number]; nodes: SysNode[]; links: Array<[string, string, string]> }
export interface MissionIndex {
  dec: Record<string, { k: number[]; o: Record<string, { m: number; t: Record<string, number>; c?: 1 }> }>;
  talk: Record<string, Array<Record<string, number>>>;
  roles: Array<{ id: string; text: string }>; domains: string[]; lanes: Record<string, string>; sysmaps: Record<string, SysMap>;
  dom: Record<'quiz' | 'drill' | 'incident' | 'lab' | 'meltdown', Record<string, string | null>>;
  totals: { drills: number; incidents: number; labs: number; chapters: number; cases: number };
}
export const LEVELS: Array<[number, string, string]> = [[0, 'L0', 'Explorer'], [25, 'L1', 'Foundation'], [90, 'L2', 'Operator'], [200, 'L3', 'Technician'], [360, 'L4', 'Systems Engineer'], [560, 'L5', 'Lead Engineer']];
export function level(n: number) { let cur = LEVELS[0]!, next: [number, string, string] | null = null; LEVELS.forEach((l, i) => { if (n >= l[0]) { cur = l; next = LEVELS[i + 1] || null; } }); return { code: cur[1], name: cur[2], floor: cur[0], next }; }
export const elevel = (n: number) => (n >= 15 ? 'E3' : n >= 8 ? 'E2' : n >= 3 ? 'E1' : 'E0');
/** Every recorded decision, across chapters, with its letter. */
const decisions = (P: Progress) => Object.values(P.chapters).flatMap((c) => Object.entries(c.choices).map(([id, ch]) => ({ id, ch })));
export function points(P: Progress, M: MissionIndex) {
  const p = { total: 0, dom: {} as Record<string, number> }; const add = (d: string | null | undefined, n: number) => { p.total += n; if (d) p.dom[d] = (p.dom[d] || 0) + n; };
  for (const [id, r] of Object.entries(P.quizzes)) add(M.dom.quiz[id], r.best || 0);
  for (const [id, r] of Object.entries(P.drills)) if (r.passed) add(M.dom.drill[id], 3);
  for (const [id, r] of Object.entries(P.incidents)) add(M.dom.incident[id], r.best === 'proven' ? 6 : r.best === 'partial' ? 3 : 0);
  for (const [id, r] of Object.entries(P.labs)) if (r.passed) add(M.dom.lab[id], 4);
  for (const { id, ch } of decisions(P)) if (M.dec[id]?.o[ch.letter]?.c) add('Method', 1);
  for (const [id, r] of Object.entries(P.meltdowns)) add(M.dom.meltdown[id], r.best === 'proven' ? 12 : r.best === 'partial' ? 6 : 1);
  for (const _ of Object.keys(P.chapters)) add(null, 1);
  return p;
}
/** Merit and each person's trust from every recorded decision (a timeout costs 2 merit) and every answered conversation. Merit earned
 *  after hints keeps the hint's share, as the story's own tally does. */
export function crew(P: Progress, M: MissionIndex) {
  const trust: Record<string, number> = {}; let merit = 0; const add = (t: Record<string, number>) => { for (const [k, v] of Object.entries(t)) trust[k] = (trust[k] || 0) + v; };
  for (const { id, ch } of decisions(P)) { if (ch.letter === 'TIMEOUT') { merit -= 2; continue; } const d = M.dec[id], o = d?.o[ch.letter]; if (!o) continue;
    const keep = ch.hints > 0 ? (d!.k[Math.min(ch.hints, d!.k.length) - 1] ?? 1) : 1; merit += o.m > 0 ? Math.round(o.m * keep) : o.m; add(o.t); }
  for (const c of Object.values(P.chapters)) for (const [id, a] of Object.entries(c.talks)) { const t = M.talk[id]?.[a]; if (t) add(t); }
  return { merit, trust };
}
export function evidence(P: Progress, M: MissionIndex) {
  return { drills: Object.values(P.drills).filter((r) => r.passed).length, drillsOf: M.totals.drills, proven: Object.values(P.incidents).filter((r) => r.best === 'proven').length, incidentsOf: M.totals.incidents,
    labs: Object.values(P.labs).filter((r) => r.passed).length, labsOf: M.totals.labs, quizzes: Object.keys(P.quizzes).length, decisions: decisions(P).length,
    bosses: Object.values(P.bosses || {}).filter((r) => r.passed).length, challenges: Object.values(P.challenges || {}).filter((r) => r.passed).length };
}
/** A system lights up once a chapter that meets it has been opened, or an incident that proves it ended better than failed. */
export const nodeOn = (n: SysNode, P: Progress) => n.unlock.some((u) => !!P.chapters[u] || (!!P.incidents[u] && P.incidents[u]!.best !== 'fail'));
/** The season the reader is in: the last chapter opened (s01e00 if none). */
export const currentSeason = (P: Progress) => { const m = /^s(\d\d)/.exec(P.last || ''); return m ? Number(m[1]) : 1; };
