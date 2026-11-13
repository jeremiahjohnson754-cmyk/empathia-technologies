/**
 * A room drawn by Empathia's own renderer (./build.ts) from its program (./programs.ts), in three views (13 Nov 2026, founder: "switch
 * between an isometric overview, an accurate 2D floor plan, and an eye-level perspective"): the overview from above as an architect's
 * cutaway; the plan, to scale (./PlanView.tsx); and the room from where a person would really be, in perspective at their eye height.
 * Every piece is a button that says what it is; equipment says what the record holds for it and how it is connected. "Equipment" shows
 * the room's devices — ceiling loudspeakers and microphones, what sits in the rack, wall boxes — and its cable runs by kind. Names are off
 * until asked for, so the room reads as a room. Modelled from the record; illustrative, not surveyed.
 */
import { useEffect, useMemo, useState } from 'react';
import { L3View, useCam } from '../l3.js';
import { roomScene, roomDefs } from './build.js';
import { PlanView, RUN_COLOUR, kindClass } from './PlanView.js';
import type { Program } from './programs.js';

const DEFS = roomDefs();
/** from an eye, a field of view of about 84° across (zoom 0.85 of L3's 74°): closer to what a person takes in of a room */
const EYE_ZOOM = 0.85;
const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
export const RUN_NAME: Record<string, string> = { network: 'Network', signal: 'Video and signal', control: 'Control', power: 'Power', audio: 'Audio' };

/** what a piece is, its size and place, and for equipment its record and its connections */
export function pieceSays(P: Program, id: string | null): string | null {
  if (!id) return null; if (id === 'speakers') return `Ceiling loudspeakers (${P.speakers.length}) · in the ceiling`;
  const p = P.pieces.find((q) => q.id === id); if (!p) return null; const eq = kindClass(p.kind) === 'eq';
  const where = eq || (p.z || 0) > 0.05 ? `, at ${fmt(p.z || 0)} m` : `, ${fmt(p.h)} m high`;
  return `${p.label}: ${fmt(p.w)} × ${fmt(p.d)} m${where} · at ${fmt(p.x)}, ${fmt(p.y)} m${p.note ? ` · ${p.note}` : ''}${p.device ? ` · ${p.device}` : ''}${p.net?.length ? ` · ${p.net.join('; ')}` : ''} · illustrative`;
}

export function EmpathiaRoomStage({ P, label, initialEye, onEye, engineer = false }: { P: Program; label: string; initialEye?: string | null; onEye?: (k: string | null) => void; engineer?: boolean }) {
  const [eyeKey, setEyeKey] = useState<string | null>(() => (initialEye && (initialEye === 'plan' || P.eyes.some((e) => e.key === initialEye)) ? initialEye : null));
  const [sel, setSel] = useState<string | null>(null); const [names, setNames] = useState(false); const [equip, setEquip] = useState(engineer);
  const c = useCam({ yaw: P.hero.yaw, pitch: P.hero.pitch, zoom: P.hero.zoom ?? 1 });
  const plan = eyeKey === 'plan'; const spot = eyeKey && !plan ? P.eyes.find((e) => e.key === eyeKey) || null : null;
  // stepping into a place turns the person to face where they would look; stepping out returns to the view from above
  useEffect(() => { if (spot) c.setCam({ yaw: spot.yaw, pitch: spot.pitch, zoom: EYE_ZOOM, px: 0, py: 0 }); else if (!plan) c.reset(); }, [spot?.key, plan]);   // eslint-disable-line react-hooks/exhaustive-deps
  const yawStep = Math.round(c.cam.yaw / 2) * 2;   // the cutaway changes with the yaw (which walls are cut, which faces turn); from an eye, with the eye
  const eye = spot ? { x: spot.x, y: spot.y, z: spot.z } : null;
  const sc = useMemo(() => (plan ? null : roomScene(P, { cam: { ...c.cam, yaw: yawStep }, eye }, { sel, names, equip })), [P, plan, spot?.key, spot ? 0 : yawStep, spot ? 0 : c.cam.pitch > 88, sel, names, equip]);   // eslint-disable-line react-hooks/exhaustive-deps
  const go = (k: string | null) => { setEyeKey(k); onEye?.(k); };
  const pick = (id: string) => setSel(sel === id ? null : id);
  const shownPieces = equip ? P.pieces : P.pieces.filter((p) => !p.eqOnly); const PP = equip ? P : { ...P, pieces: shownPieces };
  const kinds = [...new Set((P.runs || []).map((r) => r.kind))];
  const says = pieceSays(P, sel);
  return <div className="rm-room" data-testid="rm-room-3d" data-program={P.key} data-objects={P.pieces.length} data-view={plan ? 'plan' : spot ? 'eye' : 'overview'} data-eye={eyeKey || ''} data-eye-at={spot ? `${fmt(spot.x)},${fmt(spot.y)},${spot.z}` : ''} data-room-wd={`${fmt(P.w)},${fmt(P.d)}`} data-sel={sel || ''} data-equip={equip ? '1' : ''}>
    <div className={`rm-stage${spot ? ' rm-stage--eye' : ''}${plan ? ' rm-stage--plan' : ''}`}>
      {plan ? <div className="l3-stage rm-planbox"><PlanView P={PP} sel={sel} onSel={pick} names={names} eyes={P.eyes} onEye={(k) => go(k)} runs={equip ? P.runs : null} label={`${label} The plan, to scale: ${fmt(P.w)} by ${fmt(P.d)} metres.`} /></div>
        : <L3View sc={sc!} c={c} label={spot ? `${label} Seen from ${spot.label.toLowerCase()}: ${spot.says}.` : label} onNav={() => undefined} S={60} defs={DEFS} eye={eye} eyePri bg={spot ? 'url(#rm-sky)' : undefined} tidy sel={sel} onObj={pick} tall />}
    </div>
    <div className="lt-eyes" role="radiogroup" aria-label="View" data-testid="rm-eyes"><span className="lt-eyes__l">View</span>
      <button type="button" role="radio" aria-checked={eyeKey === null} className={`lt-chipbtn${eyeKey === null ? ' on' : ''}`} title="the whole room from above, walls nearest you cut low" onClick={() => go(null)} data-testid="rm-eye-above">Overview</button>
      <button type="button" role="radio" aria-checked={plan} className={`lt-chipbtn${plan ? ' on' : ''}`} title="the floor plan, to scale" onClick={() => go('plan')} data-testid="rm-view-plan">Plan</button>
      <span className="lt-eyes__l rm-eyelvl">Eye level</span>
      {P.eyes.map((e) => <button key={e.key} type="button" role="radio" aria-checked={eyeKey === e.key} className={`lt-chipbtn${eyeKey === e.key ? ' on' : ''}`} title={e.says} onClick={() => go(e.key)} data-testid={`rm-eye-${e.key}`}>{e.label}</button>)}
    </div>
    <div className="lt-eyes rm-tools"><button type="button" role="switch" aria-checked={equip} className={`lt-chipbtn${equip ? ' on' : ''}`} onClick={() => setEquip(!equip)} data-testid="rm-equip">Equipment and cabling</button>
      <button type="button" role="switch" aria-checked={names} className={`lt-chipbtn${names ? ' on' : ''}`} onClick={() => setNames(!names)} data-testid="rm-names">Names</button>
      {equip && kinds.length ? <span className="rm-legend" data-testid="rm-legend">{kinds.map((k) => <span key={k}><i style={{ background: RUN_COLOUR[k] }} />{RUN_NAME[k]}</span>)}<em>proposed by the design rules, not traced</em></span> : null}
    </div>
    <p className="ui-meta rm-says" aria-live="polite" data-testid="rm-says">{says || (plan ? 'The plan to scale. Tap anything to see what it is; tap a person marker to see the room from there.' : spot ? `${spot.label}: ${spot.says}. Turn your head with a drag or the arrow keys.` : 'Tap anything in the room to see what it is. Plan and eye level are under the room.')}</p>
  </div>;
}
