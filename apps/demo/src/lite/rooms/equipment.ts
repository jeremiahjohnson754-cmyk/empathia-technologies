/**
 * Equipment-level detail (13 Nov 2026, founder: "an accurately positioned camera, microphones, touch panel, displays, loudspeakers, and
 * cable or network information in Engineer mode … the stadium commentary booth … the actual types of audio consoles, intercom equipment,
 * monitors, microphones and communications infrastructure appropriate to that environment").
 *
 * Campus rooms: the room's design record (campus/design.ts) is read as it is — every position (code, class, mount, identity, installed
 * asset, provenance) and every connection the design rules propose — and put on the room: the devices V2.5.3 drew are tied to their
 * positions, what sits in the rack is added, and each connection becomes a cable run along the ceiling void. Nothing is invented: a
 * position with no asset says so; a connection is PROPOSED, never traced.
 *
 * The other worlds' rooms: each Empathia program states the equipment its room type needs (a commentary booth's commentary unit, headset
 * microphones, lip microphones, intercom key panel, IP audio codec, network switch, broadcast monitors and the wall box to the broadcast
 * compound; a mix position's console, near-field monitors, wireless receivers, intercom station and stage link), placed and wired by the
 * program. Classes of device only — never a make, model or serial — and every run labelled as designed, not traced.
 */
import type { Piece, Program } from './programs.js';

type Run = NonNullable<Program['runs']>[number]; type P3 = [number, number, number];
/** a run from a to b: up into the ceiling void, across, along, down — the route a containment would take */
export const route = (a: P3, b: P3, zc: number): P3[] => [a, [a[0], a[1], zc], [b[0], a[1], zc], [b[0], b[1], zc], b];
/** a run along the floor (a floor box to a desk, a stage link): low, then up */
const floorRoute = (a: P3, b: P3): P3[] => [a, [a[0], a[1], 0.03], [b[0], a[1], 0.03], [b[0], b[1], 0.03], b];
const top = (p: Piece): P3 => [p.x, p.y, (p.z || 0) + p.h * 0.5];

// ---------------------------------------------------------------------------------------------------------------- campus rooms
export interface RecPosition { code: string; cat: string; catLabel: string; label: string; layer: string; x: number; y: number; z: number; mount: string; furniture: boolean; asset: string | null; identity: string; device: string; provenance: string }
export interface RecConnection { id: string; from: string; to: string; kind: string; state: string; why: string }
const RACKED = new Set(['dsp', 'compute', 'control', 'switch', 'amplifier', 'encoder', 'router', 'processor', 'recorder', 'ups']);
const KIND_OF: Record<string, Run['kind']> = { network: 'network', signal: 'signal', control: 'control', power: 'power', audio: 'audio', usb: 'signal', hdmi: 'signal' };

/** Ties a V2.5.3-drawn room to its design record: device pieces get their record and connections; rack devices are added; runs drawn. */
export function equipFromRecord(P: Program, rec: { positions: RecPosition[]; connections: RecConnection[] }, objDevice: Record<string, string>): Program {
  // positions are keyed by their code (A-0101): the connections and V2.5.3's device ids name positions, not the asset installed there
  const byAsset = new Map<string, RecPosition>(); for (const q of rec.positions) if (!q.furniture) byAsset.set(q.code, q);
  const key = (q: RecPosition) => q.code; const name = (k: string) => byAsset.get(k)?.label || k;
  const zc = Math.max(2.3, P.H - 0.25); const pieces = [...P.pieces]; const runs: Run[] = [];
  const said = (q: RecPosition) => `${q.catLabel} · ${q.device} · ${q.mount} · ${q.code}${q.asset ? ` · asset ${q.asset}` : ' · no asset recorded'} · identity ${q.identity.toLowerCase()} · ${q.provenance}`;
  const netOf = (k: string) => rec.connections.filter((c) => c.from === k || c.to === k).map((c) => `${(KIND_OF[c.kind] || 'control')} ${c.from === k ? '→' : '←'} ${name(c.from === k ? c.to : c.from)} (${c.state.toLowerCase()}: ${c.why})`);
  // the devices V2.5.3 drew: their record and connections
  for (const p of pieces) { const k = objDevice[p.id]; const q = k ? byAsset.get(k) : undefined; if (!q) continue; p.device = said(q); p.net = netOf(key(q)); }
  // what V2.5.3 did not draw (rack devices), at their recorded position, stacked in the rack
  const racked = rec.positions.filter((q) => !q.furniture && RACKED.has(q.cat)); racked.forEach((q, i) => {
    pieces.push({ id: `rec-${q.code}`, kind: 'rackpos', label: q.label, x: q.x, y: q.y, w: 0.5, d: 0.4, h: 0.5, z: 0.4, device: said(q), net: netOf(key(q)), eqOnly: true }); });
  // each proposed connection, as a run between the two positions
  const at = (k: string): P3 | null => { const q = byAsset.get(k); if (!q) return null; return [q.x, q.y, racked.includes(q) ? 0.65 : Math.max(0.3, q.z)]; };
  for (const c of rec.connections) { const a = at(c.from), b = at(c.to); if (!a || !b) continue; const kind = KIND_OF[c.kind] || 'control';
    runs.push({ kind, label: `${kind === 'network' ? 'Network' : kind === 'signal' ? 'Signal' : kind[0]!.toUpperCase() + kind.slice(1)} · ${name(c.from)} → ${name(c.to)} · ${c.why} · ${c.state.toLowerCase()}, not traced`, pts: route(a, b, zc) }); }
  return { ...P, pieces, runs };
}

// ---------------------------------------------------------------------------------------------------------------- the other worlds
const cls = (what: string) => `${what} (designed by the room type's program; a class of device, not a make or model)`;
interface EqItem { id: string; kind: string; label: string; at: P3; w?: number; d?: number; h?: number; rot?: number; device: string; eqOnly?: boolean }
const piece = (e: EqItem): Piece => ({ id: e.id, kind: e.kind, label: e.label, x: e.at[0], y: e.at[1], z: e.at[2], w: e.w ?? 0.3, d: e.d ?? 0.2, h: e.h ?? 0.1, rot: e.rot, device: cls(e.device), eqOnly: e.eqOnly });

/** A cabinet of equipment at (x, y): its devices stacked, each a piece shown with equipment. */
function cabinet(prefix: string, x: number, y: number, items: Array<[string, string]>, rot = 0): Piece[] {
  return items.map(([label, device], i) => piece({ id: `${prefix}-${i + 1}`, kind: 'rackdev', label, at: [x, y, 0.2 + i * 0.13], w: 0.44, d: 0.36, h: 0.09, rot, device, eqOnly: true }));
}
/** wire every listed piece to a target, by kind; the run says what it carries */
function wire(pieces: Piece[], from: string[], to: Piece, kind: Run['kind'], carries: string, zc: number, floor = false): Run[] {
  return from.map((id) => pieces.find((p) => p.id === id)).filter((p): p is Piece => !!p).map((p) => ({ kind, label: `${carries} · ${p.label} → ${to.label} · designed, not traced`, pts: (floor ? floorRoute : route)(top(p), top(to), zc) }));
}
const add = (P: Program, extra: Piece[], runs: Run[]): Program => ({ ...P, pieces: [...P.pieces, ...extra], runs: [...(P.runs || []), ...runs] });

/** Equipment and cabling for a program of the other worlds, by its room type. */
export function equipProgram(P: Program): Program {
  const zc = Math.max(2.3, P.H - 0.25); const ps = P.pieces; const get = (id: string) => ps.find((p) => p.id === id);
  switch (P.key) {
    case 'commentary-booth': {
      const desk = get('desk')!; const xs = desk.at || []; const ex: Piece[] = [];
      xs.forEach(([x], i) => { ex.push(piece({ id: `headset-${i + 1}`, kind: 'headset', label: `Commentator headset ${i + 1} with boom microphone`, at: [x + 0.2, 0.32, 0.74], w: 0.2, d: 0.18, h: 0.08, device: 'broadcast headset with a noise-cancelling dynamic boom microphone' }));
        ex.push(piece({ id: `lipmic-${i + 1}`, kind: 'lipmic', label: `Lip microphone ${i + 1}`, at: [x - 0.18, 0.3, 0.74], w: 0.06, d: 0.22, h: 0.05, device: 'hand-held lip ribbon microphone for loud crowds' })); });
      ex.push(piece({ id: 'intercom', kind: 'intercom', label: 'Intercom key panel', at: [desk.x + desk.w / 2 - 0.3, 0.38, 0.74], w: 0.44, d: 0.18, h: 0.09, device: 'desktop intercom key panel, 12 keys: director, producer, stats, presentation, engineering' }));
      ex.push(piece({ id: 'wallbox', kind: 'floorbox', label: 'Wall box to the broadcast compound', at: [0.3, 0.05, 0.4], w: 0.3, d: 0.06, h: 0.2, rot: 180, device: 'wall box: two fibres, four audio tie-lines and two network ports to the broadcast compound' }));
      const rx = P.w - 0.45, ry = P.d - 0.5; ex.push(piece({ id: 'commsrack', kind: 'rack', label: 'Communications rack', at: [rx, ry, 0], w: 0.6, d: 0.8, h: 1.2, rot: 90, device: 'half-height communications rack' }));
      ex.push(...cabinet('comms', rx, ry, [['IP audio codec', 'IP audio codec carrying the commentary mix to the broadcast compound'], ['Network switch (PoE)', 'managed network switch with power over Ethernet'], ['Intercom interface', 'intercom-to-network interface'], ['Power distribution', 'switched power distribution unit']], 90));
      const all = [...ps, ...ex]; const unit = get('unit')!, codec = all.find((p) => p.id === 'comms-1')!, sw = all.find((p) => p.id === 'comms-2')!, box = all.find((p) => p.id === 'wallbox')!;
      const runs = [...wire(all, xs.map((_, i) => `headset-${i + 1}`), unit, 'audio', 'Headset microphone and earpiece', zc, true), ...wire(all, xs.map((_, i) => `lipmic-${i + 1}`), unit, 'audio', 'Lip microphone', zc, true),
        ...wire(all, ['unit'], codec, 'network', 'Commentary mix (audio over IP)', zc), ...wire(all, ['intercom'], sw, 'network', 'Intercom (over IP)', zc), ...wire(all, ['comms-1', 'comms-2'], box, 'network', 'To the broadcast compound (fibre)', zc), ...wire(all, ['desk'], box, 'signal', 'Programme and multiview feeds to the monitors', zc, true)];
      return add(P, ex, runs); }
    case 'mix-position': {
      const con = get('console')!; const ex: Piece[] = [
        piece({ id: 'nearfield-l', kind: 'speakerbox', label: 'Near-field monitor, left', at: [con.x - con.w / 2 + 0.2, con.y + 0.25, 1.0], w: 0.18, d: 0.2, h: 0.28, device: 'powered near-field studio monitor' }),
        piece({ id: 'nearfield-r', kind: 'speakerbox', label: 'Near-field monitor, right', at: [con.x + con.w / 2 - 0.2, con.y + 0.25, 1.0], w: 0.18, d: 0.2, h: 0.28, device: 'powered near-field studio monitor' }),
        piece({ id: 'talkback', kind: 'lipmic', label: 'Talkback microphone', at: [con.x + 0.6, con.y - 0.2, 0.78], w: 0.04, d: 0.3, h: 0.04, device: 'gooseneck talkback microphone' }),
        piece({ id: 'intercom', kind: 'intercom', label: 'Intercom station', at: [con.x - con.w / 2 - 0.05, con.y, 0.78], w: 0.3, d: 0.2, h: 0.12, device: 'two-channel intercom station' }),
        piece({ id: 'stagelink', kind: 'floorbox', label: 'Stage link (fibre to the stage rack)', at: [0.3, 0.15, 0.03], w: 0.3, d: 0.2, h: 0.08, device: 'fibre stage link to the stage rack and its stage boxes' }),
        ...cabinet('foh', 0.5, P.d - 0.9, [['Wireless microphone receivers', 'four-channel wireless microphone receiver'], ['System processor', 'loudspeaker system processor'], ['Network switch', 'managed network switch for audio over IP'], ['Playback computer', 'playback computer'], ['Power conditioner', 'power conditioner']], 90)];
      const all = [...ps, ...ex]; const sw = all.find((p) => p.id === 'foh-3')!, proc = all.find((p) => p.id === 'foh-2')!, link = all.find((p) => p.id === 'stagelink')!;
      return add(P, ex, [...wire(all, ['console'], sw, 'network', 'Console on the audio network', zc, true), ...wire(all, ['foh-1', 'foh-4'], sw, 'network', 'Wireless and playback on the network', zc, true), ...wire(all, ['foh-3'], link, 'network', 'Audio network to the stage (fibre)', zc, true),
        ...wire(all, ['nearfield-l', 'nearfield-r'], all.find((p) => p.id === 'console')!, 'audio', 'Monitor output', zc, true), ...wire(all, ['intercom', 'talkback'], all.find((p) => p.id === 'console')!, 'audio', 'Talkback and intercom', zc, true), ...wire(all, ['foh-2'], link, 'network', 'System processing to the loudspeaker amplifiers', zc, true)]); }
    case 'press-box': {
      const rows = ps.filter((p) => p.kind === 'deskrun'); const ex: Piece[] = []; const cab = piece({ id: 'commscab', kind: 'rack', label: 'Communications cabinet', at: [0.5, P.d - 0.6, 0], w: 0.6, d: 0.8, h: 1.8, rot: 90, device: 'full-height communications cabinet' });
      ex.push(cab, ...cabinet('press', 0.5, P.d - 0.6, [['Network switch (PoE)', 'managed network switch with power over Ethernet, a port for every position'], ['IPTV encoder', 'IPTV encoder for the broadcast feed'], ['Firewall', 'press network firewall'], ['Power distribution', 'switched power distribution unit']], 90));
      for (const r of rows) { const n = (r.at || []).length; for (let i = 0; i < n; i += 4) { const [x] = r.at![i]!; ex.push(piece({ id: `fb-${r.id}-${i / 4 + 1}`, kind: 'floorbox', label: `Floor box, ${r.label.replace(/ \(\d+\)/, '')}, positions ${i + 1}–${Math.min(n, i + 4)}`, at: [x + 0.4, r.y, (r.z || 0) + 0.02], w: 0.3, d: 0.3, h: 0.03, device: 'floor box: four power outlets, four network ports', eqOnly: true })); } }
      const waps = [P.w * 0.25, P.w * 0.5, P.w * 0.75].map((x, i) => piece({ id: `wap-${i + 1}`, kind: 'wap', label: `Wireless access point ${i + 1}`, at: [x, P.d / 2, P.H - 0.05], w: 0.22, d: 0.22, h: 0.04, device: 'ceiling wireless access point', eqOnly: true }));
      ex.push(...waps); const all = [...ps, ...ex]; const sw = all.find((p) => p.id === 'press-1')!;
      return add(P, ex, [...wire(all, ex.filter((p) => p.id.startsWith('fb-')).map((p) => p.id), sw, 'network', 'Position data and power', zc), ...wire(all, waps.map((p) => p.id), sw, 'network', 'Wireless access (PoE)', zc), ...wire(all, ['press-2'], sw, 'signal', 'Broadcast feed to the press monitors (IPTV)', zc)]); }
    default: return wireGeneric(P, zc);
  }
}

/** Rooms whose program names displays, panels and loudspeakers: an AV cabinet where the program puts the bar or a wall, its devices, and a
 *  run from each display, panel, camera and loudspeaker to it. */
function wireGeneric(P: Program, zc: number): Program {
  const ps = P.pieces; const avs = ps.filter((p) => ['display', 'panel', 'camera', 'ledwall', 'column', 'clock'].includes(p.kind)); if (!avs.length && !P.speakers.length) return P;
  const bar = ps.find((p) => p.kind === 'bar' || p.kind === 'island' || p.kind === 'vanity'); const cx = bar ? bar.x : 0.35, cy = bar ? bar.y + (bar.kind === 'bar' ? 0.6 : 0) : P.d - 0.6;
  const ex: Piece[] = cabinet('av', cx, cy, [['Network switch (PoE)', 'managed network switch with power over Ethernet'], ['Media player and IPTV receiver', 'media player and IPTV receiver'], ['Amplifier and audio processor', 'networked amplifier with audio processing'], ['Control processor', 'room control processor']]);
  const wap = piece({ id: 'wap-1', kind: 'wap', label: 'Wireless access point', at: [P.w / 2, P.d / 2, P.H - 0.05], w: 0.22, d: 0.22, h: 0.04, device: 'ceiling wireless access point', eqOnly: true }); ex.push(wap);
  const spk = P.speakers.map(([x, y], i) => piece({ id: `spk-${i + 1}`, kind: 'ceildev', label: `Ceiling loudspeaker ${i + 1}`, at: [x, y, P.H - 0.04], w: 0.2, d: 0.2, h: 0.03, device: 'ceiling loudspeaker', eqOnly: true })); ex.push(...spk);
  const all = [...ps, ...ex]; const sw = all.find((p) => p.id === 'av-1')!, media = all.find((p) => p.id === 'av-2')!, amp = all.find((p) => p.id === 'av-3')!, ctl = all.find((p) => p.id === 'av-4')!;
  return add(P, ex, [...wire(all, avs.filter((p) => p.kind !== 'panel').map((p) => p.id), media, 'signal', 'Video to the display', zc), ...wire(all, avs.filter((p) => p.kind === 'panel').map((p) => p.id), ctl, 'control', 'Room control', zc),
    ...wire(all, spk.map((p) => p.id), amp, 'audio', 'Loudspeaker line', zc), ...wire(all, ['wap-1', 'av-2', 'av-3', 'av-4'], sw, 'network', 'Network (PoE where powered)', zc)]);
}
