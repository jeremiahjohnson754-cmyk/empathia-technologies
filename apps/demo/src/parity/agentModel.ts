/**
 * The Room Health Check (V2.5.3 #/agent): a scheduled script on each room computer checks six things and writes one line per check to a
 * log. Here the runs are SIMULATED from the Core device states: a check finds a real fault only where an open issue of the room record
 * names a device of the check's classes; the pilot rules also raise false alarms (deterministic from the room id), the tuned rules do not.
 * Nothing here runs on a device; nothing is measured.
 */
import { seeded } from '../campus/canon.js';
import { openIssues, DEMO_NOW, type RoomRecord } from '../campus/design.js';

export interface Check { key: string; label: string; cats: string[]; what: string }
export const CHECKS: Check[] = [
  { key: 'panel', label: 'Control panel reachability', cats: ['touch', 'control', 'scheduler'], what: 'The touch panel and control processor answer the room computer.' },
  { key: 'camera', label: 'Camera present and healthy', cats: ['camera', 'bar'], what: 'The camera enumerates and reports a picture.' },
  { key: 'audio', label: 'Audio devices present and healthy', cats: ['micceil', 'micwireless', 'speaker', 'dsp', 'amp'], what: 'Microphones, loudspeakers and the audio processor are seen as endpoints.' },
  { key: 'network', label: 'Network adapter', cats: ['switch'], what: 'The computer’s adapter is up on its documented segment.' },
  { key: 'driver', label: 'Device driver health', cats: ['compute'], what: 'No peripheral reports a driver fault on the room computer.' },
  { key: 'display', label: 'Display connected', cats: ['display', 'projector', 'ledwall'], what: 'Each display the design names is connected and powered.' },
];
export type Outcome = 'pass' | 'fault' | 'false-alarm' | 'not-applicable';
export interface Line { check: Check; pilot: Outcome; tuned: Outcome; because: string }
export interface Run { room: RoomRecord; at: number; lines: Line[]; real: number; pilotAlarms: number; tunedAlarms: number }

export const hasAgent = (r: RoomRecord) => r.positions.some((p) => p.cat === 'compute' || p.cat === 'bar') && r.lifecycle !== 'PLANNED';
export function runOf(r: RoomRecord): Run {
  const rnd = seeded(`agent:${r.outline.id}`); const open = openIssues(r);
  const lines = CHECKS.map((c): Line => {
    const has = r.positions.some((p) => c.cats.includes(p.cat));
    if (!has) return { check: c, pilot: 'not-applicable', tuned: 'not-applicable', because: 'The room design has no device of this class.' };
    const issue = open.find((i) => i.positions.some((code) => c.cats.includes(r.positions.find((p) => p.code === code)?.cat || '')));
    if (issue) return { check: c, pilot: 'fault', tuned: 'fault', because: `${issue.id}: ${issue.title}` };
    const noise = rnd() < 0.16;
    return { check: c, pilot: noise ? 'false-alarm' : 'pass', tuned: 'pass', because: noise ? 'Pilot rule: one missed reply in a 15-minute window counted as a failure; the tuned rule waits for three.' : c.what };
  });
  const real = lines.filter((l) => l.tuned === 'fault').length;
  return { room: r, at: DEMO_NOW - Math.floor(rnd() * 50) * 6e4, lines, real, pilotAlarms: lines.filter((l) => l.pilot !== 'pass' && l.pilot !== 'not-applicable').length, tunedAlarms: real };
}
export const runsOf = (rooms: RoomRecord[]) => rooms.filter(hasAgent).map(runOf);
/** The eight parts V2.5.3 named, with the honest state of each in this build. */
export const PARTS: Array<{ name: string; state: 'Built' | 'Piloted, simulated here' | 'Designed, simulated here'; does: string; here: string; href: string }> = [
  { name: 'Room Discovery Agent', state: 'Piloted, simulated here', does: 'Generalises the health-check script into endpoint and infrastructure discovery, through supported access only.', here: 'Simulated from the room records: six checks per room computer, one log line each.', href: '#/agent' },
  { name: 'Room Model', state: 'Built', does: 'Dimensions, objects, devices, positions, capabilities and relationships as one record per room.', here: 'The thirty room records of this demonstration.', href: '#/list/Room' },
  { name: 'Spatial Engine', state: 'Built', does: 'Field of view, sightlines, zones, distances and layout comparison.', here: 'Modeled, not measured: the engine’s rules over the room geometry.', href: '#/campus' },
  { name: 'Measurement Adapter Layer', state: 'Designed, simulated here', does: 'Connectors for processors, cameras and device measurements; manual and simulated input where none exists.', here: 'The integration fabric names each connector and what it reads; measurements are simulated.', href: '#/fabric' },
  { name: 'Optimization Engine', state: 'Built', does: 'Generates candidate changes and scores them against the room’s requirements.', here: 'Optimize scenarios on the V1.4 foundation, projections labelled modeled.', href: '#/v14/optimize' },
  { name: 'Assurance Engine', state: 'Built', does: 'Before-and-after checks and continuous drift against the commissioned baseline.', here: 'Baselines, drift and recommissioning from the room records.', href: '#/compare/commissioned' },
  { name: 'Lite UI', state: 'Built', does: '3D room, overlays, recommendations and the room guide.', here: 'The campus and room pages.', href: '#/campus' },
  { name: 'Core Evidence Ledger', state: 'Built', does: 'Where every measurement and conclusion is recorded with what it stands on.', here: 'The evidence ledger of this demonstration.', href: '#/ledger' },
];
