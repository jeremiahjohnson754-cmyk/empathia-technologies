/**
 * SIGNAL Story Director (founder directive 18 Nov 2026 11:59, Part II §4; 16:41: "actually done this time … you made a bunch of videos
 * and never used them for the story mode"). A chapter as an interactive film: the canon chapter, in canon order, staged as shots —
 * the generated footage made for it, its art with camera moves, its lines spoken by the recorded takes where they exist, and its
 * decisions and conversations inside the frame — with playable scenes (interludes) where the story hands control to the player.
 *
 * Canon rule: every word a character says is the canon's. What the Director adds is staging and play: act cards, the playable scenes'
 * instructions, and the props in them, and the page marks those as additions. A choice made here is the same record as in the written
 * story and the played scenes (story.ts), so the three ways of experiencing a chapter never disagree.
 */
import type { Item } from '../story.js';
import { FOOTAGE } from '../cinematic.js';

export type FilmShot =
  | { kind: 'title' }
  | { kind: 'act'; title: string; sub: string | null }
  | { kind: 'footage'; item: number; src: string; note: string }
  | { kind: 'panel'; item: number }
  | { kind: 'beat'; item: number }
  | { kind: 'decision'; item: number; id: string }
  | { kind: 'talk'; item: number; id: string }
  | { kind: 'play'; item: number; id: string }
  | { kind: 'credits' };

/** A playable scene: control passes to the player before canon item `before`, whose text must contain `anchor` (checked by the unit
 *  test, so a canon edit cannot silently move a scene). Finishing it records `evidence`, the canon's own label for what it establishes. */
export interface Interlude { id: string; before: number; anchor: string; title: string; goal: string; evidence: string }
export const INTERLUDES: Record<string, Interlude[]> = {
  s01e01: [
    { id: 'measure', before: 17, anchor: 'measurement microphone taped to a broom handle', title: 'Measure the ten seats', goal: 'Walk the broom-handle microphone to each of the ten hollow seats and record what it hears, before anything is changed.', evidence: 'ten seats, before' },
    { id: 'cards', before: 20, anchor: 'comment cards', title: 'Plot the cards', goal: 'Put two years of comment cards on the seating chart, then say where the complaints cluster and when they began.', evidence: 'EV-CASE001-01' },
    { id: 'board', before: 26, anchor: 'Four small panels, one per test', title: 'Four explanations', goal: 'Run one test for each explanation. Keep the one the evidence cannot rule out.', evidence: 'The Room · suspected' },
    { id: 'filltest', before: 43, anchor: 'fill turned down 6 decibels', title: 'Prove yourself wrong', goal: 'Turn the fill down 6 dB and record seat 13 again. If the notches do not get shallower, the reflection idea is wrong.', evidence: 'EV-S01E01-08' },
    { id: 'verify', before: 62, anchor: 'measurements after the re-aim', title: 'Measure again, after the re-aim', goal: 'Record the same seats again now that the fill is re-aimed, and the balcony front too. Write down what got worse as well as what got better.', evidence: 'condition 1 · empty room' },
  ],
};
/** A line that is only true after a particular choice is shown only then (the canon's next panel assumes its canonical option). */
export const ONLY_IF: Record<string, { item: number; who: string; decision: string; letter: string }[]> = {
  s01e01: [{ item: 57, who: 'Ana', decision: 'BR-S01E01-03', letter: 'C' }],
};
/** Seasons whose chapters open as films: every season — a chapter without footage or takes plays its art and captions. */
export const filmFor = (id: string) => /^s\d\de\d\d$/.test(id);

export function buildFilm(chapterId: string, items: Item[]): FilmShot[] {
  const shots: FilmShot[] = [{ kind: 'title' }]; const plays = INTERLUDES[chapterId] || []; const foot = FOOTAGE[chapterId] || [];
  items.forEach((it, i) => {
    for (const p of plays.filter((x) => x.before === i)) shots.push({ kind: 'play', item: i, id: p.id });
    if (it.type === 'heading') shots.push({ kind: 'act', title: it.text, sub: it.sub });
    for (const f of foot.filter((x) => x.before === i)) shots.push({ kind: 'footage', item: i, src: f.src, note: f.note });   // every reviewed clip is placed, whatever item it opens on
    if (it.type !== 'panel' && it.type !== 'beat' && it.type !== 'decision' && it.type !== 'talk') return;
    if (it.type === 'decision') shots.push({ kind: 'decision', item: i, id: it.id });
    else if (it.type === 'talk') shots.push({ kind: 'talk', item: i, id: it.id });
    else shots.push({ kind: it.type, item: i });
  });
  // an act card with nothing after it before the next act is dropped
  const out = shots.filter((s, k) => !(s.kind === 'act' && (k + 1 >= shots.length || shots[k + 1]!.kind === 'act')));
  // footage is checked too: every clip of the chapter appears once (validateFilm)
  out.push({ kind: 'credits' });
  return out;
}
const textOf = (it: Item | undefined): string => { if (!it) return ''; const r = it as unknown as Record<string, unknown>; return [r['alt'], r['caption'], r['text']].filter((x) => typeof x === 'string').join(' '); };
/** The graph checks (directive §4.5): every decision and conversation reachable exactly once, every playable scene anchored to the canon
 *  text it stages, every conditional line tied to a real option, a title first and credits last, no empty act. */
export function validateFilm(chapterId: string, items: Item[], shots: FilmShot[]): string[] {
  const bad: string[] = [];
  if (shots[0]?.kind !== 'title') bad.push('no title shot first'); if (shots[shots.length - 1]?.kind !== 'credits') bad.push('no credits last');
  for (const [i, it] of items.entries()) {
    if (it.type === 'decision' || it.type === 'talk') { const n = shots.filter((s) => (s.kind === 'decision' || s.kind === 'talk') && s.item === i).length; if (n !== 1) bad.push(`${it.id}: in the film ${n} times`); }
  }
  for (const p of INTERLUDES[chapterId] || []) { if (!textOf(items[p.before]).includes(p.anchor)) bad.push(`${p.id}: canon item ${p.before} no longer says “${p.anchor}”`); if (shots.filter((s) => s.kind === 'play' && s.id === p.id).length !== 1) bad.push(`${p.id}: not placed once`); }
  for (const o of ONLY_IF[chapterId] || []) { const d = items.find((x) => x.type === 'decision' && x.id === o.decision) as Extract<Item, { type: 'decision' }> | undefined; if (!d || !d.options.some((x) => x.letter === o.letter)) bad.push(`only-if ${o.item}: ${o.decision}/${o.letter} does not exist`); const p = items[o.item]; if (!p || p.type !== 'panel' || !p.bubbles.some((b) => b.who === o.who)) bad.push(`only-if ${o.item}: no line by ${o.who}`); }
  for (const f of FOOTAGE[chapterId] || []) if (shots.filter((s) => s.kind === 'footage' && s.src === f.src).length !== 1) bad.push(`footage ${f.src}: not placed once`);
  shots.forEach((s, k) => { if (s.kind === 'act' && (k + 1 >= shots.length || shots[k + 1]!.kind === 'act' || shots[k + 1]!.kind === 'credits')) bad.push(`empty act at ${k}`); });
  return bad;
}

/** What the film remembers that the story engine does not: where the viewer is, and what each playable scene established. Kept in this
 *  browser only (the page says so). A replay ("sandbox") never writes here or to the story record. */
export interface PlayRecord { done: boolean; assisted: boolean; evidence: string; caveat: string | null; data: Record<string, number | string | boolean | string[]> }
export interface FilmState { at: number; plays: Record<string, PlayRecord>; sound: boolean | null }
const KEY = 'empathia.signal.film.v1';
export const emptyFilm = (): FilmState => ({ at: 0, plays: {}, sound: null });
export function loadFilm(id: string): FilmState {
  try { const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, Partial<FilmState>>; const f = all[id];
    if (f && typeof f === 'object') return { at: Number.isInteger(f.at) && (f.at as number) >= 0 ? (f.at as number) : 0, plays: f.plays && typeof f.plays === 'object' ? f.plays as Record<string, PlayRecord> : {}, sound: typeof f.sound === 'boolean' ? f.sound : null }; }
  catch { /* a blocked or broken store is a fresh start */ }
  return emptyFilm();
}
export function saveFilm(id: string, f: FilmState): void { try { const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, FilmState>; all[id] = f; localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* the film still plays */ } }
