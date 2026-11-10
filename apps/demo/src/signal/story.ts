/**
 * The SIGNAL story engine: pure functions over the founder's canon (packages/signal-canon), which the page fetches a chapter at a time.
 * The canon is never edited here; this file only decides what a reader has reached, what a choice does, and what is remembered.
 *
 * Rules taken from the canon itself: a decision is a gate (the story waits for it); an option whose `fail` carries a reason is a failed
 * attempt, shown with its reason and tried again; hints cost merit (each hint's `keep`); the clock can be extended or turned off, and a
 * timeout is recorded, never a dead end. Progress lives in this browser only (localStorage); it is practice, never a credential.
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

export interface Choice { letter: string; tries: number; failed: string[]; hints: number; timedOut: boolean }
export interface ChapterState { choices: Record<string, Choice>; talks: Record<string, number>; found: string[]; done: boolean }
export type Clock = 'on' | 'extended' | 'off';
export interface Progress { v: 1; chapters: Record<string, ChapterState>; clock: Clock; gates: boolean; last: string | null }
export const emptyChapter = (): ChapterState => ({ choices: {}, talks: {}, found: [], done: false });
export const emptyProgress = (): Progress => ({ v: 1, chapters: {}, clock: 'on', gates: true, last: null });
const KEY = 'empathia.signal.story.v1';
export function load(): Progress { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null') as Progress | null; if (p && p.v === 1 && p.chapters && typeof p.chapters === 'object') return { ...emptyProgress(), ...p }; } catch { /* a blocked or corrupted store reads as a fresh start */ } return emptyProgress(); }
export function save(p: Progress): void { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* reading still works without storage */ } }

/** A decision is passed once an option that does not fail has been chosen. */
export const passed = (s: ChapterState, id: string): boolean => !!s.choices[id]?.letter;
/** How many items the reader has reached: everything up to and including the first decision not yet passed. */
export function reached(items: readonly Item[], s: ChapterState, gates: boolean): number {
  if (!gates) return items.length;
  for (let i = 0; i < items.length; i += 1) { const it = items[i]!; if (it.type === 'decision' && !passed(s, it.id)) return i + 1; }
  return items.length;
}
export type Outcome = { kind: 'failed'; reason: string; option: Option } | { kind: 'passed'; option: Option } | { kind: 'refused'; why: string };
/** Choose an option. A failing option is recorded as an attempt and the gate stays shut; a passed decision cannot be re-chosen (replay resets the chapter). */
export function choose(s: ChapterState, d: Extract<Item, { type: 'decision' }>, letter: string, meta: { hints?: number; timedOut?: boolean } = {}): { state: ChapterState; outcome: Outcome } {
  const o = d.options.find((x) => x.letter === letter); if (!o) return { state: s, outcome: { kind: 'refused', why: 'That is not one of the options.' } };
  if (passed(s, d.id)) return { state: s, outcome: { kind: 'refused', why: 'This decision is already made. Replay the chapter to choose again.' } };
  const prev = s.choices[d.id] || { letter: '', tries: 0, failed: [], hints: 0, timedOut: false };
  const next: Choice = { ...prev, tries: prev.tries + 1, hints: Math.max(prev.hints, meta.hints || 0), timedOut: prev.timedOut || !!meta.timedOut };
  if (o.fail) { next.failed = prev.failed.includes(letter) ? prev.failed : [...prev.failed, letter]; return { state: { ...s, choices: { ...s.choices, [d.id]: next } }, outcome: { kind: 'failed', reason: o.fail, option: o } }; }
  next.letter = letter; return { state: { ...s, choices: { ...s.choices, [d.id]: next } }, outcome: { kind: 'passed', option: o } };
}
export function answerTalk(s: ChapterState, id: string, option: number): ChapterState { return id in s.talks ? s : { ...s, talks: { ...s.talks, [id]: option } }; }
export function find(s: ChapterState, id: string): ChapterState { return s.found.includes(id) ? s : { ...s, found: [...s.found, id] }; }

export interface Tally { merit: number; trust: Record<string, number>; decisions: number; made: number; firstTry: number; failedAttempts: number; hints: number; timedOut: number; canonical: number; found: number; discoveries: number; talks: number; talked: number }
/** What a chapter's choices add up to, computed from the canon's own weights. Hints scale the merit of the decision they were used on. */
export function tally(items: readonly Item[], s: ChapterState): Tally {
  const t: Tally = { merit: 0, trust: {}, decisions: 0, made: 0, firstTry: 0, failedAttempts: 0, hints: 0, timedOut: 0, canonical: 0, found: 0, discoveries: 0, talks: 0, talked: 0 };
  const add = (tr?: Record<string, number>) => { for (const [k, v] of Object.entries(tr || {})) t.trust[k] = (t.trust[k] || 0) + v; };
  for (const it of items) {
    if (it.type === 'decision') { t.decisions += 1; const c = s.choices[it.id]; if (!c) continue; t.failedAttempts += c.failed.length; t.hints += c.hints; if (c.timedOut) t.timedOut += 1;
      for (const L of c.failed) { const f = it.options.find((o) => o.letter === L); if (f) { t.merit += f.weight.merit || 0; add(f.weight.trust); } }
      if (c.letter) { const o = it.options.find((x) => x.letter === c.letter)!; t.made += 1; if (c.tries === 1) t.firstTry += 1; if (o.canonical) t.canonical += 1;
        const keep = c.hints > 0 ? (it.hints[Math.min(c.hints, it.hints.length) - 1]?.keep ?? 1) : 1; const m = o.weight.merit || 0; t.merit += m > 0 ? Math.round(m * keep) : m; add(o.weight.trust); } }
    else if (it.type === 'talk') { t.talks += 1; const a = s.talks[it.id]; if (a !== undefined && it.options[a]) { t.talked += 1; add(it.options[a]!.trust); } }
    else if (it.type === 'discovery') { t.discoveries += 1; if (s.found.includes(it.id)) t.found += 1; }
  }
  return t;
}
export const complete = (items: readonly Item[], s: ChapterState): boolean => items.every((it) => it.type !== 'decision' || passed(s, it.id));
export const seconds = (d: { timer_s: number }, clock: Clock): number | null => (clock === 'off' || !d.timer_s ? null : clock === 'extended' ? d.timer_s * 2 : d.timer_s);
export const BANDS = [['Beginner', [1, 2, 3]], ['Intermediate', [4, 5, 6]], ['Advanced', [7, 8, 9]], ['Mastery', [10, 11, 12]]] as const;
/** Where to go next: the chapter after this one in canon order. */
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
