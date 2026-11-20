/**
 * The whole project, from the request to service, for the commissioning package (founder, 13 Nov 2026: "add the intake pictures or
 * dimensions and the raw request and Empathia's translated business need and summary … connect the entire project lifecycle … add
 * analytics and issue intelligence from the commissioned project"). Read from what the records hold and nothing else:
 *   - how the room was asked for: the record's stated purpose, the decision desk's projects for it (brief, state, decisions), and the
 *     requests raised through the intake portal in this browser: the person's own words, Empathia's translation of them into a title,
 *     a summary, a size with its basis and the equipment and tests it implies, and where each request went;
 *   - the decisions kept in the decision memory, with their options and why;
 *   - the lifecycle timeline from the room's own events, with the days spent at each stage;
 *   - service and issue intelligence: every service request about the room with its time to restore and recurrence, the APEX cases and
 *     their leading hypotheses, the lessons proposed, the deficiencies by source, and the room against the rooms of its type.
 * A request made before the portal kept the person's words separately shows its summary only, and says so.
 */
import { allRecords, openIssues, PEOPLE, type RoomRecord } from '../campus/design.js';
import { ymd } from '../campus/cxRecord.js';
import type * as S from '../workspace/store.js';
import type { Section, Link } from './model.js';

const who = (k?: string | null) => (k ? PEOPLE[k] || k.replace(/_/g, ' ') : '—');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const DONE = ['CLOSED', 'CANCELLED'];
const DAY = 864e5;

export interface IntakeRequest { id: string; kind: string; at: string; role: string; need?: string | null; title: string; summary: string; size?: { w: number; l: number; h: number; basis: string } | null; equipment: Array<{ label: string; count: number; added: number }>; tests: number; goes: string; where: string; standing: string }
export interface DeskProject { id: string; name: string; roomId: string | null; state: string; brief: { rev: number; authorId: string }; romUsd: number; summary: string }
export interface DeskDecision { projectId: string; decision: string; by: string; reason: string; at: string }
export interface DeskMemory { id: string; name: string; on: string | null; options: string[]; why: string; by: string; at: string; after: string | null }
export interface LifecycleInput { requests?: IntakeRequest[]; projects?: DeskProject[]; decisions?: DeskDecision[]; memory?: DeskMemory[]; workspace?: Pick<S.Workspace, 'incidents' | 'apexCases' | 'learnCases' | 'workOrders'> | null }

export function lifecycleSections(r: RoomRecord, x: LifecycleInput, abs: (h: string) => string): { sections: Section[]; links: Link[]; kpis: Array<{ label: string; value: string; note?: string }> } {
  const o = r.outline; const sections: Section[] = []; const links: Link[] = [];
  const projects = (x.projects || []).filter((p) => p.roomId === o.id); const projectIds = new Set(projects.map((p) => p.id));
  const decisions = (x.decisions || []).filter((d) => projectIds.has(d.projectId)); const memory = (x.memory || []).filter((m) => m.on === o.id || (m.on && projectIds.has(m.on)));
  const reqs = (x.requests || []);
  // 1 · how the room was asked for
  sections.push({ id: 'request', heading: 'From the request', text: ['How this room was asked for and what Empathia understood the business to need, as the records hold it.'],
    facts: [['What the room is for (the record)', o.intent], ['Source of the record', o.source], ['Room type', `${r.archetypeName} · ${o.capacity} seats`], ['Size', `${o.dims[0]} × ${o.dims[1]} m, ceiling ${o.dims[2]} m (${o.kind === 'reference' ? 'from the design record' : 'modelled from rooms of the same type'})`], ...(o.scenario ? [['Scenario', o.scenario] as [string, string]] : [])] });
  if (reqs.length) {
    sections.push({ id: 'intake', heading: 'Requests from the intake portal', text: ['Each request in the asker’s own words, then Empathia’s translation of it into a business need: the title, the summary, the size with its basis, and the equipment and tests it implies. Nothing is ordered or priced by a request.'],
      table: { title: 'Intake requests', cols: [{ key: 'id', label: 'Request' }, { key: 'at', label: 'Raised', kind: 'date' }, { key: 'need', label: 'In their words' }, { key: 'title', label: 'Empathia’s translation' }, { key: 'summary', label: 'Summary' }, { key: 'size', label: 'Size' }, { key: 'equip', label: 'Equipment and tests' }, { key: 'went', label: 'Went to' }, { key: 'standing', label: 'Where it stands', kind: 'status' }],
        rows: reqs.map((q) => ({ id: q.id, at: ymd(q.at), need: q.need ? q.need : '(not kept separately for this request; see the summary)', title: q.title, summary: q.summary, size: q.size ? `${q.size.w} × ${q.size.l} m, ceiling ${q.size.h} m (${q.size.basis})` : '', equip: `${q.equipment.map((e) => `${e.count} × ${e.label}${e.added ? ` (${e.added} new)` : ''}`).join(', ') || '—'}${q.tests ? ` · ${plural(q.tests, 'test')} added` : ''}`, went: q.where || q.goes, standing: q.standing })) } });
    links.push({ label: 'The intake portal', url: abs('#/intake') });
  }
  if (projects.length) {
    sections.push({ id: 'desk', heading: 'Business case on the decision desk', text: ['The projects raised for this room, their brief and where the decision stands. Rough orders of magnitude are the demonstration’s synthetic figures, never a quotation.'],
      table: { title: 'Projects', cols: [{ key: 'id', label: 'Project' }, { key: 'name', label: 'Name' }, { key: 'summary', label: 'Business need' }, { key: 'brief', label: 'Brief' }, { key: 'rom', label: 'Rough order (synthetic)' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'decision', label: 'Last decision' }],
        rows: projects.map((p) => { const d = decisions.filter((z) => z.projectId === p.id).sort((a, b) => b.at.localeCompare(a.at))[0];
          return { id: p.id, name: p.name, summary: p.summary, brief: `revision ${p.brief.rev} by ${who(p.brief.authorId)}`, rom: p.romUsd ? `USD ${p.romUsd.toLocaleString('en-US')}` : '—', state: p.state.replace(/_/g, ' ').toLowerCase(), decision: d ? `${d.decision.toLowerCase()} ${ymd(d.at)} by ${who(d.by)}: ${d.reason}` : 'none yet' }; }) } });
    links.push({ label: 'The decision desk', url: abs('#/decisions') });
  }
  if (memory.length) sections.push({ id: 'memory', heading: 'Decisions kept', text: ['The decision memory: what was chosen, between which options, why, and what happened after.'],
    table: { title: 'Decision memory', cols: [{ key: 'id', label: 'Decision' }, { key: 'name', label: 'What was decided' }, { key: 'options', label: 'Options' }, { key: 'why', label: 'Why' }, { key: 'by', label: 'By' }, { key: 'after', label: 'What happened after' }],
      rows: memory.map((m) => ({ id: m.id, name: m.name, options: m.options.join(' / '), why: m.why, by: `${who(m.by)}, ${ymd(m.at)}`, after: m.after || 'not yet known' })) } });

  // 2 · the lifecycle timeline
  const changes = r.events.filter((e) => e.type === 'room.lifecycle_changed' && e.outcome !== 'DENIED').map((e) => ({ at: e.at, by: e.by, to: (/→\s*([A-Z_]+)/.exec(e.detail) || [])[1] || e.detail, detail: e.detail })).sort((a, b) => a.at.localeCompare(b.at));
  const created = r.events.find((e) => e.type === 'room.design_created');
  const stages = [...(created ? [{ at: created.at, by: created.by, to: 'PLANNED', detail: 'design created' }] : []), ...changes];
  const end = Date.parse(r.events.reduce((m, e) => (e.at > m ? e.at : m), stages[stages.length - 1]?.at || new Date(0).toISOString()));
  sections.push({ id: 'timeline', heading: 'Lifecycle timeline', text: [stages.length ? `From the design to ${r.lifecycle.replace(/_/g, ' ').toLowerCase()} in ${Math.max(0, Math.round((end - Date.parse(stages[0]!.at)) / DAY))} days, from the room’s own events.` : 'No lifecycle event on record for this room (an earlier record).'],
    table: { title: 'Lifecycle', cols: [{ key: 'stage', label: 'Stage' }, { key: 'at', label: 'Entered', kind: 'date' }, { key: 'by', label: 'By' }, { key: 'days', label: 'Days at this stage', kind: 'number' }, { key: 'detail', label: 'Event' }],
      rows: stages.map((s, i) => ({ stage: s.to.replace(/_/g, ' ').toLowerCase(), at: ymd(s.at), by: who(s.by), days: Math.max(0, Math.round(((i + 1 < stages.length ? Date.parse(stages[i + 1]!.at) : end) - Date.parse(s.at)) / DAY)), detail: s.detail })) } });

  // 3 · service and issue intelligence
  const w = x.workspace; const inc = (w?.incidents || []).filter((i) => i.roomId === o.id);
  const restored = inc.filter((i) => i.restoredAt); const ttr = restored.map((i) => (Date.parse(i.restoredAt!) - Date.parse(i.openedAt)) / 36e5);
  const recurring = inc.filter((i) => i.recurrenceOf || i.reopened); const apex = (w?.apexCases || []).filter((c) => c.roomId === o.id); const lessons = (w?.learnCases || []).filter((l) => inc.some((i) => i.id === l.incidentId));
  const peers = allRecords().filter((p) => p.outline.archetype === o.archetype && p.outline.id !== o.id);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const peerTests = peers.length ? Math.round(peers.reduce((a, p) => a + pct(p.counts.verified, p.counts.applicable), 0) / peers.length) : null;
  const peerOpen = peers.length ? (peers.reduce((a, p) => a + openIssues(p).length, 0) / peers.length) : null;
  const peerInc = peers.length && w ? (peers.reduce((a, p) => a + w.incidents.filter((i) => i.roomId === p.outline.id).length, 0) / peers.length) : null;
  const bySource = [...new Set(r.issues.map((i) => i.source))].map((s) => `${s}: ${r.issues.filter((i) => i.source === s).length}`);
  sections.push({ id: 'intelligence', heading: 'Service and issue intelligence', text: ['What happened to the room after commissioning, and how it compares with the rooms of its type. Counts over the records; nothing is monitored live.'],
    bullets: [
      `${plural(inc.length, 'service request')} about this room${inc.length ? ` (${inc.filter((i) => !DONE.includes(i.state)).length} open)` : ''}${ttr.length ? `; restored in ${Math.round(ttr.reduce((a, b) => a + b, 0) / ttr.length)} hours on average` : ''}.`,
      `${plural(recurring.length, 'request')} came back or reopened${recurring.length ? `: ${recurring.map((i) => i.id).join(', ')}` : ''}.`,
      `${plural(r.issues.length, 'deficiency', 'deficiencies')} on the record (${openIssues(r).length} open)${bySource.length ? `; by source: ${bySource.join('; ')}` : ''}.`,
      `${plural(apex.length, 'APEX case')}${apex.length ? `: ${apex.map((c) => `${c.id}, leading hypothesis “${c.hypotheses[0]?.text || '—'}” (${c.hypotheses[0]?.confidence || 'none'} confidence)`).join('; ')}` : ''}.`,
      `${plural(lessons.length, 'lesson')} proposed to Learn from this room’s requests.`,
      ...(peers.length ? [`Against the ${peers.length} other ${r.archetypeName.toLowerCase()} rooms: tests verified ${pct(r.counts.verified, r.counts.applicable)}% here, ${peerTests}% on average; open issues ${openIssues(r).length} here, ${peerOpen!.toFixed(1)} on average${peerInc != null ? `; service requests ${inc.length} here, ${peerInc.toFixed(1)} on average` : ''}.`] : ['No other room of this type to compare with.']),
    ],
    table: { title: 'Service requests', cols: [{ key: 'id', label: 'Request' }, { key: 'title', label: 'Title' }, { key: 'sev', label: 'Severity' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'opened', label: 'Opened', kind: 'date' }, { key: 'ttr', label: 'Hours to restore', kind: 'number' }, { key: 'again', label: 'Recurrence' }, { key: 'apex', label: 'APEX' }, { key: 'learn', label: 'Lesson' }],
      rows: inc.map((i) => ({ id: i.id, title: i.title, sev: i.severity, state: DONE.includes(i.state) ? 'Closed' : i.state.replace(/_/g, ' ').toLowerCase(), opened: ymd(i.openedAt), ttr: i.restoredAt ? Math.round((Date.parse(i.restoredAt) - Date.parse(i.openedAt)) / 36e5) : null, again: i.recurrenceOf ? `again after ${i.recurrenceOf}` : i.reopened ? 'reopened' : '', apex: i.apexId || '', learn: i.learnCaseId || '' })) } });
  for (const i of inc) links.push({ label: `ServiceHands ${i.id}`, url: abs(`#/v25/service?id=${i.id}`) });
  for (const c of apex) links.push({ label: `APEX ${c.id}`, url: abs(`#/v25/apex?case=${c.id}`) });
  const kpis = [{ label: 'Service requests', value: String(inc.length), note: ttr.length ? `restored in ${Math.round(ttr.reduce((a, b) => a + b, 0) / ttr.length)} h on average` : 'none restored yet' }];
  return { sections, links, kpis };
}
