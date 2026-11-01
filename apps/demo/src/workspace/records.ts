/**
 * The records of this demonstration, assembled for the engines that read many of them at once: the KPI passports
 * (@empathia/kpi-engine), Mission Control's station counts and the room story. Pure (no React, no storage): moved out of
 * pages/Control.tsx unchanged in content so the impact calculator and the story assembler can run them, and be unit-tested, outside a
 * page. `at` fixes the clock so that two assemblies of the same state (before and after a change) are compared at one instant.
 *
 * Truth rules: a project's governance status is read from its governance records (funding authorizations, then decisions) and is null —
 * not recorded — without one; a project's delivery history is read from the allowed lifecycle changes in the ledger; a room's accepted
 * baseline is the one record here (`rooms[].baseline`), which every page that needs it reads (the KPI passports, APEX, the room story).
 */
import type { Records } from '@empathia/kpi-engine';
import type * as S from './store.js';
import type { Draft } from '../build/store.js';

export function assemble(w: S.Workspace, d: Draft | null, at: number = Date.now()): Records {
  const now = new Date(at).toISOString();
  const ago = (days: number) => new Date(at - days * 864e5).toISOString();
  const decisions: Records['decisions'] = [{ projectId: 'PRJ-ATLAS-AV', decision: 'APPROVED', scopeRev: 1, at: ago(70) }, { projectId: 'PRJ-NST-TH', decision: 'HELD', scopeRev: 1, at: ago(20) }, { projectId: 'PRJ-NST-TH', decision: 'APPROVED', scopeRev: 2, at: ago(10) }];
  const funding: Records['funding'] = [{ projectId: 'PRJ-ATLAS-AV', kind: 'AUTHORIZED', amount: 184000, currency: 'USD', at: ago(65) }];
  // governance status only from the governance records: the latest funding record if it is an authorization (FUNDED), else the latest
  // decision; no record → null (not recorded). The Build a Room draft has neither, so it is never FUNDED by assumption.
  const latest = <T extends { projectId: string; at: string }>(xs: T[], id: string) => xs.filter((x) => x.projectId === id).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).pop();
  const governanceOf = (id: string): string | null => (latest(funding, id)?.kind === 'AUTHORIZED' ? 'FUNDED' : latest(decisions, id)?.decision ?? null);
  const projects: Records['projects'] = [
    { id: 'PRJ-ATLAS-AV', governance: governanceOf('PRJ-ATLAS-AV'), delivery: 'FIELD_ACTIVE', updatedAt: ago(6), requestId: 'REQ-0031', history: [{ to: 'ENGINEERING_REVIEW', at: ago(60) }, { to: 'FIELD_ACTIVE', at: ago(12) }] },
    { id: 'PRJ-NST-TH', governance: governanceOf('PRJ-NST-TH'), delivery: 'DESIGN_DRAFT', updatedAt: ago(2), requestId: 'REQ-0034', history: [{ to: 'ENGINEERING_REVIEW', at: ago(9) }] },
  ];
  // the draft's delivery history: its allowed lifecycle changes, oldest first (`room.lifecycle_changed` "FROM → TO"; a `room.lifecycle:<to>`
  // event is only ever written for a refusal). Entering COMMISSIONING is field work (FIELD_ACTIVE).
  if (d) projects.push({ id: d.code, governance: governanceOf(d.code), delivery: d.design.lifecycle === 'ACCEPTED' || d.design.lifecycle === 'OPERATIONAL' ? 'CUSTOMER_ACCEPTED' : d.design.lifecycle === 'COMMISSIONING' ? 'FIELD_ACTIVE' : 'DESIGN_DRAFT', updatedAt: d.events[0]?.at || d.createdAt, requestId: `REQ-${d.code}`,
    history: [...d.events].reverse().filter((e) => e.type === 'room.lifecycle_changed' && e.outcome === 'ALLOWED').flatMap((e) => { const to = /(\w+) → (\w+)/.exec(e.detail)?.[2]; return to ? [{ to: to === 'COMMISSIONING' ? 'FIELD_ACTIVE' : to, at: e.at }] : []; }) });
  const rooms: Records['rooms'] = [
    { id: 'R-ATL-4-218', requiresCommissioning: true, devices: 5, baseline: { version: 1, publishedAt: ago(120), devicesBound: 5, verifiedTests: 14, applicableTests: 14, exceptions: 0 }, instrumented: true, eligibleForUsage: true },
    { id: 'R-ATL-4-220', requiresCommissioning: true, devices: 2, baseline: { version: 1, publishedAt: ago(90), devicesBound: 2, verifiedTests: 9, applicableTests: 9, exceptions: 0 }, instrumented: true, eligibleForUsage: true },
    { id: 'R-ATL-4-231', requiresCommissioning: true, devices: 2, baseline: { version: 1, publishedAt: ago(30), devicesBound: 2, verifiedTests: 11, applicableTests: 12, exceptions: 1 }, instrumented: false, eligibleForUsage: true },
    { id: 'R-NST-2-101', requiresCommissioning: true, devices: 9, baseline: null, instrumented: false, eligibleForUsage: true },
  ];
  if (d) rooms.push({ id: d.code, requiresCommissioning: true, devices: d.design.devices.filter((x) => !x.furniture && !x.removed).length, baseline: d.baseline ? { version: d.baseline.version, publishedAt: d.baseline.at, devicesBound: d.baseline.devices.length, verifiedTests: Object.values(d.baseline.results).filter((r) => r === 'PASS_VERIFIED').length, applicableTests: Object.keys(d.baseline.results).length, exceptions: 0 } : null, instrumented: false, eligibleForUsage: false });
  const sessions: Records['sessions'] = []; for (let i = 0; i < 60; i++) sessions.push({ roomId: i % 3 === 0 ? 'R-ATL-4-220' : 'R-ATL-4-218', at: ago(i * 1.4 + 0.3), conferencing: i % 4 !== 1, whiteboarding: i % 5 === 0, deviceActivation: i % 7 !== 3, interactiveDisplay: i % 3 !== 0 });
  return { now, projects,
    decisions, funding,
    workOrders: w.workOrders.map((x) => ({ id: x.id, state: x.state === 'DONE' ? 'RESOLVED' : x.state, openedAt: x.openedAt, resolvedAt: x.state === 'DONE' ? w.incidents.find((i) => i.id === x.incidentId)?.restoredAt || null : null, roomId: x.roomId })),
    incidents: w.incidents.map((i) => ({ id: i.id, state: i.state, roomId: i.roomId, openedAt: i.openedAt, restoredAt: i.restoredAt, recurrenceOf: i.recurrenceOf, reopened: i.reopened })),
    requests: [{ id: 'REQ-0031', projectId: 'PRJ-ATLAS-AV', submittedAt: ago(80) }, { id: 'REQ-0034', projectId: 'PRJ-NST-TH', submittedAt: ago(25) }, ...(d ? [{ id: `REQ-${d.code}`, projectId: d.code, submittedAt: d.createdAt }] : [])],
    rooms, documents: rooms.flatMap((r) => [{ roomId: r.id, mandatory: true, state: r.baseline ? 'APPROVED' : 'PENDING', at: r.baseline?.publishedAt || now }, { roomId: r.id, mandatory: true, state: r.baseline && r.id !== 'R-ATL-4-231' ? 'APPROVED' : 'SUBMITTED', at: now }]),
    standards: [{ id: 'STD-ROOM-HUDDLE-3', effectiveAt: ago(40) }, { id: 'STD-NET-SEG-2', effectiveAt: null }], sops: [{ id: 'SOP-CX-01', createdAt: ago(50), approvedAt: ago(35) }], sows: [{ id: 'SOW-ATL-2026-1', createdAt: ago(66), approvedAt: ago(64) }],
    devices: [{ id: 'A-0101', active: true, supportEnd: '2028-01-01' }, { id: 'A-0102', active: true, supportEnd: '2027-06-30', romLow: 1800, romHigh: 2600 }, { id: 'A-0103', active: true, supportEnd: '2029-03-01' }, { id: 'A-0104', active: true, supportEnd: null }, { id: 'A-0105', active: true, supportEnd: '2027-09-01', romLow: 900, romHigh: 1400 }, { id: 'A-0201', active: true, supportEnd: '2030-01-01' }, { id: 'A-0202', active: true, supportEnd: '2027-06-30', romLow: 1800, romHigh: 2600 }, { id: 'A-0301', active: true, supportEnd: '2026-12-31', romLow: 3200, romHigh: 5600 }, { id: 'A-0302', active: true, supportEnd: null }],
    sessions, profiles: [{ id: 'SCP-DSP-HUDDLE', state: 'PUBLISHED', verifiedCoverage: true }, { id: 'SCP-CAM-BOARD', state: 'PROPOSED', verifiedCoverage: false }], fieldScans: [{ roomId: 'R-ATL-4-231', at: ago(20), completed: true }], consentedParticipation: false };
}

/** A room's accepted baseline as the records hold it, for a page that compares against it (APEX's read-only A2 comparison): the version
 *  and the number of results it bound at acceptance. null = no accepted baseline on record. Read from `rooms[].baseline` — the same
 *  record the KPI passports and the room story read — so no page states a baseline the others do not. */
export function acceptedBaseline(R: Records, roomId: string): { version: number; evidence: number } | null {
  const b = R.rooms.find((r) => r.id === roomId)?.baseline;
  return b ? { version: b.version, evidence: b.applicableTests } : null;
}

export interface Station { key: string; label: string; count: number; href: string; items: string[] }
/** Mission Control's ten stations, each counting live records (moved unchanged from MissionControl). */
export function stationCounts(R: Records, w: S.Workspace): Station[] {
  return [
    { key: 'intake', label: 'Intake', count: R.requests.length, href: '#/v25/build', items: R.requests.map((r) => `${r.id} → ${r.projectId}`) },
    { key: 'decision', label: 'Decision', count: R.decisions.length, href: '#/v25/exec', items: R.decisions.map((x) => `${x.projectId} ${x.decision} (scope ${x.scopeRev})`) },
    { key: 'funding', label: 'Funding', count: R.funding.length, href: '#/v25/exec', items: R.funding.map((f) => `${f.projectId} ${f.amount.toLocaleString()} ${f.currency}`) },
    { key: 'design', label: 'Design', count: R.projects.filter((p) => p.delivery && /DESIGN/.test(p.delivery)).length, href: '#/v25/build', items: R.projects.filter((p) => p.delivery && /DESIGN/.test(p.delivery)).map((p) => `${p.id} ${p.delivery}`) },
    { key: 'commissioning', label: 'Commissioning', count: R.rooms.filter((r) => !r.baseline).length, href: '#/v25/build?tab=checks', items: R.rooms.filter((r) => !r.baseline).map((r) => `${r.id} no accepted baseline yet`) },
    { key: 'field', label: 'Field', count: w.workOrders.filter((x) => x.state !== 'DONE' && x.state !== 'CANCELLED').length, href: '#/v25/service', items: w.workOrders.filter((x) => x.state !== 'DONE').map((x) => `${x.id} ${x.state} · ${x.title}`) },
    { key: 'documents', label: 'Documents', count: R.documents.filter((x) => x.state !== 'APPROVED').length, href: '#/v25/build?tab=drawings', items: R.documents.filter((x) => x.state !== 'APPROVED').map((x) => `${x.roomId} ${x.state}`) },
    { key: 'handoff', label: 'Handoff', count: R.projects.filter((p) => p.delivery === 'CUSTOMER_ACCEPTED').length, href: '#/v25/build?tab=lifecycle', items: R.projects.filter((p) => p.delivery === 'CUSTOMER_ACCEPTED').map((p) => `${p.id} accepted, handoff pending`) },
    { key: 'assurance', label: 'Assurance', count: R.rooms.filter((r) => r.baseline).length, href: '#/v25/build?tab=lifecycle', items: R.rooms.filter((r) => r.baseline).map((r) => `${r.id} baseline v${r.baseline!.version}`) },
    { key: 'service', label: 'Service', count: w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state)).length, href: '#/v25/service', items: w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state)).map((i) => `${i.id} ${i.state} · ${i.title}`) },
  ];
}

/** Every ledger aggregate that belongs to one room: the room itself, its incidents, their work orders, APEX cases, Learn cases and
 *  Field Intelligence sessions. Used by the room story and by the ledger's `?room=` filter. */
export function roomAggregates(w: S.Workspace, roomId: string): Set<string> {
  const inc = w.incidents.filter((i) => i.roomId === roomId);
  const ids = new Set<string>([roomId]);
  for (const i of inc) { ids.add(i.id); if (i.workOrderId) ids.add(i.workOrderId); if (i.apexId) ids.add(i.apexId); if (i.learnCaseId) ids.add(i.learnCaseId); }
  for (const x of w.workOrders) if (x.roomId === roomId) ids.add(x.id);
  for (const c of w.apexCases) if (c.roomId === roomId) ids.add(c.id);
  for (const c of w.learnCases) if (inc.some((i) => i.id === c.incidentId)) ids.add(c.id);
  for (const s of w.fiSessions) if (s.roomId === roomId) ids.add(s.id);
  return ids;
}
