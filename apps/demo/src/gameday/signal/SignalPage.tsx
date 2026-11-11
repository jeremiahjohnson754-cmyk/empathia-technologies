/**
 * #/gameday/incident/camera-feed?as=<stadium role configuration>&step=<step> — The Critical Signal (founder, 10 Nov 2026).
 * A camera feed is lost during the simulated event, and one page carries the broadcast engineer from the alert to the event view:
 * the alert, the zone on the stadium plan, the signal chain, its history and the people responsible, the observations, the recovery
 * procedure, the outcome, an independent check, what operations and the ledger now show, and back to the event.
 *
 * It is one connected workflow because it is one set of records. The chain is the estate's equipment records (Lite draws the same
 * places); the incident is the game-day engine's, in the same stored event the game-day page reads, so a step taken here is what that
 * page shows on return; every step and every refusal is a line in the shared workspace ledger.
 *
 * Who may do what is asked of signal/access.ts and enforced in signal/store.ts. A configuration that may not open the incident is
 * refused by the registry before this file is fetched (D44). The step lives in the address (?step=), so a step can be linked to and
 * survives a reload. One step at a time, with the picture beside it: the plan for where, the chain for everything after.
 *
 * SIMULATED event at a fictional stadium. Observations are simulated or inferred. Nothing is monitored and no device is contacted.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon, Notice } from '@empathia/ui';
import type { PageProps } from '../../registry.types.js';
import { canOpen } from '../../access/policy.js';
import { resolve } from '../../registry.pages.js';
import { WORLDS, configById, configFor, journeyAt, journeyHref, worldHref, type RoleConfig } from '../../worlds/registry.js';
import { contextOf, enterContext } from '../../worlds/scope.js';
import { Crumbs, Rows, Synthetic } from '../../worlds/kit.js';
import { EstatePlan, estateHref } from '../../estate/EstatePage.js';
import { ACCESS_WORDS, readerOf, shown } from '../../estate/reader.js';
import { useWorkspace } from '../../workspace/useWorkspace.js';
import type { Workspace } from '../../workspace/store.js';
import { FAULTS, PHASE, PHASES, SYSTEM_LABEL, holds, report, systems, type GameDay, type Step } from '../engine.js';
import { keep, load } from '../store.js';
import { SIGNAL_FAULT, SIGNAL_STEPS, SIGNAL_VERIFY, SIGNAL_WHY, isSignalStep, mayOpenSignal, mayVerifySignal, mayWorkSignal, signalHref, type SignalStep } from './access.js';
import { CAMERA, FAULT, PROVENANCE_HELP, READING_WORD, chainOf, evidenceFor, evidenceNote, evidenceProblems, failedHopOf, historyOf, hopName, hopOf, incidentOf, isolate, observe, outcomeNote, outcomeProblems, peopleOf, placesOf, procedureFor, reached, readingOf, type Hop, type HopId, type Observation, type Provenance, type Reading } from './model.js';
import { ledgerOf, notRestored, simulateLoss, step as takeStep, type Actor, type Done } from './store.js';

const TITLE: Record<SignalStep, [string, string]> = {
  alert: ['Alert', 'The alert'], where: ['Where', 'Where it is'], chain: ['Signal chain', 'The signal chain'], history: ['History and people', 'History, and who is responsible'], observe: ['Observations', 'What each point shows'],
  procedure: ['Procedure', 'The recovery procedure'], outcome: ['Outcome', 'Record the outcome'], verify: ['Verify', 'Check the restoration'], report: ['Report', 'What operations and the ledger now show'], return: ['Return', 'Back to the event'],
};
const STATE_WORD: Record<Step, string> = { OPEN: 'Open, not yet acknowledged', ACKNOWLEDGED: 'Acknowledged', DISPATCHED: 'Procedure under way', FIXED: 'Restored, waiting for an independent check', VERIFIED: 'Restored and checked' };
const SYS_WORD = { OK: 'Working', DEGRADED: 'Degraded', AWAITING_CHECK: 'Restored, waiting for an independent check' } as const;
const DRAFT_KEY = 'empathia.demo.signal.draft.v1';
interface Draft { incident: string; done: string[]; restored: 'yes' | 'no' | null; note: string; evidence: string[] }
const blank = (incident: string): Draft => ({ incident, done: [], restored: null, note: '', evidence: [] });
const restore = (incident: string): Draft => { try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null') as Draft | null; if (d && d.incident === incident && Array.isArray(d.done) && Array.isArray(d.evidence) && typeof d.note === 'string') return d; } catch { /* a draft lasts the page */ } return blank(incident); };
const words = (t: string) => t.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
/** A kept note as a sentence: its first letter raised, nothing else touched (record identifiers keep their hyphens). */
const cap = (t: string) => t.replace(/^./, (c) => c.toUpperCase());
const tMinus = (at: number) => `T${at >= 0 ? '+' : ''}${at} min`;
const when = (iso: string) => iso.slice(0, 16).replace('T', ' ');

function Prov({ p }: { p: Provenance }) { return <span className="cs-prov" data-prov={p} title={PROVENANCE_HELP[p]}><span className="cs-prov__m" aria-hidden="true" />{p}</span>; }
const READ_ICON: Record<Reading, 'check' | 'alert' | 'info'> = { passes: 'check', stops: 'alert', nothing: 'info' };

export default function SignalPage({ role, params, query }: PageProps) {
  const config = configFor('stadium', query.get('as')); enterContext(contextOf('stadium/gameday/incident', config.id, role));
  if (params['fault'] !== SIGNAL_FAULT) return (
    <div className="w cs" data-world="stadium" data-testid="signal-unknown">
      <Crumbs items={[{ label: 'Worlds', href: '#/worlds' }, { label: WORLDS.stadium.name, href: worldHref('stadium', config.id) }, { label: 'Game day', href: `#/gameday?as=${encodeURIComponent(config.id)}` }, { label: 'Incident' }]} />
      <h1 tabIndex={-1}>This fault has no guided incident</h1>
      <p className="lead">The camera feed is the one fault that is worked on a page of its own. Every other fault is worked on the game-day page.</p>
      <p className="w-skip"><a className="ui-btn ui-btn--primary w-btn" href={`#/gameday?as=${encodeURIComponent(config.id)}`}>Open game day</a></p>
    </div>);
  // the registry refuses this address before the page is fetched; this is the same answer, should the page ever be reached another way
  if (!mayOpenSignal(config.id)) return <div className="w cs" data-world="stadium" data-testid="signal-refused"><h1 tabIndex={-1}>Not shown to the {config.label}</h1><p>{SIGNAL_WHY}.</p><p className="w-skip"><a className="ui-btn ui-btn--primary w-btn" href={`#/gameday?as=${encodeURIComponent(config.id)}`}>Open game day</a></p></div>;
  return <Incident key={config.id} role={role} config={config} query={query} />;
}

function Incident({ role, config, query }: { role: PageProps['role']; config: RoleConfig; query: URLSearchParams }) {
  const world = WORLDS.stadium; const chain = useMemo(() => chainOf(), []); const { w, apply } = useWorkspace();
  const [g, setG] = useState<GameDay>(load);
  const [step, setStep] = useState<SignalStep>(() => { const s = query.get('step'); return isSignalStep(s) ? s : 'alert'; });
  const inc = incidentOf(g);
  const [draft, setDraft] = useState<Draft>(() => restore(inc?.id || ''));
  const [said, setSaid] = useState(''); const [refused, setRefused] = useState<string[] | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null); const railRef = useRef<HTMLOListElement>(null); const sideRef = useRef<HTMLElement>(null); const moved = useRef(false);
  const actor: Actor = { config: config.id, label: config.label }; const mayWork = mayWorkSignal(config.id); const mayVerify = mayVerifySignal(config.id);
  const reader = readerOf(config); const sees = (placeId: string) => shown(chain.index, reader, placeId);
  const opens = (href: string) => { const x = resolve(href); return !!x && canOpen(role, x); };
  const gameday = `#/gameday?as=${encodeURIComponent(config.id)}`;

  // the step is kept in the address without a navigation; a link to another step of this page (or the browser's back) moves there
  useEffect(() => { try { history.replaceState(null, '', signalHref(config.id, step)); } catch { /* the address stays */ } }, [config.id, step]);
  useEffect(() => { const s = query.get('step'); if (isSignalStep(s) && s !== step) setStep(s); }, [query.toString()]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const h = () => { const s = new URLSearchParams(location.hash.split('?')[1] || '').get('step'); setStep(isSignalStep(s) ? s : 'alert'); }; addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  useEffect(() => {
    if (!moved.current) return; const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 900px)').matches;
    // on a phone the picture sits above the step; "Where" is about the plan, so that step starts at the plan, and every other at its heading
    headRef.current?.focus({ preventScroll: true }); (narrow && step === 'where' ? sideRef.current : headRef.current)?.scrollIntoView?.({ block: narrow ? 'start' : 'nearest' });
    railRef.current?.querySelector('[aria-current=step]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [step]);
  // what is half-entered (ticks, a note, the evidence chosen) survives a reload, and belongs to one incident only
  useEffect(() => { if ((inc?.id || '') !== draft.incident) setDraft(restore(inc?.id || '')); }, [inc?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* the draft lasts the page */ } }, [draft]);

  const failed = inc ? failedHopOf(inc.id) : null; const fixed = reached(inc, 'FIXED');
  /** as found: what the points showed when the feed was lost. The diagnosis and the procedure rest on these, before and after the fix. */
  const found = useMemo<Observation[]>(() => (inc ? observe(chain, { incident: inc.id, failed }) : []), [chain, inc?.id, failed]);   // eslint-disable-line react-hooks/exhaustive-deps
  /** now: the same points once a fix has been recorded */
  const now = useMemo<Observation[]>(() => (inc && fixed ? observe(chain, { incident: inc.id, failed: null, via: failed }) : found), [chain, inc?.id, fixed, failed, found]);   // eslint-disable-line react-hooks/exhaustive-deps
  const iso = useMemo(() => isolate(chain, found), [chain, found]); const proc = useMemo(() => procedureFor(chain, iso.hop), [chain, iso.hop]);
  const evidence = useMemo(() => evidenceFor(chain, iso.hop), [chain, iso.hop]); const isoHop = hopOf(chain, iso.hop);
  const hist = useMemo(() => historyOf(chain, g, inc), [chain, g, inc]); const people = useMemo(() => peopleOf(chain, g), [chain, g]);
  const zone = chain.index.byId.get(FAULTS[FAULT].room)!; const sys = systems(g); const held = holds(g); const heldByThis = held.filter((h) => h.startsWith(FAULTS[FAULT].title));
  const next = PHASES[PHASES.indexOf(g.phase) + 1]; const rep = report(g); const lines = inc ? ledgerOf(w, inc.id) : [];
  const fixer = inc?.by.FIXED || null; const sameRole = !!fixer && fixer === config.label;

  const go = (to: SignalStep) => { moved.current = true; setRefused(null); setSaid(''); setStep(to); };
  const run = (fn: (next: Workspace) => Done, then?: () => void) => {
    const out = apply(fn);
    if (!out.ok) { setRefused(out.why); setSaid(out.why.join(' ')); return; }
    setRefused(null); setG(out.state); keep(out.state); setSaid(out.said); then?.();
  };
  const move = (to: Step, note?: string, then?: () => void) => { if (inc) run((n) => takeStep(n, g, actor, inc.id, to, note), then); };
  const recordOutcome = () => {
    if (!inc) return; const input = { restored: draft.restored === 'yes', done: draft.done, note: draft.note };
    if (!draft.restored) { setRefused(['Say whether the picture is back.']); return; }
    const errs = outcomeProblems(proc, input); if (errs.length) { setRefused(errs); setSaid(errs.join(' ')); return; }
    if (input.restored) move('FIXED', outcomeNote(proc, input)); else run((n) => notRestored(n, g, actor, inc.id, draft.note));
  };
  const verify = () => {
    if (!inc) return;
    if (!sameRole) { const errs = evidenceProblems(evidence, draft.evidence); if (errs.length) { setRefused(errs); setSaid(errs.join(' ')); return; } }
    move('VERIFIED', evidenceNote(evidence, draft.evidence));   // the engine itself refuses a check by the role that made the fix
  };
  const toggle = (key: 'done' | 'evidence', id: string) => setDraft((d) => ({ ...d, [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id] }));

  const n = SIGNAL_STEPS.indexOf(step); const prev = n > 0 ? SIGNAL_STEPS[n - 1]! : null; const after = n < SIGNAL_STEPS.length - 1 ? SIGNAL_STEPS[n + 1]! : null;
  const doneBy: Partial<Record<SignalStep, boolean>> = { alert: reached(inc, 'ACKNOWLEDGED'), procedure: reached(inc, 'DISPATCHED'), outcome: fixed, verify: reached(inc, 'VERIFIED') };
  const isDone = (s: SignalStep, i: number) => (s in doneBy ? !!doneBy[s] : i < n);
  const planSteps: SignalStep[] = ['alert', 'where', 'return']; const showPlan = planSteps.includes(step);
  const others = SIGNAL_VERIFY.map((id) => configById(id)!).filter((c) => c.id !== config.id && c.label !== fixer);
  const hopLine = (h: Hop) => (sees(h.place.id) ? `${h.place.name}${h.level ? `, ${h.level.name.toLowerCase()}` : ''}` : `A room the ${config.label} is not shown`);
  const refusal = refused && <div data-testid="signal-refused-why"><Notice tone="bad"><ul className="cs-why">{refused.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>;
  const stateTone = !inc ? 'muted' : inc.step === 'VERIFIED' ? 'ok' : inc.step === 'FIXED' ? 'info' : 'bad';
  const head = (s: SignalStep): ReactNode => <h2 className="cs-h" tabIndex={-1} ref={headRef}>{TITLE[s][1]}</h2>;

  return (
    <div className="w cs" data-world="stadium" data-testid="signal-page" data-step={step} data-incident={inc?.id || ''} data-state={inc?.step || 'NONE'} data-failed={failed || ''} data-config={config.id}>
      <Crumbs items={[{ label: 'Worlds', href: '#/worlds' }, { label: world.name, href: worldHref('stadium', config.id) }, { label: 'Game day', href: gameday }, { label: 'Camera feed incident' }]} />
      <p className="kicker w-kicker">{world.place} (fictional) · simulated event <Synthetic /></p>
      <h1 tabIndex={-1}>{inc ? `${inc.id}: camera ${CAMERA} shows no picture` : `Camera ${CAMERA}: no feed is lost`}</h1>
      <p className={`cs-as ui-tone--${stateTone}`} data-testid="signal-as"><span>You are the <b>{config.label}</b>.</span> <span className={`ui-tag ui-tone--${stateTone}`} data-testid="signal-state">{inc ? STATE_WORD[inc.step] : 'No incident open'}</span> <span className="cs-clock" data-testid="signal-clock" data-held={heldByThis.length > 0 && !!next}><Icon name="clock" size={14} /> {PHASE[g.phase].label}, {tMinus(PHASE[g.phase].at)}{heldByThis.length && next ? <> · <b className="cs-held">{PHASE[next].label.toLowerCase()} is held</b></> : ''}</span></p>

      <nav aria-label="Steps of this incident"><ol className="cs-rail" data-testid="signal-rail" ref={railRef}>
        {SIGNAL_STEPS.map((s, i) => { const d = isDone(s, i); return (
          <li key={s} className={s === step ? 'on' : d ? 'done' : ''}><button type="button" aria-current={s === step ? 'step' : undefined} onClick={() => go(s)} data-testid={`signal-step-${s}`}><span className="cs-rail__n" aria-hidden="true">{d ? <Icon name="check" size={14} /> : i + 1}</span>{TITLE[s][0]}{d ? <span className="ui-visually-hidden"> (done)</span> : null}</button></li>); })}
      </ol></nav>
      <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="signal-said">{said}</p>

      <div className="cs-cols">
        <aside className="cs-side" ref={sideRef} aria-label={showPlan ? 'The stadium plan' : 'The signal chain'}>
          {showPlan
            ? <EstatePlan ix={chain.index} world={world} config={config} lit={zone.id} mark={{ id: zone.id, lines: !inc ? [`Camera ${CAMERA}`] : [`Camera ${CAMERA}`, fixed ? 'picture back' : 'no picture'], tone: !inc ? 'plain' : fixed ? 'ok' : 'bad' }}
                caption={<>The ring on the west side is camera {CAMERA}, on the {zone.name.toLowerCase()}. The highlighted bowl is what it looks over. Each outline opens its record. Not to scale.</>} />
            : <figure className="cs-fig" data-testid="signal-picture" data-marked={inc && !fixed ? iso.hop || '' : ''}>
                <ol className="cs-chain" aria-label={`Signal chain for camera ${CAMERA}, in the order the picture travels`}>
                  {chain.hops.map((h) => { const r = inc ? readingOf(now, h.id) : null; return (
                    <li key={h.id} data-hop={h.id} data-reading={r?.reading || 'none'} data-mark={!!inc && !fixed && iso.hop === h.id || undefined} data-standby={fixed && failed === h.id || undefined}>
                      <span className="cs-chain__n" aria-hidden="true">{h.n}</span>
                      <span className="cs-chain__b"><b>{hopName(h)}</b><span className="ui-meta">{hopLine(h)}</span></span>
                      <span className="cs-chain__s">{r?.reading ? <><Icon name={READ_ICON[r.reading]} size={14} /> {fixed && failed === h.id ? 'On its standby' : READING_WORD[r.reading]}</> : 'No loss on record'}</span>
                    </li>); })}
                </ol>
                <figcaption className="cs-fig__cap" data-testid="signal-caption">{!inc ? 'The six records the picture passes through, from the camera to the programme.' : fixed ? `${isoHop ? hopName(isoHop) : 'The failed item'} is on its standby. Every point shows the picture passing (simulated).` : isoHop ? `The loss starts at ${hopName(isoHop).toLowerCase()} (${iso.by === 'INFERRED' ? 'inferred' : 'simulated indication'}). Before it the picture passes; after it nothing arrives.` : 'No single point is isolated.'}</figcaption>
              </figure>}
        </aside>

        <div className="cs-main">
          {step === 'alert' && <div data-testid="signal-alert">
            {head('alert')}
            {!inc ? <>
              <p>No camera feed is lost at this point of the event. The broadcast programme chain reads {SYS_WORD[sys.broadcast].toLowerCase()}.</p>
              {mayWork ? <p className="cs-acts"><button type="button" className="ui-btn ui-btn--primary" data-testid="signal-simulate" onClick={() => run((nx) => simulateLoss(nx, g, actor))}>Simulate the loss of camera {CAMERA}</button></p>
                : <p className="ui-meta">The {config.label} checks a fix. The scenario is started by the broadcast and engineering roles, here or on the game-day page.</p>}
            </> : <>
              <div className="cs-alert" data-severity={FAULTS[FAULT].severity} data-step={inc.step}>
                <p className="cs-alert__t"><Icon name="alert" size={20} /> <span><b>{inc.id}</b> {FAULTS[FAULT].title}</span></p>
                <Rows label="The alert" testId="signal-alert-facts" rows={[
                  { k: 'Noticed at', v: chain.seenAt ? `${chain.seenAt.asset.label} in ${chain.seenAt.place.name}` : 'The gallery' },
                  { k: 'Opened', v: `${PHASE[inc.openedIn].label} (${tMinus(PHASE[inc.openedIn].at)}), by the simulation` },
                  { k: 'Severity', v: words(FAULTS[FAULT].severity) },
                  { k: 'What it holds', v: <span data-testid="signal-holds" data-held={heldByThis.length > 0}>{reached(inc, 'FIXED') ? 'Nothing now: the feed is restored.' : heldByThis.length && next ? `${PHASE[next].label} cannot start until this is fixed.` : 'Nothing at this point of the day. A critical fault holds kick-off and the second half.'}</span> },
                  { k: 'Whose it is', v: `${people.find((p) => p.owner)?.teamWord || 'Broadcast'}: ${people.find((p) => p.owner)?.onPost ?? 0} on post in this phase` },
                  { k: 'Guests are told', v: FAULTS[FAULT].publicNote || 'Nothing. A lost camera does not reach them.' },
                ]} />
              </div>
              {inc.step === 'OPEN' ? (mayWork
                ? <p className="cs-acts"><button type="button" className="ui-btn ui-btn--primary" data-testid="signal-ack" onClick={() => move('ACKNOWLEDGED')}>Acknowledge the alert</button></p>
                : <p className="ui-meta" data-testid="signal-ack-not">Acknowledging is for the broadcast and engineering roles. The {config.label} checks the fix once it is made.</p>)
                : <p data-testid="signal-acked">Acknowledged by the {inc.by.ACKNOWLEDGED}.</p>}
            </>}
            {refusal}
          </div>}

          {step === 'where' && <div data-testid="signal-where" data-zone={zone.id}>
            {head('where')}
            <p>Camera {CAMERA} stands on the {zone.name.toLowerCase()}. The plan shows the platform and the bowl it looks over.</p>
            <Rows label={`Facts about ${zone.name}`} rows={[
              { k: 'Zone', v: zone.name }, { k: 'What it is', v: words(zone.type) }, { k: 'Level', v: chain.hops[0]?.level?.name || 'Not recorded' },
              { k: 'Who may enter', v: ACCESS_WORDS[zone.access] }, { k: 'Step-free', v: zone.stepFree ? 'Yes' : 'No' }, ...(zone.note ? [{ k: 'About', v: zone.note }] : []), { k: 'Record', v: <code>{zone.id}</code> },
            ]} />
            {sees(zone.id) && opens(estateHref('stadium', zone.id, config.id)) && <p className="cs-acts"><a className="ui-btn ui-btn--primary" href={estateHref('stadium', zone.id, config.id)} data-testid="signal-lite">Open this zone in Lite</a></p>}
            <h3 className="cs-h3">From there, the picture passes through</h3>
            <ol className="cs-places" data-testid="signal-places">{placesOf(chain).map((p) => (
              <li key={p.id}>{sees(p.id) ? <><a href={estateHref('stadium', p.id, config.id)} data-node={p.id}>{p.name}</a> <span className="ui-meta">{chain.hops.find((h) => h.place.id === p.id)?.level?.name || ''} · {ACCESS_WORDS[p.access].toLowerCase()}</span></> : <span className="ui-meta">A room the {config.label} is not shown</span>}</li>))}</ol>
          </div>}

          {step === 'chain' && <div data-testid="signal-chain" data-hops={chain.hops.length} data-missing={chain.missing.length}>
            {head('chain')}
            <p>Six equipment records of the estate, in the order the picture travels. {inc ? 'Each shows what is seen there now.' : 'No loss is on record, so nothing is marked.'}</p>
            <ol className="cs-hops">{chain.hops.map((h) => { const r = inc ? readingOf(now, h.id) : null; const seen = sees(h.place.id); return (
              <li key={h.id} data-hop={h.id} data-reading={r?.reading || 'none'} data-mark={!!inc && !fixed && iso.hop === h.id || undefined}>
                <p className="cs-hops__t"><span className="cs-chain__n" aria-hidden="true">{h.n}</span><b>{hopName(h)}</b>{r?.reading && <span className="cs-read" data-reading={r.reading}><Icon name={READ_ICON[r.reading]} size={14} /> {fixed && failed === h.id ? 'On its standby' : READING_WORD[r.reading]}</span>}</p>
                <p>{h.does}</p>
                <p className="ui-meta">{seen ? <>{h.asset.label}{h.asset.qty > 1 ? ` × ${h.asset.qty}` : ''} · {h.asset.cls} · <code>{h.asset.id}</code> · {hopLine(h)}</> : hopLine(h)}</p>
                <p className="ui-meta">Hands on by: {h.link.toLowerCase()}. {h.backup ? (seen ? <>Standby on record: {h.backup.label.toLowerCase()} (<code>{h.backup.id}</code>).</> : 'A standby is on record.') : 'No separate standby on record.'}</p>
              </li>); })}</ol>
            {chain.seenAt && <p className="ui-meta" data-testid="signal-seen-at">The loss is noticed at the {chain.seenAt.asset.label.toLowerCase()} (<code>{chain.seenAt.asset.id}</code>) in {chain.seenAt.place.name}: the camera {CAMERA} tile shows no picture.</p>}
            {inc && <p data-testid="signal-isolated" data-hop={iso.hop || ''} data-by={iso.by || ''}><b>{fixed ? 'Where the loss was: ' : 'Where the loss starts: '}{isoHop ? hopName(isoHop) : 'not isolated'}.</b> {iso.why} <button type="button" className="cs-link" onClick={() => go('observe')}>See what each point shows</button></p>}
          </div>}

          {step === 'history' && <div data-testid="signal-history" data-prior={hist.prior.length}>
            {head('history')}
            <ul className="cs-sum" data-testid="signal-history-summary">{hist.summary.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3 className="cs-h3">Earlier incidents on this chain</h3>
            <ol className="cs-prior">{hist.prior.map((p) => { const h = hopOf(chain, p.hop)!; return (
              <li key={p.id} data-prior={p.id} data-hop={p.hop} data-same={inc && !fixed && iso.hop === p.hop || undefined}>
                <p><b>{p.title}</b> <span className="ui-tag ui-tone--warn">SYNTHETIC</span></p>
                <p className="ui-meta">{p.id} · {p.day} · on {h.asset.label.toLowerCase()}{sees(h.place.id) ? <> (<code>{p.asset}</code>)</> : null}</p>
                <p>Cause on record: {p.cause.toLowerCase()}. {p.fix}. Checked by the {p.checkedBy}.</p>
              </li>); })}</ol>
            {hist.thisEvent.length > 0 && <><h3 className="cs-h3">Other broadcast incidents in this event</h3><ul className="cs-sum">{hist.thisEvent.map((x) => <li key={x.id}>{x.id} {x.title} · opened in {x.phase.toLowerCase()} · {x.step.toLowerCase()}</li>)}</ul></>}
            <h3 className="cs-h3">Who is responsible</h3>
            <ul className="cs-people" data-testid="signal-people">{people.map((t) => (
              <li key={t.team} data-team={t.team} data-owner={t.owner || undefined}><b>{t.teamWord}</b> <span className="ui-meta">{t.onPost} on post in {PHASE[g.phase].label.toLowerCase()}{t.owner ? ' · owns this incident' : ''}</span>
                <ul>{t.posts.map((p) => <li key={p.post}>{p.post}: {p.hops.map((id) => hopName(hopOf(chain, id)!).toLowerCase()).join(', ')}</li>)}</ul></li>))}
              <li data-team="check"><b>Checks a fix</b> <span className="ui-meta">someone other than the role that made it</span><ul><li>{SIGNAL_VERIFY.map((id) => configById(id)!.label).join(', ')}</li></ul></li>
            </ul>
            <p className="ui-meta">Positions, not people: the demonstration invents no staff. Numbers on post are the event’s simulated staffing for this phase.</p>
            {opens(estateHref('stadium', null, config.id, 'camera')) && <p className="cs-acts"><a className="ui-btn" href={estateHref('stadium', null, config.id, 'camera')} data-testid="signal-search">Search the estate for “camera”</a></p>}
          </div>}

          {step === 'observe' && <div data-testid="signal-observe" data-count={found.length}>
            {head('observe')}
            {!inc ? <p>No loss is on record, so there is nothing to observe. The alert step starts the scenario.</p> : <>
              <p>Observations in the manner of Field Intelligence, point by point, as they stood when the feed was lost. Each says how it is known.</p>
              <ol className="cs-obs">{chain.hops.map((h) => (
                <li key={h.id} data-hop={h.id} data-mark={iso.hop === h.id || undefined}>
                  <p className="cs-hops__t"><span className="cs-chain__n" aria-hidden="true">{h.n}</span><b>{hopName(h)}</b></p>
                  <ul>{found.filter((o) => o.hop === h.id).map((o, i) => (!sees(h.place.id) && o.provenance === 'KNOWN' ? null :
                    <li key={i} data-prov={o.provenance} data-reading={o.reading || undefined}><Prov p={o.provenance} /> <span>{o.text}</span> <span className="ui-meta">Source: {o.source}.</span></li>))}</ul>
                </li>))}</ol>
              <div data-testid="signal-conclusion" data-hop={iso.hop || ''} data-by={iso.by || ''}><Notice tone={iso.hop ? 'warn' : 'info'}><b>{isoHop ? `These isolate ${hopName(isoHop).toLowerCase()}.` : 'These isolate nothing.'}</b> {iso.why}</Notice></div>
              <dl className="cs-legend">{(['SIMULATED', 'INFERRED', 'KNOWN'] as const).map((p) => <div key={p}><dt><Prov p={p} /></dt><dd>{PROVENANCE_HELP[p]}</dd></div>)}</dl>
              {fixed && <p className="ui-meta">Since the fix was recorded, every point shows the picture passing (simulated). The check step lists what to cite.</p>}
            </>}
          </div>}

          {step === 'procedure' && <div data-testid="signal-procedure" data-procedure={inc ? proc.id : ''} data-hop={inc ? proc.hop || '' : ''}>
            {head('procedure')}
            {!inc ? <p>No loss is on record, so no procedure is chosen. The alert step starts the scenario.</p> : <>
              <p className="cs-proc__t" data-testid="signal-procedure-title">{proc.title}</p>
              <p className="ui-meta">{isoHop ? `Chosen because the observations isolate ${hopName(isoHop).toLowerCase()}.` : 'Chosen because the observations isolate nothing.'} A different failed point would give a different procedure.</p>
              <ol className="cs-steps">{proc.steps.map((s) => { const at = s.at === 'seen' ? chain.seenAt?.asset : hopOf(chain, s.at)?.asset; return <li key={s.id} data-step-id={s.id}><span>{s.do}</span>{at && <span className="ui-meta">At: {at.label.toLowerCase()}</span>}</li>; })}</ol>
              <Notice tone="warn"><b>What nobody does during the event</b><ul className="cs-why">{proc.never.map((x) => <li key={x}>{x}</li>)}</ul></Notice>
              <p className="ui-meta">Afterwards: {proc.after}</p>
              <div className="cs-svc" data-testid="signal-service" data-servicehands="not-raised">
                <h3 className="cs-h3">The service record</h3>
                <p>This incident’s service steps are kept on the game-day record as <b>{inc.id}</b>: {(['ACKNOWLEDGED', 'DISPATCHED', 'FIXED', 'VERIFIED'] as const).map((s) => `${s.toLowerCase()}${inc.by[s] ? ` by the ${inc.by[s]}` : ' not yet'}`).join('; ')}.</p>
                <p className="ui-meta">No ServiceHands job is raised. A ServiceHands job in this demonstration is a record of the campus estate: a campus room, campus technicians and its own steps. A stadium event incident does not fit that record without bending it, so no job number is invented here. Every step of {inc.id} is written to the shared ledger instead.</p>
              </div>
              {inc.step === 'ACKNOWLEDGED' && mayWork && <p className="cs-acts"><button type="button" className="ui-btn ui-btn--primary" data-testid="signal-dispatch" onClick={() => move('DISPATCHED', `procedure: ${proc.title}`)}>Start this procedure</button></p>}
              {inc.step === 'OPEN' && <p data-testid="signal-dispatch-wait">The alert is not acknowledged yet. <button type="button" className="cs-link" onClick={() => go('alert')}>Go to the alert</button></p>}
              {inc.step === 'ACKNOWLEDGED' && !mayWork && <p className="ui-meta">Starting the procedure is for the broadcast and engineering roles.</p>}
              {reached(inc, 'DISPATCHED') && <p data-testid="signal-dispatched">Started by the {inc.by.DISPATCHED}.</p>}
            </>}
            {refusal}
          </div>}

          {step === 'outcome' && <div data-testid="signal-outcome">
            {head('outcome')}
            {!inc ? <p>No loss is on record, so there is no outcome to record.</p>
              : fixed ? <div className="cs-done" data-testid="signal-fixed"><p><b>Recorded as fixed by the {inc.by.FIXED}.</b></p><p>{cap(inc.notes?.FIXED || proc.restores || '')}.</p><p className="ui-meta">The broadcast programme chain now reads “{SYS_WORD[sys.broadcast].toLowerCase()}”. A fix counts once someone else has checked it.</p></div>
              : inc.step !== 'DISPATCHED' ? <p data-testid="signal-outcome-wait">The procedure has not been started yet. <button type="button" className="cs-link" onClick={() => go(inc.step === 'OPEN' ? 'alert' : 'procedure')}>{inc.step === 'OPEN' ? 'Go to the alert' : 'Go to the procedure'}</button></p>
              : !mayWork ? <p className="ui-meta">Recording the outcome is for the broadcast and engineering roles. The {config.label} checks the fix once it is recorded.</p>
              : <>
                <p>{proc.title}. Tick each step as it is done.</p>
                <ul className="cs-ticks" data-testid="signal-ticks">{proc.steps.map((s) => <li key={s.id}><label className="cs-tick"><input type="checkbox" checked={draft.done.includes(s.id)} onChange={() => toggle('done', s.id)} data-tick={s.id} /><span>{s.do}</span></label></li>)}</ul>
                <fieldset className="cs-field"><legend>Is the picture back?</legend>
                  <label className="cs-tick"><input type="radio" name="cs-restored" checked={draft.restored === 'yes'} onChange={() => setDraft((d) => ({ ...d, restored: 'yes' }))} data-testid="signal-restored-yes" /><span>Yes: the camera {CAMERA} tile shows a picture</span></label>
                  <label className="cs-tick"><input type="radio" name="cs-restored" checked={draft.restored === 'no'} onChange={() => setDraft((d) => ({ ...d, restored: 'no' }))} data-testid="signal-restored-no" /><span>No: it is still dark</span></label>
                </fieldset>
                <label className="cs-field" htmlFor="cs-note">A note for the next person {draft.restored === 'no' ? '(needed)' : '(optional)'}
                  <textarea id="cs-note" rows={2} maxLength={300} value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} data-testid="signal-note" /></label>
                <p className="cs-acts"><button type="button" className="ui-btn ui-btn--primary" data-testid="signal-record" onClick={recordOutcome}>Record the outcome</button></p>
                <p className="ui-meta">Recording “yes” moves {inc.id} to fixed and releases what it held. Recording “no” leaves it dispatched and writes the attempt to the ledger.</p>
              </>}
            {refusal}
          </div>}

          {step === 'verify' && <div data-testid="signal-verify" data-same-role={sameRole || undefined}>
            {head('verify')}
            {!inc ? <p>No loss is on record, so there is nothing to check.</p>
              : inc.step === 'VERIFIED' ? <div className="cs-done" data-testid="signal-verified"><p><b>Checked by the {inc.by.VERIFIED}.</b> Fixed by the {inc.by.FIXED}.</p><p>{inc.notes?.VERIFIED ? `${cap(inc.notes.VERIFIED)}.` : 'No evidence was named.'}</p></div>
              : !fixed ? <p data-testid="signal-verify-wait">There is nothing to check yet: {inc.id} is {inc.step.toLowerCase()}. A check follows a recorded fix. <button type="button" className="cs-link" onClick={() => go('outcome')}>Go to the outcome</button></p>
              : <>
                <p>Fixed by the <b>{fixer}</b>: {inc.notes?.FIXED || proc.restores}.</p>
                {sameRole ? <>
                  <div data-testid="signal-same-role"><Notice tone="info">You made this fix as the {config.label}, so the check is someone else’s. Open this step as another venue role:</Notice></div>
                  <ul className="cs-roles" data-testid="signal-verifiers">{others.map((c) => <li key={c.id}><a className="ui-btn" href={signalHref(c.id, 'verify')} data-as={c.id}>Check it as the {c.label}</a></li>)}</ul>
                  <p className="cs-acts"><button type="button" className="ui-btn ui-btn--quiet" data-testid="signal-verify-self" onClick={verify}>Try to check it yourself</button></p>
                </> : mayVerify ? <>
                  <h3 className="cs-h3">What the points show now</h3>
                  <ul className="cs-now" data-testid="signal-now">{chain.hops.map((h) => { const o = readingOf(now, h.id); return o ? <li key={h.id} data-hop={h.id} data-reading={o.reading || undefined}><Prov p={o.provenance} /> <b>{hopName(h)}</b>: {o.text}</li> : null; })}</ul>
                  <fieldset className="cs-field"><legend>The evidence you are citing</legend>
                    <ul className="cs-ticks" data-testid="signal-evidence">{evidence.map((e) => <li key={e.id}><label className="cs-tick"><input type="checkbox" checked={draft.evidence.includes(e.id)} onChange={() => toggle('evidence', e.id)} data-evidence={e.id} /><span>{e.label}{e.required ? ' (needed)' : ''} <span className="ui-meta">{sees(chain.hops.find((h) => h.asset.id === e.record || h.backup?.id === e.record)?.place.id || chain.seenAt?.place.id || '') ? `Record ${e.record}` : ''}</span></span></label></li>)}</ul>
                  </fieldset>
                  <p className="cs-acts"><button type="button" className="ui-btn ui-btn--primary" data-testid="signal-verify-do" onClick={verify}>Record the check</button></p>
                  <p className="ui-meta">The indications are simulated. In a venue, the person checking looks at the wall themselves; a record is not a look.</p>
                </> : null}
              </>}
            {refusal}
          </div>}

          {step === 'report' && <div data-testid="signal-report" data-system={sys.broadcast}>
            {head('report')}
            <h3 className="cs-h3">Operations: the game-day record</h3>
            <Rows label="What the game-day page shows" testId="signal-report-facts" rows={[
              { k: SYSTEM_LABEL.broadcast, v: <span data-testid="signal-system" data-state={sys.broadcast}>{SYS_WORD[sys.broadcast]}</span> },
              { k: 'Incident', v: inc ? `${inc.id}: ${STATE_WORD[inc.step].toLowerCase()}` : 'None on record' },
              { k: 'Next phase', v: <span data-testid="signal-held" data-held={held.length > 0 && !!next}>{!next ? 'The event is over' : held.length ? `${PHASE[next].label} is held: ${held.join('; ')}` : `${PHASE[next].label} is not held`}</span> },
            ]} />
            <p className="ui-meta">{rep.title}. The lines of the readiness report this incident changes:</p>
            <ul className="cs-sum" data-testid="signal-report-lines">{rep.lines.filter((l) => l.startsWith(SYSTEM_LABEL.broadcast) || (inc && l.startsWith(inc.id)) || l.startsWith('Next phase held')).map((l) => <li key={l}>{l}</li>)}</ul>
            <h3 className="cs-h3">Assurance: who did what, and on what evidence</h3>
            {inc ? <ol className="cs-trail" data-testid="signal-trail">{(['OPEN', 'ACKNOWLEDGED', 'DISPATCHED', 'FIXED', 'VERIFIED'] as const).filter((s) => inc.by[s]).map((s) => <li key={s} data-step={s}><b>{words(s.toLowerCase())}</b> by {s === 'OPEN' ? 'the simulation' : `the ${inc.by[s]}`}{inc.notes?.[s] ? <span className="ui-meta"> {cap(inc.notes[s]!)}.</span> : null}</li>)}</ol> : <p>No incident is on record.</p>}
            <h3 className="cs-h3">The shared ledger</h3>
            {lines.length ? <ol className="cs-ledger" data-testid="signal-ledger" data-lines={lines.length}>{lines.map((e, i) => <li key={i} data-outcome={e.outcome} data-type={e.type}><span className="ui-meta">{when(e.at)} UTC · {e.by}</span> <code>{e.type}</code> <span className={`ui-tag ui-tone--${e.outcome === 'DENIED' ? 'bad' : 'ok'}`}>{e.outcome === 'DENIED' ? 'Refused' : 'Recorded'}</span> <span>{e.detail}</span></li>)}</ol>
              : <p data-testid="signal-ledger-none">No line for this incident is in the ledger yet. A line is written for each step taken on this page, and for each refusal.</p>}
            <p className="cs-acts">{opens('#/v25/ledger') && <a className="ui-btn" href="#/v25/ledger" data-testid="signal-ledger-open">Open the ledger</a>}<a className="ui-btn" href={gameday}>Open the game-day page</a></p>
          </div>}

          {step === 'return' && <div data-testid="signal-return" data-verified={inc?.step === 'VERIFIED' || undefined}>
            {head('return')}
            {!inc ? <p>No incident was worked. The event is as it was.</p>
              : inc.step === 'VERIFIED' ? <p><b>{inc.id} is closed.</b> The broadcast programme chain reads “{SYS_WORD[sys.broadcast].toLowerCase()}”{next ? `, and ${PHASE[next].label.toLowerCase()} is ${held.length ? 'held by something else' : 'not held'}` : ''}. The game-day page reads the same record, so it shows the same.</p>
              : <p data-testid="signal-return-open">{inc.id} is not finished: it is {STATE_WORD[inc.step].toLowerCase()}. The game-day page shows it as it stands, and it can be picked up again from there.</p>}
            <p className="cs-acts"><a className="ui-btn ui-btn--primary" href={gameday} data-testid="signal-return-event">Return to the event</a></p>
            <h3 className="cs-h3">The same event from a seat</h3>
            <p>What a guest was doing meanwhile, on the same fictional stadium. These open as the Fan.</p>
            <ul className="cs-roles">{(['attend-game', 'find-amenities'] as const).map((slug) => { const j = journeyAt('stadium', slug); return j ? <li key={slug}><a className="ui-btn" href={journeyHref(j, 'stadium.fan')} data-journey={slug}>{slug === 'attend-game' ? 'A seat and a step-free way to it' : 'Amenities near the seat'}</a></li> : null; })}</ul>
          </div>}

          <div className="cs-nav">
            {prev && <button type="button" className="ui-btn ui-btn--quiet" onClick={() => go(prev)} data-testid="signal-back">Back</button>}
            {after && <button type="button" className="ui-btn ui-btn--primary" onClick={() => go(after)} data-testid="signal-next">Next: {TITLE[after][0]}</button>}
          </div>
        </div>
      </div>
      <p className="ui-meta" data-testid="signal-honesty">A simulated event at a fictional stadium. What each point shows is simulated or inferred; nothing is monitored and no device is contacted. The event is kept in this browser only.</p>
    </div>
  );
}
