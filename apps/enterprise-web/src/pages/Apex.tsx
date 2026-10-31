/**
 * APEX (P6-B) in the enterprise application: diagnosis with its evidence, over the API on @empathia/apex-engine. The seven layers
 * cite the room's records; hypotheses come ranked with the reason they are not proven; every action's outcome — blocked ones
 * included — is on the case. The page never computes a verdict; the API's engine does, with the real adapter state.
 */
import { useState } from 'react';
import { Button, DataTable, Empty, ErrorState, Facts, Loading, Notice, Tag, type Column } from '@empathia/ui';
import { api, useMutation, useQuery } from '../api.js';
import { href } from '../router.js';

type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'info';
interface Row { code: string; issue: { code: string; title: string }; room: { code: string; name: string }; symptomKey: string; hypotheses: number; actions: number; reviewed: boolean; openedAt: string; openedBy: string }
interface Hyp { id: string; text: string; layer: string; confidence: 'none' | 'low' | 'medium' | 'high'; caveat: string; negative: string[]; next: string[]; action: { tier: string; runbook?: string }; evidence: string[]; staleEvidence?: boolean }
interface Act { outcome: string; detail: string; tier: string; runbook?: string; simulated?: boolean; branch?: string; verification?: string; compensation?: boolean; workOrderId?: string; at: string; by: string; byRole: string; hypothesisId: string }
interface Case extends Omit<Row, 'hypotheses' | 'actions'> {
  layers: Array<{ layer: string; label: string; observations: string[]; cites: string[] }>; hypotheses: Hyp[]; actions: Act[]; review: { verdict: string; by: string; byRole: string; at: string } | null; workOrder: { code: string; state: string } | null;
  baseline: { version: number; evidence: number } | null; adapters: Record<string, string>; priorA4: number; tiers: Array<{ id: string; label: string; bound: string; autonomous: boolean }>; runbooks: Array<{ id: string; label: string; tier: string; targets: string[]; allowlist: string[]; blastRadius: string; rollback: string; rateLimit: string; signedBy: string | null; version: string }>;
  yours: { act: boolean; review: boolean };
}
const CONF: Record<string, Tone> = { high: 'ok', medium: 'info', low: 'warn', none: 'muted' };
const OUT: Record<string, Tone> = { EXPLAINED: 'ok', PROPOSED: 'info', COMPARED: 'info', DRAFT_STAGED: 'ok', EXECUTED_SIMULATED: 'ok', DRY_RUN: 'info', BLOCKED: 'bad', REFUSED: 'bad', HUMAN_LED: 'warn', ABSTAINED: 'muted', ROLLED_BACK: 'warn', ABORTED: 'warn' };
const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
const call = (op: string, args: Record<string, unknown>) => api.call(op as never, args as never) as Promise<unknown>;

export function ApexCases() {
  const q = useQuery<{ items: Row[] }>('apex', () => call('getV1ApexCases', {}) as Promise<{ items: Row[] }>);
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Reading the cases" /></section>;
  const cols: Column<Row>[] = [
    { key: 'code', header: 'Case', render: (x) => <a href={href('apex', x.code)} className="mono">{x.code}</a> },
    { key: 'issue', header: 'Deficiency', render: (x) => <div><div>{x.issue.title}</div><div className="ui-meta mono">{x.issue.code}</div></div> },
    { key: 'room', header: 'Room', render: (x) => <a href={href('rooms', x.room.code)}>{x.room.name}</a> },
    { key: 'k', header: 'Branch', render: (x) => <Tag tone="muted">{x.symptomKey}</Tag> },
    { key: 'n', header: 'Hypotheses · actions', render: (x) => `${x.hypotheses} · ${x.actions}` },
    { key: 'r', header: 'Reviewed', render: (x) => x.reviewed ? <Tag tone="ok">reviewed</Tag> : <span className="ui-muted">—</span> },
  ];
  return (
    <section className="page">
      <header className="page__head"><div><p className="kicker">APEX · diagnosis with its evidence</p><h1>Cases</h1><p className="ui-meta">A case is opened from a deficiency on a room (its issues tab). Seven layers of evidence, ranked hypotheses that say why they are not proven, and action tiers A0–A5 — A4 is blocked by the real adapter state in this build, and the only runs are labelled simulations.</p></div></header>
      <DataTable rows={q.data.items} columns={cols} rowKey={(x) => x.code} caption="APEX cases" empty={<Empty title="No case yet">Open one from a deficiency on a room.</Empty>} />
    </section>
  );
}

export function ApexCase({ code }: { code: string }) {
  const key = `apex:${code}`;
  const q = useQuery<Case>(key, () => call('getV1ApexCasesCase', { params: { case: code } }) as Promise<Case>);
  const act = useMutation((a: { op: string; body: Record<string, unknown> }) => call(a.op, { params: { case: code }, body: a.body }), [key, 'apex', 'work-orders']);
  const [hyp, setHyp] = useState<string | null>(null);
  const [a4, setA4] = useState({ owner: false, window: '', occupied: false, simulate: false, targets: '', dry: false, branch: 'nominal' });
  const [verdict, setVerdict] = useState('');
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Reading the case" /></section>;
  const H = q.data; const h = H.hypotheses.find((x) => x.id === hyp) || H.hypotheses[0]!;
  const rb = h.action.runbook ? H.runbooks.find((r) => r.id === h.action.runbook) : null;
  const run = (tier: string) => act.run({ op: 'postV1ApexCasesCaseAct', body: { hypothesisId: h.id, tier, ...(tier === 'A4' ? { ownerApproved: a4.owner, window: a4.window || undefined, occupied: a4.occupied, simulate: a4.simulate, targets: a4.targets ? a4.targets.split(',').map((x) => x.trim()).filter(Boolean) : undefined, dryRunDone: a4.dry, branch: a4.branch } : {}) } });
  return (
    <section className="page" data-testid="apex-case">
      <header className="page__head"><div><p className="kicker"><a href={href('apex')}>APEX cases</a> · {H.symptomKey} branch</p><h1>{H.issue.title}</h1><p className="ui-meta mono">{H.code} · {H.issue.code} · <a href={href('rooms', H.room.code)}>{H.room.name}</a> · opened {when(H.openedAt)} by {H.openedBy}</p></div>
        <div className="stack">{H.review ? <Tag tone="ok">reviewed</Tag> : <Tag tone="muted">not reviewed</Tag>}{H.workOrder ? <Tag tone="info">{H.workOrder.code} {H.workOrder.state}</Tag> : null}</div></header>
      {act.error ? <ErrorState error={act.error} /> : null}
      <Facts items={[['Baseline to compare', H.baseline ? `v${H.baseline.version} (${H.baseline.evidence} results)` : 'none accepted for this room'], ['Adapters (real state)', Object.entries(H.adapters).map(([k, v]) => `${k} ${v}`).join(' · ')], ['A4 runs so far', String(H.priorA4)]]} />

      <section className="card stack"><h2 className="h3">Seven layers · what the room’s records show</h2>
        <div className="apex__layers" data-testid="layers">{H.layers.map((l) => <div key={l.layer} className={`apex__layer${l.observations.length ? ' has' : ''}`}><b>{l.label}</b>{l.observations.length ? <ul>{l.observations.map((o) => <li key={o}>{o}</li>)}</ul> : <span className="ui-meta">nothing observed</span>}{l.cites.length ? <span className="ui-meta">cites {l.cites.join(', ')}</span> : null}</div>)}</div>
      </section>

      <div className="two">
        <section className="card stack"><h2 className="h3">Hypotheses, ranked</h2>
          <ol className="apex__hyps" data-testid="hypotheses">{H.hypotheses.map((x) => <li key={x.id} className={x.id === h.id ? 'on' : ''}><button type="button" onClick={() => setHyp(x.id)}><Tag tone={CONF[x.confidence]}>{x.confidence}</Tag> <b>{x.text}</b> <span className="ui-meta">{x.layer} · {x.action.tier}</span></button></li>)}</ol>
        </section>
        <section className="card stack" data-testid="hypothesis"><h2 className="h3">{h.id} · {h.action.tier}</h2><p><b>{h.text}</b></p>
          <Facts items={[['Why it is not proven', h.caveat], ['Evidence cited', h.evidence.length ? h.evidence.join('; ') : 'none'], ['Against it', h.negative.length ? h.negative.join('; ') : '—'], ['Next observation', h.next.join('; ') || '—']]} />
          {rb ? <Facts items={[['Runbook', `${rb.id} · ${rb.label} · v${rb.version} · ${rb.signedBy ? `signed by ${rb.signedBy}` : 'UNSIGNED'}`], ['Allowlist · blast radius', `${rb.allowlist.join(', ') || 'none'} · ${rb.blastRadius}`], ['Rollback · rate limit', `${rb.rollback} · ${rb.rateLimit}`]]} /> : null}
        </section>
      </div>

      <section className="card stack" data-testid="tiers"><h2 className="h3">Act on {h.id}</h2>
        <div className="apex__tiers">{H.tiers.map((t) => <div key={t.id} className={`apex__tier${t.id === h.action.tier ? ' on' : ''}`}><b>{t.id} · {t.label}</b><span className="ui-meta">{t.bound}</span>{H.yours.act ? <Button small busy={act.busy} onClick={() => void run(t.id)}>{t.id}</Button> : null}</div>)}</div>
        {H.yours.act ? <div className="stack" data-testid="a4">
          <label className="check"><input type="checkbox" checked={a4.owner} onChange={(e) => setA4({ ...a4, owner: e.target.checked })} /> Owner approval given (room owner / operations)</label>
          <label className="check"><input type="checkbox" checked={a4.occupied} onChange={(e) => setA4({ ...a4, occupied: e.target.checked })} /> The room is occupied right now</label>
          <label className="check"><input type="checkbox" checked={a4.simulate} onChange={(e) => setA4({ ...a4, simulate: e.target.checked })} /> Simulate a SUPPORTED_VERIFIED adapter (labelled simulation; the real adapters are {Object.values(H.adapters).join('/')})</label>
          <label className="check"><input type="checkbox" checked={a4.dry} onChange={(e) => setA4({ ...a4, dry: e.target.checked })} /> Dry run acknowledged — execute the bounded simulation</label>
          <div className="two"><label className="ui-meta">Preauthorized window <input value={a4.window} onChange={(e) => setA4({ ...a4, window: e.target.value })} placeholder="e.g. 2026-11-03 07:00–08:00" /></label><label className="ui-meta">Targets (comma-separated) <input value={a4.targets} onChange={(e) => setA4({ ...a4, targets: e.target.value })} placeholder="processor" /></label></div>
          <label className="ui-meta">Simulated branch <select value={a4.branch} onChange={(e) => setA4({ ...a4, branch: e.target.value })}>{['nominal', 'lost_signal', 'estop', 'incomplete'].map((b) => <option key={b}>{b}</option>)}</select></label>
        </div> : <Notice tone="muted">Your role cannot act on a case (needs one of the service, verification, baseline or domain-review authorities). You can read every outcome.</Notice>}
      </section>

      <section className="card stack"><h2 className="h3">Action log ({H.actions.length})</h2>
        <ul className="apex__log" data-testid="apex-log">{H.actions.map((a, i) => <li key={i}><Tag tone={OUT[a.outcome] || 'muted'}>{a.outcome}</Tag> <b>{a.tier}</b> {a.hypothesisId}{a.runbook ? ` · ${a.runbook}` : ''}{a.simulated ? ' · simulated' : ''}{a.branch ? ` · ${a.branch}` : ''}{a.workOrderId ? ` · ${a.workOrderId}` : ''} <span className="ui-meta">{a.by} · {when(a.at)}</span><div className="ui-meta">{a.detail}</div></li>)}{!H.actions.length ? <li className="ui-meta">No action yet.</li> : null}</ul>
      </section>

      <section className="card stack" data-testid="review"><h2 className="h3">Review</h2>
        {H.review ? <Notice tone="ok"><b>{H.review.verdict}</b> — {H.review.by} ({H.review.byRole}) · {when(H.review.at)}</Notice> : H.yours.review ? <div className="row-actions"><input value={verdict} onChange={(e) => setVerdict(e.target.value)} placeholder="verdict (e.g. root cause confirmed: AEC reference)" /><Button small kind="primary" busy={act.busy} disabled={!verdict.trim()} onClick={() => void act.run({ op: 'postV1ApexCasesCaseReview', body: { verdict } })}>Record the review</Button></div> : <p className="ui-meta">Reviewed by a verifier (commissioning lead, service verifier or assurance owner).</p>}
      </section>
    </section>
  );
}
