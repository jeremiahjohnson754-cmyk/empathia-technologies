// The home page's opening sequence (founder directive 18 Nov 2026 17:25 §4): a room, its systems, its floor, its building, the campus and
// the estate's open issues, each an element capture of the running demonstration (media/hero/PROVENANCE.json). It plays once, about
// twenty seconds, each frame pulling back from the last; a Pause button stops it, and the level names step through it by hand (site.js).
// With reduced motion nothing moves: the room is shown and the levels are steps. It never blocks the page: it sits beside the promise.
import React from 'react';

export interface HeroFrame { id: string; shows: string; route: string }
/** each level's name and a short line on what the frame shows (the full line is in media/hero/PROVENANCE.json) */
const LEVEL: Record<string, [string, string]> = { room: ['A room', 'Atlas 4.218, furnished, in 3D'], overlays: ['Its systems', 'cameras and microphones drawn in'], floor: ['Its floor', 'floor 4 of Atlas HQ'], building: ['Its building', 'Atlas HQ, floor by floor'], campus: ['The campus', 'every building'], estate: ['The estate', 'open issues by building'] };

export function Opening({ frames }: { frames: HeroFrame[] }) {
  if (!frames.length) return null;
  // one 1200 px file per frame and no more markup than this: the home page's HTML budget is 48 KB (the box sets the size, so no width/height)
  return (
    <figure className="seq">
      <div className="seq__box">
        {frames.map((f) => <div key={f.id} className="seq__f"><img src={`/media/hero/${f.id}-1200.webp`} alt="" /><span className="seq__l">{LEVEL[f.id]?.[1] || f.id}</span></div>)}
      </div>
      <ol className="seq__steps">{frames.map((f) => <li key={f.id}>{LEVEL[f.id]?.[0] || f.id}</li>)}</ol>
      <figcaption className="seq__cap">Captured from the demonstration (synthetic data).</figcaption>
    </figure>
  );
}
