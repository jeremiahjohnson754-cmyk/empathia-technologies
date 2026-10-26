/**
 * Design checks: deterministic rules over the planned design. Every finding is a DESIGN_DEFICIENCY with a stable correlation key,
 * a severity and the rationale for that severity. Ported from `v25RoomChecks` (src/v25-60-room.js).
 *
 * The sightline and PoE checks use MODELED planning ratios and DECLARED catalogue values; they never claim a measurement.
 */
import type { Connection, DesignFinding, PlannedDevice, RoomDesignInput, Severity } from '@empathia/domain-types';
import { inside } from './geometry.js';
import { type Catalog, defaultCatalog } from './catalog.js';
import { liveDevices } from './classify.js';

export function designChecks(d: RoomDesignInput, arch: string | null, C: Catalog = defaultCatalog): DesignFinding[] {
  const out: DesignFinding[] = [];
  const live = liveDevices(d);
  const av = live.filter((x) => !x.furniture);
  const conns = d.connections.filter((c) => !c.removed);
  const byId = new Map(live.map((x) => [x.id, x] as const));
  const A = arch ? C.archetypes[arch] : undefined;
  const f = (key: string, check: string, severity: Severity, rationale: string, title: string, assets: string[], source: string, action: string) =>
    out.push({ key, category: 'DESIGN_DEFICIENCY', check, severity, rationale, title, assets: assets || [], source, action });

  // 1. required equipment for the room type
  for (const role of (arch && C.required[arch]) || []) {
    if (!live.some((x) => C.roleOk[role]!.includes(x.cat))) {
      f(
        `missing-equipment:${role}`, 'missing_required_equipment', 'High',
        `the ${A ? A.name : ''} room type requires a ${role} for its intended use`,
        `No ${role} in a ${A ? A.name.toLowerCase() : 'room'}`, [], 'design editor: required-equipment rule', `add a ${role} to the design`,
      );
    }
  }

  // 2. connectivity: breadth-first search over the proposed connections of the given kinds
  const reach = (from: string, kinds: string[], test: (y: PlannedDevice | undefined) => boolean): boolean => {
    const seen = new Set([from]);
    const q = [from];
    while (q.length) {
      const n = q.shift()!;
      for (const c of conns) {
        if (!kinds.includes(c.kind)) continue;
        const o = c.from === n ? c.to : c.to === n ? c.from : null;
        if (o && !seen.has(o)) {
          if (test(byId.get(o))) return true;
          seen.add(o);
          q.push(o);
        }
      }
    }
    return false;
  };
  const has = (cats: string[]) => live.some((y) => cats.includes(y.cat));
  const isAny = (cats: string[]) => (y: PlannedDevice | undefined) => !!y && cats.includes(y.cat);
  const netConn = (x: PlannedDevice, cs: Connection[]) => cs.some((c) => c.kind === 'network' && (c.from === x.id || c.to === x.id));

  for (const x of av) {
    const cat = C.categories[x.cat]!;
    if (['micceil', 'mictable', 'micwireless'].includes(x.cat) && has(['dsp']) && !reach(x.id, ['signal', 'network'], isAny(['dsp'])))
      f(`unresolved-connection:${x.id}:dsp`, 'unresolved_connection', 'High', 'a microphone without a path to the audio processor is not heard by anyone', `${x.label} has no signal path to the audio processor`, [x.id], 'connectivity check', 'propose the microphone → audio processor connection');
    if (x.cat === 'camera' && has(['compute', 'switcher']) && !reach(x.id, ['signal'], isAny(['compute', 'switcher'])))
      f(`unresolved-connection:${x.id}:compute`, 'unresolved_connection', 'High', 'a camera without a video path to the room compute sends no picture to the far end', `${x.label} has no video path to the room compute`, [x.id], 'connectivity check', 'propose the camera → room compute connection');
    if (x.cat === 'speaker' && has(['dsp', 'amp']) && !reach(x.id, ['signal'], isAny(['dsp', 'amp'])))
      f(`unresolved-connection:${x.id}:amp`, 'unresolved_connection', 'Medium', 'a loudspeaker with no amplifier or processor feed plays nothing', `${x.label} is not fed by an amplifier`, [x.id], 'connectivity check', 'connect the loudspeaker to an amplifier');
    if (['display', 'ledwall', 'projector'].includes(x.cat) && has(['compute', 'switcher']) && !reach(x.id, ['signal'], isAny(['compute', 'switcher'])))
      f(`unresolved-connection:${x.id}:source`, 'unresolved_connection', 'Medium', 'a display with no source shows nothing', `${x.label} has no source connection`, [x.id], 'connectivity check', 'connect the display to the room compute or the switcher');
    if (cat.net && has(['switch']) && x.cat !== 'switch' && !netConn(x, conns))
      f(`unresolved-connection:${x.id}:network`, 'unresolved_connection', 'Medium', 'a networked device without a network connection cannot be managed or monitored', `${x.label} has no network connection`, [x.id], 'network check', 'propose the device → switch connection');
    if (!x.furniture && !inside(d.geometry, x.x, x.y) && x.mount !== 'rack')
      f(`placement:${x.id}:outside`, 'placement_constraint', 'Medium', 'a device placed outside the room outline cannot be installed as drawn', `${x.label} is outside the room outline`, [x.id], 'placement check', 'move it inside the room');
    if (!x.role || !String(x.role).trim())
      f(`missing-role:${x.id}`, 'missing_device_role', 'Low', 'every device needs an assigned role for the schedule and the tests', `${x.id} has no assigned role`, [x.id], 'schedule check', 'assign a role');
  }

  // 3. PoE budget (declared catalogue values, not measured)
  const sw = live.find((x) => x.cat === 'switch');
  if (sw) {
    const budget = Number(sw.props['poe_budget_w']) || 0;
    const draw = conns
      .filter((c) => c.kind === 'network' && (c.to === sw.id || c.from === sw.id))
      .map((c) => byId.get(c.from === sw.id ? c.to : c.from))
      .filter((y): y is PlannedDevice => !!y)
      .reduce((s, y) => s + (C.categories[y.cat]!.poe || 0), 0);
    if (draw > budget)
      f(`incompatible:${sw.id}:poe`, 'incompatible_components', 'High', `declared PoE draw ${draw} W exceeds the switch's declared budget ${budget} W (catalog values, not measured)`, `PoE budget exceeded on ${sw.label}`, [sw.id], 'compatibility check (declared catalog values)', 'choose a switch with a larger PoE budget or power some devices locally');
  }

  // 4. sightline hypothesis (MODELED rule of thumb: farthest seat ≤ ~8 × image height)
  const disp = live.filter((x) => x.cat === 'display');
  if (disp.length && arch && ['BRD', 'TRN', 'EXE', 'COL'].includes(arch)) {
    const far = Math.max(...live.filter((x) => x.cat === 'chairs').map((c) => Math.min(...disp.map((y) => Math.hypot(c.x - y.x, c.y - y.y)))), 0);
    const imgH = (Number(disp[0]!.props['diagonal_in']) || 75) * 0.0254 * 0.49;
    if (far > imgH * 8)
      f(`sightline:${disp[0]!.id}`, 'placement_constraint', 'Medium', `the farthest seating block is ${far.toFixed(1)} m from the nearest display; a common planning ratio is about 6–8 × the image height (${(imgH * 8).toFixed(1)} m here) — a MODELED rule of thumb, not a verified sightline study`, 'Farthest seats are beyond the modeled viewing distance', disp.map((x) => x.id), 'sightline hypothesis (modeled)', 'larger displays, a second display or seats closer to the screen');
  }

  // 5. competing far-end video sources
  if (has(['camera']) && has(['bar']))
    f('incompatible:camera-and-bar', 'incompatible_components', 'Low', 'a video bar and a separate camera both claim the far-end picture; one must be the designated camera', 'Two video sources compete for the far-end picture', live.filter((x) => ['camera', 'bar'].includes(x.cat)).map((x) => x.id), 'compatibility check', 'designate one camera or remove the video bar');

  return out;
}
