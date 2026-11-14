/**
 * Assurance's seventeen dimensions over seven layers (V2.5.3 #/assurance/room/:id), read from a room's record and the service
 * requests about it: whether the current state agrees with the commissioned one. Shared by the page (pages/RoomRecords.tsx) and the
 * assurance report (export/as.ts). Nothing is measured: a dimension with no record to differ reads as commissioned, and says so.
 */
import { openIssues, type RoomRecord } from './design.js';
import { roomState } from '../lite/model.js';
import type { CxTone } from './cxRecord.js';
import type * as S from '../workspace/store.js';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export type DimState = 'match' | 'drift' | 'failed' | 'reported';
export const DIMS: Array<[string, string, string, (r: RoomRecord, inc: S.Incident[]) => { state: 'match' | 'drift' | 'failed' | 'reported'; note: string }]> = [
  ['Physical', 'Device presence', 'What is installed, and whether it is there', (r) => { const rm = r.installations.filter((i) => i.removedAt && !r.installations.some((j) => j.position === i.position && !j.removedAt)); return rm.length ? { state: 'drift', note: `${plural(rm.length, 'position')} without a unit since removal` } : { state: 'match', note: `${r.installations.filter((i) => !i.removedAt).length} units in place` }; }],
  ['Physical', 'Environment', 'Temperature and humidity', () => ({ state: 'match', note: 'no environmental telemetry in a synthetic record: read as commissioned' })],
  ['Spatial', 'Spatial layout', 'Where things are', (r) => r.issues.some((i) => i.state !== 'RESOLVED' && /moved/i.test(i.title)) ? { state: 'drift', note: r.issues.find((i) => /moved/i.test(i.title))!.title } : { state: 'match', note: `${r.positions.filter((p) => !p.furniture).length} positions as designed` }],
  ['Spatial', 'Room purpose', 'What the room is used for', (r) => ({ state: 'match', note: r.archetypeName })],
  ['Infrastructure', 'Network', 'The switches the room depends on', (r, inc) => inc.some((i) => /switch|network|call/i.test(i.title) && !['CLOSED', 'RESOLVED'].includes(i.state)) ? { state: 'failed', note: inc.find((i) => /switch|network|call/i.test(i.title))!.title } : { state: 'match', note: `${r.connections.filter((c) => c.kind === 'network').length} network connections proposed` }],
  ['Infrastructure', 'Power', 'Protected power', (r, inc) => inc.some((i) => /power|outlet/i.test(i.title) && !['CLOSED', 'RESOLVED'].includes(i.state)) ? { state: 'failed', note: inc.find((i) => /power|outlet/i.test(i.title))!.title } : { state: 'match', note: 'no power event on record' }],
  ['Configuration', 'Firmware', 'Validated versions', (r) => r.issues.some((i) => i.state !== 'RESOLVED' && /firmware/i.test(i.title)) ? { state: 'drift', note: r.issues.find((i) => /firmware/i.test(i.title))!.title } : { state: 'match', note: 'no firmware record differs from the baseline' }],
  ['Configuration', 'Configuration', 'Settings against the commissioned signature', (r) => { const rp = r.reopened.length; return rp ? { state: 'drift', note: `${plural(rp, 'test')} reopened by a replacement: ${r.reopened[0]!.reasons[0]}` } : r.issues.some((i) => i.state !== 'RESOLVED' && /drift|baseline/i.test(i.title)) ? { state: 'drift', note: r.issues.find((i) => /drift|baseline/i.test(i.title))!.title } : { state: 'match', note: 'as commissioned' }; }],
  ['Functional', 'Audio', 'Pickup and playback', (r, inc) => { const a = [...r.issues.filter((i) => i.state !== 'RESOLVED'), ...inc.filter((i) => !['CLOSED', 'RESOLVED'].includes(i.state))].find((i) => /audio|speech|echo|hear|microphone/i.test(i.title)); return a ? { state: r.counts.failed ? 'failed' : 'reported', note: a.title } : { state: 'match', note: `${r.positions.filter((p) => /mic/.test(p.cat)).length} microphone positions` }; }],
  ['Functional', 'Camera', 'Presets and coverage', (r, inc) => { const a = [...r.issues.filter((i) => i.state !== 'RESOLVED'), ...inc.filter((i) => !['CLOSED', 'RESOLVED'].includes(i.state))].find((i) => /camera|framed|preset/i.test(i.title)); return a ? { state: 'drift', note: a.title } : { state: 'match', note: `${r.positions.filter((p) => p.cat === 'camera' || p.cat === 'bar').length} camera positions` }; }],
  ['Functional', 'Display', 'Routes, brightness, sightlines', (r, inc) => { const a = [...r.issues.filter((i) => i.state !== 'RESOLVED'), ...inc.filter((i) => !['CLOSED', 'RESOLVED'].includes(i.state))].find((i) => /display|sightline|projector|seats/i.test(i.title)); return a ? { state: /sightline|seats/i.test(a.title) ? 'reported' : 'failed', note: a.title } : { state: 'match', note: `${r.positions.filter((p) => /display|ledwall|projector/.test(p.cat)).length} displays` }; }],
  ['Functional', 'Control', 'The room program', (r, inc) => inc.some((i) => /control|touch/i.test(i.title) && !['CLOSED', 'RESOLVED'].includes(i.state)) ? { state: 'failed', note: inc.find((i) => /control|touch/i.test(i.title))!.title } : { state: 'match', note: `${r.positions.filter((p) => /control|touch/.test(p.cat)).length} control positions` }],
  ['Functional', 'Signal path', 'End to end', (r) => ({ state: 'match', note: `${r.connections.length} connections proposed by the engine` })],
  ['Functional', 'Application', 'The meeting platform', (r, inc) => inc.some((i) => /meeting|platform|restart/i.test(i.title) && !['CLOSED', 'RESOLVED'].includes(i.state)) ? { state: 'failed', note: inc.find((i) => /meeting|platform|restart/i.test(i.title))!.title } : { state: 'match', note: 'no application fault on record' }],
  ['Operational', 'Scheduling', 'Booking and the panel', (r, inc) => inc.some((i) => /booking|schedul/i.test(i.title) && !['CLOSED', 'RESOLVED'].includes(i.state)) ? { state: 'failed', note: inc.find((i) => /booking|schedul/i.test(i.title))!.title } : { state: 'match', note: `${r.positions.filter((p) => p.cat === 'scheduler').length} scheduling panels` }],
  ['Operational', 'Documentation', 'What the record holds', (r) => { const gaps = r.coverage.filter((c) => c.state === 'gap').length; return { state: 'match', note: `${r.coverage.length - gaps} of ${r.coverage.length} coverage areas held; ${gaps} stated gaps` }; }],
  ['Experience', 'User experience readiness', 'What people report', (r, inc) => { const n = inc.filter((i) => i.roomId === r.outline.id).length; return n ? { state: 'reported', note: `${plural(n, 'service request')} from people in this room` } : { state: 'match', note: 'nothing reported' }; }],
];
export const LAYERS = ['Physical', 'Spatial', 'Infrastructure', 'Configuration', 'Functional', 'Operational', 'Experience'];
export const DIM_LABEL: Record<DimState, string> = { match: 'Matches baseline', drift: 'Drift', failed: 'Offline or failed', reported: 'Reported by people' };
export const assuranceDims = (r: RoomRecord, inc: S.Incident[]) => DIMS.map(([layer, name, what, f]) => ({ layer, name, what, ...f(r, inc) }));
export interface ChangeCard { id: string; what: string; dim: string; before: string; now: string; diff: string; rec: string }
/** V2.5.3's Commissioned ↔ current cards: one per value that changed since handover (layout, a replaced unit, an open issue). */
export function changeCards(r: RoomRecord): ChangeCard[] {
  const cur = roomState(r, 'current'); const com = roomState(r, 'commissioned'); const cards: ChangeCard[] = [];
  const moved = cur.positions.filter((p) => p.mark === 'moved');
  if (moved.length) { const was = com.cov, is = cur.cov; cards.push({ id: 'layout', what: `Layout · ${plural(moved.length, 'piece')} of furniture`, dim: 'Spatial layout', before: 'Where commissioning left it', now: moved[0]!.note || 'moved since handover',
    diff: `Camera coverage ${is.camera.covered} of ${is.camera.of} seats (was ${was.camera.covered}); microphone pickup ${is.mic.covered} of ${is.mic.of} (was ${was.mic.covered})`, rec: 'Restore the commissioned layout' }); }
  for (const i of r.installations.filter((x) => x.removedAt)) { const now = r.installations.find((x) => x.position === i.position && !x.removedAt); const p = r.positions.find((x) => x.code === i.position);
    cards.push({ id: `unit-${i.position}`, what: `${p?.label || i.position} · unit`, dim: 'Device presence', before: i.asset, now: now ? now.asset : 'removed', diff: r.reopened.length ? `${plural(r.reopened.length, 'test')} reopened by the replacement: ${r.reopened[0]!.reasons[0]}` : 'the replacement has not been retested', rec: 'Re-run the reopened tests' }); }
  for (const i of openIssues(r)) cards.push({ id: `iss-${i.id}`, what: i.title, dim: i.positions.length ? `${i.positions.join(', ')}` : 'the room', before: 'Passed at handover', now: `${i.severity} · ${i.state.toLowerCase().replace(/_/g, ' ')}`, diff: i.source, rec: i.severity === 'High' ? 'Raise a service request' : 'Inspect at the next visit' });
  return cards;
}
const DONE = ['CLOSED', 'CANCELLED'];
export type AsState = 'matched' | 'drift' | 'failed' | 'none';
export const AS_LABEL: Record<AsState, { label: string; tone: CxTone }> = { matched: { label: 'Matches its baseline', tone: 'ok' }, drift: { label: 'Drifted', tone: 'warn' }, failed: { label: 'Failed a check', tone: 'bad' }, none: { label: 'No baseline', tone: 'muted' } };
/** The estate's assurance state of a room (pages/Estate.tsx shows it; the assurance report states it). */
export function asState(r: RoomRecord, incidents: S.Incident[]): { state: AsState; why: string } {
  const current = r.baselines.find((b) => b.state === 'CURRENT'); const pending = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE');
  const open = openIssues(r); const inc = incidents.filter((i) => i.roomId === r.outline.id && !DONE.includes(i.state));
  if (r.counts.failed || open.some((i) => i.severity === 'High')) return { state: 'failed', why: r.counts.failed ? `${plural(r.counts.failed, 'test')} failed` : open.find((i) => i.severity === 'High')!.title };
  if (!current) return { state: 'none', why: 'no accepted baseline' };
  if (pending) return { state: 'drift', why: `baseline v${pending.version} recorded, waiting for acceptance (${pending.note})` };
  if (open.length || inc.length) return { state: 'drift', why: inc.length ? `${inc[0]!.id} open: ${inc[0]!.title}` : open[0]!.title };
  return { state: 'matched', why: `baseline v${current.version} since ${current.at.slice(0, 10)}` };
}
