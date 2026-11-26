/**
 * A room in service: what goes wrong in it, and what the records of that add up to (founder, 17 Nov 2026, 19:05: "prioritize
 * operational incident intelligence"; ADR-0015).
 *
 * Once a room is accepted, a fault is an incident of the room: reported by anyone who can see the room, never edited afterwards,
 * worked by the people whose work it is, confirmed by its reporter, closed by someone who neither fixed nor confirmed it. Whether an
 * incident repeats an earlier one is worked out by the database when it is written; nobody says so here.
 *
 * Everything on this card is the server's: the vocabulary of the form, the status of each incident, the repeat it names, the counts,
 * the room's status. Every button is one request as the person chosen at the top of the page, and a refusal is shown in the server's
 * words. The work itself is the same ServiceHands work order a deficiency gets (ServiceWork): the server's work order does not know
 * which kind of issue it is on.
 */
import { useState } from 'react';
import { Card, Tag, Notice } from '@empathia/ui';
import { ServiceWork, type Answer, type Cred, type Said, type Tools, type WorkOrder } from './CorrectiveAction.js';

export interface Catalogue { issueTypes: Record<string, string>; domains: string[]; detectedDuring: string[]; userImpacts: string[]; resolutionTypes: string[]; severities: string[]; rootCauses: string[]; recurrenceDays: number }
export interface Incident { incident: string; status: string; workflow: string; issueType: string; issueTypeName: string; domain: string; severity: string; title: string; description: string; detectedDuring: string; userImpact: string;
  device: string | null; reportedBy: string; reportedRole: string; reportedAt: string; youReported: boolean; repeats: string | null; blocked: { reason: string; since: string } | null; escalated: { reason: string; at: string } | null;
  ownerRole: string | null; targetDate: string | null; rootCause: string | null; correctiveAction: string | null; resolutionType: string | null; resolvedAt: string | null; confirmation: { result: string; evidence: string } | null; hoursToResolve: number | null; workOrders: string[] }
export interface Intelligence { period: { days: number }; totals: { incidents: number; open: number; blocked: number; awaitingConfirmation: number; closed: number; repeats: number; escalated: number; resolved: number; meanHoursToResolve: number | null; medianHoursToResolve: number | null };
  byIssueType: Array<{ key: string; name?: string; incidents: number; open: number; repeats: number; resolved: number }>; rooms: Array<{ room: string; name: string; status: string; why: string; open: number; incidents: number }>; basis: string }
export interface IncidentData { items: Incident[]; catalogue: Catalogue | null; intelligence: Intelligence | null; work: Record<string, WorkOrder | null> }
interface Dev { id: string; label: string; furniture?: boolean }

const words = (x: string) => x.replace(/_/g, ' ').toLowerCase();
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const when = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted'> = { DOWN: 'bad', DEGRADED: 'bad', ATTENTION: 'warn', NO_OPEN_INCIDENT: 'ok', OPEN: 'bad', IN_PROGRESS: 'warn', BLOCKED: 'bad', AWAITING_CONFIRMATION: 'warn', CLOSED: 'ok', DEFERRED: 'muted' };
const hours = (h: number | null) => (h === null ? 'not yet' : h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h * 10) / 10} h`);
const WORK = { raise: 'handed over from the service desk (synthetic)', scope: 'Find and correct the fault reported (synthetic)', risk: 'The room is in service; its users are affected until it is corrected (synthetic)', evidence: 'Fault found and corrected; the room checked afterward (synthetic)' };

function One({ x, wo, creds, cat, t }: { x: Incident; wo: WorkOrder | null; creds: Cred[]; cat: Catalogue; t: Tools }) {
  const [owner, setOwner] = useState('service'); const [due, setDue] = useState(inDays(3)); const [cause, setCause] = useState(cat.rootCauses[0] || ''); const [how, setHow] = useState(cat.resolutionTypes[0] || '');
  const [action, setAction] = useState('Fault found and corrected (synthetic)'); const [note, setNote] = useState(''); const [why, setWhy] = useState('');
  const I = `/v1/incidents/${x.incident}`; const open = !['CLOSED', 'DEFERRED'].includes(x.status);
  const go = (label: string, what: string, run: () => Promise<Answer>, ok: Said) => t.act(label, async () => { const a = await run(); return a.ok ? ok : t.refused(a, what); });
  const step = (body: Record<string, unknown>) => () => t.call('POST', `${I}/steps`, body);
  const btn = (id: string, label: string, onClick: () => void, primary = false, disabled = false) => <button type="button" className={`ui-btn ui-btn--sm${primary ? ' ui-btn--primary' : ''}`} data-testid={id} disabled={t.busy || disabled} onClick={onClick}>{label}</button>;
  return (
    <li className="in__one" data-incident={x.incident} data-status={x.status} data-repeats={x.repeats || ''} data-wo={x.workOrders[0] || ''}>
      <p className="in__head"><span className="ui-mono">{x.incident}</span> <Tag tone={STATUS_TONE[x.status] || 'muted'}>{words(x.status)}</Tag> <Tag tone={x.severity === 'Critical' || x.severity === 'High' ? 'bad' : 'warn'}>{x.severity}</Tag> <b>{x.title}</b></p>
      <p className="ui-meta">{x.issueTypeName} · {x.domain} · found by {words(x.detectedDuring)} · {words(x.userImpact)} · reported by {x.reportedBy} ({when(x.reportedAt)}){x.device ? ` · on ${x.device}` : ''}</p>
      <p className="in__desc">{x.description}</p>
      {x.repeats ? <p data-testid="fl-inc-repeat"><Tag tone="warn">repeat</Tag> The database found <span className="ui-mono">{x.repeats}</span>: the same kind of incident in this room{x.device ? ', on the same device,' : ''} within {cat.recurrenceDays} days before this one. Nobody typed that.</p> : null}
      {x.blocked ? <p data-testid="fl-inc-blocked"><Tag tone="bad">blocked</Tag> {x.blocked.reason} <span className="ui-muted">since {when(x.blocked.since)}. The correction, the confirmation and the closing wait.</span></p> : null}
      {x.escalated ? <p data-testid="fl-inc-escalated"><Tag tone="warn">escalated</Tag> {x.escalated.reason} <span className="ui-muted">{when(x.escalated.at)}. An escalation is recorded once.</span></p> : null}
      {x.rootCause ? <p className="ui-meta" data-testid="fl-inc-fix">Corrected: {words(x.rootCause)} · {x.correctiveAction}{x.resolutionType ? ` · resolved by ${words(x.resolutionType)}` : ' · the earlier resolution no longer stands'} · {hours(x.hoursToResolve)} from the report{x.confirmation ? ` · ${x.confirmation.evidence}` : ''}</p> : null}

      {open ? <div className="in__steps">
        {x.workflow === 'OPEN' ? <div className="ca__row"><label className="kit-field">Owner <select value={owner} data-testid="fl-inc-owner" onChange={(e: { target: { value: string } }) => setOwner(e.target.value)}>{t.roles.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <label className="kit-field">By <input type="date" value={due} data-testid="fl-inc-due" onChange={(e: { target: { value: string } }) => setDue(e.target.value)} /></label>
          {btn('fl-inc-start', `Give it an owner as the ${t.person}`, () => void go('Recording the owner…', 'the start of the work', step({ step: 'start', ownerRole: owner, targetDate: due }), { ok: true, title: 'The incident has an owner and a date.', text: 'It is in progress. The work itself is a ServiceHands job, raised below.' }), true)}</div> : null}
        {x.workflow === 'IN_PROGRESS' ? <>
          <div className="ca__row"><label className="kit-field">Root cause <select value={cause} data-testid="fl-inc-cause" onChange={(e: { target: { value: string } }) => setCause(e.target.value)}>{cat.rootCauses.map((k) => <option key={k} value={k}>{words(k)}</option>)}</select></label>
            <label className="kit-field">How it was resolved <select value={how} data-testid="fl-inc-how" onChange={(e: { target: { value: string } }) => setHow(e.target.value)}>{cat.resolutionTypes.map((k) => <option key={k} value={k}>{words(k)}</option>)}</select></label></div>
          <label className="kit-field">What was done <input type="text" value={action} maxLength={500} data-testid="fl-inc-action" onChange={(e: { target: { value: string } }) => setAction(e.target.value)} /></label>
          <p className="build__row">{btn('fl-inc-fixed', `Record the correction as the ${t.person}`, () => void go('Recording the correction…', 'the correction', step({ step: 'fixed', rootCause: cause, action, resolutionType: how }), { ok: true, title: 'The correction is recorded.', text: 'It waits for the confirmation that the room does again what it stopped doing. Whoever fixed it is not asked.' }), true, action.trim().length < 5)}</p></> : null}
        {x.workflow === 'PENDING_RETEST' && x.confirmation?.result !== 'PASS' ? <>
          <label className="kit-field">What was seen <input type="text" value={note} maxLength={500} data-testid="fl-inc-note" placeholder="how it was checked" onChange={(e: { target: { value: string } }) => setNote(e.target.value)} /></label>
          <p className="build__row">{btn('fl-inc-restored', `It works again: confirm as the ${t.person}`, () => void go('Recording the confirmation…', 'the confirmation', step({ step: 'confirm', restored: true, note: note.trim() || 'checked in the room (synthetic)' }), { ok: true, title: 'Confirmed: the room works again.', text: 'Closing is by someone who neither fixed nor confirmed it.' }), true)}
            {btn('fl-inc-not-restored', 'It does not: send it back', () => void go('Recording that it is not fixed…', 'the answer', step({ step: 'confirm', restored: false, note: note.trim() || 'still failing (synthetic)' }), { ok: true, warn: true, title: 'Not restored: the work goes back.', text: 'The earlier resolution no longer stands.' }))}</p>
          <p className="ui-meta">{x.youReported ? 'You reported this one: the confirmation is yours to give.' : `Reported by ${x.reportedBy}: the confirmation is theirs, or the operations lead’s or a commissioning engineer’s.`}</p></> : null}
        {x.workflow === 'PENDING_RETEST' && x.confirmation?.result === 'PASS' ? <p className="build__row">{btn('fl-inc-close', `Close the incident as the ${t.person}`, () => void go('Closing…', 'the closing', step({ step: 'close' }), { ok: true, title: 'The incident is closed.', text: 'It stays on the room’s record, and counts in what the records add up to.' }), true)}</p> : null}
        <div className="ca__row"><label className="kit-field">{x.blocked ? 'Unblock' : 'Blocked, because'} <input type="text" value={why} maxLength={300} data-testid="fl-inc-why" placeholder={x.blocked ? 'not needed to unblock' : 'a reason, or the reason to escalate'} onChange={(e: { target: { value: string } }) => setWhy(e.target.value)} /></label>
          {x.blocked ? btn('fl-inc-unblock', 'Unblock', () => void go('Unblocking…', 'the unblocking', () => t.call('POST', `${I}/block`, { blocked: false }), { ok: true, title: 'Unblocked.', text: 'The work can go on.' }))
            : btn('fl-inc-block', 'Mark it blocked', () => void go('Recording that it is blocked…', 'the block', () => t.call('POST', `${I}/block`, { blocked: true, reason: why }), { ok: true, warn: true, title: 'Blocked.', text: 'The correction, the confirmation and the closing wait until it is unblocked.' }), false, why.trim().length < 5)}
          {btn('fl-inc-escalate', 'Escalate', () => void go('Recording the escalation…', 'the escalation', () => t.call('POST', `${I}/escalate`, { reason: why }), { ok: true, warn: true, title: 'Escalated.', text: 'It is recorded once, with its reason.' }), false, why.trim().length < 5)}</div>
        {x.workflow !== 'OPEN' || x.workOrders.length ? <div className="in__work"><ServiceWork issue={{ code: x.incident }} wo={wo} creds={creds} t={t} what="incident" start={WORK} /></div> : <p className="ui-meta">A work order is raised once the incident has an owner.</p>}
      </div> : <p className="ui-meta" data-testid="fl-inc-done">{x.status === 'CLOSED' ? 'Closed. It stays on the record of the room.' : 'Deferred.'}{x.workOrders.length ? ` Work order ${x.workOrders.join(', ')}.` : ''}</p>}
    </li>
  );
}

export function Incidents({ room, lifecycle, devices, selected, data, creds, t }: { room: { code: string; name: string }; lifecycle: string; devices: Dev[]; selected: string | null; data: IncidentData; creds: Cred[]; t: Tools }) {
  const cat = data.catalogue; const kinds = cat ? Object.keys(cat.issueTypes) : [];
  const [kind, setKind] = useState('no_audio'); const [domain, setDomain] = useState('audio'); const [severity, setSeverity] = useState('High'); const [found, setFound] = useState('user_report'); const [impact, setImpact] = useState('major_disruption');
  const [device, setDevice] = useState<string>('picked'); const [title, setTitle] = useState('No sound from the loudspeakers'); const [desc, setDesc] = useState('The room has been silent since this morning; the far end cannot be heard (synthetic).');
  const inService = lifecycle === 'ACCEPTED' || lifecycle === 'OPERATIONAL'; const mine = data.intelligence?.rooms.find((r) => r.room === room.code); const T = data.intelligence?.totals;
  const dev = device === 'picked' ? selected && devices.some((d) => d.id === selected && !d.furniture) ? selected : '' : device;
  const report = () => t.act('Reporting the incident…', async () => {
    const a = await t.call<{ incident: string; repeats: string | null }>('POST', `/v1/rooms/${room.code}/incidents`, { issueType: kind, domain, severity, title, description: desc, detectedDuring: found, userImpact: impact, ...(dev ? { device: dev } : {}) });
    if (!a.ok) return t.refused(a, 'the report');
    return { ok: true, warn: !!a.body.repeats, title: `${a.body.incident} is reported.`, text: a.body.repeats ? `The database found that it repeats ${a.body.repeats}: the same kind of incident in this room within ${cat?.recurrenceDays ?? 30} days.` : 'What was reported never changes: a correction is a note on its history.' }; });
  return (
    <Card icon="alert" title="In service: incidents" sub={inService ? `${data.items.length} on this room’s record` : 'For a room in service'} testId="fl-incidents-card">
      {!inService ? <p data-testid="fl-inc-early">An incident is reported on a room in service. This room is {words(lifecycle)}: until it is accepted, what goes wrong is a deficiency of its design or of its commissioning, and is recorded as one above. The server refuses an incident here.</p> : <>
        {mine ? <p className="in__status" data-testid="fl-inc-room" data-status={mine.status}><Tag tone={STATUS_TONE[mine.status] || 'muted'}>{words(mine.status)}</Tag> {mine.why}. <span className="ui-muted">Derived from this room’s open incidents and from nothing else: it is not a measurement of the room, and “no open incident” does not say that the room works.</span></p> : null}
        {cat ? <details className="in__report" data-testid="fl-inc-report" open={!data.items.length}><summary>Report an incident as the {t.person}</summary>
          <div className="ca__row"><label className="kit-field">What kind <select value={kind} data-testid="fl-inc-kind" onChange={(e: { target: { value: string } }) => setKind(e.target.value)}>{kinds.map((k) => <option key={k} value={k}>{cat.issueTypes[k]}</option>)}</select></label>
            <label className="kit-field">Domain <select value={domain} data-testid="fl-inc-domain" onChange={(e: { target: { value: string } }) => setDomain(e.target.value)}>{cat.domains.map((k) => <option key={k} value={k}>{words(k)}</option>)}</select></label>
            <label className="kit-field">Severity <select value={severity} data-testid="fl-inc-severity" onChange={(e: { target: { value: string } }) => setSeverity(e.target.value)}>{cat.severities.map((k) => <option key={k} value={k}>{k}</option>)}</select></label></div>
          <div className="ca__row"><label className="kit-field">How it was found <select value={found} data-testid="fl-inc-found" onChange={(e: { target: { value: string } }) => setFound(e.target.value)}>{cat.detectedDuring.map((k) => <option key={k} value={k}>{words(k)}</option>)}</select></label>
            <label className="kit-field">Who it affected <select value={impact} data-testid="fl-inc-impact" onChange={(e: { target: { value: string } }) => setImpact(e.target.value)}>{cat.userImpacts.map((k) => <option key={k} value={k}>{words(k)}</option>)}</select></label>
            <label className="kit-field">Device <select value={device} data-testid="fl-inc-device" onChange={(e: { target: { value: string } }) => setDevice(e.target.value)}><option value="picked">{selected && dev ? `The one chosen on the plan (${devices.find((d) => d.id === selected)?.label})` : 'None named (choose one on the plan to name it)'}</option><option value="">None named</option>{devices.filter((d) => !d.furniture).map((d) => <option key={d.id} value={d.id}>{d.label} · {d.id}</option>)}</select></label></div>
          <label className="kit-field">In a line <input type="text" value={title} maxLength={160} data-testid="fl-inc-title" onChange={(e: { target: { value: string } }) => setTitle(e.target.value)} /></label>
          <label className="kit-field">What happened <textarea value={desc} maxLength={2000} rows={2} data-testid="fl-inc-desc" onChange={(e: { target: { value: string } }) => setDesc(e.target.value)} /></label>
          <p className="build__row"><button type="button" className="ui-btn ui-btn--primary ui-btn--sm" data-testid="fl-inc-send" disabled={t.busy || title.trim().length < 5 || desc.trim().length < 10} onClick={() => void report()}>Report it as the {t.person}</button>
            <span className="ui-meta">Anyone who can see the room may report. What is reported is never edited afterward.</span></p>
        </details> : <Notice tone="warn">The server did not give the incident vocabulary to the {t.person}.</Notice>}
        {data.items.length && cat ? <ul className="fl__list in__list" data-testid="fl-inc-list">{data.items.map((x) => <One key={x.incident} x={x} wo={data.work[x.incident] ?? null} creds={creds} cat={cat} t={t} />)}</ul> : <p data-testid="fl-inc-none">No incident is on this room’s record.</p>}
        {data.intelligence && T ? <div className="in__intel" data-testid="fl-inc-intel" data-incidents={T.incidents} data-open={T.open} data-repeats={T.repeats} data-resolved={T.resolved}>
          <h4 className="fl__h4">What the records add up to <span className="ui-muted">· the last {data.intelligence.period.days} days, every room you may see</span></h4>
          <dl className="in__totals"><div><dt>Incidents</dt><dd>{T.incidents}</dd></div><div><dt>Open</dt><dd>{T.open}</dd></div><div><dt>Blocked</dt><dd>{T.blocked}</dd></div><div><dt>Awaiting confirmation</dt><dd>{T.awaitingConfirmation}</dd></div><div><dt>Closed</dt><dd>{T.closed}</dd></div>
            <div><dt>Repeats</dt><dd>{T.repeats}</dd></div><div><dt>Escalated</dt><dd>{T.escalated}</dd></div><div><dt>Report to correction, mean</dt><dd>{hours(T.meanHoursToResolve)}</dd></div><div><dt>Median</dt><dd>{hours(T.medianHoursToResolve)}</dd></div></dl>
          {data.intelligence.byIssueType.length ? <div className="fl__tablewrap"><table className="ui-table" data-testid="fl-inc-kinds"><thead><tr><th scope="col">Kind</th><th scope="col">Incidents</th><th scope="col">Open</th><th scope="col">Repeats</th><th scope="col">Corrected</th></tr></thead>
            <tbody>{data.intelligence.byIssueType.map((k) => <tr key={k.key} data-kind={k.key}><th scope="row">{k.name || words(k.key)}</th><td>{k.incidents}</td><td>{k.open}</td><td>{k.repeats}</td><td>{k.resolved}</td></tr>)}</tbody></table></div> : null}
          <p className="ui-meta">{data.intelligence.basis}</p>
        </div> : null}
      </>}
    </Card>
  );
}
