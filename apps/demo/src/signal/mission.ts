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
import { emptyChapter, gateDone, type Gate, type Pieces, type Progress } from './story.js';

export interface SysNode { id: string; label: string; x: number; y: number; w: number; h: number; unlock: string[] }
export interface SysMap { title?: string; view?: [number, number]; nodes: SysNode[]; links: Array<[string, string, string]> }
export interface MissionIndex {
  dec: Record<string, { k: number[]; o: Record<string, { m: number; t: Record<string, number>; c?: 1; f?: 1 }> }>;
  quests: Record<string, { title: string; objectives: Array<[string, string]> }>;
  discoveries: Record<string, { ch: string; title: string; body: string; teaser: string; thread?: string }>;
  chq: Record<string, { dec: string[]; core: [string, string] | null; soft: Array<[string, string]>; twist: Array<[string, string]>; md: string[]; disc: number }>;
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

// ------------------------------------------------------------------------------------------------- quests and the case journal (reference quest.js)
const lite = (lessonQuiz: Record<string, string>): Pieces => ({ gates: [], quizzes: {}, lessons: Object.fromEntries(Object.entries(lessonQuiz).map(([k, q]) => [k, { title: '', domain: '', cards: [], quiz: q }])) });
const done = (P: Progress, cid: string, kind: string, id: string, L: Pieces) => gateDone({ index: 0, kind, id, tier: 'hard', twist: false, core: false } as Gate, P.chapters[cid] || emptyChapter(), P, L);
const found = (P: Progress, cid: string, M: MissionIndex) => (P.chapters[cid]?.found || []).filter((d) => M.discoveries[d]?.ch === cid).length;
/** One quest objective: a decision recorded; the core skill, the meltdown or every twist done; N discoveries found; a named drill, lab or quiz done. */
export function objectiveDone(P: Progress, M: MissionIndex, cid: string, key: string, lessonQuiz: Record<string, string>): boolean {
  const q = M.chq[cid], L = lite(lessonQuiz); if (/^BR-/.test(key)) return !!P.chapters[cid]?.choices[key];
  if (!q) return false;
  if (key === 'core') return !!q.core && done(P, cid, q.core[0], q.core[1], L);
  if (key === 'meltdown') return q.md.length > 0 && q.md.every((id) => done(P, cid, 'meltdown', id, L));
  if (key === 'incident' || key === 'lesson') { const g = q.soft.find(([k]) => k === key); return !!g && done(P, cid, g[0], g[1], L); }
  if (key === 'twist') return q.twist.length > 0 && q.twist.every(([k, id]) => done(P, cid, k, id, L));
  if (/^disc:/.test(key)) return found(P, cid, M) >= Number(key.slice(5));
  if (/^(lab|drill|quiz):/.test(key)) { const [k, id] = key.split(':'); return done(P, cid, k!, id!, L); }
  return false;
}
export const GRADE_LINE: Record<string, string> = { S: 'Flawless. People will tell this one about you.', A: 'Professional work. A few things left on the table.', B: 'Solid, with scars. Replay a card to see what you missed.', C: 'You got through it. The crew noticed what it cost.', D: 'Rough. The story went on — but it went on without you at key moments.' };
/** A chapter's quest rating: decisions 2 (canonical) / 1 / 0 (failing) / −1 (timeout); the core skill 3 passed, 1 done; soft gates 2 (an incident 3 proven, 1 partial);
 *  a meltdown 5 / 3 / 1; one per discovery. S ≥ 90%, A ≥ 75%, B ≥ 55%, C ≥ 35%, else D. */
export function questRating(P: Progress, M: MissionIndex, cid: string, lessonQuiz: Record<string, string>) {
  const q = M.chq[cid]; let got = 0, max = 0; const L = lite(lessonQuiz); if (!q) return { got: 0, max: 0, grade: 'D' as const };
  for (const id of q.dec) { max += 2; const c = P.chapters[cid]?.choices[id]; if (!c) continue; const o = M.dec[id]?.o[c.letter]; got += c.letter === 'TIMEOUT' ? -1 : o?.c ? 2 : o?.f ? 0 : 1; }
  if (q.core) { max += 3; const [k, id] = q.core, d = done(P, cid, k, id, L), pass = k === 'lab' ? !!P.labs[id]?.passed : k === 'drill' ? !!P.drills[id]?.passed : d; got += pass ? 3 : d ? 1 : 0; }
  for (const [k, id] of q.soft) { if (k === 'incident') { max += 3; const r = P.incidents[id]; got += r ? (r.best === 'proven' ? 3 : r.best === 'partial' ? 1 : 0) : 0; } else { max += 2; got += done(P, cid, k, id, L) ? 2 : 0; } }
  for (const id of q.md) { max += 5; const r = P.meltdowns[id]; got += r ? (r.best === 'proven' ? 5 : r.best === 'partial' ? 3 : 1) : 0; }
  max += q.disc; got += found(P, cid, M);
  const pct = max ? Math.max(0, got) / max : 0, grade = pct >= 0.9 ? 'S' : pct >= 0.75 ? 'A' : pct >= 0.55 ? 'B' : pct >= 0.35 ? 'C' : 'D';
  return { got: Math.max(0, got), max, grade: grade as 'S' | 'A' | 'B' | 'C' | 'D' };
}
