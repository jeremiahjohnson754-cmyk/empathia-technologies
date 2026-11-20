/**
 * SIGNAL live incidents (Service Mode): the rules, without rendering. Restored 11 November 2026 to the founder's build package
 * (docs/04-engine-specs.md §7 and the reference runtime, app.js openIncident); where the two disagree the reference wins.
 *
 * Before this, the demonstrator's runner let an action be used again and again, applied a refusal ("stop") without its time or a
 * boundary count, did not keep lost evidence lost, did not clamp trust to 0–5, did not honour `not` flags or the evidence an
 * incident starts with, ran a wrongly answered calculation as if it were right (with a penalty), had no Start, and kept no record of
 * the best and first outcome. Every function here is pure; the 121 incidents' own solver paths (qa/incident-paths.json) are replayed
 * against it in tests/unit/signal-incidents.test.mjs.
 */

export interface Calc { q: string; answer: number; unit?: string; tol?: number; hint?: string; penalty?: number; f?: string }
export interface Action { id: string; label: string; cost?: number; text?: string; tone?: string; why?: string; good?: boolean; gain?: string[]; lose?: string[]; set?: string[]; unset?: string[]; req?: string[]; not?: string[]; once?: boolean; hideIf?: string[]; hideUntil?: string[]; stop?: string; end?: string; status?: Record<string, string>; trust?: Record<string, number>; badges?: Array<[string, string]>; costIf?: Array<[string, number]>; calc?: Calc }
export interface Incident { id: string; title: string; domain: string; source?: string; priority: string; page: string; brief: string; briefing: string; note?: string; opening: string; clock: number; deadline: string; status: Record<string, { label: string; v: string; ok: string }>; trust: Record<string, number>; evidence: Record<string, { l: string; s: string }>; actions: Action[]; win: { restored: string[]; proven: string[] }; outcomes: Record<string, string>; heads?: Record<string, string>; expert: string[]; startEv?: string[] }
export type Outcome = 'proven' | 'partial' | 'fail';
export type EndWhy = 'declared' | 'clock' | 'boundary';
export interface LogLine { t: number; text: string; tone: '' | 'ok' | 'warn' | 'bad' }
export interface State {
  flags: Record<string, 1>; ev: Record<string, 1>; lost: Record<string, 1>; status: Record<string, string>; trust: Record<string, number>; used: Record<string, 1>;
  log: LogLine[]; left: number; total: number; timed: boolean; boundary: number; boundaryText: string | null; over: boolean; end: null | { outcome: Outcome; why: EndWhy; head: string; text: string };
}
export interface IncidentRecord { best: Outcome; runs: number; first: Outcome; firstWhy: EndWhy }

export const TRUST_WORDS = ['lost', 'shaken', 'wary', 'steady', 'good', 'strong'] as const;
const RANK: Record<Outcome, number> = { fail: 0, partial: 1, proven: 2 };
const clamp = (v: number) => Math.max(0, Math.min(5, v));

/** The state before Start and at Start: statuses and trust as the incident gives them, its starting evidence, the clock (doubled when
 *  relaxed; with the timer off it still counts but never ends the incident, as the reference's Countdown does). */
export function begin(inc: Incident, factor: number): State {
  const total = inc.clock * (factor || 1);
  const s: State = { flags: {}, ev: {}, lost: {}, status: Object.fromEntries(Object.entries(inc.status).map(([k, v]) => [k, v.v])), trust: { ...inc.trust }, used: {}, log: [], left: total, total, timed: !!factor, boundary: 0, boundaryText: null, over: false, end: null };
  for (const e of inc.startEv || []) s.ev[e] = 1;
  return log(s, inc.opening, 'warn');
}
const copy = (s: State): State => ({ ...s, flags: { ...s.flags }, ev: { ...s.ev }, lost: { ...s.lost }, status: { ...s.status }, trust: { ...s.trust }, used: { ...s.used }, log: s.log.slice() });
function log(s: State, text: string, tone: LogLine['tone']): State { s.log.push({ t: s.total - s.left, text, tone }); return s; }

export const hidden = (a: Action, s: State) => !!(a.hideUntil && !a.hideUntil.every((f) => s.flags[f])) || !!(a.hideIf && a.hideIf.some((f) => s.flags[f]));
export const available = (a: Action, s: State) => !s.over && (a.req || []).every((f) => s.flags[f]) && !(a.not || []).some((f) => s.flags[f]) && !(a.once !== false && s.used[a.id]);
export const visible = (inc: Incident, s: State) => inc.actions.filter((a) => !hidden(a, s));
export function costOf(a: Action, s: State): number { for (const [f, c] of a.costIf || []) if (s.flags[f]) return c; return a.cost || 0; }

/** Time passing on its own (the reference's Countdown ticks every second). */
export function tick(inc: Incident, s: State, secs: number): State {
  if (s.over) return s; const n = copy(s); n.left = s.left - secs;
  if (n.left <= 0 && n.timed) { n.left = 0; log(n, `⏱ Time is up: ${inc.deadline.toLowerCase()}.`, 'bad'); return finish(inc, n, 'clock'); }
  return n;
}
function spend(inc: Incident, s: State, secs: number): State { return secs ? tick(inc, s, secs) : s; }

/** One action, in the reference's order: mark it used; a refusal logs, counts a boundary test, moves trust, spends its time and stops;
 *  an action that crosses a boundary ends the incident; otherwise evidence is gained (never what was lost) and lost for good, flags set
 *  and unset, statuses and trust change, the result is logged, and only then its time is spent. */
export function act(inc: Incident, s0: State, a: Action): State {
  if (s0.over || !available(a, s0) || hidden(a, s0)) return s0;
  const s = copy(s0); s.used[a.id] = 1; const cost = costOf(a, s);
  log(s, `▸ ${a.label}`, '');
  if (a.stop) { log(s, `✕ ${a.stop}`, 'bad'); s.boundary += 1; trust(s, a.trust); return spend(inc, s, cost); }
  if (a.end) { log(s, `✕ ${a.end}`, 'bad'); s.boundaryText = a.end; return finish(inc, s, 'boundary'); }
  for (const e of a.gain || []) if (!s.lost[e]) s.ev[e] = 1;
  for (const e of a.lose || []) if (s.ev[e] || !s.lost[e]) { delete s.ev[e]; s.lost[e] = 1; }
  for (const f of a.set || []) s.flags[f] = 1;
  for (const f of a.unset || []) delete s.flags[f];
  Object.assign(s.status, a.status || {}); trust(s, a.trust);
  log(s, a.text || '', (a.tone as LogLine['tone']) || (a.lose?.length ? 'warn' : 'ok'));
  if (a.lose?.length) log(s, `Evidence lost: ${a.lose.map((e) => inc.evidence[e]?.l || e).join(', ')}`, 'bad');
  return spend(inc, s, cost);
}
function trust(s: State, t?: Record<string, number>) { for (const [k, v] of Object.entries(t || {})) s.trust[k] = clamp((s.trust[k] || 0) + v); }

/** A calculation gate: within its tolerance (2% of the answer when none is given) the action runs; a wrong answer costs its penalty
 *  (10 s unless stated) and the action does not run. Cancelling costs nothing. */
export const calcRight = (c: Calc, v: number) => Number.isFinite(v) && Math.abs(v - c.answer) <= (c.tol != null ? c.tol : Math.abs(c.answer) * 0.02);
export function answerCalc(inc: Incident, s0: State, a: Action, v: number): { state: State; right: boolean } {
  const c = a.calc!; if (s0.over) return { state: s0, right: false };
  if (calcRight(c, v)) { const s = log(copy(s0), `🧮 ${c.q} → ${v}${c.unit ? ` ${c.unit}` : ''} ✓`, 'ok'); return { state: act(inc, s, a), right: true }; }
  const pen = c.penalty || 10; const s = log(copy(s0), `🧮 Wrong: ${v}${c.unit ? ` ${c.unit}` : ''}. Recheck the formula. (−${pen}s)`, 'bad');
  return { state: spend(inc, s, pen), right: false };
}

/** The end: a boundary crossed fails; not restored fails (clock or declared); restored and proven; restored but not proven. */
export function finish(inc: Incident, s0: State, why: EndWhy): State {
  if (s0.over) return s0; const s = copy(s0); s.over = true;
  const restored = inc.win.restored.every((k) => s.status[k] === inc.status[k]!.ok); const proven = inc.win.proven.every((f) => s.flags[f]);
  let outcome: Outcome, head: string;
  if (why === 'boundary') { outcome = 'fail'; head = '✕ Incident failed · safety or authority boundary'; }
  else if (!restored) { outcome = 'fail'; head = why === 'clock' ? '✕ Incident failed · the clock ran out' : '✕ Incident failed · declared resolved while still broken'; }
  else if (proven) { outcome = 'proven'; head = '✓ Service restored · fix proven where the users are'; }
  else { outcome = 'partial'; head = '◐ Service restored · root cause not proven'; }
  if (inc.heads?.[outcome] && why !== 'boundary') head = inc.heads[outcome]!;
  let text = why === 'boundary' ? s.boundaryText || '' : inc.outcomes[outcome] || '';
  if (why === 'clock' && restored) text += ' The clock ran out, but service was running. Next time, declare it once you have your proof.';
  s.end = { outcome, why, head, text: text.trim() }; return s;
}
export const declare = (inc: Incident, s: State) => finish(inc, s, 'declared');

export function debrief(inc: Incident, s: State) {
  const restored = inc.win.restored.every((k) => s.status[k] === inc.status[k]!.ok); const proven = inc.win.proven.every((f) => s.flags[f]);
  const tv = Object.values(s.trust); const avg = tv.reduce((a, b) => a + b, 0) / Math.max(1, tv.length);
  return {
    service: restored ? 'Restored' : 'Down', proof: proven ? 'Proven' : 'Unproven', evidence: `${Object.keys(s.ev).length} kept · ${Object.keys(s.lost).length} lost`,
    trust: TRUST_WORDS[Math.round(clamp(avg))]!, boundaries: `${s.boundary}${s.end?.why === 'boundary' ? ' + crossed' : ' tested'}`, clockLeft: s.timed ? fmtS(s.left) : 'timer off',
    lessons: inc.actions.filter((a) => s.used[a.id] && a.why).map((a) => `${a.good ? '✓' : '✕'} ${a.label} — ${a.why}`),
  };
}
export function fmtS(sec: number): string { const t = Math.max(0, Math.ceil(sec)); const m = Math.floor(t / 60), r = t % 60; return `${m}:${r < 10 ? '0' : ''}${r}`; }

/** A run is recorded: the best outcome is kept (proven over partial over fail); the first outcome and why it ended never change. */
export function recordIncident(prev: IncidentRecord | undefined, outcome: Outcome, why: EndWhy): IncidentRecord {
  return { best: prev && RANK[prev.best] > RANK[outcome] ? prev.best : outcome, runs: (prev?.runs || 0) + 1, first: prev ? prev.first : outcome, firstWhy: prev ? prev.firstWhy : why };
}
export function readIncident(x: unknown): IncidentRecord | null {
  const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>; const o = (v: unknown): v is Outcome => v === 'proven' || v === 'partial' || v === 'fail';
  return o(r['best']) && o(r['first']) && (r['firstWhy'] === 'declared' || r['firstWhy'] === 'clock' || r['firstWhy'] === 'boundary') && Number.isInteger(r['runs']) && (r['runs'] as number) >= 1 && (r['runs'] as number) <= 9999 ? { best: r['best'], runs: r['runs'] as number, first: r['first'], firstWhy: r['firstWhy'] } : null;
}
