/**
 * Search Party (P4-A): discovery, the relationship graph and relationship intents over GET /v1/search, /v1/search/graph, /v1/search/path
 * and POST /v1/search/intent. Everything shown comes from the server's visible catalogue — the page adds no inference of its own, and a
 * question the graph cannot answer is shown as UNKNOWN with the server's reasons.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, ErrorState, Loading, Notice, Tag } from '@empathia/ui';
import { api, useQuery } from '../api.js';

interface Node { type: string; id: string; label: string; subtitle?: string; facets?: Record<string, string>; provenance: string; href?: string; typeLabel?: string; depth?: number; via?: { rel: string; label: string; from: { type: string; id: string }; provenance: string } | null; score?: number; matched?: string }
interface SearchBody { items: Node[]; total: number; facets: Record<string, Record<string, number>>; coverage: { types: Record<string, number>; edges: number; keyed?: number; legacyCodeOnly?: number; notes: string[] }; intents: Array<{ id: string; label: string; examples: string[] }> }
interface GraphBody { start: Node; depth: number; nodes: Node[]; edges: Array<{ from: { type: string; id: string }; to: { type: string; id: string }; rel: string; label: string; inverse: string; provenance: string }>; layout: Array<{ node: { type: string; id: string }; x: number; y: number; depth: number }>; impact: Node[]; truncated: boolean }
interface Answer { intent: string; question: string; target: { type: string; id: string } | null; status: 'ANSWERED' | 'PARTIAL' | 'UNKNOWN'; summary: string; items: Array<{ node: { type: string; id: string }; label: string; via?: string; provenance: string; href?: string }>; evidence: string[]; uncertainty: string[]; confidence: string; actions: Array<{ label: string; kind: string; available: boolean; note?: string; payload?: string; href?: string }> }

const key = (n: { type: string; id: string }) => `${n.type}:${n.id}`;
const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { ANSWERED: 'ok', PARTIAL: 'warn', UNKNOWN: 'muted', OBSERVED: 'ok', DERIVED: 'info' };
const FACETS = ['site', 'building', 'lifecycle', 'state', 'severity', 'category', 'role'];

export function SearchParty({ type, id }: { type?: string; id?: string }) {
  const [q, setQ] = useState(''); const [typed, setTyped] = useState(''); const [facet, setFacet] = useState<Record<string, string>>({}); const [ntype, setNtype] = useState<string>('');
  useEffect(() => { const t = setTimeout(() => setQ(typed.trim()), 220); return () => clearTimeout(t); }, [typed]);
  const fq = Object.entries(facet).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = useQuery<SearchBody>(`search:${q}:${ntype}:${fq}`, () => api.call('getV1Search', { query: { q, limit: '60', ...(ntype ? { type: ntype } : {}), ...Object.fromEntries(Object.entries(facet).filter(([, v]) => v)) } as never }) as Promise<SearchBody>);
  const focus = type && id ? { type, id } : null;
  const graph = useQuery<GraphBody>(focus ? `search:graph:${focus.type}:${focus.id}` : null, () => api.call('getV1SearchGraphTypeId', { params: { type: focus!.type, id: focus!.id }, query: { depth: '2' } } as never) as Promise<GraphBody>);
  const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState<Answer | null>(null); const [asking, setAsking] = useState(false); const [askErr, setAskErr] = useState<string | null>(null);
  const askNow = async (text: string) => { if (!text.trim()) return; setAsking(true); setAskErr(null); try { setAnswer(await api.call('postV1SearchIntent', { body: { question: text.trim(), target: focus } } as never) as Answer); } catch (e) { setAskErr((e as Error).message); } finally { setAsking(false); } };
  return (
    <section className="page sp">
      <header className="page__head"><div><h1>Search Party</h1><p className="ui-muted">People, rooms, devices, records — and what they connect to. Every edge carries where it comes from; what is not modelled says so.</p></div></header>
      <div className="sp__search">
        <label className="ui-visually-hidden" htmlFor="sp-q">Search</label>
        <input id="sp-q" className="sp__input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search a room code, device, issue, work order, building, project…" autoComplete="off" aria-controls="sp-results" />
        <select aria-label="Type" value={ntype} onChange={(e) => setNtype(e.target.value)}><option value="">Every type</option>{Object.entries(res.data?.coverage.types || {}).sort().map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}</select>
      </div>
      <div className="sp__grid">
        <div className="sp__results" id="sp-results" aria-live="polite">
          {res.error ? <ErrorState error={res.error} retry={res.reload} /> : !res.data ? <Loading label="Searching" /> : (
            <>
              <div className="sp__facets">{FACETS.filter((f) => res.data!.facets[f] && Object.keys(res.data!.facets[f]!).length > 1).map((f) => <label key={f}>{f} <select value={facet[f] || ''} onChange={(e) => setFacet({ ...facet, [f]: e.target.value })}><option value="">any</option>{Object.entries(res.data!.facets[f]!).map(([v, n]) => <option key={v} value={v}>{v} ({n})</option>)}</select></label>)}
                <span className="ui-muted">{res.data.total} record{res.data.total === 1 ? '' : 's'}{res.data.total > res.data.items.length ? ` (first ${res.data.items.length})` : ''}</span></div>
              {!res.data.items.length ? <Empty title="Nothing in your view matches">Try a room code (R-PLN-0001), a device (A-0001), an issue (ISS-…) or a building code. Records outside your site scope are not shown — they are absent, not hidden.</Empty> : (
                <ul className="sp__list">{res.data.items.map((n) => <li key={key(n)} className={focus && key(focus) === key(n) ? 'on' : ''}><a href={`#/search/${encodeURIComponent(n.type)}/${encodeURIComponent(n.id)}`}><span className="sp__type">{n.typeLabel || n.type}</span><b>{n.label}</b>{n.subtitle && <span className="ui-muted"> · {n.subtitle}</span>}<span className="sp__id mono">{n.id}</span></a></li>)}</ul>)}
              <details className="sp__coverage"><summary>Coverage · {res.data.coverage.edges} edges{res.data.coverage.keyed !== undefined ? ` · ${res.data.coverage.keyed} keyed` : ''}{res.data.coverage.legacyCodeOnly ? ` · ${res.data.coverage.legacyCodeOnly} legacy code-only` : ''}</summary><ul>{res.data.coverage.notes.map((x) => <li key={x}>{x}</li>)}</ul></details>
            </>)}
        </div>
        <div className="sp__detail">
          {!focus ? <Empty title="Pick a record">Its neighbourhood, downstream impact and the questions you can ask appear here.</Empty> : graph.error ? <ErrorState error={graph.error} retry={graph.reload} /> : !graph.data ? <Loading label="Loading the neighbourhood" /> : <Neighbourhood g={graph.data} />}
          <div className="sp__intent">
            <h2>Ask a relationship question</h2>
            <p className="ui-muted">{focus ? <>About <b>{graph.data?.start.label || focus.id}</b>. </> : 'Name a record in the question (a room code works) or pick one first. '}The answer comes from recorded relationships and records only.</p>
            <div className="sp__chips">{(res.data?.intents || []).map((i) => <button key={i.id} type="button" className="sp__chip" onClick={() => { setQuestion(i.examples[0] || i.label); void askNow(i.examples[0] || i.label); }}>{i.label}</button>)}</div>
            <form className="sp__ask" onSubmit={(e) => { e.preventDefault(); void askNow(question); }}><input aria-label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Who approved the current design?" /><Button kind="primary" type="submit" busy={asking}>Ask</Button></form>
            {askErr && <Notice tone="bad">{askErr}</Notice>}
            {answer && <AnswerView a={answer} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function Neighbourhood({ g }: { g: GraphBody }) {
  const [sel, setSel] = useState<string | null>(null);
  const pos = useMemo(() => new Map(g.layout.map((p) => [key(p.node), p])), [g]);
  const byKey = useMemo(() => new Map(g.nodes.map((n) => [key(n), n])), [g]);
  const selected = sel ? byKey.get(sel) : null;
  const selEdges = sel ? g.edges.filter((e) => key(e.from) === sel || key(e.to) === sel) : [];
  const W = 900, H = 600;
  return (
    <div className="sp__nbhd">
      <div className="sp__start"><span className="sp__type">{g.start.typeLabel || g.start.type}</span><h2>{g.start.label}</h2>{g.start.subtitle && <p className="ui-muted">{g.start.subtitle}</p>}<p className="ui-meta">{g.nodes.length - 1} related records within {g.depth} hops · {g.edges.length} edges{g.truncated ? ' · truncated' : ''} · source {g.start.provenance}{g.start.href && <> · <a href={g.start.href}>open</a></>}</p></div>
      <figure className="sp__graph">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Relationship graph of ${g.start.label}: ${g.nodes.length} nodes and ${g.edges.length} edges`} preserveAspectRatio="xMidYMid meet">
          {g.edges.map((e, i) => { const a = pos.get(key(e.from)), b = pos.get(key(e.to)); if (!a || !b) return null; const on = sel === key(e.from) || sel === key(e.to); return <g key={i} className={`sp__edge${on ? ' on' : ''}`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><title>{`${byKey.get(key(e.from))?.label} ${e.label} ${byKey.get(key(e.to))?.label} · ${e.provenance}`}</title></g>; })}
          {g.layout.map((p) => { const n = byKey.get(key(p.node)); if (!n) return null; const on = sel === key(p.node); return <g key={key(p.node)} className={`sp__node sp__node--d${p.depth}${on ? ' on' : ''}`} transform={`translate(${p.x} ${p.y})`} tabIndex={0} role="button" aria-label={`${n.typeLabel || n.type} ${n.label}`} onClick={() => setSel(key(p.node))} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(key(p.node)); } }}><circle r={p.depth === 0 ? 16 : 10} /><text y={p.depth === 0 ? 30 : 22} textAnchor="middle">{n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label}</text><title>{`${n.typeLabel || n.type} · ${n.label}${n.via ? ` · ${n.via.label} ${byKey.get(key(n.via.from))?.label || ''} (${n.via.provenance})` : ''}`}</title></g>; })}
        </svg>
        <figcaption className="ui-meta">Rings are hops from the start. Click or focus a node to inspect it; every edge names its provenance.</figcaption>
      </figure>
      {selected && (
        <div className="sp__inspect" aria-live="polite">
          <h3><span className="sp__type">{selected.typeLabel || selected.type}</span> {selected.label}</h3>
          <p className="ui-meta">{selected.subtitle && <>{selected.subtitle} · </>}source {selected.provenance}{selected.href && <> · <a href={selected.href}>open</a></>} · <a href={`#/search/${encodeURIComponent(selected.type)}/${encodeURIComponent(selected.id)}`}>centre here</a></p>
          <ul className="sp__edges">{selEdges.map((e, i) => { const other = key(e.from) === sel ? e.to : e.from; const o = byKey.get(key(other)); return <li key={i}><span className="sp__rel">{key(e.from) === sel ? e.label : e.inverse}</span> <b>{o?.label || other.id}</b> <span className="ui-muted">{o?.typeLabel || other.type}</span> <Tag tone={/DERIVED/.test(e.provenance) ? 'info' : /MODELED|PROPOSED/.test(e.provenance) ? 'warn' : 'ok'}>{e.provenance.split(' ')[0]}</Tag> <span className="ui-meta">{e.provenance}</span></li>; })}</ul>
        </div>)}
      {g.impact.length > 0 && <div className="sp__impact"><h3>Downstream impact</h3><p className="ui-muted">What depends on {g.start.label} through recorded FEEDS / CONNECTS_TO / PLANS_DEVICE / HAS_DEVICE edges (an unrecorded link is invisible here).</p><ul className="sp__inline">{g.impact.map((n) => <li key={key(n)}><a href={`#/search/${encodeURIComponent(n.type)}/${encodeURIComponent(n.id)}`}>{n.label}</a> <span className="ui-muted">{n.typeLabel || n.type}</span></li>)}</ul></div>}
    </div>
  );
}

function AnswerView({ a }: { a: Answer }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(text); } catch { setCopied(null); } };
  return (
    <div className="sp__answer" role="status">
      <p><Tag tone={TONE[a.status]}>{a.status}</Tag> <Tag tone={TONE[a.confidence] || 'muted'}>{a.confidence}</Tag> <span className="ui-muted">{a.intent}</span></p>
      <p className="sp__summary">{a.summary}</p>
      {a.items.length > 0 && <ul className="sp__edges">{a.items.map((i, n) => <li key={n}>{i.href ? <a href={i.href}><b>{i.label}</b></a> : <b>{i.label}</b>}{i.via && <> <span className="sp__rel">{i.via}</span></>} <span className="ui-meta">{i.provenance}</span></li>)}</ul>}
      {a.evidence.length > 0 && <details><summary>Evidence ({a.evidence.length})</summary><ul>{a.evidence.map((e) => <li key={e} className="ui-meta">{e}</li>)}</ul></details>}
      {a.uncertainty.length > 0 && <Notice tone="warn"><b>What this answer cannot claim.</b><ul className="sp__why">{a.uncertainty.map((u) => <li key={u}>{u}</li>)}</ul></Notice>}
      {a.actions.length > 0 && <div className="sp__actions">{a.actions.map((x, n) => x.available ? <Button key={n} small onClick={() => { if (x.kind === 'copy' && x.payload) void copy(x.payload); else if (x.href) location.href = x.href; }}>{copied === x.payload ? 'Copied' : x.label}</Button> : <span key={n} className="sp__na" title={x.note}>{x.label}: not available — {x.note}</span>)}</div>}
    </div>
  );
}
