/**
 * The commissioning completion package of one room, as a Report (./model.ts): everything the record holds that an owner, an
 * integrator or an auditor needs to accept a room, in the order a commissioning engineer would hand it over. Every figure comes
 * from the room's record (campus/design.ts) through the same rules the page uses (campus/cxRecord.ts), so the PDF, Word, Excel,
 * PowerPoint, JSON and CSV files say exactly what #/commissioning/room/:id says.
 *
 * What it never does: invent a make, model or serial (devices are classes); call a connection traced (they are proposed by the
 * engine's rules); call a check measured (results are as recorded in a synthetic record); grant anything because of the role it was
 * made as.
 */
import { openIssues, PEOPLE, type RoomRecord } from '../campus/design.js';
import { SITE, buildingByKey, shortName, fullName } from '../campus/canon.js';
import { rowsOf, phaseStats, blockers, traceRows, res, ymd, accepted, cxState, CX_LABEL, VERDICT } from '../campus/cxRecord.js';
import type { Report, Section, Media, Link } from './model.js';
import { requiredFor, type DocsWorking } from '@empathia/proof-registry';
import { profileOf } from '../docs5/model.js';
import { roomHref } from '../campus/canon.js';
import { liteRoomHref } from '../lite/model.js';
import { planSvg } from './plan.js';
import { lifecycleSections, type LifecycleInput } from './lifecycle.js';
import { deviceRegister, retiredRegister, registerStats, roomRegister, type DeviceEntry } from '../campus/registers.js';

const who = (k?: string | null) => (k ? PEOPLE[k] || k.replace(/_/g, ' ') : '—');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface MadeBy { role: string; at: string; build: string }
/** What the page knows beyond the room record: the documentation tracker (only the dossier's room has one), the field captures that
 *  were synchronised into it, the photographs this browser still holds for them, and the address the links start from. */
export interface CxExtras {
  docs?: DocsWorking | null; report?: string | null;
  captures?: Array<{ key: string; target: { kind: 'test' | 'doc'; id: string }; note: string; measurements: Array<{ quantity: string; value: number; unit: string; instrument: string; method: string }>; photo: { name: string; bytes: number; sha256: string; annotated: boolean } | null; by: { label: string }; at: string }>;
  photos?: Array<{ key: string; name: string; mime: 'image/png' | 'image/jpeg'; bytes: Uint8Array; width: number; height: number; note: string; target: string; at: string; by: string }>;
  /** the room and device registers the installation team filled at the start of commissioning, and phase 1's install photographs */
  register?: { entries: Record<string, DeviceEntry>; photos: Array<{ which: 'before' | 'after'; mime: 'image/png' | 'image/jpeg'; bytes: Uint8Array; width: number; height: number; note: string; at: string; by: string }> };
  baseUrl?: string;
  /** the request, the decision desk and the workspace: the project from intake to service (export/lifecycle.ts) */
  lifecycle?: LifecycleInput;
}

export function cxPackage(r: RoomRecord, by: MadeBy, x: CxExtras = {}): Report {
  const o = r.outline; const b = buildingByKey(o.building); const rows = rowsOf(r); const app = rows.filter((x) => x.applicable);
  const ph = phaseStats(r); const bl = blockers(r); const tr = traceRows(r); const st = cxState(r); const S = CX_LABEL[st.state];
  const fw = r.positions.filter((p) => !p.furniture); const cur = r.baselines.find((x) => x.state === 'CURRENT'); const pend = r.baselines.find((x) => x.state === 'PENDING_ACCEPTANCE');
  const acc = accepted(r); const accEv = r.events.find((e) => /→ ACCEPTED/.test(e.detail) && e.outcome !== 'DENIED');
  const open = openIssues(r); const passedPhases = ph.filter((p) => p.verdict === 'pass').length;
  const unverified = app.filter((x) => x.result === 'PASS_UNVERIFIED').length;

  const decision: string[] = acc
    ? [`Accepted ${ymd(accEv?.at)}${accEv ? ` by ${who(accEv.by)}` : ''}; baseline ${cur ? `v${cur.version} is current` : 'not on record (earlier record)'}.`, ...(open.length ? [`${plural(open.length, 'deficiency is', 'deficiencies are')} open after acceptance: ${open.map((i) => i.title).join('; ')}.`] : ['No deficiency is open.'])]
    : bl.blocked
      ? [...(bl.critical.length ? [`A critical deficiency is open (${bl.critical.length}): ${bl.critical.map((i) => i.title).join('; ')}.`] : []),
        ...(bl.missing.length ? [`Required evidence is missing for ${plural(bl.missing.length, 'check')}: ${bl.missing.slice(0, 4).map((x) => x.label).join('; ')}${bl.missing.length > 4 ? `; and ${bl.missing.length - 4} more` : ''}.`] : []),
        ...(bl.must.length ? [`A must-have requirement is not met: ${bl.must.map((x) => x.label).join('; ')}.`] : []),
        'Acceptance cannot be given until each of these is cleared. Anything else that is open would make it an acceptance with exceptions.']
      : ['Everything that is open is an exception: acceptance with exceptions is possible once an independent engineer signs.'];
  if (r.exception) decision.push(`${r.exception.id}: an exception (${r.exception.waivability}) is requested for ${r.exception.requirement}. It waits for an independent reviewer and expires ${ymd(r.exception.expiry)}. A waiver never bypasses safety, security or evidence integrity.`);

  const sections: Section[] = [
    { id: 'decision', heading: 'Acceptance decision', text: [`${S.label}: ${st.why}.`], bullets: decision },
    { id: 'scope', heading: 'Project and scope', facts: [
      ['Room', `${fullName(o)} (${o.id})`], ['Building', `${b?.name || o.building}, floor ${o.floor}`], ['Site', `${SITE.name} · ${SITE.enterprise}`],
      ['Room type', r.archetypeName], ['Seats', String(o.capacity)], ['Size', `${o.dims[0]} × ${o.dims[1]} m, ceiling ${o.dims[2]} m (${o.kind === 'reference' ? 'from the design record' : 'modelled'})`],
      ['What the room is for', o.intent], ['Lifecycle', r.lifecycle.replace(/_/g, ' ').toLowerCase()],
      ['Next step', r.nextStep ? `${r.nextStep.to.replace(/_/g, ' ').toLowerCase()}${r.nextStep.blockers.length ? `: refused while ${r.nextStep.blockers.join('; ')}` : ''}` : 'none: the record ends here'],
      ['Geometry', r.geometryProvenance], ['Source', o.source]] },
    { id: 'phases', heading: 'Five phases', text: ['Each phase asks one question of the room. A phase passes only when every applicable check in it is recorded and independently verified.'],
      table: { title: 'Phases', cols: [{ key: 'n', label: '#', kind: 'number' }, { key: 'phase', label: 'Phase' }, { key: 'q', label: 'Question' }, { key: 'checks', label: 'Checks', kind: 'number' }, { key: 'pass', label: 'Passed', kind: 'number' }, { key: 'fail', label: 'Failed', kind: 'number' }, { key: 'run', label: 'Recorded', kind: 'number' }, { key: 'verdict', label: 'Verdict', kind: 'status' }],
        rows: ph.map((p) => ({ n: p.n, phase: p.name, q: p.q, checks: p.rows.length, pass: p.pass, fail: p.fail, run: p.run, verdict: VERDICT[p.verdict]! })) } },
    { id: 'tests', heading: 'Test register', text: [`${app.length} of the ${rows.length} checks in the library apply to this room's equipment. The person who recorded a check never verifies it.`],
      table: { title: 'Test register', note: 'Results as recorded in a synthetic record: nothing was measured and no device was contacted.', cols: [{ key: 'id', label: 'Check' }, { key: 'label', label: 'Description' }, { key: 'phase', label: 'Phase', kind: 'number' }, { key: 'domain', label: 'Domain' }, { key: 'pack', label: 'Pack' }, { key: 'tier', label: 'Tier', kind: 'number' }, { key: 'result', label: 'Result', kind: 'status' }, { key: 'verifier', label: 'Verified by' }, { key: 'evidence', label: 'Evidence' }],
        rows: app.map((x) => ({ id: x.id, label: x.label, phase: x.phase, domain: x.domain, pack: x.pack || '', tier: x.tier, result: res(x.result).label, verifier: x.verifier ? x.verifier.replace(/_/g, ' ') : 'an independent person', evidence: [...(x.evidence || []).map((e) => e.replace(/_/g, ' ').toLowerCase()), ...(x.instrument ? ['instrument'] : [])].join(', ') })) } },
    { id: 'trace', heading: 'Traceability', text: ['Requirement → design → check → evidence → result: one row per requirement of the room type.'],
      table: { title: 'Traceability', cols: [{ key: 'req', label: 'Requirement' }, { key: 'prio', label: 'Priority' }, { key: 'design', label: 'Design positions' }, { key: 'checks', label: 'Checks' }, { key: 'evidence', label: 'Evidence' }, { key: 'result', label: 'Result', kind: 'status' }],
        rows: tr.map((t) => ({ req: `${t.domain}: ${t.requirement}`, prio: t.priority, design: t.design.length ? `${t.design.length}: ${t.design.slice(0, 4).map((p) => p.code).join(', ')}${t.design.length > 4 ? '…' : ''}` : 'none in the design', checks: `${t.checks.length} (${t.checks.filter((c) => c.result === 'PASS_VERIFIED').length} pass)`, evidence: t.evidence.map((e) => e.replace(/_/g, ' ').toLowerCase()).join(', ') || 'none recorded', result: t.result === 'FAIL' ? `Fail: ${t.fail!.label}` : t.result === 'PROVEN' ? 'Proven' : `Not yet proven: ${t.notRun[0]?.label || 'awaiting verification'}` })) } },
    { id: 'deficiencies', heading: 'Deficiencies', text: r.exception ? [`${r.exception.id} · exception requested (${r.exception.waivability}) for ${r.exception.requirement}: ${r.exception.rationale}`] : undefined,
      table: { title: 'Deficiencies', cols: [{ key: 'id', label: 'ID' }, { key: 'title', label: 'Deficiency' }, { key: 'sev', label: 'Severity' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'pos', label: 'Positions' }, { key: 'src', label: 'Source' }],
        rows: r.issues.map((i) => ({ id: i.id, title: i.title, sev: i.severity, state: i.state === 'RESOLVED' ? 'Closed' : i.state === 'PENDING_APPROVAL' ? 'Pending approval' : i.severity === 'High' ? 'Open · high' : 'Open', pos: i.positions.join(', ') || 'the room', src: i.source })) } },
    { id: 'findings', heading: 'Design findings', table: { title: 'Design findings', cols: [{ key: 'check', label: 'Check' }, { key: 'title', label: 'Finding' }, { key: 'sev', label: 'Severity' }, { key: 'why', label: 'Rationale' }], rows: r.findings.map((f) => ({ check: f.check, title: f.title, sev: f.severity, why: f.rationale })) } },
    { id: 'assets', heading: 'Asset inventory', text: ['Devices are recorded as classes of device. No make, model or serial number is invented; identity says how far each unit is known.'],
      table: { title: 'Asset inventory', cols: [{ key: 'code', label: 'Position' }, { key: 'label', label: 'Device' }, { key: 'cat', label: 'Category' }, { key: 'layer', label: 'Layer' }, { key: 'mount', label: 'Mount' }, { key: 'asset', label: 'Asset' }, { key: 'identity', label: 'Identity', kind: 'status' }, { key: 'prov', label: 'Provenance' }],
        rows: fw.map((p) => ({ code: p.code, label: p.label, cat: p.catLabel, layer: p.layer, mount: p.mount, asset: p.asset || '—', identity: p.identity.charAt(0) + p.identity.slice(1).toLowerCase(), prov: p.provenance })) } },
    ...((): Section[] => { const reg = deviceRegister(r, x.register?.entries || {}); const st = registerStats(reg); const ret = retiredRegister(r);
      return [
        { id: 'room-register', heading: 'Room register', text: ['Where commissioning starts: every phase is keyed by the room ID. Read from the record.'], facts: roomRegister(r) },
        { id: 'device-register', heading: 'Device register', text: [`${st.done} of ${st.total} devices registered by the installation team (${st.pct}%); ${st.netDone} of ${st.networked} networked devices with a hostname and an address. The device ID is the position and the asset ID the unit installed there, both from the record; serials, hostnames, addresses and firmware are what the installation team read on site (synthetic values in this demonstration).`],
          table: { title: 'Device register', cols: [{ key: 'device', label: 'Device' }, { key: 'asset', label: 'Asset ID' }, { key: 'what', label: 'Device class' }, { key: 'serial', label: 'Serial' }, { key: 'host', label: 'Hostname' }, { key: 'ip', label: 'IP address' }, { key: 'fw', label: 'Firmware' }, { key: 'loc', label: 'Location' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'by', label: 'Recorded by' }],
            rows: reg.map((d) => ({ device: d.device, asset: d.asset || '—', what: d.category, serial: d.entry?.serial || '', host: d.networked ? d.entry?.hostname || '' : 'n/a', ip: d.networked ? d.entry?.ip || '' : 'n/a', fw: d.entry?.firmware || '', loc: d.entry?.location || d.mount, state: d.complete ? 'Registered' : `Needs ${d.missing.join(', ')}`, by: d.entry ? `${who(d.entry.by)} ${d.entry.at.slice(0, 10)}` : '' })) } },
        { id: 'retired-register', heading: 'Retired register', text: ['A unit taken out of a position leaves the inventory; its asset ID is never issued again and its history stays on record.'],
          table: { title: 'Retired units', cols: [{ key: 'asset', label: 'Asset ID' }, { key: 'device', label: 'Device' }, { key: 'in', label: 'Installed', kind: 'date' }, { key: 'out', label: 'Retired', kind: 'date' }, { key: 'reason', label: 'Reason' }, { key: 'by', label: 'Replaced by' }],
            rows: ret.map((t) => ({ asset: t.asset, device: `${t.label} (${t.device})`, in: t.installedAt.slice(0, 10), out: t.retiredAt.slice(0, 10), reason: t.reason.toLowerCase(), by: t.replacedBy || '' })) } },
      ]; })(),
    { id: 'connections', heading: 'Connections', table: { title: 'Connections', note: 'Proposed by the engine’s rules from the design: modelled, not traced.', cols: [{ key: 'id', label: 'ID' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'kind', label: 'Kind' }, { key: 'why', label: 'Why' }], rows: r.connections.filter((c) => !c.removed).map((c) => ({ id: c.id, from: c.from, to: c.to, kind: String(c.kind), why: c.why || '' })) } },
    { id: 'installations', heading: 'Installation record', table: { title: 'Installations', cols: [{ key: 'pos', label: 'Position' }, { key: 'asset', label: 'Asset' }, { key: 'in', label: 'Installed', kind: 'date' }, { key: 'out', label: 'Removed', kind: 'date' }, { key: 'reason', label: 'Reason' }, { key: 'basis', label: 'Basis' }, { key: 'by', label: 'By' }],
      rows: r.installations.map((i) => ({ pos: i.position, asset: i.asset, in: ymd(i.installedAt), out: i.removedAt ? ymd(i.removedAt) : '', reason: i.removalReason ? `${i.reason}; removed: ${i.removalReason}` : i.reason, basis: i.basis, by: who(i.by) })) } },
    { id: 'documentation', heading: 'Documentation coverage', table: { title: 'Documentation', cols: [{ key: 'area', label: 'Area' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'note', label: 'Note' }], rows: r.coverage.map((c) => ({ area: c.area, state: c.state === 'complete' ? 'Complete' : c.state === 'gap' ? 'Gap' : c.state === 'modeled' ? 'Modelled' : 'Recorded', note: c.note })) } },
    { id: 'signoff', heading: 'Approvals and sign-off', text: ['Acceptance is blocked by a critical deficiency, by required evidence that is missing, or by a must-have requirement that is not met. Two roles may give the technical sign-off: a commissioning engineer or a systems engineer who did not run the checks. No one approves their own work.'],
      facts: [['1 · Technical sign-off', acc ? `Signed ${ymd(accEv?.at)}${accEv ? ` by ${who(accEv.by)}` : ''}` : 'Not signed'], ['2 · Owner’s acceptance', acc ? 'Accepted; baseline published' : 'Waiting for the technical sign-off'], ['Exception', r.exception ? `${r.exception.id}: pending an independent reviewer` : 'none requested']] },
    { id: 'baselines', heading: 'Baseline history', table: { title: 'Baselines', cols: [{ key: 'v', label: 'Version', kind: 'number' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'rev', label: 'Design revision', kind: 'number' }, { key: 'at', label: 'Date', kind: 'date' }, { key: 'by', label: 'By' }, { key: 'note', label: 'Note' }], rows: r.baselines.map((x) => ({ v: x.version, state: x.state === 'CURRENT' ? 'Current' : x.state === 'SUPERSEDED' ? 'Superseded' : 'Pending acceptance', rev: x.revision, at: ymd(x.at), by: who(x.by), note: x.note })) } },
    { id: 'audit', heading: 'Audit trail', text: ['Every event on the room’s record, newest first, including refusals: a refused step is evidence too.'],
      table: { title: 'Audit trail', cols: [{ key: 'at', label: 'When (UTC)', kind: 'date' }, { key: 'by', label: 'Who' }, { key: 'type', label: 'Event' }, { key: 'detail', label: 'Detail' }, { key: 'outcome', label: 'Outcome', kind: 'status' }], rows: r.events.map((e) => ({ at: e.at.slice(0, 16).replace('T', ' '), by: who(e.by), type: e.type, detail: e.detail, outcome: e.outcome === 'DENIED' ? 'Refused' : e.outcome === 'ALLOWED' ? 'Allowed' : 'Recorded' })) } },
  ];

  // the whole project: from the request to service (export/lifecycle.ts)
  const life = lifecycleSections(r, x.lifecycle || {}, (h: string) => (x.baseUrl ? `${x.baseUrl}${h}` : h));
  const early = life.sections.filter((z) => z.id !== 'intelligence'); const late = life.sections.filter((z) => z.id === 'intelligence');
  sections.splice(sections.findIndex((z) => z.id === 'scope') + 1, 0, ...early); sections.push(...late);
  // documentation: what this room requires and why (a pure function of its record), and, for the room with a tracker, where each stands
  const reqs = requiredFor(profileOf(r), open.length); const tracked = new Map((x.docs?.docs || []).map((d) => [d.type, d]));
  const base = x.baseUrl || ''; const abs = (h: string) => (base ? `${base}${h}` : h);
  const docHref = (t: string) => (x.report ? abs(`#/docs/${x.report}/${t}`) : '');
  sections.push({ id: 'documentation', heading: 'Documentation', text: [x.docs ? `The documentation tracker: ${x.docs.met} of ${x.docs.required} required documents are met for acceptance${x.docs.blockers.length ? `; ${plural(x.docs.blockers.length, 'document')} still stop${x.docs.blockers.length === 1 ? 's' : ''} it` : ''}.` : 'What this room’s documentation must hold, and why, from its equipment. No tracker is kept for this room in the demonstration, so no document is shown as submitted.'],
    table: { title: 'Documents', cols: [{ key: 'doc', label: 'Document' }, { key: 'applies', label: 'Required' }, { key: 'why', label: 'Why' }, { key: 'owner', label: 'Owner' }, { key: 'state', label: 'State', kind: 'status' }, { key: 'rev', label: 'Revision' }, { key: 'file', label: 'File' }],
      rows: reqs.map((q) => { const d = tracked.get(q.type); const sub = d?.submission; const att = sub?.attachment as { name?: string; bytes?: number; sha256?: string } | null | undefined;
        return { doc: q.title, applies: q.applies ? 'yes' : 'no', why: q.why, owner: q.ownerLabel, state: !q.applies ? 'Not applicable' : d ? (d.met ? 'Met' : d.state.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())) : 'Not tracked', rev: sub ? `r${sub.revision}` : '', file: att?.name ? `${att.name}${att.sha256 ? ` · SHA-256 ${att.sha256.slice(0, 12)}…` : ''}` : '' }; }), note: x.report ? 'Each tracked document’s page is listed under Links.' : undefined } });
  if (x.docs?.findings.length) sections.push({ id: 'doc-findings', heading: 'Documentation findings', table: { title: 'Document findings', cols: [{ key: 'doc', label: 'Document' }, { key: 'detail', label: 'Finding' }, { key: 'action', label: 'To correct it' }, { key: 'blocking', label: 'Blocks acceptance', kind: 'status' }], rows: x.docs.findings.map((f) => ({ doc: reqs.find((q) => q.type === f.doc)?.title || f.doc, detail: f.detail, action: f.action, blocking: f.blocking ? 'Blocks' : 'Does not block' })) } });
  if (x.captures?.length) sections.push({ id: 'captures', heading: 'Field captures', text: ['What was recorded in the room, as it was read: notes, measurements with their instrument and method, and the photograph’s fingerprint. A measurement here was entered by a person; nothing was filled in for them.'],
    table: { title: 'Field captures', cols: [{ key: 'at', label: 'When (UTC)', kind: 'date' }, { key: 'by', label: 'Who' }, { key: 'target', label: 'For' }, { key: 'note', label: 'Note' }, { key: 'm', label: 'Measurements' }, { key: 'photo', label: 'Photograph' }],
      rows: x.captures.map((c) => ({ at: c.at.slice(0, 16).replace('T', ' '), by: c.by.label, target: `${c.target.kind === 'doc' ? 'document' : 'check'} ${c.target.id}`, note: c.note, m: c.measurements.map((m) => `${m.quantity} ${m.value} ${m.unit} (${m.instrument}; ${m.method})`).join('; '), photo: c.photo ? `${c.photo.name} · ${(c.photo.bytes / 1024).toFixed(0)} KB · SHA-256 ${c.photo.sha256.slice(0, 12)}…${c.photo.annotated ? ' · annotated' : ''}` : '' })) } });
  const plan = planSvg(r);
  const media: Media[] = [
    { id: 'plan', title: `Plan: ${shortName(o)}`, caption: `The room drawn from its record: ${fw.length} device positions by layer, furniture, ${o.dims[0]} × ${o.dims[1]} m (${o.kind === 'reference' ? 'from the design record' : 'modelled'}). A drawing of the record, not a survey or a photograph.`, source: 'room record (campus/design.ts)', kind: 'drawing', mime: 'image/png', width: plan.width, height: plan.height, svg: plan.svg },
    ...(x.register?.photos || []).map((ph) => ({ id: `install-${ph.which}`, title: `Install documentation · ${ph.which === 'before' ? 'before' : 'after'} the installation`, caption: `${ph.note || (ph.which === 'before' ? 'The room before the installation.' : 'The room after the installation.')} Taken by ${who(ph.by)}, ${ph.at.slice(0, 16).replace('T', ' ')} UTC (phase 1, installation team); kept in this browser.`, source: `phase 1 install documentation (${ph.which})`, kind: 'photo' as const, mime: ph.mime, width: ph.width, height: ph.height, bytes: ph.bytes })),
    ...(x.photos || []).map((ph) => ({ id: ph.key, title: `Field photograph · ${ph.target}`, caption: `${ph.note || 'Captured in the room.'} Taken by ${ph.by}, ${ph.at.slice(0, 16).replace('T', ' ')} UTC; kept in this browser and synchronised as ${ph.key}.`, source: `field capture ${ph.key} (${ph.name})`, kind: 'photo' as const, mime: ph.mime, width: ph.width, height: ph.height, bytes: ph.bytes })),
  ];
  const links: Link[] = [
    { label: 'Commissioning record', url: abs(`#/commissioning/room/${o.id}`) }, { label: 'Traceability', url: abs(`#/commissioning/room/${o.id}/trace`) },
    { label: 'Deficiencies', url: abs(`#/commissioning/room/${o.id}/deficiencies`) }, { label: 'Sign-off', url: abs(`#/commissioning/room/${o.id}/signoff`) },
    { label: 'Assurance comparison', url: abs(`#/assurance/room/${o.id}`) }, { label: 'The room in 3D (Lite)', url: abs(liteRoomHref(o.id)) }, { label: 'The room on the campus', url: abs(roomHref(o)) },
    ...(x.report ? [{ label: `Commissioning dossier ${x.report}`, url: abs(`#/dossier/${x.report}`) }, { label: 'Documentation tracker', url: abs(`#/docs/${x.report}`) }] : []),
    ...reqs.filter((q) => tracked.has(q.type)).map((q) => ({ label: `Document: ${q.title}`, url: docHref(q.type) })),
    ...life.links,
  ];
  return {
    media, links,
    schema: 'empathia.report/1', id: `CX-${o.id}`, kind: 'commissioning-package', title: 'Commissioning completion package', subtitle: fullName(o),
    scope: { tenant: SITE.enterprise, site: SITE.name, building: b?.name || o.building, floor: `Floor ${o.floor}`, room: shortName(o), roomId: o.id },
    status: { label: S.label, tone: S.tone, why: st.why }, generatedAt: by.at, role: by.role, build: by.build,
    provenance: [
      'Synthetic demonstration: every room, person and record is invented and connected to no real system.',
      `Results are as recorded in the room’s synthetic record: nothing was measured and no device was contacted. Geometry: ${o.kind === 'reference' ? 'from the design record' : 'modelled'}.`,
      'Devices are classes of device: no make, model or serial number is invented. Connections are proposed by the engine’s rules, not traced.',
      `Made as ${by.role}: a perspective on the record, which grants no permission. A passing simulation never proves commissioning.`,
      'Standards are referred to by name only; no licensed text is reproduced.',
    ],
    headline: `${shortName(o)} is ${S.label.toLowerCase()}: ${st.why}. ${passedPhases} of 5 phases pass; ${r.counts.verified} of ${r.counts.applicable} applicable checks are passed and verified${r.counts.failed ? `, ${r.counts.failed} failed` : ''}${r.counts.notTested ? `, ${r.counts.notTested} not run` : ''}.`,
    kpis: [
      { label: 'Phases passed', value: `${passedPhases} of 5`, note: ph.filter((p) => p.verdict !== 'pass').map((p) => `${p.name}: ${VERDICT[p.verdict]!.toLowerCase()}`).join('; ') || 'every phase passes' },
      { label: 'Checks verified', value: `${r.counts.verified} of ${r.counts.applicable}`, note: `${r.counts.failed} failed · ${r.counts.notTested} not run${unverified ? ` · ${unverified} awaiting verification` : ''}` },
      { label: 'Open deficiencies', value: String(open.length), note: open.length ? `${open.filter((i) => i.severity === 'High').length} high` : 'none' },
      { label: 'Devices', value: String(fw.length), note: `${fw.filter((p) => p.identity === 'VERIFIED').length} with a verified identity` },
      { label: 'Requirements proven', value: `${tr.filter((t) => t.result === 'PROVEN').length} of ${tr.length}`, note: tr.some((t) => t.result !== 'PROVEN') ? `not yet: ${tr.filter((t) => t.result !== 'PROVEN').map((t) => t.domain).join(', ')}` : 'every requirement' },
      { label: 'Baseline', value: cur ? `v${cur.version}` : '—', note: cur ? `${ymd(cur.at)}${pend ? ` · v${pend.version} pending` : ''}` : pend ? `v${pend.version} pending acceptance` : 'none: never accepted' },
      ...(x.lifecycle?.workspace ? life.kpis : []),
    ],
    chart: { title: 'Checks by phase', categories: ph.map((p) => p.name), series: [
      { name: 'Pass', tone: 'ok', values: ph.map((p) => p.pass) }, { name: 'Fail', tone: 'bad', values: ph.map((p) => p.fail) },
      { name: 'Awaiting', tone: 'warn', values: ph.map((p) => p.rows.filter((x) => x.result === 'PASS_UNVERIFIED' || x.result === 'INCONCLUSIVE').length) },
      { name: 'Not run', tone: 'muted', values: ph.map((p) => p.rows.filter((x) => !x.result || x.result === 'NOT_TESTED' || x.result === 'NOT_SUPPORTED').length) }] },
    sections, primary: 'Test register',
    dossier: {
      room: { id: o.id, building: o.building, floor: o.floor, number: o.number, archetype: o.archetype, kind: o.kind, capacity: o.capacity, dims: o.dims },
      lifecycle: r.lifecycle, state: st.state, acceptanceBlocked: bl.blocked && !acc,
      blockers: { critical: bl.critical.map((i) => i.id), missingEvidence: bl.missing.map((x) => x.id), mustHaveFailed: bl.must.map((x) => x.id) },
      results: app.map((x) => ({ check: x.id, phase: x.phase, domain: x.domain, result: x.result || 'NOT_TESTED', evidence: x.evidence || [] })),
      trace: tr.map((t) => ({ domain: t.domain, priority: t.priority, positions: t.design.map((p) => p.code), checks: t.checks.map((c) => c.id), result: t.result })),
      positions: fw.map((p) => ({ code: p.code, category: p.cat, asset: p.asset, identity: p.identity })),
      connections: r.connections.filter((c) => !c.removed).map((c) => ({ id: c.id, from: c.from, to: c.to, kind: c.kind, state: 'PROPOSED' })),
      issues: r.issues.map((i) => ({ id: i.id, severity: i.severity, state: i.state, positions: i.positions })),
      baselines: r.baselines.map((x) => ({ version: x.version, state: x.state, revision: x.revision, at: x.at })),
      exception: r.exception ? { id: r.exception.id, state: r.exception.state, requirement: r.exception.requirement } : null,
      documentation: reqs.map((q) => ({ type: q.type, required: q.applies, state: tracked.get(q.type)?.state || null, met: tracked.get(q.type)?.met ?? null })),
      requests: (x.lifecycle?.requests || []).map((q) => ({ id: q.id, kind: q.kind, goes: q.goes, standing: q.standing })),
      captures: (x.captures || []).map((c) => ({ key: c.key, target: c.target, at: c.at, photoSha256: c.photo?.sha256 || null })),
      counts: r.counts,
    },
  };
}
