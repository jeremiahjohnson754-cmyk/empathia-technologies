/**
 * Learn, read from the records (V2.5.3 Learn: "a case is a room's own records; a score is evidence of how you reasoned").
 *
 * The product content (the evidence ladder, the ten service actions with their minutes, the six ratings and their weights, readiness,
 * the SIGNAL seasons, cast and authored episodes, the design-clinic lessons, the ServiceHands stages, root causes and known fixes) is
 * V2.5.3's own, extracted statically into packages/domain-data/data/LEARN_V253.json (scripts/legacy/extract-learn.py). Everything a page
 * counts — the training cases, their signal paths, the tests that could prove them, the rooms a lesson is worked on — is derived here from
 * the thirty room records (campus/design.ts) and the service workspace; nothing is typed in. Progress stays in this browser and every
 * completion writes a training line to the ledger: practice evidence, never a credential and never an authorization to work.
 */
import L from '@empathia/domain-data/data/LEARN_V253.json' with { type: 'json' };
import { allRecords, roomRecord, type RoomRecord, type Issue, type Position } from '../campus/design.js';
import { shortName } from '../campus/canon.js';
import * as S from '../workspace/store.js';

export const V = L as unknown as {
  EVIDENCE_LADDER: Array<[string, string, number]>; SERVICE_VERBS: Array<[string, string, string]>; VERB_MIN: Record<string, number>;
  SCORE_DIMS: Array<[string, string, string, number]>; SCORE_PASS: number; READINESS: Array<[number, string, string]>; LEARN_POINTS: Record<string, number>;
  OWNER_SAYS: Record<string, [string, string]>; DOMAIN_KIT: Record<string, { measure: string | null; check: string; cover: string | null; hops: Array<[string, string]>; around: string; wrong: string }>;
  SERVICE_WINDOW: number; KNOWLEDGE_KINDS: Array<[string, string]>; NEW_COMPETENCIES: Array<[string, string, string]>;
  SIGNAL_SEASONS: Array<[number, string, string, string, string]>; SIGNAL_CAST: Array<[string, string, string, string, string, string, string]>;
  SIGNAL_EPISODES: Episode[]; DESIGN_LESSONS: Array<{ id: string; chapter: string; title: string; rooms: string[]; sum: string; cards: string[] }>;
  ASK_QUESTIONS: string[]; SH_STAGES: Array<[string, string, string]>; SH_ROUTES: Record<string, [string, string]>;
  ROOT_CAUSES: Array<[string, string]>; KNOWN_FIXES: Array<[string, number, string[]]>; MATERIALS: Record<string, { label: string; a: number[] }>; BANDS: number[]; PLACEHOLDERS: Record<string, string>;
};
export interface Scene { id: string; beat: string; speaker: string | null; text: string; evidence?: Array<[string, string]>; choices?: Array<[string, string, Record<string, number>, string, string]>; callback?: Record<string, string>; memoryText?: Record<string, string>; cliff?: boolean; reflect?: boolean; timer?: number }
export interface Episode { id: string; season: number; n: number; title: string; minutes: number; objective: string; env: string; boss?: boolean; scenes: Scene[] }

// ------------------------------------------------------------------------------------------------------------ design-clinic text
/** Fill a lesson card's placeholders: {a:material@band} from the materials table, {DR}/{JMAT}/{JMIN} from V2.5.3's rendered values. */
export function fill(t: string): string {
  return t.replace(/\{a:([a-z-]+)@(\d+)\}/g, (_, m: string, b: string) => { const mat = V.MATERIALS[m]; const i = V.BANDS.indexOf(Number(b)); return mat && i >= 0 ? mat.a[i]!.toFixed(2) : '—'; })
    .replace(/\{(DR|JMAT|JMIN)\}/g, (_, k: string) => V.PLACEHOLDERS[k] || '—');
}

// ------------------------------------------------------------------------------------------------------------ training cases
export type Domain = keyof typeof V.DOMAIN_KIT;
const CAT_DOMAIN: Record<string, string> = { micceil: 'Audio', micwireless: 'Audio', mictable: 'Audio', dsp: 'Audio', amp: 'Audio', speaker: 'Audio', camera: 'Video', bar: 'Video', display: 'Display', ledwall: 'Display', projector: 'Display', switcher: 'Display', switch: 'Network', encoder: 'Network', compute: 'Compute', control: 'Control', touch: 'Control', scheduler: 'Scheduling', rack: 'Power' };
const WORD_DOMAIN: Array<[RegExp, string]> = [[/audio|echo|microphone|hear|speech|loudspeaker|dsp/i, 'Audio'], [/camera|video|framed|preset/i, 'Video'], [/display|projector|screen|standby|sightline|viewing/i, 'Display'], [/switch|network|call(s)? dropped/i, 'Network'], [/power|outlet|breaker/i, 'Power'], [/firmware|control/i, 'Control'], [/booking|schedul/i, 'Scheduling'], [/compute|restart/i, 'Compute']];
const domainOf = (r: RoomRecord, positions: string[], title: string): string => {
  const p = r.positions.find((x) => positions.includes(x.code)); if (p && CAT_DOMAIN[p.cat]) return CAT_DOMAIN[p.cat]!;
  return WORD_DOMAIN.find(([re]) => re.test(title))?.[1] || 'Control';
};
/** Who owns the fix (V2.5.3 FIX_OWNER / OWNER_SAYS): a design deficiency is the Systems Engineer's; a field fault is the service engineer's. */
const ownerOf = (src: string, id: string): 'own' | 'design' => (/design|engine/i.test(src) || /^(DD|FND)-/.test(id) ? 'design' : 'own');

export interface Hop { key: string; label: string; devices: Position[] }
export interface TrainingCase {
  id: string; room: RoomRecord; roomId: string; short: string; complaint: string; domain: string; severity: string; state: string;
  issueId: string; source: string; owner: 'own' | 'design'; minutes: number; hops: Hop[]; cause: number; reference: boolean;
  tests: Array<{ id: string; label: string; result: string; pack: string | null }>; devices: Position[];
}
/** The signal path of a domain through one room: V2.5.3's hops, each with the room's own positions of that class (net and far end always). */
export function hopsOf(r: RoomRecord, domain: string): Hop[] {
  const kit = V.DOMAIN_KIT[domain] || V.DOMAIN_KIT.Control!;
  return kit.hops.map(([cats, label]) => { const cs = cats.split('|'); const devices = r.positions.filter((p) => !p.furniture && (cs.includes(p.cat) || (cs.includes('net') && p.cat === 'switch') || (cs.includes('port') && p.cat === 'switch'))); return { key: cats, label, devices }; })
    .filter((h) => h.devices.length || /net|far|port|wall|pdu|cal/.test(h.key));
}
const TEST_DOMAIN: Record<string, RegExp> = { Audio: /audio|mic|speech|echo|loud/i, Video: /video|camera|framing|preset/i, Display: /display|sightline|image|projector/i, Network: /network|port|vlan|qos|link/i, Compute: /compute|uc_|boot|start/i, Power: /power|ups|pdu/i, Control: /control|touch|firmware/i, Scheduling: /schedul|booking|calendar/i };
let cases: TrainingCase[] | null = null;
/** One training case per room with an issue on its record or a service incident (the open one first), plus Meridian 1.140 as the
 * reference "ready, and can be shown to be" case when it carries no open issue — V2.5.3 "Every hero room has one". */
export function trainingCases(w: S.Workspace): TrainingCase[] {
  if (cases) return cases;
  const out: TrainingCase[] = [];
  for (const r of allRecords()) {
    const open = r.issues.filter((i) => i.state !== 'RESOLVED'); const inc = w.incidents.filter((i) => i.roomId === r.outline.id);
    const pick: (Issue & { from: 'room' }) | (S.Incident & { from: 'incident' }) | undefined = open.find((i) => i.severity === 'High') ? { ...open.find((i) => i.severity === 'High')!, from: 'room' } : inc.find((i) => !['CLOSED', 'RESOLVED'].includes(i.state)) ? { ...inc.find((i) => !['CLOSED', 'RESOLVED'].includes(i.state))!, from: 'incident' } : open[0] ? { ...open[0], from: 'room' } : inc[0] ? { ...inc[0], from: 'incident' } : undefined;
    if (!pick) continue;
    const positions = pick.from === 'room' ? pick.positions : r.positions.filter((p) => !p.furniture && w.workOrders.some((o) => o.incidentId === pick.id && o.parts.some((x) => x.part === p.cat || (x.part === 'processor' && p.cat === 'dsp')))).map((p) => p.code);
    const domain = domainOf(r, positions, pick.title);
    const hops = hopsOf(r, domain);
    const cause = Math.max(0, hops.findIndex((h) => h.devices.some((d) => positions.includes(d.code))));
    const rows = ((r.analysis.applicability as unknown as { rows?: Array<{ id: string; label: string; applicable: boolean; result?: string; pack: string | null; domain?: string }> }).rows || []).filter((t) => t.applicable);
    const re = TEST_DOMAIN[domain] || /./;
    const tests = rows.filter((t) => re.test(`${t.id} ${t.label} ${t.pack || ''} ${t.domain || ''}`)).map((t) => ({ id: t.id, label: t.label, result: t.result || 'NOT_TESTED', pack: t.pack }));
    out.push({ id: `TC-${r.outline.id}`, room: r, roomId: r.outline.id, short: shortName(r.outline), complaint: pick.title, domain, severity: pick.severity, state: pick.state, issueId: pick.id,
      source: pick.from === 'room' ? pick.source : `service incident ${pick.id}`, owner: pick.from === 'room' ? ownerOf(pick.source, pick.id) : 'own', minutes: 14, hops, cause, reference: false, tests, devices: hops.flatMap((h) => h.devices) });
  }
  cases = out; return out;
}
export const caseById = (w: S.Workspace, id: string) => trainingCases(w).find((c) => c.id === id || c.roomId === id) || null;

// ------------------------------------------------------------------------------------------------------------ progress (this browser)
export interface Run { log: string[]; cause: number | null; response: string | null; score: Record<string, number>; overall: number; at: string; inWindow: boolean }
export interface Progress {
  v: 1; runs: Record<string, { first: Run; best: Run; attempts: number }>; story: Record<string, Record<string, number>>;
  episodes: Record<string, { choices: Record<string, number>; done: boolean; marks: string[] }>; design: Record<string, { right: number; of: number }>;
  drills: Record<string, boolean>; academy: Record<string, { right: number; of: number }>; incidents: Record<string, 'proven' | 'partial' | 'fail'>;
}
const KEY = 'empathia.demo.learn.v1';
const EMPTY = (): Progress => ({ v: 1, runs: {}, story: {}, episodes: {}, design: {}, drills: {}, academy: {}, incidents: {} });
export function loadProgress(): Progress { try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s) as Progress; if (d && d.v === 1) return { ...EMPTY(), ...d }; } } catch { /* damaged or unavailable: start empty */ } return EMPTY(); }
export function saveProgress(p: Progress) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* lasts the page */ } }
/** Change the progress and write the training line to the shared ledger (the same event shape every workspace writes). */
export function record(persona: string, type: string, aggregate: string, detail: string, change: (p: Progress) => void): Progress {
  const p = loadProgress(); change(p); saveProgress(p);
  const w = S.load(); w.events.unshift({ at: new Date().toISOString(), by: persona, type, aggregate, detail: `${detail} — practice evidence; never a credential or an authorization to work`, outcome: 'ALLOWED' }); w.events = w.events.slice(0, 500); S.save(w);
  return p;
}

// ------------------------------------------------------------------------------------------------------------ Service Mode: the clock and the six ratings
export const minutesOf = (log: string[]) => log.reduce((a, v) => a + (V.VERB_MIN[v] || 0), 0);
export const RESPONSES = (c: TrainingCase) => [
  { key: 'fix', label: c.owner === 'design' ? 'Escalate to the Systems Engineer with the evidence' : `Repair the ${c.hops[c.cause]?.label.toLowerCase() || 'fault'} and prove it against the baseline`, right: true },
  { key: 'around', label: (V.DOMAIN_KIT[c.domain] || V.DOMAIN_KIT.Control!).around, right: false },
  { key: 'wrong', label: (V.DOMAIN_KIT[c.domain] || V.DOMAIN_KIT.Control!).wrong, right: false },
  { key: c.owner === 'design' ? 'repair-design' : 'escalate-own', label: c.owner === 'design' ? 'Change the design in the field yourself' : 'Escalate it to engineering without trying anything', right: false },
];
/** The written scoring rules (shown on the page): each rating 0–100 from the run's own log, weighted by V2.5.3 SCORE_DIMS. */
export const RULES: Record<string, string> = {
  competence: 'Right cause and right response 100; right cause only 55; otherwise 15.',
  evidence: '25 for each look, question, measurement, test or trace taken before you commit to a cause (at most 100); 0 if you diagnosed first.',
  trust: 'Asked the people in the room 40, proved the room works again 40, finished inside the window 20.',
  authority: 'Stayed inside what is yours 100; changed something that belongs to someone else 20.',
  debt: 'Proved the fix 100; a workaround 45; the wrong part 15.',
  readiness: 'Inside the window with proof 100; inside the window 60; over it 25.',
};
export function score(c: TrainingCase, log: string[], cause: number | null, response: string | null): Run {
  const resp = RESPONSES(c).find((r) => r.key === response); const di = log.indexOf('diagnose'); const before = (di < 0 ? log : log.slice(0, di));
  const looked = before.filter((v) => ['inspect', 'ask', 'measure', 'test', 'trace'].includes(v)).length;
  const inWindow = minutesOf(log) <= V.SERVICE_WINDOW; const verified = log.includes('verify');
  const rightCause = cause === c.cause; const rightResp = !!resp?.right;
  const s: Record<string, number> = {
    competence: rightCause && rightResp ? 100 : rightCause ? 55 : 15,
    evidence: di === 0 ? 0 : Math.min(100, looked * 25),
    trust: (log.includes('ask') ? 40 : 0) + (verified ? 40 : 0) + (inWindow ? 20 : 0),
    authority: response === 'repair-design' || (c.owner === 'design' && log.includes('repair')) ? 20 : 100,
    debt: response === 'around' ? 45 : response === 'wrong' ? 15 : verified ? 100 : 60,
    readiness: inWindow && verified ? 100 : inWindow ? 60 : 25,
  };
  const overall = Math.round(V.SCORE_DIMS.reduce((a, [k, , , wt]) => a + (s[k] || 0) * wt, 0));
  return { log, cause, response, score: s, overall, at: new Date().toISOString(), inWindow };
}

// ------------------------------------------------------------------------------------------------------------ readiness and competencies
/** V2.5.3 LEARN_POINTS and READINESS: proven case 20, partial 9, unproven 3, a passed drill 6; plus a passed lab 10 and a governed case
 * this person proposed that reached APPROVED 20 (this demonstration's additions, written here). */
export function readinessOf(w: S.Workspace, persona: string, p: Progress, labsPassed: number) {
  const runs = Object.values(p.runs); const P = V.LEARN_POINTS;
  const casePts = runs.reduce((a, r) => a + (r.best.overall >= V.SCORE_PASS ? P.proven! : r.best.overall >= 50 ? P.partial! : P.unproven!), 0);
  const drills = new Set(w.training.filter((t) => t.by === persona && t.correct).map((t) => t.drillId)).size + Object.values(p.drills).filter(Boolean).length;
  const approved = w.learnCases.filter((c) => c.proposedBy === persona && c.state === 'APPROVED').length;
  const points = casePts + drills * P.drill! + labsPassed * 10 + approved * 20;
  const k = V.READINESS.filter(([at]) => points >= at).length - 1; const next = V.READINESS[k + 1];
  return { points, level: V.READINESS[k]!, index: k, next: next ? { at: next[0], name: next[1], need: next[0] - points } : null, proven: runs.filter((r) => r.best.overall >= V.SCORE_PASS).length, taken: runs.length, drills, approved };
}
/** Nine competencies (V2.5.3: six from the knowledge graph's first case set, the four of NEW_COMPETENCIES less RF): each evidenced by a
 * proven case whose domain it covers. */
export const COMPETENCIES: Array<{ id: string; name: string; domains: string[] | 'all'; note: string }> = [
  { id: 'CMP-1', name: 'Audio signal flow', domains: ['Audio'], note: 'Follows sound from the microphone to the far end.' },
  { id: 'CMP-3', name: 'Network path tracing', domains: ['Network', 'Compute', 'Scheduling'], note: 'Finds where a networked path stops.' },
  { id: 'CMP-4', name: 'Comparing a room with its baseline', domains: ['Video', 'Control', 'Display'], note: 'Reads what changed against what was commissioned.' },
  { id: 'CMP-5', name: 'Measuring intelligibility', domains: ['Audio'], note: 'Puts a number on whether people can be understood.' },
  { id: 'CMP-6', name: 'Lifecycle planning', domains: ['Power', 'Display'], note: 'Knows when a device or a room needs renewing.' },
  ...V.NEW_COMPETENCIES.map(([id, name, note]) => ({ id, name, domains: 'all' as const, note })),
];
export function competencyEvidence(w: S.Workspace, p: Progress) {
  const proven = trainingCases(w).filter((c) => (p.runs[c.id]?.best.overall ?? 0) >= V.SCORE_PASS);
  return COMPETENCIES.map((c) => { const by = proven.filter((x) => c.domains === 'all' || c.domains.includes(x.domain)); const teach = trainingCases(w).filter((x) => c.domains === 'all' || c.domains.includes(x.domain)).length; return { ...c, by, teach }; });
}

// ------------------------------------------------------------------------------------------------------------ the knowledge this demonstration actually holds
export const roomsFor = (ids: string[]) => ids.map((id) => roomRecord(id)).filter((r): r is RoomRecord => !!r);
export const archetypesIn = () => [...new Map(allRecords().map((r) => [r.outline.archetype, r.archetypeName])).entries()];
