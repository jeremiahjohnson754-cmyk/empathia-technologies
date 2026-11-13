/**
 * The furnished room, as V2.5.3 drew it (founder directive 12 Nov 2026, "Lite restoration": "the room should be the hero of the
 * screen"). The drawing is V2.5.3's own code (./v253/vendor.js: liteRoomScene, drawRoomShell, drawObject, layoutOf) running on this
 * campus's room records; the camera, labels and selection are ./l3.tsx. Walls, floor, door, glazing, table, chairs, displays, cameras,
 * microphones, loudspeakers, rack and touch panel are V2.5.3's; coverage (camera view, microphone pickup, loudspeaker coverage,
 * sightlines, acoustic reflections) is drawn by V2.5.3 from the layout's own devices. Geometry is modelled, never surveyed.
 */
import { useMemo, useState, useEffect } from 'react';
import { useEffect as useEff2 } from 'react';
import { L3View, useCam, type Eye } from './l3.js';
import type { L3Scene } from './l3.js';
import { v253Room, v253Defs, setV253Role, type V253State, type V253Edits } from './v253/v253room.js';
import type { V253Object } from './v253/vendor.js';
import type { LiteLayer, Overlay, Lens } from './model.js';

/** our overlay switches by V2.5.3's coverage names */
const COVER: Partial<Record<Overlay, string>> = { camera: 'fov', mic: 'mic', speaker: 'spk', sight: 'sight' };

export interface V253Pick { obj: V253Object; code: string | null }

/** Where a person is in the room, at their eye height, and which way they face (founder 13 Nov 2026: "eye-level views from realistic
 *  occupant positions"). From the room's own layout: its seats, its presenter position and its door; the front wall is the display wall. */
export type EyeKey = 'seat' | 'back' | 'presenter' | 'door' | 'wheel';
export const EYE_SPOTS: Array<{ key: EyeKey; label: string; says: string }> = [
  { key: 'seat', label: 'Seated at the table', says: 'a seat near the middle, eyes at 1.2 m' }, { key: 'back', label: 'Back row', says: 'the farthest seat, eyes at 1.2 m' },
  { key: 'presenter', label: 'Presenter', says: 'standing at the front, eyes at 1.6 m, facing the room' }, { key: 'door', label: 'Doorway', says: 'just inside the door, standing' },
  { key: 'wheel', label: 'Wheelchair place', says: 'the end of the back row, eyes at 1.1 m' },
];
type LayoutLike = { w: number; d: number; seats?: Array<{ x: number; y: number }>; presenter?: [number, number] | null; door?: { wall: string; at: number } };
export function eyeSpot(L: LayoutLike, key: EyeKey): (Eye & { yaw: number }) | null {
  const seats = L.seats || []; const front: [number, number] = [L.w / 2, 0];
  const cx = seats.length ? seats.reduce((a, s) => a + s.x, 0) / seats.length : L.w / 2, cy = seats.length ? seats.reduce((a, s) => a + s.y, 0) / seats.length : L.d / 2;
  const yawTo = (x: number, y: number, tx: number, ty: number) => (Math.atan2(-(tx - x), -(ty - y)) * 180) / Math.PI;
  const at = (x: number, y: number, z: number, tx: number, ty: number) => ({ x, y, z, yaw: yawTo(x, y, tx, ty) });
  if (key === 'seat') { const s = [...seats].sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]; return s ? at(s.x, s.y, 1.2, front[0], front[1]) : at(L.w / 2, L.d / 2, 1.2, front[0], front[1]); }
  if (key === 'back') { const s = [...seats].sort((a, b) => b.y - a.y || Math.abs(a.x - L.w / 2) - Math.abs(b.x - L.w / 2))[0]; return s ? at(s.x, s.y, 1.2, front[0], front[1]) : at(L.w / 2, L.d - 0.8, 1.2, front[0], front[1]); }
  if (key === 'wheel') { const back = Math.max(...seats.map((s) => s.y), L.d - 1.2); const row = seats.filter((s) => Math.abs(s.y - back) < 0.3).sort((a, b) => a.x - b.x); const s = row[0] || { x: 0.9, y: L.d - 1 }; return at(Math.max(0.6, s.x - 0.7), s.y, 1.1, front[0], front[1]); }
  if (key === 'presenter') { const p = L.presenter || [L.w / 2, Math.min(1.4, L.d * 0.15)]; return at(p[0], Math.max(0.6, p[1]), 1.6, cx, cy); }
  const dr = L.door || { wall: 'S', at: L.w / 2 }; const x = dr.wall === 'W' ? 0.6 : dr.wall === 'E' ? L.w - 0.6 : dr.at, y = dr.wall === 'S' ? L.d - 0.6 : dr.wall === 'N' ? 0.6 : dr.at;
  return at(x, y, 1.6, cx, Math.min(cy, L.d / 2));
}

export function V253RoomStage({ roomId, lens, state, layers, overlays, acoustic, sel, onPick, label, role, edits, onDrag, eyeKey }: {
  roomId: string; lens: Lens; state: V253State; layers: Set<LiteLayer>; overlays: Set<Overlay>; acoustic?: boolean; sel: string | null; onPick: (p: V253Pick | null) => void; label: string; role: string;
  /** V2.5.3's edits (Optimize lens): the room as arranged in 3D */ edits?: V253Edits | null;
  /** dragging the selected object across the floor, in metres */ onDrag?: (id: string, dx: number, dy: number, phase: 'move' | 'end') => void;
  /** seen from where a person would be, at eye level */ eyeKey?: EyeKey | null;
}) {
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.innerWidth < 560);
  useEffect(() => { const up = () => setSmall(window.innerWidth < 560); window.addEventListener('resize', up); return () => window.removeEventListener('resize', up); }, []);
  const first = useMemo(() => v253Room(roomId, { mode: lens, state, layers: [], cover: [] }, { yaw: 30, small }), [roomId]);   // eslint-disable-line
  const big = !!(first?.L as { big?: boolean } | undefined)?.big;
  const c = useCam({ yaw: big ? 24 : 30, pitch: big ? 42 : 36, zoom: 1 });
  const cover = [...overlays].map((o) => COVER[o]).filter(Boolean) as string[]; if (acoustic) cover.push('acoustic');
  const lk = [...layers].sort().join(','), ck = cover.join(',');
  const yawStep = Math.round(c.cam.yaw);   // the scene changes with the yaw (faces turning towards or away); pitch and zoom only move the camera
  // the selected object, by V2.5.3's object id; a device code from the address (?device=) is found through the layout's device ids
  const ek = edits ? JSON.stringify(edits) : '';
  const res = useMemo(() => { setV253Role(role); return v253Room(roomId, { mode: lens, state, layers: lk ? lk.split(',') : [], cover, sel, edits: edits ?? null }, { yaw: yawStep, small }); }, [roomId, lens, state, lk, ck, sel, yawStep, small, role, ek]);   // eslint-disable-line
  const spot = eyeKey && res ? eyeSpot(res.L as unknown as LayoutLike, eyeKey) : null; const sk = spot ? `${eyeKey}:${spot.x.toFixed(2)},${spot.y.toFixed(2)}` : '';
  // stepping into a place turns the person to face where they would look; stepping out returns to the view from above
  useEff2(() => { if (spot) c.setCam((k) => ({ ...k, yaw: spot.yaw, pitch: 36, zoom: 1, px: 0, py: 0 })); else c.reset(); }, [sk]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!res) return null;
  const L = res.L; const objs = L.objs || [];
  const pick = (id: string) => { const obj = objs.find((o) => o.id === id); if (!obj) return; if (id === sel) { onPick(null); return; } const code = obj.deviceId ? String(obj.deviceId).split(':').slice(1).join(':') : null; onPick({ obj, code }); };
  const counts = objs.reduce((m, o) => { m[o.kind] = (m[o.kind] || 0) + 1; return m; }, {} as Record<string, number>);
  return <div data-testid="lite-room-3d" data-objects={objs.length} data-edits={ek ? 'yes' : 'no'} data-hero={L.hero ? 'yes' : 'no'} data-kinds={Object.entries(counts).map(([k, n]) => `${k}:${n}`).join(' ')} data-state={state} data-sel={sel || ''} data-eye={eyeKey || ''} data-eye-at={spot ? `${spot.x.toFixed(2)},${spot.y.toFixed(2)},${spot.z}` : ''} data-room-wd={`${L.w},${L.d}`}>
    <L3View sc={res.sc as unknown as L3Scene} c={c} label={label} onNav={() => undefined} S={62} defs={v253Defs()} v253 sel={sel} onObj={pick} onObjDrag={spot ? undefined : onDrag} eye={spot} tall />
  </div>;
}

/** The V2.5.3 object id for a device code in a room's layout (so ?device= and the side panel select the same thing in the furnished view). */
export function v253ObjFor(roomId: string, state: V253State, lens: Lens, code: string | null): string | null {
  if (!code) return null; const r = v253Room(roomId, { mode: lens, state, layers: [], cover: [] }, { yaw: 30, small: false });
  return r?.L.objs.find((o) => o.deviceId === `${roomId}:${code}`)?.id ?? null;
}
