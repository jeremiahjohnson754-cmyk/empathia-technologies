/**
 * SIGNAL meltdowns: the mission-critical boss fights, as rules without drawing. Restored 11 November 2026 to the founder's build
 * package (docs/04-engine-specs.md §9 and the reference runtime meltdown.js; the reference wins). Every figure is illustrative (MD-01).
 *
 * A live dependency map on a story clock: a node's input is the AND of OR-groups of its dependencies (ok 2, degraded 1, otherwise 0);
 * pressure rises while the input is bad and falls while it is good; a node is degraded past its grace and down past twice it. Events
 * break and fix nodes at fixed story-seconds unless the right flags were set; actors (Season 12) step in when triggered; actions extend
 * incident actions with activate, rewire, fix, break, isolate, blip, setIf, ifState and need; two holds are always there. The mission
 * fails when a critical node has been dark longer than its allowance, a critical objective is missed, or a boundary is crossed.
 * Requirements on the loadout (`res`) are checked through `resMet`, which the story supplies from the Season 9 review.
 */

export type NodeState = 'ok' | 'degraded' | 'down' | 'standby' | 'contained' | 'notready';
export interface MNode { id: string; label: string; sub?: string; col: number; row: number; deps: string[][]; crit?: boolean; maxDown?: number | null; grace?: number; owner?: string; start: 'ok' | 'degraded' | 'down' | 'standby'; res?: unknown; ready?: string[]; readyAny?: string[]; note?: string }
export interface MEvent { at: number; brk: Record<string, 'down' | 'degraded'>; fix: string[]; set: string[]; unless: string[]; threat?: string; prevented?: string; who?: string; text: string; tone?: string }
export interface MActor { who?: string; text: string; onNode?: string; onState?: string; onFlag?: string; delay?: number; need?: string[]; needAny?: string[]; needNot?: string[]; fix?: string[]; activate?: string[]; set?: string[]; threat?: string; fail?: Record<string, string> }
export interface MAction { id: string; label: string; cost?: number; text: string; tone?: string; good?: boolean; why?: string; req?: string[]; not?: string[]; once?: boolean; hideIf?: string[]; hideUntil?: string[]; stop?: string; end?: string; trust?: Record<string, number>; set?: string[]; unset?: string[];
  activate?: string[]; rewire?: Record<string, string[][]>; fix?: string[]; brk?: Record<string, 'down' | 'degraded'>; isolate?: string[]; blip?: Record<string, number>; setIf?: Record<string, [string, string]>; ifState?: Record<string, [string, string, string]>; need?: Record<string, string>; needText?: string; self?: boolean; threat?: string; res?: unknown; badges?: Array<[string, string]>;
  calc?: { q: string; answer: number; unit?: string; tol?: number; hint?: string; penalty?: number; f?: string } }
export interface Meltdown { id: string; title: string; kicker?: string; season: number; chapter: string; brief: string; note?: string; opening?: string; startClock?: string; budget: number; rate: number; endLabel?: string; trust: Record<string, number>; nodes: MNode[]; events: MEvent[]; actors?: MActor[]; actions: MAction[];
  objectives: Array<{ id: string; label: string; at: number; by: number; flag: string; crit?: boolean }>; win: { proven?: string[]; bonus?: string[] }; outcomes?: Record<string, string>; expert: string[]; gradeText?: Record<string, string>;
  turns?: { title?: string; intro?: string; budget: number; capital: number; unit?: string; pre?: string; suf?: string; lockLabel?: string; choices: Array<{ id: string; label: string; cost?: number; capital?: number; set?: string[]; from?: string }> }; threats?: Array<{ id: string; label: string; prevented: string; saved: string; lost: string }>; inherit?: boolean }

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';
export type Outcome = 'proven' | 'partial' | 'fail';
interface NS { state: NodeState; broken: 'down' | 'degraded' | null; standby: boolean; contained: boolean; notready: boolean; p: number; deps: string[][]; nores?: string }
export interface MState {
  t: number; n: Record<string, NS>; flags: Record<string, 1>; used: Record<string, 1>; over: boolean; boundary: number; stops: number; trust: Record<string, number>; dark: Record<string, number>;
  obj: Record<string, 'missed'>; log: Array<{ t: number; text: string; tone: string }>; chain: Array<{ t: number; node: string; to: NodeState; from: string }>; blip: Record<string, number>;
  fired: Record<string, 1>; actorAt: Record<number, number>; actorDone: Record<number, 1>; year: string[]; yearFlags: Record<string, 1>; self: number; saves: number; threat: Record<string, 'prevented' | 'saved' | 'maya'>; threatOn: Record<string, 1>;
  end: null | { outcome: Outcome; why: 'boundary' | 'mission' | 'end'; head: string; text: string; grade: Grade; score: number; darkPct: number; extras: number; extraMax: number; without: number; threatTotal: number };
}
export type ResMet = (req: unknown) => boolean;
export const STATE_WORD: Record<NodeState, string> = { ok: 'OK', degraded: 'DEGRADED', down: 'DOWN', standby: 'STANDBY', contained: 'ISOLATED', notready: 'NOT READY' };
export const GRADE_TEXT: Record<Grade, string> = { S: 'Textbook. Nothing that mattered went dark for long, and you proved it.', A: 'Strong. A few seconds of dark you could have saved.', B: 'You held it — with damage. Replay to see what cascaded.', C: 'The valley noticed. You got through on luck as much as method.', D: 'The meltdown won this one. The after-action review shows where it turned.' };
export const HOLDS: Array<[number, string]> = [[30, 'Hold steady and watch the map'], [120, 'Hold for two minutes']];

export function clockAt(M: Meltdown, t: number): string { const [h, m] = (M.startClock || '00:00').split(':').map(Number); let s = h! * 3600 + m! * 60 + Math.floor(t); s = ((s % 86400) + 86400) % 86400; const p = (x: number) => String(x).padStart(2, '0'); return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`; }
const fmt = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const node = (M: Meltdown, id: string) => M.nodes.find((x) => x.id === id)!;

/** Start a run, with the year's choices (Season 12) and the loadout. */
export function begin(M: Meltdown, year: string[] = [], resMet: ResMet = () => true): MState {
  const S: MState = { t: 0, n: {}, flags: {}, used: {}, over: false, boundary: 0, stops: 0, trust: { ...M.trust }, dark: {}, obj: {}, log: [], chain: [], blip: {}, fired: {}, actorAt: {}, actorDone: {}, year: year.slice(), yearFlags: {}, self: 0, saves: 0, threat: {}, threatOn: {}, end: null };
  for (const n of M.nodes) { S.n[n.id] = { state: n.start === 'standby' ? 'standby' : 'ok', broken: n.start === 'down' || n.start === 'degraded' ? n.start : null, standby: n.start === 'standby', contained: false, notready: false, p: 0, deps: n.deps.map((g) => g.slice()) }; S.dark[n.id] = 0; }
  for (const n of M.nodes) if (n.res && !resMet(n.res)) { const x = S.n[n.id]!; x.broken = 'down'; x.standby = false; x.nores = 'the loadout cannot afford it'; }
  const turn = Object.fromEntries((M.turns?.choices || []).map((c) => [c.id, c]));
  for (const cid of year) for (const f of turn[cid]?.set || []) { S.flags[f] = 1; S.yearFlags[f] = 1; }
  for (const n of M.nodes) { if (n.ready && !n.ready.every((f) => S.flags[f])) S.n[n.id]!.notready = true; if (n.readyAny && !n.readyAny.some((f) => S.flags[f])) S.n[n.id]!.notready = true; }
  // as the reference: displayed states are first worked out at the first story-second, so the first second's pressure reads them as set
  log(S, M.opening || 'The meltdown begins.', 'warn'); return S;
}
function log(S: MState, text: string, tone = '') { S.log.push({ t: S.t, text, tone }); return S; }
const live = (S: MState, id: string) => { const s = S.n[id]!.state; return s === 'ok' ? 2 : s === 'degraded' ? 1 : 0; };
const inputOf = (S: MState, id: string) => { const d = S.n[id]!.deps; if (!d.length) return 2; return Math.min(...d.map((g) => (g.length ? Math.max(...g.map((x) => live(S, x))) : 2))); };
function culprit(M: Meltdown, S: MState, id: string) { const bad: string[] = []; for (const g of S.n[id]!.deps) { const best = g.reduce((b, x) => (live(S, x) > live(S, b) ? x : b), g[0]!); if (best && live(S, best) < 2) bad.push(node(M, best).label); } return bad.join(' + '); }
export function stateOf(M: Meltdown, S: MState, id: string): NodeState {
  const x = S.n[id]!, g = node(M, id).grace || 20;
  if (x.contained) return 'contained'; if (x.notready) return 'notready'; if (x.standby) return 'standby';
  if (S.blip[id] && S.blip[id]! > S.t) return 'down'; if (x.broken) return x.broken;
  return x.p >= 2 * g ? 'down' : x.p >= g ? 'degraded' : 'ok';
}
const copy = (S: MState): MState => ({ ...S, n: Object.fromEntries(Object.entries(S.n).map(([k, v]) => [k, { ...v, deps: v.deps.map((g) => g.slice()) }])), flags: { ...S.flags }, used: { ...S.used }, trust: { ...S.trust }, dark: { ...S.dark }, obj: { ...S.obj }, log: S.log.slice(), chain: S.chain.slice(), blip: { ...S.blip }, fired: { ...S.fired }, actorAt: { ...S.actorAt }, actorDone: { ...S.actorDone }, yearFlags: { ...S.yearFlags }, threat: { ...S.threat }, threatOn: { ...S.threatOn } });

/** One story-second, in the reference's order: events, pressure, transitions and dark time, actors, the mission's limits, the end. */
function step(M: Meltdown, S: MState): void {
  S.t += 1;
  M.events.forEach((e, i) => {
    if (e.at !== S.t || S.fired[i]) return; S.fired[i] = 1;
    if (e.unless.some((f) => S.flags[f])) { if (e.threat && !S.threat[e.threat] && e.unless.some((f) => S.yearFlags[f])) { S.threat[e.threat] = 'prevented'; if (e.prevented) log(S, `✓ Held by the year · ${e.prevented}`, 'ok'); } return; }
    if (e.threat) S.threatOn[e.threat] = 1;
    for (const [k, v] of Object.entries(e.brk)) { S.n[k]!.broken = v; S.n[k]!.standby = false; }
    for (const k of e.fix) S.n[k]!.broken = null; for (const f of e.set) S.flags[f] = 1;
    log(S, `${e.who ? `${e.who}: ` : ''}${e.text}`, e.tone || '');
  });
  for (const n of M.nodes) { const x = S.n[n.id]!, g = n.grace || 20;
    if (!x.standby && !x.contained && !x.broken) { const inp = inputOf(S, n.id); x.p = inp === 2 ? Math.max(0, x.p - 3) : inp === 1 ? (x.p < g ? x.p + 1 : Math.max(g, x.p - 1)) : Math.min(2 * g + 5, x.p + 1); } }
  for (const n of M.nodes) { const x = S.n[n.id]!, s = stateOf(M, S, n.id);
    if (s !== x.state) { const was = x.state; x.state = s;
      if (!x.broken && !x.contained && !x.standby && s === 'degraded' && was === 'down') log(S, `↗ ${n.label} → recovering`);
      else if (!x.broken && !x.contained && !x.standby && (s === 'degraded' || s === 'down')) { const c = culprit(M, S, n.id); S.chain.push({ t: S.t, node: n.label, to: s, from: c }); log(S, `↯ ${n.label} → ${STATE_WORD[s]}${c ? ` (fed by ${c})` : ''}`, s === 'down' ? 'bad' : 'warn'); }
      else if (s === 'ok' && (was === 'down' || was === 'degraded')) log(S, `✓ ${n.label} → OK`, 'ok'); }
    if (n.crit) S.dark[n.id]! += s === 'down' || s === 'standby' || s === 'contained' ? 1 : s === 'degraded' ? 0.5 : 0; }
  (M.actors || []).forEach((a, i) => {
    if (S.actorDone[i]) return; const trig = a.onFlag ? !!S.flags[a.onFlag] : a.onNode ? (a.onState ? S.n[a.onNode]!.state === a.onState : S.n[a.onNode]!.state !== 'ok') : false; if (!trig) return;
    if (S.actorAt[i] == null) S.actorAt[i] = S.t; if (S.t - S.actorAt[i]! < (a.delay || 0)) return; S.actorDone[i] = 1; if (a.threat && S.threat[a.threat]) return;
    const miss = (a.need || []).filter((f) => !S.flags[f]); if (a.needAny?.length && !a.needAny.some((f) => S.flags[f])) miss.push(a.needAny[0]!); for (const f of a.needNot || []) if (S.flags[f]) miss.push(`!${f}`);
    if (miss.length) { log(S, `✕ ${a.who ? `${a.who}: ` : ''}${(a.fail && (a.fail[miss[0]!] || a.fail['_'])) || 'Nobody could act.'}`, 'bad'); return; }
    for (const k of a.activate || []) { S.n[k]!.standby = false; S.n[k]!.broken = null; S.n[k]!.p = 0; } for (const k of a.fix || []) { S.n[k]!.broken = null; S.n[k]!.p = 0; } for (const f of a.set || []) S.flags[f] = 1;
    if (a.threat) S.threat[a.threat] = 'saved'; S.saves += 1; log(S, `★ Save without Maya · ${a.who ? `${a.who}: ` : ''}${a.text}`, 'ok');
  });
  for (const n of M.nodes) if (n.crit && n.maxDown != null && S.dark[n.id]! > n.maxDown) { log(S, `☢ ${n.label} has been dark longer than the mission allows.`, 'bad'); finishIn(M, S, 'mission', `${n.label} was dark for more than ${fmt(n.maxDown)}.`); return; }
  for (const o of M.objectives) { if (S.t === o.at) log(S, `◆ New: ${o.label} — ${fmt(o.by - o.at)} to do it.`, o.crit ? 'bad' : 'warn');
    if (S.t > o.by && !S.flags[o.flag] && !S.obj[o.id]) { S.obj[o.id] = 'missed'; log(S, `✕ Missed: ${o.label}`, 'bad'); if (o.crit) { finishIn(M, S, 'mission', `Missed a mission-critical objective: ${o.label}.`); return; } } }
  if (S.t >= M.budget) finishIn(M, S, 'end');
}
/** Story time passing: by itself (the clock), by holds, and by every action's cost. */
export function advance(M: Meltdown, S0: MState, secs: number): MState { if (S0.over) return S0; const S = copy(S0); for (let i = 0; i < secs && !S.over; i += 1) step(M, S); return S; }
export function hold(M: Meltdown, S0: MState, secs: number): MState { if (S0.over) return S0; const label = HOLDS.find((h) => h[0] === secs)?.[1] || `Hold ${secs} s`; return advance(M, log(copy(S0), `▸ ${label}.`), secs); }

export const hidden = (a: MAction, S: MState) => !!(a.hideUntil && !a.hideUntil.every((f) => S.flags[f])) || !!(a.hideIf && a.hideIf.some((f) => S.flags[f]));
export const available = (a: MAction, S: MState, resMet: ResMet = () => true) => !S.over && !(a.threat && S.threat[a.threat]) && (a.req || []).every((f) => S.flags[f]) && !(a.not || []).some((f) => S.flags[f]) && !(a.once !== false && S.used[a.id]) && !(a.res && !resMet(a.res));
export const visible = (M: Meltdown, S: MState) => M.actions.filter((a) => !hidden(a, S));
function trust(S: MState, t?: Record<string, number>) { for (const [k, v] of Object.entries(t || {})) S.trust[k] = Math.max(0, Math.min(5, (S.trust[k] || 0) + v)); }

export function act(M: Meltdown, S0: MState, a: MAction, resMet: ResMet = () => true): MState {
  if (S0.over || !available(a, S0, resMet) || hidden(a, S0)) return S0;
  const S = copy(S0); S.used[a.id] = 1; log(S, `▸ ${a.label}`);
  if (a.end) { S.boundary += 1; log(S, `✕ ${a.end}`, 'bad'); finishIn(M, S, 'boundary', a.end); return S; }
  if (a.stop) { S.stops += 1; log(S, `✕ ${a.stop}`, 'bad'); trust(S, a.trust); return advance(M, S, a.cost || 0); }
  if (a.need) { const miss = Object.keys(a.need).filter((k) => S.n[k]!.state !== a.need![k]); if (miss.length) { log(S, `✕ ${a.needText || `Not possible yet: ${miss.map((k) => node(M, k).label).join(', ')} isn’t ${a.need[miss[0]!]!.toUpperCase()}.`}`, 'bad'); delete S.used[a.id]; return advance(M, S, Math.ceil((a.cost || 0) / 3)); } }
  if (a.self) S.self += 1; if (a.threat && !S.threat[a.threat]) S.threat[a.threat] = 'maya';
  for (const f of a.set || []) S.flags[f] = 1; for (const f of a.unset || []) delete S.flags[f];
  for (const k of a.activate || []) { S.n[k]!.standby = false; S.n[k]!.p = 0; }
  for (const [k, d] of Object.entries(a.rewire || {})) S.n[k]!.deps = d.map((g) => g.slice());
  for (const k of a.fix || []) { S.n[k]!.broken = null; S.n[k]!.p = 0; }
  for (const [k, v] of Object.entries(a.brk || {})) S.n[k]!.broken = v;
  for (const k of a.isolate || []) S.n[k]!.contained = true;
  for (const [k, v] of Object.entries(a.blip || {})) S.blip[k] = S.t + v;
  for (const [k, c] of Object.entries(a.setIf || {})) if (S.n[k]!.state === c[0]) S.flags[c[1]] = 1;
  let text = a.text; for (const [k, c] of Object.entries(a.ifState || {})) text += ` ${S.n[k]!.state === c[0] ? c[1] : c[2]}`;
  trust(S, a.trust); log(S, text, a.tone || (a.good ? 'ok' : ''));
  return advance(M, S, a.cost || 0);
}
export const calcRight = (c: NonNullable<MAction['calc']>, v: number) => Number.isFinite(v) && Math.abs(v - c.answer) <= (c.tol != null ? c.tol : Math.abs(c.answer) * 0.02);
/** A calculation before an action: right runs it; wrong costs its penalty (20 story-seconds unless stated) and the clock moves on. */
export function answerCalc(M: Meltdown, S0: MState, a: MAction, v: number, resMet: ResMet = () => true): { state: MState; right: boolean } {
  const c = a.calc!; if (S0.over) return { state: S0, right: false };
  if (calcRight(c, v)) return { state: act(M, log(copy(S0), `🧮 ${c.q} → ${v}${c.unit ? ` ${c.unit}` : ''} ✓`, 'ok'), a, resMet), right: true };
  const pen = c.penalty || 20; return { state: advance(M, log(copy(S0), `🧮 Wrong: ${v}${c.unit ? ` ${c.unit}` : ''} (−${pen} s of story time)`, 'bad'), pen), right: false };
}

function finishIn(M: Meltdown, S: MState, why: 'boundary' | 'mission' | 'end', detail?: string): void {
  if (S.over) return; S.over = true;
  const crit = M.nodes.filter((n) => n.crit); const critOk = crit.every((n) => S.n[n.id]!.state === 'ok'); const proven = (M.win.proven || []).every((f) => S.flags[f]);
  let outcome: Outcome, head: string;
  if (why === 'boundary') { outcome = 'fail'; head = '✕ Mission failure · boundary crossed'; }
  else if (why === 'mission') { outcome = 'fail'; head = '✕ Mission failure · mission-critical service lost'; }
  else if (!critOk) { outcome = 'fail'; head = `✕ Mission failure · still dark at ${clockAt(M, S.t)}`; }
  else if (proven) { outcome = 'proven'; head = '✓ Meltdown contained · proven where the people are'; }
  else { outcome = 'partial'; head = '◐ Survived · not proven where the people are'; }
  const darkPct = crit.reduce((t, n) => t + Math.min(1, S.dark[n.id]! / (n.maxDown || 1)), 0) / Math.max(1, crit.length);
  const extraMax = (M.win.bonus || []).length, extras = (M.win.bonus || []).filter((f) => S.flags[f]).length;
  const tv = Object.values(S.trust); const trustAvg = tv.reduce((a, b) => a + b, 0) / Math.max(1, tv.length);
  let score = (outcome === 'proven' ? 62 : outcome === 'partial' ? 42 : 12) + (1 - darkPct) * 20 + (extraMax ? (10 * extras) / extraMax : 10) + trustAvg - 5 * S.stops;
  let grade: Grade = outcome === 'fail' ? (score >= 40 ? 'C' : 'D') : score >= 92 ? 'S' : score >= 80 ? 'A' : score >= 62 ? 'B' : 'C';
  const tally = { prevented: 0, saved: 0, maya: 0, lost: 0 }; for (const t of M.threats || []) { const st = S.threat[t.id] || (S.threatOn[t.id] ? 'lost' : null); if (st) tally[st] += 1; }
  const total = tally.prevented + tally.saved + tally.maya + tally.lost, without = tally.prevented + tally.saved;
  if (M.inherit && outcome !== 'fail') { score = (outcome === 'proven' ? 50 : 38) + (30 * without) / Math.max(1, total) + (1 - darkPct) * 12 + trustAvg - 6 * S.self - 5 * S.stops; grade = outcome === 'proven' && S.self === 0 && without === total ? 'S' : score >= 80 ? 'A' : score >= 62 ? 'B' : 'C'; }
  S.end = { outcome, why, head, text: detail || M.outcomes?.[outcome] || '', grade, score, darkPct, extras, extraMax, without, threatTotal: total };
}
export const endNow = (M: Meltdown, S0: MState): MState => { if (S0.over) return S0; const S = copy(S0); finishIn(M, S, 'end'); return S; };

export interface MeltdownRecord { best: Outcome; grade: Grade; runs: number; last: Outcome; first: Outcome; firstGrade: Grade; firstWhy: 'boundary' | 'mission' | 'end' }
const RANK: Record<Outcome, number> = { fail: 0, partial: 1, proven: 2 }; const GR = 'SABCD';
export function recordMeltdown(prev: MeltdownRecord | undefined, S: MState): MeltdownRecord { const e = S.end!;
  return { best: prev && RANK[prev.best] > RANK[e.outcome] ? prev.best : e.outcome, grade: prev && GR.indexOf(prev.grade) < GR.indexOf(e.grade) ? prev.grade : e.grade, runs: (prev?.runs || 0) + 1, last: e.outcome, first: prev ? prev.first : e.outcome, firstGrade: prev ? prev.firstGrade : e.grade, firstWhy: prev ? prev.firstWhy : S.boundary ? 'boundary' : e.why }; }
export const nodeLabel = (M: Meltdown, id: string) => node(M, id).label;
