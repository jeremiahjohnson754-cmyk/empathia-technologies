/**
 * Shared parts of the world screens: breadcrumbs, the screen header (always labelled SYNTHETIC), evidence and freshness labels, a 2D
 * plan, a signal chain with device passports, and a service board. 2D first (ADR-024): nothing here loads a 3D scene.
 *
 * CSP-safe: no style attribute; geometry lives in SVG attributes, colour in classes over the tokens. Every drawing has a text
 * equivalent beside it (the list is the keyboard interface; the plan mirrors its selection), and no state is carried by colour alone.
 */
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Icon } from '@empathia/ui';
import type { Journey, RoleConfig, World } from './registry.js';
import { worldHref } from './registry.js';
import type { Scoped } from './scope.js';

const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');
export function useScoped<T>(s: Scoped<T>): [T, Scoped<T>['set']] { return [useSyncExternalStore(s.subscribe, s.get, s.get), s.set]; }

// ------------------------------------------------------------------ chrome
export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="w-crumbs" data-testid="crumbs">
      <ol>{items.map((x, i) => <li key={x.label}>{x.href && i < items.length - 1 ? <a href={x.href}>{x.label}</a> : <span aria-current="page">{x.label}</span>}</li>)}</ol>
    </nav>
  );
}
/** The one label every world screen carries. */
export const Synthetic = () => <span className="ui-tag ui-tone--warn w-syn" data-testid="synthetic">SYNTHETIC</span>;

/** How a figure or a state is known (the demonstration's vocabulary; nothing here is measured, observed or verified). */
export type Evidence = 'DECLARED' | 'MODELED' | 'SIMULATED' | 'SPEC TO VERIFY' | 'UNKNOWN' | 'UNAVAILABLE';
const EV_HELP: Record<Evidence, string> = {
  DECLARED: 'Stated by a record or a configuration; not checked against the thing itself',
  MODELED: 'Computed by a model from the records; not measured',
  SIMULATED: 'Produced by this demonstration’s scenario; nothing was run',
  'SPEC TO VERIFY': 'A class of device from a template; the model is not chosen or verified',
  UNKNOWN: 'Nothing has reported, so nothing is claimed',
  UNAVAILABLE: 'The source is not connected in this demonstration',
};
export function Ev({ state }: { state: Evidence }) {
  return <span className="w-ev" data-ev={state} title={EV_HELP[state]}><span className="w-ev__mark" aria-hidden="true" />{state}</span>;
}
/** A status with how fresh its source is. Ages are part of the synthetic snapshot, never a clock reading. */
export type OpenState = 'Open' | 'Closed' | 'Busy' | 'Unknown';
export function Fresh({ state, age }: { state: OpenState; age: number | null }) {
  return <span className="w-fresh" data-state={state}><b>{state}</b>{' '}<span className="ui-meta">{age == null ? 'no source in this snapshot' : `declared ${age} min before this snapshot`}</span></span>;
}

export function ScreenHead({ world, journey, config, children }: { world: World; journey: Journey; config: RoleConfig; children?: ReactNode }) {
  return (
    <header className="w-head">
      <Crumbs items={[{ label: 'Start', href: '#/investor' }, { label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref(world.key, config.id) }, { label: journey.title }]} />
      <p className="kicker w-kicker">{world.name} · {world.place} (fictional) <Synthetic /></p>
      <h1 tabIndex={-1}>{journey.title}</h1>
      <p className="lead">{journey.blurb}</p>
      <p className="w-as" data-testid="world-as">Viewing as <b>{config.label}</b> <span className="ui-meta">a presentation choice: it grants nothing</span> <a href={worldHref(world.key, config.id, { panel: 'roles' })}>Change role</a></p>
      {children}
    </header>
  );
}
export function Block({ title, sub, children, id, testId }: { title: string; sub?: ReactNode; children: ReactNode; id?: string; testId?: string }) {
  const hid = useId();
  return <section className="w-block" aria-labelledby={hid} id={id} data-testid={testId}><div className="w-block__h"><h2 id={hid}>{title}</h2>{sub && <span className="ui-meta">{sub}</span>}</div>{children}</section>;
}
/** A row of exclusive choices (a filter): real buttons with aria-pressed, 44 px on phones. */
export function Pick<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return <div className="w-pick" role="group" aria-label={label}>{options.map(([k, l]) => <button key={k} type="button" className="w-pick__b" aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
/** A polite live line for what an action just did. */
export function Said({ children }: { children: ReactNode }) { return <p className="w-said" role="status" aria-live="polite">{children}</p>; }

// ------------------------------------------------------------------ 2D plan
export interface Zone { id: string; label: string; x: number; y: number; w: number; h: number; kind?: string; round?: boolean; short?: string }
export interface Place { id: string; label: string; x: number; y: number; kind: string; short?: string }
export type Pt = readonly [number, number];
/**
 * A 2D plan: zones, places and one route. It is a picture (role="img") with a summary; the lists beside it carry the same information
 * and the same selection. A plan stays dark in either theme, like every spatial stage (D36).
 */
export function Plan({ label, view, zones, places, selected, lit = [], route, onSelect, caption }: { label: string; view: readonly [number, number]; zones: readonly Zone[]; places: readonly Place[]; selected?: string | null; lit?: readonly string[]; route?: readonly Pt[]; onSelect?: (id: string) => void; caption: ReactNode }) {
  return (
    <figure className="w-plan stage" data-stage="" data-testid="plan">
      <svg viewBox={`0 0 ${view[0]} ${view[1]}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        {zones.map((z) => (
          <g key={z.id} className={cx('w-plan__zone', lit.includes(z.id) && 'is-lit')} data-kind={z.kind || 'zone'}>
            {z.round ? <ellipse cx={z.x + z.w / 2} cy={z.y + z.h / 2} rx={z.w / 2} ry={z.h / 2} /> : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={Math.min(8, z.w / 6, z.h / 6)} />}
            <text x={z.x + z.w / 2} y={z.y + z.h / 2} textAnchor="middle" dominantBaseline="central">{z.short ?? z.label}</text>
          </g>
        ))}
        {route && route.length > 1 && <polyline className="w-plan__route" points={route.map((p) => p.join(',')).join(' ')} data-testid="plan-route" />}
        {places.map((p) => (
          <g key={p.id} className={cx('w-plan__place', selected === p.id && 'is-on')} data-kind={p.kind} onClick={onSelect ? () => onSelect(p.id) : undefined}>
            <circle cx={p.x} cy={p.y} r={selected === p.id ? 13 : 9} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">{p.short ?? p.label.slice(0, 1)}</text>
          </g>
        ))}
      </svg>
      <figcaption className="stage__cap w-plan__cap">{caption}</figcaption>
    </figure>
  );
}

// ------------------------------------------------------------------ signal chain and device passports
export interface ChainNode {
  id: string; label: string;
  /** the device class (a template); never a make, a model or a serial */
  klass: string;
  stage: string;
  /** how this node hands on to the next */
  link?: string;
  evidence: Evidence;
  state: 'Nominal' | 'Degraded' | 'Unknown';
  passport: readonly (readonly [string, string])[];
}
export function Chain({ label, nodes, note }: { label: string; nodes: readonly ChainNode[]; note?: ReactNode }) {
  const [open, setOpen] = useState<string>(nodes[0]?.id ?? '');
  const n = nodes.find((x) => x.id === open) ?? nodes[0];
  const pid = useId();
  return (
    <div className="w-chain" data-testid="chain">
      <ol className="w-chain__list" aria-label={label}>
        {nodes.map((x, i) => (
          <li key={x.id}>
            <button type="button" className="w-chain__node" aria-pressed={x.id === n?.id} aria-controls={pid} onClick={() => setOpen(x.id)} data-state={x.state}>
              <span className="ui-meta">{i + 1} · {x.stage}</span><b>{x.label}</b><span className="w-chain__k">{x.klass}</span><span className="w-chain__s"><span className="w-dot" data-state={x.state} aria-hidden="true" />{x.state} · <Ev state={x.evidence} /></span>
            </button>
            {x.link && <span className="w-chain__link"><Icon name="arrow-down" size={14} /> {x.link}</span>}
          </li>
        ))}
      </ol>
      {n && (
        <section className="w-passport" id={pid} aria-live="polite" data-testid="passport">
          <h3>Device passport: {n.label}</h3>
          <dl>
            <div><dt>Class</dt><dd>{n.klass} <Ev state="SPEC TO VERIFY" /></dd></div>
            <div><dt>Position</dt><dd>{n.stage}</dd></div>
            <div><dt>State</dt><dd>{n.state} <Ev state={n.evidence} /></dd></div>
            {n.passport.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <p className="ui-meta">A class template, never an invented make, model or serial. Monitoring here is read-only: nothing on this page can change a device.</p>
        </section>
      )}
      {note}
    </div>
  );
}

// ------------------------------------------------------------------ service board
export interface Work { id: string; title: string; where: string; priority: 'High' | 'Medium' | 'Low'; step: number; disruptive?: boolean; by: string }
export const WORK_STEPS = ['Reported', 'Triaged', 'Assigned', 'Work done', 'Verified', 'Closed'] as const;
const NEXT = ['Triage', 'Assign', 'Mark work done', 'Verify independently', 'Close'];
/**
 * A service workflow that works locally: each item moves one step at a time, verification is by a second person, and work marked
 * disruptive cannot be done while the event is in progress (an event-time gate). Every move is written to the trail.
 */
export function WorkBoard({ label, initial, eventLive, actor, verifier }: { label: string; initial: readonly Work[]; eventLive?: boolean; actor: string; verifier: string }) {
  const [items, setItems] = useState<Work[]>(() => initial.map((x) => ({ ...x })));
  const [trail, setTrail] = useState<string[]>([]);
  useEffect(() => { setItems(initial.map((x) => ({ ...x }))); setTrail([]); }, [initial]);
  const move = (id: string) => setItems((list) => list.map((x) => {
    if (x.id !== id || x.step >= WORK_STEPS.length - 1) return x;
    const to = x.step + 1; const who = to === 4 ? verifier : actor;
    setTrail((t) => [`${x.id} ${WORK_STEPS[x.step]} → ${WORK_STEPS[to]} by ${who} (simulated)`, ...t].slice(0, 8));
    return { ...x, step: to };
  }));
  return (
    <div className="w-work" data-testid="workboard">
      <ul className="w-work__list" aria-label={label}>
        {items.map((x) => {
          const gated = !!eventLive && !!x.disruptive && x.step === 2; const done = x.step >= WORK_STEPS.length - 1; const gid = `gate-${x.id}`;
          return (
            <li key={x.id} data-step={WORK_STEPS[x.step]} data-work={x.id}>
              <div className="w-work__t"><b>{x.title}</b><span className="ui-meta">{x.id} · {x.where} · {x.priority} priority · reported by {x.by}{x.disruptive ? ' · disruptive' : ''}</span></div>
              <ol className="w-steps" aria-label={`${x.id} progress`}>{WORK_STEPS.map((s, i) => <li key={s} aria-current={i === x.step ? 'step' : undefined} data-done={i < x.step || undefined}>{s}</li>)}</ol>
              {done ? <span className="w-work__done"><Icon name="check" size={16} /> Closed</span>
                : <button type="button" className="ui-btn w-btn" disabled={gated} aria-describedby={gated ? gid : undefined} onClick={() => move(x.id)}>{NEXT[x.step]}</button>}
              {gated && <p className="w-work__gate" id={gid}><Icon name="lock" size={14} /> Disruptive work waits until the event ends. An authorised override would be recorded; this demonstration has none.</p>}
            </li>
          );
        })}
      </ul>
      <div className="w-trail"><h3>Trail</h3>{trail.length ? <ol aria-live="polite" data-testid="work-trail">{trail.map((t, i) => <li key={`${t}-${i}`}>{t}</li>)}</ol> : <p className="ui-meta" aria-live="polite">Nothing has moved yet. Each step you take is written here.</p>}</div>
    </div>
  );
}

/** A plain list of facts (label, value, optional evidence), stacked on phones: used instead of wide tables. */
export function Rows({ label, rows, testId }: { label: string; rows: readonly { k: string; v: ReactNode; ev?: Evidence; sub?: ReactNode }[]; testId?: string }) {
  return <ul className="w-rows" aria-label={label} data-testid={testId}>{rows.map((r) => <li key={r.k}><span className="w-rows__k">{r.k}{r.sub && <span className="ui-meta">{r.sub}</span>}</span><span className="w-rows__v">{r.v} {r.ev && <Ev state={r.ev} />}</span></li>)}</ul>;
}
export interface ScreenProps { world: World; journey: Journey; config: RoleConfig }
