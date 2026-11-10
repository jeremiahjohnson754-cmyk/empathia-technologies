/**
 * The estate (#/estate/<world> and #/estate/<world>/<place>?as=<role configuration>): one page for every world, reading the canonical
 * records in estate/. It is Lite across worlds — what a place is, what it offers, how to reach it — with Search Party in context: a
 * place found by words and a place browsed to are the same record, by the same identifier.
 *
 * D44: a role configuration is shown only the places its reader level reaches; a place beyond it gets a short owl page and none of
 * its facts. That is presentation, not security (reader.ts). Nothing here is measured or live: every record is synthetic.
 */
import { useMemo, useState, type ReactNode } from 'react';
import type { PageProps } from '../registry.types.js';
import { WORLDS, isWorld, configFor, worldHref, type RoleConfig, type World } from '../worlds/registry.js';
import { enterContext, contextOf, contextKey } from '../worlds/scope.js';
import { Block, Crumbs, Pick, Rows, Synthetic } from '../worlds/kit.js';
import { UnknownWorld } from '../worlds/WorldPage.js';
import { ESTATES, indexOf, pathOf, type Asset, type Commissioning, type Estate, type EstateNode, type Index } from './index.js';
import { ACCESS_WORDS, READER_WORDS, find, offers, readerOf, seesEquipment, shown, totals } from './reader.js';
import { studiable } from '../optimizer/engine.js';

const LITE_STATE: Record<Commissioning, string | null> = { ACCEPTED: 'Commissioned', COMMISSIONING: 'In commissioning', DESIGNED: 'Designed, not yet built', NOT_APPLICABLE: null };
const words = (t: string) => t.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const nf = (n: number) => n.toLocaleString('en-GB');
const INDEX = new Map<string, Index>();
const ixOf = (e: Estate): Index => { let ix = INDEX.get(e.world); if (!ix) { ix = indexOf(e); INDEX.set(e.world, ix); } return ix; };
export const estateHref = (world: string, node?: string | null, as?: string | null, q?: string) => {
  const s = new URLSearchParams({ ...(as && as !== WORLDS[world as World['key']]?.defaultConfig ? { as } : {}), ...(q ? { q } : {}) }).toString();
  return `#/estate/${world}${node ? `/${encodeURIComponent(node)}` : ''}${s ? `?${s}` : ''}`;
};

export default function EstatePage({ role, params, query }: PageProps) {
  const w = params.world;
  if (!isWorld(w)) return <UnknownWorld what="This world is not part of the demonstration" />;
  const world = WORLDS[w]; const config = configFor(w, query.get('as'));
  enterContext(contextOf(`${w}/estate`, config.id, role));
  const estate = ESTATES[w];
  if (!estate) return <EnterpriseEstate world={world} />;
  const ix = ixOf(estate); const id = params.node ? decodeURIComponent(params.node) : null;
  if (!id) return <Overview key={contextKey()} world={world} config={config} ix={ix} q={query.get('q') || ''} />;
  const node = ix.byId.get(id);
  if (!node || node.kind === 'world') return <UnknownWorld what={`${estate.name} has no place at this address`} />;
  if (!shown(ix, readerOf(config), id)) return <Gate world={world} config={config} />;
  return <Place key={`${contextKey()}|${id}`} world={world} config={config} ix={ix} node={node} />;
}

function Head({ world, config, trail, title, lead }: { world: World; config: RoleConfig; trail: { label: string; href?: string }[]; title: string; lead?: ReactNode }) {
  const reader = readerOf(config);
  return (<>
    <Crumbs items={[{ label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref(world.key, config.id) }, ...trail]} />
    <p className="kicker w-kicker">{world.place} (fictional) <Synthetic /></p>
    <h1 tabIndex={-1}>{title}</h1>
    {lead && <p className="lead">{lead}</p>}
    <p className="es-as" data-testid="estate-reader" data-reader={reader}>Shown as the <b>{config.label}</b>: {READER_WORDS[reader]}. <a href={worldHref(world.key, config.id, { panel: 'roles' })}>Change role</a></p>
  </>);
}

function Overview({ world, config, ix, q: firstQ }: { world: World; config: RoleConfig; ix: Index; q: string }) {
  const e = ix.estate; const reader = readerOf(config); const [q, setQ] = useState(firstQ);
  const t = useMemo(() => totals(ix, reader), [ix, reader]); const hits = useMemo(() => find(ix, reader, q), [ix, reader, q]);
  const top = (ix.children.get(e.nodes[0]!.id) || []).flatMap((n) => (n.kind === 'venue' ? [n, ...(ix.children.get(n.id) || []).filter((c) => c.kind === 'district')] : [n])).filter((n) => shown(ix, reader, n.id));
  return (
    <div className="w es" data-world={world.key} data-testid="estate">
      <Head world={world} config={config} trail={[{ label: 'Estate' }]} title={`${e.name}: the estate`} lead="Every place in this world is one record. Lite, Search Party and the design tools all read the same one." />
      <ul className="es-totals" aria-label="What this role is shown" data-testid="estate-totals">
        <li><b>{nf(t.places)}</b> places{t.places < t.all && <span className="ui-meta"> of {nf(t.all)} recorded</span>}</li>
        <li><b>{nf(t.rooms)}</b> rooms</li>
        {t.equipment !== null && <li><b>{nf(t.equipment)}</b> pieces of equipment</li>}
        <li><b>{nf(t.routes)}</b> recorded routes</li>
      </ul>
      <Block title="Find a place" sub="Search Party, in this estate" testId="estate-find">
        <form role="search" className="es-find" onSubmit={(ev) => ev.preventDefault()}>
          <label htmlFor="es-q">Name, room type{seesEquipment(reader) ? ', equipment' : ''} or identifier</label>
          <input id="es-q" type="search" value={q} onChange={(ev) => setQ(ev.target.value)} autoComplete="off" spellCheck={false} placeholder={world.key === 'university' ? 'lecture theatre' : world.key === 'stadium' ? 'first aid' : 'session room'} />
        </form>
        <p className="ui-visually-hidden" role="status" aria-live="polite">{q.trim() ? `${hits.length} result${hits.length === 1 ? '' : 's'}` : ''}</p>
        {q.trim() && (hits.length ? <ul className="w-list es-hits" data-testid="estate-hits">{hits.map((h) => <li key={h.id}><a className="w-item" href={estateHref(world.key, h.node, config.id)} data-node={h.node} data-kind={h.kind}><b>{h.title}</b><span className="ui-meta">{h.kind === 'equipment' ? 'Equipment in ' : ''}{h.where}</span></a></li>)}</ul>
          : <p data-testid="estate-none">Nothing in what the {config.label} is shown matches “{q.trim()}”. Try a room type, such as “{world.key === 'university' ? 'classroom' : world.key === 'stadium' ? 'suite' : 'booth'}”.</p>)}
      </Block>
      <Block title="Plan" sub="Not to scale"><EstatePlan ix={ix} world={world} config={config} /></Block>
      <Block title="Browse" testId="estate-browse">
        <ul className="es-cards">{top.map((n) => <li key={n.id}><a className="w-item" href={estateHref(world.key, n.id, config.id)} data-node={n.id}><b>{n.name}</b><span className="ui-meta">{n.note || words(n.type)}</span></a></li>)}</ul>
      </Block>
      <p className="ui-meta">Synthetic records of a fictional place. Nothing here is measured, surveyed or live.</p>
    </div>
  );
}

function EstatePlan({ ix, world, config, lit }: { ix: Index; world: World; config: RoleConfig; lit?: string }) {
  const reader = readerOf(config); const zs = ix.estate.nodes.filter((n) => n.plan && n.kind !== 'world' && shown(ix, reader, n.id));
  const W = Math.max(...zs.map((n) => n.plan!.x + n.plan!.w)) + 20; const H = Math.max(...zs.map((n) => n.plan!.y + n.plan!.h)) + 20;
  const order = (n: EstateNode) => (n.kind === 'venue' || n.kind === 'campus' ? 0 : n.kind === 'space' ? 1 : 2);
  const litPath = lit ? new Set([...pathOf(ix, lit).map((n) => n.id), ...(ix.byId.get(lit)?.spans || [])]) : new Set<string>();
  return (
    <figure className="w-plan stage es-plan" data-stage="" data-testid="estate-plan">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Plan of ${ix.estate.name}`} preserveAspectRatio="xMidYMid meet">
        {[...zs].sort((a, b) => order(a) - order(b)).map((n) => { const p = n.plan!; const frame = n.kind === 'venue' || n.kind === 'campus'; const small = p.w < 70 || p.h < 26;
          return (<a key={n.id} href={estateHref(world.key, n.id, config.id)} aria-label={n.name} className={`w-plan__zone es-plan__z${litPath.has(n.id) && !frame ? ' is-lit' : ''}`} data-kind={frame ? 'ring' : n.kind === 'space' ? 'green' : 'zone'} data-node={n.id}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={Math.min(8, p.w / 6, p.h / 6)} />
            {frame ? <text x={p.x + 10} y={p.y + 16} textAnchor="start">{n.name}</text> : !small && <text x={p.x + p.w / 2} y={p.y + p.h / 2} textAnchor="middle" dominantBaseline="central">{n.name.length > p.w / 7.5 ? n.name.split(' ')[0] : n.name}</text>}
          </a>); })}
      </svg>
      <figcaption className="stage__cap w-plan__cap">Each outline opens its record. The same places are listed under Browse.</figcaption>
    </figure>
  );
}

function Place({ world, config, ix, node }: { world: World; config: RoleConfig; ix: Index; node: EstateNode }) {
  const e = ix.estate; const reader = readerOf(config); const [access, setAccess] = useState<'any' | 'stepfree'>('any');
  const trail = pathOf(ix, node.id).slice(1); const kids = (id: string) => (ix.children.get(id) || []).filter((n) => shown(ix, reader, n.id));
  const assets: Asset[] = ix.assetsOf.get(node.id) || []; const state = node.commissioning ? LITE_STATE[node.commissioning] : null;
  const within = (id: string) => pathOf(ix, id).some((n) => n.id === node.id);
  const routes = e.routes.filter((r) => (within(r.from) || within(r.to)) && shown(ix, reader, r.from) && shown(ix, reader, r.to));
  const shownRoutes = routes.filter((r) => access === 'any' || r.stepFree);
  const members = node.kind === 'district' ? e.nodes.filter((n) => n.group === node.name && n.id !== node.id && shown(ix, reader, n.id)) : [];
  const spanned = (node.spans || []).map((id) => ix.byId.get(id)).filter((n): n is EstateNode => !!n && shown(ix, reader, n.id));
  const link = (n: EstateNode) => <a className="w-item" href={estateHref(world.key, n.id, config.id)} data-node={n.id}><b>{n.name}</b><span className="ui-meta">{[words(n.type), n.capacity ? `${nf(n.capacity)} ${n.type === 'seating-section' || n.kind === 'room' ? 'seats or places' : 'people'}` : null, n.stepFree === false ? 'has steps' : null].filter(Boolean).join(' · ')}</span></a>;
  const list = (ns: EstateNode[]) => <ul className="es-cards">{ns.map((n) => <li key={n.id}>{link(n)}</li>)}</ul>;
  const facts: { k: string; v: ReactNode }[] = [
    { k: 'What it is', v: words(node.type) },
    ...(node.group && node.kind !== 'district' ? [{ k: 'Belongs to', v: node.group }] : []),
    ...(node.capacity ? [{ k: 'Capacity', v: `${nf(node.capacity)} people` }] : []),
    ...(node.dims ? [{ k: 'Size', v: `${node.dims[0]} × ${node.dims[1]} m, ${node.dims[2]} m high` }] : []),
    ...(node.layout ? [{ k: 'Layout', v: node.layout }] : []),
    ...(node.note ? [{ k: 'About', v: node.note }] : []),
    { k: 'Who may enter', v: ACCESS_WORDS[node.access] },
    ...(node.stepFree !== undefined ? [{ k: 'Step-free', v: <>{node.stepFree ? 'Yes' : 'No'}{node.accessNote ? `. ${node.accessNote}` : ''}</> }] : []),
    ...(state && seesEquipment(reader) ? [{ k: 'Systems', v: <span data-testid="estate-state">{state}{node.refreshed ? ` · last refreshed ${node.refreshed}` : ''}</span> }] : []),
    { k: 'Record', v: <code data-testid="estate-id">{node.id}</code> },
  ];
  return (
    <div className="w es" data-world={world.key} data-node={node.id} data-testid="estate-place">
      <Head world={world} config={config} trail={[{ label: 'Estate', href: estateHref(world.key, null, config.id) }, ...trail.slice(0, -1).filter((n) => n.kind !== 'venue' || trail.length > 2).map((n) => ({ label: n.name, href: estateHref(world.key, n.id, config.id) })), { label: node.name }]} title={node.name} />
      <div className="es-two">
        <Block title="This place" testId="estate-facts"><Rows label={`Facts about ${node.name}`} rows={facts} /></Block>
        {ix.estate.nodes.some((n) => n.plan && (pathOf(ix, node.id).some((p) => p.id === n.id) || (node.spans || []).includes(n.id))) && <Block title="Where it is" sub="Not to scale"><EstatePlan ix={ix} world={world} config={config} lit={node.id} /></Block>}
      </div>
      {assets.length > 0 && (seesEquipment(reader)
        ? <Block title="Equipment" sub={`${nf(assets.reduce((s, a) => s + a.qty, 0))} pieces · equipment classes, not makes`} testId="estate-equipment">
            <div className="es-tablewrap"><table className="es-table"><thead><tr><th scope="col">Item</th><th scope="col">Class</th><th scope="col">Count</th><th scope="col">State</th><th scope="col">Record</th></tr></thead>
              <tbody>{assets.map((a) => <tr key={a.id}><th scope="row">{a.label}</th><td>{a.cls}</td><td>{a.qty}</td><td>{a.state === 'PLANNED' ? 'Planned' : a.state === 'ATTENTION' ? 'Needs attention' : 'In service'}</td><td><code>{a.id}</code></td></tr>)}</tbody></table></div>
          </Block>
        : offers(assets).length > 0 && <Block title="What this room offers" testId="estate-offers"><ul className="es-offers">{offers(assets).map((o) => <li key={o}>{o}</li>)}</ul></Block>)}
      {routes.length > 0 && <Block title="Getting here" testId="estate-routes">
        <Pick label="Access need" value={access} options={[['any', 'Any route'], ['stepfree', 'Step-free only']] as const} onChange={setAccess} />
        <p className="ui-visually-hidden" role="status" aria-live="polite">{shownRoutes.length} route{shownRoutes.length === 1 ? '' : 's'} shown</p>
        {shownRoutes.length ? <ul className="w-list es-routes">{shownRoutes.map((r) => { const a = ix.byId.get(r.from)!; const b = ix.byId.get(r.to)!; return (
          <li key={r.id} data-route={r.id} data-stepfree={r.stepFree}><b>{a.name} to {b.name}</b><span>About {r.minutes} minute{r.minutes === 1 ? '' : 's'} by {r.via}. {r.stepFree ? 'Step-free.' : 'Has steps.'}{r.note ? ` ${r.note}.` : ''}</span></li>); })}</ul>
          : <p>No step-free route to this place is recorded. That is a gap in the record, not a statement that none exists.</p>}
      </Block>}
      {members.length > 0 && <Block title="In this area" sub={`${members.length} places`} testId="estate-inside">{list(members)}</Block>}
      {spanned.length > 0 && <Block title="Reaches" testId="estate-spans">{list(spanned)}</Block>}
      {kids(node.id).length > 0 && <Block title="Inside" testId="estate-inside">
        {kids(node.id).some((k) => k.kind === 'level')
          ? <>{kids(node.id).filter((k) => k.kind !== 'level').length > 0 && list(kids(node.id).filter((k) => k.kind !== 'level'))}
              {kids(node.id).filter((k) => k.kind === 'level').map((lv) => (<section key={lv.id} className="es-level"><h3>{lv.name}</h3>{kids(lv.id).length ? list(kids(lv.id)) : <p className="ui-meta">Nothing on this floor is shown to the {config.label}.</p>}</section>))}</>
          : list(kids(node.id))}
      </Block>}
      <p className="w-skip">{seesEquipment(reader) && studiable(node) && <><a className="ui-btn ui-btn--primary w-btn" href={`#/optimizer/${world.key}/${encodeURIComponent(node.id)}${config.id !== world.defaultConfig ? `?as=${encodeURIComponent(config.id)}` : ''}`} data-testid="open-optimizer">Study this room in the Space Optimizer</a> </>}<a className="ui-btn w-btn" href={estateHref(world.key, null, config.id)}>Back to the estate</a></p>
    </div>
  );
}

/** A place beyond this reader: no name, no facts. */
function Gate({ world, config }: { world: World; config: RoleConfig }) {
  return (
    <section className="owlpage" aria-labelledby="eg-h" data-world={world.key} data-testid="estate-gate">
      <img className="owlpage__owl" src="brand/owl.svg" alt="" width="112" height="112" />
      <div className="owlpage__b">
        <p className="kicker">Not part of this role’s work <Synthetic /></p>
        <h1 id="eg-h" tabIndex={-1}>This place is not shown to the {config.label}</h1>
        <p>A role is shown the places its work needs and nothing else. The {config.label} is shown {READER_WORDS[readerOf(config)]}.</p>
        <p className="owlpage__acts"><a className="ui-btn ui-btn--primary" href={estateHref(world.key, null, config.id)}>Open the estate</a> <a className="ui-btn" href={worldHref(world.key, config.id, { panel: 'roles' })}>All roles</a></p>
        <p className="ui-meta">Opening as another role in this demonstration grants nothing: the signed-in application’s server decides real access.</p>
      </div>
    </section>
  );
}

/** Enterprise keeps its own estate pages: the original Living Campus. This page hands over to them and builds nothing parallel. */
function EnterpriseEstate({ world }: { world: World }) {
  return (
    <div className="w es" data-world="enterprise" data-testid="estate-enterprise">
      <Crumbs items={[{ label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref('enterprise') }, { label: 'Estate' }]} />
      <p className="kicker w-kicker">{world.place} (fictional) <Synthetic /></p>
      <h1 tabIndex={-1}>The Enterprise estate is the Living Campus</h1>
      <p className="lead">Its buildings, floors, rooms and devices already have their own pages, behind the View-as roles.</p>
      <p className="w-skip"><a className="ui-btn ui-btn--primary w-btn" href="#/campus">Open the campus</a> <a className="ui-btn w-btn" href="#/lite">Open Lite</a> <a className="ui-btn w-btn" href="#/search">Open Search Party</a></p>
    </div>
  );
}
