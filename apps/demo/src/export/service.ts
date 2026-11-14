/**
 * ServiceHands as a Report (./model.ts): the service queue (every incident, its work order, the person on it, the SLA it is held to,
 * where it stands) drilled up by state, severity and building; or one incident's service record (its history, the work order with the
 * dispatch preflight and the field evidence, the independent verification, and the thread to APEX and Learn). Every figure is read
 * from the workspace the page shows, through the same rules (@empathia/service-engine).
 *
 * What it never does: present an SLA as met or missed (there is no clock on a synthetic record, only the target it is held to), name
 * equipment beyond its class, or show a person the queue is not theirs to see (the page and the file are gated alike).
 */
import { SLA } from '@empathia/service-engine';
import { SITE, buildingByKey } from '../campus/canon.js';
import type * as S from '../workspace/store.js';
import type { Report, Section } from './model.js';
import type { MadeBy } from './cx.js';

const DONE = ['CLOSED', 'CANCELLED'];
const STATES = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'REOPENED', 'CLOSED', 'CANCELLED'];
const SEVS = ['Mission critical', 'High', 'Standard'] as const;
const word = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
const ymd = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');
const stamp = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const PROV = (by: MadeBy) => [
  'Synthetic demonstration: every room, person and record is invented and connected to no real system.',
  'An SLA here is the target the request is held to under the customer policy; with no clock on a synthetic record, nothing is reported as met or missed.',
  `Made as ${by.role}: a perspective on the record, which grants no permission.`,
];

export function serviceQueuePackage(w: S.Workspace, by: MadeBy): Report {
  const all = w.incidents; const open = all.filter((i) => !DONE.includes(i.state));
  const tech = (i: S.Incident) => { const wo = i.workOrderId ? w.workOrders.find((x) => x.id === i.workOrderId) : undefined; return { wo, who: wo?.techId ? w.staff.find((s) => s.id === wo.techId)?.name || wo.techId : '' }; };
  const buildings = [...new Set(all.map((i) => i.buildingKey))].sort();
  const crit = open.filter((i) => i.severity === 'Mission critical');
  const unassigned = open.filter((i) => !tech(i).who);
  const verifying = open.filter((i) => i.state === 'VERIFYING');
  const sections: Section[] = [
    { id: 'standing', heading: 'Where the queue stands', text: [`${plural(open.length, 'open request')}, ${crit.length} mission critical; ${unassigned.length} without a person assigned; ${verifying.length} awaiting independent verification.`],
      bullets: crit.length ? crit.map((i) => `${i.id} · ${i.roomName}: ${i.title} (${word(i.state)}${tech(i).who ? `, ${tech(i).who}` : ', nobody assigned'})`) : ['No mission-critical request is open.'] },
    { id: 'by-building', heading: 'By building', text: ['Drilled up: the open requests of each building, by severity.'],
      table: { title: 'By building', cols: [{ key: 'b', label: 'Building' }, { key: 'open', label: 'Open', kind: 'number' }, ...SEVS.map((s) => ({ key: s, label: s, kind: 'number' as const })), { key: 'closed', label: 'Closed', kind: 'number' }],
        rows: buildings.map((k) => { const mine = all.filter((i) => i.buildingKey === k); const o = mine.filter((i) => !DONE.includes(i.state)); return { b: buildingByKey(k)?.name || k, open: o.length, ...Object.fromEntries(SEVS.map((s) => [s, o.filter((i) => i.severity === s).length])), closed: mine.length - o.length }; }) } },
    { id: 'queue', heading: 'Every request', text: ['Drilled down: one row per request, open first.'],
      table: { title: 'Requests', cols: [{ key: 'id', label: 'Request' }, { key: 'room', label: 'Room' }, { key: 'title', label: 'Title' }, { key: 'sev', label: 'Severity' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'sla', label: 'Held to (respond · restore)' }, { key: 'wo', label: 'Work order' }, { key: 'who', label: 'Assigned to' }, { key: 'opened', label: 'Opened', kind: 'date' }, { key: 'apex', label: 'APEX case' }],
        rows: [...open, ...all.filter((i) => DONE.includes(i.state))].map((i) => { const t = tech(i); return { id: i.id, room: `${i.roomName} (${i.roomId})`, title: i.title, sev: i.severity, state: word(i.state), sla: `${SLA[i.severity].respond} · ${SLA[i.severity].restore}`, wo: t.wo ? `${t.wo.id} · ${word(t.wo.workType)}` : '', who: t.who, opened: ymd(i.openedAt), apex: i.apexId || '' }; }) } },
    { id: 'work', heading: 'Work orders', table: { title: 'Work orders', cols: [{ key: 'id', label: 'Work order' }, { key: 'inc', label: 'Request' }, { key: 'type', label: 'Work' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'who', label: 'Assigned to' }, { key: 'window', label: 'Window' }, { key: 'ev', label: 'Evidence', kind: 'number' }, { key: 'pf', label: 'Preflight' }],
      rows: w.workOrders.map((x) => ({ id: x.id, inc: x.incidentId, type: word(x.workType), state: word(x.state), who: x.techId ? w.staff.find((s) => s.id === x.techId)?.name || x.techId : '', window: x.window ? `${stamp(x.window.from)} → ${stamp(x.window.to)}` : '', ev: x.evidence.length, pf: x.preflight ? (x.preflight.every((c) => c.ok) ? 'Passed' : `Blocked: ${x.preflight.filter((c) => !c.ok).map((c) => c.label).join(', ')}`) : 'Not run' })) } },
  ];
  return {
    schema: 'empathia.report/1', id: 'SH-QUEUE', kind: 'service-queue', title: 'Service queue', subtitle: `${SITE.name} · ServiceHands`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: 'All buildings', floor: 'All floors', room: 'All rooms', roomId: '' },
    status: { label: crit.length ? 'Mission critical open' : open.length ? 'Requests open' : 'Queue clear', tone: crit.length ? 'bad' : open.length ? 'warn' : 'ok', why: `${plural(open.length, 'open request')}, ${crit.length} mission critical` },
    generatedAt: by.at, role: by.role, build: by.build, primary: 'Requests', provenance: PROV(by),
    headline: `${plural(open.length, 'open request')} across ${plural(buildings.length, 'building')}; ${crit.length} mission critical, ${unassigned.length} unassigned, ${verifying.length} awaiting verification. ${all.length - open.length} closed or cancelled.`,
    kpis: [
      { label: 'Open requests', value: String(open.length), note: `${all.length} on record` },
      { label: 'Mission critical open', value: String(crit.length), note: `held to ${SLA['Mission critical'].respond}` },
      { label: 'Unassigned', value: String(unassigned.length) },
      { label: 'Awaiting verification', value: String(verifying.length), note: 'by someone other than the technician' },
      { label: 'Reopened', value: String(all.filter((i) => i.reopened).length) },
    ],
    chart: { title: 'Open requests by building and severity', categories: buildings.map((k) => buildingByKey(k)?.short || k), series: SEVS.map((s) => ({ name: s, tone: ({ 'Mission critical': 'bad', High: 'warn', Standard: 'muted' } as const)[s], values: buildings.map((k) => open.filter((i) => i.buildingKey === k && i.severity === s).length) })) },
    sections,
    dossier: {
      incidents: all.map((i) => ({ id: i.id, roomId: i.roomId, state: i.state, severity: i.severity, workOrderId: i.workOrderId, apexId: i.apexId, learnCaseId: i.learnCaseId })),
      workOrders: w.workOrders.map((x) => ({ id: x.id, incidentId: x.incidentId, state: x.state, techId: x.techId })),
      counts: Object.fromEntries(STATES.map((s) => [s, all.filter((i) => i.state === s).length])),
    },
  };
}

export function serviceRecordPackage(w: S.Workspace, incId: string, by: MadeBy): Report | null {
  const i = w.incidents.find((x) => x.id === incId); if (!i) return null;
  const wo = i.workOrderId ? w.workOrders.find((x) => x.id === i.workOrderId) : undefined;
  const who = (id: string | null | undefined) => (id ? w.staff.find((s) => s.id === id)?.name || id.replace(/_/g, ' ') : '');
  const b = buildingByKey(i.buildingKey); const apex = i.apexId ? w.apexCases.find((c) => c.id === i.apexId) : undefined;
  const learn = i.learnCaseId ? w.learnCases.find((c) => c.id === i.learnCaseId) : undefined;
  const closed = DONE.includes(i.state);
  const sections: Section[] = [
    { id: 'request', heading: 'The request', text: [i.summary || i.title],
      facts: [['Request', i.id], ['Room', `${i.roomName} (${i.roomId})`], ['Building', b?.name || i.buildingKey], ['Severity', i.severity], ['Held to', `respond ${SLA[i.severity].respond}, restore ${SLA[i.severity].restore}`], ['State', word(i.state)], ['Opened', stamp(i.openedAt)], ['Restored', stamp(i.restoredAt) || 'Not yet'], ['Closed', stamp(i.closedAt) || 'Not yet'], ['Recurrence of', i.recurrenceOf || 'None'], ['Requester confirmed', i.requesterConfirmed ? 'Yes' : 'No'], ['Verified by', who(i.verifiedBy) || 'Not yet verified']] },
    { id: 'history', heading: 'History', table: { title: 'History', cols: [{ key: 'at', label: 'When' }, { key: 'to', label: 'Moved to', kind: 'status' }, { key: 'by', label: 'By' }], rows: i.history.map((h) => ({ at: stamp(h.at), to: word(h.to), by: who(h.by) })) } },
  ];
  if (wo) sections.push(
    { id: 'work-order', heading: 'Work order', facts: [['Work order', wo.id], ['Work', word(wo.workType)], ['State', word(wo.state)], ['Assigned to', who(wo.techId) || 'Nobody'], ['Window', wo.window ? `${stamp(wo.window.from)} → ${stamp(wo.window.to)}` : 'Not booked'], ['Access', wo.access ? `confirmed by ${who(wo.access.confirmedBy)}` : 'Not confirmed'], ['Safety briefing', wo.safety?.briefed ? 'Given' : 'Not given'], ['Tools confirmed', wo.toolsConfirmed.join(', ') || 'None'], ['Parts', wo.parts.map((p) => `${p.qty} × ${p.part}`).join(', ') || 'None']] },
    { id: 'preflight', heading: 'Dispatch preflight', text: [wo.preflight ? (wo.preflight.every((c) => c.ok) ? 'Every check passed before the work started.' : 'The preflight blocked the work until each failing check is cleared.') : 'The preflight has not run: it runs when the technician starts the work.'],
      table: { title: 'Preflight', cols: [{ key: 'label', label: 'Check' }, { key: 'ok', label: 'Result', kind: 'status' }, { key: 'why', label: 'Why' }], rows: (wo.preflight || []).map((c) => ({ label: c.label, ok: c.ok ? 'Pass' : 'Blocked', why: c.why })) } },
    { id: 'evidence', heading: 'Field evidence', text: ['Recorded by the technician; accepting it is someone else’s.'], table: { title: 'Field evidence', cols: [{ key: 'at', label: 'When' }, { key: 'kind', label: 'Kind' }, { key: 'note', label: 'What was recorded' }, { key: 'by', label: 'By' }], rows: wo.evidence.map((e) => ({ at: stamp(e.at), kind: e.kind, note: e.note, by: who(e.by) })) } });
  // how long the request sat in each state, from its own history (the last state up to the moment the file was made)
  const spans = new Map<string, number>(); i.history.forEach((h, k) => { const end = i.history[k + 1]?.at || (closed ? h.at : by.at); spans.set(word(h.to), (spans.get(word(h.to)) || 0) + Math.max(0, (Date.parse(end) - Date.parse(h.at)) / 36e5)); });
  sections.push({ id: 'thread', heading: 'Where it went next', facts: [['APEX case', apex ? `${apex.id}: ${apex.hypotheses.length} hypotheses, ${apex.actions.length} actions` : 'None opened'], ['Learn case', learn ? `${learn.id}: ${word(learn.state)}` : 'None proposed']] });
  return {
    schema: 'empathia.report/1', id: `SH-${i.id}`, kind: 'service-record', title: 'Service record', subtitle: `${i.id} · ${i.roomName}`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: b?.name || i.buildingKey, floor: '', room: i.roomName, roomId: i.roomId },
    status: { label: word(i.state), tone: closed ? 'ok' : i.state === 'REOPENED' || i.severity === 'Mission critical' ? 'bad' : 'warn', why: closed ? `closed${i.verifiedBy ? `, verified by ${who(i.verifiedBy)}` : ''}` : `${word(i.state).toLowerCase()}${wo?.techId ? `, ${who(wo.techId)} assigned` : ', nobody assigned'}` },
    generatedAt: by.at, role: by.role, build: by.build, primary: wo ? 'Field evidence' : 'History', provenance: PROV(by),
    headline: `${i.id} (${i.severity.toLowerCase()}) in ${i.roomName}: ${i.title}. ${word(i.state)}; ${plural(i.history.length, 'step')} on record${wo ? `, ${plural(wo.evidence.length, 'piece')} of field evidence` : ', no work order yet'}.`,
    kpis: [
      { label: 'State', value: word(i.state) }, { label: 'Severity', value: i.severity, note: `respond ${SLA[i.severity].respond}` },
      { label: 'Steps on record', value: String(i.history.length) }, { label: 'Field evidence', value: String(wo?.evidence.length ?? 0) },
      { label: 'Verified', value: i.verifiedBy ? 'Yes' : 'No', note: i.verifiedBy ? who(i.verifiedBy) : 'by someone other than the technician' },
    ],
    chart: spans.size ? { title: 'Hours in each state (from the history)', categories: [...spans.keys()], series: [{ name: 'Hours', tone: 'info', values: [...spans.values()].map((x) => Math.round(x * 10) / 10) }] } : undefined,
    sections,
    dossier: { incident: { id: i.id, roomId: i.roomId, state: i.state, severity: i.severity, apexId: i.apexId, learnCaseId: i.learnCaseId, verifiedBy: i.verifiedBy }, workOrder: wo ? { id: wo.id, state: wo.state, techId: wo.techId, preflight: wo.preflight?.map((c) => ({ id: c.id, ok: c.ok })) ?? null, evidence: wo.evidence.length } : null, history: i.history },
  };
}
