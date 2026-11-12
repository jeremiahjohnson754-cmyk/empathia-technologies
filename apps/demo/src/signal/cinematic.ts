/**
 * SIGNAL Cinematic Story (A5, 12 Nov 2026; extended to Seasons 1–6 at the founder's word, 11:35 CT). A scene is built from the canon
 * chapter itself at run time: its acts are the chapter's own headings; its shots are the act's panels (art, caption, speech), beats
 * (exchanges) and decisions, in canon order. Every word shown or spoken is the canon's. Recorded takes speak the lines they match word
 * for word (voices locked by the founder: Maya = Sarah, Ray = Paul); a line without a take is shown as a caption for a calm reading time.
 * The decision is the story engine's own, so a choice made here is the choice in Classic Story.
 */
import type { Item } from './story.js';
import { TAKES_S01, FOOTAGE_S01 } from './takes-s01.js';

export interface Take { who: string; text: string; src: string }
export interface Shot { item: number; kind: 'panel' | 'decision' | 'beat' | 'footage'; src?: string; note?: string }
/** Establishing footage (generated video; settings and equipment only, no faces, no text), placed before the canon item it sets up. */
export interface Footage { before: number; src: string; note: string }
export interface Act { title: string; sub: string | null; shots: Shot[] }
export interface Scene { chapter: string; acts: Act[]; takes: Take[]; voices: Record<string, string> }

/** Seasons whose chapters open as scenes (founder, 12 Nov 2026: "continue working to season 6"). */
export const CINEMATIC_SEASONS = [1, 2, 3, 4, 5, 6];
/** Voices chosen by the founder: Maya and Ray 12 Nov 11:06 CT; Dolores, Imani, Priya and Theo from their auditions 12 Nov 12:29 CT; Lily (27) 12:35 CT. */
export const VOICES: Record<string, string> = { maya: 'Sarah', ray: 'Paul', dolores: 'Nan', imani: 'Courtney', priya: 'Vicki M Rodriguez', theo: 'Ilya', lily: 'Jessica' };
const M = 'media/signal/s01e01-act1/'; const N = 'media/signal/s01e01/';
/** Recorded takes by chapter; each speaks one canon line exactly (unit test signal-cinematic). */
export const TAKES: Record<string, Take[]> = {
  s01e01: [
    { who: 'maya', text: 'It’s EQ. Something’s building up in the mids. I can cut it.', src: `${M}maya-1.mp3` },
    { who: 'maya', text: 'Wait. If I change it now, I lose what it sounds like now.', src: `${M}maya-2.mp3` },
    { who: 'maya', text: 'Are you going to let it sign the report?', src: `${M}maya-3.mp3` },
    { who: 'ray', text: 'That broom has done more acoustics than most consultants.', src: `${M}ray-1.mp3` },
    { who: 'ray', text: 'It’s more reliable than the last one who did.', src: `${M}ray-2.mp3` },
    { who: 'ray', text: 'Who’s qualified to be under that?', src: `${M}ray-3.mp3` },
    // the rest of Maya's and Ray's lines in the episode (takes generated 12 Nov 2026, provided by the founder, split at their breaks)
    { who: 'maya', text: '(It is very clearly not fine.)', src: `${N}maya-4.mp3` },
    { who: 'maya', text: 'She thinks it\'s her.', src: `${N}maya-5.mp3` },
    { who: 'maya', text: 'What changed two years ago?', src: `${N}maya-6.mp3` },
    { who: 'maya', text: 'Okay. Four explanations. The mic. Dolores\'s hearing. The air handling. The room. What would tell them apart?', src: `${N}maya-7.mp3` },
    { who: 'maya', text: 'If they move when I move one seat, no EQ setting fixes all ten.', src: `${N}maya-8.mp3` },
    { who: 'maya', text: 'Where\'s the first notch?', src: `${N}maya-9.mp3` },
    { who: 'maya', text: 'Sound goes about 343 meters a second. So 1.7 over 343… about five milliseconds late. That\'s why it moves.', src: `${N}maya-10.mp3` },
    { who: 'maya', text: 'If it\'s the reflection, turning the fill down should make the notches shallower. If it doesn\'t, I\'m wrong.', src: `${N}maya-11.mp3` },
    { who: 'maya', text: 'That the fill is pointed at the ceiling, and the ceiling is talking to ten seats.', src: `${N}maya-12.mp3` },
    { who: 'maya', text: 'We found something in the room that makes those ten seats sound hollow to anyone — I hear it too.', src: `${N}maya-13.mp3` },
    { who: 'maya', text: 'We\'re changing it Thursday and we\'ll know Sunday. Her hearing is her audiologist\'s question, not mine.', src: `${N}maya-14.mp3` },
    { who: 'maya', text: 'I don\'t go up the lift. I stand outside the tape and hold the clipboard like it\'s a very important clipboard.', src: `${N}maya-15.mp3` },
    { who: 'maya', text: 'So did I, last week. It was the room.', src: `${N}maya-16.mp3` },
    { who: 'maya', text: '(She had been leaning for two years. Nobody asked why.)', src: `${N}maya-17.mp3` },
    { who: 'ray', text: 'A comb filter is the same sound arriving twice, a hair apart. Some frequencies cancel. Each cancelled one is a notch.', src: `${N}ray-4.mp3` },
    { who: 'ray', text: 'One over twice the gap. Arrivals one millisecond apart: one divided by two thousandths — five hundred hertz.', src: `${N}ray-5.mp3` },
    { who: 'ray', text: 'Five milliseconds. The human ear doesn\'t hear that as an echo. It hears it as a bad day.', src: `${N}ray-6.mp3` },
    { who: 'ray', text: 'What would you tell someone who wasn\'t here tonight?', src: `${N}ray-7.mp3` },
    { who: 'ray', text: 'Aim at people, not the ceiling. A commissioning engineer I learned from used to make me write it exactly like that.', src: `${N}ray-8.mp3` },
  ],
  // Season 1 (generated 12 Nov 2026 in grouped takes, provided by the founder, split at their breaks): media/signal/s01/build-takes.py
  ...TAKES_S01,
};
/** Footage by chapter (filled as reviewed clips are imported). */
export const FOOTAGE: Record<string, Footage[]> = {
  s01e01: [
    { before: 11, src: `${N}footage-sanctuary.mp4`, note: 'The sanctuary on a Tuesday evening. Generated footage of the setting, not a real venue.' },
    { before: 17, src: `${N}footage-broom.mp4`, note: 'Every seat recorded before anything is touched. Generated footage of the setting.' },
    { before: 20, src: `${N}footage-booth.mp4`, note: 'The booth. Generated footage of the setting.' },
    // the fill-loudspeaker clip was not used: in it the loudspeaker points down and sideways, and the canon's point is that it is aimed
    // at the ceiling; footage that teaches the wrong aim is worse than none (founder, 12 Nov: never teach the wrong thing)
  ],
  // Season 1 (founder, 12 Nov 12:53 CT: finish Season 1 as a film; characters kept alike by fixed descriptions, media/signal/s01/film)
  ...FOOTAGE_S01,
};
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
export const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').replace(/\s*\[COMIC[^\]]*\]/g, '').trim().replace(/^\((.*)\)$/, '$1');  // a thought, "(…)", is spoken without its parentheses; the canon's [COMIC …] art tags are not spoken
export const takeFor = (takes: Take[], who: string, text: string) => takes.find((t) => t.who === who && norm(t.text) === norm(text)) || null;
/** A line the canon gives inside an option's result ("Ray: “…”"), for the option that sends the player back to the choice. */
export const quoted = (result: string) => { const m = /^([A-Z][a-z]+): “([^”]+)”/.exec(result); return m ? { who: m[1]!.toLowerCase(), text: m[2]! } : null; };
export const returnsToChoice = (result: string) => /Back to the choice\.?$/.test(result.trim());
/** Reading time for a caption when no audio plays: a calm pace, never a gate (the viewer can always pause or step). */
export const readMs = (text: string) => Math.max(2500, 900 + text.split(/\s+/).length * 380);
