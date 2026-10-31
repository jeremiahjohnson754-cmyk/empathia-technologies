/** Administration: integrations (honest states), outbox dead letters, people, audit. Each tab's data is refused by the API to other roles. */
import { useState } from 'react';
import { Button, DataTable, Empty, ErrorState, Facts, Loading, Notice, StatusBadge, Tabs, Tag, INTEGRATION } from '@empathia/ui';
import { api, useMutation, useQuery } from '../api.js';
import { go } from '../router.js';
import { useMe } from '../me.js';
import { RequestCatalogue } from './Lifecycle.js';

export function Admin({ tab }: { tab: string }) {
  const { can } = useMe();
  const tabs = [{ key: 'integrations', label: 'Integrations' }, ...(can('policy.configure') ? [{ key: 'leads', label: 'Lead inbox' }, { key: 'outbox', label: 'Outbox' }, { key: 'people', label: 'People' }, { key: 'catalogue', label: 'Request catalogue' }] : []), ...(can(['provenance.review', 'policy.configure']) ? [{ key: 'audit', label: 'Audit' }] : [])];
  return (
    <section className="page">
      <header className="page__head"><div><h1>Administration</h1></div></header>
      <Tabs label="Administration" tabs={tabs} active={tab} onChange={(k) => go('admin', k)} />
      <div className="panel" role="tabpanel">
        {tab === 'integrations' ? <Integrations /> : null}{tab === 'leads' ? <Leads /> : null}{tab === 'outbox' ? <Outbox /> : null}{tab === 'people' ? <People /> : null}{tab === 'audit' ? <Audit /> : null}{tab === 'catalogue' ? <RequestCatalogue /> : null}
      </div>
    </section>
  );
}

function Integrations() {
  const { can } = useMe();
  const q = useQuery<{ items: Array<Record<string, string>> }>('integrations', () => api.call('getV1Integrations') as never);
  const probe = useMutation((key: string) => api.call('postV1IntegrationsKeyProbe', { params: { key } }), []);
  return (
    <div className="stack">
      <Notice tone="muted">Catalogue entries name target platforms for interface planning only. Contract-only means no adapter, no connection and no partnership. Nothing here contacts a real system.</Notice>
      {probe.error ? <ErrorState error={probe.error} /> : probe.busy ? <Loading label="Probing" /> : null}
      {q.error ? <ErrorState error={q.error} /> : !q.data ? <Loading /> : <DataTable rows={q.data.items} rowKey={(x) => x['key']!} dense caption="Integrations" columns={[
        { key: 'k', header: 'Key', render: (x) => <span className="mono">{x['key']}</span>, sort: (x) => x['key']! }, { key: 'n', header: 'Target platform', render: (x) => `${x['vendor'] || ''} ${x['product'] || ''}`.trim(), sort: (x) => `${x['vendor']}${x['product']}` },
        { key: 'm', header: 'Mode', render: (x) => <span className="ui-meta">{x['mode']}</span> },
        { key: 'c', header: 'Category', render: (x) => <span className="ui-meta">{x['category']}</span>, sort: (x) => x['category'] || '' },
        { key: 's', header: 'State', render: (x) => <StatusBadge table={INTEGRATION} value={x['state']} />, sort: (x) => x['state']! },
        { key: 'a', header: '', render: (x) => x['state'] === 'MOCK' && can(['adapter.allowlist', 'policy.configure']) ? <Button small kind="quiet" onClick={() => void probe.run(x['key']!)}>Probe mock</Button> : null }]} />}
    </div>
  );
}

function Outbox() {
  const q = useQuery<{ items: Array<Record<string, string>> }>('outbox', () => api.call('getV1AdminOutbox', { query: { status: 'DEAD_LETTER' } }) as never);
  const retry = useMutation((event: string) => api.call('postV1AdminOutboxEventRetry', { params: { event } }), ['outbox']);
  return q.error ? <ErrorState error={q.error} /> : !q.data ? <Loading /> : <DataTable rows={q.data.items} rowKey={(x) => x['id']!} dense caption="Dead-lettered events" empty={<Empty title="No dead-lettered events">Every event was delivered.</Empty>} columns={[
    { key: 't', header: 'Event', render: (x) => <span className="mono">{x['type']}</span> }, { key: 'a', header: 'Aggregate', render: (x) => `${x['aggregate_type']} ${x['aggregate_id']}` },
    { key: 'n', header: 'Attempts', render: (x) => x['attempts'], align: 'right' }, { key: 'e', header: 'Last error', render: (x) => <span className="ui-meta">{x['last_error']}</span> },
    { key: 'r', header: '', render: (x) => <Button small kind="quiet" busy={retry.busy} onClick={() => void retry.run(x['id']!)}>Retry</Button> }]} />;
}

function People() {
  const q = useQuery<{ items: Array<{ id: string; name: string; email: string; role: string; disabled: boolean; siteScope: string[] }> }>('people', () => api.call('getV1People') as never);
  return q.error ? <ErrorState error={q.error} /> : !q.data ? <Loading /> : <DataTable rows={q.data.items} rowKey={(x) => `${x.id}/${x.role}`} dense caption="People" columns={[
    { key: 'n', header: 'Person', render: (x) => x.name, sort: (x) => x.name }, { key: 'e', header: 'Email', render: (x) => <span className="mono ui-meta">{x.email}</span> },
    { key: 'r', header: 'Role', render: (x) => <Tag>{x.role}</Tag>, sort: (x) => x.role }, { key: 's', header: 'Sites', render: (x) => x.siteScope.length ? x.siteScope.join(', ') : <span className="ui-muted">all</span> },
    { key: 'd', header: 'Status', render: (x) => x.disabled ? <Tag tone="bad">disabled</Tag> : <Tag tone="ok">active</Tag> }]} />;
}

interface Integrity { verified: boolean; checked: number; unsealed: number; sealedNow: number; firstBreak: { seq: number; reason: string } | null; head: { seq: number; hash: string; at: string } | null; checkedAt: string; method: string; limits: string[] }

/** Evidence Ledger integrity (ADR-0010): an explicit check — it seals committed events, then the API recomputes the whole chain. */
function LedgerIntegrity() {
  const v = useMutation(() => api.call('getV1AuditIntegrity' as never) as Promise<Integrity>, ['audit']);
  const [r, setR] = useState<Integrity | null>(null);
  return (
    <section className="card stack" data-testid="ledger-integrity">
      <div className="row-actions"><h2 className="h3">Evidence Ledger integrity</h2><Button small kind="primary" busy={v.busy} onClick={async () => { const x = await v.run(undefined); if (x) setR(x as Integrity); }}>Verify the chain</Button></div>
      {v.error ? <ErrorState error={v.error} /> : null}
      {!r ? <p className="ui-meta">Every audit event is sealed into this organization’s SHA-256 chain after it commits. Verifying seals what is pending, then recomputes every link in the API and names the first break.</p> : <>
        {r.verified ? <Notice tone="ok">Chain intact: {r.checked} events verified{r.sealedNow ? `, ${r.sealedNow} sealed by this check` : ''}.</Notice>
          : r.firstBreak ? <Notice tone="bad">Chain broken at event #{r.firstBreak.seq}: {r.firstBreak.reason}.</Notice> : <Notice tone="muted">No sealed events yet.</Notice>}
        {r.head ? <Facts items={[['Head', `#${r.head.seq} · ${new Date(r.head.at).toLocaleString()}`], ['Head hash', r.head.hash], ['Unsealed now', String(r.unsealed)], ['Checked', new Date(r.checkedAt).toLocaleString()]]} /> : null}
        <p className="ui-meta">Record the head hash outside this system to detect a rewrite of the whole chain. {r.method}.</p>
        <ul className="ui-meta">{r.limits.map((l) => <li key={l}>{l}</li>)}</ul></>}
    </section>
  );
}

function Audit() {
  const q = useQuery<{ items: Array<Record<string, string>> }>('audit', () => api.call('getV1Audit', { query: { limit: '200' } }) as never);
  return <div className="stack"><LedgerIntegrity />{q.error ? <ErrorState error={q.error} /> : !q.data ? <Loading /> : <DataTable rows={q.data.items} rowKey={(x) => String(x['id'])} dense caption="Audit events" columns={[
    { key: 'at', header: 'When', render: (x) => new Date(x['at']!).toLocaleString() }, { key: 'w', header: 'Role', render: (x) => x['actor_role'] },
    { key: 'a', header: 'Action', render: (x) => <span className="mono">{x['action']}</span> }, { key: 'o', header: 'Outcome', render: (x) => <Tag tone={x['outcome'] === 'DENIED' ? 'bad' : 'ok'}>{x['outcome']}</Tag> },
    { key: 'g', header: 'On', render: (x) => <span className="ui-meta">{x['aggregate_type']} {x['aggregate_id']}</span> },
    { key: 'c', header: 'Chain', render: (x) => x['seq'] ? <span className="mono ui-meta" title={x['hash']}>#{x['seq']} {String(x['hash']).slice(0, 10)}</span> : <span className="ui-muted">pending seal</span> }]} />}</div>;
}

/** Messages from the public website (demonstration requests, pilot enquiries, contact). The API refuses this list to every role but the
 *  security administrator and audits each read; the email adapter's status is shown as the API reports it — never assumed. */
function Leads() {
  const q = useQuery<{ items: Array<Record<string, string | boolean | null>>; emailAdapter: { configured: boolean; reason: string } }>('leads', () => api.call('getV1AdminLeads') as never);
  const handle = useMutation((a: { id: string; status: 'ANSWERED' | 'SPAM' }) => api.call('patchV1AdminLeadsId', { params: { id: a.id }, body: { status: a.status } }), ['leads']);
  return (
    <div className="stack">
      {q.data && !q.data.emailAdapter.configured ? <Notice tone="warn">Email notification is not configured: {q.data.emailAdapter.reason}. New messages appear here only.</Notice> : null}
      {handle.error ? <ErrorState error={handle.error} /> : null}
      {q.error ? <ErrorState error={q.error} /> : !q.data ? <Loading /> : !q.data.items.length ? <Empty title="No messages yet">Messages sent from the public website's forms appear here.</Empty> : <DataTable rows={q.data.items} rowKey={(x) => String(x['id'])} caption="Lead inbox" columns={[
        { key: 'at', header: 'Received', render: (x) => <span className="ui-meta">{String(x['created_at']).slice(0, 16).replace('T', ' ')}</span>, sort: (x) => String(x['created_at']) },
        { key: 'k', header: 'Kind', render: (x) => <Tag>{String(x['kind'])}</Tag> },
        { key: 'who', header: 'From', render: (x) => <span>{String(x['name'])} · {String(x['organization'])}<br /><span className="ui-meta">{String(x['email'])}{x['audience'] ? ` · ${x['audience']}` : ''}{x['scope'] ? ` · ${x['scope']}` : ''}</span></span> },
        { key: 'm', header: 'Message', render: (x) => <span style={{ whiteSpace: 'pre-wrap' }}>{String(x['message'])}</span> },
        { key: 's', header: 'Status', render: (x) => <Tag tone={x['status'] === 'NEW' ? 'info' : x['status'] === 'ANSWERED' ? 'ok' : 'muted'}>{String(x['status'])}</Tag>, sort: (x) => String(x['status']) },
        { key: 'a', header: '', render: (x) => x['status'] === 'NEW' ? <span className="row-acts"><Button small onClick={() => void handle.run({ id: String(x['id']), status: 'ANSWERED' })}>Mark answered</Button> <Button small kind="quiet" onClick={() => void handle.run({ id: String(x['id']), status: 'SPAM' })}>Spam</Button></span> : null },
      ]} />}
    </div>
  );
}
