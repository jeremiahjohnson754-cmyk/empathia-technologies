/**
 * SIGNAL Cinematic Story (A5, 12 Nov 2026; extended to Seasons 1–6 at the founder's word, 11:35 CT). A scene is built from the canon
 * chapter itself at run time: its acts are the chapter's own headings; its shots are the act's panels (art, caption, speech), beats
 * (exchanges) and decisions, in canon order. Every word shown or spoken is the canon's. Recorded takes speak the lines they match word
 * for word (voices locked by the founder: Maya = Sarah, Ray = Paul); a line without a take is shown as a caption for a calm reading time.
 * The decision is the story engine's own, so a choice made here is the choice in Classic Story.
 */
import type { Item } from './story.js';

export interface Take { who: string; text: string; src: string }
export interface Shot { item: number; kind: 'panel' | 'decision' | 'beat' | 'footage'; src?: string; note?: string }
/** Establishing footage (generated with vidIQ; settings and equipment only, no faces, no text), placed before the canon item it sets up. */
export interface Footage { before: number; src: string; note: string }
export interface Act { title: string; sub: string | null; shots: Shot[] }
export interface Scene { chapter: string; acts: Act[]; takes: Take[]; voices: Record<string, string> }

/** Seasons whose chapters open as scenes (founder, 12 Nov 2026: "continue working to season 6"). */
export const CINEMATIC_SEASONS = [1, 2, 3, 4, 5, 6];
export const VOICES: Record<string, string> = { maya: 'Sarah', ray: 'Paul' };
const M = 'media/signal/s01e01-act1/';
/** Recorded takes by chapter; each speaks one canon line exactly (unit test signal-cinematic). */
export const TAKES: Record<string, Take[]> = {
  s01e01: [
    { who: 'maya', text: 'It’s EQ. Something’s building up in the mids. I can cut it.', src: `${M}maya-1.mp3` },
    { who: 'maya', text: 'Wait. If I change it now, I lose what it sounds like now.', src: `${M}maya-2.mp3` },
    { who: 'maya', text: 'Are you going to let it sign the report?', src: `${M}maya-3.mp3` },
    { who: 'ray', text: 'That broom has done more acoustics than most consultants.', src: `${M}ray-1.mp3` },
    { who: 'ray', text: 'It’s more reliable than the last one who did.', src: `${M}ray-2.mp3` },
    { who: 'ray', text: 'Who’s qualified to be under that?', src: `${M}ray-3.mp3` },
  ],
};
/** Footage by chapter (filled as reviewed clips are imported). */
export const FOOTAGE: Record<string, Footage[]> = {};
export const cinematicFor = (chapterId: string) => { const m = /^s(\d\d)e/.exec(chapterId); return !!m && CINEMATIC_SEASONS.includes(Number(m[1])); };
/** The scene of a chapter: one act per canon heading (the opening act, before any heading, when the chapter starts without one). */
export function sceneOf(chapterId: string, items: Item[]): Scene {
  const acts: Act[] = []; let cur: Act | null = null;
  items.forEach((it, i) => {
    if (it.type === 'heading') { cur = { title: it.text, sub: it.sub, shots: [] }; acts.push(cur); return; }
    const kind = it.type === 'panel' || it.type === 'beat' || it.type === 'decision' ? it.type : null; if (!kind) return;
    if (!cur) { cur = { title: 'Opening', sub: null, shots: [] }; acts.push(cur); }
    for (const f of (FOOTAGE[chapterId] || []).filter((x) => x.before === i)) cur.shots.push({ item: i, kind: 'footage', src: f.src, note: f.note });
    cur.shots.push({ item: i, kind });
  });
  return { chapter: chapterId, acts: acts.filter((a) => a.shots.length > 0), takes: TAKES[chapterId] || [], voices: VOICES };
}
/** Canon text and recorded takes are compared with straight quotes and collapsed spaces, so a typographic apostrophe never breaks a match. */
export const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().replace(/^\((.*)\)$/, '$1');  // a thought, "(…)", is spoken without its parentheses
export const takeFor = (takes: Take[], who: string, text: string) => takes.find((t) => t.who === who && norm(t.text) === norm(text)) || null;
/** A line the canon gives inside an option's result ("Ray: “…”"), for the option that sends the player back to the choice. */
export const quoted = (result: string) => { const m = /^([A-Z][a-z]+): “([^”]+)”/.exec(result); return m ? { who: m[1]!.toLowerCase(), text: m[2]! } : null; };
export const returnsToChoice = (result: string) => /Back to the choice\.?$/.test(result.trim());
/** Reading time for a caption when no audio plays: a calm pace, never a gate (the viewer can always pause or step). */
export const readMs = (text: string) => Math.max(2500, 900 + text.split(/\s+/).length * 380);
