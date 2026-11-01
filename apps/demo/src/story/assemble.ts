/**
 * "Show me this room's entire story": one room's lifecycle assembled from the records this demonstration already holds — the Build a
 * Room draft (design, revisions, approvals and refusals, results, verifications, the re-verification a substitution requires while the
 * accepted room is recommissioned, baselines and its ledger), the synthetic estate graph
 * (devices, relationships, dependencies, baselines on record), the Mission Control / Executive records (request, decision, funding,
 * baseline summaries, field scans) and the service workspace (incidents, work orders and their evidence, APEX diagnoses, Learn cases,
 * Physical Validation sessions, refusals in the ledger).
 *
 * Rules (owner, non-negotiable): nothing is invented. A stage with no record says so; a field the record does not hold (who, why, when)
 * is null and shown as "not recorded"; evidence keeps the label the demonstration already gives it (DECLARED, MODELED, OBSERVED,
 * DERIVED, VERIFIED, SIMULATED, the result labels) and is never promoted. Every count in the summary is computed from the entries. Pure:
 * no React, no storage — the page passes the sources in.
 */
import { resultLabel, resultWords, ENGINE_VERSION, DRAWING_KINDS, installationSentence } from '@empathia/commissioning-engine';
import type { RecordedResult, PlannedDevice, Connection } from '@empathia/domain-types';
import { ask, nodeKey, RELATIONS, type NodeRef, type SearchNode } from '@empathia/search-party';
import { SLA } from '@empathia/service-engine';
import type { Records } from '@empathia/kpi-engine';
import * as B from '../build/store.js';
import type { Workspace, Incident } from '../workspace/store.js';
import { contextPacket, type Estate } from '../search/estate.js';
import { roomAggregates } from '../workspace/records.js';

export const STAGES = [
  { key: 'request', label: 'Request', empty: 'A request is the intake that starts a project; none is linked to this room.' },
  { key: 'design', label: 'Design', empty: 'Devices, connections and saved revisions of the design appear here.' },
  { key: 'authorize', label: 'Authorize', empty: 'Approvals and refusals of the classification, the design, the drawings and the installation window appear here.' },
  { key: 'commission', label: 'Commission', empty: 'Results are recorded on the installed room while it is in COMMISSIONING.' },
  { key: 'verify', label: 'Verify', empty: 'A different person verifies each recorded PASS; field validations appear here too.' },
  { key: 'baseline', label: 'Baseline', empty: 'A baseline is published when the room is accepted.' },
  { key: 'operate', label: 'Operate and Service', empty: 'Incidents, work orders, retests and diagnoses for this room appear here.' },
  { key: 'learn', label: 'Learn', empty: 'A Learn case is written from a resolved incident in this room, with permission and de-identification.' },
] as const;
export type StageKey = (typeof STAGES)[number]['key'];
/** The evidence vocabulary the demonstration already uses: the result labels, and declared / modeled / observed / derived / verified / simulated / unknown. */
export type Evidence = 'PASS_VERIFIED' | 'PASS_UNVERIFIED' | 'FAIL' | 'NOT_SUPPORTED' | 'INCONCLUSIVE' | 'NOT_TESTED' | 'VERIFIED' | 'OBSERVED' | 'DERIVED' | 'DECLARED' | 'MODELED' | 'SIMULATED' | 'UNKNOWN';
export const EVIDENCE_MEANING: Record<Evidence, string> = {
  PASS_VERIFIED: 'a recorded PASS, independently verified by a different person', VERIFIED: 'checked by someone other than the person who did the work',
  PASS_UNVERIFIED: 'a recorded PASS still waiting for a different person to verify it', FAIL: 'a recorded failure: a deficiency until a verified retest',
  NOT_SUPPORTED: 'the equipment cannot perform the test', INCONCLUSIVE: 'the test ran; its outcome could not be determined', NOT_TESTED: 'no result recorded',
  OBSERVED: 'read from a record of the installed system (here: a synthetic collector export, never polled live)', DERIVED: 'computed by the platform from other records or rules',
  DECLARED: 'stated by a person or a record, not measured and not independently checked', MODELED: 'proposed by the design rules, not observed on an installed system',
  SIMULATED: 'a labelled simulation: no adapter, no hardware, no measured value', UNKNOWN: 'nothing is recorded',
};
export interface StoryItem { id: string; text: string; at?: string | null; who?: string | null; evidence?: Evidence }
export interface StoryEntry {
  id: string; stage: StageKey;
  /** ISO time of the record; null = the record holds no time */
  at: string | null;
  /** who acted (persona or synthetic person); null = not recorded */
  who: string | null;
  what: string; detail?: string | null;
  from?: string | null; to?: string | null;
  /** the rationale the record holds; null = none recorded */
  why?: string | null;
  evidence: Evidence; outcome?: 'ALLOWED' | 'DENIED';
  /** the lifecycle the room was in when the record was made, when the record is later than the first acceptance (recommissioning) */
  phase?: string | null;
  /** a state of the room read from the current records (the design today, the plan, its dependencies), not an event: no time, no actor */
  state?: boolean;
  source: string; href: string; linkLabel: string;
  /** engineer density: ids, evidence references, instruments, provenance */
  tech: Array<[string, string]>;
  /** executive density: what it means for status and impact */
  impact?: string | null;
  items?: StoryItem[];
}
export interface Story {
  roomId: string; found: boolean; kind: 'draft' | 'estate' | 'none';
  room: { id: string; name: string; building: string | null; site: string | null; source: string };
  summary: {
    state: { value: string; source: string } | null;
    baseline: { version: number; state: string; at: string | null; by: string | null; source: string } | null;
    open: Array<{ text: string; href: string }>;
    stagesWithRecords: number; stageCount: number; entries: number; ledgerEvents: number;
    evidence: Array<[Evidence, number]>;
    /** `text` says what the record states, in its own terms: a seeded summary is not presented as results the demonstration verified */
    tests: { verified: number; applicable: number; text: string; source: string } | null;
  };
  stages: Array<{ key: StageKey; label: string; empty: string; entries: StoryEntry[] }>;
  gaps: string[]; sources: string[];
}
export interface StorySources { draft: B.Draft | null; w: Workspace; est: Estate; R: Records }

const LINK = { build: (tab: string) => `#/v25/build?tab=${tab}` };
const provEvidence = (p: string | null | undefined): Evidence => (!p ? 'UNKNOWN' : /^OBSERVED/.test(p) ? 'OBSERVED' : /^DERIVED/.test(p) ? 'DERIVED' : /^(MODELED|PROPOSED)/.test(p) ? 'MODELED' : /^(DECLARED|synthetic seed|V25_PERSONAS|Build a Room)/.test(p) ? 'DECLARED' : 'UNKNOWN');
const labelOf = (state: string): Evidence => (state === 'PASS' ? 'PASS_UNVERIFIED' : (['FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'].includes(state) ? state : 'DECLARED') as Evidence);
const minute = (s: string | null | undefined) => (s || '').slice(0, 16);
const plural = (n: number, w: string, ws = `${w}s`) => `${n} ${n === 1 ? w : ws}`;
const hours = (a: string, b: string) => { const h = (Date.parse(b) - Date.parse(a)) / 36e5; return h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`; };

/** The rooms that have a story: every room of the estate graph (the Build a Room draft is merged into it as a room of the Northstar Annex). */
export function storyRooms(est: Estate): Array<{ id: string; label: string; subtitle: string }> {
  return est.nodes.filter((n) => n.type === 'Room').map((n) => ({ id: n.id, label: n.label, subtitle: n.subtitle || '' }));
}

export function assembleStory(roomId: string, src: StorySources): Story {
  const { draft, w, est, R } = src;
  const byKey = new Map(est.nodes.map((n) => [nodeKey(n), n] as const));
  const ref: NodeRef = { type: 'Room', id: roomId };
  const node = byKey.get(nodeKey(ref));
  const isDraft = !!draft && draft.code === roomId;
  const who = (by: string | null | undefined) => (!by ? null : by === 'system' ? 'System (seed)' : w.staff.find((s) => s.id === by)?.name || B.personaLabel(by));
  const label = (n: NodeRef) => byKey.get(nodeKey(n))?.label || n.id;
  const entries: StoryEntry[] = [];
  const seen = new Map<string, number>();
  const push = (e: Omit<StoryEntry, 'id'> & { id?: string }) => { const base = e.id || `${e.stage}:${e.at || '-'}:${e.what.slice(0, 40)}`; const n = (seen.get(base) || 0) + 1; seen.set(base, n); entries.push({ ...e, id: n > 1 ? `${base}#${n}` : base } as StoryEntry); };

  if (!node && !isDraft) {
    return { roomId, found: false, kind: 'none', room: { id: roomId, name: roomId || 'No room chosen', building: null, site: null, source: '' },
      summary: { state: null, baseline: null, open: [], stagesWithRecords: 0, stageCount: STAGES.length, entries: 0, ledgerEvents: 0, evidence: [], tests: null },
      stages: STAGES.map((s) => ({ key: s.key, label: s.label, empty: s.empty, entries: [] })), gaps: [], sources: [] };
  }
  // ---------------------------------------------------------------- identity, from the graph (LOCATED_IN building → site)
  const bEdge = est.edges.find((e) => e.rel === 'LOCATED_IN' && nodeKey(e.from) === nodeKey(ref) && e.to.type === 'Building');
  const sEdge = bEdge ? est.edges.find((e) => e.rel === 'LOCATED_IN' && nodeKey(e.from) === nodeKey(bEdge.to) && e.to.type === 'Site') : undefined;
  const room = { id: roomId, name: isDraft ? draft!.name : node!.label, building: bEdge ? label(bEdge.to) : null, site: sEdge ? label(sEdge.to) : null, source: isDraft ? 'Build a Room draft (this browser)' : node!.provenance };
  const sources: string[] = [];
  const gaps: string[] = [];
  const open: Story['summary']['open'] = [];
  let tests: Story['summary']['tests'] = null;
  let baseline: Story['summary']['baseline'] = null;
  let state: Story['summary']['state'] = null;
  const ctx = { graph: est.graph, nodes: byKey as Map<string, SearchNode>, facts: {} };

  if (isDraft) {
    const d = draft!; sources.push('Build a Room draft and its ledger (this browser)');
    const a = B.analysis(d); const tl = B.C.templates[d.design.template]?.label || d.design.template;
    state = { value: d.design.lifecycle, source: 'Build a Room' };
    // the lifecycle the room was in at each moment (to mark records made after the first acceptance)
    const lc: Array<{ at: string; to: string }> = [];
    const firstAccept = (d.baselines || []).map((b) => b.at).sort()[0] || null;
    const phaseAt = (at: string) => { if (!firstAccept || at <= firstAccept) return null; let cur = 'PLANNED'; for (const x of lc) if (x.at <= at) cur = x.to; const bl = (d.baselines || []).filter((b) => b.at <= at).sort((x, y) => y.version - x.version)[0]; return `while ${cur}${bl ? ` · baseline v${bl.version} current` : ''}`; };
    const oldest = [...d.events].reverse();
    for (const e of oldest) if (e.type === 'room.lifecycle_changed') { const m = /(\w+) → (\w+)/.exec(e.detail); if (m) lc.push({ at: e.at, to: m[2]! }); }
    for (const e of oldest) {
      const base = { at: e.at, who: who(e.by), source: 'Build a Room ledger', tech: [['Event', e.type], ['Outcome', e.outcome], ['Detail', e.detail]] as Array<[string, string]>, phase: phaseAt(e.at) };
      const refusal = e.outcome === 'DENIED'; const reason = e.detail.replace(/^refused: /, '').replace(/^\S+ refused: /, '');
      if (e.type === 'room.design_created') push({ ...base, stage: 'design', what: `Room created from the ${tl} template`, detail: e.detail, evidence: d.design.geometry.confidence === 'declared' ? 'DECLARED' : 'MODELED', why: null, href: LINK.build('design'), linkLabel: 'Open the design' });
      // D-39: a design edit the room does not accept in its state (the shared rule), refused and recorded
      else if ((e.type === 'room.device_added' || e.type === 'room.device_removed' || e.type === 'room.device_swapped') && refusal) push({ ...base, stage: 'design', what: `Device ${e.type === 'room.device_added' ? 'addition' : e.type === 'room.device_removed' ? 'removal' : 'swap or model substitution'} refused`, why: reason, evidence: 'DERIVED', outcome: 'DENIED', href: LINK.build('ledger'), linkLabel: 'Open the room ledger' });
      else if (e.type === 'room.device_added' || e.type === 'room.device_removed' || e.type === 'room.device_swapped') {
        const c = e.change;
        const what = c ? (c.what === 'device swapped' ? `${c.from} swapped for ${c.to}` : c.what === 'model substituted' ? `Model substituted at the same position: ${c.from} → ${c.to}` : c.what === 'device added' ? `${c.to} added` : `${c.from} removed`) : e.detail;
        const aff = c?.affected || [];
        const n = (k: string, eff: RegExp) => aff.filter((x) => x.kind === k && eff.test(x.effect)).length;
        const parts = [n('test', /^now applies/) ? `${n('test', /^now applies/)} more tests to commission` : '', n('test', /^no longer/) ? `${n('test', /^no longer/)} tests no longer apply` : '', n('test', /^now covers/) ? `${n('test', /^now covers/)} tests now cover a different device` : '', n('test', /^reopened/) ? `${n('test', /^reopened/)} tests reopened: recorded on the previous device, to be re-run and verified again` : '', aff.some((x) => x.kind === 'baseline') ? 'the room now differs from its accepted baseline' : '', aff.filter((x) => x.kind === 'kpi').length ? `${aff.filter((x) => x.kind === 'kpi').length} KPI passports changed` : ''].filter(Boolean);
        push({ ...base, stage: 'design', what, from: c?.from ?? null, to: c?.to ?? null, why: c ? c.why || null : null, evidence: 'DECLARED', href: LINK.build('design'), linkLabel: 'Open the design',
          impact: c ? (parts.length ? `${parts.join('; ')}.` : 'No test, baseline or KPI changed.') : null,
          items: aff.map((x, i) => ({ id: `${x.kind}:${x.id}:${i}`, text: `${x.kind} ${x.id} · ${x.label}: ${x.effect}` })) });
      }
      else if (e.type === 'room.design_revision_saved') continue;   // from d.revisions below (they hold the reason)
      else if (e.type === 'room.classification_approved') { const m = /^(\S+) \((?:override: )?(.*)\)$/.exec(e.detail); push({ ...base, stage: 'authorize', what: `Classification approved as ${m?.[1] || e.detail}`, why: m?.[2] || null, evidence: 'DECLARED', outcome: 'ALLOWED', href: LINK.build('design'), linkLabel: 'Open the classification' }); }
      else if (e.type === 'room.classify.approve' && refusal) push({ ...base, stage: 'authorize', what: 'Classification approval refused', why: reason, evidence: 'DERIVED', outcome: 'DENIED', href: LINK.build('ledger'), linkLabel: 'Open the room ledger' });
      // a revision approved while the accepted room is recommissioned: the revision the re-acceptance binds (or the refusal and why)
      else if (e.type === 'room.revision.approve') push({ ...base, stage: 'authorize', what: refusal ? `Design revision approval refused: ${e.detail.split(' refused')[0]}` : `Design ${e.detail.split(' approved')[0]} approved during recommissioning — the re-acceptance binds it`, detail: refusal ? null : e.detail, why: refusal ? e.detail.replace(/^revision \d+ refused: /, '') : null, evidence: refusal ? 'DERIVED' : 'DECLARED', outcome: e.outcome, href: refusal ? LINK.build('ledger') : LINK.build('design'), linkLabel: refusal ? 'Open the room ledger' : 'Open the revisions' });
      else if (e.type === 'room.drawing_approved') { const kind = Object.entries(DRAWING_KINDS).find(([, l]) => e.detail.startsWith(l))?.[0]; const now = kind ? d.drawings[kind]?.state : null; push({ ...base, stage: 'authorize', what: `Drawing approved: ${e.detail.replace(/ \(input .*\)$/, '')}`, detail: now === 'REVIEW_REQUIRED' ? 'Its input has changed since: the drawing is now REVIEW_REQUIRED.' : null, evidence: 'DECLARED', outcome: 'ALLOWED', href: LINK.build('drawings'), linkLabel: 'Open the drawings' }); }
      else if (e.type === 'room.lifecycle_changed') {
        const m = /(\w+) → (\w+)/.exec(e.detail); const from = m?.[1] || null; const to = m?.[2] || null;
        if (to === 'ACCEPTED') continue;   // the baseline entry stands for the acceptance
        const what = to === 'DESIGN_APPROVED' ? 'Design approved' : to === 'PLANNED' ? 'Design sent back to PLANNED' : to === 'INSTALLATION_PENDING' ? 'Installation window approved' : to === 'INSTALLED_UNVERIFIED' ? 'Installation reported (not yet verified)' : to === 'COMMISSIONING' && from === 'ACCEPTED' ? 'Recommissioning started: the accepted baseline stays current until the room is accepted again' : to === 'COMMISSIONING' ? 'Commissioning started' : to === 'OPERATIONAL' ? 'Handed to operations' : `Moved to ${to}`;
        const stage: StageKey = to === 'INSTALLED_UNVERIFIED' || to === 'COMMISSIONING' ? 'commission' : to === 'OPERATIONAL' ? 'operate' : 'authorize';
        push({ ...base, phase: null, stage, what, from, to, why: null, evidence: 'DECLARED', outcome: 'ALLOWED', href: LINK.build('lifecycle'), linkLabel: 'Open the lifecycle' });
      }
      else if (e.type.startsWith('room.lifecycle:') && refusal) { const to = e.type.split(':')[1]!; const stage: StageKey = to === 'ACCEPTED' ? 'baseline' : to === 'OPERATIONAL' ? 'operate' : to === 'INSTALLED_UNVERIFIED' || to === 'COMMISSIONING' ? 'commission' : 'authorize'; push({ ...base, stage, what: `Move to ${to} refused`, from: null, to, why: reason, evidence: 'DERIVED', outcome: 'DENIED', href: LINK.build('ledger'), linkLabel: 'Open the room ledger' }); }
      else if ((e.type === 'test.recorded' || e.type === 'test.verified') && refusal) push({ ...base, stage: e.type === 'test.recorded' ? 'commission' : 'verify', what: `${e.type === 'test.recorded' ? 'Recording' : 'Verification'} of ${e.detail.split(' ')[0]} refused`, why: reason, evidence: 'DERIVED', outcome: 'DENIED', href: LINK.build('ledger'), linkLabel: 'Open the room ledger' });
      else if (e.type === 'test.recorded' || e.type === 'test.verified') continue;   // from the result records below (they hold the evidence)
      // ADR-0012: the physical units — installed, replaced like for like, their identity recorded (the unit's history, apart from the position's design)
      else if (e.type === 'commission.asset_replaced' || e.type === 'asset.installed' || e.type === 'asset.identity_recorded') {
        const c = e.change;
        const what = refusal ? `${e.type === 'asset.identity_recorded' ? 'Identity record' : 'Unit replacement'} refused` : e.type === 'asset.installed' ? 'Units recorded at their positions' : e.type === 'asset.identity_recorded' ? `Unit identity recorded: ${e.detail.split(':')[0]}` : `Unit replaced like for like: ${c?.from ?? ''} → ${c?.to ?? ''}`;
        push({ ...base, stage: 'commission', what, detail: e.detail, from: c?.from ?? null, to: c?.to ?? null, why: refusal ? reason : c ? c.why || null : null, evidence: refusal ? 'DERIVED' : 'DECLARED', outcome: e.outcome, href: LINK.build('design'), linkLabel: 'Open the device register',
          items: (c?.affected || []).map((x, i) => ({ id: `${x.kind}:${x.id}:${i}`, text: `${x.kind} ${x.id} · ${x.label}: ${x.effect}` })) });
      }
      else push({ ...base, stage: 'design', what: e.type, detail: e.detail, evidence: refusal ? 'DERIVED' : 'DECLARED', outcome: e.outcome, href: LINK.build('ledger'), linkLabel: 'Open the room ledger' });
    }
    for (const r of d.revisions) push({ stage: 'design', at: r.at, who: who(r.by), what: `Design revision ${r.n} saved${d.approvedRevision === r.n ? ' — the revision the design approval binds' : ''}`, why: r.reason || null, evidence: 'DECLARED', source: 'Build a Room revisions', href: LINK.build('design'), linkLabel: 'Open the revisions', tech: [['Revision', String(r.n)], ['Design hash', r.hash]], phase: phaseAt(r.at) });
    // the design as it stands (a state, not an event: no time)
    const devs = B.live(d.design.devices) as PlannedDevice[]; const conns = B.live(d.design.connections) as Connection[];
    push({ stage: 'design', at: null, who: null, state: true, what: `The design today: ${plural(devs.filter((x) => !x.furniture).length, 'device')} and ${plural(conns.length, 'proposed connection')}`, detail: `Devices are declared by the designer; connections are proposed by the design rules (MODELED) until the installed system shows them.`, evidence: 'DECLARED', source: 'Build a Room design', href: LINK.build('design'), linkLabel: 'Open the design',
      tech: [['Template', d.design.template], ['Dimensions', `${d.design.geometry.lengthM} × ${d.design.geometry.widthM} × ${d.design.geometry.ceiling} m (${Object.entries(d.design.geometry.provenance).map(([k, v]) => `${k} ${v}`).join(', ')})`], ['Classification', `${a.classification.archetype} · ${a.classification.complexity}${d.design.classification.approved ? ` · approved ${d.design.classification.approved.archetype}${d.design.classification.approved.stale ? ' (stale)' : ''}` : ' · not approved'}`]],
      items: [...devs.map((x) => ({ id: x.id, text: `${x.id} · ${x.label} (${x.cat}, ${x.mount}${x.furniture ? ', furniture' : ''})`, evidence: 'DECLARED' as Evidence })), ...conns.map((c) => ({ id: c.id, text: `${c.id} · ${c.from} → ${c.to} (${c.kind}): ${c.why || ''}`, evidence: 'MODELED' as Evidence }))] });
    // ADR-0012: the positions with their design history, kept apart from the units' history (below, under Commission)
    const posList = devs.filter((x) => !x.furniture);
    push({ id: 'design:positions', stage: 'design', at: null, who: null, state: true, what: `${plural(posList.length, 'position')} and their design history`, detail: 'A position is the slot in the room: its purpose, mounting and place. It keeps its code when the physical unit at it changes; a different category is a different position.', evidence: 'DECLARED', source: 'Build a Room design', href: LINK.build('design'), linkLabel: 'Open the device register', tech: [['Positions', String(posList.length)], ['Design changes', String((d.designHistory || []).length)]],
      items: [...posList.map((x) => ({ id: `pos:${x.id}`, text: `${B.identityLabel(d, x.id)} · ${x.label} (${x.cat}), designed model ${x.model}`, evidence: 'DECLARED' as Evidence })), ...(d.designHistory || []).map((h, i) => ({ id: `poshist:${i}`, text: `${h.position}: ${h.kind === 'model' ? `model ${h.from} → ${h.to}` : `${h.from} replaced by ${h.to}`}`, at: h.at, who: who(h.by), evidence: 'DECLARED' as Evidence }))] });
    if ((d.installations || []).length) push({ id: 'commission:units', stage: 'commission', at: null, who: null, state: true, what: `${plural((d.assets || []).length, 'physical unit')} on record — the asset history`, detail: `Each unit keeps its own history wherever it is installed. Identity: ${['UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED'].map((k) => `${(d.assets || []).filter((u) => u.identityState === k).length} ${k}`).join(', ')} (synthetic units; UNKNOWN means nothing about the unit is recorded).`, evidence: 'DECLARED', source: 'Build a Room installation records', href: LINK.build('design'), linkLabel: 'Open the device register', tech: (d.assets || []).map((u) => [u.code, `${u.category} · ${u.model} · identity ${u.identityState}${u.serial ? ` · serial ${u.serial} (synthetic)` : ''}`] as [string, string]),
      items: (d.installations || []).map((i) => ({ id: `inst:${i.id}`, text: installationSentence(i, (x) => (x ? B.personaLabel(x) : 'nobody recorded')), at: i.installedAt, who: i.installedBy ? who(i.installedBy) : null, evidence: (i.basis === 'KNOWN_AS_OF_MIGRATION' ? 'UNKNOWN' : 'DECLARED') as Evidence })) });
    if (a.checks.length) push({ stage: 'design', at: null, who: null, state: true, what: `${plural(a.checks.length, 'design finding')} open`, detail: a.checks.map((c) => `${c.severity}: ${c.title}`).join('; '), evidence: 'DERIVED', source: `design checks (engine ${ENGINE_VERSION})`, href: LINK.build('checks'), linkLabel: 'Open the checks', tech: a.checks.map((c) => [c.key, `${c.severity} · ${c.rationale}`] as [string, string]) });
    // the commissioning plan the engine compiles from the design (state, recomputed now); a result a substitution reopened no longer counts
    const app = a.applicability.rows.filter((r) => r.applicable);
    const rv = B.reverification(d, a); const stale = new Set(rv.filter((t) => t.rerun).map((t) => t.testId)); const cn = B.countsNow(d, a);
    const reopenedWords = cn.reopened ? `, ${plural(cn.reopened, 'test')} reopened by a substitution (their earlier results no longer count)` : '';
    push({ stage: 'commission', at: null, who: null, state: true, what: `Commissioning plan: ${app.length} of ${a.applicability.library} library tests apply to this design`, detail: `Each states why it applies. Today: ${resultWords(cn)}, ${cn.notTested} not tested${reopenedWords}.`, evidence: 'DERIVED', source: `applicability engine ${ENGINE_VERSION} (recomputed from the current design)`, href: LINK.build('checks'), linkLabel: 'Open the plan',
      impact: `${cn.verified} of ${app.length} applicable tests passed and independently verified${cn.reopened ? `; ${cn.reopened} reopened` : ''}.`,
      tech: [['Engine', ENGINE_VERSION], ['Context', `${a.applicability.ctx.type} / ${a.applicability.ctx.room} / ${a.applicability.ctx.families.join('+') || 'no family'} / ${a.applicability.ctx.tier} / risk ${a.applicability.ctx.risk}`], ['Packs', a.applicability.packs.join(', ') || 'none']],
      items: app.map((r) => ({ id: r.id, text: `${r.id} · ${r.label} — ${r.status}; ${r.why.join('; ')}${r.instrument ? ' · instrument-measured' : ''}${(r.evidence || []).length ? ` · accepts ${(r.evidence || []).join(', ')}` : ''}${(r.devices || []).length ? ` · covers ${(r.devices || []).join(', ')}` : ''}`, evidence: (r.result as Evidence) || 'NOT_TESTED' })) });
    tests = { verified: cn.verified, applicable: cn.applicable, text: `${cn.verified} of ${cn.applicable} applicable tests passed and independently verified${cn.reopened ? ` (${cn.reopened} reopened by a substitution no longer count)` : ''}`, source: 'Build a Room results, engine labels' };
    // results and verifications, from the result records (current and superseded), grouped by person and minute
    type Rec = { test: string; state: string; by: string; at: string; ev: RecordedResult['evidence'] | null; verified: { by: string; at?: string } | null; superseded: boolean };
    const recs: Rec[] = [];
    for (const [id, r] of Object.entries(B.results(d))) {
      for (const h of (r.history || []) as Array<{ state: string; by: string; at: string; verified: { by: string; at?: string } | null }>) recs.push({ test: id, state: h.state, by: h.by, at: h.at, ev: null, verified: h.verified, superseded: true });
      recs.push({ test: id, state: r.state, by: r.by, at: r.at || '', ev: r.evidence, verified: r.verified, superseded: false });
    }
    const lab = (id: string) => a.applicability.rows.find((r) => r.id === id)?.label || id;
    const group = <T,>(xs: T[], k: (x: T) => string) => xs.reduce<Map<string, T[]>>((m, x) => { const key = k(x); m.set(key, [...(m.get(key) || []), x]); return m; }, new Map());
    for (const [, g] of group(recs, (r) => `${r.by}|${minute(r.at)}`)) {
      const st = (s: string) => g.filter((r) => r.state === s).length; const worst: Evidence = st('FAIL') ? 'FAIL' : st('INCONCLUSIVE') ? 'INCONCLUSIVE' : st('NOT_SUPPORTED') ? 'NOT_SUPPORTED' : 'PASS_UNVERIFIED';
      const at = g.map((r) => r.at).sort()[0] || null;
      push({ stage: 'commission', at, who: who(g[0]!.by), what: `${plural(g.length, 'result')} recorded: ${['PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'].filter(st).map((s) => `${st(s)} ${s}`).join(', ')}`, detail: st('PASS') ? 'A recorded PASS stays PASS_UNVERIFIED until a different person verifies it.' : null, evidence: worst, source: 'Build a Room results', href: LINK.build('lifecycle'), linkLabel: 'Open the results', phase: at ? phaseAt(at) : null,
        tech: [['Tests', g.map((r) => r.test).join(', ')]], impact: st('FAIL') ? `${st('FAIL')} failed: a deficiency stays open until a verified retest.` : null,
        items: g.map((r) => ({ id: `${r.test}@${r.at}`, text: `${r.test} · ${lab(r.test)}: ${r.state}${r.ev ? ` — ${r.ev.kind}: ${r.ev.ref}${r.ev.instrument ? ` · instrument ${r.ev.instrument}` : ''}` : ''}${r.superseded ? ' (superseded by a later record)' : stale.has(r.test) ? ` (${B.PREVIOUS_DEVICE})` : ''}`, evidence: labelOf(r.state) })) });
    }
    const ver = recs.filter((r) => r.verified && r.verified.by && r.verified.by !== r.by);
    for (const [, g] of group(ver, (r) => `${r.verified!.by}|${minute(r.verified!.at)}`)) {
      const at = g.map((r) => r.verified!.at || '').sort()[0] || null;
      push({ stage: 'verify', at, who: who(g[0]!.verified!.by), what: `${plural(g.length, 'result')} independently verified`, detail: `Recorded by ${[...new Set(g.map((r) => who(r.by)))].join(', ')}; verified by someone else.`, evidence: 'PASS_VERIFIED', source: 'Build a Room results', href: LINK.build('lifecycle'), linkLabel: 'Open the results', phase: at ? phaseAt(at) : null,
        tech: [['Tests', g.map((r) => r.test).join(', ')]], items: g.map((r) => ({ id: `${r.test}@v${r.verified!.at}`, text: `${r.test} · ${lab(r.test)}: recorded by ${who(r.by)}, verified by ${who(r.verified!.by)}${r.superseded ? ' (superseded by a later record)' : stale.has(r.test) ? ` (${B.PREVIOUS_DEVICE})` : ''}`, evidence: 'PASS_VERIFIED' as Evidence })) });
    }
    // the re-verification a substitution requires while the accepted room is recommissioned (a state read from the records: no time, no actor)
    const bl = B.recommissioningBaseline(d);
    if (rv.length && bl) {
      const subs = B.activeSubstitutions(d); const out = rv.filter((t) => t.rerun); const unverified = rv.filter((t) => !t.rerun && t.result !== 'PASS_VERIFIED');
      push({ id: 'verify:reverification', stage: 'verify', at: null, who: null, state: true, what: `Re-verification required: ${plural(rv.length, 'test')} reopened by ${subs.length === 1 ? `the substitution of ${subs[0]!.label}` : `${subs.length} substitutions`} while baseline v${bl.version} is recommissioned`,
        detail: `${out.length ? `${plural(out.length, 'test')} still to be re-run on the changed design` : 'Every reopened test has been re-run since the substitution'}${unverified.length ? `; ${unverified.length} re-run and awaiting a pass verified by a different person` : ''}. A result recorded before the substitution was obtained on the previous device: it stays on record and no longer counts towards the re-acceptance.`,
        evidence: 'DERIVED', source: `re-verification rule of the commissioning engine ${ENGINE_VERSION} (the rule the enterprise API runs)`, href: LINK.build('checks'), linkLabel: 'Open the plan',
        impact: `${out.length + unverified.length} of ${rv.length} reopened tests still block the re-acceptance; baseline v${bl.version} is unchanged.`,
        tech: [['Substitutions', subs.map((s) => `${s.assetId} (${s.from}) → ${s.to} · ${minute(s.at).replace('T', ' ')} · ${who(s.by)}`).join('; ')], ['Baseline', `v${bl.version} · ${bl.state} · unchanged`], ['Still to re-run', out.map((t) => t.testId).join(', ') || 'none']],
        items: rv.map((t) => ({ id: `reverify:${t.testId}`, text: `${t.testId} · ${t.label}: ${t.rerun ? `${t.result} ${B.PREVIOUS_DEVICE}` : `re-run after the substitution — ${t.result}`} · ${t.reasons.join(' · ')}`, ...(t.rerun ? {} : { evidence: t.result as Evidence }) })) });
    }
    for (const b of d.baselines || []) {
      const ok = Object.values(b.results).filter((x) => x === 'PASS_VERIFIED').length; const n = Object.keys(b.results).length;
      push({ stage: 'baseline', at: b.at, who: who(b.by), what: `Accepted · baseline v${b.version} published`, from: 'COMMISSIONING', to: 'ACCEPTED', detail: b.state === 'SUPERSEDED' ? `Superseded by v${b.version + 1}, kept unchanged.` : 'The current baseline; a later acceptance publishes the next version and never overwrites this one.', why: null, evidence: n && ok === n ? 'PASS_VERIFIED' : 'DECLARED', outcome: 'ALLOWED', source: 'Build a Room baselines', href: LINK.build('lifecycle'), linkLabel: 'Open the baseline lineage', phase: phaseAt(b.at),
        impact: `${ok} of ${n} applicable tests verified · ${plural(b.devices.length, 'device')} bound · ${b.state}`,
        tech: [['Baseline', `v${b.version} · ${b.state}`], ['Design revision', String(b.revision ?? '—')], ['Results bound', `${ok}/${n} PASS_VERIFIED`]], items: b.devices.map((x) => ({ id: x.id, text: `${x.id} · ${x.label} (${x.cat})` })) });
    }
    if (d.baseline) baseline = { version: d.baseline.version, state: d.baseline.state, at: d.baseline.at, by: who(d.baseline.by), source: 'Build a Room' };
    // open items, from the records (the re-verification a substitution requires first: it is what the re-acceptance waits for)
    const toReverify = rv.filter((t) => t.rerun || t.result !== 'PASS_VERIFIED');
    if (toReverify.length) open.push({ text: `Re-verification required: ${plural(toReverify.length, 'reopened test')} to re-run on the changed design and verify again`, href: LINK.build('checks') });
    for (const c of a.checks) open.push({ text: `Design finding: ${c.title} (${c.severity})`, href: LINK.build('checks') });
    const L = app.map((r) => resultLabel(B.results(d)[r.id]));
    if (L.includes('FAIL')) open.push({ text: `${plural(L.filter((x) => x === 'FAIL').length, 'failed test')}: deficiencies until a verified retest`, href: LINK.build('lifecycle') });
    if (L.includes('PASS_UNVERIFIED')) open.push({ text: `${plural(L.filter((x) => x === 'PASS_UNVERIFIED').length, 'recorded PASS', 'recorded passes')} awaiting independent verification`, href: LINK.build('lifecycle') });
    if (d.design.lifecycle === 'COMMISSIONING' && L.includes('NOT_TESTED')) open.push({ text: `${plural(L.filter((x) => x === 'NOT_TESTED').length, 'applicable test')} not tested yet`, href: LINK.build('lifecycle') });
    if (d.design.classification.approved?.stale) open.push({ text: 'Classification approval is stale: the design changed after it', href: LINK.build('design') });
    const review = Object.entries(d.drawings).filter(([, x]) => x.state === 'REVIEW_REQUIRED');
    if (review.length) open.push({ text: `${plural(review.length, 'drawing')} REVIEW_REQUIRED (approved, then their input changed)`, href: LINK.build('drawings') });
    if (d.baseline && d.design.lifecycle === 'COMMISSIONING') open.push({ text: `Recommissioning in progress: baseline v${d.baseline.version} stays current until the room is accepted again`, href: LINK.build('lifecycle') });
    gaps.push('The request that started this room: Build a Room begins at the design, so no intake request exists for it (Mission Control derives a placeholder request from the creation time for its counters; this story does not present that as a request).');
  } else {
    // ---------------------------------------------------------------- a room of the synthetic estate
    sources.push('synthetic estate graph (Search Party)', 'Mission Control and Executive records (synthetic seed)');
    const lifecycle = String(node!.facets?.['lifecycle'] || '');
    state = lifecycle ? { value: lifecycle, source: 'declared by the synthetic seed' } : null;
    const projEdges = est.edges.filter((e) => e.rel === 'BELONGS_TO' && nodeKey(e.from) === nodeKey(ref) && e.to.type === 'Project');
    for (const pe of projEdges) {
      const p = R.projects.find((x) => x.id === pe.to.id); const pl = label(pe.to); const scope = `Project ${pe.to.id} (${pl}); this room belongs to it (${pe.provenance}).`;
      for (const q of R.requests.filter((x) => x.projectId === pe.to.id)) push({ stage: 'request', at: q.submittedAt || null, who: null, what: `Request ${q.id} submitted for ${pl}`, detail: scope, evidence: 'DECLARED', source: 'Mission Control records (synthetic seed)', href: '#/v25', linkLabel: 'Open Mission Control · Intake', tech: [['Request', q.id], ['Project', pe.to.id], ['Relationship', `BELONGS_TO · ${pe.provenance}`]] });
      for (const x of R.decisions.filter((y) => y.projectId === pe.to.id)) push({ stage: 'authorize', at: x.at, who: null, what: `Project decision: ${x.decision} (scope revision ${x.scopeRev})`, detail: scope, evidence: 'DECLARED', outcome: x.decision === 'APPROVED' ? 'ALLOWED' : undefined, source: 'decision records (synthetic seed)', href: '#/v25/exec', linkLabel: 'Open Executive intelligence', impact: `${x.decision} · scope revision ${x.scopeRev}`, tech: [['Project', x.projectId], ['Decision', `${x.decision} · scope ${x.scopeRev}`]] });
      for (const f of R.funding.filter((y) => y.projectId === pe.to.id)) push({ stage: 'authorize', at: f.at, who: null, what: `Project funding ${f.kind.toLowerCase()}`, detail: `${scope} Funding is recorded for the project, not the room.`, evidence: 'DECLARED', outcome: f.kind === 'AUTHORIZED' ? 'ALLOWED' : undefined, source: 'funding records (synthetic seed)', href: '#/v25/exec', linkLabel: 'Open Executive intelligence', impact: `${f.amount.toLocaleString('en-US')} ${f.currency} ${f.kind.toLowerCase()} for the project`, tech: [['Project', f.projectId], ['Amount', `${f.amount.toLocaleString('en-US')} ${f.currency}`]] });
      for (const h of p?.history || []) push({ stage: h.to === 'ENGINEERING_REVIEW' ? 'design' : h.to === 'FIELD_ACTIVE' ? 'commission' : 'authorize', at: h.at, who: null, what: h.to === 'ENGINEERING_REVIEW' ? `${pl} entered engineering review` : h.to === 'FIELD_ACTIVE' ? `${pl}: field work started` : `${pl} → ${h.to}`, to: h.to, detail: scope, evidence: 'DECLARED', source: 'delivery records (synthetic seed)', href: '#/v25', linkLabel: 'Open Mission Control', tech: [['Project', pe.to.id], ['Delivery', h.to]], impact: p ? `project ${p.governance || 'governance not recorded'} · delivery ${p.delivery || 'not recorded'}` : null });
    }
    // devices and the modelled signal flow, from the graph
    const devEdges = est.edges.filter((e) => (e.rel === 'PLANS_DEVICE' || e.rel === 'HAS_DEVICE') && nodeKey(e.from) === nodeKey(ref));
    const devIds = new Set(devEdges.map((e) => nodeKey(e.to)));
    if (devEdges.length) {
      const horizon = new Date(Date.parse(R.now) + 730 * 864e5).toISOString().slice(0, 10);
      const exp = R.devices.filter((x) => devEdges.some((e) => e.to.id === x.id) && x.supportEnd && x.supportEnd <= horizon);
      const lo = exp.reduce((n, x) => n + (x.romLow || 0), 0), hi = exp.reduce((n, x) => n + (x.romHigh || 0), 0);
      push({ stage: 'design', at: null, who: null, state: true, what: `${plural(devEdges.length, 'planned device')} on record`, detail: devEdges.map((e) => label(e.to)).join(', '), evidence: provEvidence(devEdges[0]!.provenance), source: 'synthetic estate graph', href: `#/search?focus=${encodeURIComponent(nodeKey(ref))}`, linkLabel: 'Open in Search Party',
        impact: exp.length ? `${plural(exp.length, 'device')} ${exp.length === 1 ? 'reaches' : 'reach'} end of vendor support within 24 months${lo || hi ? `; replacement range ${lo.toLocaleString('en-US')}–${hi.toLocaleString('en-US')} (a ROM range, never a quote)` : ''}.` : 'No device reaches end of vendor support within 24 months on record.',
        tech: devEdges.map((e) => { const r = R.devices.find((x) => x.id === e.to.id); return [e.to.id, `${label(e.to)} · ${e.rel} · ${e.provenance}${r ? ` · support ends ${r.supportEnd || 'not recorded'}` : ''}`] as [string, string]; }) });
      const flow = est.edges.filter((e) => devIds.has(nodeKey(e.from)) && devIds.has(nodeKey(e.to)));
      if (flow.length) push({ stage: 'design', at: null, who: null, state: true, what: `${plural(flow.length, 'signal and control connection')} proposed by the design rules`, detail: flow.map((e) => `${label(e.from)} ${RELATIONS[e.rel]?.[0] || e.rel} ${label(e.to)}`).join('; '), evidence: provEvidence(flow[0]!.provenance), source: 'synthetic estate graph', href: `#/search?focus=${encodeURIComponent(nodeKey(ref))}`, linkLabel: 'Open in Search Party', tech: flow.map((e) => [`${e.from.id} → ${e.to.id}`, `${e.rel} · ${e.provenance}`] as [string, string]) });
    } else gaps.push('Devices of this room: none are recorded in the graph, so the design and its dependencies cannot be shown (the Executive records count devices for it without naming them).');
    for (const e of est.edges.filter((x) => x.rel === 'APPROVED_BY' && nodeKey(x.from) === nodeKey(ref))) push({ stage: 'authorize', at: null, who: label(e.to), what: 'Room classification approved', evidence: provEvidence(e.provenance), outcome: 'ALLOWED', source: 'synthetic estate graph', href: `#/search?focus=${encodeURIComponent(nodeKey(ref))}`, linkLabel: 'Open in Search Party', tech: [['Relationship', `APPROVED_BY · ${e.provenance}`]] });
    // baselines: the graph's baseline records and the Executive records' baseline summary, merged by version
    const kb = R.rooms.find((r) => r.id === roomId)?.baseline || null;
    const gb = est.edges.filter((e) => e.rel === 'DOCUMENTS' && nodeKey(e.to) === nodeKey(ref) && e.from.type === 'CommissioningBaseline').map((e) => ({ edge: e, node: byKey.get(nodeKey(e.from))!, version: Number(/v(\d+)$/.exec(e.from.id)?.[1] || 0) }));
    const versions = [...new Set([...gb.map((x) => x.version), ...(kb ? [kb.version] : [])])].sort((x, y) => x - y);
    for (const v of versions) {
      const g = gb.find((x) => x.version === v); const k = kb && kb.version === v ? kb : null;
      const by = g ? est.edges.find((e) => e.rel === 'APPROVED_BY' && nodeKey(e.from) === nodeKey(g.edge.from)) : undefined;
      const st = g ? String(g.node.facets?.['state'] || '') : '';
      push({ stage: 'baseline', at: k?.publishedAt || null, who: by ? label(by.to) : null, what: `Accepted · baseline v${v} on record${st ? ` (${st})` : ''}`, to: st || null, detail: k ? `${k.verifiedTests} of ${k.applicableTests} applicable tests verified at acceptance${k.exceptions ? `, ${plural(k.exceptions, 'accepted exception')}` : ''}; ${plural(k.devicesBound, 'device')} bound. A summary held by the synthetic seed: the individual results are not.` : 'Held in the graph without a results summary.', evidence: 'DECLARED', outcome: 'ALLOWED',
        source: [g ? 'synthetic estate graph' : '', k ? 'Executive records (synthetic seed)' : ''].filter(Boolean).join(' + '), href: g ? `#/search?focus=${encodeURIComponent(nodeKey(g.edge.from))}` : '#/v25/exec', linkLabel: g ? 'Open in Search Party' : 'Open Executive intelligence',
        impact: k ? `${k.verifiedTests}/${k.applicableTests} verified at acceptance${k.exceptions ? ` · ${k.exceptions} exception` : ''}` : null,
        tech: [...(g ? [['Baseline record', `${g.node.id} · ${g.node.subtitle || ''} · ${g.edge.provenance}`] as [string, string]] : []), ...(by ? [['Published by', `${label(by.to)} · ${by.provenance}`] as [string, string]] : []), ...(k ? [['Summary', `verified ${k.verifiedTests}, applicable ${k.applicableTests}, exceptions ${k.exceptions}, devices ${k.devicesBound}`] as [string, string]] : [])] });
    }
    const last = versions[versions.length - 1];
    if (last !== undefined) { const g = gb.find((x) => x.version === last); baseline = { version: last, state: g ? String(g.node.facets?.['state'] || 'on record') : 'on record', at: kb && kb.version === last ? kb.publishedAt : null, by: null, source: [g ? 'graph' : '', kb ? 'Executive records' : ''].filter(Boolean).join(' + ') }; }
    if (kb) { tests = { verified: kb.verifiedTests, applicable: kb.applicableTests, text: `the baseline v${kb.version} record states ${kb.verifiedTests} of ${kb.applicableTests} tests verified at acceptance`, source: 'declared by the synthetic seed' }; gaps.push(`Test-by-test results behind baseline v${kb.version}: the synthetic seed holds the counts (${kb.verifiedTests} of ${kb.applicableTests} verified${kb.exceptions ? `, ${kb.exceptions} exception` : ''}), not the individual results, their evidence or who recorded and verified them.`); }
    for (const f of R.fieldScans.filter((x) => x.roomId === roomId)) push({ stage: 'verify', at: f.at, who: null, what: `Supervised field verification ${f.completed ? 'completed' : 'started'}`, evidence: 'DECLARED', source: 'Executive records (synthetic seed)', href: '#/v25/exec', linkLabel: 'Open Executive intelligence', tech: [['Record', `field scan · completed ${f.completed}`]] });
    // what the room depends on, read from recorded edges (the same packet a technician sees)
    const pk = contextPacket(est, roomId);
    if (pk.switch || pk.power) push({ stage: 'operate', at: null, who: null, state: true, what: `Depends on ${[pk.switch, pk.uplink && `its uplink ${pk.uplink}`, pk.power && `power from ${pk.power}`].filter(Boolean).join(', ')}`, detail: pk.sharing.length ? `Shares the switch with ${pk.sharing.join(', ')}. Read from recorded relationships, not polled.` : 'Read from recorded relationships, not polled.', evidence: provEvidence(pk.provenance.switch || pk.provenance.power), source: 'synthetic estate graph (ServiceHands context packet)', href: `#/search?focus=${encodeURIComponent(`NetworkNode:${pk.switchId || ''}`)}`, linkLabel: 'Open the dependencies in Search Party',
      impact: pk.sharing.length ? `If ${pk.switch} fails, ${plural(pk.sharing.length + 1, 'room')} are affected, this one included.` : null,
      tech: [['Switch', `${pk.switch || '—'} · ${pk.provenance.switch || 'no edge'}`], ['Uplink', `${pk.uplink || '—'} · ${pk.provenance.uplink || 'no edge'}`], ['Power', `${pk.power || '—'} · ${pk.provenance.power || 'no edge'}`]] });
    else if (devEdges.length) gaps.push('Network and power behind this room: no switch, uplink or power relationship is recorded for its devices.');
    if (lifecycle === 'OPERATIONAL') gaps.push('The OPERATIONAL state shown for this room is declared by the synthetic seed; the commissioning engine itself moves a room to OPERATIONAL only with live monitoring evidence, which this demonstration never has.');
  }

  // ---------------------------------------------------------------- the service workspace: every room (records first; the ledger adds refusals)
  const incs = w.incidents.filter((i) => i.roomId === roomId);
  if (incs.length || w.workOrders.some((x) => x.roomId === roomId) || w.fiSessions.some((s) => s.roomId === roomId)) sources.push('service workspace (ServiceHands, APEX, Learn, Field Intelligence)');
  const verifiedIncident = (i: Incident) => !!i.verifiedBy && ['RESOLVED', 'CLOSED'].includes(i.state);
  for (const i of incs) {
    const sla = SLA[i.severity];
    push({ stage: 'operate', at: i.openedAt, who: who(i.history[0]?.by), what: `Incident ${i.id} reported: ${i.title}`, detail: i.summary, from: 'OPEN', to: i.state, why: i.recurrenceOf ? `recurrence of ${i.recurrenceOf}` : i.reopened ? 'reopened after a failed verification or a recurrence' : null,
      evidence: verifiedIncident(i) ? 'VERIFIED' : 'DECLARED', source: 'ServiceHands incidents', href: `#/v25/service?id=${i.id}`, linkLabel: `Open ${i.id} in ServiceHands`,
      impact: `${i.severity} · ${i.restoredAt ? `restored in ${hours(i.openedAt, i.restoredAt)}` : 'not restored yet'} · SLA restore ${sla.restore}${i.verifiedBy ? ` · repair verified by ${who(i.verifiedBy)}` : ''}`,
      tech: [['Incident', `${i.id} · ${i.severity} · ${i.state}`], ['Work order', i.workOrderId || '—'], ['APEX case', i.apexId || '—'], ['Learn case', i.learnCaseId || '—'], ['Verified by', i.verifiedBy ? who(i.verifiedBy)! : '—'], ['Requester confirmed', i.requesterConfirmed ? 'yes' : 'no']],
      items: i.history.map((h, n) => ({ id: `${i.id}:${n}`, text: n === 0 ? `${h.to}: reported` : `${i.history[n - 1]!.to} → ${h.to}${h.to === 'RESOLVED' && i.verifiedBy ? ' (independent verification: the retest)' : ''}`, at: h.at, who: who(h.by), evidence: (h.to === 'RESOLVED' && i.verifiedBy ? 'VERIFIED' : 'DECLARED') as Evidence })) });
    if (!['CLOSED', 'CANCELLED'].includes(i.state)) open.push({ text: `Incident ${i.id} ${i.state} · ${i.title}`, href: `#/v25/service?id=${i.id}` });
  }
  for (const x of w.workOrders.filter((y) => y.roomId === roomId)) {
    const tech = w.staff.find((s) => s.id === x.techId);
    push({ stage: 'operate', at: x.openedAt, who: null, what: `Work order ${x.id}: ${x.title}`, to: x.state, detail: tech ? `Assigned to ${tech.name}.` : 'Not assigned yet.', evidence: 'DECLARED', source: 'ServiceHands work orders', href: `#/v25/service?id=${x.incidentId}`, linkLabel: `Open ${x.id} in ServiceHands`,
      impact: `${x.state}${x.evidence.length ? ` · ${plural(x.evidence.length, 'field evidence record')}` : ''}`,
      tech: [['Work order', `${x.id} · ${x.workType.replace(/_/g, ' ')} · ${x.state}`], ['Incident', x.incidentId], ['Window', x.window ? `${x.window.from} → ${x.window.to}` : '—'], ['Parts', x.parts.map((p) => `${p.qty} × ${p.part}`).join(', ') || '—'], ['Tools confirmed', x.toolsConfirmed.join(', ') || '—']],
      items: [...x.evidence.map((e, n) => ({ id: `${x.id}:ev${n}`, text: `Field evidence (${e.kind}): ${e.note}`, at: e.at, who: who(e.by), evidence: 'DECLARED' as Evidence })), ...(x.preflight || []).map((c) => ({ id: `${x.id}:pf:${c.id}`, text: `Preflight · ${c.label}: ${c.ok ? 'ok' : `blocked — ${c.why}`}`, evidence: 'DERIVED' as Evidence }))] });
    if (!['DONE', 'CANCELLED'].includes(x.state)) open.push({ text: `Work order ${x.id} ${x.state}`, href: `#/v25/service?id=${x.incidentId}` });
  }
  for (const c of w.apexCases.filter((y) => y.roomId === roomId)) {
    const opened = w.events.find((e) => e.type === 'apex.opened' && e.aggregate === c.id); const h = c.hypotheses[0];
    push({ stage: 'operate', at: c.openedAt, who: who(opened?.by), what: `APEX diagnosis ${c.id}: ${plural(c.hypotheses.length, 'ranked hypothesis', 'ranked hypotheses')} for ${c.incidentId}`, detail: h ? `Leading: ${h.text} (${h.confidence}) — not proven: ${h.caveat}` : null, evidence: 'MODELED', source: 'APEX cases', href: `#/v25/apex?case=${c.id}`, linkLabel: `Open ${c.id} in APEX`,
      impact: `${plural(c.actions.length, 'bounded action')}${c.reviewed ? ` · reviewed by ${who(c.reviewed.by)}` : ' · not reviewed yet'}`,
      tech: [['Branch', c.key], ['Layers cited', c.layers.filter((l) => l.cites.length).map((l) => `${l.label}: ${l.cites.join(', ')}`).join('; ') || 'none']],
      items: [...[...c.actions].reverse().map((x, n) => ({ id: `${c.id}:a${n}`, text: `${x.tier} ${x.outcome}${x.simulated ? ' · SIMULATED' : ''}: ${x.detail.slice(0, 160)}`, at: x.at, who: who(x.by), evidence: (x.simulated ? 'SIMULATED' : 'DERIVED') as Evidence })), ...(c.reviewed ? [{ id: `${c.id}:rev`, text: `Diagnosis reviewed: ${c.reviewed.verdict}`, at: c.reviewed.at, who: who(c.reviewed.by), evidence: 'DECLARED' as Evidence }] : [])] });
    if (!c.reviewed) open.push({ text: `APEX diagnosis ${c.id} not reviewed yet`, href: `#/v25/apex?case=${c.id}` });
  }
  for (const s of w.fiSessions.filter((y) => y.roomId === roomId)) {
    const first = s.log[0];
    push({ stage: 'verify', at: first?.at || null, who: who(first?.by), what: `Physical Validation session ${s.id}: ${s.state}${s.terminal ? ' (ended)' : ''}`, detail: s.exits.length ? `${s.exits[s.exits.length - 1]!.exit}: ${s.exits[s.exits.length - 1]!.why}` : s.simulated ? 'A labelled simulation in this build: no adapter, no hardware, no measured value.' : null, evidence: s.simulated && s.state !== 'DRAFT' ? 'SIMULATED' : 'DECLARED', source: 'Field Intelligence sessions', href: `#/v25/fipv?room=${roomId}`, linkLabel: 'Open Field Intelligence',
      tech: [['Tests', s.tests.map((t) => `${t.id} (${t.adapter}${t.state ? ` · ${t.state}` : ''})`).join(', ')], ['Instrument', s.instrument ? `${s.instrument.model} ${s.instrument.serial} · calibration ${s.instrument.calibrationId} due ${s.instrument.calibrationDue}` : 'none registered'], ['Results', s.results.length ? s.results.map((r) => `${r.point} ${r.test} ${r.outcome} ${r.value === null ? 'null' : r.value} ${r.unit}`).join('; ') : 'none']],
      items: s.log.map((l, n) => ({ id: `${s.id}:${n}`, text: `${l.state}: ${l.text}`, at: l.at, who: who(l.by), evidence: (s.simulated && l.state !== 'DRAFT' ? 'SIMULATED' : 'DECLARED') as Evidence })) });
    if (!s.terminal && s.state !== 'ACQUIRED') open.push({ text: `Physical Validation session ${s.id} ${s.state}`, href: `#/v25/fipv?room=${roomId}` });
  }
  for (const c of w.learnCases.filter((y) => incs.some((i) => i.id === y.incidentId))) {
    push({ stage: 'learn', at: c.proposedAt, who: who(c.proposedBy), what: `Learn case ${c.id} proposed: “${c.title}”`, detail: c.lesson, to: c.state, why: `written from ${c.incidentId}${c.apexId ? ` and APEX ${c.apexId}` : ''}, with customer permission and de-identified`, evidence: 'DECLARED', source: 'Learn cases', href: `#/v25/learn?case=${c.id}`, linkLabel: `Open ${c.id} in Learn`,
      impact: `${c.state}${c.approvedBy ? ` · approved for Learn by ${who(c.approvedBy)}` : ''} · it grants nobody any authority`,
      tech: [['Case', `${c.id} · ${c.state}`], ['Source', `${c.incidentId}${c.apexId ? ` · ${c.apexId}` : ''}`], ['Permission', c.permission ? `recorded by ${who(c.permission.by)}` : 'not obtained']],
      items: [...(c.smeReview ? [{ id: `${c.id}:sme`, text: `SME review: ${c.smeReview.decision}${c.smeReview.note ? ` — ${c.smeReview.note}` : ''}`, at: c.smeReview.at, who: who(c.smeReview.by), evidence: 'DECLARED' as Evidence }] : []), ...(c.approvedBy ? [{ id: `${c.id}:ok`, text: 'Approved for Learn (training.case_approved)', who: who(c.approvedBy), evidence: 'DECLARED' as Evidence }] : [])] });
    if (c.state === 'PROPOSED' || c.state === 'SME_REVIEWED') open.push({ text: `Learn case ${c.id} awaiting ${c.state === 'PROPOSED' ? 'SME review' : "the steward's approval"}`, href: `#/v25/learn?case=${c.id}` });
  }
  // refusals in the workspace ledger for this room's records (allowed actions are already in the records above)
  const agg = roomAggregates(w, roomId);
  const ledger = w.events.filter((e) => agg.has(e.aggregate));
  for (const e of ledger.filter((x) => x.outcome === 'DENIED')) {
    const stage: StageKey = /^(learn|training)\./.test(e.type) ? 'learn' : /^fipv\./.test(e.type) ? 'verify' : 'operate';
    push({ stage, at: e.at, who: who(e.by), what: `${e.type} refused on ${e.aggregate}`, why: e.detail.replace(/^refused: /, ''), evidence: 'DERIVED', outcome: 'DENIED', source: 'workspace ledger', href: `#/v25/ledger?room=${roomId}`, linkLabel: 'Open the room’s ledger', tech: [['Event', e.type], ['Record', e.aggregate]] });
  }
  // what Search Party can and cannot say about ownership and support (asked, never inferred)
  const owner = ask(ctx, 'Who is responsible for this room?', ref); const vendor = ask(ctx, 'Which vendor supports this system?', ref);
  if (owner.status === 'ANSWERED') push({ stage: 'operate', at: null, who: null, state: true, what: owner.summary, evidence: owner.confidence === 'OBSERVED' ? 'DECLARED' : 'DERIVED', source: 'Search Party', href: `#/search?focus=${encodeURIComponent(nodeKey(ref))}`, linkLabel: 'Open in Search Party', tech: owner.items.map((x) => [x.via || '', `${x.label} · ${x.provenance}`] as [string, string]) });
  else gaps.push(`Who owns and supports this room: ${owner.summary} ${vendor.status === 'ANSWERED' ? '' : vendor.summary} Search Party answers UNKNOWN rather than infer an owner or a manufacturer.`.replace(/\s+/g, ' ').trim());
  // service coverage on record: the people whose recorded sites include this room's building (eligibility is decided per job by hard gates)
  const bKey = bEdge?.to.id || null;
  const cover = bKey ? w.staff.filter((s) => s.sites.includes(bKey) || s.sites.includes('*')) : [];
  if (cover.length) push({ stage: 'operate', at: null, who: null, state: true, what: `Service coverage on record: ${cover.map((s) => s.name).join(', ')}`, detail: `People whose recorded sites include ${room.building}. Who may take a given job is decided per work order by hard gates (certifications, site access, availability, capacity, vendor agreement).`, evidence: 'DECLARED', source: 'ServiceHands service pool', href: '#/v25/service', linkLabel: 'Open ServiceHands',
    tech: cover.map((s) => [s.name, `${s.internal ? 'internal' : `vendor ${s.orgName || ''}${s.agreement ? `, agreement ${s.agreement.id} (${s.agreement.status}, ${s.agreement.domains.join('/')})` : ''}`} · sites ${s.sites.join(', ')}`] as [string, string]) });
  // what this demonstration does not model at all, for any room
  gaps.push('Installation itself — who installed what, serial numbers, as-built drawings: the demonstration models the INSTALLED_UNVERIFIED step, not the installation record.');
  gaps.push('The room’s live condition: no monitoring feed or telemetry is connected to this demonstration, so its current health is unknown — not good.');
  gaps.push('Handoff documents and their history: Mission Control counts document states, but no dated document record is kept per room.');
  if (w.fiSessions.some((s) => s.roomId === roomId)) gaps.push('Measured acoustic or camera performance: Physical Validation runs here as a labelled simulation; no instrument export exists, so no measured value is shown.');
  if (!isDraft && est.edges.some((e) => e.rel === 'BELONGS_TO' && nodeKey(e.from) === nodeKey(ref))) gaps.push('What this room cost: funding is recorded per project, not per room.');

  // ---------------------------------------------------------------- order: within a stage, records without a time first (states), then by time
  const stages = STAGES.map((s) => ({ key: s.key, label: s.label, empty: s.empty, entries: entries.filter((e) => e.stage === s.key).sort((x, y) => (x.at === y.at ? 0 : x.at === null ? -1 : y.at === null ? 1 : x.at < y.at ? -1 : 1)) }));
  const tally = new Map<Evidence, number>(); for (const e of entries) tally.set(e.evidence, (tally.get(e.evidence) || 0) + 1);
  const ORDER: Evidence[] = ['PASS_VERIFIED', 'VERIFIED', 'OBSERVED', 'DERIVED', 'DECLARED', 'MODELED', 'SIMULATED', 'PASS_UNVERIFIED', 'FAIL', 'INCONCLUSIVE', 'NOT_SUPPORTED', 'NOT_TESTED', 'UNKNOWN'];
  return {
    roomId, found: true, kind: isDraft ? 'draft' : 'estate', room,
    summary: { state, baseline, open, stagesWithRecords: stages.filter((s) => s.entries.length).length, stageCount: STAGES.length, entries: entries.length, ledgerEvents: ledger.length + (isDraft ? draft!.events.length : 0),
      evidence: ORDER.filter((k) => tally.has(k)).map((k) => [k, tally.get(k)!] as [Evidence, number]), tests },
    stages, gaps, sources,
  };
}

/** How much a perspective shows (never what): the narrative, the technical detail, or impact and status. A perspective grants nothing. */
export type Density = 'narrative' | 'technical' | 'impact';
export function densityOf(perspective: string): Density {
  if (['exec', 'bpm', 'ipm', 'ops'].includes(perspective)) return 'impact';
  if (['syseng', 'designer', 'installer', 'cxeng', 'architect', 'qa', 'service', 'svcmgr', 'steward'].includes(perspective)) return 'technical';
  return 'narrative';
}
