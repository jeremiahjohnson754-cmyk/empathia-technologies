/**
 * #/flow and #/flow/link/<node> — Empathia FLOW (journey J6A-FLOW): the network a room's streams and calls depend on, read from the
 * estate's own records. The overview lists the network nodes; a node's page sorts every claim by layer with its evidence state and
 * source, lists the rooms that depend on it (the relationship engine's impact traversal), and links each record on. Read-only.
 * Opened from a CallPath (?from=voice&room=…&case=…) it offers the way back with the case kept.
 */
import { PageHero, Notice, Tag, Card } from '@empathia/ui';
import { Connected } from '../mission/Connected.js';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { roomById, fullName, roomHref } from '../campus/canon.js';
import { State } from '../voice/CallPathPage.js';
import { caseOf } from '../voice/model.js';
import { NET_LAYER, linkView, networkNodes, type NetLayer } from './model.js';

export default function FlowPage({ role, params, query }: PageProps) {
  const opens = (h: string) => { const r = resolve(h); return !!r && canOpen(role, r); };
  const nodeId = params['node']; const vcase = caseOf(query.get('case')); const fromVoice = query.get('from') === 'voice' ? roomById(query.get('room') || '') : undefined;
  if (!nodeId) {
    const nodes = networkNodes().map((n) => ({ n, v: linkView(n.id)! }));
    return (<div className="vc" data-testid="flow-home">
      <PageHero eyebrow="Empathia FLOW · read-only" title="The network your rooms depend on" product="pro" icon="network"
        lede="FLOW reads the same network records as the rest of Empathia and sorts what is known by layer: power and cabling, switching, uplinks, and the streams on top. Each claim says whether it was declared, modelled or observed, and what nobody has recorded."
        meta={[<Tag key="s" tone="info">Estate records</Tag>, <span key="n">{nodes.length} network nodes</span>]} />
    <Connected id="flow" role={role} />
      <Notice tone="info"><b>Read-only.</b> FLOW changes no configuration and reads no live network. Timing, multicast and the WAN are not recorded in this estate, and say so.</Notice>
      <section className="vc-sec vc-two" aria-label="Network nodes">{nodes.map(({ n, v }) => (
        <Card key={n.id} title={n.label} sub={n.subtitle} icon="network" testId={`flow-node-${n.id}`}>
          <p>{v.rooms.length} room{v.rooms.length === 1 ? '' : 's'} and {v.dependents} record{v.dependents === 1 ? '' : 's'} depend on it.</p>
          <p className="ui-muted">{v.claims.filter((c) => c.state === 'OBSERVED').length} observed, {v.claims.filter((c) => c.state === 'DECLARED').length} declared, {v.claims.filter((c) => c.state === 'MODELED').length} modelled, {v.claims.filter((c) => c.state === 'UNKNOWN').length} unknown.</p>
          <p><a href={`#/flow/link/${n.id}`} data-testid={`flow-open-${n.id}`}>Open {n.label}</a></p>
        </Card>))}</section>
      <section className="vc-sec" aria-labelledby="fl-not-h"><h2 id="fl-not-h">What FLOW does not do here</h2><ul className="vc-next"><li>No configuration is written to a switch or a stream.</li><li>No path is inferred from device names; an edge exists only where a record states it.</li><li>Dante, AES67 and NMOS are named in the specification; no such source is connected in the demonstration.</li></ul></section>
    </div>);
  }
  const v = linkView(nodeId, vcase);
  if (!v) return (<><PageHero eyebrow="FLOW" title="This network node is not in the estate" lede="The address names a node the demonstration does not hold." product="pro" icon="network" />
    <Connected id="flow" role={role} /><Notice tone="warn"><a href="#/flow" data-testid="flow-unknown">Open the nodes the estate does hold</a></Notice></>);
  const layers = (['L1', 'L2', 'L3', 'APP'] as NetLayer[]).map((l) => ({ l, claims: v.claims.filter((c) => c.layer === l) }));
  const back = fromVoice && opens(`#/voice/callpath/${fromVoice.id}`) ? `#/voice/callpath/${fromVoice.id}${vcase === 'degraded' ? '' : `?case=${vcase}`}` : null;
  return (<div className="vc" data-testid="flow-link" data-node={v.node.id}>
    <nav className="vc-crumb" aria-label="Where this is"><a href="#/flow">FLOW</a><span aria-hidden="true">›</span><span>{v.node.label}</span>{back ? <><span aria-hidden="true">·</span><a href={back} data-testid="flow-back-voice">Back to the CallPath of {fullName(fromVoice!)}</a></> : null}</nav>
    <PageHero eyebrow="FLOW · network dependencies · read-only" title={v.node.label} product="pro" icon="network" lede={`${v.node.subtitle}. What is recorded about this node, layer by layer, and what depends on it.`}
      meta={[<span key="r">{v.rooms.length} rooms</span>, <span key="d">{v.dependents} dependent records</span>]} />
    <Connected id="flow" role={role} />
    <section className="vc-sec" aria-labelledby="fl-l-h"><h2 id="fl-l-h">By layer</h2>
      {layers.map(({ l, claims }) => (<div key={l} className="fl-layer" data-layer={l}><h3>{NET_LAYER[l]}</h3>
        <ul className="fl-claims">{claims.map((c) => (<li key={c.label} data-state={c.state}><p><State s={c.state} /> <b>{c.label}</b></p><p className="ui-muted">{c.source}</p>
          {c.refs.length ? <p className="fl-refs">{c.refs.map((r) => (opens('#/search') ? <a key={`${r.id}${r.label}`} href={`#/search?focus=${r.type}:${r.id}`}>{r.label}</a> : <span key={`${r.id}${r.label}`}>{r.label}</span>))}</p> : null}</li>))}</ul></div>))}
    </section>
    <section className="vc-sec" aria-labelledby="fl-d-h"><h2 id="fl-d-h">Rooms that depend on this node</h2>
      {v.rooms.length ? <ul className="vc-next" data-testid="flow-rooms">{v.rooms.map((r) => { const o = roomById(r.id); return <li key={r.id}>{o ? <a href={roomHref(o)}>{r.name}</a> : r.name} <span className="ui-muted">{r.devices.join(', ')}</span>{v.voiceRooms.includes(r.id) && opens(`#/voice/callpath/${r.id}`) ? <> · <a href={`#/voice/callpath/${r.id}${vcase === 'degraded' ? '' : `?case=${vcase}`}`} data-testid="flow-to-voice">its CallPath in VOICE</a></> : null}</li>; })}</ul> : <p className="ui-muted">No room’s devices are recorded on this node.</p>}
      <p className="ui-muted">Computed by the relationship engine’s impact traversal over the estate’s FEEDS and CONNECTS_TO edges, the same one Search Party uses.</p>
      {opens('#/search') ? <p><a href={`#/search?focus=NetworkNode:${v.node.id}`} data-testid="flow-to-graph">Open this node in Search Party</a></p> : null}
    </section>
  </div>);
}
