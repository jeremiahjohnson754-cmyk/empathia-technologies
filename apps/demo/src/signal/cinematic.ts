/**
 * SIGNAL Cinematic Story (A5, 12 Nov 2026): a scene is a list of shots over the canon chapter's own items. Every word shown or spoken is
 * read from the chapter at run time (captions, speech bubbles, beat lines, the decision and its options); the scene only says which items
 * to show, in what order, and which recorded take speaks which canon line. Voices locked by the founder (11:06 CT): Maya = Sarah,
 * Ray = Paul. The decision is the story engine's own, so a choice made here is the choice in Classic Story.
 */
export type ShotKind = { item: number; kind: 'panel' } | { item: number; kind: 'decision' } | { item: number; kind: 'beat' };
export interface Take { who: string; text: string; src: string }
export interface Scene { id: string; chapter: string; title: string; voices: Record<string, string>; shots: ShotKind[]; takes: Take[]; ladder: { letter: string; take: string } }
const M = 'media/signal/s01e01-act1/';
export const CINEMATIC: Record<string, Scene> = {
  s01e01: {
    id: 's01e01-act1', chapter: 's01e01', title: 'Act I, “Tuesday night”', voices: { maya: 'Sarah', ray: 'Paul' },
    shots: [{ item: 11, kind: 'panel' }, { item: 13, kind: 'panel' }, { item: 14, kind: 'panel' }, { item: 15, kind: 'decision' }, { item: 16, kind: 'panel' }, { item: 17, kind: 'panel' }, { item: 18, kind: 'beat' }],
    takes: [
      { who: 'maya', text: 'It’s EQ. Something’s building up in the mids. I can cut it.', src: `${M}maya-1.mp3` },
      { who: 'maya', text: 'Wait. If I change it now, I lose what it sounds like now.', src: `${M}maya-2.mp3` },
      { who: 'maya', text: 'Are you going to let it sign the report?', src: `${M}maya-3.mp3` },
      { who: 'ray', text: 'That broom has done more acoustics than most consultants.', src: `${M}ray-1.mp3` },
      { who: 'ray', text: 'It’s more reliable than the last one who did.', src: `${M}ray-2.mp3` },
      { who: 'ray', text: 'Who’s qualified to be under that?', src: `${M}ray-3.mp3` },
    ],
    ladder: { letter: 'D', take: `${M}ray-3.mp3` },
  },
};
/** Canon text and recorded takes are compared with straight quotes and collapsed spaces, so a typographic apostrophe never breaks a match. */
export const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
export const takeFor = (sc: Scene, who: string, text: string) => sc.takes.find((t) => t.who === who && norm(t.text) === norm(text)) || null;
/** Reading time for a caption when no audio plays: a calm pace, never a gate (the viewer can always pause or step). */
export const readMs = (text: string) => Math.max(2500, 900 + text.split(/\s+/).length * 380);
