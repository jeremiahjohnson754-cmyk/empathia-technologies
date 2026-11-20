/**
 * SIGNAL played as scenes (design: docs/signal/CINEMATIC_STORY_MODE_DESIGN.md). Pure functions that turn a canon chapter into a
 * timeline of shots the player can perform: each panel becomes a live shot drawn from the canon's own art with a camera move and
 * timed lines; conversations become close shots; decisions and replies become choices inside the frame; discoveries become things
 * hidden in a shot that the reader finds and picks up; notes, quests, twists and history become cards between shots.
 *
 * Nothing is invented: every line, option and discovery is the canon's. What this file adds is staging only — order is the canon's
 * order, timings come from the length of the words, camera moves and hotspot places are deterministic from identifiers.
 */
import type { Chapter, ChapterState, Item } from './story.js';
import { passed } from './story.js';

export interface SceneLine { who: string | null; text: string; kind: 'narration' | 'speech' | 'radio' | 'phone' | 'whisper' | 'hollow' | 'caption'; side?: string; pose?: string; expr?: string; at: number; dur: number }
export interface Hotspot { id: string; discovery: string; label: string; x: number; y: number; w: number; h: number; from: number; to: number }
export type CardItem = Extract<Item, { type: 'note' | 'quest' | 'twist' | 'history' | 'mount' | 'heading' }>;
export type Shot =
  | { n: number; kind: 'live'; item: number; panel: number; camera: Camera; flashback: boolean; tab: string | null; alt: string; lines: SceneLine[]; hotspots: Hotspot[]; dur: number }
  | { n: number; kind: 'close'; item: number; panel: number; where: string | null; mood: string; lines: SceneLine[]; hotspots: Hotspot[]; dur: number }
  | { n: number; kind: 'choice'; item: number; panel: number; decision: string }
  | { n: number; kind: 'reply'; item: number; panel: number; talk: string }
  | { n: number; kind: 'card'; item: number; panel: number; cards: number[] };
export const CAMERAS = ['push-in', 'pull-out', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'hold'] as const;
export type Camera = (typeof CAMERAS)[number];
export interface Scene { chapter: string; shots: Shot[]; dur: number; panels: number; hotspots: number; choices: number }

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** How long a line is on screen: a reading pace of about 2.6 words a second, never less than 1.6 s. */
export const lineSeconds = (text: string): number => Math.max(1.6, Math.round((text.trim().split(/\s+/).length / 2.6) * 10) / 10);
const clean = (t: string) => t.replace(/\s*\[COMIC\]\s*$/, '');
function time(lines: Omit<SceneLine, 'at' | 'dur'>[]): { lines: SceneLine[]; dur: number } { let at = 0.6; const out = lines.map((l) => { const dur = lineSeconds(l.text); const r = { ...l, at: Math.round(at * 10) / 10, dur }; at += dur + 0.3; return r; }); return { lines: out, dur: Math.round(Math.max(3, at + 0.6) * 10) / 10 }; }

export function buildScene(ch: Chapter): Scene {
  const shots: Shot[] = []; let panel = -1; let lastStage = -1; const pending: { id: string; teaser: string }[] = [];
  const place = (list: { id: string; teaser: string }[], dur: number): Hotspot[] => list.map((d, i) => { const h = hash(d.id); const w = 0.14; const hgt = 0.2;
    return { id: `HS-${d.id}`, discovery: d.id, label: d.teaser, x: Math.round((0.08 + ((h % 1000) / 1000) * (0.84 - w)) * 1000) / 1000, y: Math.round((0.38 + (((h >>> 10) % 1000) / 1000) * (0.5 - hgt)) * 1000) / 1000, w, h: hgt, from: Math.min(0.5 + i, Math.max(0, dur - 1)), to: dur }; });
  ch.items.forEach((it, item) => {
    const n = shots.length;
    if (it.type === 'panel') { panel += 1; const t = time([...it.narration.map((x) => ({ who: null, text: clean(x), kind: 'narration' as const })), ...it.bubbles.map((b) => ({ who: b.who, text: b.text, kind: b.kind, side: b.side })), ...(it.caption ? [{ who: null, text: it.caption, kind: 'caption' as const }] : [])]);
      shots.push({ n, kind: 'live', item, panel, camera: CAMERAS[hash(`${ch.chapter.id}:${panel}`) % CAMERAS.length]!, flashback: it.kind === 'flashback', tab: it.tab, alt: it.alt, lines: t.lines, hotspots: place(pending.splice(0), t.dur), dur: t.dur }); lastStage = n; }
    else if (it.type === 'beat') { const t = time(it.lines.map((l) => ({ who: l.who, text: l.text, kind: 'speech' as const, pose: l.pose, expr: l.expr }))); shots.push({ n, kind: 'close', item, panel: Math.max(panel, 0), where: it.where, mood: it.mood, lines: t.lines, hotspots: place(pending.splice(0), t.dur), dur: t.dur }); lastStage = n; }
    else if (it.type === 'decision') shots.push({ n, kind: 'choice', item, panel: Math.max(panel, 0), decision: it.id });
    else if (it.type === 'talk') shots.push({ n, kind: 'reply', item, panel: Math.max(panel, 0), talk: it.id });
    else if (it.type === 'discovery') { const d = { id: it.id, teaser: it.teaser }; const s = lastStage >= 0 ? shots[lastStage]! : null;
      if (s && (s.kind === 'live' || s.kind === 'close') && s.n === shots.length - 1) s.hotspots.push(...place([d], s.dur)); else pending.push(d); }
    else { const prev = shots[shots.length - 1]; if (prev && prev.kind === 'card') prev.cards.push(item); else shots.push({ n, kind: 'card', item, panel: Math.max(panel, 0), cards: [item] }); }
  });
  // a discovery with no shot after it is found on the last staged shot, so nothing the canon hides can be missed for lack of a place
  if (pending.length && lastStage >= 0) { const s = shots[lastStage]!; if (s.kind === 'live' || s.kind === 'close') s.hotspots.push(...place(pending.splice(0), s.dur)); }
  const staged = shots.filter((s): s is Extract<Shot, { kind: 'live' | 'close' }> => s.kind === 'live' || s.kind === 'close');
  return { chapter: ch.chapter.id, shots, dur: Math.round(staged.reduce((t, s) => t + s.dur, 0) * 10) / 10, panels: panel + 1, hotspots: staged.reduce((t, s) => t + s.hotspots.length, 0), choices: shots.filter((s) => s.kind === 'choice' || s.kind === 'reply').length };
}
/** The hotspots a reader can use at this moment of a shot. */
export const hotspotsAt = (s: Shot, t: number): Hotspot[] => (s.kind === 'live' || s.kind === 'close' ? s.hotspots.filter((h) => t >= h.from && t <= h.to) : []);
/** The line being spoken at this moment (the last one that has started and not ended), or null in a pause. */
export const lineAt = (s: Shot, t: number): SceneLine | null => (s.kind === 'live' || s.kind === 'close' ? [...s.lines].reverse().find((l) => t >= l.at && t < l.at + l.dur) || null : null);
/** May the player move past this shot? A choice holds the scene until the canon's decision is passed; a reply until it is given. */
export function mayPass(s: Shot, state: ChapterState): boolean { return s.kind === 'choice' ? passed(state, s.decision) : s.kind === 'reply' ? s.talk in state.talks : true; }
/** The furthest shot the player may be on: the first choice or reply not yet made, or the last shot. */
export function frontier(scene: Scene, state: ChapterState): number { const i = scene.shots.findIndex((s) => !mayPass(s, state)); return i < 0 ? scene.shots.length - 1 : i; }
export interface Recap { found: number; hidden: number; missed: string[]; shots: number; minutes: number }
/** What was found and what was walked past, by the canon's own teasers. */
export function recap(scene: Scene, state: ChapterState): Recap { const all = scene.shots.flatMap((s) => (s.kind === 'live' || s.kind === 'close' ? s.hotspots : []));
  return { found: all.filter((h) => state.found.includes(h.discovery)).length, hidden: all.length, missed: all.filter((h) => !state.found.includes(h.discovery)).map((h) => h.label), shots: scene.shots.length, minutes: Math.round(scene.dur / 6) / 10 }; }
