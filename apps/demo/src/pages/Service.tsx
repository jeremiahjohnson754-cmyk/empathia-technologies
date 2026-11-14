/**
 * ServiceHands — incident to service: the manager's queue (triage, hard-gated candidates with an explained ranking, assignment, closure
 * under the customer policy, reopening), the technician's jobs (the context packet read from the estate graph, acceptance, dispatch
 * preflight on the record, field evidence, hand-over for verification) and the independent verification. The machine, the gates and the
 * preflight are @empathia/service-engine; every outcome is in the ledger.
 */
import { useMemo, useState } from 'react';
import { Button, Facts, Notice, Tag, Field, Tabs } from '@empathia/ui';
import { SERVICE_TRANSITIONS, WORK_NEEDS, SLA } from '@empathia/service-engine';
import { neighbourhood, nodeKey, type NodeRef } from '@empathia/search-party';
import { buildEstate } from '../search/estate.js';
import * as S from '../workspace/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel, holds } from '../build/store.js';
import { ExportMenu } from '../export/ExportMenu.js';
import { openable } from './V25Nav.js';
import { serviceQueuePackage, serviceRecordPackage } from '../export/service.js';
const made = (persona: string) => ({ role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' });

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { OPEN: 'warn', TRIAGED: 'info', ASSIGNED: 'info', ACCEPTED: 'info', IN_PROGRESS: 'info', VERIFYING: 'warn', RESOLVED: 'ok', CLOSED: 'muted', REOPENED: 'bad', CANCELLED: 'muted', 'Mission critical': 'bad', High: 'warn', Standard: 'muted' };
const when = (s: string | null) => (s ? s.slice(0, 16).replace('T', ' ') : '—');

export function ServicePage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective);
  const { w, apply, refusal, reset } = useWorkspace();
  const est = useMemo(() => buildEstate(), []);
  const wanted = /[?&]id=([A-Z0-9-]+)/.exec(hash)?.[1] || null;
  const [sel, setSel] = useState<string | null>(wanted || w.incidents[0]?.id || null);
  const inc = w.incidents.find((i) => i.id === sel) || null;
  const me = S.techForPersona(persona);
  const isTech = !!me;
  const [tab, setTab] = useState<string>(isTech ? 'mine' : 'queue');
  const open = w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state));
  const mine = open.filter((i) => i.workOrderId && S.workOrderOf(w, i.workOrderId)?.techId === me);
  const list = tab === 'mine' ? mine : tab === 'closed' ? w.incidents.filter((i) => ['CLOSED', 'CANCELLED'].includes(i.state)) : open;
  return (
    <section className="svc">
      <header className="build__head">
        <div><p className="kicker">ServiceHands · incident to service</p><h1>{isTech ? 'Assigned jobs and the sites you cover' : 'Service queue'}</h1>
          <p className="ui-muted">Acting as <b>{personaLabel(persona)}</b>{me ? <> ({S.techOf(w, me)?.name})</> : null}. {isTech ? 'Field evidence is yours to record; acceptance is someone else’s.' : 'People are hard-gated (certifications valid, experience, licences, site access, availability, capacity, vendor coverage) before any ranking, and the ranking explains itself.'}</p></div>
        <div className="build__state"><Tag tone="muted">{open.length} open</Tag><Button small kind="quiet" onClick={reset} title="Returns every incident, job and case of this browser to the seed">Reset workspace</Button></div>
      </header>
      {openable(perspective as never, '#/v25/service/analytics') ? <p className="svc__practice" data-testid="svc-analytics-link"><a href="#/v25/service/analytics">Service analytics</a>: the trend by month and quarter, by building and project, and the vendor scorecard.</p> : null}
      <p className="svc__practice" data-testid="svc-practice">Practise before the call: <a href="#/labs/mix">Mix the Stream</a>, SIGNAL’s flagship mixing lab (a 32-channel console, five church rooms, wedges, fills and a live stream). Practice only: it records nothing on a job.</p>
      {refusal && <div role="alert"><Notice tone="bad"><b>Refused.</b><ul className="build__why">{refusal.why.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
      <Tabs label="Service views" active={tab} onChange={setTab} tabs={[...(isTech ? [{ key: 'mine', label: 'Assigned to me', count: mine.length }] : []), { key: 'queue', label: 'Queue', count: open.length }, { key: 'closed', label: 'Closed', count: w.incidents.length - open.length }]} />
      <div className="svc__grid">
        <ul className="svc__list" data-testid="incidents">
          {list.map((i) => <li key={i.id} className={i.id === sel ? 'on' : ''}><a href={`#/v25/service?id=${i.id}`} onClick={(e) => { e.preventDefault(); setSel(i.id); }}><Tag tone={TONE[i.state]}>{i.state}</Tag> <b>{i.title}</b><span className="ui-meta">{i.id} · {i.roomName} · <Tag tone={TONE[i.severity]}>{i.severity}</Tag>{i.recurrenceOf ? ` · recurrence of ${i.recurrenceOf}` : ''}</span></a></li>)}
          {!list.length && <li className="ui-meta">Nothing here.</li>}
        </ul>
        <div className="svc__detail">{inc ? <Incident inc={inc} w={w} apply={apply} persona={persona} me={me} est={est} /> : <Notice tone="info">Pick an incident.</Notice>}</div>
      </div>
      {inc ? <ExportMenu testId="sh-record-export" title="Service record" by={personaLabel(persona)} sub={`${inc.id}: its history, the work order, the preflight, the field evidence and where it went next`} make={() => serviceRecordPackage(w, inc.id, made(persona))!} /> : null}
      <ExportMenu testId="sh-export" title="Service queue report" by={personaLabel(persona)} sub="Every request and work order, drilled up by building and severity, as six files" make={() => serviceQueuePackage(w, made(persona))} />
      <RaiseIncident persona={persona} apply={apply} />
    </section>
  );
}

function Incident({ inc, w, apply, persona, me, est }: { inc: S.Incident; w: S.Workspace; apply: ReturnType<typeof useWorkspace>['apply']; persona: string; me: string | null; est: ReturnType<typeof buildEstate> }) {
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  const tech = S.techOf(w, wo?.techId || null);
  const next = SERVICE_TRANSITIONS.filter((t) => t.from === inc.state);
  const packet = useMemo(() => contextPacket(est, inc.roomId), [est, inc.roomId]);
  const cands = wo ? S.candidatesFor(w, wo.id) : null;
  const [sev, setSev] = useState<S.Incident['severity']>(inc.severity);
  const [pf, setPf] = useState({ access: true, safety: true, heightPermit: true, tools: [] as string[] });
  const [evKind, setEvKind] = useState('photo'); const [evNote, setEvNote] = useState('');
  const [confirmed, setConfirmed] = useState(false); const [reopenWhy, setReopenWhy] = useState('');
  const needs = wo ? WORK_NEEDS[wo.workType] || WORK_NEEDS['break_fix']! : null;
  const preview = wo && inc.state === 'ACCEPTED' ? S.preflightFor(w, wo.id, pf) : null;
  return (
    <div className="stack" data-testid="incident">
      <h2 className="build__h">{inc.title} <Tag tone={TONE[inc.state]}>{inc.state}</Tag></h2>
      <p>{inc.summary}</p>
      <Facts items={[['Room', `${inc.roomName} (${inc.roomId})`], ['Severity · SLA', `${inc.severity} · ${SLA[inc.severity].respond}, restore ${SLA[inc.severity].restore}`], ['Opened', when(inc.openedAt)], ['Work order', wo ? `${wo.id} · ${wo.workType.replace(/_/g, ' ')} · ${wo.state}` : 'none yet'], ['Technician', tech?.name || '—'], ['Verified by', inc.verifiedBy ? personaLabel(inc.verifiedBy) : '—']]} />
      <details className="svc__packet" open={!!me}><summary>Context packet — read from the model, not polled</summary>
        <Facts items={[['Devices', packet.devices.length ? packet.devices.join(', ') : 'none recorded'], ['Access switch', packet.switch || 'none recorded'], ['Uplink', packet.uplink || 'none recorded'], ['Rooms sharing the switch', packet.sharing.length ? packet.sharing.join(', ') : 'none'], ['Power', packet.power || 'none recorded'], ['Evidence freshness', 'edges carry their provenance and date (synthetic collector export 2026-10-28)']]} />
        {me && <p className="ui-meta">Devices are listed minimised for a technician: no cost, no finance.</p>}
      </details>
      {wo && (inc.state === 'ASSIGNED' || inc.state === 'ACCEPTED') && needs && (() => {
        const pv = S.preflightFor(w, wo.id, pf); const booking = pv?.checks.find((c) => c.id === 'booking');
        const stale = needs.parts.filter((pt) => S.stockOf(w, pt).stale); const canPlan = holds(persona, 'service.assign'); const canStock = canPlan || holds(persona, 'work.start');
        if (booking?.ok && !stale.length) return null;
        return <div className="card stack" data-testid="dispatch-plan"><h3 className="build__h">Dispatch planning</h3>
          {!booking?.ok && <div className="build__row"><span>{booking?.why}</span>{canPlan ? <Button small onClick={() => apply((x) => S.replanWindow(x, persona, inc.id))}>Propose the next free window</Button> : <span className="ui-meta">a Service Manager re-plans the window (service.assign)</span>}</div>}
          {stale.map((pt) => <div key={pt} className="build__row"><span>{pt}: stock check {S.stockOf(w, pt).ageDays} days old</span>{canStock ? <Button small onClick={() => apply((x) => S.recheckStock(x, persona, inc.id, pt))}>Recheck stock</Button> : <span className="ui-meta">the manager or the assigned technician rechecks it</span>}</div>)}
          <p className="ui-meta">The calendar and the stock are synthetic records on this page; nothing is booked or counted anywhere else.</p>
        </div>;
      })()}
      <div className="card stack"><h3 className="build__h">Next governed step{next.length === 1 ? '' : 's'}</h3>
        {next.map((t) => <div key={t.to} className="svc__step"><b>{inc.state} → {t.to}</b> <span className="ui-meta">{t.authority} · guard {t.guard}</span>
          {!holds(persona, t.authority) ? <span className="ui-meta"> · not your authority</span> : (
            <div className="stack">
              {t.to === 'TRIAGED' && <div className="build__row"><label className="ui-muted" htmlFor="sv-sev">Severity</label><select id="sv-sev" value={sev} onChange={(e) => setSev(e.target.value as never)}>{Object.keys(SLA).map((s) => <option key={s}>{s}</option>)}</select><Button small kind="primary" onClick={() => apply((x) => S.triage(x, persona, inc.id, sev))}>Triage</Button></div>}
              {t.to === 'ASSIGNED' && cands && <Candidates c={cands} onAssign={(id) => apply((x) => S.assign(x, persona, inc.id, id))} />}
              {t.to === 'ASSIGNED' && !cands && <Button small kind="primary" onClick={() => apply((x) => S.assign(x, persona, inc.id, w.staff[0]!.id))}>Open a work order and rank the pool</Button>}
              {t.to === 'ACCEPTED' && <Button small kind="primary" onClick={() => apply((x) => S.accept(x, persona, inc.id))}>Accept the job{tech && tech.id !== me ? ` (assigned to ${tech.name})` : ''}</Button>}
              {t.to === 'IN_PROGRESS' && preview && needs && <div className="stack" data-testid="preflight">
                <label className="check"><input type="checkbox" checked={pf.access} onChange={(e) => setPf({ ...pf, access: e.target.checked })} /> Site access confirmed by facilities / the site champion</label>
                <label className="check"><input type="checkbox" checked={pf.safety} onChange={(e) => setPf({ ...pf, safety: e.target.checked })} /> Safety brief acknowledged</label>
                {needs.certs.includes('lic.working_at_height') && <label className="check"><input type="checkbox" checked={pf.heightPermit} onChange={(e) => setPf({ ...pf, heightPermit: e.target.checked })} /> Working-at-height permit</label>}
                <div className="ui-meta">Tools: {needs.tools.map((tl) => <label key={tl} className="check inline"><input type="checkbox" checked={pf.tools.includes(tl)} onChange={(e) => setPf({ ...pf, tools: e.target.checked ? [...pf.tools, tl] : pf.tools.filter((x) => x !== tl) })} /> {tl}</label>)}</div>
                <ul className="svc__checks">{preview.checks.map((c) => <li key={c.id}><Tag tone={c.ok ? 'ok' : 'bad'}>{c.ok ? 'ok' : 'blocked'}</Tag> <b>{c.label}</b> <span className="ui-meta">{c.why}</span></li>)}</ul>
                <Button small kind="primary" onClick={() => apply((x) => S.start(x, persona, inc.id, pf))}>Start the work{preview.ok ? '' : ' (preflight blocks)'}</Button></div>}
              {t.to === 'VERIFYING' && wo && <div className="stack">
                <div className="build__row"><select aria-label="Evidence kind" value={evKind} onChange={(e) => setEvKind(e.target.value)}>{['photo', 'measurement', 'configuration snapshot', 'test content'].map((k) => <option key={k}>{k}</option>)}</select><input aria-label="Evidence note" value={evNote} onChange={(e) => setEvNote(e.target.value)} placeholder="what was observed or changed (synthetic)" /><Button small onClick={() => { if (!isRef(apply((x) => S.recordEvidence(x, persona, inc.id, evKind, evNote)))) setEvNote(''); }}>Record evidence</Button></div>
                {wo.evidence.length > 0 && <ul className="plain">{wo.evidence.map((e, i) => <li key={i}><Tag tone="muted">{e.kind}</Tag> {e.note} <span className="ui-meta">{when(e.at)}</span></li>)}</ul>}
                <Button small kind="primary" onClick={() => apply((x) => S.submitForVerification(x, persona, inc.id))}>Hand over for independent verification ({wo.evidence.length} evidence)</Button></div>}
              {t.to === 'RESOLVED' && <Button small kind="primary" onClick={() => apply((x) => S.verify(x, persona, inc.id))}>Verify the repair{tech && tech.id === me ? ' (you did the work)' : ''}</Button>}
              {t.to === 'CLOSED' && <div className="build__row"><label className="check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> The requester confirmed the fix{inc.severity !== 'Standard' ? ' (required by the customer policy for this severity)' : ''}</label><Button small kind="primary" onClick={() => apply((x) => S.close(x, persona, inc.id, confirmed))}>Close</Button></div>}
              {t.to === 'REOPENED' && <div className="build__row"><input aria-label="Reopen reason" value={reopenWhy} onChange={(e) => setReopenWhy(e.target.value)} placeholder="recurrence or failed verification" /><Button small onClick={() => apply((x) => S.reopen(x, persona, inc.id, reopenWhy))}>Reopen</Button></div>}
            </div>)}
        </div>)}
        {!next.length && <p className="ui-meta">No further governed step from {inc.state}.</p>}
      </div>
      {wo?.preflight && <details><summary>Dispatch preflight on the record</summary><ul className="svc__checks">{wo.preflight.map((c) => <li key={c.id}><Tag tone={c.ok ? 'ok' : 'bad'}>{c.ok ? 'ok' : 'blocked'}</Tag> <b>{c.label}</b> <span className="ui-meta">{c.why}</span></li>)}</ul></details>}
      <div className="svc__links"><a href={`#/v25/apex?incident=${inc.id}`}>APEX diagnosis{inc.apexId ? ` (${inc.apexId})` : ''}</a> · <a href={`#/search?focus=Room:${inc.roomId}`}>Search Party</a>{inc.learnCaseId ? <> · <a href={`#/v25/learn?case=${inc.learnCaseId}`}>Learn case {inc.learnCaseId}</a></> : null}</div>
      <details><summary>History ({inc.history.length})</summary><ul className="plain">{inc.history.map((h, i) => <li key={i}><Tag tone={TONE[h.to]}>{h.to}</Tag> {when(h.at)} · {w.staff.find((s) => s.id === h.by)?.name || personaLabel(h.by)}</li>)}</ul></details>
    </div>
  );
}
const isRef = (r: unknown) => !!r && typeof r === 'object' && 'why' in (r as object);

function Candidates({ c, onAssign }: { c: NonNullable<ReturnType<typeof S.candidatesFor>>; onAssign: (id: string) => void }) {
  return (
    <div className="stack" data-testid="candidates">
      <p className="ui-meta">Needs: {c.need.certs.join(', ')}; experience {Object.entries(c.need.experience).map(([k, v]) => `${k} ${v}`).join(', ')}; tools {c.need.tools.join(', ')}.</p>
      {c.none && <Notice tone="warn">{c.whyNone}</Notice>}
      <ul className="svc__cands">{c.eligible.map((p, i) => <li key={p.id}><b>{i + 1}. {p.name}</b> <Tag tone="ok">eligible · {p.score}</Tag> <span className="ui-meta">{p.reasons.join(' · ')}</span> <Button small kind={i === 0 ? 'primary' : 'secondary'} onClick={() => onAssign(p.id)}>Assign</Button></li>)}
        {c.ineligible.map((p) => <li key={p.id} className="off"><b>{p.name}</b> <Tag tone="bad">hard gate</Tag> <span className="ui-meta">{p.hardFails.join(' · ')}</span> <Button small kind="quiet" onClick={() => onAssign(p.id)} title="The engine refuses this; try it to see the refusal in the ledger">Try anyway</Button></li>)}</ul>
    </div>
  );
}

function RaiseIncident({ persona, apply }: { persona: string; apply: ReturnType<typeof useWorkspace>['apply'] }) {
  const [f, setF] = useState({ roomId: 'R-ATL-4-220', title: '', summary: '' });
  const rooms: Array<[string, string, string]> = [['R-ATL-4-218', 'Atlas 4.218 Boardroom', 'ATL'], ['R-ATL-4-220', 'Atlas 4.220 Huddle', 'ATL'], ['R-ATL-4-231', 'Atlas 4.231 Training', 'ATL'], ['R-NST-2-101', 'Northstar Town Hall', 'NST']];
  if (!holds(persona, 'request.submit') && !holds(persona, 'service.triage') && !holds(persona, 'work.evidence')) return null;
  return (
    <details className="card"><summary>Report a problem in a room</summary>
      <div className="build__row"><select aria-label="Room" value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>{rooms.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select><input aria-label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="what people experience" /><input aria-label="Summary" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="when, how often, who noticed" /><Button small kind="primary" onClick={() => { const r = rooms.find((x) => x[0] === f.roomId)!; if (!isRef(apply((x) => S.raiseIncident(x, persona, { roomId: r[0], roomName: r[1], buildingKey: r[2], title: f.title, summary: f.summary })))) setF({ ...f, title: '', summary: '' }); }}>Raise</Button></div>
    </details>
  );
}

/** The ServiceHands context packet: devices, the switch that feeds them, its uplink, the other rooms on the same switch, power — recorded edges only. */
export function contextPacket(est: ReturnType<typeof buildEstate>, roomId: string) {
  const room: NodeRef = { type: 'Room', id: roomId };
  const label = (n: NodeRef) => est.nodes.find((x) => nodeKey(x) === nodeKey(n))?.label || n.id;
  const roomOf = (dev: NodeRef) => est.edges.find((e) => (e.rel === 'PLANS_DEVICE' || e.rel === 'HAS_DEVICE') && nodeKey(e.to) === nodeKey(dev))?.from || null;
  const devs = est.edges.filter((e) => (e.rel === 'PLANS_DEVICE' || e.rel === 'HAS_DEVICE') && nodeKey(e.from) === nodeKey(room)).map((e) => e.to);
  const sw = est.edges.find((e) => e.rel === 'FEEDS' && e.from.type === 'NetworkNode' && devs.some((d) => nodeKey(d) === nodeKey(e.to)))?.from || null;
  const uplink = sw ? est.edges.find((e) => e.rel === 'FEEDS' && nodeKey(e.to) === nodeKey(sw))?.from || null : null;
  const sharing = sw ? [...new Set(est.edges.filter((e) => e.rel === 'FEEDS' && nodeKey(e.from) === nodeKey(sw)).map((e) => roomOf(e.to)).filter((r): r is NodeRef => !!r && r.id !== roomId).map(label))] : [];
  const power = sw ? est.edges.find((e) => e.rel === 'POWERED_BY' && nodeKey(e.from) === nodeKey(sw))?.to || null : null;
  void neighbourhood;
  return { devices: devs.map(label), switch: sw ? label(sw) : null, uplink: uplink ? label(uplink) : null, sharing, power: power ? label(power) : null };
}
