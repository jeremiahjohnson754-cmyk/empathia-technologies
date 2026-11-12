/**
 * The SIGNAL story engine: pure functions over the founder's canon (packages/signal-canon), which the page fetches a chapter at a time.
 * The canon is never edited here; this file only decides what a reader has reached, what a choice does, and what is remembered.
 *
 * Rules, from the founder's build package (`docs/04-engine-specs.md` §1, and its reference runtime, which wins where they differ):
 *  - A decision is a gate: the story waits until a choice is RECORDED. Any option records, the failing ones too. A failing option is a
 *    costly call: it is kept, with its negative merit and trust, and the story goes on with it. The reader may tap another option,
 *    which replaces the record (as the reference does); the first choice is kept separately, because ratings read first choices.
 *  - A timed decision that runs out is recorded as TIMEOUT (merit −2, severity 2, no trust) and the card turns to review: tapping an
 *    option shows what it would have meant without recording it, and Replay removes the record and starts the clock again.
 *  - Hints are revealed one at a time and state the credit kept. The credit is applied to positive merit here; the reference build does
 *    not apply it (its own open issue OI-ENG-02), which would make the label untrue.
 *  - Clock: on (canon seconds), extended (doubled) or off. Progress lives in this browser only; it is practice, never a credential.
 * Before 11 November 2026 this engine made a reader choose again after a failing option until a passing one; that was not the canon's
 * behaviour and stored progress of that shape is read as the first and final choices it records.
 */
export interface Bubble { side: string; who: string; kind: 'speech' | 'radio' | 'phone' | 'hollow' | 'whisper'; text: string }
export interface Option { letter: string; label: string; result: string; consequence: string; chips: string[]; badges: { kind: string; text: string }[]; canonical: boolean; fail: string | null; requires_loadout: Record<string, number> | null; weight: { merit?: number; sev?: number; trust?: Record<string, number> } }
export type Item =
  | { type: 'heading'; text: string; sub: string | null }
  | { type: 'panel'; alt: string; characters: { id: string; pose: string; expr: string }[]; bubbles: Bubble[]; narration: string[]; caption: string | null; flags: string[]; kind: string | null; tab: string | null; system_view: boolean; evidence: { state: string; label: string }[]; confidence: number | null }
  | { type: 'note'; role: string; text: string; opens?: { kind: string; id: string }; case?: string }
  | { type: 'quest'; title: string; kind: string; level: string; party: string[]; stakes: string; clock: string; reward: string; objectives: { key: string; text: string }[]; rumor: string }
  | { type: 'discovery'; id: string; teaser: string; title: string; body: string; thread: string; who: string[] | null }
  | { type: 'beat'; mood: string; where: string | null; lines: { who: string; pose: string; expr: string; text: string }[] }
  | { type: 'decision'; id: string; prompt: string; happening: string; clock: string | null; known: string[]; unknown: string[]; risk: string; timer_s: number; timeout: string[] | null; hints: { id: string; keep: number; text: string }[]; note: string; lab: string | null; lab_label: string | null; options: Option[] }
  | { type: 'twist'; title: string; body: string; test_kind: string; test_id: string; label: string | null }
  | { type: 'talk'; id: string; who: string; prompt: string; options: { label: string; who: string; pose: string; expr: string; reply: string; trust: Record<string, number> }[] }
  | { type: 'history'; title: string; body: string; flag: string; when: string | null; lab: string | null }
  | { type: 'mount'; kind: string; id: string; label: string | null; gate: string | null };
export interface Chapter { chapter: { id: string; kicker: string; title: string; pill: string; sub: string; status: string; flags: string[]; accent: string }; items: Item[] }
export interface ChapterRef { id: string; season: number; episode: number; title: string; kicker: string; sub: string; level: string | null; tier: string; flags: number; panels: number; decisions: number; timed: number; quest: string | null; boss: boolean; meltdown: boolean }
export interface StoryIndex { stats: Record<string, number>; seasons: Record<string, string>; cast: Record<string, string>; chapters: ChapterRef[] }

export const TIMEOUT = 'TIMEOUT';
/** `letter` is the option recorded now, or TIMEOUT; `first` is the first one recorded; `changes` counts later replacements. */
export interface Choice { letter: string; first: string; changes: number; hints: number }
export interface ChapterState { choices: Record<string, Choice>; talks: Record<string, number>; found: string[]; done: boolean }
export type Clock = 'on' | 'extended' | 'off';
/** A quiz's record, as the reference keeps it: best score, number of questions, and the first score (ratings read first attempts). */
export interface QuizRecord { best: number; total: number; first: number }
export interface Progress { v: 2; chapters: Record<string, ChapterState>; clock: Clock; gates: boolean; last: string | null; quizzes: Record<string, QuizRecord>; skips: Record<string, 1>; drills: Record<string, DrillRecord> }
/** One soft or hard gate tier as the reader sees it. */
export const TIER_WORD: Record<Tier, string> = { hard: 'Core: the story goes on when you finish this', soft: 'Recommended: the pages wait for you, or skip it for now', opt: 'Optional: do it now or come back; it stays here' };
export const emptyChapter = (): ChapterState => ({ choices: {}, talks: {}, found: [], done: false });
export const emptyProgress = (): Progress => ({ v: 2, chapters: {}, clock: 'on', gates: true, last: null, quizzes: {}, skips: {}, drills: {} });
const KEY = 'empathia.signal.story.v1';
type OldChoice = { letter?: unknown; tries?: unknown; failed?: unknown; hints?: unknown; timedOut?: unknown; first?: unknown; changes?: unknown };
/** Read one stored choice of either shape; anything else reads as no choice. */
export function readChoice(x: unknown): Choice | null {
  const c = (x && typeof x === 'object' ? x : {}) as OldChoice; const hints = Number.isInteger(c.hints) && (c.hints as number) >= 0 ? Math.min(c.hints as number, 9) : 0;
  const ok = (v: unknown): v is string => typeof v === 'string' && /^([A-F]|TIMEOUT)$/.test(v);
  if (ok(c.first) && ok(c.letter)) return { letter: c.letter, first: c.first, changes: Number.isInteger(c.changes) && (c.changes as number) >= 0 ? (c.changes as number) : 0, hints };
  // the earlier shape: failed attempts, then the passing letter. Its first choice was the first failed letter, if any.
  const failed = Array.isArray(c.failed) ? (c.failed as unknown[]).filter(ok) : [];
  if (ok(c.letter)) return { letter: c.letter, first: failed[0] || c.letter, changes: failed.length, hints };
  if (failed.length) return { letter: failed[failed.length - 1]!, first: failed[0]!, changes: failed.length - 1, hints };
  return null;
}
export function load(): Progress {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null') as (Omit<Progress, 'v'> & { v: number }) | null;
    if (p && (p.v === 1 || p.v === 2) && p.chapters && typeof p.chapters === 'object') {
      const chapters: Record<string, ChapterState> = {};
      for (const [id, c] of Object.entries(p.chapters)) { if (!c || typeof c !== 'object') continue; const choices: Record<string, Choice> = {};
        for (const [d, x] of Object.entries(c.choices || {})) { const r = readChoice(x); if (r) choices[d] = r; }
        chapters[id] = { choices, talks: c.talks && typeof c.talks === 'object' ? c.talks : {}, found: Array.isArray(c.found) ? c.found : [], done: !!c.done }; }
      const quizzes: Record<string, QuizRecord> = {}; for (const [id, r] of Object.entries((p as { quizzes?: unknown }).quizzes && typeof (p as { quizzes?: unknown }).quizzes === 'object' ? (p as { quizzes: Record<string, unknown> }).quizzes : {})) { const q = readQuiz(r); if (q) quizzes[id] = q; }
      const skips: Record<string, 1> = {}; for (const k of Object.keys((p as { skips?: Record<string, unknown> }).skips || {})) if (/^(quiz|lesson|drill|incident|lab):[\w.-]{1,40}$/.test(k)) skips[k] = 1;
      const drills: Record<string, DrillRecord> = {}; for (const [id, r] of Object.entries((p as { drills?: unknown }).drills && typeof (p as { drills?: unknown }).drills === 'object' ? (p as { drills: Record<string, unknown> }).drills : {})) { const d = readDrill(r); if (d && /^[\w.-]{1,40}$/.test(id)) drills[id] = d; }
      return { ...emptyProgress(), drills, clock: p.clock === 'extended' || p.clock === 'off' ? p.clock : 'on', gates: p.gates !== false, last: typeof p.last === 'string' ? p.last : null, chapters, quizzes, skips }; } }
  catch { /* a blocked or corrupted store reads as a fresh start */ }
  return emptyProgress();
}
export function save(p: Progress): void { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* reading still works without storage */ } }

export function readQuiz(x: unknown): QuizRecord | null { const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>; const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : -1);
  const total = n(r['total']), best = n(r['best']), first = n(r['first']); return total >= 1 && total <= 50 && best >= 0 && best <= total && first >= 0 && first <= best ? { best, total, first } : null; }
/** A drill's record in the story, the reference's shape (recordDrill): passed once stays passed, tries count, the first never changes.
 *  The same rule as packages/ui/src/drills.ts recordDrill, kept here so the story's stored progress has one reader. */
export interface DrillRecord { passed: boolean; tries: number; first: boolean }
export function readDrill(x: unknown): DrillRecord | null { const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>; return typeof r['passed'] === 'boolean' && typeof r['first'] === 'boolean' && Number.isInteger(r['tries']) && (r['tries'] as number) >= 1 && (r['tries'] as number) <= 9999 ? { passed: r['passed'], tries: r['tries'] as number, first: r['first'] } : null; }
export function recordDrillTry(p: Progress, id: string, pass: boolean): Progress { const prev = p.drills[id]; return { ...p, drills: { ...p.drills, [id]: { passed: !!(prev?.passed || pass), tries: (prev?.tries || 0) + 1, first: prev ? prev.first : !!pass } } }; }
/** What gate checks read: quiz records, skips and drill records. */
export type Done = Pick<Progress, 'quizzes' | 'skips'> & { drills?: Progress['drills'] };
/** Record a finished quiz: the best score is kept and the first score never changes. */
export function recordQuiz(p: Progress, id: string, right: number, total: number): Progress {
  const prev = p.quizzes[id]; const r = Math.max(0, Math.min(right, total)); return { ...p, quizzes: { ...p.quizzes, [id]: { best: Math.max(prev?.best ?? 0, r), total, first: prev ? prev.first : r } } };
}

// ------------------------------------------------------------------------------------------------- pieces inside a chapter, and gates
export interface QuizQ { q: string; o: string[]; a: number; why: string; f?: string; tier?: number }
export interface Quiz { title: string; domain?: string; qs: QuizQ[] }
export interface Lesson { title: string; domain: string; sum?: string; cards: string[]; quiz: string; flag?: string; src?: string }
export type Tier = 'hard' | 'soft' | 'opt';
export interface Gate { index: number; kind: string; id: string; tier: Tier; twist: boolean; core: boolean }
export interface Pieces { gates: Gate[]; quizzes: Record<string, Quiz>; lessons: Record<string, Lesson>; drills?: Record<string, { id: string; type: string; [k: string]: unknown }> }
/** The kinds this build plays in place. A gate of any other kind is shown and does not hold the story, and the page says so. */
export const PLAYABLE: ReadonlySet<string> = new Set(['decision', 'quiz', 'lesson', 'drill']);
export const gateKey = (g: Pick<Gate, 'kind' | 'id'>) => `${g.kind}:${g.id}`;
export function gateDone(g: Gate, s: ChapterState, p: Done, pieces: Pieces): boolean {
  if (g.kind === 'decision') return passed(s, g.id); if (g.kind === 'quiz') return !!p.quizzes[g.id];
  if (g.kind === 'lesson') { const L = pieces.lessons[g.id]; return !!(L && p.quizzes[L.quiz]); }
  if (g.kind === 'drill') return !!p.drills?.[g.id];   // reference gate.js: a drill gate is done once a try is recorded, passed or not
  return false;
}
/** Cleared: done, or a soft gate skipped. */
export const gateCleared = (g: Gate, s: ChapterState, p: Done, pieces: Pieces) => gateDone(g, s, p, pieces) || (g.tier === 'soft' && !!p.skips[gateKey(g)]);
/** The first gate that holds the story: hard or soft, playable here, not cleared. */
export function blocking(s: ChapterState, p: Done, pieces: Pieces): Gate | null {
  return [...pieces.gates].sort((a, b) => a.index - b.index).find((g) => g.tier !== 'opt' && PLAYABLE.has(g.kind) && !gateCleared(g, s, p, pieces)) || null;
}
export function skip(p: Progress, g: Gate): Progress { return g.tier === 'soft' ? { ...p, skips: { ...p.skips, [gateKey(g)]: 1 } } : p; }
/** Gates that count toward a chapter: hard and soft, of the kinds played here. */
export function gateCount(s: ChapterState, p: Done, pieces: Pieces): { cleared: number; total: number } {
  const gs = pieces.gates.filter((g) => g.tier !== 'opt' && PLAYABLE.has(g.kind)); return { cleared: gs.filter((g) => gateCleared(g, s, p, pieces)).length, total: gs.length };
}

/** A decision is passed once a choice is recorded: any option, or the clock running out. */
export const passed = (s: ChapterState, id: string): boolean => !!s.choices[id]?.letter;
/** How many items the reader has reached: everything up to and including the first gate that holds the story. Without the chapter's
 *  gate list (still loading, or offline), the decisions alone hold it. */
export function reached(items: readonly Item[], s: ChapterState, gates: boolean, ctx?: { pieces: Pieces; progress: Done }): number {
  if (!gates) return items.length;
  if (ctx) { const b = blocking(s, ctx.progress, ctx.pieces); return b ? b.index + 1 : items.length; }
  for (let i = 0; i < items.length; i += 1) { const it = items[i]!; if (it.type === 'decision' && !passed(s, it.id)) return i + 1; }
  return items.length;
}
type Decision = Extract<Item, { type: 'decision' }>;
/** canonical: the professional call; costly: a failing option, kept; neutral: it works, not the best. */
export type Verdict = 'canonical' | 'neutral' | 'costly';
export const verdictOf = (o: Option): Verdict => (o.fail ? 'costly' : o.canonical ? 'canonical' : 'neutral');
export type Outcome = { kind: 'recorded'; option: Option; verdict: Verdict; changed: boolean } | { kind: 'refused'; why: string };
/** Record a choice. Any option records and opens the gate. Tapping another option later replaces it; the first is kept. After a timeout nothing records until Replay. */
export function choose(s: ChapterState, d: Decision, letter: string, meta: { hints?: number } = {}): { state: ChapterState; outcome: Outcome } {
  const o = d.options.find((x) => x.letter === letter); if (!o) return { state: s, outcome: { kind: 'refused', why: 'That is not one of the options.' } };
  const prev = s.choices[d.id];
  if (prev?.letter === TIMEOUT) return { state: s, outcome: { kind: 'refused', why: 'The clock ran out on this decision. Replay it to make a choice count.' } };
  if (prev?.letter === letter) return { state: s, outcome: { kind: 'recorded', option: o, verdict: verdictOf(o), changed: false } };
  const next: Choice = prev ? { ...prev, letter, changes: prev.changes + 1, hints: Math.max(prev.hints, meta.hints || 0) } : { letter, first: letter, changes: 0, hints: meta.hints || 0 };
  return { state: { ...s, choices: { ...s.choices, [d.id]: next } }, outcome: { kind: 'recorded', option: o, verdict: verdictOf(o), changed: !!prev } };
}
/** The clock ran out before a choice: recorded as TIMEOUT, a failing call. Does nothing if a choice is already recorded. */
export function timeOut(s: ChapterState, d: Decision, hints = 0): ChapterState {
  if (s.choices[d.id]) return s; return { ...s, choices: { ...s.choices, [d.id]: { letter: TIMEOUT, first: TIMEOUT, changes: 0, hints } } };
}
/** Replay one decision: its record is removed and the clock starts again. */
export function replayDecision(s: ChapterState, id: string): ChapterState { if (!s.choices[id]) return s; const choices = { ...s.choices }; delete choices[id]; return { ...s, choices }; }
/** What a recorded choice weighs. TIMEOUT: merit −2, severity 2, no trust (the reference's values). */
export function weightOf(d: Decision, c: Choice): { merit: number; sev: number; trust: Record<string, number>; verdict: Verdict; option: Option | null } {
  if (c.letter === TIMEOUT) return { merit: -2, sev: 2, trust: {}, verdict: 'costly', option: null };
  const o = d.options.find((x) => x.letter === c.letter); if (!o) return { merit: 0, sev: 1, trust: {}, verdict: 'neutral', option: null };
  const m = o.weight.merit || 0; const keep = c.hints > 0 ? (d.hints[Math.min(c.hints, d.hints.length) - 1]?.keep ?? 1) : 1;
  return { merit: m > 0 ? Math.round(m * keep) : m, sev: o.weight.sev || 1, trust: o.weight.trust || {}, verdict: verdictOf(o), option: o };
}
export const SEVERITY: Record<number, string> = { 1: 'Minor call', 2: 'Significant', 3: 'Major: this changes the room' };
/** The reference's line under a weight. */
export function weightLine(v: Verdict, sev: number): string {
  if (v === 'costly') return sev >= 3 ? 'This will cost you — and people saw it.' : 'This costs you something.';
  if (v === 'canonical') return sev >= 3 ? 'People will remember this for a long time.' : sev === 2 ? 'People noticed.' : 'A small call. It still counts.';
  return 'Not wrong, not the best. Nobody will say anything — this time.';
}
export function answerTalk(s: ChapterState, id: string, option: number): ChapterState { return id in s.talks ? s : { ...s, talks: { ...s.talks, [id]: option } }; }
export function find(s: ChapterState, id: string): ChapterState { return s.found.includes(id) ? s : { ...s, found: [...s.found, id] }; }

export interface Tally { merit: number; trust: Record<string, number>; decisions: number; made: number; canonical: number; neutral: number; costly: number; timedOut: number; changed: number; hints: number; found: number; discoveries: number; talks: number; talked: number }
/** What a chapter's choices add up to, from the canon's own weights, as the reference counts them: the choices recorded now. */
export function tally(items: readonly Item[], s: ChapterState): Tally {
  const t: Tally = { merit: 0, trust: {}, decisions: 0, made: 0, canonical: 0, neutral: 0, costly: 0, timedOut: 0, changed: 0, hints: 0, found: 0, discoveries: 0, talks: 0, talked: 0 };
  const add = (tr?: Record<string, number>) => { for (const [k, v] of Object.entries(tr || {})) t.trust[k] = (t.trust[k] || 0) + v; };
  for (const it of items) {
    if (it.type === 'decision') { t.decisions += 1; const c = s.choices[it.id]; if (!c) continue; const w = weightOf(it, c);
      t.made += 1; t[w.verdict] += 1; if (c.letter === TIMEOUT) t.timedOut += 1; if (c.changes) t.changed += 1; t.hints += c.hints; t.merit += w.merit; add(w.trust); }
    else if (it.type === 'talk') { t.talks += 1; const a = s.talks[it.id]; if (a !== undefined && it.options[a]) { t.talked += 1; add(it.options[a]!.trust); } }
    else if (it.type === 'discovery') { t.discoveries += 1; if (s.found.includes(it.id)) t.found += 1; }
  }
  return t;
}
export const complete = (items: readonly Item[], s: ChapterState, ctx?: { pieces: Pieces; progress: Done }): boolean =>
  items.every((it) => it.type !== 'decision' || passed(s, it.id)) && (!ctx || !blocking(s, ctx.progress, ctx.pieces));
/** The reference's verdict on a chapter's choices, said before the debrief. */
export function chapterVerdict(t: Pick<Tally, 'decisions' | 'made' | 'canonical' | 'costly'>): string {
  if (t.costly === 0 && t.canonical === t.decisions) return 'You ran this episode the way a professional would. The room felt it.';
  if (t.costly >= 2) return 'Rough episode. The fixes still happened — but you spent trust getting there. That’s how people learn; it’s also why they remember.';
  if (t.costly === 1) return 'Mostly steady, one costly call. Look at it again: what did you know at that moment?';
  return 'Solid. Not every call was the best one, and nobody got hurt by it.';
}
export interface Echo { id: string; prompt: string; verdict: Verdict; timedOut: boolean; label: string; consequence: string }
/** What the previous chapter's recorded choices were, to open the next chapter with (the reference's "previously"). */
export function echoes(items: readonly Item[], s: ChapterState | undefined): { made: Echo[]; merit: number; trust: Record<string, number> } {
  const made: Echo[] = []; let merit = 0; const trust: Record<string, number> = {};
  for (const it of items) { if (it.type !== 'decision') continue; const c = s?.choices[it.id]; if (!c) continue; const w = weightOf(it, c);
    made.push({ id: it.id, prompt: it.prompt, verdict: w.verdict, timedOut: c.letter === TIMEOUT, label: w.option?.label || '', consequence: w.option?.consequence || '' });
    merit += w.merit; for (const [k, v] of Object.entries(w.trust)) trust[k] = (trust[k] || 0) + v; }
  return { made, merit, trust };
}
export const trustLine = (trust: Record<string, number>): string => Object.entries(trust).filter(([, v]) => v !== 0).map(([k, v]) => `${k} ${v > 0 ? `+${v}` : v}`).join(', ');
export const seconds = (d: { timer_s: number }, clock: Clock): number | null => (clock === 'off' || !d.timer_s ? null : clock === 'extended' ? d.timer_s * 2 : d.timer_s);
export const BANDS = [['Beginner', [1, 2, 3]], ['Intermediate', [4, 5, 6]], ['Advanced', [7, 8, 9]], ['Mastery', [10, 11, 12]]] as const;
/** Where to go next: the chapter after this one in canon order. */
/** The chapter before this one in canon order. */
export const prevOf = (ix: StoryIndex, id: string): ChapterRef | null => { const i = ix.chapters.findIndex((c) => c.id === id); return i > 0 ? ix.chapters[i - 1]! : null; };
export const nextOf = (ix: StoryIndex, id: string): ChapterRef | null => { const i = ix.chapters.findIndex((c) => c.id === id); return i >= 0 && i + 1 < ix.chapters.length ? ix.chapters[i + 1]! : null; };
/** Where to pick up: the chapter last opened if it is unfinished, else the first unfinished chapter after it, else the first unfinished one. */
export const resume = (ix: StoryIndex, p: Progress): ChapterRef => { const i = p.last ? ix.chapters.findIndex((c) => c.id === p.last) : -1;
  if (i >= 0 && !p.chapters[p.last!]?.done) return ix.chapters[i]!;
  return ix.chapters.slice(i + 1).find((c) => !p.chapters[c.id]?.done) || ix.chapters.find((c) => !p.chapters[c.id]?.done) || ix.chapters[0]!; };
/** Canon text marks emphasis with **bold** and *italic*; split it without interpreting anything else. */
export function emphasis(text: string): { t: string; b?: boolean; i?: boolean }[] {
  const out: { t: string; b?: boolean; i?: boolean }[] = []; const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g; let at = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { if (m.index > at) out.push({ t: text.slice(at, m.index) }); out.push(m[1] !== undefined ? { t: m[1], b: true } : { t: m[2]!, i: true }); at = m.index + m[0].length; }
  if (at < text.length) out.push({ t: text.slice(at) }); return out;
}
