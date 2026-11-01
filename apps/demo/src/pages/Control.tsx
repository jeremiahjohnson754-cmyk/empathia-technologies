/**
 * Mission Control, Executive intelligence and the Evidence ledger / policy — the three pages that show the whole platform at once.
 *   - Mission Control: every station (intake, decision, funding, design, commissioning, field, documents, handoff, assurance, service)
 *     counts live records of this demonstration — the Build a Room draft, the service workspace, the synthetic estate — and every
 *     record opens where it lives, with its history.
 *   - Executive: the 27 KPI passports of @empathia/kpi-engine computed from those records: numerator, denominator, window, coverage,
 *     freshness, confidence; "not measurable" is never 0%.
 *   - Ledger: every event behind every state (the workspace's and the room draft's), with actor, time and local time; the policy page
 *     is the role × area matrix the demonstrator's dispatcher used, verbatim, beside the authority each native page checks.
 */
import { useMemo, useState } from 'react';
import { Button, Facts, Notice, Tag, Tabs } from '@empathia/ui';
import { passports, type Passport } from '@empathia/kpi-engine';
import { TIERS } from '@empathia/apex-engine';
import areaRoles from '../generated/area-roles.json';
import * as S from '../workspace/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { loadDraft, personaOf, personaLabel, holds, identity as unitIdentity, identityLabel, live as liveOf, type Draft } from '../build/store.js';
import { NATIVE } from '../registry.js';
import { assemble, stationCounts, roomAggregates } from '../workspace/records.js';

const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
const local = (s: string) => new Date(s).toLocaleString(undefined, { hour12: false });

// the records of this demonstration (assemble), Mission Control's station counts and a room's ledger aggregates live in a pure module
// (../workspace/records.ts) so the room story and the Build a Room impact panel compute from the same code
export { assemble } from '../workspace/records.js';

// ------------------------------------------------------------------------------------------------------------ Mission Control
export function MissionControl({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective);
  const { w } = useWorkspace(); const d = loadDraft();
  const R = useMemo(() => assemble(w, d), [w, d]);
  const stations = stationCounts(R, w);
  const latest = [...w.events, ...(d?.events.map((e) => ({ ...e, aggregate: d.code })) || [])].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
  return (
    <section className="mc">
      <header className="build__head"><div><p className="kicker">Mission Control · one connected lifecycle</p><h1>What changed, what matters, what needs action</h1><p className="ui-muted">Acting as <b>{personaLabel(persona)}</b>. Every station counts live records of this demonstration; every record opens where it lives and carries its history and its events.</p></div></header>
      <div className="mc__stations" data-testid="stations">{stations.map((s) => <a key={s.key} className="mc__station" href={s.href}><span className="mc__n">{s.count}</span><b>{s.label}</b><ul>{s.items.slice(0, 3).map((x) => <li key={x}>{x}</li>)}{s.items.length > 3 && <li className="ui-meta">+{s.items.length - 3} more</li>}{!s.items.length && <li className="ui-meta">nothing pending</li>}</ul></a>)}</div>
      <div className="svc__grid">
        <div className="card stack"><h2 className="build__h">Needs action by {personaLabel(persona)}</h2><ul className="plain">{needsAction(w, d, persona).map((x) => <li key={x.text}><a href={x.href}>{x.text}</a></li>)}{!needsAction(w, d, persona).length && <li className="ui-meta">Nothing waits on this perspective right now.</li>}</ul></div>
        <div className="card stack"><h2 className="build__h">Latest events</h2><ul className="plain">{latest.map((e, i) => <li key={i}><Tag tone={e.outcome === 'DENIED' ? 'bad' : 'ok'}>{e.outcome}</Tag> <b>{e.type}</b> <span className="ui-meta">{('aggregate' in e ? (e as { aggregate: string }).aggregate : '')} · {personaLabel(e.by)} · {when(e.at)}</span></li>)}</ul><a href="#/v25/ledger">The whole ledger →</a></div>
      </div>
    </section>
  );
}
function needsAction(w: S.Workspace, d: Draft | null, persona: string): Array<{ text: string; href: string }> {
  const out: Array<{ text: string; href: string }> = [];
  for (const i of w.incidents) {
    if (i.state === 'OPEN' && holds(persona, 'service.triage')) out.push({ text: `Triage ${i.id} · ${i.title}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'TRIAGED' && holds(persona, 'service.assign')) out.push({ text: `Assign ${i.id} · ${i.title}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'ASSIGNED' && S.techForPersona(persona) === S.workOrderOf(w, i.workOrderId || '')?.techId) out.push({ text: `Accept the job ${i.workOrderId}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'VERIFYING' && holds(persona, 'service.verify')) out.push({ text: `Verify the repair on ${i.id}`, href: `#/v25/service?id=${i.id}` });
    if (i.state === 'RESOLVED' && holds(persona, 'service.close')) out.push({ text: `Close ${i.id}`, href: `#/v25/service?id=${i.id}` });
  }
  for (const c of w.learnCases) { if (c.state === 'PROPOSED' && S.LEARN_SME.some((a) => holds(persona, a)) && c.proposedBy !== persona) out.push({ text: `SME review of ${c.id}`, href: `#/v25/learn?case=${c.id}` }); if (c.state === 'SME_REVIEWED' && holds(persona, 'case.approve')) out.push({ text: `Approve ${c.id} for Learn`, href: `#/v25/learn?case=${c.id}` }); }
  if (d) { if (d.design.lifecycle === 'PLANNED' && holds(persona, 'room.design.approve')) out.push({ text: `Approve the design of ${d.name}`, href: '#/v25/build?tab=lifecycle' }); if (d.design.lifecycle === 'COMMISSIONING' && holds(persona, 'tests.verify.all')) out.push({ text: `Record results on ${d.name}`, href: '#/v25/build?tab=lifecycle' }); }
  return out;
}

// ------------------------------------------------------------------------------------------------------------ Executive intelligence
const LEVEL: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { high: 'ok', medium: 'info', low: 'warn', none: 'muted' };
export function ExecPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective);
  const { w } = useWorkspace(); const d = loadDraft();
  const [days, setDays] = useState(90); const [sel, setSel] = useState<string | null>(null);
  const R = useMemo(() => assemble(w, d), [w, d]);
  const ps = useMemo(() => passports(R, days), [R, days]);
  const p = ps.find((x) => x.id === sel) || null;
  const allowed = ['exec', 'opslead', 'bpm', 'syseng', 'svcmgr', 'steward', 'architect'].includes(persona);
  if (!allowed) return <section className="exec"><header className="build__head"><div><p className="kicker">Executive intelligence</p><h1>KPI passports</h1></div></header><Notice tone="warn"><b>Acting as {personaLabel(persona)}: this perspective does not see executive passports.</b> They are read by the executive, operations, business and systems leads, the service manager and the steward; usage figures are aggregate-only for everyone.</Notice></section>;
  return (
    <section className="exec">
      <header className="build__head"><div><p className="kicker">Executive intelligence · shows its work</p><h1>Twenty-seven KPI passports</h1><p className="ui-muted">Computed from the records and the ledger: numerator, denominator, window, coverage, freshness and confidence. Usage is aggregate-only; "not measurable" is never 0%.</p></div>
        <div className="build__state">{[30, 90, 180, 365].map((n) => <Button key={n} small kind={n === days ? 'primary' : 'secondary'} onClick={() => setDays(n)}>{n} days</Button>)}</div></header>
      <div className="exec__grid" data-testid="passports">{ps.map((x) => <button key={x.id} type="button" className={`exec__tile${x.id === sel ? ' on' : ''}${x.state === 'NOT_MEASURABLE' ? ' nm' : ''}`} onClick={() => setSel(x.id)}><span className="exec__label">{x.label}</span><span className="exec__value">{x.state === 'NOT_MEASURABLE' ? 'not measurable' : x.byCurrency ? Object.entries(x.byCurrency).map(([c, v]) => `${v.toLocaleString()} ${c}`).join(' · ') : `${x.value}${x.unit === '%' ? '%' : ''}`}</span><span className="ui-meta">{x.state === 'NOT_MEASURABLE' ? x.reason : `${x.numerator} / ${x.denominator} ${x.unit !== '%' ? x.unit : ''}`}</span><Tag tone={LEVEL[x.confidence.level]}>{x.confidence.level}</Tag></button>)}</div>
      {p && <PassportView p={p} />}
      {d && (d.installations || []).length > 0 && <Units d={d} />}
    </section>
  );
}
/** Pro reads the same identities as Build a Room, the register, Assurance and Search Party (ADR-0012): position · unit · identity, and
 *  how much of the installed estate has a recorded identity — UNKNOWN is never counted as known. */
function Units({ d }: { d: Draft }) {
  const devs = (liveOf(d.design.devices) as Array<{ id: string; label: string; furniture?: boolean }>).filter((x) => !x.furniture);
  const ids = devs.map((x) => unitIdentity(d, x.id)); const known = ids.filter((i) => i.identityState && i.identityState !== 'UNKNOWN').length;
  return (
    <div className="card stack" data-testid="exec-units">
      <h2 className="build__h">Installed units · {d.name}</h2>
      <p>{ids.filter((i) => i.asset).length} of {devs.length} positions hold a unit; {known} with a recorded identity ({ids.length ? Math.round((known / ids.length) * 100) : 0}%). Synthetic units: UNKNOWN means nothing about the unit is recorded.</p>
      <ul className="build__list">{devs.map((x) => <li key={x.id} data-identity={identityLabel(d, x.id)}>{identityLabel(d, x.id)} <span className="ui-muted">{x.label}</span></li>)}</ul>
    </div>
  );
}
function PassportView({ p }: { p: Passport }) {
  return (
    <div className="card stack" data-testid="passport">
      <h2 className="build__h">KPI passport · {p.label} <Tag tone={p.state === 'MEASURED' ? 'ok' : 'muted'}>{p.state}</Tag></h2>
      <p>{p.definition}</p>
      <Facts items={[['Value', p.state === 'MEASURED' ? `${p.value}${p.unit === '%' ? '%' : ` ${p.unit}`}` : `not measurable — ${p.reason}`], ['Numerator / denominator', p.numerator === null ? '—' : `${p.numerator} / ${p.denominator}`], ['Window', `${p.window.days} days · ${when(p.window.from)} → ${when(p.window.to)}`], ['Coverage', `${p.coverage.observed} of ${p.coverage.total} eligible records observed`], ['Freshness', p.freshness === null ? '—' : `freshest source ${p.freshness} day(s) old`], ['Confidence', `${p.confidence.level}${p.confidence.reasons.length ? ` — ${p.confidence.reasons.join('; ')}` : ''}`], ['Source · owner · privacy', `${p.source} · ${p.owner} · ${p.privacy}`], ['Exclusions', p.exclusions.join('; ') || 'none'], ['Drill-down', p.drill.length ? p.drill.join(', ') : '—'], ['Version', p.version]]} />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------------ Ledger and policy
export const PAGE_AUTHORITIES: Array<{ page: string; href: string; gates: string[] }> = [
  { page: 'Build a Room (Lite · commissioning · acceptance)', href: '#/v25/build', gates: ['room.design', 'room.classify.approve', 'room.design.approve', 'window.approve', 'work.evidence', 'tests.verify.all', 'test.verify', 'customer.accept', 'plan.compile'] },
  { page: 'Search Party', href: '#/search', gates: ['(read within the visible catalogue)'] },
  { page: 'ServiceHands', href: '#/v25/service', gates: ['service.triage', 'service.assign', 'work.accept', 'work.start', 'work.evidence', 'service.verify', 'service.close', 'service.reopen', 'request.submit'] },
  { page: 'APEX', href: '#/v25/apex', gates: S.APEX_ACT_AUTHORITIES },
  { page: 'Learn cases', href: '#/v25/learn', gates: [...new Set([...S.LEARN_PROPOSE, ...S.LEARN_SME, 'case.approve'])] },
  { page: 'Executive passports', href: '#/v25/exec', gates: ['(roles: exec, opslead, bpm, syseng, svcmgr, steward, architect)'] },
];
export function LedgerPage({ perspective, policy, hash = '' }: { perspective: string; policy: boolean; hash?: string }) {
  const persona = personaOf(perspective);
  const { w } = useWorkspace(); const d = loadDraft();
  const [q, setQ] = useState(''); const [only, setOnly] = useState<'all' | 'DENIED' | 'ALLOWED'>('all');
  // #/v25/ledger?room=<id> (linked from a room's story): only the events of that room's records — the room, its incidents, work orders, cases and sessions
  const room = /[?&]room=([A-Za-z0-9-]+)/.exec(hash)?.[1] || null;
  const scope = useMemo(() => (room ? roomAggregates(w, room) : null), [w, room]);
  const events = useMemo(() => [...w.events, ...(d?.events.map((e) => ({ ...e, aggregate: d.code })) || [])].sort((a, b) => (a.at < b.at ? 1 : -1)), [w, d]);
  const shown = events.filter((e) => (!scope || scope.has(e.aggregate)) && (only === 'all' || e.outcome === only) && (!q || `${e.type} ${e.aggregate} ${e.detail} ${e.by}`.toLowerCase().includes(q.toLowerCase())));
  const tab = policy ? 'policy' : 'ledger';
  return (
    <section className="ledger">
      <header className="build__head"><div><p className="kicker">Evidence ledger</p><h1>{policy ? 'The role × area matrix the dispatcher uses' : 'The ledger behind every state'}</h1><p className="ui-muted">Acting as <b>{personaLabel(persona)}</b>. Every transition emitted a validated event with its actor, time and local time. This is a demonstration of authorisation, not security.</p></div></header>
      <Tabs label="Ledger" active={tab} onChange={(k) => { location.hash = k === 'policy' ? '#/v25/policy' : '#/v25/ledger'; }} tabs={[{ key: 'ledger', label: 'Events', count: events.length }, { key: 'policy', label: 'Policy' }]} />
      {!policy ? <div className="stack">
        {room && <p className="ledger__scope" data-testid="ledger-scope">Only the events of room <b>{room}</b>'s records ({scope?.size || 0} record{scope?.size === 1 ? '' : 's'}: {[...(scope || [])].join(', ')}). <a href={`#/story/${room}`}>The room's story</a> · <a href="#/v25/ledger">Show every event</a></p>}
        <div className="build__row"><input className="sp__input" aria-label="Filter events" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by type, record, actor or detail" />{(['all', 'ALLOWED', 'DENIED'] as const).map((k) => <Button key={k} small kind={only === k ? 'primary' : 'secondary'} onClick={() => setOnly(k)}>{k}</Button>)}</div>
        <table className="build__table" data-testid="ledger"><thead><tr><th>When (UTC)</th><th>Local</th><th>Who</th><th>Event</th><th>Record</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>{shown.slice(0, 200).map((e, i) => <tr key={i}><td className="ui-mono">{e.at.slice(0, 19).replace('T', ' ')}</td><td className="ui-meta">{local(e.at)}</td><td>{personaLabel(e.by)}</td><td className="ui-mono">{e.type}</td><td className="ui-mono">{e.aggregate}</td><td><Tag tone={e.outcome === 'DENIED' ? 'bad' : 'ok'}>{e.outcome}</Tag></td><td className="ui-meta">{e.detail}</td></tr>)}</tbody></table>
        {shown.length > 200 && <p className="ui-meta">{shown.length - 200} more not shown.</p>}
      </div> : <div className="stack">
        <h2 className="build__h">What each native page checks (from the code that checks it)</h2>
        <table className="build__table" data-testid="policy-gates"><thead><tr><th>Page</th><th>Authorities checked</th><th>{personaLabel(persona)} holds</th></tr></thead><tbody>{PAGE_AUTHORITIES.map((p) => <tr key={p.page}><td><a href={p.href}>{p.page}</a></td><td className="ui-meta">{p.gates.join(', ')}</td><td>{p.gates.filter((g) => !g.startsWith('(')).filter((g) => holds(persona, g)).join(', ') || <span className="ui-meta">none of these</span>}</td></tr>)}</tbody></table>
        <h2 className="build__h">Role × area visibility of the V2.5.3 demonstrator (verbatim)</h2>
        <p className="ui-meta">{areaRoles.areas.length} areas × {areaRoles.roles.length} roles; ● visible to the role. A perspective here shows what that role sees; it grants nothing.</p>
        <div className="ledger__matrix"><table className="build__table" data-testid="policy-matrix"><thead><tr><th>Area</th>{areaRoles.roles.map((r) => <th key={r} className={r === perspective ? 'on' : ''}>{r}</th>)}</tr></thead><tbody>{areaRoles.areas.map((a) => <tr key={a.key}><td>{a.label} <span className="ui-meta mono">{a.key}</span>{NATIVE.has(a.key) && <Tag tone="ok">native</Tag>}</td>{areaRoles.roles.map((r) => <td key={r} className={r === perspective ? 'on' : ''}>{a.roles.includes(r) ? '●' : ''}</td>)}</tr>)}</tbody></table></div>
        <h2 className="build__h">APEX action tiers</h2>
        <ul className="plain">{Object.entries(TIERS).map(([k, t]) => <li key={k}><b>{k} · {t.label}</b> <span className="ui-meta">{t.bound} · {t.autonomous ? 'may run on its own within its bound' : 'never autonomous'}</span></li>)}</ul>
      </div>}
    </section>
  );
}
