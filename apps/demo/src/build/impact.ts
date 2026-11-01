/**
 * The living-room cascade: what one change to a Build a Room draft does to the rest of the platform, computed by the engines from the
 * draft before and after the change — nothing here is a hand-written consequence.
 *   - Commissioning (@empathia/commissioning-engine): the applicability engine re-run on both designs; tests added, removed and kept, each
 *     with the engine's own reason; tests whose covered devices changed; design findings raised or resolved; the next lifecycle gate (the
 *     store's lifecycle conditions: the engine's gates and, for a re-acceptance, the tests a substitution reopened). A swap while an
 *     accepted room is recommissioned reopens tests by the engine's `reopenedBySubstitution` (the rule the enterprise API runs), each
 *     with one reason per substitution; their earlier results stay on record and no longer count.
 *   - Search Party (@empathia/search-party on the estate graph): the relationships of each device the change added or removed, and what
 *     depends on it downstream; a device that is not in the recorded graph is said to be absent, not guessed.
 *   - Assurance (@empathia/assurance-engine): with an accepted baseline, the room assessed against it (device presence); the baseline itself
 *     is compared byte for byte before and after and is never modified. Without one, it says there is nothing to compare.
 *   - Pro and Mission Control (@empathia/kpi-engine + the station counts): every passport and station recomputed on both states at one
 *     instant; only those that differ are listed — when none differ, the list is empty.
 * Pure: no React, no storage. The workspace is read, never written.
 */
import { ROOM_LIFECYCLE, type ApplicabilityRow, type DesignFinding, type PlannedDevice, type RoomLifecycle } from '@empathia/domain-types';
import { ENGINE_VERSION, DRAWING_KINDS } from '@empathia/commissioning-engine';
import { assess, STATUS_TEXT, type Baseline as AssuranceBaseline, type Status } from '@empathia/assurance-engine';
import { impact as downstream, nodeKey, RELATIONS, type NodeRef } from '@empathia/search-party';
import { passports, type Passport } from '@empathia/kpi-engine';
import * as S from './store.js';
import { buildEstate, type Estate } from '../search/estate.js';
import { assemble, stationCounts } from '../workspace/records.js';
import type { Workspace } from '../workspace/store.js';

export interface TestDelta { id: string; label: string; reason: string; status: string }
export interface CoverageChange { id: string; label: string; from: string[]; to: string[]; recordedBefore: boolean; result: string; reopened: boolean }
/** A test this change reopened (a substitution while the accepted room is recommissioned): the engine's reasons and the result on record. */
export interface Reopened { id: string; label: string; assets: string[]; reasons: string[]; result: string; rerun: boolean }
export interface GraphDevice { id: string; label: string; state: 'added' | 'removed'; inGraph: boolean; why: string; key: string; href: string; relationships: Array<{ rel: string; other: string; provenance: string }>; dependents: string[] }
export interface Impact {
  at: string; room: string; roomName: string; by: string;
  change: { type: string; what: string; from: string | null; to: string | null; why: string };
  commissioning: {
    engineVersion: string; applicable: [number, number]; library: number;
    added: TestDelta[]; removed: TestDelta[]; kept: TestDelta[];
    statusChanged: Array<{ id: string; label: string; from: string; to: string; missing: string[] }>;
    coverageChanged: CoverageChange[];
    /** the tests this change reopened, and how many reopened tests are still to re-run and verify against the current baseline */
    reopened: Reopened[]; reverification: { total: number; outstanding: number; baseline: number | null };
    findings: { raised: DesignFinding[]; resolved: DesignFinding[] };
    gate: { from: string; to: string | null; before: string[]; after: string[] };
  };
  search: GraphDevice[];
  assurance: { baseline: { version: number; state: string; at: string; by: string; revision: number | null; devices: number } | null; untouched: boolean; presence: { before: Status; after: Status; beforeText: string; afterText: string; current: string; evidence: string; fix: string | null } | null; added: string[]; removed: string[] };
  kpis: Array<{ id: string; label: string; from: string; to: string }>;
  stations: Array<{ key: string; label: string; from: number; to: number; href: string }>;
  design: { drawings: Array<{ kind: string; label: string; from: string; to: string }>; classification: { from: string; to: string } | null };
}

const live = (d: S.Draft) => (S.live(d.design.devices) as PlannedDevice[]);
const devLabel = (d: S.Draft, id: string) => { const x = d.design.devices.find((v) => v.id === id); return x ? `${x.label} (${id})` : id; };
const same = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x) => b.includes(x));
const fmtPassport = (p: Passport) => (p.state === 'NOT_MEASURABLE' ? 'not measurable' : p.byCurrency ? Object.entries(p.byCurrency).map(([c, v]) => `${v.toLocaleString('en-US')} ${c}`).join(' · ') : `${p.value}${p.unit === '%' ? '%' : ` ${p.unit}`} (${p.numerator} / ${p.denominator})`) + ` · ${p.confidence.level} confidence`;
const gateFacts = (d: S.Draft, a: ReturnType<typeof S.analysis>, to: RoomLifecycle) => S.lifecycleConditions(d, to, a);
const classificationState = (d: S.Draft) => { const ap = d.design.classification.approved; return ap ? (ap.stale ? `approved ${ap.archetype}, stale` : `approved ${ap.archetype}`) : 'not approved'; };

/** The device ids a change added and removed (live in one state and not the other). */
export function deviceDelta(before: S.Draft, after: S.Draft) {
  const b = new Set(live(before).map((x) => x.id)), a = new Set(live(after).map((x) => x.id));
  return { added: live(after).filter((x) => !b.has(x.id)), removed: live(before).filter((x) => !a.has(x.id)) };
}

/** The applicability delta of two analyses, with the engine's reasons (a test that no longer applies carries the engine's justification). */
export function commissioningDelta(before: S.Draft, after: S.Draft) {
  const A0 = S.analysis(before), A1 = S.analysis(after);
  const r0 = new Map(A0.applicability.rows.map((r) => [r.id, r] as const)), r1 = new Map(A1.applicability.rows.map((r) => [r.id, r] as const));
  const why = (r: ApplicabilityRow | undefined) => (r ? (r.applicable ? r.why.join('; ') : r.justification || '') : '');
  const added = A1.applicability.rows.filter((r) => r.applicable && !r0.get(r.id)?.applicable).map((r) => ({ id: r.id, label: r.label, reason: why(r), status: r.status }));
  const removed = A0.applicability.rows.filter((r) => r.applicable && !r1.get(r.id)?.applicable).map((r) => ({ id: r.id, label: r.label, reason: why(r1.get(r.id)) || 'no longer in the library judgement', status: r1.get(r.id)?.status || 'NOT_APPLICABLE' }));
  const both = A1.applicability.rows.filter((r) => r.applicable && r0.get(r.id)?.applicable);
  const kept = both.map((r) => ({ id: r.id, label: r.label, reason: why(r), status: r.status }));
  const statusChanged = both.filter((r) => r0.get(r.id)!.status !== r.status).map((r) => ({ id: r.id, label: r.label, from: r0.get(r.id)!.status, to: r.status, missing: r.missing || [] }));
  const res = S.results(after);
  // re-verification after a substitution: the tests this change reopened (more reasons than before it), from the store's record of it
  const rv0 = new Map(S.reverification(before, A0).map((t) => [t.testId, t] as const)); const rv1 = S.reverification(after, A1);
  const stale = new Set(rv1.filter((t) => t.rerun).map((t) => t.testId));
  const reopened = rv1.filter((t) => t.reasons.length > (rv0.get(t.testId)?.reasons.length || 0)).map((t) => ({ id: t.testId, label: t.label, assets: t.assets, reasons: t.reasons, result: t.result, rerun: t.rerun }));
  const coverageChanged = both.filter((r) => !same(r0.get(r.id)!.devices, r.devices)).map((r) => ({ id: r.id, label: r.label, from: (r0.get(r.id)!.devices || []).map((x) => devLabel(before, x)), to: (r.devices || []).map((x) => devLabel(after, x)), recordedBefore: !!res[r.id], result: r.result || 'NOT_TESTED', reopened: stale.has(r.id) }));
  const k0 = new Set(A0.checks.map((c) => c.key)), k1 = new Set(A1.checks.map((c) => c.key));
  return { A0, A1, added, removed, kept, statusChanged, coverageChanged, reopened, reverification: { total: rv1.length, outstanding: stale.size, baseline: S.recommissioningBaseline(after)?.version ?? null }, findings: { raised: A1.checks.filter((c) => !k0.has(c.key)), resolved: A0.checks.filter((c) => !k1.has(c.key)) } };
}

function graphDevice(est: Estate, d: S.Draft, x: PlannedDevice, state: 'added' | 'removed'): GraphDevice {
  const ref: NodeRef = { type: 'PlannedAsset', id: `${d.code}/${x.id}` }; const key = nodeKey(ref);
  const byKey = new Map(est.nodes.map((n) => [nodeKey(n), n] as const));
  const label = (n: NodeRef) => byKey.get(nodeKey(n))?.label || n.id;
  const href = `#/search?focus=${encodeURIComponent(key)}`;
  if (!byKey.has(key)) return { id: x.id, label: `${x.label} (${x.cat})`, state, inGraph: false, why: x.furniture ? 'furniture is not part of the recorded relationship graph' : 'not in the recorded graph', key, href: '#/search', relationships: [], dependents: [] };
  const relationships = [
    ...est.graph.outgoing(ref).map((e) => ({ rel: RELATIONS[e.rel]?.[0] || e.rel, other: label(e.to), provenance: e.provenance })),
    ...est.graph.incoming(ref).map((e) => ({ rel: RELATIONS[e.rel]?.[1] || e.rel, other: label(e.from), provenance: e.provenance })),
  ];
  const dependents = downstream(est.graph, ref, ['FEEDS', 'CONNECTS_TO', 'UPLINKS_TO', 'POWERED_BY', 'CONTROLS']).map(label);
  return { id: x.id, label: `${x.label} (${x.cat})`, state, inGraph: true, why: '', key, href, relationships, dependents };
}

/** Compute the cascade of one change. `before` and `after` are the whole draft on either side of it; `w` is read only. */
export function computeImpact(before: S.Draft, after: S.Draft, w: Workspace, at: number = Date.now()): Impact {
  const ev = after.events[0];
  const cx = commissioningDelta(before, after);
  const lc = after.design.lifecycle as RoomLifecycle; const next = ROOM_LIFECYCLE[ROOM_LIFECYCLE.indexOf(lc) + 1] as RoomLifecycle | undefined;
  // Search Party: the estate graph with the draft merged in, on either side of the change
  const est0 = buildEstate(before), est1 = buildEstate(after);
  const dd = deviceDelta(before, after);
  const search = [...dd.removed.map((x) => graphDevice(est0, before, x, 'removed')), ...dd.added.map((x) => graphDevice(est1, after, x, 'added'))];
  // Assurance: the current accepted baseline, read and compared — never written
  const b = after.baseline;
  const untouched = JSON.stringify(before.baselines || []) === JSON.stringify(after.baselines || []) && JSON.stringify(before.baseline) === JSON.stringify(after.baseline);
  let presence: Impact['assurance']['presence'] = null; let added: string[] = []; let removed: string[] = [];
  if (b) {
    const base: AssuranceBaseline = { id: `${after.code}/v${b.version}`, version: b.version, signedAt: b.at, signedBy: b.by, devices: b.devices.map((x) => ({ id: x.id, category: x.cat, label: x.label })), layout: null, capacity: after.design.occupancy, configSignature: null, documents: [] };
    const facts = (d: S.Draft) => ({ now: new Date(at).toISOString(), devices: live(d).filter((x) => !x.furniture).map((x) => ({ id: x.id, category: x.cat, label: x.label, networked: !!S.C.categories[x.cat]?.net, state: null })) });
    const p0 = assess(base, facts(before)).rows.find((r) => r.k === 'presence')!; const p1 = assess(base, facts(after)).rows.find((r) => r.k === 'presence')!;
    presence = { before: p0.status, after: p1.status, beforeText: STATUS_TEXT[p0.status], afterText: STATUS_TEXT[p1.status], current: p1.current, evidence: p1.ev, fix: p1.fix ? `${p1.fix.label} (a proposal: needs ${p1.fix.approverAuthority})` : null };
    const ids = new Set(b.devices.map((x) => x.id)); const now = live(after).filter((x) => !x.furniture);
    added = now.filter((x) => !ids.has(x.id)).map((x) => `${x.label} (${x.id})`); removed = b.devices.filter((x) => !now.some((y) => y.id === x.id)).map((x) => `${x.label} (${x.id})`);
  }
  // Pro (Executive intelligence) and Mission Control: every derived figure, recomputed on both states at the same instant
  const R0 = assemble(w, before, at), R1 = assemble(w, after, at);
  const P0 = passports(R0), P1 = passports(R1);
  const kpis = P1.map((p, i) => ({ p, q: P0[i]! })).filter(({ p, q }) => p.value !== q.value || p.numerator !== q.numerator || p.denominator !== q.denominator || p.state !== q.state || p.confidence.level !== q.confidence.level).map(({ p, q }) => ({ id: p.id, label: p.label, from: fmtPassport(q), to: fmtPassport(p) }));
  const S0 = stationCounts(R0, w), S1 = stationCounts(R1, w);
  const stations = S1.map((s, i) => ({ s, t: S0[i]! })).filter(({ s, t }) => s.count !== t.count).map(({ s, t }) => ({ key: s.key, label: s.label, from: t.count, to: s.count, href: s.href }));
  // the design records the store keeps current: drawings whose input changed, a classification approval gone stale
  const drawings = Object.keys(DRAWING_KINDS).filter((k) => (before.drawings[k]?.state || 'DRAFT') !== (after.drawings[k]?.state || 'DRAFT')).map((k) => ({ kind: k, label: DRAWING_KINDS[k]!, from: before.drawings[k]?.state || 'DRAFT', to: after.drawings[k]?.state || 'DRAFT' }));
  const c0 = classificationState(before), c1 = classificationState(after);
  return {
    at: new Date(at).toISOString(), room: after.code, roomName: after.name, by: ev?.by || '',
    change: { type: ev?.type || '', what: ev?.change?.what || ev?.type || 'change', from: ev?.change?.from ?? null, to: ev?.change?.to ?? null, why: ev?.change?.why || '' },
    commissioning: { engineVersion: ENGINE_VERSION, applicable: [cx.A0.applicability.applicable, cx.A1.applicability.applicable], library: cx.A1.applicability.library, added: cx.added, removed: cx.removed, kept: cx.kept, statusChanged: cx.statusChanged, coverageChanged: cx.coverageChanged, reopened: cx.reopened, reverification: cx.reverification, findings: cx.findings,
      gate: { from: lc, to: next || null, before: next ? gateFacts(before, cx.A0, next) : [], after: next ? gateFacts(after, cx.A1, next) : [] } },
    search,
    assurance: { baseline: b ? { version: b.version, state: b.state, at: b.at, by: b.by, revision: b.revision, devices: b.devices.length } : null, untouched, presence, added, removed },
    kpis, stations,
    design: { drawings, classification: c0 !== c1 ? { from: c0, to: c1 } : null },
  };
}

/** The objects the engines found affected, for the change's ledger event (and so for the room's story). */
export function affectedOf(im: Impact): S.Affected[] {
  const out: S.Affected[] = [];
  for (const t of im.commissioning.added) out.push({ kind: 'test', id: t.id, label: t.label, effect: 'now applies', href: '#/v25/build?tab=checks' });
  for (const t of im.commissioning.removed) out.push({ kind: 'test', id: t.id, label: t.label, effect: 'no longer applies', href: '#/v25/build?tab=checks' });
  for (const t of im.commissioning.coverageChanged) out.push({ kind: 'test', id: t.id, label: t.label, effect: `now covers ${t.to.join(', ') || 'no device'}${t.recordedBefore ? ` (its result was recorded before the change${t.reopened ? ', on the previous device: reopened' : ''})` : ''}`, href: '#/v25/build?tab=checks' });
  if (im.assurance.baseline && im.assurance.presence && im.assurance.presence.after !== im.assurance.presence.before) out.push({ kind: 'baseline', id: `${im.room}/v${im.assurance.baseline.version}`, label: `baseline v${im.assurance.baseline.version}`, effect: `the room now differs from it (device presence: ${im.assurance.presence.afterText}); the baseline itself is unchanged`, href: '#/v25/build?tab=lifecycle' });
  for (const k of im.kpis) out.push({ kind: 'kpi', id: k.id, label: k.label, effect: `${k.from} → ${k.to}`, href: '#/v25/exec' });
  for (const s of im.stations) out.push({ kind: 'station', id: s.key, label: s.label, effect: `${s.from} → ${s.to}`, href: '#/v25' });
  for (const d of im.design.drawings) out.push({ kind: 'drawing', id: d.kind, label: d.label, effect: `${d.from} → ${d.to}`, href: '#/v25/build?tab=drawings' });
  if (im.design.classification) out.push({ kind: 'classification', id: 'classification', label: 'room classification', effect: `${im.design.classification.from} → ${im.design.classification.to}`, href: '#/v25/build?tab=design' });
  return out;
}

/** Append the engines' findings to the change event the store just logged (the newest event). */
export function attachImpact(after: S.Draft, im: Impact): void {
  const ev = after.events[0];
  if (ev?.change) ev.change.affected.push(...affectedOf(im));
}

/** One sentence for the screen reader (the panel's aria-live region). */
export function impactSentence(im: Impact): string {
  const c = im.commissioning; const what = im.change.from && im.change.to ? `${im.change.from} swapped for ${im.change.to}` : im.change.to ? `${im.change.to} added` : im.change.from ? `${im.change.from} removed` : im.change.what;
  const a = im.assurance.baseline ? (im.assurance.presence && im.assurance.presence.after !== 'unknown' ? `the room now differs from baseline v${im.assurance.baseline.version}, which is unchanged` : `baseline v${im.assurance.baseline.version} is unchanged`) : 'no accepted baseline to compare';
  return `${what}. Commissioning: ${c.added.length} test${c.added.length === 1 ? '' : 's'} added, ${c.removed.length} removed, ${c.kept.length} unchanged${c.reopened.length ? `; ${c.reopened.length} reopened by the substitution, to be re-run and verified again before re-acceptance` : ''}. Assurance: ${a}. ${im.kpis.length ? `${im.kpis.length} KPI passport${im.kpis.length === 1 ? '' : 's'} changed` : 'No KPI passport changed'}${im.stations.length ? `; ${im.stations.length} Mission Control count${im.stations.length === 1 ? '' : 's'} changed` : ''}.`;
}
