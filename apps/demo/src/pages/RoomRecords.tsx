/**
 * The commissioning record and the assurance comparison of one room (V2.5.3 #/commissioning/room/:id, /signoff, /trace and
 * #/assurance/room/:id, /recommission), and the Known Fix library (#/service/fixes). Everything is read from the room's record
 * (campus/design.ts: the applicability rows of the engine with their phase and result, the baselines, the issues, the findings, the
 * installations and the events) and the service workspace; the five phases, the delivery spine, the sign-off rule, the trace from
 * requirement to evidence and the seventeen dimensions are V2.5.3's compositions computed here, never typed in. A "simulated run" is
 * refused by the rules the page shows: nothing here measures a room or contacts a device.
 */
import { V253RoomStage, type V253Pick } from '../lite/V253Room.js';
import type { V253State } from '../lite/v253/v253room.js';
import { roomState, type Lens } from '../lite/model.js';
import { RoomJumps, opensFor } from '../rooms/RoomJumps.js';
import type { RoleKey } from '../registry.types.js';
import { useState, type ReactNode } from 'react';
import { Segmented, PageHero, StatTile, Card, Chip, List, ListRow, Tag, Notice, EmptyState, ProgressBar, Icon, ScoreRing, Donut, type Tone, type Series } from '@empathia/ui';
import { allRecords, roomRecord, openIssues, type RoomRecord } from '../campus/design.js';
import { shortName, fullName, roomHref, buildingByKey } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import * as S from '../workspace/store.js';
import { personaOf, personaLabel, holds } from '../build/store.js';
import { openable } from './V25Nav.js';
import { AssuranceTabs, CxTabs } from './AssuranceViews.js';
import { readyCheckOf, nextSession, READY_OUT } from '../assurance/model.js';
import { cxState, CX, asState, AS } from './Estate.js';
import { V } from '../learn/model.js';
import { plural, pct, weekCounts, Foot } from './viz.js';

import { rowsOf, PHASES, RES, res, ymd, phaseStats, blockers } from '../campus/cxRecord.js';
import { ExportMenu } from '../export/ExportMenu.js';
import { Registers } from '../campus/RegisterCard.js';
import { LAYERS, assuranceDims, changeCards } from '../campus/asRecord.js';
import { cxPackage } from '../export/cx.js';
import { asPackage } from '../export/as.js';
import { planSvg } from '../export/plan.js';
type Row = ReturnType<typeof rowsOf>[number];
function Head({ r, kind, perspective, tab }: { r: RoomRecord; kind: 'cx' | 'as'; perspective: string; tab: ReactNode }) {
  const { w } = useWorkspace(); const b = buildingByKey(r.outline.building); const cur = r.baselines.find((x) => x.state === 'CURRENT'); const pend = r.baselines.find((x) => x.state === 'PENDING_ACCEPTANCE');
  const st = kind === 'cx' ? cxState(r) : asState(r, w.incidents); const T = kind === 'cx' ? CX[st.state as keyof typeof CX] : AS[st.state as keyof typeof AS];
  return <>
    <nav className="ln-crumbs" aria-label="Where you are"><a href={kind === 'cx' ? '#/commissioning' : '#/assurance'}>{kind === 'cx' ? 'Commissioning' : 'Assurance'}</a> › <a href={`#/campus/${r.outline.building}`}>{b?.name}</a> › <b aria-current="page">{shortName(r.outline)}</b></nav>
    <PageHero product="commissioning" icon="shield" compact eyebrow={kind === 'cx' ? 'Commissioning record' : 'Assurance comparison'} title={`${kind === 'cx' ? 'Commissioning' : 'Assurance'}: ${fullName(r.outline)}`}
      lede={<>{r.archetypeName} · seats {r.outline.capacity} · {r.outline.dims.join(' × ')} m ({r.outline.kind === 'reference' ? 'design record' : 'modelled'}). {st.why}. Acting as <b>{personaLabel(personaOf(perspective))}</b>.</>}
      meta={[<Chip key="s" small tone={T.tone as Tone}>{T.label}</Chip>, <Chip key="b" small tone="muted">{cur ? `Baseline v${cur.version} · ${ymd(cur.at)}` : 'No baseline on record'}{pend ? ` · v${pend.version} pending` : ''}</Chip>, <Chip key="r" small tone="muted">Synthetic records</Chip>, <Chip key="m" small tone="warn">Modelled · not measured</Chip>, <Chip key="p" small tone="muted">Prototype · not production monitoring</Chip>]}
 />
    <RoomJumps roomId={r.outline.id} here={kind === 'cx' ? 'commissioning' : 'assurance'} opens={opensFor(perspective as RoleKey)} />
    {tab}
  </>;
}
function RoomTabs({ r, kind, current }: { r: RoomRecord; kind: 'cx' | 'as'; current: string }) {
  const base = `#/${kind === 'cx' ? 'commissioning' : 'assurance'}/room/${r.outline.id}`;
  const tabs: Array<[string, string]> = kind === 'cx' ? [['Checks', base], ['Traceability', `${base}/trace`], ['Deficiencies', `${base}/deficiencies`], ['Sign-off', `${base}/signoff`]] : [['Assurance', base], ['Ready check', `${base}/ready`], ['Recommission', `${base}/recommission`], ['History', `${base}/history`]];
  return <nav className="wk-v25nav" aria-label={kind === 'cx' ? 'The commissioning record' : 'The assurance comparison'}>{tabs.map(([l, h]) => <Chip key={h} href={h} small selected={h === current}>{l}</Chip>)}</nav>;
}
const VIEW_NAME: Array<[RegExp, string]> = [[/\/history\b/, 'baseline history'], [/\/ready\b/, 'ready check'], [/\/recommission\b/, 'recommission'], [/\/trace\b/, 'traceability'], [/\/signoff\b/, 'sign-off'], [/\/deficiencies\b/, 'deficiencies']];
function NoRoom({ perspective, id, kind, hash = '' }: { perspective: string; id: string; kind: 'cx' | 'as'; hash?: string }) {
  const what = VIEW_NAME.find(([re]) => re.test(hash))?.[1];
  return <section className="wk" data-testid="room-missing"><PageHero product="commissioning" icon="shield" compact eyebrow={`${kind === 'cx' ? 'Commissioning' : 'Assurance'}${what ? ` · ${what}` : ''}`} title="No such room on record" lede={`“${id}” is not one of the rooms of this demonstration. Acting as ${personaLabel(personaOf(perspective))}.`} />
    <Card icon="room" title="Rooms with a record"><List label="Rooms">{allRecords().map((r) => <ListRow key={r.outline.id} title={shortName(r.outline)} sub={r.outline.name} href={`#/${kind === 'cx' ? 'commissioning' : 'assurance'}/room/${r.outline.id}`} chevron />)}</List></Card></section>;
}

// ------------------------------------------------------------------------------------------------------------ commissioning record
const SPINE = (r: RoomRecord, inc: S.Incident[]) => {
  const ev = (re: RegExp) => r.events.some((e) => re.test(`${e.type} ${e.detail}`) && e.outcome !== 'DENIED');
  const ph = phaseStats(r); const passed = ph.filter((p) => p.verdict === 'pass').length; const bl = blockers(r); const open = inc.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state));
  const acc = r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL';
  return [
    { n: 1, name: 'Intake', state: 'DONE', note: r.outline.intent.slice(0, 60) + '…' }, { n: 2, name: 'Design', state: ev(/design_created/) ? 'DONE' : 'NOT STARTED', note: ev(/design_created/) ? 'Design created and classified' : 'No design record' },
    { n: 3, name: 'Selection', state: r.positions.some((p) => !p.furniture) ? 'DONE' : 'NOT STARTED', note: `${r.positions.filter((p) => !p.furniture).length} device positions` },
    { n: 4, name: 'Project', state: ev(/→ DESIGN_APPROVED/) ? 'DONE' : 'IN PROGRESS', note: ev(/→ DESIGN_APPROVED/) ? 'Design approved' : 'Awaiting design approval' },
    { n: 5, name: 'Procurement', state: ev(/→ INSTALLATION_PENDING/) ? 'DONE' : 'NOT STARTED', note: ev(/→ INSTALLATION_PENDING/) ? 'Released to installation' : '—' },
    { n: 6, name: 'Installation', state: r.installations.length ? 'DONE' : 'NOT STARTED', note: `${plural(r.installations.filter((i) => !i.removedAt).length, 'unit')} installed` },
    { n: 7, name: 'Commissioning', state: acc ? 'DONE' : r.lifecycle === 'COMMISSIONING' ? (bl.blocked ? 'BLOCKED' : 'IN PROGRESS') : 'NOT STARTED', note: `${passed} of 5 phases pass` },
    { n: 8, name: 'Acceptance', state: acc ? 'DONE' : bl.blocked && r.lifecycle === 'COMMISSIONING' ? 'BLOCKED' : 'NOT STARTED', note: acc ? `accepted ${ymd(r.baselines.find((b) => b.state === 'CURRENT')?.at)}` : bl.blocked ? 'Sign-off blocked' : 'Not yet' },
    { n: 9, name: 'Service', state: open.length || openIssues(r).length ? 'IN PROGRESS' : acc ? 'DONE' : 'NOT STARTED', note: `${plural(open.length, 'open request')} · ${plural(openIssues(r).length, 'open issue')}` },
  ];
};
export function CxRoomPage({ perspective, params, hash }: { perspective: string; params: Record<string, string>; hash: string }) {
  const r = roomRecord(params.room || ''); const { w, apply, refusal } = useWorkspace(); const persona = personaOf(perspective);
  if (!r) return <NoRoom perspective={perspective} id={params.room || ''} kind="cx" hash={hash} />;
  const view = /\/trace\b/.test(hash) ? 'trace' : /\/signoff\b/.test(hash) ? 'signoff' : /\/deficiencies\b/.test(hash) ? 'def' : 'checks';
  const ph = phaseStats(r); const bl = blockers(r); const rows = rowsOf(r); const inc = w.incidents.filter((i) => i.roomId === r.outline.id);
  const spine = SPINE(r, inc); const base = `#/commissioning/room/${r.outline.id}`;
  const canRun = holds(persona, 'tests.record') || holds(persona, 'tests.verify.all');
  const run = () => apply((x) => { x.events.unshift({ at: new Date().toISOString(), by: persona, type: 'commission.run_refused', aggregate: r.outline.id, detail: `simulated run of ${plural(bl.missing.length, 'check')} refused: this demonstration never measures a room or contacts a device; a check is recorded only with its evidence (${rows.find((t) => !t.result || t.result === 'NOT_TESTED')?.evidence?.join(', ') || 'instrument or field observation'})`, outcome: 'DENIED' }); return S.refused([`A simulated run is refused: nothing here measures a room or contacts a device. ${plural(bl.missing.length, 'check')} stay not run until their evidence is recorded.`]); });
  return (
    <section className="wk cx" data-native="workspace" data-testid="cx-room" data-room={r.outline.id}>
      <Head r={r} kind="cx" perspective={perspective} tab={<RoomTabs r={r} kind="cx" current={view === 'checks' ? base : view === 'trace' ? `${base}/trace` : view === 'signoff' ? `${base}/signoff` : `${base}/deficiencies`} />} />
      <div className="kit-grid kit-grid--tiles wk-tiles5" data-testid="cx-phases">{ph.map((p) => <StatTile key={p.n} label={`${p.n} · ${p.name}`} value={p.verdict === 'none' ? '—' : p.verdict === 'pass' ? 'Pass' : p.verdict === 'fail' ? 'Fail' : p.verdict === 'notrun' ? 'Not run' : 'Partial'} unit={p.rows.length ? `${p.pass} of ${p.rows.length}` : undefined} tone={p.verdict === 'pass' ? 'ok' : p.verdict === 'fail' ? 'bad' : p.verdict === 'partial' ? 'warn' : 'muted'} icon="shield" hint={p.q} />)}</div>
      {bl.blocked && r.lifecycle === 'COMMISSIONING' ? <Notice tone="bad"><b>Why acceptance is blocked.</b> {[bl.critical.length ? `A critical deficiency is open (${bl.critical.length})` : '', bl.missing.length ? `Required evidence is missing (${bl.missing.length})` : '', bl.must.length ? `A must-have requirement is not met (${bl.must.length})` : ''].filter(Boolean).join(' · ')} — <a href={`${base}/trace`}>trace the requirement</a> · <a href={`${base}/signoff`}>what sign-off needs</a></Notice> : null}
      {refusal ? <div role="alert"><Notice tone="bad"><b>Refused.</b> {refusal.why.join(' ')}</Notice></div> : null}
      {view === 'checks' ? <>
        <Registers r={r} persona={persona} canFill={holds(persona, 'work.evidence')} onRecord={(type, detail) => apply((x) => { x.events.unshift({ at: new Date().toISOString(), by: persona, type, aggregate: r.outline.id, detail, outcome: 'ALLOWED' }); return null; })} />
        <Card icon="check" title={`Five phases, ${rows.filter((x) => x.applicable).length} checks`} sub="As recorded · each phase opens to its checks" testId="cx-checks">
          {ph.map((p) => <details key={p.n} className="ln-dom" open={p.verdict === 'fail' || p.verdict === 'partial'}><summary><b>{p.n} · {p.name}</b> <span className="ui-meta">{p.q}</span> <Tag tone={p.verdict === 'pass' ? 'ok' : p.verdict === 'fail' ? 'bad' : p.verdict === 'none' ? 'muted' : 'warn'}>{p.verdict === 'none' ? 'No applicable check' : `${p.verdict === 'pass' ? 'Pass' : p.verdict === 'fail' ? 'Fail' : p.verdict === 'notrun' ? 'Not run' : 'Partial'} · ${p.pass} of ${p.rows.length}`}</Tag></summary>
            <List label={`${p.name} checks`}>{p.rows.map((x) => <ListRow key={x.id} title={x.label} sub={`${x.pack || x.domain} · tier ${x.tier} · verified by ${x.verifier?.replace(/_/g, ' ') || 'an independent person'}${x.instrument ? ' · instrument' : ''}`} trailing={<Tag tone={res(x.result).tone}>{res(x.result).label}</Tag>} />)}</List></details>)}
          <p className="wk-note">{rows.filter((x) => !x.applicable).length} of the {rows.length} checks in the library do not apply to this room’s equipment. {canRun && bl.missing.length ? <button type="button" className="ui-btn ui-btn--sm" onClick={run} data-testid="cx-run">Run every check not yet run ({bl.missing.length}) · simulated</button> : null}</p>
        </Card>
        <Card icon="route" title="Delivery spine" sub="One thread from the request to service, read from the records" testId="cx-spine">
          <ol className="cx-spine">{spine.map((s) => <li key={s.n} className={s.state === 'DONE' ? 'done' : s.state === 'BLOCKED' || s.state === 'IN PROGRESS' ? 'now' : ''}><Tag tone={s.state === 'DONE' ? 'ok' : s.state === 'BLOCKED' ? 'bad' : s.state === 'IN PROGRESS' ? 'warn' : 'muted'}>{s.n} · {s.state}</Tag><b>{s.name}</b><span className="ui-meta">{s.note}</span></li>)}</ol>
          <p className="wk-note">A stage is “done” only when its record says so: a milestone recorded, a phase that passed, a sign-off recorded. Blocked means the rule that stops it is written on this page.</p>
        </Card>
      </> : null}
      {view === 'trace' ? <Trace r={r} /> : null}
      {view === 'def' ? <Card icon="alert" title="Deficiencies" sub={`${plural(openIssues(r).length, 'open deficiency', 'open deficiencies')} · ${r.issues.length - openIssues(r).length} closed`} testId="cx-def">
        {r.issues.length ? <List label="Deficiencies">{r.issues.map((i) => <ListRow key={i.id} title={i.title} sub={`${i.id} · ${i.source} · ${i.positions.join(', ') || 'the room'}`} trailing={<Tag tone={i.state === 'RESOLVED' ? 'ok' : i.severity === 'High' ? 'bad' : 'warn'}>{i.state === 'RESOLVED' ? 'Closed' : `${i.severity} · open`}</Tag>} />)}</List> : <EmptyState title="No deficiency on record" icon="check" />}
        {r.exception ? <Notice tone="warn"><b>{r.exception.id}</b> · exception requested ({r.exception.waivability}) for {r.exception.requirement}: {r.exception.rationale} Pending approval by an independent reviewer; expires {ymd(r.exception.expiry)}.</Notice> : null}
      </Card> : null}
      {view === 'signoff' ? <Signoff r={r} bl={bl} /> : null}
      <ExportMenu testId="cx-export" pictures={[{ name: `${r.outline.id}-plan`, label: 'Plan', aggregate: r.outline.id, ...planSvg(r) }]} title="Completion package" sub={`The whole record of ${shortName(r.outline)} as six files: the report, the register, the deck and the dossier`} by={persona}
        make={async () => cxPackage(r, { role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' }, await (await import('../export/cxExtras.js')).cxExtras(r.outline.id, w))} />
      <Foot>Synthetic records: a simulated test reads the room as Core holds it; nothing is measured and no device is contacted.</Foot>
    </section>
  );
}
/** Requirement → design → checks → evidence → result: one row per domain of the archetype's requirement table, from the applicable checks. */
function Trace({ r }: { r: RoomRecord }) {
  const rows = rowsOf(r).filter((x) => x.applicable);
  const doms = [...new Set(rows.map((x) => x.domain))].slice(0, 8);
  const reqOf: Record<string, string> = { Audio: 'Every seat is heard clearly by the far end', Video: 'Every intended seat is seen by the far end', Display: 'Every seat can read the content', Network: 'The room reaches its services on the validated path', Compute: 'A meeting starts with one touch', Control: 'Every control does what its label says', Power: 'The room returns to a working state after a power interruption', Change: 'A change to the room is traced and approved' };
  const bl = blockers(r);
  return <Card icon="route" title="Requirement, design, check, evidence" sub={`${plural(doms.length, 'requirement')} · ${bl.must.length ? `This is why ${shortName(r.outline)} is blocked: a must-have check failed.` : bl.missing.length ? `${plural(bl.missing.length, 'check')} not yet proven.` : 'Every requirement is proven.'}`} testId="cx-trace">
    {doms.map((d) => { const cs = rows.filter((x) => x.domain === d); const design = r.positions.filter((p) => !p.furniture && ({ Audio: /mic|dsp|speaker|amp/, Video: /camera|bar/, Display: /display|ledwall|projector|switcher/, Network: /switch|encoder/, Compute: /compute/, Control: /control|touch|scheduler/, Power: /rack/ } as Record<string, RegExp>)[d]?.test(p.cat)); const fail = cs.find((x) => x.result === 'FAIL'); const nr = cs.filter((x) => !x.result || x.result === 'NOT_TESTED'); const ev = cs.flatMap((x) => x.evidence || []).filter((x, i, a) => a.indexOf(x) === i);
      return <div key={d} className="cx-trace" data-testid="trace-row">
        <div><h4>Requirement</h4><b>{reqOf[d] || `${d} as the standard requires`}</b><div className="ui-meta">{['Audio', 'Video', 'Network', 'Change'].includes(d) ? 'Must have' : 'Should have'}</div></div>
        <div><h4>Design</h4>{design.length ? <>{design.length} positions: {design.slice(0, 4).map((p) => p.label).join(', ')}{design.length > 4 ? '…' : ''}</> : <span className="ui-meta">No position of this kind in the design</span>}</div>
        <div><h4>Checks</h4><ul className="plain">{cs.slice(0, 5).map((x) => <li key={x.id}>{x.label} <Tag tone={res(x.result).tone}>{res(x.result).label}</Tag></li>)}{cs.length > 5 ? <li className="ui-meta">{cs.length - 5} more</li> : null}</ul></div>
        <div><h4>Evidence</h4>{ev.length ? ev.map((e) => <Tag key={e} tone="muted">{e.replace(/_/g, ' ').toLowerCase()}</Tag>) : <span className="ui-meta">none recorded</span>}</div>
        <div><h4>Result</h4><Tag tone={fail ? 'bad' : nr.length ? 'warn' : 'ok'}>{fail ? 'FAIL' : nr.length ? 'Not yet proven' : 'PROVEN'}</Tag><div className="ui-meta">{fail ? fail.label : nr.length ? `${nr[0]!.label}: not run` : `${cs.length} checks verified`}</div></div>
      </div>; })}
  </Card>;
}
function Signoff({ r, bl }: { r: RoomRecord; bl: ReturnType<typeof blockers> }) {
  const cur = r.baselines.find((b) => b.state === 'CURRENT'); const acc = r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL';
  const accEv = r.events.find((e) => /→ ACCEPTED/.test(e.detail) && e.outcome !== 'DENIED'); const refused = r.events.find((e) => /→ ACCEPTED/.test(e.detail) && e.outcome === 'DENIED');
  const fw = r.positions.filter((p) => !p.furniture); const cats = new Set(fw.map((p) => p.cat));
  return <div className="wk-g2">
    <Card icon="check" title="Sign-off" sub="Engineer approval required · as recorded" testId="cx-signoff">
      <Tag tone={acc ? 'ok' : bl.blocked ? 'bad' : 'warn'}>{acc ? 'Accepted' : bl.blocked ? 'Blocked' : 'Acceptance with exceptions'}</Tag>
      <p className="ln-p">{acc ? `Accepted ${ymd(accEv?.at)} by ${accEv?.by.replace(/_/g, ' ')}.` : bl.blocked ? 'Acceptance cannot be given yet.' : 'Everything that is open is an exception: acceptance with exceptions is possible.'}</p>
      {bl.critical.length ? <p><b>A critical deficiency is open</b><br /><span className="ui-meta">{bl.critical.map((i) => i.title).join(' · ')}</span></p> : null}
      {bl.missing.length ? <p><b>Required evidence is missing</b><br /><span className="ui-meta">{bl.missing.slice(0, 4).map((x) => x.label).join(' · ')}{bl.missing.length > 4 ? ` · and ${bl.missing.length - 4} more` : ''}</span></p> : null}
      {bl.must.length ? <p><b>A must-have requirement is not met</b><br /><span className="ui-meta">{bl.must.map((x) => x.label).join(' · ')}</span></p> : null}
      {refused && !acc ? <Notice tone="info">The engine’s own refusal ({ymd(refused.at)}, {refused.by.replace(/_/g, ' ')}): {refused.detail}</Notice> : null}
      <h3 className="ln-h3">Controlled sign-off</h3>
      <List label="Sign-off steps"><ListRow title="1 · Technical sign-off" sub={acc ? `Recorded ${ymd(accEv?.at)}` : 'Not yet. Two roles may sign: a commissioning engineer or a systems engineer who did not run the checks.'} trailing={<Tag tone={acc ? 'ok' : 'muted'}>{acc ? 'Signed' : 'Not signed'}</Tag>} /><ListRow title="2 · Owner’s acceptance" sub={acc ? 'After the technical sign-off; baseline published' : 'After the technical sign-off.'} trailing={<Tag tone={acc ? 'ok' : 'muted'}>{acc ? 'Accepted' : 'Waiting'}</Tag>} /></List>
      <p className="wk-note">Acceptance is blocked by a critical deficiency, by required evidence that is missing, or by a must-have requirement that is not met. Anything else that is open makes it an acceptance with exceptions. The person who recorded a check never verifies it.</p>
    </Card>
    <Card icon="book" title="What the baseline holds" sub={cur ? `Baseline v${cur.version} · ${cur.note}` : 'No baseline: never accepted'} testId="cx-baseline">
      <List label="Baseline contents">
        <ListRow title="Devices" sub={`${fw.length} devices in ${cats.size} categories`} />
        <ListRow title="Identity" sub={`${fw.filter((p) => p.identity === 'VERIFIED').length} of ${fw.length} verified; the rest ${[...new Set(fw.map((p) => p.identity.toLowerCase()))].join(', ')} — no make, model or serial is invented`} />
        <ListRow title="Spatial layout" sub={`${r.outline.capacity} seats, ${r.outline.dims[0]} × ${r.outline.dims[1]} m, ${r.outline.kind === 'reference' ? 'surveyed' : 'modelled'}`} />
        <ListRow title="Connections" sub={`${r.connections.length} proposed by the engine’s rules (modelled, not traced)`} />
        <ListRow title="Test results" sub={`${r.counts.verified} of ${r.counts.applicable} applicable checks passed and verified · ${r.counts.failed} failed · ${r.counts.notTested} not run`} />
        <ListRow title="Design findings" sub={r.findings.length ? r.findings.map((f) => f.title).join(' · ') : 'none'} />
        <ListRow title="Documentation" sub={`${plural(r.coverage.filter((c) => c.state === 'complete').length, 'area')} complete of ${r.coverage.length} in the record’s coverage`} />
      </List>
    </Card>
  </div>;
}

// ------------------------------------------------------------------------------------------------------------ assurance comparison
const DIM_TONE: Record<string, Tone> = { match: 'ok', drift: 'warn', failed: 'bad', reported: 'info' };
export function AsRoomPage({ perspective, params, hash }: { perspective: string; params: Record<string, string>; hash: string }) {
  const r = roomRecord(params.room || ''); const { w, apply, refusal } = useWorkspace(); const persona = personaOf(perspective);
  const [ran, setRan] = useState(false);
  if (!r) return <NoRoom perspective={perspective} id={params.room || ''} kind="as" hash={hash} />;
  const view = /\/recommission\b/.test(hash) ? 'recommission' : /\/ready\b/.test(hash) ? 'ready' : /\/history\b/.test(hash) ? 'history' : 'assurance';
  const inc = w.incidents.filter((i) => i.roomId === r.outline.id); const base = `#/assurance/room/${r.outline.id}`;
  const dims = assuranceDims(r, inc);
  const n = { match: dims.filter((d) => d.state === 'match').length, drift: dims.filter((d) => d.state === 'drift').length, failed: dims.filter((d) => d.state === 'failed').length, reported: dims.filter((d) => d.state === 'reported').length };
  const cur = r.baselines.find((b) => b.state === 'CURRENT');
  const runIt = () => { setRan(true); apply((x) => { x.events.unshift({ at: new Date().toISOString(), by: persona, type: 'assurance.run', aggregate: r.outline.id, detail: `simulated discovery over 17 dimensions from the records: ${n.match} match, ${n.drift} drift, ${n.failed} failed, ${n.reported} reported — nothing measured, no device contacted`, outcome: 'ALLOWED' }); return null; }); };
  return (
    <section className="wk cx" data-native="workspace" data-testid="as-room" data-room={r.outline.id}>
      <Head r={r} kind="as" perspective={perspective} tab={<RoomTabs r={r} kind="as" current={view === 'assurance' ? base : `${base}/${view}`} />} />
      {refusal ? <div role="alert"><Notice tone="bad"><b>Refused.</b> {refusal.why.join(' ')}</Notice></div> : null}
      {view === 'assurance' ? <>
        <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="as-indicators">
          <StatTile label="Reachable" value="Not measured" icon="pulse" tone="muted" hint="No live telemetry in a synthetic record" />
          <StatTile label="Identified" value={`${r.positions.filter((p) => !p.furniture && p.identity !== 'UNKNOWN').length} of ${r.positions.filter((p) => !p.furniture).length}`} icon="device" tone="info" hint="Units with a verified identity; none is invented" />
          <StatTile label="Config validated" value={r.reopened.length ? 'Partial' : cur ? 'As baseline' : 'Unknown'} icon="shield" tone={r.reopened.length ? 'warn' : cur ? 'ok' : 'muted'} hint={r.reopened.length ? `${plural(r.reopened.length, 'test')} reopened` : 'Against the commissioned record'} />
          <StatTile label="Accepted" value={cur ? `v${cur.version}` : 'Never'} icon="check" tone={cur ? 'ok' : 'muted'} hint={cur ? ymd(cur.at) : 'no baseline'} />
        </div>
        <div className="wk-g2 wk-g2--wide">
          <Card icon="layers" title="The room in four states" sub={`${r.archetypeName} · ${r.outline.dims[0]} × ${r.outline.dims[1]} m · furnished as V2.5.3 drew it`} testId="as-states">
            <FourStates r={r} perspective={perspective} />
          </Card>
          <Card icon="pulse" tone="commissioning" title="Run Assurance" sub="Simulated discovery from the records · nothing measured" testId="as-run">
            <Donut label="Seventeen dimensions" segments={[{ key: 'm', label: 'Match', value: n.match, tone: 'ok' }, { key: 'd', label: 'Drift', value: n.drift, tone: 'warn' }, { key: 'f', label: 'Failed', value: n.failed, tone: 'bad' }, { key: 'r', label: 'Reported', value: n.reported, tone: 'info' }]} total="dimensions" />
            <p className="ln-p">{ran ? 'Run recorded in the ledger as a simulated discovery.' : `From the checks and records Core holds: ${n.match} match, ${n.drift} drift, ${n.failed} failed, ${n.reported} reported by people.`}</p>
            {holds(persona, 'assure.run') || holds(persona, 'tests.verify.all') ? <button type="button" className="ui-btn ui-btn--primary" onClick={runIt} data-testid="as-run-btn" disabled={ran}>{ran ? 'Run recorded' : 'Run Assurance'}</button> : null}
          </Card>
        </div>
        <ChangeCards r={r} perspective={perspective} />
        <Card icon="chart" title="Seventeen dimensions, seven layers" sub={n.drift + n.failed ? `${n.match} match · ${n.drift} drift · ${n.failed} failed · ${n.reported} reported: ${plural(n.drift + n.failed, 'dimension')} differ from the commissioned state` : 'Nothing changed: the current state reads the same as the commissioned one in every value Assurance compares.'} testId="as-dims">
          <div className="cx-dims">{LAYERS.map((L) => { const ds = dims.filter((d) => d.layer === L); const off = ds.filter((d) => d.state !== 'match'); return <Card key={L} level={3} title={L} sub={ds[0]?.what && L !== 'Functional' ? ds[0].what : `${ds.length} dimensions`}>
            {off.length ? <List label={`${L} dimensions`}>{off.map((d) => <ListRow key={d.name} title={d.name} sub={d.note} trailing={<Tag tone={DIM_TONE[d.state]}>{d.state === 'match' ? 'Matches baseline' : d.state === 'drift' ? 'Drift' : d.state === 'failed' ? 'Offline or failed' : 'Reported by people'}</Tag>} />)}</List> : <p className="ui-meta">All match their baseline: {ds.map((d) => d.name).join(', ')}</p>}
            {off.length && off.length < ds.length ? <p className="ui-meta">{ds.length - off.length} more match their baseline</p> : null}</Card>; })}</div>
          <p className="wk-note">A report is evidence that a person observed something; Assurance does not turn it into a measurement, it shows whether one agrees. Each dimension is read from the room’s records; nothing is measured.</p>
        </Card>
        <Card icon="route" title="What this room depends on" sub="Change impact: what a change here reaches" testId="as-deps">
          <List label="Dependencies">
            <ListRow title={`${buildingByKey(r.outline.building)?.short} floor ${r.outline.floor} access switch`} sub={`${plural(allRecords().filter((x) => x.outline.building === r.outline.building && x.outline.floor === r.outline.floor).length, 'room')} on this floor share it`} href={openable(perspective, '#/assurance/change') ? `#/assurance/change?room=${r.outline.id}` : undefined} chevron />
            <ListRow title={`The layout of ${shortName(r.outline)}`} sub={`Where people sit decides what ${r.positions.filter((p) => p.cat === 'camera').length} cameras and ${r.positions.filter((p) => /mic/.test(p.cat)).length} microphones cover`} />
            <ListRow title={`${r.archetypeName} standard`} sub={`${plural(allRecords().filter((x) => x.outline.archetype === r.outline.archetype).length, 'room')} of this archetype on the campus`} />
          </List>
        </Card>
      </> : null}
      {view === 'ready' ? (() => { const rc = readyCheckOf(r, w.incidents); const s = nextSession(r, w); return <Card icon="check" title="Room ready check" sub={`Eleven checks before the next session · ${s.title} at ${s.at}${s.generated ? ' (generated)' : ' (booked)'}`} testId="as-ready" action={<Chip small tone={READY_OUT[rc.out].tone}>{READY_OUT[rc.out].label}</Chip>}><List label="Ready checks">{rc.checks.map((c) => <ListRow key={c.key} title={c.label} sub={c.why} trailing={<Tag tone={c.out === 'na' ? 'muted' : READY_OUT[c.out].tone}>{c.out === 'na' ? 'Not in this room' : READY_OUT[c.out].label}</Tag>} />)}</List><p className="wk-note">{rc.evidence}% of this room’s applicable tests are verified · {rc.crit.toLowerCase()} room. {READY_OUT[rc.out].rule}</p></Card>; })() : null}
      {view === 'recommission' ? <Recommission r={r} /> : null}
      {view === 'history' ? <Card icon="book" title="Baseline history" sub={plural(r.baselines.length, 'version')} testId="as-history"><List label="Baselines">{r.baselines.map((b) => <ListRow key={b.version} title={`Baseline v${b.version} · ${b.state.toLowerCase().replace('_', ' ')}`} sub={`${ymd(b.at)} · design revision ${b.revision} · ${b.by?.replace(/_/g, ' ') || 'unsigned'} · ${b.note}`} trailing={<Tag tone={b.state === 'CURRENT' ? 'ok' : b.state === 'PENDING_ACCEPTANCE' ? 'warn' : 'muted'}>{b.state === 'CURRENT' ? 'Current' : b.state === 'PENDING_ACCEPTANCE' ? 'Pending' : 'Superseded'}</Tag>} />)}</List>
        <h3 className="ln-h3">Runs in this demo</h3><ul className="ln-log">{w.events.filter((e) => e.type === 'assurance.run' && e.aggregate === r.outline.id).slice(0, 10).map((e, i) => <li key={i}>{ymd(e.at)} · {personaLabel(e.by)} · {e.detail}</li>)}</ul>{!w.events.some((e) => e.type === 'assurance.run' && e.aggregate === r.outline.id) ? <p className="ui-meta">No run recorded in this browser.</p> : null}</Card> : null}
      <ExportMenu testId="as-export" title="Assurance report" sub={`${shortName(r.outline)} against its commissioned baseline, as six files`} by={persona}
        make={() => asPackage(r, w.incidents, { role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' })} />
      <Foot>Simulated discovery, modelled, not measured; a prototype, not production monitoring.</Foot>
    </section>
  );
}
function Recommission({ r }: { r: RoomRecord }) {
  const { apply, refusal } = useWorkspace(); const [step, setStep] = useState(1); const [scope, setScope] = useState<'affected' | 'all'>('affected');
  const cur = r.baselines.find((b) => b.state === 'CURRENT'); const ph = phaseStats(r); const affected = new Set(r.reopened.map((x) => rowsOf(r).find((t) => t.id === x.testId)?.phase).filter(Boolean));
  const steps = ['Select scope', 'Run affected commissioning checks', 'Review exceptions', 'Engineer approves', 'Archive previous baseline', 'Create new baseline', 'Create lifecycle event'];
  return <Card icon="route" title={`Recommission ${shortName(r.outline)}`} sub={`Seven steps · step ${step} of 7 · ${cur ? `baseline v${cur.version} → v${cur.version + 1}` : 'no baseline to supersede'}`} testId="as-recommission">
    <ol className="cx-steps">{steps.map((s, i) => <li key={s} className={i + 1 === step ? 'now' : ''}>{s}</li>)}</ol>
    {step === 1 ? <>
      <p className="ln-p">{r.reopened.length ? `${plural(affected.size, 'phase')} affected by the ${plural(r.reopened.length, 'reopened test')}: ${r.reopened[0]!.reasons[0]}.` : 'Nothing has changed since the baseline: every phase can be carried over, and recommissioning has nothing to run.'}</p>
      <div className="ln-tags" role="group" aria-label="Scope"><Chip small selected={scope === 'affected'} onClick={() => setScope('affected')}>Affected checks only</Chip><Chip small selected={scope === 'all'} onClick={() => setScope('all')}>All five phases</Chip></div>
      <List label="Phases">{ph.map((p) => <ListRow key={p.n} title={`${p.name} · ${plural(p.rows.length, 'item')}`} sub={affected.has(p.n) || scope === 'all' ? 'Run again' : 'Unchanged: can be carried over'} trailing={<Tag tone={affected.has(p.n) || scope === 'all' ? 'warn' : 'ok'}>{affected.has(p.n) || scope === 'all' ? 'Run again' : 'Carry over'}</Tag>} />)}</List>
      <button type="button" className="ui-btn ui-btn--primary" onClick={() => setStep(2)} data-testid="rc-next">Continue to the checks</button>
    </> : <>
      <Notice tone="info">Step {step}: {steps[step - 1]}. {step === 2 ? 'The affected checks need their evidence recorded in the room; this demonstration never measures one.' : 'This step follows the recorded evidence of step 2.'}</Notice>
      {refusal ? <div role="alert"><Notice tone="bad"><b>Refused.</b> {refusal.why.join(' ')}</Notice></div> : null}
      <div className="ui-row"><button type="button" className="ui-btn" onClick={() => setStep(1)}>Back to scope</button><button type="button" className="ui-btn ui-btn--primary" data-testid="rc-run" onClick={() => apply((x) => { x.events.unshift({ at: new Date().toISOString(), by: 'engine', type: 'assurance.recommission_refused', aggregate: r.outline.id, detail: `recommissioning step 2 refused: the affected checks need evidence recorded in the room; nothing here measures one`, outcome: 'DENIED' }); return S.refused(['The affected checks need their evidence recorded in the room. Nothing in this demonstration measures a room, so the run is refused and the baseline stays as it is.']); })}>Run the affected checks · simulated</button></div>
    </>}
  </Card>;
}

// ------------------------------------------------------------------------------------------------------------ the Known Fix library
export function KnownFixesPage({ perspective }: { perspective: string }) {
  const { w } = useWorkspace();
  const closed = w.incidents.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.state));
  const fixOf = (i: S.Incident) => { const t = i.title.toLowerCase(); const k = /firmware/.test(t) ? 0 : /wireless|microphone/.test(t) ? 1 : /cable|projector|blank/.test(t) ? 2 : /drift|config|echo/.test(t) ? 3 : /switch|network|call|drop/.test(t) ? 4 : /power|outlet|storm/.test(t) ? 5 : /restart|warm|heat/.test(t) ? 6 : /booking|schedul/.test(t) ? 9 : /display|standby|camera|video/.test(t) ? 8 : 7; return V.KNOWN_FIXES[Math.min(k, V.KNOWN_FIXES.length - 1)]!; };
  const applied = closed.map((i) => ({ i, f: fixOf(i) }));
  const byFix = V.KNOWN_FIXES.map((f, k) => ({ k, f, n: applied.filter((a) => a.f === f).length, open: w.incidents.filter((i) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(i.state) && fixOf(i) === f).length, hours: applied.filter((a) => a.f === f && a.i.restoredAt).map((a) => (Date.parse(a.i.restoredAt!) - Date.parse(a.i.openedAt)) / 36e5) })).sort((a, b) => b.n - a.n);
  const doms = [...new Set(applied.map((a) => V.ROOT_CAUSES[a.f[1]]?.[0] || 'Other'))].map((d) => ({ d, n: applied.filter((a) => (V.ROOT_CAUSES[a.f[1]]?.[0] || 'Other') === d).length }));
  const wk = weekCounts(closed, (i) => i.closedAt || i.restoredAt);
  return (
    <section className="wk cx" data-native="workspace" data-testid="known-fixes">
      <PageHero product="servicehands" icon="wrench" compact eyebrow="Service · Known Fix library" title="Known fixes" lede={<>Proven fixes, measured against the issues they closed. A fix comes before an escalation whenever one matches and has not been tried. {plural(closed.length, 'issue')} on record were closed; each is matched to the library fix its title names. Acting as <b>{personaLabel(personaOf(perspective))}</b>.</>} meta={[<Chip key="s" small tone="muted">Synthetic service records</Chip>]} />
      <div className="kit-grid kit-grid--tiles wk-tiles4">
        <StatTile label="Known fixes" value={V.KNOWN_FIXES.length} icon="book" tone="servicehands" hint="From V2.5.3’s library, unchanged" />
        <StatTile label="Times applied" value={applied.length} icon="check" tone="ok" spark={wk} hint="Closed issues matched to a fix" />
        <StatTile label="Open now" value={w.incidents.filter((i) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(i.state)).length} icon="ticket" tone="warn" hint="Issues a fix may still close" />
        <StatTile label="Median time to restore" value={(() => { const h = applied.filter((a) => a.i.restoredAt).map((a) => (Date.parse(a.i.restoredAt!) - Date.parse(a.i.openedAt)) / 36e5).sort((x, y) => x - y); return h.length ? Math.round(h[Math.floor((h.length - 1) / 2)]!) : null; })()} unit="h" icon="clock" tone="muted" hint="Of the issues a fix closed" />
      </div>
      <div className="wk-g2">
        <Card icon="chart" title="Applied, by root cause" sub={`${applied.length} uses`}>{applied.length ? <Donut label="Fixes applied by root cause" segments={doms.map((x, i) => ({ key: x.d, label: x.d, value: x.n, tone: (['servicehands', 'info', 'ok', 'warn', 'indigo', 'violet'] as Series[])[i % 6]! }))} total="uses" /> : <EmptyState title="No closed issue yet" />}</Card>
        <Card icon="menu" title="The library" sub="Most used first · steps as the library records them" testId="fix-library">
          <List label="Known fixes">{byFix.map(({ k, f, n, open, hours }) => <ListRow key={k} title={`KF-${String(k + 1).padStart(2, '0')} · ${f[0]}`} sub={<>Usually for: {V.ROOT_CAUSES[f[1]]?.[0]}<span className="wk-r__m">{f[2].join(' · ')}</span></>} trailing={<span className="ui-meta">{n ? `applied ${n}×` : 'not yet applied'}{hours.length ? ` · ${Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)} h` : ''}{open ? ` · ${open} open` : ''}</span>} />)}</List>
        </Card>
      </div>
      <Foot>Success rates are not shown: this demonstration records closures, not the outcome of each fix, and does not invent one.</Foot>
    </section>
  );
}
void pct; void ProgressBar; void Icon; void ScoreRing; void AssuranceTabs; void CxTabs;

// ------------------------------------------------------------------------------------------------------------ V2.5.3's four states and its change cards
/** The furnished room (V2.5.3's own drawing) in the four states, chosen here; a tapped piece of equipment opens in Lite. */
function FourStates({ r, perspective }: { r: RoomRecord; perspective: string }) {
  const [st, setSt] = useState<V253State>('current'); const [pick, setPick] = useState<V253Pick | null>(null);
  const role = perspective as RoleKey; const lens: Lens = 'engineer'; const lite = `#/lite/room/${r.outline.id}?mode=engineer${st !== 'current' ? `&state=${st}` : ''}`;
  return <div data-testid="as-four-states" data-state={st}>
    <Segmented small label="Which state" value={st} onChange={(v) => { setSt(v); setPick(null); }} options={[{ value: 'designed', label: 'Designed' }, { value: 'commissioned', label: 'Commissioned' }, { value: 'current', label: 'Current' }, { value: 'proposed', label: 'Proposed' }]} />
    <div className="as-stage"><V253RoomStage roomId={r.outline.id} lens={lens} state={st} layers={new Set(['furniture', 'av'])} overlays={new Set(['camera', 'mic'])} role={role} label={`${fullName(r.outline)} in 3D, ${st}`} sel={pick?.obj.id ?? null} onPick={setPick} /></div>
    <p className="ui-meta" data-testid="as-four-note">{st === 'current' ? 'What exists now: a device with an open issue is marked where it stands.' : st === 'commissioned' ? 'What was proven at handover.' : st === 'designed' ? 'What was planned.' : 'What is being proposed: added positions are marked.'} Modelled, not measured. {pick ? <>Selected: <b>{pick.obj.label || pick.obj.kind}</b>{opensFor(role)(lite) ? <> · <a href={`${lite}${pick.code ? `&device=${encodeURIComponent(pick.code)}` : ''}`} data-testid="as-open-lite">open it in Lite</a></> : null}</> : opensFor(role)(lite) ? <a href={lite}>Open this state in Lite</a> : null}</p>
  </div>;
}
/**
 * V2.5.3's "Commissioned ↔ current": one card per value that changed since handover, with what it was, what it is, what the change does
 * and what is recommended, read from the record (a moved layout, a replaced unit, an open issue). Restoring is simulated: it is noted in
 * the ledger as a request, and nothing in the room changes.
 */
function ChangeCards({ r, perspective }: { r: RoomRecord; perspective: string }) {
  const { apply } = useWorkspace(); const persona = personaOf(perspective); const [done, setDone] = useState<Record<string, boolean>>({});
  const cards = changeCards(r);
  return <Card icon="layers" title="Commissioned ↔ current" sub={cards.length ? `${plural(cards.length, 'value')} changed since handover` : 'Nothing changed since handover'} testId="as-changes">
    {cards.length ? <div className="as-dcs">{cards.map((c) => <article key={c.id} className="as-dc" data-testid="as-change">
      <h3>{c.what} <Tag tone="muted">{c.dim}</Tag></h3>
      <div className="as-dc__ba"><div><span>Commissioned</span><b>{c.before}</b></div><div className="now"><span>Current</span><b>{c.now}</b></div></div>
      <p className="ui-meta"><b>Difference.</b> {c.diff}</p>
      <div className="ui-row"><span className="ui-meta"><b>Recommendation.</b> {c.rec}</span>{holds(persona, 'assure.run') || holds(persona, 'tests.verify.all') ? <button type="button" className="ui-btn ui-btn--sm" disabled={done[c.id]} data-testid={`as-restore-${c.id}`} onClick={() => { setDone((d) => ({ ...d, [c.id]: true })); apply((x) => { x.events.unshift({ at: new Date().toISOString(), by: persona, type: 'assurance.restore_requested', aggregate: r.outline.id, detail: `${c.rec.toLowerCase()} (${c.what}) requested from Assurance · simulated, nothing in the room changed`, outcome: 'ALLOWED' }); }); }}>{done[c.id] ? 'Requested · simulated' : `${c.rec} · simulated`}</button> : null}</div>
    </article>)}</div> : <p className="ln-p">The current state reads the same as the commissioned one in every value compared here: layout, units and issues.</p>}
  </Card>;
}
