/**
 * #/servicehands/queue — ServiceHands on the server (connected builds only; OUTSTANDING item 1a, “the ServiceHands pages still keep
 * their records in the browser”). The sandbox's work orders and incidents, read from the enterprise API as the person chosen at the
 * top, across every room of the sandbox: filter by state, open one, and take its next governed step with the same ServiceWork panel
 * the room page uses. Every step is one request; the server decides who may take it and says why when it refuses. Nothing here is
 * kept in the browser except the sandbox's key. The ServiceHands workspace at #/v25/service keeps its own demonstration records in the
 * browser and says so; this page is where the server's records are worked.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Notice, Tag } from '@empathia/ui';
import { connected, SandboxGone, type Availability, type Sandbox } from '../connected/client.js';
import { ServiceWork, type Cred, type Said, type Tools, type WorkOrder } from '../flagship/CorrectiveAction.js';
import { PEOPLE } from './Flagship.js';

interface Listed { code: string; state: string; workType: string | null; severity: string | null; sla: { respond: string; restore: string } | null; issue: { code: string; title: string }; room: { code: string; name: string } }
interface IncidentRow { incident: string; title: string; status: string; severity: string; room: { code: string; name: string } | null; reportedAt?: string; workOrders: string[] }
const words = (x: string) => x.replace(/_/g, ' ').toLowerCase();
const STATES = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'CLOSED', 'REOPENED'];
const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { OPEN: 'warn', REOPENED: 'bad', TRIAGED: 'info', ASSIGNED: 'info', ACCEPTED: 'info', IN_PROGRESS: 'info', VERIFYING: 'warn', RESOLVED: 'ok', CLOSED: 'muted', BLOCKED: 'bad', AWAITING_CONFIRMATION: 'warn', DEFERRED: 'muted' };

export function ServiceQueuePage() {
  const c = useMemo(() => connected(), []);
  const [avail, setAvail] = useState<Availability | null>(null); const [sb, setSb] = useState<Sandbox | null>(() => c.sandbox());
  const [who, setWho] = useState('svcmgr'); const [state, setState] = useState(''); const [tab, setTab] = useState<'work' | 'incidents'>('work');
  const [items, setItems] = useState<Listed[] | null>(null); const [incidents, setIncidents] = useState<IncidentRow[] | null>(null);
  const [sel, setSel] = useState<string | null>(null); const [wo, setWo] = useState<WorkOrder | null>(null); const [creds, setCreds] = useState<Cred[]>([]);
  const [busy, setBusy] = useState<string | null>(null); const [said, setSaid] = useState<Said | null>(null); const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);

  const read = useCallback(async (as: string, code: string | null, keep = false) => {
    if (!c.sandbox()) return; setBusy('Reading the queue from the server…'); if (!keep) setSaid(null);
    try {
      const [l, inc, cr] = await Promise.all([c.call<{ items: Listed[] }>(as, 'GET', `/v1/work-orders${state ? `?state=${state}` : ''}`), c.call<{ items: IncidentRow[] }>(as, 'GET', '/v1/incidents?limit=50'), c.call<{ items: Cred[] }>(as, 'GET', '/v1/competencies')]);
      if (!alive.current) return;
      setItems(l.ok ? l.body.items : []); setIncidents(inc.ok ? inc.body.items : []); setCreds(cr.ok ? cr.body.items : []);
      if (!l.ok) setSaid({ ok: false, title: `The server answered ${l.status} for the work orders.`, text: l.detail, reasons: l.reasons });
      if (code) { const w = await c.call<WorkOrder>(as, 'GET', `/v1/work-orders/${code}`); if (alive.current) setWo(w.ok ? w.body : null); } else setWo(null);
    } catch (e) { if (e instanceof SandboxGone) { setSb(null); setItems(null); setSaid({ ok: false, title: 'The sandbox is no longer there.', text: `${e.message}. Open a new one to continue.` }); } else setSaid({ ok: false, title: 'That did not reach the server.', text: (e as Error).message }); }
    finally { if (alive.current) setBusy(null); }
  }, [c, state]);
  useEffect(() => { let on = true; void (async () => { const a = await c.availability(); if (!on) return; setAvail(a); if (a.enabled && c.sandbox()) await read(who, sel); })(); return () => { on = false; }; }, [c]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sb) void read(who, sel); }, [state]);   // eslint-disable-line react-hooks/exhaustive-deps

  const open = async () => { setBusy('Opening your sandbox…'); setSaid(null);
    try { const a = await c.open(); if (!a.ok || !a.body) { setSaid({ ok: false, title: `The server answered ${a.status}.`, text: a.detail }); setBusy(null); return; } setSb(a.body); await read(who, null); }
    catch (e) { setBusy(null); setSaid({ ok: false, title: 'That did not work.', text: (e as Error).message }); } };
  const person = (k: string) => PEOPLE.find(([x]) => x === k)?.[1].toLowerCase() || k;
  const refused = (a: { status: number; detail: string; reasons: string[] }, what: string): Said => ({ ok: false, title: `The server refused ${what} (${a.status}).`, text: a.detail, reasons: a.reasons });
  const act = async (label: string, run: () => Promise<Said>) => { setBusy(label); setSaid(null);
    try { const out = await run(); if (!alive.current) return; setSaid(out); await read(who, sel, true); }
    catch (e) { if (e instanceof SandboxGone) { setSb(null); setSaid({ ok: false, title: 'The sandbox is no longer there.', text: `${e.message}. Open a new one to continue.` }); } else setSaid({ ok: false, title: 'That did not reach the server.', text: (e as Error).message }); }
    finally { if (alive.current) setBusy(null); } };
  const tools: Tools = { call: (method, path, body, note) => c.call(who, method, path, body, note), act, refused, person: person(who), busy: !!busy, roles: PEOPLE.filter(([k]) => !/\d$/.test(k)) };
  const listed = items?.find((x) => x.code === sel) || null; const counts = useMemo(() => Object.fromEntries(STATES.map((s) => [s, (items || []).filter((x) => x.state === s).length])), [items]);

  return <section className="wk" data-native="workspace" data-testid="sq-page">
    <header className="wk-head"><h1>ServiceHands on the server</h1>
      <p className="wk-lede">The sandbox’s work orders and incidents, across its rooms, as the enterprise API holds them. Each step is one request as the person chosen below; the server decides who may take it and says why when it refuses.</p></header>
    {avail && !avail.enabled ? <div data-testid="sq-off"><Notice tone="warn">The demonstration server is not taking sandboxes right now{avail.reason ? `: ${avail.reason}` : ''}. Nothing here works without it.</Notice></div> : null}
    {!sb ? <Card icon="spark" title="Open a sandbox" sub="A private copy of the demonstration on the server, for a few hours" testId="sq-open"><p className="build__row"><button type="button" className="ui-btn ui-btn--primary" data-testid="sq-open-btn" disabled={!!busy || !avail?.enabled} onClick={() => void open()}>Open a sandbox</button> <a href="#/connected">I have a resume code</a></p></Card> : <>
      <div className="build__row sq-bar">
        <label className="kit-field">Acting as <select value={who} data-testid="sq-who" disabled={!!busy} onChange={(e) => { setWho(e.target.value); void read(e.target.value, sel); }}>{PEOPLE.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <button type="button" className="ui-btn ui-btn--sm" data-testid="sq-read" disabled={!!busy} onClick={() => void read(who, sel)}>Read the server again</button>
        {busy ? <span role="status" data-testid="sq-busy"><Tag tone="warn">working</Tag> {busy}</span> : null}
      </div>
      {said ? <div data-testid="sq-said" data-ok={said.ok}><Notice tone={said.ok ? (said.warn ? 'warn' : 'ok') : 'bad'}><b>{said.title}</b> {said.text}{said.reasons?.length ? <ul>{said.reasons.map((r) => <li key={r}>{r}</li>)}</ul> : null}</Notice></div> : null}
      <div className="sq-tabs" role="tablist" aria-label="Queue"><button type="button" role="tab" aria-selected={tab === 'work'} onClick={() => setTab('work')} data-testid="sq-tab-work">Work orders {items ? `(${items.length})` : ''}</button><button type="button" role="tab" aria-selected={tab === 'incidents'} onClick={() => setTab('incidents')} data-testid="sq-tab-incidents">Incidents {incidents ? `(${incidents.length})` : ''}</button></div>
      {tab === 'work' ? <div className="sq-grid">
        <Card icon="inbox" title="Work orders" sub={state ? `${words(state)} only` : 'Every state'} testId="sq-list">
          <div className="sq-states" role="group" aria-label="State"><button type="button" className="sp__chip" aria-pressed={!state} onClick={() => setState('')}>All</button>{STATES.filter((s) => counts[s] || s === state).map((s) => <button key={s} type="button" className="sp__chip" aria-pressed={state === s} onClick={() => setState(s)} data-state={s}>{words(s)} {counts[s] ? <span>{counts[s]}</span> : null}</button>)}</div>
          {items && items.length ? <ul className="sq-items">{items.map((x) => <li key={x.code} className={x.code === sel ? 'on' : ''}><a href="#/servicehands/queue" data-wo={x.code} onClick={(e) => { e.preventDefault(); setSel(x.code); void read(who, x.code, true); }}>
            <b>{x.code}</b> <Tag tone={TONE[x.state] || 'muted'}>{words(x.state)}</Tag><span>{x.issue.title}</span><span className="ui-meta">{x.room.name} · {x.issue.code}{x.severity ? ` · ${x.severity}` : ''}{x.sla ? ` · restore ${x.sla.restore}` : ''}</span></a></li>)}</ul>
            : <p className="ui-muted" data-testid="sq-none">{items ? 'No work orders in this state that this person may see.' : 'Reading…'}</p>}
        </Card>
        <div>{listed && wo ? <Card icon="wrench" title={`${wo.code} · ${listed.issue.title}`} sub={`${listed.room.name} · ${listed.issue.code}`} testId="sq-detail">
            <ServiceWork issue={{ code: listed.issue.code }} wo={wo} creds={creds} t={tools} what={/^INC-/.test(listed.issue.code) ? 'incident' : 'deficiency'} />
            <p className="ui-meta"><a href={`#/flagship/${encodeURIComponent(listed.room.code)}`}>Open the room</a> for its design, field record, commissioning and acceptance.</p></Card>
          : <p className="ui-muted">Choose a work order to see its next governed steps.</p>}</div>
      </div> : <Card icon="alert" title="Incidents" sub="Reported in rooms in service, newest first" testId="sq-incidents">
        {incidents && incidents.length ? <ul className="sq-items">{incidents.map((x) => <li key={x.incident} data-incident={x.incident}><a href={x.room ? `#/flagship/${encodeURIComponent(x.room.code)}` : '#/servicehands/queue'}>
          <b>{x.incident}</b> <Tag tone={TONE[x.status] || 'muted'}>{words(x.status)}</Tag><span>{x.title}</span><span className="ui-meta">{x.room?.name || '—'} · {x.severity}{x.workOrders.length ? ` · ${x.workOrders.join(', ')}` : ' · no work order yet'}</span></a></li>)}</ul>
          : <p className="ui-muted">{incidents ? 'No incidents that this person may see.' : 'Reading…'}</p>}
        <p className="ui-meta">An incident is worked on its room’s page: reported, taken, its work order, its confirmation by the reporter.</p></Card>}
    </>}
    <p className="ui-meta">Every name, room and record here is synthetic and lives in a sandbox that expires. Nothing is sent to any real system.</p>
  </section>;
}
