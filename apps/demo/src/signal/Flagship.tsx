/**
 * The flagship labs inside their chapters (founder, 12 Nov 2026): S01E05 opens "Light the Stage" after its lab (the breaker and the
 * twelve new fixtures), S01E07 "Shoot the Service" after its lab (the LED wall and the camera), and S01E10 "Mix the Stream", the lab
 * boss, after its lab. A lab's code loads only when the reader opens it, so the chapter stays as quick to open as before. A result is
 * recorded as a lab try in the story's progress (practice, never a credential); the story never waits for it.
 */
import { useState, type ComponentType } from 'react';
import type { Item } from './story.js';

type LabProps = { embedded?: boolean; onResult?: (key: string, score: number, passed: boolean) => void };
interface Flag { id: 'mix' | 'light' | 'video'; kicker: string; title: string; blurb: string; button: string; load: () => Promise<ComponentType<LabProps>> }
export const FLAGSHIPS: Record<string, Flag> = {
  s01e05: { id: 'light', kicker: 'Flagship lab · optional · the story goes on either way', title: 'Light the Stage', button: 'Hang the rig',
    blurb: 'Twelve new fixtures tripped a breaker. Now hang them properly: drag fixtures onto the trusses, patch one DMX universe without overlaps, aim, zoom and colour them, and light a sermon and a worship set without washing out the screen.',
    load: () => import('../mixlab/LightLab.js').then((m) => m.LightLab as ComponentType<LabProps>) },
  s01e07: { id: 'video', kicker: 'Flagship lab · optional · the story goes on either way', title: 'Shoot the Service', button: 'Take the cameras',
    blurb: 'The rental wall striped at 1/50. Run two cameras, the LED wall and the switcher yourself: clean the bands and the flicker, expose the faces, match the white, cut the service on cue and line the sound up with the picture.',
    load: () => import('../mixlab/VideoLab.js').then((m) => m.VideoLab as ComponentType<LabProps>) },
  s01e10: { id: 'mix', kicker: 'Flagship lab boss · optional · the story goes on either way', title: 'Mix the Stream', button: 'Take the console',
    blurb: 'After the storm, the room and four hundred homes are listening. Take the console: five rooms from a basement fellowship hall to a 4,000-seat mega church, a 32-channel desk, wedges, subs, fills, arrays and delay towers, and a stream that has to sound like being there. The mega church is the boss: the service runs on a clock.',
    load: () => import('../mixlab/MixLab.js').then((m) => m.MixLab as ComponentType<LabProps>) },
};
export const flagshipAfter = (chapter: string, it: Item) => !!FLAGSHIPS[chapter] && it.type === 'mount' && it.kind === 'lab';
export function Flagship({ chapter, onResult }: { chapter: string; onResult: (id: string, passed: boolean) => void }) {
  const F = FLAGSHIPS[chapter]!; const [Lab, setLab] = useState<ComponentType<LabProps> | null>(null); const [err, setErr] = useState<string | null>(null);
  if (Lab) return <section className="sg-flag" data-testid="story-flagship" data-lab={F.id} data-open="true"><Lab embedded onResult={(key, _score, passed) => onResult(`${F.id}lab-${key}`, passed)} /></section>;
  return <section className="sg-flag" data-testid="story-flagship" data-lab={F.id} data-open="false" aria-label={`${F.kicker.split(' ·')[0]}: ${F.title}`}>
    <p className="sg-flag__k">{F.kicker}</p><h3>{F.title}</h3><p>{F.blurb}</p>
    <p><button type="button" className="ui-btn ui-btn--primary" data-testid="story-flagship-open" onClick={() => F.load().then((c) => setLab(() => c)).catch((e) => setErr(String(e)))}>{F.button}</button> <a className="ui-btn ui-btn--quiet" href={`#/labs/${F.id}`}>Open it full screen</a></p>
    {err && <p role="alert">The lab did not load: {err}. <a href={`#/labs/${F.id}`}>Open it on its own page.</a></p>}
  </section>;
}
