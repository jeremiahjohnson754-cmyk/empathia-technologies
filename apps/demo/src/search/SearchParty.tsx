/**
 * Search Party in the investor demonstration: the same library the enterprise API runs (@empathia/search-party), on the synthetic estate
 * built in estate.ts, entirely in the page. Search, facets, the neighbourhood graph with provenance on every edge, downstream impact and
 * the relationship intents — with the same honest UNKNOWN answers for what the estate does not model.
 */
import { useEffect, useMemo, useState } from 'react';
import { Tag, Notice, Button } from '@empathia/ui';
import { search, neighbourhood, impact, radialLayout, ask, nodeKey, RELATIONS, NODE_TYPES, INTENTS, type NodeRef, type IntentAnswer } from '@empathia/search-party';
import { buildEstate } from './estate.js';
import { scenario, scenarioCount, SCENARIO_IDS, SCENARIO_TITLES } from './scenarios.js';
import { Icon, Section, List, ListRow } from '../spatial/parts.js';
import { PeopleTab, SupportTab, MapTab, OrgsTab, ActivityTab, VaultTab } from './Tabs.js';
import { resolve } from '../registry.pages.js';
import { canOpen } from '../access/policy.js';
import type { RoleKey } from '../registry.types.js';

/** V2.5.3's tab set, at its addresses; the panes beyond Search and Relationships live in Tabs.tsx. */
const TABS: Array<[string, string]> = [['', 'Search'], ['graph', 'Relationships'], ['people', 'People and expertise'], ['support', 'Support coverage'], ['projects', 'Project map'], ['orgs', 'Organizations'], ['activity', 'Activity'], ['vault', 'Evidence and artifacts']];
const TAB_TITLE: Record<string, string> = { graph: 'The estate', people: 'People and expertise', support: 'Support paths', ownership: 'Support paths and ownership', projects: 'Project map', orgs: 'Who is who', activity: 'What is happening', vault: 'Artifact vault' };
const TAB_LEDE: Record<string, string> = { graph: 'Start from a place, a record or a question; every connection is a recorded relationship with its provenance.', people: 'Who can do what, from the jobs and certifications on record — never a self-rating.', support: 'For each building: who answers first, the escalation organisation and the response target.', ownership: 'For each building: who answers first, the escalation organisation and the response target.', projects: 'One campus read through a lens; each building carries the number its records give.', orgs: 'Northstar and the partners it works with, grouped by kind.', activity: 'Every recorded change across the rooms and the service workspace, newest first.', vault: 'The evidence behind the records: test evidence, baselines, installations and exceptions.' };
const PANE: Record<string, (opens: (h: string) => boolean) => ReturnType<typeof PeopleTab>> = { people: (o) => <PeopleTab opens={o} />, support: (o) => <SupportTab opens={o} />, ownership: (o) => <SupportTab opens={o} />, projects: (o) => <MapTab opens={o} />, orgs: () => <OrgsTab />, activity: () => <ActivityTab />, vault: () => <VaultTab /> };
const tabOf = (hash: string) => { const sub = (/^#?\/?search\/([a-z]+)/.exec(hash) || [])[1] || ''; return sub === 'scenarios' ? '' : sub; };
const START: NodeRef = { type: 'NetworkNode', id: 'SW-ATL-4A' };
/** V2.5.3's Search Party areas (#/search/people …) open this page filtered to the record type each area is about. */
const SUB_LABEL: Record<string, string> = { quality: 'Room issue', coverage: 'Room' };
function subType(hash: string, est: { coverage: { types: Record<string, number> } }): string {
  const sub = (/^#?\/?search\/([a-z]+)/.exec(hash) || [])[1] || ''; const want = SUB_LABEL[sub]; if (!want) return '';
  return Object.keys(est.coverage.types).find((t) => (NODE_TYPES[t]?.[0] || t) === want) || '';
}
/** The five ways in (the 3 November composition), each one of the relationship scenarios. */
const WAYS: Array<[string, string, string, string]> = [
  ['S2', 'Who supports this room?', 'From one room to the people and paper behind it.', 'people'],
  ['S1', 'What happens if this device changes?', 'One switch, and everything that would have to be proven again.', 'graph'],
  ['S3', 'Find someone with the right skills', 'Competency from records and hard gates, not from a job title.', 'device'],
  ['S4', 'Follow the incident', 'One issue, traced through every module that holds a record of it.', 'check'],
  ['S5', 'Discover a systemic problem', 'Patterns computed from the records — each with what it cannot claim.', 'spark'],
];
/** Searches an investor can try; each shows the count the search finds now. */
const TRY = ['camera', '4.218', 'boardroom', 'microphone', 'ISS-0417', 'switch', 'Horizon', 'WO-0088'];

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { ANSWERED: 'ok', PARTIAL: 'warn', UNKNOWN: 'muted', OBSERVED: 'ok', DERIVED: 'info' };
const parseHash = (hash: string): { q: string; focus: NodeRef | null } => { const m = /\?(.*)$/.exec(hash); const p = new URLSearchParams(m ? m[1] : ''); const q = p.get('q') || ''; const f = p.get('focus'); const [t, ...rest] = (f || '').split(':'); return { q, focus: f && t && rest.length ? { type: t, id: rest.join(':') } : null }; };

export function SearchPartyDemo({ hash, role }: { hash: string; role?: RoleKey }) {
  const opens = (href: string) => { if (!role) return true; const r = resolve(href); return !!r && canOpen(role, r); };
  const est = useMemo(() => buildEstate(), []);
  const init = parseHash(hash);
  const [q, setQ] = useState(init.q); const [type, setType] = useState(() => subType(hash, est)); const [focus, setFocus] = useState<NodeRef | null>(init.focus || (tabOf(hash) === 'graph' ? START : null)); const [sel, setSel] = useState<string | null>(null);
  // a new address (#/search?q=… or ?focus=…, from the search bar, a tour or a link) replaces what the page shows
  useEffect(() => { const n = parseHash(hash); setQ(n.q); setFocus(n.focus || (tabOf(hash) === 'graph' ? START : null)); setType(subType(hash, est)); setSel(null); setAnswer(null); }, [hash]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState<IntentAnswer | null>(null);
  const byKey = useMemo(() => new Map(est.nodes.map((n) => [nodeKey(n), n])), [est]);
  const res = useMemo(() => search(est, { q, type: type || null, limit: 40 }), [est, q, type]);
  const nb = useMemo(() => (focus && byKey.has(nodeKey(focus)) ? neighbourhood(est.graph, focus, 2, () => true, 150) : []), [est, focus, byKey]);
  const inSet = useMemo(() => new Set(nb.map((s) => nodeKey(s.node))), [nb]);
  const edges = useMemo(() => est.edges.filter((e) => inSet.has(nodeKey(e.from)) && inSet.has(nodeKey(e.to))), [est, inSet]);
  const layout = useMemo(() => radialLayout(nb, 900, 560, 150), [nb]);
  const pos = useMemo(() => new Map(layout.map((p) => [nodeKey(p.node), p])), [layout]);
  const imp = useMemo(() => (focus ? impact(est.graph, focus, ['FEEDS', 'CONNECTS_TO', 'PLANS_DEVICE', 'HAS_DEVICE', 'UPLINKS_TO', 'POWERED_BY', 'CONTROLS']) : []), [est, focus]);
  const askNow = (text: string) => { if (!text.trim()) return; setQuestion(text); setAnswer(ask({ graph: est.graph, nodes: byKey, facts: {} }, text, focus)); };
  const label = (n: NodeRef) => byKey.get(nodeKey(n))?.label || n.id;
  const selected = sel ? byKey.get(sel) : null;
  const tab = tabOf(hash);
  const browsing = !q.trim() && !focus && !type;
  const pick = (n: NodeRef) => { setFocus({ type: n.type, id: n.id }); setSel(null); setAnswer(null); };
  const typeCounts = Object.entries(est.coverage.types).sort((x, y) => y[1] - x[1]);
  return (
    <section className="sp" data-native="" data-testid="search-party">
      <nav className="roomtabs sp__nav" aria-label="Search Party" data-testid="sp-tabs">
        {TABS.filter(([k]) => k === '' || opens(`#/search/${k}`)).map(([k, l]) => <a key={k || 'search'} className="roomtabs__t" href={k ? `#/search/${k}` : '#/search'} aria-current={tab === k || (tab === 'ownership' && k === 'support') ? 'page' : undefined}>{l}</a>)}
      </nav>
      <header className="room__hero sp__hero">
        <p className="kicker">Search Party · relationship intelligence</p>
        <h1>{focus ? label(focus) : TAB_TITLE[tab] || 'Start anywhere. Follow the relationships.'}</h1>
        <p className="room__intent">{focus ? <>{NODE_TYPES[focus.type]?.[0] || focus.type} · {byKey.get(nodeKey(focus))?.subtitle || 'its neighbourhood, what depends on it and the questions you can ask'}</> : TAB_LEDE[tab] || 'The people, records and equipment of a synthetic campus, and how each connects to the rest: who owns it, what depends on it, what changed, who can help, and the evidence for each.'}</p>
        {!PANE[tab] && <>
        <div className="sp__search"><label className="ui-visually-hidden" htmlFor="spd-q">Search</label><span className="sp__glass" aria-hidden="true"><Icon name="search" /></span><input id="spd-q" className="sp__input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a room, switch, device, issue, work order…" autoComplete="off" maxLength={80} /><select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="">Every type</option>{Object.entries(est.coverage.types).sort().map(([t, n]) => <option key={t} value={t}>{NODE_TYPES[t]?.[0] || t} ({n})</option>)}</select></div>
        <div className="sp__types" role="group" aria-label="Records by type">{typeCounts.map(([t, n]) => <button key={t} type="button" className="sp__tchip" aria-pressed={type === t} onClick={() => setType(type === t ? '' : t)}><span>{NODE_TYPES[t]?.[0] || t}</span><b>{n}</b></button>)}</div>
        <p className="ui-meta">{est.nodes.length} records and {est.coverage.edges} relationships of a synthetic estate held in this page. Every edge says where it comes from; what is not modelled says so.</p>
        </>}
      </header>
      {PANE[tab] ? PANE[tab]!(opens) : browsing ? (
        <div className="room__two sp__browse">
          <Section title="Five ways in" aside="Each answered from recorded relationships, list first" id="sp-dir-h">
            <ol className="sp__ways" aria-label="Five ways in">{WAYS.map(([id, t, d, ic], i) => { const sc = scenario(id); const body = <><span className="sp__wayn">{i + 1}</span><span className="sp__wayic" aria-hidden="true"><Icon name={ic} /></span><b>{t}</b><span>{d}</span><span className="ui-meta">{sc ? `${scenarioCount(sc)} recorded relationships · from ${sc.start.label}` : ''}</span></>; return <li key={id}>{opens('#/search/scenarios') ? <a href={`#/search/scenarios/${id}`}>{body}</a> : <div>{body}</div>}</li>; })}</ol>
          </Section>
          <Section title="Try one of these" aside="Each count is what the search finds now" id="sp-try-h">
            <List label="Try one of these">{TRY.map((t) => { const n = search(est, { q: t, type: null, limit: 1 }).total; return <ListRow key={t} testId="sp-try" onClick={() => setQ(t)} leading={<span className="row__ic"><Icon name="search" /></span>} title={t} sub={`${n} record${n === 1 ? '' : 's'}`} />; })}
              <ListRow onClick={() => pick({ type: 'NetworkNode', id: 'SW-ATL-4A' })} leading={<span className="row__ic"><Icon name="graph" /></span>} title="The access switch SW-ATL-4A and what depends on it" sub="Open its relationship graph" /></List>
          </Section>
        </div>
      ) : (
      <div className={`sp__grid${!q.trim() && focus ? ' sp__grid--solo' : ''}`}>
        {(q.trim() || !focus) && <div className="sp__results">
          <p className="ui-muted" role="status">{res.total} record{res.total === 1 ? '' : 's'}{type ? ` · ${NODE_TYPES[type]?.[0] || type}` : ''}</p>
          {!res.items.length ? <Notice tone="info">Nothing matches. Try “switch”, “4.218”, “ISS-0417” or a device category.</Notice> : <ul className="sp__list sp__rlist">{res.items.map((n) => <li key={nodeKey(n)} className={focus && nodeKey(focus) === nodeKey(n) ? 'on' : ''}><a href={`#/search?focus=${encodeURIComponent(nodeKey(n))}`} onClick={(e) => { e.preventDefault(); pick(n); }}><span className="sp__rtop"><span className="sp__type">{NODE_TYPES[n.type]?.[0] || n.type}</span><span className="sp__id mono">{n.id}</span></span><b>{n.label}</b>{n.subtitle && <span className="sp__sub">{n.subtitle}</span>}</a></li>)}</ul>}
          <details className="sp__coverage"><summary>Coverage · {est.coverage.edges} edges</summary><ul>{est.coverage.notes.map((x) => <li key={x}>{x}</li>)}</ul></details>
        </div>}
        <div className="sp__detail">
          {!focus ? <Notice tone="info"><b>Pick a record</b> — its neighbourhood, downstream impact and the questions you can ask appear here. Try the access switch <a href="#/search?focus=NetworkNode:SW-ATL-4A" onClick={(e) => { e.preventDefault(); pick({ type: 'NetworkNode', id: 'SW-ATL-4A' }); }}>SW-ATL-4A</a>.</Notice> : (
            <div className="sp__nbhd">
              <p className="ui-meta">{nb.length - 1} related records within 2 hops · {edges.length} edges · source {byKey.get(nodeKey(focus))?.provenance}</p>
              <figure className="sp__graph" data-stage=""><svg viewBox="0 0 900 560" role="img" aria-label={`Relationship graph of ${label(focus)}`} preserveAspectRatio="xMidYMid meet">
                {edges.map((e, i) => { const a = pos.get(nodeKey(e.from)), b = pos.get(nodeKey(e.to)); if (!a || !b) return null; const on = sel === nodeKey(e.from) || sel === nodeKey(e.to); return <g key={i} className={`sp__edge${on ? ' on' : ''}`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><title>{`${label(e.from)} ${RELATIONS[e.rel]![0]} ${label(e.to)} · ${e.provenance}`}</title></g>; })}
                {layout.map((p) => { const n = byKey.get(nodeKey(p.node)); if (!n) return null; const k = nodeKey(p.node); return <g key={k} className={`sp__node sp__node--d${p.depth}${sel === k ? ' on' : ''}`} transform={`translate(${p.x} ${p.y})`} tabIndex={0} role="button" aria-label={`${NODE_TYPES[n.type]?.[0] || n.type} ${n.label}`} onClick={() => setSel(k)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(k); } }}><circle r={p.depth === 0 ? 16 : 10} /><text y={p.depth === 0 ? 30 : 22} textAnchor="middle">{n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label}</text></g>; })}
              </svg><figcaption className="ui-meta">Rings are hops from the start. Click or focus a node to inspect it; every edge names its provenance.</figcaption></figure>
              {selected && <div className="sp__inspect"><h3><span className="sp__type">{NODE_TYPES[selected.type]?.[0] || selected.type}</span> {selected.label}</h3><p className="ui-meta">{selected.subtitle && <>{selected.subtitle} · </>}source {selected.provenance}{selected.href && <> · <a href={selected.href}>open</a></>} · <a href="#" onClick={(e) => { e.preventDefault(); pick(selected); }}>centre here</a></p>
                <ul className="sp__edges">{est.edges.filter((e) => nodeKey(e.from) === sel || nodeKey(e.to) === sel).map((e, i) => { const other = nodeKey(e.from) === sel ? e.to : e.from; return <li key={i}><span className="sp__rel">{nodeKey(e.from) === sel ? RELATIONS[e.rel]![0] : RELATIONS[e.rel]![1]}</span> <b>{label(other)}</b> <Tag tone={/DERIVED/.test(e.provenance) ? 'info' : /MODELED|PROPOSED/.test(e.provenance) ? 'warn' : /OBSERVED/.test(e.provenance) ? 'ok' : 'muted'}>{e.provenance.split(' ')[0]}</Tag> <span className="ui-meta">{e.provenance}</span></li>; })}</ul></div>}
              {imp.length > 0 && <div className="sp__impact" data-testid="impact"><h3>Downstream impact</h3><p className="ui-muted">What depends on {label(focus)} through recorded FEEDS / CONNECTS_TO / PLANS_DEVICE / POWERED_BY / CONTROLS edges — an unrecorded cable is invisible here.</p><ul className="sp__inline">{imp.map((n) => <li key={nodeKey(n)}><a href="#" onClick={(e) => { e.preventDefault(); pick(n); }}>{label(n)}</a> <span className="ui-muted">{NODE_TYPES[n.type]?.[0] || n.type}</span></li>)}</ul></div>}
            </div>)}
          <div className="sp__intent"><h2>Ask a relationship question</h2><p className="ui-muted">{focus ? <>About <b>{label(focus)}</b>. </> : 'Pick a record first. '}Answered from recorded relationships only.</p>
            <div className="sp__chips">{INTENTS.map((i) => <button key={i.id} type="button" className="sp__chip" onClick={() => askNow(i.examples[0] || i.label)}>{i.label}</button>)}</div>
            <form className="sp__ask" onSubmit={(e) => { e.preventDefault(); askNow(question); }}><input aria-label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="If this switch fails, what is affected?" /><Button kind="primary" type="submit">Ask</Button></form>
            {answer && <div className="sp__answer" role="status"><p><Tag tone={TONE[answer.status]}>{answer.status}</Tag> <Tag tone={TONE[answer.confidence] || 'muted'}>{answer.confidence}</Tag> <span className="ui-muted">{answer.intent}</span></p><p className="sp__summary">{answer.summary}</p>{answer.items.length > 0 && <ul className="sp__edges">{answer.items.map((i, n) => <li key={n}><b>{i.label}</b>{i.via && <> <span className="sp__rel">{i.via}</span></>} <span className="ui-meta">{i.provenance}</span></li>)}</ul>}{answer.uncertainty.length > 0 && <Notice tone="warn"><b>What this answer cannot claim.</b><ul className="sp__why">{answer.uncertainty.map((u) => <li key={u}>{u}</li>)}</ul></Notice>}</div>}
          </div>
        </div>
      </div>)}
    </section>
  );
}
