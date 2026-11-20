/**
 * Room Control — the model behind a room's panel (#/control/<room>; founder, 10 Nov: "make it fully interactive and fully integrated
 * into Lite as a capability … able to connect live real systems"). It keeps V2.5.3's language (one sentence, one room, one dock, five
 * modes) and gives the dock something real to act on.
 *
 * The panel is generated from the room's own record (campus/design.ts): its sources are what its equipment can show, its displays are
 * its display positions, its cameras are its camera positions. A room is never offered a control for equipment it does not have.
 * Lighting and climate are not in these room records, so the panel has no lighting or climate control and says so.
 *
 * An action is turned into the commands a control system would be sent, one per position, each with its reason. Commands go to an
 * adapter (control/adapter.ts). The only adapter shipped is SIMULATED: it answers as the room would, and every answer says it is
 * simulated. No command leaves the browser. Connecting a real system is an adapter that has not been written or authorised.
 */
import type { RoomRecord, Position } from '../campus/design.js';
import { shortName } from '../campus/canon.js';

export interface Source { id: string; label: string; kind: 'meeting' | 'laptop' | 'share' | 'camera'; /** the position that provides it */ from: string | null; icon: 'users' | 'device' | 'external' | 'camera' }
export interface Surface { code: string; label: string; cat: string }
export interface Cam { code: string; label: string; presets: string[] }
export interface Scene { id: string; label: string; says: string }
export interface Panel { roomId: string; sources: Source[]; displays: Surface[]; cameras: Cam[]; mics: Position[]; speakers: Position[]; dsp: Position | null; compute: Position | null; switcher: Position | null; touch: Position | null; /** the room has something that listens (microphones, or a bar with microphones in it) */ hears: boolean; /** what is switched on and off when the room is: its screens, or the room system when it has none */ powered: string[]; scenes: Scene[]; lacks: string[] }
export interface State { v: 1; power: boolean; routes: Record<string, string>; volume: number; muted: boolean; micMuted: boolean; privacy: boolean; preset: Record<string, string>; scene: string | null; rev: number }
export type Action =
  | { type: 'power'; on: boolean } | { type: 'route'; display: string; source: string } | { type: 'routeAll'; source: string }
  | { type: 'volume'; value: number } | { type: 'mute'; on: boolean } | { type: 'micMute'; on: boolean } | { type: 'privacy'; on: boolean }
  | { type: 'preset'; camera: string; preset: string } | { type: 'scene'; id: string };
export interface Command { target: string; verb: 'power' | 'route' | 'volume' | 'mute' | 'mic-mute' | 'camera' | 'preset'; value: string | number | boolean; why: string }
export type Refusal = { why: string[] };
export const OFF = 'off';
const SCREENS = ['display', 'projector', 'ledwall'];
const first = (r: RoomRecord, ...cats: string[]) => r.positions.find((p) => !p.furniture && cats.includes(p.cat)) || null;

/** The panel a room's equipment allows. */
export function panelOf(r: RoomRecord): Panel {
  const hw = r.positions.filter((p) => !p.furniture); const of = (...c: string[]) => hw.filter((p) => c.includes(p.cat));
  const compute = first(r, 'compute'); const bar = first(r, 'bar'); const switcher = first(r, 'switcher'); const displays = of(...SCREENS).map((p) => ({ code: p.code, label: p.label, cat: p.cat }));
  const cams = of('camera', 'bar'); const lectern = r.positions.some((p) => p.cat === 'lectern');
  const sources: Source[] = [];
  if (displays.length) {
    if (compute || bar) sources.push({ id: 'meeting', label: 'Meeting', kind: 'meeting', from: (compute || bar)!.code, icon: 'users' });
    sources.push({ id: 'laptop', label: 'Laptop cable', kind: 'laptop', from: (switcher || compute || displays[0] && { code: displays[0].code })?.code || null, icon: 'device' });
    if (compute) sources.push({ id: 'share', label: 'Wireless share', kind: 'share', from: compute.code, icon: 'external' });
    // a room with a video switcher can put a camera on a screen (overflow rooms, studios, halls)
    if (switcher) for (const c of of('camera')) sources.push({ id: `cam:${c.code}`, label: c.label, kind: 'camera', from: c.code, icon: 'camera' });
  }
  const cameras: Cam[] = cams.map((c) => ({ code: c.code, label: c.label, presets: ['Room', 'Table', ...(lectern ? ['Lectern'] : []), ...(of('camera').length > 1 || switcher ? ['Audience'] : [])] }));
  const scenes: Scene[] = [];
  if (sources.some((s) => s.id === 'meeting')) scenes.push({ id: 'meet', label: 'Meet', says: 'The meeting on every screen, cameras on the room, microphones on.' });
  if (displays.length) scenes.push({ id: 'present', label: 'Present', says: 'The laptop on every screen, microphones on, a lower volume.' });
  scenes.push({ id: 'off', label: 'All off', says: 'Screens off, microphones muted.' });
  const lacks = [...(!displays.length ? ['screen'] : []), ...(!cams.length ? ['camera'] : []), ...(!of('micceil', 'mictable', 'micwireless', 'bar').length ? ['microphones'] : []), ...(!of('speaker', 'bar').length ? ['loudspeakers'] : [])];
  const system = compute || bar || first(r, 'touch');
  return { roomId: r.outline.id, sources, displays, cameras, mics: of('micceil', 'mictable', 'micwireless'), speakers: of('speaker'), dsp: first(r, 'dsp'), compute, switcher, touch: first(r, 'touch'), hears: of('micceil', 'mictable', 'micwireless', 'bar').length > 0, powered: displays.length ? displays.map((d) => d.code) : system ? [system.code] : [], scenes, lacks };
}

/** How a room is found when nobody has touched its panel: off, nothing routed. */
export function initial(p: Panel): State {
  return { v: 1, power: false, routes: Object.fromEntries(p.displays.map((d) => [d.code, OFF])), volume: 50, muted: false, micMuted: true, privacy: false, preset: Object.fromEntries(p.cameras.map((c) => [c.code, 'Room'])), scene: 'off', rev: 0 };
}
/** A stored state is used only if it still fits the room (a room whose record changed starts clean). */
export function fits(p: Panel, s: unknown): s is State {
  const x = s as State; return !!x && x.v === 1 && typeof x.power === 'boolean' && typeof x.volume === 'number' && x.volume >= 0 && x.volume <= 100 && !!x.routes && !!x.preset
    && p.displays.every((d) => typeof x.routes[d.code] === 'string' && (x.routes[d.code] === OFF || p.sources.some((so) => so.id === x.routes[d.code]))) && Object.keys(x.routes).length === p.displays.length
    && p.cameras.every((c) => c.presets.includes(x.preset[c.code] || '')) && Object.keys(x.preset).length === p.cameras.length;
}
const audioTarget = (p: Panel) => p.dsp?.code || p.compute?.code || p.speakers[0]?.code || p.roomId;
const SAY: Record<Source['kind'], string> = { meeting: 'the meeting', laptop: 'the laptop', share: 'a wireless share', camera: '' };
const sourceName = (p: Panel, id: string) => { if (id === OFF) return 'nothing'; const s = p.sources.find((x) => x.id === id); return s ? SAY[s.kind] || s.label : id; };

/** Apply an action: the new state, the commands a control system would be sent, and what happened in words. Refused with reasons when it cannot be. */
export function reduce(p: Panel, s: State, a: Action): { state: State; commands: Command[]; said: string } | Refusal {
  const n: State = { ...s, routes: { ...s.routes }, preset: { ...s.preset }, rev: s.rev + 1 }; const cmds: Command[] = []; let said = '';
  const route = (display: string, source: string, why: string) => { if (n.routes[display] === source) return; n.routes[display] = source; cmds.push({ target: display, verb: 'route', value: source, why }); const from = p.sources.find((x) => x.id === source)?.from; if (p.switcher && from && source !== OFF) cmds.push({ target: p.switcher.code, verb: 'route', value: `${from}→${display}`, why: 'the switcher makes the route' }); };
  const powerOn = (why: string) => { if (n.power) return; n.power = true; for (const t of p.powered) cmds.push({ target: t, verb: 'power', value: true, why }); };
  switch (a.type) {
    case 'power':
      if (a.on === s.power) return { why: [`The room is already ${s.power ? 'on' : 'off'}.`] };
      if (!p.powered.length) return { why: ['This room’s record has nothing that is switched on or off.'] };
      if (a.on) { powerOn('the room was switched on'); said = p.displays.length ? 'The room is on. Nothing is shown until a source is chosen.' : 'The room is on.'; n.scene = null; }
      else { n.power = false; for (const t of p.powered) cmds.push({ target: t, verb: 'power', value: false, why: 'the room was switched off' }); for (const d of p.displays) n.routes[d.code] = OFF; if (!n.micMuted) { n.micMuted = true; cmds.push({ target: audioTarget(p), verb: 'mic-mute', value: true, why: 'a room that is off does not listen' }); } n.scene = 'off'; said = 'The room is off: screens off, microphones muted.'; }
      break;
    case 'route': {
      if (!p.displays.some((d) => d.code === a.display)) return { why: ['That screen is not in this room.'] };
      if (a.source !== OFF && !p.sources.some((x) => x.id === a.source)) return { why: ['That source is not in this room.'] };
      if (s.routes[a.display] === a.source) return { why: [`${p.displays.find((d) => d.code === a.display)!.label} already shows ${sourceName(p, a.source)}.`] };
      if (a.source !== OFF) powerOn('a source was chosen');
      route(a.display, a.source, 'chosen on the panel'); n.scene = null; said = `${p.displays.find((d) => d.code === a.display)!.label} shows ${sourceName(p, a.source)}.`; break; }
    case 'routeAll': {
      if (!p.displays.length) return { why: ['This room has no screen.'] };
      if (a.source !== OFF && !p.sources.some((x) => x.id === a.source)) return { why: ['That source is not in this room.'] };
      if (p.displays.every((d) => s.routes[d.code] === a.source)) return { why: [`Every screen already shows ${sourceName(p, a.source)}.`] };
      if (a.source !== OFF) powerOn('a source was chosen');
      for (const d of p.displays) route(d.code, a.source, 'chosen for every screen'); n.scene = null; said = `${p.displays.length === 1 ? 'The screen shows' : `All ${p.displays.length} screens show`} ${sourceName(p, a.source)}.`; break; }
    case 'volume': {
      if (!Number.isFinite(a.value)) return { why: ['The volume is a number from 0 to 100.'] };
      const v = Math.max(0, Math.min(100, Math.round(a.value))); if (v === s.volume) return { why: [`The volume is already ${v}.`] };
      n.volume = v; cmds.push({ target: audioTarget(p), verb: 'volume', value: v, why: 'set on the panel' }); if (s.muted && v > s.volume) { n.muted = false; cmds.push({ target: audioTarget(p), verb: 'mute', value: false, why: 'turning the volume up un-mutes' }); } said = `Volume ${v}${s.muted && v > s.volume ? ', sound on' : ''}.`; break; }
    case 'mute': if (a.on === s.muted) return { why: [`The sound is already ${s.muted ? 'muted' : 'on'}.`] }; n.muted = a.on; cmds.push({ target: audioTarget(p), verb: 'mute', value: a.on, why: 'set on the panel' }); said = a.on ? 'The room’s loudspeakers are muted.' : 'The room’s loudspeakers are on.'; break;
    case 'micMute':
      if (a.on === s.micMuted) return { why: [`The microphones are already ${s.micMuted ? 'muted' : 'on'}.`] };
      if (!p.hears) return { why: ['This room’s record has no microphone.'] };
      if (!a.on && s.privacy) return { why: ['Privacy is on: turn privacy off before the microphones can be turned on.'] };
      n.micMuted = a.on; cmds.push({ target: audioTarget(p), verb: 'mic-mute', value: a.on, why: 'set on the panel' }); said = a.on ? 'The microphones are muted.' : 'The microphones are on.'; break;
    case 'privacy':
      if (a.on === s.privacy) return { why: [`Privacy is already ${s.privacy ? 'on' : 'off'}.`] };
      if (!p.cameras.length && !p.hears) return { why: ['This room’s record has no camera and no microphone: there is nothing for privacy to close.'] };
      n.privacy = a.on;
      if (a.on) { if (!n.micMuted) { n.micMuted = true; cmds.push({ target: audioTarget(p), verb: 'mic-mute', value: true, why: 'privacy mutes the microphones' }); } for (const c of p.cameras) cmds.push({ target: c.code, verb: 'camera', value: false, why: 'privacy closes the cameras' }); said = `Privacy is on: microphones muted${p.cameras.length ? ', cameras closed' : ''}. The room cannot be heard or seen.`; }
      else { for (const c of p.cameras) cmds.push({ target: c.code, verb: 'camera', value: true, why: 'privacy was turned off' }); said = `Privacy is off${p.cameras.length ? ': cameras open' : ''}. The microphones stay muted until you turn them on.`; }
      break;
    case 'preset': {
      const c = p.cameras.find((x) => x.code === a.camera); if (!c) return { why: ['That camera is not in this room.'] };
      if (!c.presets.includes(a.preset)) return { why: [`${c.label} has no preset called ${a.preset}.`] };
      if (s.privacy) return { why: ['Privacy is on: the cameras are closed.'] };
      if (s.preset[c.code] === a.preset) return { why: [`${c.label} is already on ${a.preset}.`] };
      n.preset[c.code] = a.preset; cmds.push({ target: c.code, verb: 'preset', value: a.preset, why: 'recalled on the panel' }); said = `${c.label} moves to the ${a.preset} preset.`; break; }
    case 'scene': {
      const sc = p.scenes.find((x) => x.id === a.id); if (!sc) return { why: ['This room has no such scene.'] };
      if (a.id === 'off') {
        if (!s.power && s.micMuted && s.scene === 'off') return { why: ['Everything is already off.'] };
        if (n.power) { n.power = false; for (const t of p.powered) cmds.push({ target: t, verb: 'power', value: false, why: 'the All off scene' }); }
        for (const d of p.displays) n.routes[d.code] = OFF;
        if (!n.micMuted) { n.micMuted = true; cmds.push({ target: audioTarget(p), verb: 'mic-mute', value: true, why: 'the All off scene' }); }
        n.scene = 'off'; said = 'All off: screens off, microphones muted.'; break;
      }
      const src = a.id === 'meet' ? 'meeting' : 'laptop'; powerOn(`the ${sc.label} scene`);
      for (const d of p.displays) route(d.code, src, `the ${sc.label} scene`);
      if (n.privacy) { n.privacy = false; for (const c of p.cameras) cmds.push({ target: c.code, verb: 'camera', value: true, why: `the ${sc.label} scene` }); }
      if (n.micMuted) { n.micMuted = false; cmds.push({ target: audioTarget(p), verb: 'mic-mute', value: false, why: `the ${sc.label} scene` }); }
      const vol = a.id === 'meet' ? 55 : 45; if (n.volume !== vol) { n.volume = vol; cmds.push({ target: audioTarget(p), verb: 'volume', value: vol, why: `the ${sc.label} scene` }); }
      if (n.muted) { n.muted = false; cmds.push({ target: audioTarget(p), verb: 'mute', value: false, why: `the ${sc.label} scene` }); }
      if (a.id === 'meet') for (const c of p.cameras) if (n.preset[c.code] !== 'Room') { n.preset[c.code] = 'Room'; cmds.push({ target: c.code, verb: 'preset', value: 'Room', why: 'the Meet scene' }); }
      n.scene = a.id; said = `${sc.label}: ${sc.says}`; break; }
  }
  return { state: n, commands: cmds, said };
}

/** The one sentence: what the room is doing now, in words. */
export function sentenceOf(r: RoomRecord, p: Panel, s: State): string {
  const name = shortName(r.outline); if (!s.power && s.micMuted) return `${name} is off.`;
  const shown = [...new Set(p.displays.map((d) => s.routes[d.code]!))]; const all = shown.length === 1;
  const pic = !p.displays.length ? '' : all ? (shown[0] === OFF ? 'shows nothing' : `shows ${sourceName(p, shown[0]!)}${p.displays.length > 1 ? ` on ${p.displays.length === 2 ? 'both' : `all ${p.displays.length}`} screens` : ''}`) : `shows ${p.displays.map((d) => `${sourceName(p, s.routes[d.code]!)} on ${d.label}`).join(', ')}`;
  const sound = s.muted ? 'sound muted' : `volume ${s.volume}`; const mics = s.privacy ? 'privacy on' : s.micMuted ? 'microphones muted' : 'microphones on';
  return `${name} ${pic ? `${pic}, ` : 'is on, '}${sound}, ${mics}.`;
}
/** Meter positions for the panel, from the state alone. They are a picture of the state, not a level: nothing is measured. */
export function metersOf(s: State): { mic: number; program: number } {
  const anyShown = Object.values(s.routes).some((x) => x !== OFF);
  return { mic: s.micMuted || s.privacy ? 0 : 0.62, program: !s.power || s.muted || !anyShown ? 0 : Math.round((0.25 + (s.volume / 100) * 0.7) * 100) / 100 };
}
/** What each display is fed, and through what: the path drawn on the plan (source position → switcher → display). */
export function pathsOf(p: Panel, s: State): Array<{ display: string; source: string; via: string[] }> {
  return p.displays.filter((d) => s.routes[d.code] !== OFF).map((d) => { const src = p.sources.find((x) => x.id === s.routes[d.code]); const via = [src?.from, p.switcher?.code].filter((x): x is string => !!x && x !== d.code); return { display: d.code, source: src?.id || OFF, via: [...new Set(via)] }; });
}
