/**
 * SIGNAL boss levels (Episode 11), restored 12 November 2026 to the founder's build package: docs/04-engine-specs.md §12 and the reference
 * runtime chal_boss.js (the reference wins). One run = a signal trace, five challenges at the season's level, two or three boundary calls
 * and, from Season 8, a commission: ask, scope, design, cost. Fail anything — a wrong tap, a wrong call, a failed check, an empty clock —
 * and the run is over: start again from the top. Clearing it opens the next season. Pure functions; the runner owns the clock and the screen.
 */
export interface CallOpt { t: string; ok: boolean; why: string }
export interface AskQ { id: string; q: string; a: string; kind: 'must' | 'good' | 'waste' | 'trap'; req?: string | null; after?: string | null; why?: string }
export interface ScopeItem { s: string; c: string; why: string }
export interface DesignOpt { n: string; v?: Record<string, number>; meets?: string[]; note?: string; best?: boolean; bad?: string }
export interface DesignLimit { k: string; label: string; unit: string; why?: string; max?: number; min?: number; maxk?: string; mult?: number; scale?: number; short?: string }
export interface CostLine { t: string; q: number; each: number; kind?: 'eq' | 'lab' | 'run' | 'later'; u?: string }
export interface VeOpt { t: string; save: number; hurts?: string | null; why?: string; note?: string; pick?: boolean }
export type Step =
  | { type: 'trace'; title?: string; brief?: string; items: string[]; why?: string; secs?: number; win?: string }
  | { type: 'chal'; mode: 'hear' | 'see' | 'reach' | 'build' | 'record'; chal: string; title?: string; brief?: string; twist?: string; win?: string; timeout?: string; secs?: number }
  | { type: 'call'; q: string; opts: CallOpt[]; timeout?: string; secs?: number }
  | { type: 'ask'; title?: string; brief?: string; client?: string; slots: number; qs: AskQ[]; win?: string; secs?: number }
  | { type: 'scope'; title?: string; brief?: string; groups: string[]; items: ScopeItem[]; allow?: number; win?: string; secs?: number }
  | { type: 'design'; title?: string; brief?: string; needs: Array<{ id: string; label: string; why?: string }>; limits: DesignLimit[]; slots: Array<{ id: string; label: string; opts: DesignOpt[] }>; units?: Record<string, string>; f?: string[]; win?: string; secs?: number }
  | { type: 'cost'; title?: string; brief?: string; lines: CostLine[]; budget: number; tax?: number; cont?: number; tol?: number; ve?: VeOpt[]; ask?: string; rule?: string; worked?: string; f?: string; win?: string; secs?: number };
export interface Boss { se: number; lv: number; title: string; style: string; stakes: string; win: string; lose?: string; hard?: string; steps: Step[] }
export interface BossRecord { tries: number; passed: boolean; best: number; at?: number; firstRun?: number }

export const ICON: Record<string, string> = { hear: '👂', see: '🎥', reach: '💡', build: '🧰', record: '⏺', trace: '🔎', call: '⚖', ask: '📋', scope: '🔑', design: '📐', cost: '💲' };
export const WORD: Record<string, string> = { hear: 'HEAR IT', see: 'SEE IT', reach: 'REACH IT', build: 'BUILD IT', record: 'RECORD IT', trace: 'TRACE IT', call: 'THE CALL', ask: 'ASK IT', scope: 'SCOPE IT', design: 'DESIGN IT', cost: 'COST IT' };
export const DONE: Record<string, string> = { chal: 'STAGE CLEARED', trace: 'SIGNAL TRACED', call: 'THE RIGHT CALL', ask: 'NEEDS CAPTURED', scope: 'SCOPE ISSUED', design: 'DESIGN ISSUED', cost: 'ESTIMATE ACCEPTED' };
const DEF: Record<string, number[]> = { call: [0, 25, 20, 16, 12], trace: [0, 60, 50, 42, 35], chal: [0, 300, 260, 220, 190], ask: [0, 170, 160, 150, 140], scope: [0, 120, 115, 110, 110], design: [0, 280, 280, 280, 300], cost: [0, 240, 240, 240, 230] };
export const stepMode = (s: Step) => (s.type === 'chal' ? s.mode : s.type);
export const hasCommission = (B: Boss) => B.steps.some((s) => s.type === 'ask' || s.type === 'scope' || s.type === 'design' || s.type === 'cost');
/** Seconds for a stage: its own figure or the level's, times the timer factor (relaxed ×2); 0 when timers are off. */
export function stageSecs(B: Boss, s: Step, factor: number): number { if (!factor) return 0; return (s.secs || DEF[s.type]![B.lv]!) * factor; }
/** The clock is "low" (red) inside the last 15% or 10 s, whichever is longer. */
export const lowClock = (left: number, secs: number) => left <= Math.max(10, secs * 0.15);
export type Outcome = { ok: true; msg?: string } | { ok: false; title: string; why: string };
export const fail = (title: string, why: string): Outcome => ({ ok: false, title, why });

// ---- record
export const beginRun = (r: BossRecord | undefined): BossRecord => ({ ...(r || { tries: 0, passed: false, best: 0 }), tries: (r?.tries || 0) + 1 });
export const reached = (r: BossRecord, stage: number): BossRecord => ({ ...r, best: Math.max(r.best, stage) });
export const won = (r: BossRecord, B: Boss, now: number): BossRecord => ({ ...r, passed: true, best: B.steps.length, at: now, firstRun: r.firstRun ?? r.tries });
export function readBoss(v: unknown): BossRecord | null { if (!v || typeof v !== 'object') return null; const o = v as Record<string, unknown>;
  if (typeof o['tries'] !== 'number' || typeof o['best'] !== 'number') return null; return { tries: Math.max(0, Math.floor(o['tries'])), passed: o['passed'] === true, best: Math.max(0, Math.floor(o['best'])), ...(typeof o['at'] === 'number' ? { at: o['at'] } : {}), ...(typeof o['firstRun'] === 'number' ? { firstRun: o['firstRun'] } : {}) }; }

// ---- trace: tap the points in the order the signal passes through them
export function traceTap(s: Extract<Step, { type: 'trace' }>, done: number, k: number): { done: number; out?: Outcome } {
  if (k === done) { const d = done + 1; return d === s.items.length ? { done: d, out: { ok: true, msg: s.win || 'Source to destination, in order. Now you know where to look first.' } } : { done: d }; }
  return { done, out: fail('Lost the trace', `${done ? `After “${s.items[done - 1]}” the signal goes to “` : 'The signal starts at “'}${s.items[done]}”, not “${s.items[k]}”. ${s.why || 'Trace in order: the first failure point is the last place the signal is good.'}`) };
}
export const callPick = (o: CallOpt): Outcome => (o.ok ? { ok: true, msg: o.why } : fail('Wrong call', o.why));

// ---- ask: a question budget, must-ask questions, follow-ups that open once their parent is asked, and questions that end the run
export interface AskState { left: number; asked: string[]; done: boolean }
export const askStart = (s: Extract<Step, { type: 'ask' }>): AskState => ({ left: s.slots, asked: [], done: false });
export const askOpen = (s: Extract<Step, { type: 'ask' }>, a: AskState) => s.qs.filter((q) => !a.asked.includes(q.id) && (!q.after || a.asked.includes(q.after)));
export const askCaptured = (s: Extract<Step, { type: 'ask' }>, a: AskState) => s.qs.filter((q) => a.asked.includes(q.id) && q.req).map((q) => q.req!);
export function askClose(s: Extract<Step, { type: 'ask' }>, a: AskState): { state: AskState; out: Outcome } {
  const miss = s.qs.filter((q) => q.kind === 'must' && !a.asked.includes(q.id)), state = { ...a, done: true };
  if (miss.length) return { state, out: fail('Needs missed', `The meeting is over and you never asked: “${miss[0]!.q}” ${miss[0]!.why || ''}${miss.length > 1 ? ` (And ${miss.length - 1} more must-ask question${miss.length > 2 ? 's' : ''}.)` : ''}`) };
  return { state, out: { ok: true, msg: s.win || 'Everything that decides the design is on the table — in the client’s own words.' } };
}
export function askQuestion(s: Extract<Step, { type: 'ask' }>, a: AskState, id: string): { state: AskState; out?: Outcome } {
  const q = s.qs.find((x) => x.id === id); if (a.done || !q || !askOpen(s, a).includes(q)) return { state: a };
  if (q.kind === 'trap') return { state: { ...a, done: true }, out: fail('Wrong question', q.why || '') };
  const next = { ...a, asked: [...a.asked, q.id], left: a.left - 1 }; return next.left <= 0 ? askClose(s, next) : { state: next };
}

// ---- scope: every line to its owner; some levels allow one slip
export function scopeIssue(s: Extract<Step, { type: 'scope' }>, picks: Array<string | undefined>): Outcome {
  const bad = s.items.filter((it, i) => picks[i] !== it.c);
  if (bad.length > (s.allow || 0)) return fail('Scope wrong', bad.slice(0, 2).map((it) => `“${it.s}” → ${it.c}. ${it.why}`).join(' ') + (bad.length > 2 ? ` (${bad.length} lines wrong in all.)` : ''));
  return { ok: true, msg: (s.win || 'Every line has an owner. Nothing falls between two trades.') + (bad.length ? ` One slip: “${bad[0]!.s}” → ${bad[0]!.c}.` : '') };
}

// ---- design: one option per block; live meters; every requirement met, every constraint inside its limit, no boundary crossed
type Design = Extract<Step, { type: 'design' }>;
export const designChosen = (s: Design, sel: Record<string, number>) => s.slots.map((sl) => (sel[sl.id] != null ? sl.opts[sel[sl.id]!] : undefined)).filter((o): o is DesignOpt => !!o);
export function designTotals(s: Design, sel: Record<string, number>) { const t: Record<string, number> = {}; for (const o of designChosen(s, sel)) for (const [a, v] of Object.entries(o.v || {})) t[a] = (t[a] || 0) + v; return t; }
export function designMet(s: Design, sel: Record<string, number>) { const m = new Set<string>(); for (const o of designChosen(s, sel)) for (const n of o.meets || []) m.add(n); return m; }
export const limitValue = (L: DesignLimit, t: Record<string, number>) => (t[L.k] || 0) * (L.scale || 1);
export const limitCap = (L: DesignLimit, t: Record<string, number>) => (L.min != null ? L.min : L.maxk ? (t[L.maxk] || 0) * (L.mult || 1) : L.max!);
export const limitOk = (L: DesignLimit, t: Record<string, number>) => (L.min != null ? limitValue(L, t) >= L.min : limitValue(L, t) <= limitCap(L, t));
export const usd = (n: number) => `${n < 0 ? '−$' : '$'}${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
export const bnum = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US');
export const fmtLimit = (L: DesignLimit, v: number) => (L.unit === '$' ? usd(v) : `${bnum(v)} ${L.unit}`);
export function designIssue(s: Design, sel: Record<string, number>): Outcome {
  const chosen = designChosen(s, sel); if (chosen.length < s.slots.length) return fail('Design rejected', 'Every block needs a choice before the design is issued.');
  const badO = chosen.find((o) => o.bad); if (badO) return fail('Boundary crossed', badO.bad!);
  const t = designTotals(s, sel), m = designMet(s, sel), why: string[] = [];
  for (const L of s.limits) if (!limitOk(L, t)) why.push(`${L.label}: ${fmtLimit(L, limitValue(L, t))}${L.min != null ? ' — it needs at least ' : ' — over the limit of '}${fmtLimit(L, limitCap(L, t))}. ${L.why || ''}`);
  for (const n of s.needs) if (!m.has(n.id)) why.push(`Requirement not met — ${n.label}. ${n.why || ''}`);
  if (why.length) return fail('Design rejected', why.slice(0, 3).join(' ') + (why.length > 3 ? ` (${why.length} problems in all.)` : ''));
  return { ok: true, msg: s.win || 'Every requirement met, every constraint inside its limit, nothing that isn’t yours.' };
}

// ---- cost: T = (E × (1 + tax) + L) × (1 + contingency) + running × years + later one-offs; then value engineering inside the budget
type Cost = Extract<Step, { type: 'cost' }>;
export function estimate(s: Cost) { const S = { eq: 0, lab: 0, run: 0, later: 0 }; for (const l of s.lines) S[l.kind || 'eq'] += l.q * l.each; return { S, T: (S.eq * (1 + (s.tax || 0)) + S.lab) * (1 + (s.cont || 0)) + S.run + S.later }; }
export function worked(s: Cost) { const E = estimate(s); return s.worked || `(${usd(E.S.eq)}${s.tax ? ` × ${1 + s.tax}` : ''} + ${usd(E.S.lab)}) × ${1 + (s.cont || 0)}${E.S.run ? ` + ${usd(E.S.run)}` : ''}${E.S.later ? ` + ${usd(E.S.later)}` : ''} = ${usd(E.T)}`; }
/** Read a typed total the way the reference does: dollar signs, commas and spaces ignored. null when it isn't a number. */
export function parseTotal(v: string): number | null { const t = v.replace(/[$,\s]/g, ''); if (!/^-?\d+(\.\d+)?$/.test(t)) return null; return Number(t); }
export function costEstimate(s: Cost, v: number): Outcome { const E = estimate(s); if (Math.abs(v - E.T) > (s.tol || 50)) return fail('Estimate wrong', `Your total: ${usd(v)}. The estimate is ${worked(s)}. A wrong number in front of a board is worse than no number.`); return { ok: true }; }
export const afterSavings = (s: Cost, on: boolean[]) => estimate(s).T - (s.ve || []).reduce((t, o, i) => t + (on[i] ? o.save : 0), 0);
export function costPresent(s: Cost, on: boolean[]): Outcome {
  const cut = (s.ve || []).find((o, i) => on[i] && o.hurts); if (cut) return fail('Requirement cut', cut.why || 'That cuts a requirement.');
  const n = afterSavings(s, on); if (n > s.budget + 0.5) return fail('Over budget', `Still ${usd(n - s.budget)} over the budget. The board can only approve what fits — find savings that don’t cut a requirement.`);
  return { ok: true, msg: s.win || 'Inside the budget, every requirement intact, every assumption written down.' };
}
/** Stage-level time-out messages, as the reference words them. */
export function timeoutOutcome(s: Step): Outcome {
  switch (s.type) {
    case 'chal': return fail('Out of time', s.timeout || 'The clock ran out on this stage. On the day, the clock is part of the spec.');
    case 'call': return fail('No call made', s.timeout || 'You froze. When nobody decides, the room decides for you — usually badly.');
    case 'trace': return fail('Out of time', 'The trace wasn’t finished in time. Under a countdown, the order you check things in is the whole method.');
    case 'ask': return fail('Out of time', 'The client had to leave. The meeting is the length it is — ask the questions that decide the design first.');
    case 'scope': return fail('Out of time', 'The scope wasn’t issued in time. A scope nobody finishes is a gap somebody else falls into.');
    case 'design': return fail('Out of time', 'The design wasn’t issued in time. The deadline was part of the brief.');
    default: return fail('Out of time', 'The estimate wasn’t ready in time. The board meets whether your spreadsheet is finished or not.');
  }
}
