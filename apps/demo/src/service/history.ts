/**
 * The service history the analytics read: fifteen months of synthetic service jobs across the campus (August 2025 to October 2026),
 * generated deterministically from a seed, plus the live workspace's own requests for November 2026. Labelled SYNTHETIC everywhere it is
 * shown: it is demonstration data shaped like a service history, never telemetry and never a real organisation's record.
 *
 * Each job carries what accountability needs: the room and its building, the layer, the severity and the SLA it is held to, the vendor
 * the support agreement names for that building and layer (an expired agreement is a stated gap, served internally), the unit it was about
 * (an asset ID from the room's installation record, so a job joins the asset's history), the project the room belongs to (when the
 * decision desk names one), and the times: opened, responded, restored, closed, whether the first visit fixed it, whether it reopened.
 */
import { campusRecords, DEMO_NOW } from '../campus/design.js';
import { seeded } from '../campus/canon.js';
import { VENDORS, AGREEMENTS } from '../parity/core.js';
import type * as S from '../workspace/store.js';

export type Severity = 'Mission critical' | 'High' | 'Standard';
export type Layer = 'audio' | 'video' | 'display' | 'control' | 'network' | 'power';
export interface ServiceJob {
  id: string; roomId: string; roomName: string; building: string; layer: Layer; severity: Severity; kind: 'break-fix' | 'preventive' | 'change';
  vendor: string; vendorName: string; agreement: string | null; asset: string | null; projectId: string | null;
  openedAt: string; respondedAt: string | null; restoredAt: string | null; closedAt: string | null;
  firstTimeFix: boolean; reopened: boolean; source: 'synthetic-history' | 'workspace';
}
/** SLA targets in hours, from @empathia/service-engine's SLA words: business days are counted as 24 h each here (stated wherever shown). */
export const SLA_HOURS: Record<Severity, { respond: number; restore: number }> = { 'Mission critical': { respond: 2, restore: 8 }, High: { respond: 24, restore: 48 }, Standard: { respond: 48, restore: 120 } };
export const INTERNAL = 'INTERNAL';
const LAYERS: Layer[] = ['audio', 'video', 'display', 'control', 'network', 'power'];
const H = 3600e3;

/** the vendor a building's layer is supported by: an active agreement, or internal support (and the gap stated) */
export function supportFor(building: string, layer: Layer): { vendor: string; agreement: string | null } {
  const a = AGREEMENTS.find((x) => x.status === 'Active' && x.buildings.includes(building) && x.layers.includes(layer));
  return a ? { vendor: a.vendor, agreement: a.id } : { vendor: INTERNAL, agreement: null };
}
export const vendorName = (id: string) => (id === INTERNAL ? 'Internal service team' : VENDORS.find((v) => v[0] === id)?.[1] || id);

/** how each vendor tends to perform in the synthetic history (multipliers on the SLA target; a fixed, stated profile — not a measurement) */
const PROFILE: Record<string, { respond: number; restore: number; ftf: number; reopen: number; drift: number }> = {
  'VN-BRIGHTWATER': { respond: 0.55, restore: 0.6, ftf: 0.84, reopen: 0.05, drift: 0 },
  'VN-COBALT': { respond: 0.8, restore: 0.95, ftf: 0.7, reopen: 0.1, drift: 0.035 },     // slowly getting worse: the accountability case
  'VN-LARKSPUR': { respond: 0.6, restore: 0.7, ftf: 0.78, reopen: 0.07, drift: -0.01 },
  'VN-FERNHILL': { respond: 0.5, restore: 0.55, ftf: 0.88, reopen: 0.04, drift: 0 },
  'VN-SAFFRON': { respond: 0.7, restore: 0.8, ftf: 0.75, reopen: 0.08, drift: 0.01 },
  [INTERNAL]: { respond: 0.75, restore: 0.9, ftf: 0.72, reopen: 0.09, drift: 0 },
};
export const MONTHS = 15;
/** the first day (UTC) of the month `back` months before DEMO_NOW's month */
export const monthStart = (back: number) => { const d = new Date(DEMO_NOW); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1); };
export const monthKey = (t: number | string) => new Date(t).toISOString().slice(0, 7);
export const quarterKey = (t: number | string) => { const d = new Date(t); return `${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };

let cache: ServiceJob[] | null = null;
/** The synthetic history (deterministic: the same jobs on every load and in every test). */
export function syntheticHistory(projectOfRoom: (roomId: string) => string | null = () => null): ServiceJob[] {
  if (cache) return cache;
  const rnd = seeded('servicehands-history-v1'); const rooms = campusRecords();
  const jobs: ServiceJob[] = []; let n = 0;
  for (let back = MONTHS; back >= 1; back--) {
    const m0 = monthStart(back); const m1 = monthStart(back - 1); const age = MONTHS - back;   // 0 = oldest month
    const count = 14 + Math.floor(rnd() * 9) + (back % 12 === 2 ? 6 : 0);                          // a seasonal peak in September
    for (let k = 0; k < count; k++) {
      const r = rooms[Math.floor(rnd() * rooms.length)]!; const o = r.outline;
      const layer = LAYERS[Math.floor(rnd() * (rnd() < 0.8 ? 4 : 6))]!;
      const severity: Severity = rnd() < 0.08 ? 'Mission critical' : rnd() < 0.35 ? 'High' : 'Standard';
      const kind = rnd() < 0.78 ? 'break-fix' : rnd() < 0.6 ? 'preventive' : 'change';
      const sup = supportFor(o.building, layer); const P = PROFILE[sup.vendor] || PROFILE[INTERNAL]!;
      const sla = SLA_HOURS[severity]; const trend = 1 + P.drift * age;
      const opened = m0 + rnd() * (m1 - m0 - 6 * H);
      const respondH = sla.respond * P.respond * trend * (0.4 + rnd() * 1.3);
      const restoreH = Math.max(respondH + 0.5, sla.restore * P.restore * trend * (0.35 + rnd() * 1.35));
      const restored = opened + restoreH * H; const closed = restored + (6 + rnd() * 40) * H;
      const live = closed < DEMO_NOW;
      const units = r.installations.filter((i) => !i.removedAt && i.installedAt < new Date(opened).toISOString());
      const asset = units.length ? units[Math.floor(rnd() * units.length)]!.asset : null;
      jobs.push({ id: `SJ-${monthKey(m0).replace('-', '')}-${String(++n).padStart(4, '0')}`, roomId: o.id, roomName: o.name, building: o.building, layer, severity, kind,
        vendor: sup.vendor, vendorName: vendorName(sup.vendor), agreement: sup.agreement, asset, projectId: projectOfRoom(o.id),
        openedAt: new Date(opened).toISOString(), respondedAt: new Date(opened + respondH * H).toISOString(),
        restoredAt: restored < DEMO_NOW ? new Date(restored).toISOString() : null, closedAt: live ? new Date(closed).toISOString() : null,
        firstTimeFix: rnd() < P.ftf / trend, reopened: rnd() < P.reopen * trend, source: 'synthetic-history' });
    }
  }
  cache = jobs; return jobs;
}

/** the layer a person's words point to (the workspace's requests carry no layer field); control when nothing points elsewhere */
export function layerOfText(t: string): Layer {
  const s = t.toLowerCase();
  return /echo|audio|microphone|\bmic|speaker|sound|hear/.test(s) ? 'audio' : /camera|video|framing/.test(s) ? 'video' : /display|projector|screen|blank/.test(s) ? 'display'
    : /network|switch|dropped|call|wi-?fi|vlan/.test(s) ? 'network' : /power|outlet|breaker/.test(s) ? 'power' : 'control';
}

/** The workspace's own requests as service jobs (the live part of the demonstration), joined to the same vendors and SLA targets. */
export function workspaceJobs(w: S.Workspace, projectOfRoom: (roomId: string) => string | null = () => null): ServiceJob[] {
  return w.incidents.map((i) => {
    const wo = i.workOrderId ? w.workOrders.find((x) => x.id === i.workOrderId) : undefined;
    const tech = wo?.techId ? w.staff.find((s) => s.id === wo.techId) : undefined;
    const vendor = tech && !tech.internal ? VENDORS.find((v) => v[1] === tech.orgName)?.[0] || INTERNAL : INTERNAL;
    const resp = i.history.find((h) => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(h.to))?.at ?? null;
    return { id: i.id, roomId: i.roomId, roomName: i.roomName, building: i.buildingKey, layer: layerOfText(`${i.title} ${i.summary}`), severity: i.severity, kind: 'break-fix' as const,
      vendor, vendorName: vendorName(vendor), agreement: null, asset: null, projectId: projectOfRoom(i.roomId), openedAt: i.openedAt, respondedAt: resp, restoredAt: i.restoredAt, closedAt: i.closedAt,
      firstTimeFix: !i.reopened, reopened: i.reopened, source: 'workspace' as const };
  });
}
