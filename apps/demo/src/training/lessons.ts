/**
 * Equipment training lessons (the Equipment Experience Engine's first record, 12 Nov 2026; task 80-3, acceptance A5). A lesson states
 * exactly what it applies to and where each step comes from, and carries its verification state; a generated film is never, by itself, a
 * verified tutorial. Words of the steps are Empathia's; the button names are the vendor's own control names (docs/training/).
 */
export const VERIFICATION = ['not researched', 'documentation identified', 'script drafted', 'technically reviewed', 'storyboard approved', 'video generated', 'media QA passed', 'device/lab verified', 'released', 'revision required', 'retired'] as const;
export type Verification = typeof VERIFICATION[number];
export interface Source { title: string; url: string; read: string }
export interface Practice { q: string; choices: { id: string; text: string }[]; correct: string; why: string; wrong: Record<string, string> }
export interface Lesson {
  id: string; version: string; title: string; audience: string; format: string;
  vendor: string; product: string; platform: string; hardware: string; software: string; config: string[];
  sources: Source[]; notCovered: string[]; state: Verification; stateNote: string; reviewer: string; reviewed: string;
  media: { video: string; captioned: string; captions: string; transcript: string; poster: string; narration: 'present' | 'pending' };
  rights: string; practice: Practice; steps: string[];
}
export const LESSONS: Lesson[] = [{
  id: 'teams-rooms-windows-quickstart', version: '1.0-draft', title: 'Run a meeting from the room console',
  audience: 'Everyday users of a meeting room; no engineering terms', format: 'Immediate task guide, about a minute',
  vendor: 'Microsoft', product: 'Microsoft Teams Rooms', platform: 'Windows', hardware: 'A touch console on the table; one or two front displays',
  software: 'As documented on the pages below when read on 12 Nov 2026 (Microsoft states no app version for these steps)',
  config: ['Whether a cable starts sharing by itself is an administrator setting', 'Whiteboard needs a touch display', 'Room controls appear only where an administrator installed a manufacturer app', 'Some features need a Teams Rooms Pro licence', 'Teams Rooms on Android has its own guide and is not covered'],
  sources: [
    { title: 'Microsoft Support: Teams Rooms (Windows)', url: 'https://support.microsoft.com/office/microsoft-teams-rooms-windows-e667f40e-5aab-40c1-bd68-611fe0002ba2', read: '12 Nov 2026 (page updated 24 Sep 2026)' },
    { title: 'Microsoft Learn: Teams Rooms home screen and admin controls', url: 'https://learn.microsoft.com/microsoftteams/rooms/mtr-home-refresh', read: '12 Nov 2026' },
  ],
  notCovered: ['Ending a meeting for everyone (the sources do not say how)', 'Saving a whiteboard (the sources do not say)', 'Wireless casting (its own article; a later lesson)'],
  state: 'video generated', stateNote: 'Script approved by the founder (12 Nov 2026); checked step by step against the two sources by the engineer; film rendered from an original illustration. Narration: one ElevenLabs take (premade voice Bella, the founder’s narrator for the tour), provided by the founder and normalised to −18 LUFS; the film is timed to its pauses. Awaiting media QA, the founder’s review of the film, and a check on a real room. Not device-verified.',
  reviewer: 'Engineer (against the vendor documentation); not yet a practising AV professional', reviewed: '12 Nov 2026',
  media: { video: 'media/training/pilot1/pilot1.mp4', captioned: 'media/training/pilot1/pilot1-captioned.mp4', captions: 'media/training/pilot1/pilot1.vtt', transcript: 'media/training/pilot1/pilot1.txt', poster: 'media/training/pilot1/poster.jpg', narration: 'present' },
  rights: 'Original illustration made for Empathia; no Microsoft image, logo or screen is reproduced. Steps are paraphrased from Microsoft’s public help, which is linked, not copied.',
  steps: ['If your meeting invited the room, tap Join on the console.', 'Not listed? Use Join with an ID, or scan the room’s QR code; the room has to be invited to appear.', 'Joining on your laptop too: turn its audio off to avoid echo.', 'No meeting booked: Meet now, then add people by name.', 'Share: plug in the room’s cable; tap Share if it does not start by itself. Stop sharing when done.', 'Mute and volume are on the meeting controls.', 'Leave to finish.', 'Problems: the room’s help card.'],
  practice: {
    q: 'Your meeting is not on the room’s console. What do you do?',
    choices: [{ id: 'meetnow', text: 'Tap Meet now and wait for the others' }, { id: 'joinid', text: 'Use Join with an ID' }, { id: 'restart', text: 'Restart the console' }],
    correct: 'joinid', why: 'The room was not invited, so the meeting is not listed. Join with an ID joins that meeting itself.',
    wrong: { meetnow: 'Meet now starts a new meeting in the room; the people in your meeting are elsewhere.', restart: 'Restarting does not add the meeting; the room was not invited to it.' },
  },
}];
export const lessonOf = (id: string) => LESSONS.find((l) => l.id === id);
/** A practice attempt: training evidence only. It never says a device or a room passed anything. */
export interface Attempt { lesson: string; version: string; choice: string; correct: boolean; at: string }
const KEY = 'empathia.demo.lessons.v1';
export function attempts(): Attempt[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Attempt[]; } catch { return []; } }
export function recordAttempt(l: Lesson, choice: string): Attempt {
  const a = { lesson: l.id, version: l.version, choice, correct: choice === l.practice.correct, at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify([...attempts(), a].slice(-200))); } catch { /* storage refused: the attempt still shows */ }
  return a;
}
