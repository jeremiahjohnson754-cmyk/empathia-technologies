/**
 * Game day (#/gameday?as=<stadium role configuration>): the stadium's event clock, run by the visitor. One state machine
 * (gameday/engine.ts) behind two views: the control room for the roles that run the venue, and the public view for everyone else,
 * which carries gates, queues and plain advice only (D44). The event is kept in this browser so a visitor can open a room in the
 * estate and come back to the same minute. Everything is simulated and says so.
 */
import { useState } from 'react';
import type { PageProps } from '../registry.types.js';
import { WORLDS, configFor, worldHref, type RoleConfig } from '../worlds/registry.js';
import { enterContext, contextOf } from '../worlds/scope.js';
import { Block, Crumbs, Rows, Synthetic } from '../worlds/kit.js';
import { readerOf, seesEquipment } from '../estate/reader.js';
import { estateHref } from '../estate/EstatePage.js';
import { FAULTS, PHASE, PHASES, STEPS, SYSTEM_LABEL, advance, gates, holds, inject, numbers, publicView, report, respond, start, systems, type FaultId, type GameDay, type Result, type Step, type SystemKey } from './engine.js';

const KEY = 'empathia.demo.gameday.v1';
const load = (): GameDay => { try { const g = JSON.parse(localStorage.getItem(KEY) || 'null') as GameDay | null; if (g && (PHASES as readonly string[]).includes(g.phase) && Array.isArray(g.incidents)) return g; } catch { /* a blocked or corrupted store starts a fresh day */ } return start(); };
const keep = (g: GameDay) => { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch { /* the day still runs without storage */ } };
const NEXT_WORD: Record<Step, string> = { OPEN: 'Acknowledge', ACKNOWLEDGED: 'Dispatch', DISPATCHED: 'Mark fixed', FIXED: 'Verify', VERIFIED: '' };
const SYS_WORD = { OK: 'Working', DEGRADED: 'Degraded', AWAITING_CHECK: 'Restored, awaiting check' } as const;
const nf = (n: number) => n.toLocaleString('en-GB');

export default function GameDayPage({ role, query }: PageProps) {
  const world = WORLDS.stadium; const config = configFor('stadium', query.get('as')); enterContext(contextOf('stadium/gameday', config.id, role));
  const [g, setG] = useState<GameDay>(load); const [said, setSaid] = useState('');
  const apply = (r: Result, done: string) => { if (r.ok) { setG(r.state); keep(r.state); setSaid(done); } else setSaid(r.why); };
  const control = seesEquipment(readerOf(config)); const n = numbers(g); const idx = PHASES.indexOf(g.phase); const next = PHASES[idx + 1]; const h = holds(g);
  const head = (<>
    <Crumbs items={[{ label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref('stadium', config.id) }, { label: 'Game day' }]} />
    <p className="kicker w-kicker">{world.place} (fictional) · simulated event <Synthetic /></p>
    <h1 tabIndex={-1}>Game day: {PHASE[g.phase].label.toLowerCase()}</h1>
    <ol className="gd-phases" aria-label="Event phases" data-testid="gameday-phases">{PHASES.map((p, i) => <li key={p} aria-current={p === g.phase ? 'step' : undefined} data-done={i < idx}>{PHASE[p].label}<span className="ui-meta"> T{PHASE[p].at >= 0 ? '+' : ''}{PHASE[p].at}</span></li>)}</ol>
  </>);
  if (!control) { const v = publicView(g); return (
    <div className="w gd" data-world="stadium" data-testid="gameday-public" data-phase={g.phase}>
      {head}
      <p className="lead">What a guest is told right now. The {config.label} is shown gates, queues and advice; the control room is for the people who run the venue.</p>
      <Block title="Gates" testId="gameday-gates">
        <ul className="gd-gates">{v.gates.map((x) => <li key={x.gate} data-gate={x.gate} data-best={v.best?.gate === x.gate}><b>Gate {x.gate}</b><span>{x.open ? `About ${x.queueMin} minute${x.queueMin === 1 ? '' : 's'}` : 'Closed'}</span><span className="ui-meta">Step-free lane{v.best?.gate === x.gate ? ' · shortest queue now' : ''}</span></li>)}</ul>
        {v.notes.map((t, i) => <p key={i} className="gd-note" data-testid="gameday-note">{t}</p>)}
      </Block>
      <p className="ui-meta">Simulated figures for a fictional event. Opening as another role in this demonstration grants nothing. <a href={worldHref('stadium', config.id, { panel: 'roles' })}>Change role</a></p>
    </div>); }
  const sys = systems(g); const rep = report(g);
  return (
    <div className="w gd" data-world="stadium" data-testid="gameday" data-phase={g.phase} data-held={h.length > 0}>
      {head}
      <p className="lead">You hold the event clock as the <b>{config.label}</b>. Moving the clock changes every figure below; a fault you inject has to be worked and independently verified.</p>
      <ul className="es-totals" data-testid="gameday-numbers"><li><b>{nf(n.inside)}</b> inside of {nf(62200)}</li><li><b>{n.concoursePct}%</b> concourse load</li><li><b>{nf(n.staffTotal)}</b> staff on post</li><li>Programme feed <b>{n.program.toLowerCase()}</b></li><li><b>{n.openIncidents}</b> open incident{n.openIncidents === 1 ? '' : 's'}</li></ul>
      <p className="w-skip">
        {next && <button type="button" className="ui-btn ui-btn--primary w-btn" data-testid="gameday-advance" aria-describedby="gd-hold" onClick={() => apply(advance(g), `${PHASE[next].label}.`)}>Move to {PHASE[next].label.toLowerCase()}</button>}
        <button type="button" className="ui-btn ui-btn--quiet w-btn" data-testid="gameday-reset" onClick={() => { const s = start(); setG(s); keep(s); setSaid('A fresh event day.'); }}>Start the day again</button>
      </p>
      <p id="gd-hold" className={h.length && next ? 'gd-hold' : 'ui-visually-hidden'} data-testid="gameday-hold">{h.length && next ? `Held: ${h.join('; ')}.` : ''}</p>
      <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="gameday-said">{said}</p>
      <div className="es-two">
        <Block title="Systems" sub="Simulated states" testId="gameday-systems"><Rows label="System states" rows={(Object.keys(sys) as SystemKey[]).map((k) => ({ k: SYSTEM_LABEL[k], v: <span data-system={k} data-state={sys[k]}>{SYS_WORD[sys[k]]}</span> }))} /></Block>
        <Block title="Inject a fault" sub="Each is a record against a real room in the estate" testId="gameday-faults">
          <div className="sg-opts">{(Object.keys(FAULTS) as FaultId[]).map((f) => <button key={f} type="button" className="sg-opt" data-fault={f} onClick={() => apply(inject(g, f), `Fault opened: ${FAULTS[f].title}.`)}><span>{FAULTS[f].title}<span className="ui-meta"> · {FAULTS[f].severity}</span></span></button>)}</div>
        </Block>
      </div>
      <Block title="Incidents" sub={`${g.incidents.length} this event`} testId="gameday-incidents">
        {g.incidents.length === 0 ? <p>Nothing has failed. Inject a fault to see the venue respond.</p> : <ul className="gd-inc">{g.incidents.map((i) => { const f = FAULTS[i.fault]; const to = STEPS[STEPS.indexOf(i.step) + 1]; return (
          <li key={i.id} data-incident={i.id} data-step={i.step}><p><b>{i.id}</b> {f.title} <span className="ui-tag">{f.severity}</span></p>
            <ol className="gd-steps">{STEPS.map((s) => <li key={s} data-done={STEPS.indexOf(s) <= STEPS.indexOf(i.step)}>{s.toLowerCase()}{i.by[s] && s !== 'OPEN' ? ` · ${i.by[s]}` : ''}</li>)}</ol>
            <p className="gd-acts"><a className="ui-btn" href={estateHref('stadium', f.room, config.id)}>Open the room</a>{to && <button type="button" className="ui-btn ui-btn--primary" data-respond={to} onClick={() => apply(respond(g, i.id, to, config.label), `${i.id} ${to.toLowerCase()}.`)}>{NEXT_WORD[i.step]}</button>}</p>
            {i.step === 'FIXED' && i.by.FIXED === config.label && <p className="ui-meta">A fix is verified by someone else. <a href={worldHref('stadium', config.id, { panel: 'roles' })}>Open as another venue role</a>, then come back to this page.</p>}
          </li>); })}</ul>}
      </Block>
      <Block title={rep.title} sub="Computed from the event state" testId="gameday-report"><ul className="w-notes">{rep.lines.map((l, i) => <li key={i}>{l}</li>)}</ul></Block>
      <Block title="What guests are told" testId="gameday-publicpreview"><ul className="gd-gates">{gates(g).map((x) => <li key={x.gate}><b>Gate {x.gate}</b><span>{x.open ? `About ${x.queueMin} min` : 'Closed'}</span></li>)}</ul>{publicView(g).notes.map((t, i) => <p key={i} className="gd-note">{t}</p>)}</Block>
      <p className="ui-meta">Simulated: no count, feed or device state here is live or measured. The event is kept in this browser only.</p>
    </div>
  );
}
