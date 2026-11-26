/**
 * One room's record followed through every product (founder, 16 Nov 2026: "a demonstrably functioning vertical slice: Lite → Engineering
 * → Commissioning → ServiceHands → Assurance → APEX, with real persisted records, traceable evidence, meaningful interaction").
 *
 * Nothing is invented here: each stage reads the records the products themselves keep, under the ids they share.
 *   Lite            the room of the campus record (its id, shape and devices)
 *   Engineering     the design (revision, classification, positions, proposed connections, design findings) and the field record
 *                   (mounting, hookups, field moves) kept by the installation team
 *   Commissioning   the applicable tests with their results, and each deficiency as worked through the engine's state machine
 *   ServiceHands    the incidents on the room, the one handed over from a deficiency first, with its work order and field evidence
 *   Assurance       what acceptance and the baseline say now: the accepted baseline if there is one, otherwise what still holds acceptance
 *   APEX            the diagnostic cases opened on those incidents: hypotheses with why they are not proven, never a verified fault
 * A stage with nothing recorded says so. The room, the deficiency and the incident carry their ids from stage to stage; `links` lists
 * the ids that tie one stage to the next, so a reader can check the chain is one record and not six stories.
 */
import { resultLabel, blocksAcceptance, type Deficiency } from '@empathia/commissioning-engine';
import type { RoomRecord } from '../campus/design.js';
import { deficiencyOf, keyOf } from '../assurance/deficiencyStore.js';
import { readField, fieldStats } from '../install/fieldRecord.js';
import type { Workspace, Incident, WorkOrder, ApexCase } from '../workspace/store.js';
import { isOpenRequest, isFixedRequest } from '../workspace/requests.js';

export type StageKey = 'lite' | 'engineering' | 'commissioning' | 'service' | 'assurance' | 'apex';
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';
export interface Row { id: string; text: string; href?: string; tone?: Tone; tag?: string;
  /** a deficiency that can be handed to service from here (the Service Manager and the Operations Lead do not work in the commissioning pages) */
  handoff?: { deficiencyId: string; issueId: string; state: string; title: string; severity: string } }
export interface Stage { key: StageKey; n: number; title: string; product: string; status: string; tone: Tone; facts: Array<[string, string]>; rows: Row[]; href: string; open: string; next: string | null }
export interface Thread { room: string; name: string; stages: Stage[]; links: Array<{ from: StageKey; to: StageKey; id: string; what: string }>; complete: boolean; missing: string[] }

const DEF_WORD: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', PENDING_RETEST: 'Pending retest', CLOSED: 'Closed', ACCEPTED_EXCEPTION: 'Accepted exception', DEFERRED: 'Deferred' };
const found = (r: RoomRecord) => r.events.find((e) => /COMMISSIONING/.test(e.type) || /commission/i.test(e.detail || ''))?.at || r.events[0]?.at || new Date(0).toISOString();

export function threadOf(r: RoomRecord, w: Workspace): Thread {
  const id = r.outline.id; const devices = r.positions.filter((p) => !p.furniture);
  const field = readField(id); const fs = fieldStats(r, field);
  const defs: Array<{ d: Deficiency; issue: string; source: string }> = r.issues.filter((i) => i.state !== 'PENDING_APPROVAL').map((i) => ({ d: deficiencyOf(r, i, found(r)), issue: i.id, source: i.source }));
  const openDefs = defs.filter((x) => blocksAcceptance(x.d));
  const incs: Incident[] = w.incidents.filter((i) => i.roomId === id).sort((a, b) => Number(!!b.source) - Number(!!a.source));
  const wos = (i: Incident): WorkOrder | undefined => (i.workOrderId ? w.workOrders.find((x) => x.id === i.workOrderId) : undefined);
  const cases: ApexCase[] = w.apexCases.filter((c) => c.roomId === id);
  const rows = r.analysis.applicability.rows.filter((x) => x.applicable); const res = r.design.results || {};
  const failing = rows.filter((x) => resultLabel(res[x.id]) === 'FAIL');
  const base = r.baselines.find((b) => b.state === 'CURRENT') || null;
  const handed = incs.filter((i) => i.source?.kind === 'deficiency');
  const revs = r.events.filter((e) => e.type === 'room.revision_saved').length || 1;
  const stages: Stage[] = [];

  stages.push({ key: 'lite', n: 1, title: 'The room', product: 'Lite', status: `${devices.length} devices in a ${r.archetypeName.toLowerCase()}`, tone: 'info',
    facts: [['Room', `${id} · ${r.outline.name}`], ['Building · floor', `${r.outline.building} · ${r.outline.floor}`], ['Size', `${r.outline.dims[0]} m × ${r.outline.dims[1]} m`], ['Geometry', r.geometryProvenance]],
    rows: devices.slice(0, 6).map((p) => ({ id: p.code, text: `${p.label} · ${p.catLabel}`, href: `#/install/redline?room=${id}&device=${p.code}` })),
    href: `#/lite/room/${id}?mode=engineer`, open: 'Open the room in Lite', next: null });

  const engOpen = r.findings.length;
  stages.push({ key: 'engineering', n: 2, title: 'The design and the field record', product: 'Engineering', status: `revision ${revs} · ${r.connections.length} proposed connections · ${fs.mounted}/${fs.devices} mounted`, tone: fs.proposed ? 'warn' : 'info',
    facts: [['Design revision', String(revs)], ['Positions · connections', `${devices.length} · ${r.connections.length} (proposed, not traced)`], ['Design findings', engOpen ? `${engOpen}: ${r.findings.slice(0, 2).map((f) => f.title).join('; ')}` : 'none open'],
      ['Field record', `${fs.mounted} of ${fs.devices} mountings · ${fs.hookups} hookups (${fs.notInDesign} not in the design) · ${fs.approved} approved moves, ${fs.proposed} waiting`]],
    rows: [...field.moves.map((m) => ({ id: m.id, text: `${m.device} moved: ${m.reason}`, tag: m.state, tone: (m.state === 'APPROVED' ? 'ok' : m.state === 'REJECTED' ? 'bad' : 'warn') as Tone, href: `#/install/redline?room=${id}&device=${m.device}` })),
      ...field.hookups.slice(0, 4).map((h) => ({ id: h.id, text: `${h.device}:${h.port} → ${h.to}${h.toPort ? `:${h.toPort}` : ''}`, href: `#/install/redline?room=${id}&device=${h.device}` }))],
    href: `#/install/redline?room=${id}`, open: 'Open the field record and redlines', next: fs.mounted < fs.devices ? `Record how the remaining ${fs.devices - fs.mounted} devices are mounted` : null });

  stages.push({ key: 'commissioning', n: 3, title: 'Tests, results and deficiencies', product: 'Commissioning', status: `${r.lifecycle} · ${r.counts.verified}/${r.counts.applicable} verified · ${r.counts.failed} failed · ${openDefs.length} open deficienc${openDefs.length === 1 ? 'y' : 'ies'}`, tone: openDefs.length || r.counts.failed ? 'warn' : 'ok',
    facts: [['Lifecycle', r.lifecycle], ['Applicable tests', `${r.counts.applicable}: ${r.counts.verified} verified, ${r.counts.awaiting} awaiting verification, ${r.counts.failed} failed, ${r.counts.notTested} not tested`],
      ['Failed checks', failing.length ? failing.map((x) => x.id).join(', ') : 'none'], ['Deficiencies', defs.length ? `${defs.length}: ${openDefs.length} still hold acceptance` : 'none on the record']],
    rows: defs.map(({ d, issue, source }) => ({ id: issue, text: `${d.title} · ${source}${d.retest ? ` · retest ${d.retest.result} on ${d.retest.evidence}` : ''}`, tag: DEF_WORD[d.state] || d.state, tone: (blocksAcceptance(d) ? 'warn' : 'ok') as Tone, href: `#/commissioning/deficiencies?d=${encodeURIComponent(d.id)}`,
      ...(blocksAcceptance(d) && !w.incidents.some((i) => i.source?.id === d.id) && !['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING'].includes(r.lifecycle) ? { handoff: { deficiencyId: d.id, issueId: issue, state: d.state, title: d.title, severity: d.severity } } : {}) })),
    href: `#/commissioning/room/${id}`, open: 'Open the commissioning record', next: openDefs.length && !handed.length ? 'Hand the field deficiency to ServiceHands (the Service Manager or the Operations Lead)' : openDefs.some((x) => x.d.state === 'PENDING_RETEST') ? 'Record the retest, then have someone else verify it' : null });

  stages.push({ key: 'service', n: 4, title: 'The work order', product: 'ServiceHands', status: incs.length ? `${incs.length} incident${incs.length === 1 ? '' : 's'} · ${handed.length ? `${handed[0]!.id} from the deficiency: ${handed[0]!.state}` : 'none from a deficiency'}` : 'nothing raised on this room', tone: incs.some(isOpenRequest) ? 'warn' : incs.length ? 'ok' : 'muted',
    facts: incs.length ? [['Incidents', incs.map((i) => `${i.id} ${i.state}`).join(' · ')], ['From a deficiency', handed.length ? handed.map((i) => `${i.id} ← ${i.source!.issue}`).join(' · ') : 'none'],
      ['Field evidence', String(incs.reduce((s, i) => s + (wos(i)?.evidence.length || 0), 0))], ['Verified by', incs.filter((i) => i.verifiedBy).map((i) => `${i.id}: ${i.verifiedBy}`).join(' · ') || 'not yet']] : [['Incidents', 'none']],
    rows: incs.map((i) => { const wo = wos(i); return { id: i.id, text: `${i.title}${wo ? ` · ${wo.id}${wo.evidence.length ? ` · ${wo.evidence.length} evidence` : ''}` : ''}${i.source ? ` · from ${i.source.issue}` : ''}`, tag: i.state, tone: (['RESOLVED', 'CLOSED'].includes(i.state) ? 'ok' : 'info') as Tone, href: `#/v25/service?id=${i.id}` }; }),
    href: handed[0] ? `#/v25/service?id=${handed[0].id}` : '#/v25/service', open: 'Open ServiceHands', next: handed.length && !isFixedRequest(handed[0]!) && handed[0]!.state !== 'CANCELLED' ? `Work ${handed[0]!.id} to RESOLVED: triage, assign, accept, start, evidence, independent verification` : null });

  const holds = r.nextStep?.blockers || [];
  stages.push({ key: 'assurance', n: 5, title: 'Acceptance and the baseline', product: 'Assurance', status: base ? `baseline v${base.version} accepted · ${openDefs.length} open deficienc${openDefs.length === 1 ? 'y' : 'ies'}` : openDefs.length ? `not accepted: ${openDefs.length} deficienc${openDefs.length === 1 ? 'y holds' : 'ies hold'} acceptance` : 'not accepted yet: no deficiency holds it',
    tone: base ? (openDefs.length ? 'warn' : 'ok') : openDefs.length ? 'warn' : 'info',
    facts: [['Accepted baseline', base ? `v${base.version} on revision ${base.revision}, ${base.at.slice(0, 10)}${base.by ? ` by ${base.by}` : ''}` : 'none: assurance compares a room with its accepted baseline, so it starts at acceptance'],
      ['Deficiencies that hold acceptance', openDefs.length ? openDefs.map((x) => `${x.issue} (${DEF_WORD[x.d.state]})`).join(' · ') : 'none'],
      ['The record’s next step', r.nextStep ? `${r.nextStep.to}${holds.length ? `: held by ${holds.length} item${holds.length === 1 ? '' : 's'} on the room record` : ': open'}` : 'the record ends here'],
      ['Closed by retest', defs.filter((x) => x.d.state === 'CLOSED' && x.d.retest).map((x) => `${x.issue}: ${x.d.retest!.evidence}, verified by ${x.d.closedBy}`).join(' · ') || 'none']],
    rows: holds.slice(0, 4).map((b, k) => ({ id: `H${k + 1}`, text: b, tone: 'warn' as Tone })),
    href: `#/assurance/room/${id}`, open: 'Open the room’s assurance', next: null });

  stages.push({ key: 'apex', n: 6, title: 'The diagnosis', product: 'APEX', status: cases.length ? `${cases.length} case${cases.length === 1 ? '' : 's'} · hypotheses only, never a verified fault` : 'no case opened', tone: cases.length ? 'info' : 'muted',
    facts: cases.length ? [['Cases', cases.map((c) => `${c.id} on ${c.incidentId}`).join(' · ')], ['Leading hypothesis', cases[0]!.hypotheses[0] ? `${cases[0]!.hypotheses[0]!.text} (${cases[0]!.hypotheses[0]!.confidence} confidence; ${cases[0]!.hypotheses[0]!.caveat})` : '—'], ['Actions taken', String(cases.reduce((s, c) => s + c.actions.length, 0))], ['Reviewed', cases.filter((c) => c.reviewed).map((c) => `${c.id}: ${c.reviewed!.verdict}`).join(' · ') || 'not yet']] : [['Cases', 'none']],
    rows: cases.map((c) => ({ id: c.id, text: `${c.key} branch · ${c.hypotheses.length} hypotheses · on ${c.incidentId}`, tone: 'info' as Tone, href: `#/v25/apex?case=${c.id}` })),
    href: cases[0] ? `#/v25/apex?case=${cases[0].id}` : handed[0] ? `#/v25/apex?incident=${handed[0].id}` : incs[0] ? `#/v25/apex?incident=${incs[0].id}` : '#/v25/apex', open: cases.length ? 'Open the case' : 'Open APEX', next: !cases.length && incs.length ? `Open a case for ${(handed[0] || incs[0])!.id}` : null });

  const links: Thread['links'] = [{ from: 'lite', to: 'engineering', id, what: 'the room' }, { from: 'engineering', to: 'commissioning', id, what: 'the room and its device positions' }];
  for (const i of handed) links.push({ from: 'commissioning', to: 'service', id: `${i.source!.issue} → ${i.id}`, what: 'the deficiency handed to service' });
  for (const x of defs) if (x.d.state === 'CLOSED' && x.d.retest) links.push({ from: 'service', to: 'assurance', id: `${x.issue} · ${x.d.retest.evidence}`, what: 'the retest that closed the deficiency' });
  for (const c of cases) links.push({ from: 'service', to: 'apex', id: `${c.incidentId} → ${c.id}`, what: 'the incident the case was opened on' });
  const missing: string[] = [];
  if (!defs.length) missing.push('no deficiency on this room’s record');
  if (!handed.length) missing.push('no deficiency has been handed to ServiceHands');
  else if (!handed.some((i) => ['RESOLVED', 'CLOSED'].includes(i.state))) missing.push(`${handed[0]!.id} is not resolved yet`);
  if (handed.length && !defs.some((x) => x.d.state === 'CLOSED' && x.d.retest)) missing.push('no deficiency has been closed by a verified retest');
  if (!cases.length) missing.push('no APEX case on the room');
  return { room: id, name: r.outline.name, stages, links, complete: !missing.length, missing };
}
