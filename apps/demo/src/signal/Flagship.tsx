/**
 * The flagship lab boss inside a chapter (founder, 12 Nov 2026): S01E10 opens "Mix the Stream" right after its lab. The lab's code loads
 * only when the reader opens it, so the chapter stays as quick to open as before. A result is recorded as a lab try in the story's
 * progress (practice, never a credential); the story never waits for it.
 */
import { useState, type ComponentType } from 'react';
import type { Item } from './story.js';

type MixLabProps = { initialRoom?: string; embedded?: boolean; onResult?: (room: string, score: number, passed: boolean) => void };
export const flagshipAfter = (chapter: string, it: Item) => chapter === 's01e10' && it.type === 'mount' && it.kind === 'lab';
export function Flagship({ onResult }: { onResult: (id: string, passed: boolean) => void }) {
  const [Lab, setLab] = useState<ComponentType<MixLabProps> | null>(null); const [err, setErr] = useState<string | null>(null);
  if (Lab) return <section className="sg-flag" data-testid="story-flagship" data-open="true"><Lab embedded onResult={(room, _score, passed) => onResult(`mixlab-${room}`, passed)} /></section>;
  return <section className="sg-flag" data-testid="story-flagship" data-open="false" aria-label="Flagship lab boss: Mix the Stream">
    <p className="sg-flag__k">Flagship lab boss · optional · the story goes on either way</p>
    <h3>Mix the Stream</h3>
    <p>After the storm, the room and four hundred homes are listening. Take the console: five rooms from a basement fellowship hall to a 4,000-seat mega church, a 32-channel desk, wedges, subs, fills, arrays and delay towers, and a stream that has to sound like being there. The mega church is the boss: the service runs on a clock.</p>
    <p><button type="button" className="ui-btn ui-btn--primary" data-testid="story-flagship-open" onClick={() => import('../mixlab/MixLab.js').then((m) => setLab(() => m.MixLab as ComponentType<MixLabProps>)).catch((e) => setErr(String(e)))}>Take the console</button> <a className="ui-btn ui-btn--quiet" href="#/labs/mix">Open it full screen</a></p>
    {err && <p role="alert">The lab did not load: {err}. <a href="#/labs/mix">Open it on its own page.</a></p>}
  </section>;
}
