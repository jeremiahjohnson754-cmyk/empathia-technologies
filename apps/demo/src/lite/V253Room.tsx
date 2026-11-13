/**
 * The furnished room, as V2.5.3 drew it (founder directive 12 Nov 2026, "Lite restoration": "the room should be the hero of the
 * screen"). The drawing is V2.5.3's own code (./v253/vendor.js: liteRoomScene, drawRoomShell, drawObject, layoutOf) running on this
 * campus's room records; the camera, labels and selection are ./l3.tsx. Walls, floor, door, glazing, table, chairs, displays, cameras,
 * microphones, loudspeakers, rack and touch panel are V2.5.3's; coverage (camera view, microphone pickup, loudspeaker coverage,
 * sightlines, acoustic reflections) is drawn by V2.5.3 from the layout's own devices. Geometry is modelled, never surveyed.
 */
import { useMemo, useState, useEffect } from 'react';
import { L3View, useCam } from './l3.js';
import type { L3Scene } from './l3.js';
import { v253Room, v253Defs, setV253Role, type V253State } from './v253/v253room.js';
import type { V253Object } from './v253/vendor.js';
import type { LiteLayer, Overlay, Lens } from './model.js';

/** our overlay switches by V2.5.3's coverage names */
const COVER: Partial<Record<Overlay, string>> = { camera: 'fov', mic: 'mic', speaker: 'spk', sight: 'sight' };

export interface V253Pick { obj: V253Object; code: string | null }

export function V253RoomStage({ roomId, lens, state, layers, overlays, acoustic, sel, onPick, label, role }: {
  roomId: string; lens: Lens; state: V253State; layers: Set<LiteLayer>; overlays: Set<Overlay>; acoustic?: boolean; sel: string | null; onPick: (p: V253Pick | null) => void; label: string; role: string;
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
  const res = useMemo(() => { setV253Role(role); return v253Room(roomId, { mode: lens, state, layers: lk ? lk.split(',') : [], cover, sel }, { yaw: yawStep, small }); }, [roomId, lens, state, lk, ck, sel, yawStep, small, role]);   // eslint-disable-line
  if (!res) return null;
  const L = res.L; const objs = L.objs || [];
  const pick = (id: string) => { const obj = objs.find((o) => o.id === id); if (!obj) return; if (id === sel) { onPick(null); return; } const code = obj.deviceId ? String(obj.deviceId).split(':').slice(1).join(':') : null; onPick({ obj, code }); };
  const counts = objs.reduce((m, o) => { m[o.kind] = (m[o.kind] || 0) + 1; return m; }, {} as Record<string, number>);
  return <div data-testid="lite-room-3d" data-objects={objs.length} data-hero={L.hero ? 'yes' : 'no'} data-kinds={Object.entries(counts).map(([k, n]) => `${k}:${n}`).join(' ')} data-state={state} data-sel={sel || ''}>
    <L3View sc={res.sc as unknown as L3Scene} c={c} label={label} onNav={() => undefined} S={62} defs={v253Defs()} v253 sel={sel} onObj={pick} tall />
  </div>;
}

/** The V2.5.3 object id for a device code in a room's layout (so ?device= and the side panel select the same thing in the furnished view). */
export function v253ObjFor(roomId: string, state: V253State, lens: Lens, code: string | null): string | null {
  if (!code) return null; const r = v253Room(roomId, { mode: lens, state, layers: [], cover: [] }, { yaw: 30, small: false });
  return r?.L.objs.find((o) => o.deviceId === `${roomId}:${code}`)?.id ?? null;
}
