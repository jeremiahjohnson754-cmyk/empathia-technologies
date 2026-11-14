/**
 * The APEX case report, as a Report (./model.ts): one incident's diagnosis with its evidence. The seven layers and what each cites,
 * the hypotheses ranked with why each is not proven, the action tiers A0–A5 and their bounds, every action attempted (blocked ones
 * included, because a blocked outcome is a result), the review, and the thread back to the service request and the room's
 * commissioning and assurance state: the end of the Commissioning → Assurance → APEX journey, read from the workspace.
 *
 * What it never does: present a hypothesis as a finding, an attempted action as one that reached equipment (every adapter is
 * NOT_CONFIGURED in this build; a simulated run says SIMULATED), or the reviewer's verdict as proof.
 */
import { TIERS, RUNBOOKS, type Tier } from '@empathia/apex-engine';
import { roomRecord, PEOPLE } from '../campus/design.js';
import { SITE, buildingByKey, shortName, fullName, roomById } from '../campus/canon.js';
import { cxState, CX_LABEL, ymd } from '../campus/cxRecord.js';
import { asState, AS_LABEL } from '../campus/asRecord.js';
import type * as S from '../workspace/store.js';
import type { Report } from './model.js';
import type { MadeBy } from './cx.js';

const who = (k?: string | null) => (k ? PEOPLE[k] || k.replace(/_/g, ' ') : '—');
const at = (s: string) => s.slice(0, 16).replace('T', ' ');
const CONF_WORD: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low', none: 'None' };

export function apexPackage(c: S.ApexCase, w: S.Workspace, by: MadeBy): Report {
  const inc = w.incidents.find((i) => i.id === c.incidentId); const o = roomById(c.roomId); const r = roomRecord(c.roomId); const b = o ? buildingByKey(o.building) : undefined;
  const wo = inc?.workOrderId ? w.workOrders.find((x) => x.id === inc.workOrderId) : undefined; const learn = inc?.learnCaseId ? w.learnCases.find((x) => x.id === inc.learnCaseId) : undefined;
  const top = c.hypotheses[0]; const blocked = c.actions.filter((a) => a.outcome === 'BLOCKED' || a.outcome === 'REFUSED').length;
  const cx = r ? cxState(r) : null; const as = r ? asState(r, w.incidents) : null;
  const status = c.reviewed ? { label: 'Reviewed', tone: 'ok' as const, why: `${who(c.reviewed.by)} on ${ymd(c.reviewed.at)}: ${c.reviewed.verdict}` } : c.actions.length ? { label: 'In progress', tone: 'warn' as const, why: `${c.actions.length} action(s) logged, ${blocked} blocked; not yet reviewed` } : { label: 'Open', tone: 'warn' as const, why: 'hypotheses ranked; no action taken yet' };
  return {
    schema: 'empathia.report/1', id: c.id, kind: 'apex-case', title: 'APEX case report', subtitle: `${inc?.title || c.incidentId} · ${o ? fullName(o) : c.roomId}`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: b?.name || o?.building || '—', floor: o ? `Floor ${o.floor}` : '—', room: o ? shortName(o) : c.roomId, roomId: c.roomId },
    status, generatedAt: by.at, role: by.role, build: by.build, primary: 'Hypotheses',
    provenance: [
      'Synthetic demonstration: every room, person, request and case is invented and connected to no real system.',
      'A hypothesis is a ranked explanation with the reason it is not proven; it is never a finding. Evidence is cited from the recorded relationships, not read from live equipment.',
      `Every adapter is ${[...new Set(Object.values(w.adapters))].join(' / ') || 'NOT_CONFIGURED'} in this build: no action reaches equipment. A simulated run says SIMULATED; a blocked outcome is logged as a result.`,
      `Made as ${by.role}: a perspective on the record, which grants no permission. Asking for an action never grants it.`,
    ],
    headline: `${c.id} for ${inc?.id || c.incidentId}: ${c.hypotheses.length} hypotheses over seven layers; the leading one (${top ? `${CONF_WORD[top.confidence]!.toLowerCase()} confidence, ${top.action.tier}` : 'none'}) is “${top?.text || '—'}”. ${c.actions.length} action(s) logged, ${blocked} blocked. ${c.reviewed ? `Reviewed: ${c.reviewed.verdict}.` : 'Not yet reviewed.'}`,
    kpis: [
      { label: 'Hypotheses', value: String(c.hypotheses.length), note: c.hypotheses.map((h) => `${h.id} ${CONF_WORD[h.confidence]!.toLowerCase()}`).join(' · ') },
      { label: 'Layers with evidence', value: `${c.layers.filter((l) => l.observations.length).length} of ${c.layers.length}`, note: c.layers.filter((l) => l.observations.length).map((l) => l.label).join(', ') },
      { label: 'Actions logged', value: String(c.actions.length), note: `${blocked} blocked or refused · ${c.actions.filter((a) => a.simulated).length} simulated` },
      { label: 'Highest tier proposed', value: top ? top.action.tier : '—', note: top ? TIERS[top.action.tier].label : '' },
      { label: 'Commissioning', value: cx ? CX_LABEL[cx.state].label : '—', note: cx?.why || '' },
      { label: 'Assurance', value: as ? AS_LABEL[as.state].label : '—', note: as?.why || '' },
    ],
    chart: { title: 'Hypotheses by layer and confidence', categories: [...new Set(c.hypotheses.map((h) => h.layer))], series: (['high', 'medium', 'low', 'none'] as const).map((k) => ({ name: CONF_WORD[k]!, values: [...new Set(c.hypotheses.map((h) => h.layer))].map((L) => c.hypotheses.filter((h) => h.layer === L && h.confidence === k).length) })) },
    sections: [
      { id: 'thread', heading: 'The thread', text: ['From the room’s commissioning record, through Assurance, to the service request this case explains.'],
        bullets: [
          `Commissioning: ${cx ? `${CX_LABEL[cx.state].label} — ${cx.why}` : 'no record'}.`,
          `Assurance: ${as ? `${AS_LABEL[as.state].label} — ${as.why}` : 'no record'}.`,
          `ServiceHands: ${inc ? `${inc.id} “${inc.title}”, ${inc.severity}, ${inc.state.replace(/_/g, ' ').toLowerCase()} (opened ${ymd(inc.openedAt)})` : 'no request'}${wo ? `; work order ${wo.id} ${wo.state.toLowerCase().replace(/_/g, ' ')}` : ''}.`,
          `APEX: ${c.id}, ${c.key} branch, opened ${ymd(c.openedAt)}${c.seeded ? ' (part of the demonstration’s seed)' : ''}.`,
          `Learn: ${learn ? `${learn.id} “${learn.title}”, ${learn.state.replace(/_/g, ' ').toLowerCase()}` : 'no lesson proposed from this case yet'}.`,
        ] },
      { id: 'case', heading: 'Case and request', facts: [['Case', `${c.id} · ${c.key} branch`], ['Request', inc ? `${inc.id} · ${inc.title}` : c.incidentId], ['What was reported', inc?.summary || '—'], ['Room', o ? `${fullName(o)} (${o.id})` : c.roomId], ['Severity', inc?.severity || '—'], ['Opened', at(c.openedAt)], ['Adapters', Object.entries(w.adapters).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'], ['Review', c.reviewed ? `${who(c.reviewed.by)} · ${at(c.reviewed.at)} · ${c.reviewed.verdict}` : 'not reviewed']] },
      { id: 'layers', heading: 'Seven layers of evidence', table: { title: 'Layers', note: 'What the recorded relationships show at each layer, and the records they cite.', cols: [{ key: 'layer', label: 'Layer' }, { key: 'obs', label: 'Observations' }, { key: 'cites', label: 'Cites' }, { key: 'state', label: 'Evidence', kind: 'status' }],
        rows: c.layers.map((l) => ({ layer: l.label, obs: l.observations.join('; ') || 'nothing recorded', cites: l.cites.join(', '), state: l.observations.length ? 'Recorded' : 'Not run' })) } },
      { id: 'hyps', heading: 'Hypotheses, ranked', text: ['Each hypothesis says why it is not proven, what argues against it and the next supervised step. The tier is the most an action on it may do.'],
        table: { title: 'Hypotheses', cols: [{ key: 'id', label: 'ID' }, { key: 'text', label: 'Hypothesis' }, { key: 'layer', label: 'Layer' }, { key: 'conf', label: 'Confidence', kind: 'status' }, { key: 'tier', label: 'Tier' }, { key: 'caveat', label: 'Why it is not proven' }, { key: 'against', label: 'Against it' }, { key: 'next', label: 'Next step' }, { key: 'ev', label: 'Evidence cited' }],
          rows: c.hypotheses.map((h) => ({ id: h.id, text: h.text, layer: h.layer, conf: CONF_WORD[h.confidence]!, tier: `${h.action.tier}${h.action.runbook ? ` · ${h.action.runbook}` : ''}`, caveat: h.caveat, against: h.negative.join('; ') || '—', next: h.next.join('; ') || '—', ev: h.evidence.join('; ') || 'none' })) } },
      { id: 'actions', heading: 'Action log', text: ['Every attempt is logged, including the blocked ones: a blocked outcome is the system working.'],
        table: { title: 'Actions', cols: [{ key: 'at', label: 'When (UTC)', kind: 'date' }, { key: 'by', label: 'Who' }, { key: 'tier', label: 'Tier' }, { key: 'hyp', label: 'Hypothesis' }, { key: 'outcome', label: 'Outcome', kind: 'status' }, { key: 'sim', label: 'Simulated' }, { key: 'detail', label: 'Detail' }],
          rows: c.actions.map((a) => ({ at: at(a.at), by: who(a.by), tier: `${a.tier}${a.runbook ? ` · ${a.runbook}` : ''}`, hyp: a.hypothesisId, outcome: a.outcome.replace(/_/g, ' ').toLowerCase(), sim: a.simulated ? 'yes' : 'no', detail: `${a.detail}${a.verification ? ` · post-repair verification ${a.verification}` : ''}` })) } },
      { id: 'tiers', heading: 'Action tiers', table: { title: 'Tiers', cols: [{ key: 't', label: 'Tier' }, { key: 'label', label: 'Meaning' }, { key: 'bound', label: 'Boundary' }, { key: 'auto', label: 'Autonomous' }], rows: (Object.keys(TIERS) as Tier[]).map((t) => ({ t, label: TIERS[t].label, bound: TIERS[t].bound, auto: TIERS[t].autonomous ? 'yes' : 'no: a person decides' })) } },
      { id: 'runbooks', heading: 'Runbooks named by this case', table: { title: 'Runbooks', cols: [{ key: 'id', label: 'Runbook' }, { key: 'label', label: 'What it does' }, { key: 'v', label: 'Version' }, { key: 'signed', label: 'Signed', kind: 'status' }, { key: 'targets', label: 'Targets' }, { key: 'rollback', label: 'Rollback' }],
        rows: [...new Set(c.hypotheses.map((h) => h.action.runbook).filter(Boolean) as string[])].filter((k) => RUNBOOKS[k]).map((k) => ({ id: k, label: RUNBOOKS[k]!.label, v: RUNBOOKS[k]!.version, signed: RUNBOOKS[k]!.signedBy ? `Signed by ${RUNBOOKS[k]!.signedBy}` : 'Unsigned', targets: RUNBOOKS[k]!.targets.join(', '), rollback: RUNBOOKS[k]!.rollback })) } },
    ],
    dossier: {
      case: { id: c.id, incidentId: c.incidentId, roomId: c.roomId, key: c.key, openedAt: c.openedAt, seeded: !!c.seeded, reviewed: c.reviewed },
      layers: c.layers, hypotheses: c.hypotheses, actions: c.actions,
      thread: { commissioning: cx, assurance: as, incident: inc ? { id: inc.id, state: inc.state, severity: inc.severity } : null, workOrder: wo ? { id: wo.id, state: wo.state } : null, learn: learn ? { id: learn.id, state: learn.state } : null },
      adapters: w.adapters,
    },
  };
}
