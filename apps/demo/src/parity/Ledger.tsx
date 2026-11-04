/**
 * #/ledger (the evidence ledger: every conclusion the platform draws and what it stands on), #/ledger/rec/<id> (one entry),
 * #/ledger/agent and #/ledger/agent/<room> (the Room Health Check's log). Conclusions are derived here from the Core records by the rules
 * stated on each entry; a contradiction is two records of this demonstration that cannot both be right. Nothing is given a confidence
 * score: the evidence is named instead.
 */
import { useState } from 'react';
import { PageHero, Card, StatTile, Segmented, Tag, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { shortName, fullName, roomHref } from '../campus/canon.js';
import { openIssues, type RoomRecord } from '../campus/design.js';
import { healthOf, RULES, plural, day, type Core, type Rec } from './core.js';
import { useCore, honest, Crumbs, Pills, Zone, RecList, FactsTable, canEntity } from './ui.js';
import { runsOf, runOf, hasAgent } from './agentModel.js';
import { outcomeTag } from './Agent.js';

type Strength = 'Verified' | 'Recorded' | 'Derived' | 'Inferred';
export interface Conclusion { id: string; kind: 'Room health' | 'Commissioning' | 'Assurance' | 'Portfolio' | 'Recommendation'; text: string; about: string; strength: Strength; rule: string; evidence: Rec[]; contradiction?: string; signedBy?: string; href?: string }
const band = (n: number) => (n >= 85 ? 'healthy' : n >= 70 ? 'monitor' : 'action needed');

export function conclusions(core: Core): Conclusion[] {
  const out: Conclusion[] = []; const ev = (type: Rec['type'], pred: (r: Rec) => boolean) => core.byType[type].filter(pred);
  core.rooms.forEach((r: RoomRecord) => {
    const o = r.outline; const id = o.id.slice(2); const h = healthOf(r); const room = ev('Room', (x) => x.id === o.id);
    out.push({ id: `C-H-${id}`, kind: 'Room health', text: `Health of ${shortName(o)}: ${band(h)}, ${h} of 100`, about: fullName(o), strength: 'Derived', rule: RULES.health, evidence: [...room, ...ev('Issue', (x) => x.roomId === o.id && x.state !== 'RESOLVED')], href: roomHref(o) });
    if (r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL') {
      const cur = r.baselines.find((b) => b.state === 'CURRENT');
      const contra = r.counts.applicable && r.counts.verified < r.counts.applicable ? `The record says ${r.lifecycle}, yet ${r.counts.applicable - r.counts.verified} of ${r.counts.applicable} applicable tests have no verified result: both cannot be right. The engine would not reach ${r.lifecycle} on this evidence.` : undefined;
      out.push({ id: `C-C-${id}`, kind: 'Commissioning', text: `Commissioning of ${shortName(o)}: ${r.lifecycle.toLowerCase()}`, about: fullName(o), strength: contra ? 'Recorded' : 'Verified', rule: 'Accepted when every applicable test has a verified result and no deficiency is open (the commissioning engine’s rule).', evidence: [...room, ...ev('Document', (x) => x.roomId === o.id && x.state === 'Commissioning report')], contradiction: contra, signedBy: cur?.by || undefined, href: roomHref(o) });
    }
    if (r.baselines.length && openIssues(r).length) out.push({ id: `C-A-${id}`, kind: 'Assurance', text: `${shortName(o)} differs from its baseline on ${plural(openIssues(r).length, 'open issue')}`, about: fullName(o), strength: 'Recorded', rule: 'An open issue on a device of a baselined room is a difference from what was commissioned.', evidence: ev('Issue', (x) => x.roomId === o.id && x.state !== 'RESOLVED'), href: roomHref(o) });
  });
  const unc = ev('Device', (d) => d.state === 'In service');
  out.push({ id: 'C-P-SUPPORT', kind: 'Portfolio', text: `${plural(unc.length, 'device')} in service have no active support agreement`, about: 'The estate', strength: 'Inferred', rule: RULES.stage, evidence: unc, href: '#/set/dev:uncovered' });
  const layers: Record<string, number> = {}; core.rooms.forEach((r) => openIssues(r).forEach((i) => i.positions.forEach((c) => { const l = r.positions.find((p) => p.code === c)?.layer || 'unknown'; layers[l] = (layers[l] || 0) + 1; })));
  const top = Object.entries(layers).sort((a, b) => b[1] - a[1])[0];
  if (top) out.push({ id: 'C-P-LAYER', kind: 'Portfolio', text: `The layer with the most open issues is ${top[0]} (${top[1]} of ${Object.values(layers).reduce((s, n) => s + n, 0)})`, about: 'The estate', strength: 'Recorded', rule: 'Each open issue counted once per device position it names, by the position’s layer.', evidence: ev('Issue', (x) => x.state !== 'RESOLVED'), href: '#/set/iss:open' });
  core.byType.Recommendation.forEach((x) => out.push({ id: `C-R-${x.id.slice(4)}`, kind: 'Recommendation', text: x.name, about: x.sub.split(' · ')[0]!, strength: 'Inferred', rule: RULES.recommendation, evidence: [x, ...x.links.map((l) => core.get(l.id)).filter(Boolean) as Rec[]], href: x.href }));
  return out;
}
const STRENGTH_TONE: Record<Strength, 'ok' | 'info' | 'warn' | 'muted'> = { Verified: 'ok', Recorded: 'info', Derived: 'muted', Inferred: 'warn' };

export default function LedgerPage(p: PageProps) {
  const seg = p.hash.replace(/^#\/?/, '').split(/[?~]/)[0]!.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  return <div className="pa" data-testid="parity-ledger">{seg[1] === 'agent' ? <AgentLog {...p} room={seg[2]} /> : seg[1] === 'rec' && seg[2] ? <Entry {...p} id={seg[2]} /> : <Ledger {...p} />}</div>;
}
const nav = (on: 'all' | 'agent') => <Pills label="Ledger views" items={[{ label: 'Conclusions', href: '#/ledger', on: on === 'all' }, { label: 'Room Health Check log', href: '#/ledger/agent', on: on === 'agent' }]} />;

function Ledger({ role }: PageProps) {
  const core = useCore(); const all = conclusions(core);
  const [kind, setKind] = useState<'all' | Conclusion['kind']>('all'); const [strength, setStrength] = useState<'all' | 'strong' | 'weak' | 'contra'>('all');
  const rows = all.filter((c) => (kind === 'all' || c.kind === kind) && (strength === 'all' || (strength === 'strong' ? c.strength === 'Verified' || c.strength === 'Recorded' : strength === 'weak' ? c.strength === 'Derived' || c.strength === 'Inferred' : !!c.contradiction)));
  const kinds = ['Portfolio', 'Room health', 'Commissioning', 'Assurance', 'Recommendation'] as const;
  return (
    <>
      <PageHero eyebrow="Core · evidence ledger" title="Evidence ledger" product="mission-control" icon="book"
        lede="Every major conclusion the platform draws, and what it stands on. Wherever you see “Why this?”, it opens the entry here."
        meta={honest(['Evidence ledger', 'accent'], ['Engineer approval required', 'muted'], ['Modeled · not measured', 'muted'])} />
      {nav('all')}
      <div className="kit-grid kit-grid--tiles">
        <StatTile label="Conclusions" value={all.length} icon="book" hint="about rooms, causes, changes and the portfolio" />
        <StatTile label="Verified or recorded" value={all.filter((c) => c.strength === 'Verified' || c.strength === 'Recorded').length} unit={` of ${all.length}`} icon="check" hint="the rest are derived by a rule or inferred" />
        <StatTile label="With a contradiction" value={all.filter((c) => c.contradiction).length} icon="alert" hint="two records that cannot both be right" />
        <StatTile label="Signed by a person" value={all.filter((c) => c.signedBy).length} unit={` of ${all.length}`} icon="user" hint="the model never approves on its own" />
      </div>
      <div className="pa-toolbar">
        <Segmented small label="Evidence" value={strength} onChange={setStrength} options={[{ value: 'all', label: 'All' }, { value: 'strong', label: 'Verified or recorded' }, { value: 'weak', label: 'Derived or inferred' }, { value: 'contra', label: 'With a contradiction' }]} />
        <Segmented small label="Kind" value={kind} onChange={setKind} options={[{ value: 'all', label: 'Every kind' }, ...kinds.map((k) => ({ value: k, label: k, count: all.filter((c) => c.kind === k).length }))]} />
      </div>
      <Zone title="Conclusions" note={`${rows.length} shown`}>
        {rows.length ? <ul className="pa-queue" aria-label="Conclusions">{rows.slice(0, 60).map((c) => (
          <li key={c.id}><a className="pa-inc" href={`#/ledger/rec/${c.id}`} data-testid="ledger-row">
            <span className={`pa-inc__sev kit-s--${c.contradiction ? 'bad' : STRENGTH_TONE[c.strength] === 'muted' ? 'accent' : STRENGTH_TONE[c.strength]}`} aria-hidden="true" />
            <span><span className="pa-inc__t">{c.text}</span><br /><span className="pa-inc__s">{c.kind} · {c.about} · {plural(c.evidence.filter((e) => canEntity(role, e.type)).length, 'record')} of evidence{c.signedBy ? ` · signed by ${c.signedBy}` : ''}</span></span>
            <span className="pa-chips">{c.contradiction ? <Tag tone="bad">contradiction</Tag> : null}<Tag tone={STRENGTH_TONE[c.strength]}>{c.strength}</Tag></span>
          </a></li>
        ))}</ul> : <EmptyState title="No conclusion matches these filters" icon="filter" />}
        {rows.length > 60 ? <p className="pa-note">The first 60 of {rows.length}; narrow by kind to see the rest.</p> : null}
      </Zone>
    </>
  );
}

function Entry({ role, id }: PageProps & { id: string }) {
  const core = useCore(); const c = conclusions(core).find((x) => x.id === id);
  if (!c) return <EmptyState title="No ledger entry with this address" icon="search" action={<a className="ui-btn" href="#/ledger">Every conclusion</a>}>Nothing in the ledger is numbered <code>{id}</code>.</EmptyState>;
  const ev = c.evidence.filter((e) => canEntity(role, e.type));
  return (
    <>
      <Crumbs items={[['Evidence ledger', '#/ledger'], [c.id]]} />
      <PageHero compact eyebrow={`Ledger entry · ${c.kind}`} title={c.text} product="mission-control" icon="book" lede={c.about}
        meta={[<Tag key="s" tone={STRENGTH_TONE[c.strength]}>{c.strength}</Tag>, ...(c.contradiction ? [<Tag key="c" tone="bad">contradiction</Tag>] : [])]}
        actions={c.href ? <a className="ui-btn ui-btn--primary" href={c.href}>Open what it is about</a> : undefined} />
      <div className="pa-split">
        <Card title="Why this?" icon="info" sub="The rule, the evidence and who signed">
          <FactsTable facts={[['Strength', c.strength], ['Rule', c.rule], ['Signed by', c.signedBy || 'nobody: no person has signed this conclusion'], ['Evidence', plural(ev.length, 'record')]]} />
          {c.contradiction ? <div className="ui-notice ui-tone--bad" role="note"><b>Contradiction. </b>{c.contradiction}</div> : null}
        </Card>
        <Card title="What it stands on" icon="link" sub={ev.length < c.evidence.length ? `${c.evidence.length - ev.length} more records are outside this role’s work` : 'Every record, openable'}>
          <RecList recs={ev} label="Evidence" step={8} empty="No evidence this role may open" />
        </Card>
      </div>
    </>
  );
}

function AgentLog({ room }: PageProps & { room?: string }) {
  const core = useCore();
  if (room) {
    const r = core.rooms.find((x) => x.outline.id === room);
    if (!r || !hasAgent(r)) return <EmptyState title="This room has no health-check log" icon="room" action={<a className="ui-btn" href="#/ledger/agent">Every room’s log</a>}>{r ? `${shortName(r.outline)} has no room computer for the agent to run on.` : `No room is called ${room}.`}</EmptyState>;
    const run = runOf(r);
    return (
      <>
        <Crumbs items={[['Evidence ledger', '#/ledger'], ['Room Health Check log', '#/ledger/agent'], [shortName(r.outline)]]} />
        <PageHero compact eyebrow="Room Health Check · one room" title={fullName(r.outline)} product="field" icon="pulse" lede={`Six checks, one line each; ran ${day(run.at)} (simulated). ${run.real ? plural(run.real, 'real fault') : 'No real fault'}; ${plural(run.pilotAlarms, 'alert')} under the pilot rules.`}
          meta={honest(['Simulated from Core device states', 'warn'])} actions={<a className="ui-btn" href={roomHref(r.outline)}>Open the room</a>} />
        <div className="pa-table-wrap"><table className="pa-table"><caption className="ui-sr">The six checks of the latest run</caption>
          <thead><tr><th scope="col">Check</th><th scope="col">Pilot rules</th><th scope="col">Tuned rules</th><th scope="col">Because</th></tr></thead>
          <tbody>{run.lines.map((l) => <tr key={l.check.key} className={l.pilot !== l.tuned ? 'pa-diff' : undefined}><th scope="row">{l.check.label}</th><td>{outcomeTag(l.pilot)}</td><td>{outcomeTag(l.tuned)}</td><td>{l.because}</td></tr>)}</tbody>
        </table></div>
      </>
    );
  }
  const runs = runsOf(core.rooms);
  return (
    <>
      <PageHero compact eyebrow="Core · evidence ledger" title="Room Health Check log" product="field" icon="pulse" lede={`${plural(runs.length * 6, 'line')} from ${plural(runs.length, 'room')}: what each check found in the latest run, pilot rules beside tuned rules.`} meta={honest(['Simulated from Core device states', 'warn'])} />
      {nav('agent')}
      <div className="pa-table-wrap"><table className="pa-table"><caption className="ui-sr">Latest run per room</caption>
        <thead><tr><th scope="col">Room</th><th scope="col" className="num">Checks</th><th scope="col" className="num">Real faults</th><th scope="col" className="num">Pilot alerts</th><th scope="col">Log</th></tr></thead>
        <tbody>{runs.map((r) => <tr key={r.room.outline.id} className={r.real ? 'pa-diff' : undefined}><th scope="row">{fullName(r.room.outline)}</th><td className="num">{r.lines.filter((l) => l.tuned !== 'not-applicable').length}</td><td className="num">{r.real}</td><td className="num">{r.pilotAlarms}</td><td><a href={`#/ledger/agent/${r.room.outline.id}`}>Six lines</a></td></tr>)}</tbody>
      </table></div>
    </>
  );
}
