/**
 * #/omnipresence and #/omnipresence/b/<building> — Empathia OMNIPRESENCE (journey J11). The overview shows each building's tag with
 * exactly what it carries. A building's page is what the tag opens on a phone: the four claims kept apart, the building's rooms
 * (searchable; each link only where this role may open it), and, for a chosen room (?room=), every condition for a command begun
 * from a tag. With all of them met (a role that operates rooms, and the simulated presence proof, ?presence=anchor) the room can be
 * switched on or off through its existing simulated panel, and the answer is shown in stages.
 */
import { useState } from 'react';
import { PageHero, Notice, Tag, Segmented, Button } from '@empathia/ui';
import { Connected } from '../mission/Connected.js';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { BUILDINGS, buildingByKey, fullName, roomById, roomHref } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { act, stateOf } from '../control/store.js';
import { qrMatrix, qrPath } from '../lite/qr.js';
import { State } from '../voice/CallPathPage.js';
import { claims, evaluate, presenceOf, receipt, rooms, tagPayload, tagProblems, type Presence, type ReceiptLine } from './model.js';

function Qr({ text, label }: { text: string; label: string }) { const q = qrMatrix(text); if (!q) return <p className="ui-muted">The address is too long for a tag.</p>; const n = q.size + 8;
  return <svg className="om-qr" width={132} height={132} viewBox={`-4 -4 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges"><rect x={-4} y={-4} width={n} height={n} fill="#fff" /><path d={qrPath(q)} fill="#000" /></svg>; }

export default function OmniPage({ role, params, query }: PageProps) {
  const { apply } = useWorkspace(); const [q, setQ] = useState(''); const [lines, setLines] = useState<ReceiptLine[] | null>(null); const [refused, setRefused] = useState<string | null>(null);
  const opens = (h: string) => { const r = resolve(h.split('?')[0]!); return !!r && canOpen(role, r); };
  const base = typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`; const key = params['building'];
  if (!key) return (<div className="vc" data-testid="omni-home">
    <PageHero eyebrow="Empathia OMNIPRESENCE · simulation" title="A building’s tag opens the building, and nothing more" product="lite" icon="place"
      lede="A tag at a building’s door opens that building on a phone: its floors, its rooms and each room’s passport, for whoever is signed in. It signs nobody in, proves nobody is there and unlocks no control."
      meta={[<Tag key="t" tone="info">{BUILDINGS.length} building tags</Tag>]} />
    <Connected id="omnipresence" role={role} />
    <Notice tone="info"><b>What a tag carries.</b> The address of this demonstration and one building’s key. No credential, no address of equipment, no token. Scanning is simulated here: opening the link is the scan. Reading a tag with this phone’s camera is not built.</Notice>
    <ul className="om-tags" data-testid="omni-tags">{BUILDINGS.map((b) => { const text = tagPayload(base, b.key); const bad = tagProblems(text); return (<li key={b.key} className="mp-dep" data-building={b.key} data-clean={bad.length ? '0' : '1'} data-ready={bad.length ? 'NOT_READY' : 'READY'}>
      <Qr text={text} label={`Tag for ${b.name}`} />
      <div><h3>{b.name}</h3><p className="ui-muted">{b.purpose}</p><p><code className="md-hash" data-testid={`omni-payload-${b.key}`}>{text}</code></p>
        <p>{bad.length ? <Tag tone="bad">Carries {bad.join(', ')}</Tag> : <Tag tone="ok">Carries a building’s key only</Tag>}</p>
        <p><a href={`#/omnipresence/b/${b.key}`} data-testid={`omni-scan-${b.key}`}>Simulate the scan</a></p></div>
    </li>); })}</ul>
  </div>);
  const b = buildingByKey(key);
  if (!b || !BUILDINGS.some((x) => x.key === key)) return (<><PageHero eyebrow="OMNIPRESENCE" title="This tag names a building that is not on record" lede="Nothing is opened from an unknown tag." product="lite" icon="place" />
    <Connected id="omnipresence" role={role} /><Notice tone="warn"><a href="#/omnipresence" data-testid="omni-unknown">Open the tags the estate does hold</a></Notice></>);
  const presence: Presence = presenceOf(query.get('presence')); const sel = roomById(query.get('room') || ''); const room = sel && sel.building === key ? sel : undefined;
  const addr = (p: Presence, r?: string) => { const qs = [r ? `room=${r}` : '', p === 'anchor' ? 'presence=anchor' : ''].filter(Boolean).join('&'); return `#/omnipresence/b/${key}${qs ? `?${qs}` : ''}`; };
  const list = rooms(key, q); const ev = room ? evaluate(role, key, room.id, presence) : null; const on = room ? !!stateOf(room.id)?.power : false;
  const send = () => { if (!room || !ev?.allowed) return; const out = apply((w) => act(w, role, room.id, { type: 'power', on: !on }));
    if ('why' in out) { setLines(null); setRefused(out.why.join(' ')); } else { setRefused(null); setLines(receipt(out, role)); } };
  return (<div className="vc" data-testid="omni-building" data-building={key} data-presence={presence}>
    <nav className="vc-crumb" aria-label="Where this is"><a href="#/omnipresence">OMNIPRESENCE</a><span aria-hidden="true">›</span><span>{b.name}</span></nav>
    <PageHero eyebrow="OMNIPRESENCE · opened from a building’s tag" title={b.name} product="lite" icon="place" lede={`${b.purpose}. The tag brought you to this building. What you can open and do here depends on who you are, not on the tag.`}
      meta={[<span key="f">{b.floors} floors</span>, <span key="r">{rooms(key).length} rooms</span>]} />
    <Connected id="omnipresence" role={role} />
    <section className="vc-sec" aria-labelledby="om-c-h"><h2 id="om-c-h">Four separate claims</h2>
      <ul className="mp-deps om-claims" data-testid="omni-claims">{claims(role, key, presence).map((c) => <li key={c.id} className="mp-dep" data-claim={c.id} data-state={c.state} data-ready={c.state === 'UNKNOWN' ? 'UNKNOWN' : 'READY'}><h3>{c.title}</h3><p><State s={c.state} /></p><p>{c.says}</p></li>)}</ul>
      <div className="vc-cases"><Segmented label="Presence proof" value={presence} onChange={(p) => { setLines(null); location.hash = addr(p, room?.id); }} options={[{ value: 'none', label: 'None' }, { value: 'anchor', label: 'Simulated room anchor' }]} /></div>
    </section>
    <section className="vc-sec" aria-labelledby="om-r-h"><h2 id="om-r-h">Rooms in this building</h2>
      <label className="om-find">Find a room <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number or name" data-testid="omni-find" /></label>
      {list.length ? <ul className="om-rooms" data-testid="omni-rooms">{list.map((r) => (<li key={r.id} data-room={r.id} data-selected={room?.id === r.id ? '1' : '0'}>
        <span><b>Floor {r.floor} · {r.number}</b> {r.name}</span>
        <span className="fl-refs">{opens(roomHref(r)) ? <a href={roomHref(r)}>Passport</a> : null}{opens(`#/here/${r.id}`) ? <a href={`#/here/${r.id}`}>In this room</a> : null}<a href={addr(presence, r.id)} data-testid={`omni-pick-${r.id}`}>Control from the tag</a></span>
      </li>))}</ul> : <p className="ui-muted" data-testid="omni-norooms">No room in this building matches.</p>}
    </section>
    {room && ev ? <section className="vc-sec" aria-labelledby="om-k-h" data-testid="omni-control" data-allowed={ev.allowed ? '1' : '0'}><h2 id="om-k-h">Control of {fullName(room)} from the tag</h2>
      <p className={`vc-verdict vc-verdict--${ev.allowed ? 'within_policy' : 'outside_policy'}`} data-testid="omni-says"><b>{ev.allowed ? 'Offered.' : 'Not offered.'}</b> {ev.says}</p>
      <ol className="vc-job" data-testid="omni-checks">{ev.checks.map((c) => <li key={c.id} data-check={c.id} data-done={c.ok ? '1' : '0'}><span><b>{c.title}.</b> {c.says}</span></li>)}</ol>
      {ev.allowed ? <p><Button kind="primary" testId="omni-send" onClick={send}>{on ? 'Switch the room off' : 'Switch the room on'}</Button> <span className="ui-muted">Simulated: no equipment is contacted.</span></p> : null}
      {refused ? <Notice tone="warn"><span data-testid="omni-refused">{refused}</span></Notice> : null}
      {lines ? <ol className="om-receipt" data-testid="omni-receipt">{lines.map((l, i) => <li key={`${l.stage}${i}`} data-stage={l.stage}><Tag tone={l.stage === 'FAILED' ? 'bad' : l.stage === 'OBSERVED' ? 'ok' : 'info'}>{l.stage}</Tag> {l.says} <State s={l.basis} /></li>)}</ol> : null}
      {opens(`#/control/${room.id}`) ? <p className="fl-refs"><a href={`#/control/${room.id}`}>The room’s full panel</a></p> : null}
    </section> : null}
    <Notice tone="muted"><b>Not built:</b> reading a tag with the phone’s camera, NFC tags, a real presence proof, the signed channel to a site gateway, a rate limit, and control of any real device. In the product every command is decided on the server.</Notice>
  </div>);
}
