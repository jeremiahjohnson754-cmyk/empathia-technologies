/**
 * A room drawn by Empathia's own renderer (./build.ts) from its program (./programs.ts): seen from above as an architect's cutaway, or from
 * where a person would really be — at the rail, in a balcony seat, on the sofa, in the doorway, at the wheelchair place — in perspective at
 * their eye height. Every piece is a button that says what it is; equipment says what the record holds for it. Names of things are off
 * until asked for, so the room reads as a room. Modelled from the record; illustrative, not surveyed.
 */
import { useEffect, useMemo, useState } from 'react';
import { L3View, useCam } from '../l3.js';
import { roomScene, roomDefs } from './build.js';
import type { Program } from './programs.js';

const DEFS = roomDefs();
/** from an eye, a field of view of about 84° across (zoom 0.85 of L3's 74°): closer to what a person takes in of a room */
const EYE_ZOOM = 0.85;
const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

export function EmpathiaRoomStage({ P, label, initialEye, onEye }: { P: Program; label: string; initialEye?: string | null; onEye?: (k: string | null) => void }) {
  const [eyeKey, setEyeKey] = useState<string | null>(() => (initialEye && P.eyes.some((e) => e.key === initialEye) ? initialEye : null));
  const [sel, setSel] = useState<string | null>(null); const [names, setNames] = useState(false);
  const c = useCam({ yaw: P.hero.yaw, pitch: P.hero.pitch, zoom: P.hero.zoom ?? 1 });
  const spot = eyeKey ? P.eyes.find((e) => e.key === eyeKey) || null : null;
  // stepping into a place turns the person to face where they would look; stepping out returns to the view from above
  useEffect(() => { if (spot) c.setCam({ yaw: spot.yaw, pitch: spot.pitch, zoom: EYE_ZOOM, px: 0, py: 0 }); else c.reset(); }, [spot?.key]);   // eslint-disable-line react-hooks/exhaustive-deps
  const yawStep = Math.round(c.cam.yaw / 2) * 2;   // the cutaway changes with the yaw (which walls are cut, which faces turn); from an eye, with the eye
  const eye = spot ? { x: spot.x, y: spot.y, z: spot.z } : null;
  const sc = useMemo(() => roomScene(P, { cam: { ...c.cam, yaw: yawStep }, eye }, { sel, names }), [P, spot?.key, spot ? 0 : yawStep, spot ? 0 : c.cam.pitch > 88, sel, names]);   // eslint-disable-line react-hooks/exhaustive-deps
  const go = (k: string | null) => { setEyeKey(k); onEye?.(k); };
  const piece = sel ? P.pieces.find((p) => p.id === sel) : null;
  const says = sel === 'speakers' ? `Ceiling loudspeakers (${P.speakers.length})${P.pieces.length ? '' : ''} · in the ceiling, shown from inside the room` : piece ? `${piece.label}: ${fmt(piece.w)} × ${fmt(piece.d)} m${piece.kind === 'display' || piece.kind === 'panel' ? `, at ${fmt(piece.z || 0)} m` : `, ${fmt(piece.h)} m high`}${piece.note ? ` · ${piece.note}` : ''}${piece.device ? ` · ${piece.device}` : ''} · illustrative` : null;
  return <div className="rm-room" data-testid="rm-room-3d" data-program={P.key} data-objects={P.pieces.length} data-eye={eyeKey || ''} data-eye-at={spot ? `${fmt(spot.x)},${fmt(spot.y)},${spot.z}` : ''} data-room-wd={`${fmt(P.w)},${fmt(P.d)}`} data-sel={sel || ''}>
    <div className={`rm-stage${spot ? ' rm-stage--eye' : ''}`}>
      <L3View sc={sc} c={c} label={spot ? `${label} Seen from ${spot.label.toLowerCase()}: ${spot.says}.` : label} onNav={() => undefined} S={60} defs={DEFS} eye={eye} eyePri bg={spot ? 'url(#rm-sky)' : undefined} tidy sel={sel} onObj={(id) => setSel(sel === id ? null : id)} tall />
    </div>
    <div className="lt-eyes" role="radiogroup" aria-label="See the room from" data-testid="rm-eyes"><span className="lt-eyes__l">See it from</span>
      {[{ key: null as string | null, label: 'Above', says: 'the whole room, walls nearest you cut low' }, ...P.eyes].map((e) => <button key={e.key || 'above'} type="button" role="radio" aria-checked={eyeKey === e.key} className={`lt-chipbtn${eyeKey === e.key ? ' on' : ''}`} title={e.says} onClick={() => go(e.key)} data-testid={`rm-eye-${e.key || 'above'}`}>{e.label}</button>)}
      <button type="button" role="switch" aria-checked={names} className={`lt-chipbtn rm-names${names ? ' on' : ''}`} onClick={() => setNames(!names)} data-testid="rm-names">Names</button>
    </div>
    <p className="ui-meta rm-says" aria-live="polite" data-testid="rm-says">{says || (spot ? `${spot.label}: ${spot.says}. Turn your head with a drag or the arrow keys.` : 'Tap anything in the room to see what it is. “See it from” puts you where a person would be.')}</p>
  </div>;
}
