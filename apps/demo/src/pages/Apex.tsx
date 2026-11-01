/**
 * APEX — cited hypotheses, bounded actions, blocked outcomes. A case opens from an incident; the seven layers show what the recorded
 * relationships cite; hypotheses are ranked and say why they are not proven; action tiers A0–A5 carry their bounds; an A4 bounded
 * execution is a preflight that the real adapter state blocks in this build (every outcome, including the blocked ones, is in the log).
 * Engine: @empathia/apex-engine.
 */
import { useMemo, useState } from 'react';
import { Button, Facts, Notice, Tag } from '@empathia/ui';
import { TIERS, RUNBOOKS, type Tier, type Layer } from '@empathia/apex-engine';
import { nodeKey } from '@empathia/search-party';
import { buildEstate } from '../search/estate.js';
import * as S from '../workspace/store.js';
import { useWorkspace, isRefusal } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel, holds, loadDraft } from '../build/store.js';
import { assemble, acceptedBaseline } from '../workspace/records.js';

const CONF: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { high: 'ok', medium: 'info', low: 'warn', none: 'muted' };
const OUT: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { EXPLAINED: 'ok', PROPOSED: 'info', COMPARED: 'ok', DRAFT_STAGED: 'info', EXECUTED_SIMULATED: 'ok', DRY_RUN: 'info', BLOCKED: 'bad', HUMAN_LED: 'warn', ABSTAINED: 'muted', ROLLED_BACK: 'warn', ABORTED: 'warn', REFUSED: 'bad' };
const when = (s: string) => s.slice(0, 16).replace('T', ' ');

export function ApexPage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective);
  const { w, apply, refusal } = useWorkspace();
  const est = useMemo(() => buildEstate(), []);
  const wantInc = /[?&]incident=([A-Z0-9-]+)/.exec(hash)?.[1]; const wantCase = /[?&]case=([A-Z0-9-]+)/.exec(hash)?.[1];
  const [sel, setSel] = useState<string | null>(wantCase || (wantInc ? w.incidents.find((i) => i.id === wantInc)?.apexId || null : null) || w.apexCases[0]?.id || null);
  const H = w.apexCases.find((c) => c.id === sel) || null;
  const open = w.incidents.filter((i) => !i.apexId && !['CLOSED', 'CANCELLED'].includes(i.state));
  const cite = (roomId: string) => (layer: Layer) => {
    const room = { type: 'Room', id: roomId }; const devs = est.edges.filter((e) => e.rel === 'PLANS_DEVICE' && nodeKey(e.from) === nodeKey(room)).map((e) => e.to);
    if (layer === 'physical') return devs.slice(0, 2).map((d) => d.id);
    if (layer === 'network') { const sw = est.edges.find((e) => e.rel === 'FEEDS' && devs.some((d) => nodeKey(d) === nodeKey(e.to)))?.from; return sw ? [sw.id] : []; }
    if (layer === 'media') return devs.filter((d) => /A-0103|A-0201/.test(d.id)).map((d) => d.id);
    if (layer === 'control') return devs.filter((d) => /A-0105|A-0302/.test(d.id)).map((d) => d.id);
    return [];
  };
  // the room's accepted baseline is read from the records the KPI passports and the room story read (records.ts), never typed here
  const baselineOf = (roomId: string) => acceptedBaseline(assemble(w, loadDraft()), roomId);
  return (
    <section className="apex">
      <header className="build__head"><div><p className="kicker">APEX · diagnosis with its evidence</p><h1>Cited hypotheses, bounded actions, blocked outcomes</h1>
        <p className="ui-muted">Acting as <b>{personaLabel(persona)}</b>. Seven layers of evidence, ranked hypotheses that say why they are not proven, and action tiers A0–A5. A4 needs a signed runbook, owner approval, a window, an occupancy check and a dry run — and the real adapter state blocks it here. Every outcome, including the blocked ones, is in the log.</p></div>
        {wantInc && !H && open.some((i) => i.id === wantInc) && <Button kind="primary" onClick={() => { const r = apply((x) => S.openApex(x, persona, wantInc, cite(w.incidents.find((i) => i.id === wantInc)!.roomId))); if (!isRefusal(r)) setSel(r.id); }}>Open a case for {wantInc}</Button>}
      </header>
      {refusal && <div role="alert"><Notice tone="bad"><b>Refused.</b><ul className="build__why">{refusal.why.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
      <div className="svc__grid">
        <div className="stack">
          <h2 className="build__h">Cases</h2>
          <ul className="svc__list" data-testid="apex-cases">{w.apexCases.map((c) => <li key={c.id} className={c.id === sel ? 'on' : ''}><a href={`#/v25/apex?case=${c.id}`} onClick={(e) => { e.preventDefault(); setSel(c.id); }}><b>{c.id}</b> <span className="ui-meta">{w.incidents.find((i) => i.id === c.incidentId)?.title} · {c.hypotheses.length} hypotheses · {c.actions.length} action(s){c.reviewed ? ' · reviewed' : ''}</span></a></li>)}{!w.apexCases.length && <li className="ui-meta">No case yet.</li>}</ul>
          <h2 className="build__h">Incidents without a case</h2>
          <ul className="svc__list">{open.map((i) => <li key={i.id}><span><b>{i.title}</b> <span className="ui-meta">{i.id} · {i.roomName} · {i.severity}</span></span> {holds(persona, S.APEX_ACT_AUTHORITIES[0]!) || S.APEX_ACT_AUTHORITIES.some((a) => holds(persona, a)) ? <Button small onClick={() => { const r = apply((x) => S.openApex(x, persona, i.id, cite(i.roomId))); if (!isRefusal(r)) setSel(r.id); }}>Open a case</Button> : <span className="ui-meta">not your authority</span>}</li>)}{!open.length && <li className="ui-meta">Every open incident has a case.</li>}</ul>
        </div>
        <div className="svc__detail">{H ? <Case H={H} w={w} apply={apply} persona={persona} baseline={baselineOf(H.roomId)} /> : <div className="empty" data-testid="apex-empty"><b>No case open</b><p>Open a case from an incident on the left. A case gathers the seven layers of evidence for its room, ranks hypotheses with the reasons they are not proven, and bounds every action by tier — nothing runs without the preflight.</p></div>}</div>
      </div>
    </section>
  );
}

function Case({ H, w, apply, persona, baseline }: { H: S.ApexCase; w: S.Workspace; apply: ReturnType<typeof useWorkspace>['apply']; persona: string; baseline: { version: number; evidence: number } | null }) {
  const inc = w.incidents.find((i) => i.id === H.incidentId)!;
  const [hyp, setHyp] = useState(H.hypotheses[0]!.id);
  const h = H.hypotheses.find((x) => x.id === hyp) || H.hypotheses[0]!;
  const [a4, setA4] = useState({ owner: false, window: '', occupied: false, simulate: false, targets: '', dry: false, branch: 'nominal' as 'nominal' | 'lost_signal' | 'estop' | 'incomplete' });
  const can = S.APEX_ACT_AUTHORITIES.some((a) => holds(persona, a));
  const run = (tier: Tier) => apply((x) => S.apexAct(x, persona, H.id, h.id, tier === 'A4' ? { tier, ownerApproved: a4.owner, window: a4.window || null, occupied: a4.occupied, simulate: a4.simulate, targets: a4.targets ? a4.targets.split(',').map((t) => t.trim()).filter(Boolean) : null, dryRunDone: a4.dry, branch: a4.branch } : { tier }, baseline));
  return (
    <div className="stack" data-testid="apex-case">
      <h2 className="build__h">{H.id} · {inc.title} <Tag tone="muted">{H.key} branch</Tag>{H.reviewed && <Tag tone="ok">reviewed: {H.reviewed.verdict}</Tag>}</h2>
      <Facts items={[['Incident', `${inc.id} · ${inc.state}`], ['Room', inc.roomName], ['Baseline to compare', baseline ? `v${baseline.version} (${baseline.evidence} evidence items)` : 'none accepted — nothing to compare'], ['Adapters', Object.entries(w.adapters).map(([k, v]) => `${k} ${v}`).join(' · ')]]} />
      <div className="apex__layers" data-testid="layers">{H.layers.map((l) => <div key={l.layer} className={`apex__layer${l.observations.length ? ' has' : ''}`}><b>{l.label}</b>{l.observations.length ? <ul>{l.observations.map((o) => <li key={o}>{o}</li>)}</ul> : <span className="ui-meta">nothing recorded</span>}{l.cites.length > 0 && <span className="ui-meta">cites {l.cites.join(', ')}</span>}</div>)}</div>
      <h3 className="build__h">Hypotheses, ranked</h3>
      <ol className="apex__hyps">{H.hypotheses.map((x) => <li key={x.id} className={x.id === h.id ? 'on' : ''}><button type="button" onClick={() => setHyp(x.id)}><Tag tone={CONF[x.confidence]}>{x.confidence}</Tag> <b>{x.text}</b> <span className="ui-meta">{x.layer} · {x.action.tier}{x.action.runbook ? ` · ${x.action.runbook}` : ''}</span></button></li>)}</ol>
      <div className="card stack" data-testid="hypothesis">
        <p><b>{h.text}</b></p>
        <Facts items={[['Why it is not proven', h.caveat], ['Evidence cited', h.evidence.length ? h.evidence.join('; ') : 'none'], ['Against it', h.negative.length ? h.negative.join('; ') : '—'], ['Next', h.next.length ? h.next.join('; ') : '—']]} />
        <div className="apex__tiers">{(Object.keys(TIERS) as Tier[]).map((t) => <div key={t} className={`apex__tier${t === h.action.tier ? ' on' : ''}`}><b>{t} · {TIERS[t].label}</b><span className="ui-meta">{TIERS[t].bound}</span>{can ? <Button small kind={t === h.action.tier ? 'primary' : 'secondary'} onClick={() => run(t)}>{t === 'A4' ? 'Run the preflight' : TIERS[t].label}</Button> : null}</div>)}</div>
        {h.action.runbook && RUNBOOKS[h.action.runbook] && <Facts items={[['Runbook', `${h.action.runbook} · ${RUNBOOKS[h.action.runbook]!.label} · v${RUNBOOKS[h.action.runbook]!.version} · ${RUNBOOKS[h.action.runbook]!.signedBy ? `signed by ${RUNBOOKS[h.action.runbook]!.signedBy}` : 'UNSIGNED'}`], ['Targets · allowlist', `${RUNBOOKS[h.action.runbook]!.targets.join('/')} · ${RUNBOOKS[h.action.runbook]!.allowlist.join(', ') || 'none'}`], ['Blast radius · rollback · rate', `${RUNBOOKS[h.action.runbook]!.blastRadius} · ${RUNBOOKS[h.action.runbook]!.rollback} · ${RUNBOOKS[h.action.runbook]!.rateLimit}`]]} />}
        {can && h.action.tier === 'A4' && <div className="stack" data-testid="a4">
          <label className="check"><input type="checkbox" checked={a4.owner} onChange={(e) => setA4({ ...a4, owner: e.target.checked })} /> Owner approval given (room owner / operations)</label>
          <div className="build__row"><label className="ui-muted" htmlFor="a4-win">Preauthorized window</label><input id="a4-win" value={a4.window} onChange={(e) => setA4({ ...a4, window: e.target.value })} placeholder="2026-11-04T20:00Z" /></div>
          <label className="check"><input type="checkbox" checked={a4.occupied} onChange={(e) => setA4({ ...a4, occupied: e.target.checked })} /> The room is occupied right now</label>
          <label className="check"><input type="checkbox" checked={a4.simulate} onChange={(e) => setA4({ ...a4, simulate: e.target.checked })} /> Simulate a SUPPORTED_VERIFIED adapter (demonstration; as configured in this build every adapter is NOT_CONFIGURED → blocked)</label>
          <div className="build__row"><label className="ui-muted" htmlFor="a4-t">Targets</label><input id="a4-t" value={a4.targets} onChange={(e) => setA4({ ...a4, targets: e.target.value })} placeholder="comma-separated; outside the allowlist = side effects" /></div>
          <label className="check"><input type="checkbox" checked={a4.dry} onChange={(e) => setA4({ ...a4, dry: e.target.checked })} /> Dry run acknowledged — execute the bounded simulation</label>
          <div className="build__row"><label className="ui-muted" htmlFor="a4-b">Simulated branch</label><select id="a4-b" value={a4.branch} onChange={(e) => setA4({ ...a4, branch: e.target.value as never })}><option value="nominal">Nominal</option><option value="lost_signal">Lost signal mid-run</option><option value="estop">Operator emergency stop</option><option value="incomplete">Incomplete repair (verification fails)</option></select></div>
        </div>}
        {!can && <p className="ui-meta">{personaLabel(persona)} cannot act on an APEX case (needs {S.APEX_ACT_AUTHORITIES.slice(0, 3).join(', ')} …).</p>}
        {holds(persona, 'tests.verify.all') || holds(persona, 'service.verify') || holds(persona, 'baseline.approve') ? <div className="build__row"><Button small onClick={() => apply((x) => S.apexReview(x, persona, H.id, `${h.id} plausible`))}>Review the diagnosis ({h.id} plausible)</Button></div> : null}
      </div>
      <h3 className="build__h">Action log ({H.actions.length})</h3>
      <ul className="apex__log" data-testid="apex-log">{H.actions.map((a, i) => <li key={i}><Tag tone={OUT[a.outcome] || 'muted'}>{a.outcome}</Tag> <b>{a.tier}</b> {a.hypothesisId}{a.runbook ? ` · ${a.runbook}` : ''}{a.simulated ? ' · SIMULATED' : ''} <span className="ui-meta">{when(a.at)} · {personaLabel(a.by)}</span><div className="ui-meta">{a.detail}</div>{a.verification && <div className="ui-meta">post-repair verification: {a.verification}</div>}</li>)}{!H.actions.length && <li className="ui-meta">No action yet.</li>}</ul>
      <div className="svc__links"><a href={`#/v25/service?id=${inc.id}`}>ServiceHands {inc.id}</a> · <a href={`#/search?focus=Room:${inc.roomId}`}>Search Party</a></div>
    </div>
  );
}
