/**
 * The Space Optimizer (#/optimizer/<world> opens that world's saved study; #/optimizer/<world>/<room>?option=A|B|C&show=<dimension>).
 * One page and one engine (optimizer/engine.ts) for every world, on the canonical room record. The chosen option and the dimension on
 * the plan live in the address, so a study can be linked to; nothing about the visitor is stored.
 *
 * It is a planning model and says so on every screen: a score is a stated rule applied to modelled seats, never a measurement.
 * Shown to the roles that are shown equipment (reader.ts); anyone else gets the owl page.
 */
import { useMemo, type ReactNode } from 'react';
import type { PageProps } from '../registry.types.js';
import { WORLDS, isWorld, configFor, worldHref, type RoleConfig, type World } from '../worlds/registry.js';
import { enterContext, contextOf, contextKey } from '../worlds/scope.js';
import { Block, Crumbs, Synthetic } from '../worlds/kit.js';
import { UnknownWorld } from '../worlds/WorldPage.js';
import { ESTATES, indexOf, type EstateNode } from '../estate/index.js';
import { readerOf, seesEquipment, shown, READER_WORDS } from '../estate/reader.js';
import { estateHref } from '../estate/EstatePage.js';
import { CLOSE, DIMENSIONS, DIMENSION_LABEL, OPTIONS, RULE_TEXT, SAVED, compare, scoreOf, studiable, type Dimension, type Study } from './engine.js';

type Show = 'sightlines' | 'video' | 'capture' | 'reproduction';
const SHOWS: readonly Show[] = ['sightlines', 'video', 'capture', 'reproduction'];
const SHOW_WORDS: Record<Show, [string, string]> = { sightlines: ['can see a screen', 'cannot see a screen well'], video: ['in view of a camera', 'out of camera view'], capture: ['within reach of a microphone', 'out of microphone reach'], reproduction: ['covered by a loudspeaker', 'outside loudspeaker coverage'] };
export const optimizerHref = (world: string, room: string, as?: string | null, option?: string, show?: string) => {
  const s = new URLSearchParams({ ...(as && as !== WORLDS[world as World['key']]?.defaultConfig ? { as } : {}), ...(option && option !== 'best' ? { option } : {}), ...(show && show !== 'sightlines' ? { show } : {}) }).toString();
  return `#/optimizer/${world}/${encodeURIComponent(room)}${s ? `?${s}` : ''}`;
};

export default function OptimizerPage({ role, params, query }: PageProps) {
  const w = params.world;
  if (!isWorld(w)) return <UnknownWorld what="This world is not part of the demonstration" />;
  const world = WORLDS[w]; const config = configFor(w, query.get('as')); enterContext(contextOf(`${w}/optimizer`, config.id, role));
  const estate = ESTATES[w];
  if (!estate) return <Enterprise world={world} />;
  if (!seesEquipment(readerOf(config))) return <Gate world={world} config={config} />;
  const ix = indexOf(estate); const id = params.room ? decodeURIComponent(params.room) : SAVED[w]!; const node = ix.byId.get(id);
  if (!node || !shown(ix, readerOf(config), id)) return <UnknownWorld what={`${estate.name} has no room at this address`} />;
  if (!studiable(node)) return <NotStudiable world={world} config={config} node={node} />;
  const o = query.get('option'); const s = query.get('show');
  return <StudyView key={`${contextKey()}|${id}`} world={world} config={config} node={node} option={o === 'A' || o === 'B' || o === 'C' ? o : null} show={(SHOWS as readonly string[]).includes(s || '') ? (s as Show) : 'sightlines'} trail={ix.byId.get(node.parent || '') ? [ix.byId.get(ix.byId.get(node.parent!)!.parent || '')?.name, ix.byId.get(node.parent!)!.name].filter(Boolean).join(', ') : ''} />;
}

function StudyView({ world, config, node, option, show, trail }: { world: World; config: RoleConfig; node: EstateNode; option: 'A' | 'B' | 'C' | null; show: Show; trail: string }) {
  const c = useMemo(() => compare(node), [node]); const sel = c.studies.find((s) => s.option.key === option) || c.best; const saved = SAVED[world.key] === node.id;
  const href = (o?: string, sh?: string) => optimizerHref(world.key, node.id, config.id, o ?? sel.option.key, sh ?? show);
  const others = c.close.filter((s) => s !== c.best);
  return (
    <div className="w so" data-world={world.key} data-room={node.id} data-option={sel.option.key} data-testid="optimizer">
      <Crumbs items={[{ label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref(world.key, config.id) }, { label: 'Estate', href: estateHref(world.key, null, config.id) }, { label: node.name, href: estateHref(world.key, node.id, config.id) }, { label: 'Space Optimizer' }]} />
      <p className="kicker w-kicker">Space Optimizer · {world.place} (fictional) <Synthetic /></p>
      <h1 tabIndex={-1}>{node.name}: three ways to equip it</h1>
      <p className="lead">{trail ? `${trail}. ` : ''}{node.dims![0]} × {node.dims![1]} m, {node.dims![2]} m high, for {node.capacity} people. Each option is scored on nine dimensions.</p>
      <p className="so-model" data-testid="optimizer-model"><b>A planning model, not a measurement.</b> Seats and equipment are placed by rule and every score is a stated rule applied to them. A real room needs a survey, drawings and an engineer’s judgement.{saved && <> <span className="ui-tag" data-testid="optimizer-saved">Saved study for {world.name}</span></>}</p>

      <Block title="What the model prefers" testId="optimizer-best">
        <p className="so-best"><b>Option {c.best.option.key}: {c.best.option.name}</b>, with a purpose fit of {scoreOf(c.best, 'purpose')} out of 100.</p>
        <p>{others.length ? `Option${others.length > 1 ? 's' : ''} ${others.map((s) => `${s.option.key} (${scoreOf(s, 'purpose')})`).join(' and ')} ${others.length > 1 ? 'are' : 'is'} within ${CLOSE} points, which is closer than this model can separate; ${c.best.option.key} is preferred because it is the easiest of them to look after.` : `The next option is ${c.top - Math.max(...c.studies.filter((s) => s !== c.best).map((s) => scoreOf(s, 'purpose')))} points behind.`}</p>
        <p className="ui-meta">{c.best.option.tradeoff}</p>
      </Block>

      <div className="so-two">
        <Block title={`Option ${sel.option.key} on the plan`} sub="Modelled positions · not to scale with the building" testId="optimizer-plan">
          <nav className="w-pick" aria-label="Option">{OPTIONS.map((o) => <a key={o.key} className="w-pick__b so-pickb" href={href(o.key)} aria-current={sel.option.key === o.key ? 'true' : undefined} data-option={o.key}>Option {o.key}</a>)}</nav>
          <p>{sel.option.summary}</p>
          <nav className="w-pick" aria-label="Show on the plan">{SHOWS.map((d) => <a key={d} className="w-pick__b so-pickb" href={href(undefined, d)} aria-current={show === d ? 'true' : undefined} data-show={d}>{DIMENSION_LABEL[d]}</a>)}</nav>
          <RoomPlan s={sel} show={show} name={node.name} />
        </Block>
        <Block title="Nine dimensions, three options" sub="0 to 100 · modelled" testId="optimizer-table">
          <div className="es-tablewrap"><table className="so-table">
            <caption className="ui-visually-hidden">Scores of options A, B and C on each of the nine dimensions for {node.name}</caption>
            <thead><tr><th scope="col">Dimension</th>{c.studies.map((s) => <th key={s.option.key} scope="col" className="so-num" aria-current={s === sel ? 'true' : undefined}><a href={href(s.option.key)}>{s.option.key}</a></th>)}</tr></thead>
            <tbody>{DIMENSIONS.map((d) => { const top = Math.max(...c.studies.map((s) => scoreOf(s, d))); return (
              <tr key={d} data-dimension={d} className={d === 'purpose' ? 'so-total' : undefined}><th scope="row">{DIMENSION_LABEL[d]}</th>
                {c.studies.map((s) => { const v = scoreOf(s, d); return <td key={s.option.key} className="so-num" aria-current={s === sel ? 'true' : undefined} data-option={s.option.key}><span className="so-bar" aria-hidden="true"><i style={{ width: `${v}%` }} /></span><span className="so-v">{v}{v === top && <span className="so-topmark" title="Highest of the three"> ▲<span className="ui-visually-hidden"> highest</span></span>}</span></td>; })}</tr>); })}</tbody>
          </table></div>
          <p className="ui-meta">▲ marks the highest of the three on that row. Purpose fit weights the other eight for this kind of room.</p>
        </Block>
      </div>

      <Block title={`Why option ${sel.option.key} scores as it does`} testId="optimizer-why">
        <dl className="so-why">{sel.scores.map((x) => <div key={x.dimension} data-dimension={x.dimension}><dt>{DIMENSION_LABEL[x.dimension]} <b>{x.score}</b></dt><dd>{x.detail}.<span className="ui-meta"> Rule: {RULE_TEXT[x.dimension as Dimension]}</span></dd></div>)}</dl>
      </Block>
      <Block title="What this model does not know">
        <ul className="w-notes"><li>Columns, windows, doors, daylight, room acoustics and the furniture actually in the room.</li><li>Cost, programme and what equipment the estate already owns.</li><li>Any measurement: nothing here was surveyed, tested or commissioned.</li></ul>
      </Block>
      <p className="w-skip"><a className="ui-btn w-btn" href={estateHref(world.key, node.id, config.id)}>Back to {node.name}</a>{!saved && <> <a className="ui-btn ui-btn--quiet w-btn" href={optimizerHref(world.key, SAVED[world.key]!, config.id)}>Open this world’s saved study</a></>}</p>
    </div>
  );
}

/** The room from above: front wall at the top. A seat that meets the rule is a filled dot; one that does not is a hollow ring with a bar, so the two differ by shape as well as colour. */
function RoomPlan({ s, show, name }: { s: Study; show: Show; name: string }) {
  const L = s.layout; const k = 520 / Math.max(L.width, 1); const W = 520 + 40; const H = Math.round(L.depth * k) + 56; const X = (x: number) => 20 + x * k; const Y = (y: number) => 28 + y * k; const pass = s.perSeat[show];
  const r = Math.max(2.4, Math.min(7, 0.2 * k)); const n = pass.filter(Boolean).length; const [yes, no] = SHOW_WORDS[show];
  let extra: ReactNode = null;
  if (show === 'capture') extra = L.mics.map((m, i) => <circle key={i} className="so-reach" cx={X(m.x)} cy={Y(m.y)} r={2.6 * k} />);
  return (
    <figure className="w-plan stage so-plan" data-stage="" data-testid="optimizer-roomplan" data-show={show}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name}, option ${s.option.key}, from above: ${n} of ${pass.length} seats ${yes}`} preserveAspectRatio="xMidYMid meet">
        <rect className="so-room" x={X(0)} y={Y(0)} width={L.width * k} height={L.depth * k} rx="3" />
        <text className="so-lab" x={X(L.width / 2)} y={16} textAnchor="middle">Front of room · {L.width} m wide, {L.depth} m deep</text>
        {extra}
        {show === 'reproduction' && L.speakers.filter((p) => p.kind === 'ceiling').map((p, i) => <circle key={i} className="so-reach" cx={X(p.x)} cy={Y(p.y)} r={Math.max(0.6, L.height - 1.2) * k} />)}
        {L.seats.map((p, i) => pass[i]
          ? (p.wheelchair ? <rect key={i} className="so-seat is-ok" data-ok="true" data-wheelchair="true" x={X(p.x) - r} y={Y(p.y) - r} width={2 * r} height={2 * r} rx="2" /> : <circle key={i} className="so-seat is-ok" data-ok="true" cx={X(p.x)} cy={Y(p.y)} r={r} />)
          : <g key={i} className="so-seat is-no" data-ok="false" {...(p.wheelchair ? { 'data-wheelchair': 'true' } : {})}>{p.wheelchair ? <rect x={X(p.x) - r} y={Y(p.y) - r} width={2 * r} height={2 * r} rx="2" /> : <circle cx={X(p.x)} cy={Y(p.y)} r={r} />}<line x1={X(p.x) - r} y1={Y(p.y)} x2={X(p.x) + r} y2={Y(p.y)} /></g>)}
        {L.screens.map((p, i) => p.repeater ? <rect key={i} className="so-screen" x={X(p.x) - 3} y={Y(p.y) - p.widthM * k / 2} width="6" height={p.widthM * k} /> : <rect key={i} className="so-screen" x={X(p.x) - p.widthM * k / 2} y={Y(0) - 3} width={p.widthM * k} height="6" />)}
        {L.cameras.map((p, i) => <path key={i} className="so-cam" d={`M${X(p.x)},${Y(p.y) + (p.ny > 0 ? 10 : -10)} l-7,${p.ny > 0 ? -12 : 12} h14 z`} />)}
        {L.mics.map((p, i) => <path key={i} className="so-mic" d={`M${X(p.x)},${Y(p.y) - 5} l5,5 l-5,5 l-5,-5 z`} />)}
        {L.speakers.map((p, i) => <rect key={i} className="so-spk" x={X(p.x) - 4} y={Y(p.y) - 4} width="8" height="8" />)}
      </svg>
      <figcaption className="stage__cap w-plan__cap so-cap">
        <span data-testid="optimizer-count"><b>{n} of {pass.length}</b> seats {yes}{n < pass.length ? `; ${pass.length - n} ${no}` : ''}.</span>
        <span className="so-legend"><span><svg width="14" height="14" aria-hidden="true"><circle className="so-seat is-ok" cx="7" cy="7" r="5" /></svg> meets the rule</span><span><svg width="14" height="14" aria-hidden="true"><g className="so-seat is-no"><circle cx="7" cy="7" r="5" /><line x1="2" y1="7" x2="12" y2="7" /></g></svg> does not</span><span><svg width="14" height="14" aria-hidden="true"><rect className="so-seat is-ok" x="2" y="2" width="10" height="10" rx="2" /></svg> wheelchair position</span><span><svg width="18" height="14" aria-hidden="true"><rect className="so-screen" x="1" y="5" width="16" height="5" /></svg> screen</span><span><svg width="14" height="14" aria-hidden="true"><path className="so-cam" d="M7,12 l-6,-10 h12 z" /></svg> camera</span><span><svg width="14" height="14" aria-hidden="true"><path className="so-mic" d="M7,1 l6,6 l-6,6 l-6,-6 z" /></svg> microphone</span><span><svg width="14" height="14" aria-hidden="true"><rect className="so-spk" x="3" y="3" width="8" height="8" /></svg> loudspeaker</span></span>
      </figcaption>
    </figure>
  );
}

function Gate({ world, config }: { world: World; config: RoleConfig }) {
  return (
    <section className="owlpage" aria-labelledby="sg-h" data-world={world.key} data-testid="optimizer-gate">
      <img className="owlpage__owl" src="brand/owl.svg" alt="" width="112" height="112" />
      <div className="owlpage__b"><p className="kicker">Not part of this role’s work <Synthetic /></p>
        <h1 id="sg-h" tabIndex={-1}>The Space Optimizer is not shown to the {config.label}</h1>
        <p>It is a design tool for the people who equip and look after rooms. The {config.label} is shown {READER_WORDS[readerOf(config)]}.</p>
        <p className="owlpage__acts"><a className="ui-btn ui-btn--primary" href={estateHref(world.key, null, config.id)}>Open the estate</a> <a className="ui-btn" href={worldHref(world.key, config.id, { panel: 'roles' })}>All roles</a></p>
        <p className="ui-meta">Opening as another role in this demonstration grants nothing: the signed-in application’s server decides real access.</p></div>
    </section>
  );
}
function NotStudiable({ world, config, node }: { world: World; config: RoleConfig; node: EstateNode }) {
  return (<div className="w so" data-world={world.key} data-testid="optimizer-none"><p className="kicker w-kicker">Space Optimizer <Synthetic /></p><h1 tabIndex={-1}>{node.name} cannot be studied</h1>
    <p className="lead">The model needs a room’s size and a number of seats between 6 and 400. This record has {node.dims ? 'a size' : 'no size'} and {node.capacity ? `${node.capacity} seats` : 'no seat count'}.</p>
    <p className="w-skip"><a className="ui-btn ui-btn--primary w-btn" href={optimizerHref(world.key, SAVED[world.key]!, config.id)}>Open this world’s saved study</a> <a className="ui-btn w-btn" href={estateHref(world.key, node.id, config.id)}>Back to {node.name}</a></p></div>);
}
function Enterprise({ world }: { world: World }) {
  return (<div className="w so" data-world="enterprise" data-testid="optimizer-enterprise"><Crumbs items={[{ label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref('enterprise') }, { label: 'Space Optimizer' }]} />
    <p className="kicker w-kicker">{world.place} (fictional) <Synthetic /></p><h1 tabIndex={-1}>Enterprise rooms are designed in Build a Room</h1>
    <p className="lead">The Living Campus keeps its own room design and design-check pages, on the commissioning engine. The Space Optimizer does not yet read those rooms.</p>
    <p className="w-skip"><a className="ui-btn ui-btn--primary w-btn" href="#/build">Open Build a Room</a> <a className="ui-btn w-btn" href="#/campus">Open the campus</a></p></div>);
}
