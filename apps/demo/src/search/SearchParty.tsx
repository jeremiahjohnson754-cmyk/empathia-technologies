/**
 * Search Party in the investor demonstration: the same library the enterprise API runs (@empathia/search-party), on the synthetic estate
 * built in estate.ts, entirely in the page. Search, facets, the neighbourhood graph with provenance on every edge, downstream impact and
 * the relationship intents — with the same honest UNKNOWN answers for what the estate does not model.
 */
import { useMemo, useState } from 'react';
import { Tag, Notice, Button } from '@empathia/ui';
import { search, neighbourhood, impact, radialLayout, ask, nodeKey, RELATIONS, NODE_TYPES, INTENTS, type NodeRef, type IntentAnswer } from '@empathia/search-party';
import { buildEstate } from './estate.js';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { ANSWERED: 'ok', PARTIAL: 'warn', UNKNOWN: 'muted', OBSERVED: 'ok', DERIVED: 'info' };
const parseHash = (hash: string): { q: string; focus: NodeRef | null } => { const m = /\?(.*)$/.exec(hash); const p = new URLSearchParams(m ? m[1] : ''); const q = p.get('q') || ''; const f = p.get('focus'); const [t, ...rest] = (f || '').split(':'); return { q, focus: f && t && rest.length ? { type: t, id: rest.join(':') } : null }; };

export function SearchPartyDemo({ hash }: { hash: string }) {
  const est = useMemo(() => buildEstate(), []);
  const init = parseHash(hash);
  const [q, setQ] = useState(init.q); const [type, setType] = useState(''); const [focus, setFocus] = useState<NodeRef | null>(init.focus); const [sel, setSel] = useState<string | null>(null);
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
  return (
    <section className="sp">
      <header className="build__head"><div><p className="kicker">Search Party · demonstration</p><h1>{focus ? label(focus) : 'What connects to what — and what depends on it'}</h1><p className="ui-muted">Native page of this interactive demonstration: the relationship engine the product ships, on a synthetic estate held in this page. Every edge says where it comes from; what is not modelled says so.</p></div></header>
      <div className="sp__search"><label className="ui-visually-hidden" htmlFor="spd-q">Search</label><input id="spd-q" className="sp__input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a room, switch, device, issue, work order…" autoComplete="off" /><select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="">Every type</option>{Object.entries(est.coverage.types).sort().map(([t, n]) => <option key={t} value={t}>{NODE_TYPES[t]?.[0] || t} ({n})</option>)}</select></div>
      <div className="sp__grid">
        <div className="sp__results">
          <p className="ui-muted">{res.total} record{res.total === 1 ? '' : 's'}</p>
          {!res.items.length ? <Notice tone="info">Nothing matches. Try “switch”, “4.218”, “ISS-0417” or a device category.</Notice> : <ul className="sp__list">{res.items.map((n) => <li key={nodeKey(n)} className={`${focus && nodeKey(focus) === nodeKey(n) ? 'on' : ''}${n.type === 'Room' ? ' sp__room' : ''}`}><a href={`#/search?focus=${encodeURIComponent(nodeKey(n))}`} onClick={(e) => { e.preventDefault(); setFocus({ type: n.type, id: n.id }); setSel(null); setAnswer(null); }}><span className="sp__type">{NODE_TYPES[n.type]?.[0] || n.type}</span><b>{n.label}</b>{n.subtitle && <span className="ui-muted"> · {n.subtitle}</span>}<span className="sp__id mono">{n.id}</span></a>{n.type === 'Room' && <a className="sp__story" href={`#/story/${n.id}`} aria-label={`Show the entire story of ${n.label}`}>Entire story</a>}</li>)}</ul>}
          <details className="sp__coverage"><summary>Coverage · {est.coverage.edges} edges</summary><ul>{est.coverage.notes.map((x) => <li key={x}>{x}</li>)}</ul></details>
        </div>
        <div className="sp__detail">
          {!focus ? <Notice tone="info"><b>Pick a record</b> — its neighbourhood, downstream impact and the questions you can ask appear here. Try the access switch <a href="#/search?focus=NetworkNode:SW-ATL-4A" onClick={(e) => { e.preventDefault(); setFocus({ type: 'NetworkNode', id: 'SW-ATL-4A' }); }}>SW-ATL-4A</a>.</Notice> : (
            <div className="sp__nbhd">
              {focus.type === 'Room' && <p className="sp__storygo"><a className="ui-btn ui-btn--primary" href={`#/story/${focus.id}`} data-testid="sp-story">Show this room’s entire story</a> <span className="ui-meta">request to lesson, from the records</span></p>}
              <p className="ui-meta">{nb.length - 1} related records within 2 hops · {edges.length} edges · source {byKey.get(nodeKey(focus))?.provenance}</p>
              <figure className="sp__graph"><svg viewBox="0 0 900 560" role="img" aria-label={`Relationship graph of ${label(focus)}`} preserveAspectRatio="xMidYMid meet">
                {edges.map((e, i) => { const a = pos.get(nodeKey(e.from)), b = pos.get(nodeKey(e.to)); if (!a || !b) return null; const on = sel === nodeKey(e.from) || sel === nodeKey(e.to); return <g key={i} className={`sp__edge${on ? ' on' : ''}`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><title>{`${label(e.from)} ${RELATIONS[e.rel]![0]} ${label(e.to)} · ${e.provenance}`}</title></g>; })}
                {layout.map((p) => { const n = byKey.get(nodeKey(p.node)); if (!n) return null; const k = nodeKey(p.node); return <g key={k} className={`sp__node sp__node--d${p.depth}${sel === k ? ' on' : ''}`} transform={`translate(${p.x} ${p.y})`} tabIndex={0} role="button" aria-label={`${NODE_TYPES[n.type]?.[0] || n.type} ${n.label}`} onClick={() => setSel(k)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(k); } }}><circle r={p.depth === 0 ? 16 : 10} /><text y={p.depth === 0 ? 30 : 22} textAnchor="middle">{n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label}</text></g>; })}
              </svg><figcaption className="ui-meta">Rings are hops from the start. Click or focus a node to inspect it; every edge names its provenance.</figcaption></figure>
              {selected && <div className="sp__inspect"><h3><span className="sp__type">{NODE_TYPES[selected.type]?.[0] || selected.type}</span> {selected.label}</h3><p className="ui-meta">{selected.subtitle && <>{selected.subtitle} · </>}source {selected.provenance}{selected.href && <> · <a href={selected.href}>open</a></>}{selected.type === 'Room' && <> · <a href={`#/story/${selected.id}`}>entire story</a></>} · <a href="#" onClick={(e) => { e.preventDefault(); setFocus({ type: selected.type, id: selected.id }); setSel(null); setAnswer(null); }}>centre here</a></p>
                <ul className="sp__edges">{est.edges.filter((e) => nodeKey(e.from) === sel || nodeKey(e.to) === sel).map((e, i) => { const other = nodeKey(e.from) === sel ? e.to : e.from; return <li key={i}><span className="sp__rel">{nodeKey(e.from) === sel ? RELATIONS[e.rel]![0] : RELATIONS[e.rel]![1]}</span> <b>{label(other)}</b> <Tag tone={/DERIVED/.test(e.provenance) ? 'info' : /MODELED|PROPOSED/.test(e.provenance) ? 'warn' : /OBSERVED/.test(e.provenance) ? 'ok' : 'muted'}>{e.provenance.split(' ')[0]}</Tag> <span className="ui-meta">{e.provenance}</span></li>; })}</ul></div>}
              {imp.length > 0 && <div className="sp__impact" data-testid="impact"><h3>Downstream impact</h3><p className="ui-muted">What depends on {label(focus)} through recorded FEEDS / CONNECTS_TO / PLANS_DEVICE / POWERED_BY / CONTROLS edges — an unrecorded cable is invisible here.</p><ul className="sp__inline">{imp.map((n) => <li key={nodeKey(n)}><a href="#" onClick={(e) => { e.preventDefault(); setFocus(n); setSel(null); setAnswer(null); }}>{label(n)}</a> <span className="ui-muted">{NODE_TYPES[n.type]?.[0] || n.type}</span></li>)}</ul></div>}
            </div>)}
          <div className="sp__intent"><h2>Ask a relationship question</h2><p className="ui-muted">{focus ? <>About <b>{label(focus)}</b>. </> : 'Pick a record first. '}Answered from recorded relationships only.</p>
            <div className="sp__chips">{INTENTS.map((i) => <button key={i.id} type="button" className="sp__chip" onClick={() => askNow(i.examples[0] || i.label)}>{i.label}</button>)}</div>
            <form className="sp__ask" onSubmit={(e) => { e.preventDefault(); askNow(question); }}><input aria-label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="If this switch fails, what is affected?" /><Button kind="primary" type="submit">Ask</Button></form>
            {answer && <div className="sp__answer" role="status"><p><Tag tone={TONE[answer.status]}>{answer.status}</Tag> <Tag tone={TONE[answer.confidence] || 'muted'}>{answer.confidence}</Tag> <span className="ui-muted">{answer.intent}</span></p><p className="sp__summary">{answer.summary}</p>{answer.items.length > 0 && <ul className="sp__edges">{answer.items.map((i, n) => <li key={n}><b>{i.label}</b>{i.via && <> <span className="sp__rel">{i.via}</span></>} <span className="ui-meta">{i.provenance}</span></li>)}</ul>}{answer.uncertainty.length > 0 && <Notice tone="warn"><b>What this answer cannot claim.</b><ul className="sp__why">{answer.uncertainty.map((u) => <li key={u}>{u}</li>)}</ul></Notice>}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
