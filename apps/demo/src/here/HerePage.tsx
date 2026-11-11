/**
 * #/here and #/here/<room> — In this room (founder, 10 Nov: the signature demonstration). One page for someone standing in a room they
 * do not know: say which room, see what is in it on its plan or in 3D, read what has happened there, say what is wrong, be walked
 * through what to try, and write down how it ended. The picture stays beside every step and rings the equipment that step is about.
 *
 * It is one connected experience because it is one set of records: the equipment is the room's record (Lite draws the same
 * positions), the history is the ServiceHands workspace and the room's own events, and the outcome is written back to both — a job in
 * ServiceHands with the steps already tried, or a line in the room's history when the person fixed it themselves.
 *
 * What a role sees follows V2.5.3's tables (registry: here): history needs the history field, position and asset codes need the
 * technical field, reporting needs issue.report. A role without one of these is not shown that part at all (D44).
 * The step lives in the address (?step=) so a step can be linked to; moving between steps does not reload the page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Button, Notice, Tag, Field, Icon, Segmented } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { buildingByKey, fullName, roomById, roomHref, shortName } from '../campus/canon.js';
import { allRecords, roomRecord, LAYERS, type Layer, type Position } from '../campus/design.js';
import { Stage, PlanView, IsoView } from '../spatial/Spatial.js';
import { qrMatrix, qrPath } from '../lite/qr.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import * as S from '../workspace/store.js';
import { SYMPTOMS, GROUP_WORD, WHAT_IT_DOES, RESULT_WORD, symptomOf, findRooms, labelFor, kindsOf, many, plainEquipment, historyOf, repeats, suspectsOf, stepsFor, jobWords, stageWord, worthAVisit, type SymptomId, type Visit, type Kind } from './model.js';
import { loadVisits, record, outcomeProblems, type Outcome } from './store.js';
import { WhoKnows } from '../connect/ContactBar.js';

type StepId = 'look' | 'history' | 'wrong' | 'try' | 'record';
type Result = 'fixed' | 'same' | 'skipped';
const STEP_TITLE: Record<StepId, [string, string]> = { look: ['Look around', 'What is in this room'], history: ['History', 'What has happened here'], wrong: ['What’s wrong', 'What is wrong'], try: ['Try this', 'Try this'], record: ['Write it down', 'Write it down'] };
const ALL_LAYERS = new Set<Layer>(LAYERS.map((l) => l.key));
const DRAFT_KEY = 'empathia.demo.here.draft.v1'; const RECENT_KEY = 'empathia.demo.here.recent.v1';
const ICON_OF = (k: Kind): 'display' | 'camera' | 'mic' | 'speaker' | 'control' | 'network' | 'power' => (k.layer === 'display' ? 'display' : k.layer === 'video' ? 'camera' : k.layer === 'audio' ? (['speaker', 'amp'].includes(k.cat) ? 'speaker' : 'mic') : k.layer === 'network' ? 'network' : k.layer === 'power' ? 'power' : 'control');
const day = (s: string) => (s ? s.slice(0, 10) : 'On record');
const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
interface Draft { roomId: string; step: StepId; symptom: SymptomId | null; note: string; results: Record<string, Result>; joinId: string | null }
const restore = (roomId: string): Draft | null => { try { const s = sessionStorage.getItem(DRAFT_KEY); const d = s ? (JSON.parse(s) as Draft) : null; return d && d.roomId === roomId && typeof d.results === 'object' ? d : null; } catch { return null; } };
const recentRooms = (): string[] => { try { const l = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[]; return Array.isArray(l) ? l.filter((x) => typeof x === 'string' && roomById(x)).slice(0, 4) : []; } catch { return []; } };

/** Step one, before a room is known: say which room. A name, a number, or the code on the door label. */
function Arrive({ role }: { role: RoleKey }) {
  const [q, setQ] = useState(''); const found = useMemo(() => findRooms(q), [q]);
  const worth = useMemo(() => worthAVisit(allRecords()), []); const recent = useMemo(() => recentRooms().map((id) => roomById(id)!), []);
  const card = (o: NonNullable<ReturnType<typeof roomById>>, why?: string) => (
    <li key={o.id}><a className="hr-room" href={`#/here/${o.id}`} data-room={o.id}><b>{shortName(o)}</b><span>{o.name}</span><span className="ui-meta">{buildingByKey(o.building)?.name} · floor {o.floor} · {plural(o.capacity, 'seat')}{why ? ` · ${why}` : ''}</span></a></li>);
  return (
    <section className="hr" data-native="" data-testid="here-page" data-step="arrive">
      <PageHero eyebrow="In this room" icon="place" product="lite" title="Which room are you in?" lede="Say where you are and this page becomes that room: what is in it, what has happened there, and what to try if something is not working." meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">You are the {ROLES[role].label}</span>]} />
      <div className="hr-arrive">
        <Field label="Room name, number, or the code on the door label" hint="For example “Atlas 4.218”, “boardroom”, or R-ATL-4-218.">{(id, by) => <input id={id} aria-describedby={by} type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} data-testid="here-find" />}</Field>
        <div aria-live="polite">
          {q.trim() && found.length > 0 && <ul className="hr-rooms" data-testid="here-found">{found.map((o) => card(o))}</ul>}
          {q.trim() && !found.length && <p className="ui-muted" data-testid="here-none">No room on this campus matches “{q.trim()}”. Try the number on the door, or part of the name.</p>}
        </div>
        {recent.length > 0 && <><h2 className="build__h">Rooms you opened here before</h2><ul className="hr-rooms" data-testid="here-recent">{recent.map((o) => card(o))}</ul></>}
        <h2 className="build__h">Rooms worth walking into first</h2>
        <ul className="hr-rooms" data-testid="here-worth">{worth.map((o, i) => card(o, i === 0 ? 'the reference room' : 'something to find'))}</ul>
        <p className="ui-meta">Every room has a door label. A phone that reads it opens this page for that room, so nobody has to type anything.</p>
      </div>
    </section>
  );
}

function DoorLabel({ roomId, name }: { roomId: string; name: string }) {
  const text = useMemo(() => labelFor(roomId, typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`), [roomId]); const q = useMemo(() => qrMatrix(text), [text]);
  return (
    <details className="hr-label" data-testid="here-label"><summary>This room’s door label</summary>
      {q ? <svg className="hr-qr" viewBox={`0 0 ${q.size + 8} ${q.size + 8}`} role="img" aria-label={`Door label for ${name}`} shapeRendering="crispEdges"><rect width={q.size + 8} height={q.size + 8} fill="#fff" /><path d={qrPath(q)} fill="#000" /></svg> : null}
      <p className="ui-meta">Point a phone’s camera at it and this page opens for {name}. The label holds only the address of this page: <code data-testid="here-label-text">{text}</code></p>
    </details>
  );
}

export default function HerePage({ role, params, query, sees, can }: PageProps) {
  const outline = roomById(params['room'] || '');
  if (!outline) return params['room'] ? (
    <section className="hr" data-native="" data-testid="here-page" data-step="unknown"><PageHero eyebrow="In this room" icon="place" product="lite" title="That label is not a room on this campus" lede="Nothing was guessed from it. Say which room you are in instead." actions={<a className="ui-btn ui-btn--primary" href="#/here">Choose the room</a>} /></section>) : <Arrive role={role} />;
  return <Room key={outline.id} id={outline.id} role={role} query={query} sees={sees} can={can} />;
}

function Room({ id, role, query, sees, can }: { id: string } & Pick<PageProps, 'role' | 'query' | 'sees' | 'can'>) {
  const r = useMemo(() => roomRecord(id)!, [id]); const o = r.outline; const B = buildingByKey(o.building); const { w, apply } = useWorkspace();
  const technical = sees('here.devices'); const showHistory = sees('here.history'); const showKnown = sees('here.known'); const mayReport = can('here.report');
  const life = stageWord(r.lifecycle); const hw = r.positions.filter((p) => !p.furniture);
  const STEPS: StepId[] = (['look', ...(showHistory ? ['history'] : []), ...(life.built && hw.length ? ['wrong', 'try', 'record'] : [])] as StepId[]);
  const initial = useMemo<Draft>(() => {
    const d = restore(id); const qs = query.get('step') as StepId | null; const sy = symptomOf(query.get('s'));
    const symptom = sy?.id || d?.symptom || null; const want = qs && STEPS.includes(qs) ? qs : d?.step && STEPS.includes(d.step) ? d.step : 'look';
    return { roomId: id, step: !symptom && (want === 'try' || want === 'record') ? 'wrong' : want, symptom, note: d?.note || '', results: (!sy || sy.id === d?.symptom) && d ? d.results : {}, joinId: d?.joinId || null };
  }, [id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [step, setStepRaw] = useState<StepId>(initial.step); const [symptom, setSymptom] = useState<SymptomId | null>(initial.symptom); const [note, setNote] = useState(initial.note);
  const [results, setResults] = useState<Record<string, Result>>(initial.results); const [joinId, setJoinId] = useState<string | null>(initial.joinId);
  const [view, setView] = useState<'plan' | '3d'>('plan'); const [angle, setAngle] = useState(0); const [sel, setSel] = useState<string | null>(null); const [focusKind, setFocusKind] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>(() => loadVisits()); const [done, setDone] = useState<Visit | null>(null); const [refused, setRefused] = useState<string[] | null>(null); const [said, setSaid] = useState('');
  const headRef = useRef<HTMLHeadingElement>(null); const railRef = useRef<HTMLOListElement>(null); const doneRef = useRef<HTMLHeadingElement>(null); const moved = useRef(false);
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };

  // remembered: the rooms opened here (for the next arrival) and where this visit has got to (a reload on a phone loses nothing)
  useEffect(() => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...recentRooms().filter((x) => x !== id)].slice(0, 4))); } catch { /* not kept */ } }, [id]);
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ roomId: id, step, symptom, note, results, joinId } satisfies Draft)); } catch { /* the visit lasts the page */ } }, [id, step, symptom, note, results, joinId]);
  // the step is kept in the address without a navigation, so the page is not reloaded and focus stays with the step
  useEffect(() => { try { history.replaceState(null, '', `#/here/${id}?step=${step}${symptom ? `&s=${symptom}` : ''}`); } catch { /* the address stays */ } }, [id, step, symptom]);
  // a link to another step of the same room (from search, from a tour) moves there
  useEffect(() => { const qs = query.get('step') as StepId | null; const sy = symptomOf(query.get('s')); if (sy && sy.id !== symptom) { setSymptom(sy.id); setResults({}); } if (qs && STEPS.includes(qs) && qs !== step) setStepRaw(!sy && !symptom && (qs === 'try' || qs === 'record') ? 'wrong' : qs); }, [query.toString()]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!moved.current) return; const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 900px)').matches;
    headRef.current?.focus({ preventScroll: true }); headRef.current?.scrollIntoView?.({ block: narrow ? 'start' : 'nearest' });
    railRef.current?.querySelector('[aria-current=step]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [step]);
  useEffect(() => { if (done) doneRef.current?.focus(); }, [done]);

  const sym = symptomOf(symptom); const sus = useMemo(() => (sym ? suspectsOf(r, sym, w) : null), [r, sym, w]);
  const steps = useMemo(() => (sym ? stepsFor(r, sym.id, technical ? 'technician' : 'person') : []), [r, sym, technical]);
  const at = steps.findIndex((s) => !results[s.id]); const fixed = steps.find((s) => results[s.id] === 'fixed') || null; const current = fixed ? null : at >= 0 ? steps[at]! : null;
  const hist = useMemo(() => historyOf(r, w, visits), [r, w, visits]); const kinds = useMemo(() => kindsOf(r), [r]);
  const go = (to: StepId) => {
    moved.current = true; setRefused(null);
    if ((to === 'try' || to === 'record') && !sym) { setSaid('Say what is wrong first.'); setStepRaw('wrong'); return; }
    setSaid(''); setSel(null); setStepRaw(to);
  };
  const choose = (s: SymptomId) => { setSymptom(s); setResults({}); setJoinId(null); setDone(null); setRefused(null); setSel(null); setSaid(''); };
  const answer = (stepId: string, res: Result) => { moved.current = true; const next = { ...results, [stepId]: res }; setResults(next); if (res === 'fixed' || steps.every((s) => next[s.id])) setStepRaw('record'); else headRef.current?.focus(); };
  const redo = (stepId: string) => { const i = steps.findIndex((s) => s.id === stepId); const keep: Record<string, Result> = {}; steps.slice(0, i).forEach((s) => { if (results[s.id]) keep[s.id] = results[s.id]!; }); setResults(keep); setDone(null); };

  // what the picture rings at this step, and what it says about it
  const ring: string[] = step === 'look' ? (focusKind ? kinds.find((k) => k.cat === focusKind)?.codes || [] : []) : step === 'try' ? current?.uses || [] : step === 'history' ? [] : sus?.codes || [];
  const marked = useMemo(() => new Set(ring), [ring.join()]);   // eslint-disable-line react-hooks/exhaustive-deps
  const links = (step === 'wrong' || step === 'record') && sus ? sus.links : [];
  const ringWord = step === 'look' ? 'the kind you chose' : step === 'try' ? 'what this step uses' : 'where this problem can sit';
  const caption = !ring.length ? (step === 'look' ? 'Press a kind of equipment, or anything in the picture, to see where it is.' : step === 'try' && current ? 'This step uses nothing in the picture.' : 'Nothing is ringed at this step.')
    : step === 'look' ? `Ringed: ${plural(ring.length, 'position')} of ${many(kinds.find((k) => k.cat === focusKind)?.label || '', ring.length, focusKind || '').toLowerCase()}.`
    : step === 'try' ? `Ringed: what this step uses (${plural(ring.length, 'position')}).` : `Ringed: ${sym?.says}${links.length ? `, joined as the room’s record connects them` : ''}.`;
  const picked = sel ? r.positions.find((p) => p.code === sel) || null : null;

  const tried = steps.filter((s) => results[s.id]).map((s) => ({ id: s.id, result: results[s.id]! }));
  const again = sym ? repeats(visits, id, sym.group) : 0;
  const send = (outcome: Outcome['outcome'], to: string | null = joinId) => {
    const input: Outcome = { roomId: id, symptom: symptom || 'other', note, tried, outcome, joinId: outcome === 'joined' ? to : null };
    const errs = outcomeProblems(input); if (errs.length) { setRefused(errs); return; }
    const out = apply((next) => record(next, role, input));
    if ('why' in out) { setRefused(out.why); return; }
    setRefused(null); setDone(out); setVisits(loadVisits());
  };
  const restart = () => { moved.current = true; setSymptom(null); setResults({}); setJoinId(null); setNote(''); setDone(null); setRefused(null); setStepRaw('look'); };
  const join = joinId ? S.incidentOf(w, joinId) : undefined;
  // a live job in this room whose words describe this very symptom, when the person has not already chosen one
  const sameLive = sus && showKnown ? sus.known.filter((i) => i.live && sus.same.includes(i.id)).map((i) => S.incidentOf(w, i.id)).find(Boolean) || null : null;
  const doneJob = done?.incidentId ? S.incidentOf(w, done.incidentId) : undefined;
  const mine = visits.filter((v) => v.roomId === id);
  const n = STEPS.indexOf(step); const prev = n > 0 ? STEPS[n - 1]! : null; const next = n < STEPS.length - 1 ? STEPS[n + 1]! : null;

  const deviceLine = (p: Position) => (<><b>{p.label}</b> — {WHAT_IT_DOES[p.cat] || p.catLabel}{technical ? <span className="ui-meta"> Position {p.code} · {p.asset ? `asset ${p.asset}` : 'no asset recorded'} · identity {p.identity.toLowerCase()} · {p.mount || 'mount not recorded'}, {p.z} m high</span> : null}</>);

  return (
    <section className="hr" data-native="" data-testid="here-page" data-step={step} data-room={id} data-symptom={symptom || ''}>
      <PageHero compact eyebrow="In this room" icon="place" product="lite" title={`${shortName(o)} — ${o.name}`}
        lede={`${r.archetypeName}, ${plural(o.capacity, 'seat')}, floor ${o.floor} of ${B?.name || o.building}.`}
        meta={[<Tag key="l" tone={life.tone}>{life.words}</Tag>, <Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">You are the {ROLES[role].label}</span>]}
        actions={<a className="ui-btn ui-btn--quiet" href="#/here" data-testid="here-change">Not this room</a>} />

      <nav aria-label="Steps in this room"><ol className="hr-rail" data-testid="here-rail" ref={railRef}>
        <li className="done"><a href="#/here"><span className="hr-rail__n" aria-hidden="true"><Icon name="check" size={14} /></span>Arrive<span className="ui-visually-hidden"> (done: {shortName(o)})</span></a></li>
        {STEPS.map((s, i) => { const isDone = i < n || (s === 'record' && !!done); return (
          <li key={s} className={s === step ? 'on' : isDone ? 'done' : ''}><button type="button" aria-current={s === step ? 'step' : undefined} onClick={() => go(s)} data-testid={`here-step-${s}`}><span className="hr-rail__n" aria-hidden="true">{isDone ? <Icon name="check" size={14} /> : i + 2}</span>{STEP_TITLE[s][0]}</button></li>); })}
      </ol></nav>
      <p className="ui-visually-hidden" role="status" aria-live="polite" data-testid="here-said">{said}</p>

      <div className="hr-cols">
        <aside className="hr-side" aria-label="The room">
          <Stage label={`${shortName(o)}: ${view === 'plan' ? 'plan' : 'three-dimensional view'}`} testId="here-stage" toolbar={<>
            <Segmented small label="View" value={view} onChange={setView} options={[{ value: 'plan', label: 'Plan' }, { value: '3d', label: '3D' }]} />
            {view === '3d' && <button type="button" className="ui-btn ui-btn--sm" onClick={() => setAngle((a) => (a + 1) % 4)}><Icon name="undo" size={16} /> Turn</button>}
            {opens('#/lite') && <a className="ui-btn ui-btn--sm ui-btn--quiet" href={`${roomHref(o)}?view=3d`} data-testid="here-lite">Open in Lite</a>}
          </>}>
            {view === 'plan'
              ? <PlanView w={o.dims[0]} l={o.dims[1]} h={o.dims[2]} positions={r.positions} connections={links} layers={ALL_LAYERS} selected={sel} onSelect={(c) => setSel(c === sel ? null : c)} showLinks={links.length > 0} linksOn marked={marked} markWord={ringWord} />
              : <IsoView w={o.dims[0]} l={o.dims[1]} h={o.dims[2]} positions={r.positions} connections={[]} layers={ALL_LAYERS} selected={sel} onSelect={(c) => setSel(c === sel ? null : c)} showLinks={false} angle={angle} marked={marked} markWord={ringWord} />}
          </Stage>
          <p className="hr-cap" data-testid="here-caption" data-ringed={ring.length} data-links={links.length} aria-live="polite">{caption}</p>
          {picked && <p className="hr-dev" data-testid="here-device" data-code={picked.code}>{deviceLine(picked)}</p>}
          <p className="ui-meta">The room’s size is {r.geometryProvenance === 'DECLARED' ? 'declared in its design record' : 'modelled from rooms of its kind, not measured'}. No device is contacted from this page.</p>
          <DoorLabel roomId={id} name={shortName(o)} />
        </aside>

        <div className="hr-main">
          {step === 'look' && <div data-testid="here-look">
            <h2 className="build__h" tabIndex={-1} ref={headRef}>{STEP_TITLE.look[1]}</h2>
            {!life.built && <Notice tone="info">This room is {life.words.toLowerCase()}. There is nothing to walk into yet: what follows is its design.</Notice>}
            <p className="hr-lede" data-testid="here-plain">{plainEquipment(r)}</p>
            {kinds.length > 0 && <ul className="hr-kinds" data-testid="here-kinds" data-devices={hw.length}>{kinds.map((k) => (
              <li key={k.cat}>
                <button type="button" className="hr-kind" aria-pressed={focusKind === k.cat} onClick={() => { setFocusKind(focusKind === k.cat ? null : k.cat); setSel(null); }} data-kind={k.cat} data-count={k.count}>
                  <span className="hr-kind__i" data-layer={k.layer} aria-hidden="true"><Icon name={ICON_OF(k)} size={20} /></span>
                  <span className="hr-kind__b"><b>{k.count} × {many(k.label, k.count, k.cat)}</b><span>{WHAT_IT_DOES[k.cat] || ''}</span></span>
                </button>
                {technical && focusKind === k.cat && <ul className="hr-units" data-testid="here-units">{r.positions.filter((p) => p.cat === k.cat).map((p) => <li key={p.code}><button type="button" className="hr-unit" aria-pressed={sel === p.code} onClick={() => setSel(sel === p.code ? null : p.code)}>{p.label}</button><span className="ui-meta">{p.code} · {p.asset || 'no asset'} · {p.identity.toLowerCase()}</span></li>)}</ul>}
              </li>))}</ul>}
            <p className="hr-links">{life.built && opens('#/control') && <a href={`#/control/${id}`} data-testid="here-control">Operate the room’s panel</a>}{opens('#/room') && <a href={`#/room/${id}`}>Open the room’s record</a>}{opens('#/search') && <a href={`#/search?focus=Room:${id}`}>Everything linked to this room in Search Party</a>}</p>
          </div>}

          {step === 'history' && showHistory && <div data-testid="here-history" data-rows={hist.rows.length} data-open={hist.open}>
            <h2 className="build__h" tabIndex={-1} ref={headRef}>{STEP_TITLE.history[1]}</h2>
            <ul className="hr-sum" data-testid="here-summary">{hist.summary.map((s) => <li key={s}>{s}</li>)}</ul>
            {hist.rows.length > 0 && <ol className="hr-hist">{hist.rows.slice(0, 14).map((x, i) => (
              <li key={`${x.id}:${i}`} data-kind={x.kind} data-live={x.live || undefined} data-id={x.id}>
                <span className="hr-hist__d">{day(x.at)}</span>
                <span className="hr-hist__b"><b>{x.title}</b>
                  {(x.kind === 'job' || x.kind === 'issue' || x.kind === 'visit') && <span><Tag tone={x.tone}>{x.kind === 'job' ? jobWords(x.state)[0] : x.kind === 'visit' ? 'Fixed in the room' : x.live ? 'Open' : 'Closed'}</Tag></span>}
                  <span className="ui-muted">{x.kind === 'job' ? `ServiceHands job${/came back after/.test(x.detail) ? x.detail.slice(x.detail.indexOf(' · came back')) : ''}` : x.detail}{x.kind === 'job' || x.kind === 'issue' ? ` · ${x.id}` : ''}</span></span>
              </li>))}</ol>}
            {hist.rows.length > 14 && <p className="ui-meta">{hist.rows.length - 14} older entries are in the room’s record.</p>}
            <p className="hr-links">{opens('#/search') && <a href={`#/search?focus=Room:${id}`} data-testid="here-search">Search everything linked to this room</a>}{opens('#/room') && <a href={`#/room/${id}?tab=history`}>The room’s full history</a>}</p>
          </div>}

          {step === 'wrong' && <div data-testid="here-wrong">
            <h2 className="build__h" tabIndex={-1} ref={headRef}>{STEP_TITLE.wrong[1]}</h2>
            <p className="ui-muted">Choose what you notice. The picture then shows where in this room that can come from.</p>
            <div className="hr-syms" role="radiogroup" aria-label="What you notice">{SYMPTOMS.map((s) => (
              <label key={s.id} className={`hr-sym${symptom === s.id ? ' on' : ''}`} data-testid={`here-sym-${s.id}`}>
                <input type="radio" name="hr-sym" value={s.id} checked={symptom === s.id} onChange={() => choose(s.id)} />
                <Icon name={s.icon} size={20} /><span><b>{s.label}</b><span className="ui-meta">{GROUP_WORD[s.group]}</span></span>
              </label>))}</div>
            {sym && sus && sym.id !== 'other' && <div className="hr-points" data-testid="here-points" data-stages={sus.stages.length} data-positions={sus.positions.length}>
              <h3 className="hr-h">In this room, that can come from</h3>
              {sus.stages.length ? <ol className="hr-chain">{sus.stages.map((g) => <li key={g.label}><b>{g.label}</b><span className="ui-meta">{technical ? g.positions.map((p) => p.code).join(', ') : plural(g.positions.length, 'unit')}</span></li>)}</ol>
                : <p className="ui-muted">This room has none of the equipment this usually comes from. Describe what you see, and report it.</p>}
            </div>}
            {sym && showKnown && sus && sus.known.length > 0 && <div className="hr-known" data-testid="here-known" data-count={sus.known.length}>
              <h3 className="hr-h">Already reported in this room</h3>
              <ul>{sus.known.map((i) => { const live = i.live; return (
                <li key={i.id} data-id={i.id} data-same={sus.same.includes(i.id) || undefined}>
                  <span><b>{i.title.replace(/ \([a-z_]+:[A-Z0-9-]+\)$/, '')}</b><span className="ui-muted"> {live ? `${jobWords(i.state)[0]}${i.openedAt ? `, since ${day(i.openedAt)}` : ''}` : 'On the room’s record, not yet a job'}{showHistory ? ` · ${i.id}` : ''}</span></span>
                  {live && <button type="button" className="ui-btn ui-btn--sm" aria-pressed={joinId === i.id} onClick={() => setJoinId(joinId === i.id ? null : i.id)} data-testid="here-join">{joinId === i.id ? 'This is the one' : 'This is what I see'}</button>}
                </li>); })}</ul>
              <p className="ui-meta">If one of these is what you see, say so and nothing new is raised: what you tried is added to it.</p>
            </div>}
            {sym && <Field label={sym.id === 'other' ? 'What do you notice?' : 'Anything else you notice? (optional)'} hint="Which seats, when it started, what you were doing.">{(fid, by) => <textarea id={fid} aria-describedby={by} rows={2} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} data-testid="here-note" />}</Field>}
          </div>}

          {step === 'try' && sym && <div data-testid="here-try" data-steps={steps.length} data-at={at}>
            <h2 className="build__h" tabIndex={-1} ref={headRef}>{current ? `Try this: step ${at + 1} of ${steps.length}` : fixed ? 'That fixed it' : steps.length ? 'Nothing here fixed it' : 'There is nothing to try from the room'}</h2>
            <p className="ui-muted">{sym.label}. {steps.length ? 'One thing at a time; say what happened after each.' : 'This kind of problem is not one to work on from the room. Write it down so the right person comes.'}</p>
            {steps.filter((s) => results[s.id]).length > 0 && <ol className="hr-tried" data-testid="here-tried">{steps.filter((s) => results[s.id]).map((s) => (
              <li key={s.id} data-result={results[s.id]}><span>{s.do}</span><Tag tone={results[s.id] === 'fixed' ? 'ok' : 'muted'}>{RESULT_WORD[results[s.id]!]}</Tag><button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => redo(s.id)}>Do it again</button></li>))}</ol>}
            {current && <div className="hr-step" data-testid="here-current" data-step-id={current.id} data-tier={current.tier}>
              {current.tier === 'technician' && <Tag tone="info">For a technician</Tag>}
              <p className="hr-step__do">{current.do}</p>
              <p className="hr-step__look"><b>You should see:</b> {current.look}</p>
              {current.caution && <Notice tone="warn">{current.caution}</Notice>}
              {current.link && opens(current.link.href) && <p><a href={current.link.href}>{current.link.label}</a></p>}
              <div className="hr-step__a">
                <Button kind="primary" onClick={() => answer(current.id, 'fixed')} testId="here-fixed">That fixed it</Button>
                <Button onClick={() => answer(current.id, 'same')} testId="here-same">No change</Button>
                <Button kind="quiet" onClick={() => answer(current.id, 'skipped')} testId="here-skip">I can’t do this one</Button>
              </div>
            </div>}
            {!current && <p>{fixed ? 'Good. Write it down so the next person knows what worked.' : 'Write it down so someone comes. They will see what you have already tried.'}</p>}
          </div>}

          {step === 'record' && sym && <div data-testid="here-record">
            <h2 className="build__h" tabIndex={-1} ref={headRef}>{STEP_TITLE.record[1]}</h2>
            {!done && <>
              <dl className="hr-rec" data-testid="here-summary-rec">
                <div><dt>Room</dt><dd>{fullName(o)}</dd></div>
                <div><dt>What is wrong</dt><dd>{sym.label}{note.trim() ? ` — ${note.trim()}` : ''}</dd></div>
                <div><dt>Tried in the room</dt><dd>{tried.length ? <ol>{steps.filter((s) => results[s.id]).map((s) => <li key={s.id}>{s.do} <b>{RESULT_WORD[results[s.id]!]}.</b></li>)}</ol> : 'Nothing yet.'}</dd></div>
                {sus && sus.stages.length > 0 && <div><dt>Points at</dt><dd>{sus.stages.map((g) => (technical ? g.positions.map((p) => `${p.label} (${p.code})`).join(', ') : g.label)).join(' → ')}</dd></div>}
              </dl>
              {refused && <div data-testid="here-refused"><Notice tone="bad"><ul>{refused.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
              {fixed ? <>
                {again >= 1 && <Notice tone="warn">This would be the {again + 1 === 2 ? 'second' : again + 1 === 3 ? 'third' : `${again + 1}th`} time in thirty days that a {GROUP_WORD[sym.group].toLowerCase()} problem was fixed in this room by the people in it. Something keeps causing it.</Notice>}
                <div className="hr-step__a"><Button kind="primary" onClick={() => send('fixed')} testId="here-save">Save to the room’s history</Button>{again >= 1 && mayReport && <Button onClick={() => send('reported')} testId="here-save-report">Report it, so the cause is found</Button>}</div>
                <p className="ui-meta">Nothing is sent to anyone. The room’s history will show that this happened and which step worked.</p>
              </> : join && mayReport ? <>
                <div className="hr-step__a"><Button kind="primary" onClick={() => send('joined')} testId="here-add">Add what I saw to {join.id}</Button><Button kind="quiet" onClick={() => setJoinId(null)}>It is a different problem</Button></div>
                <p className="ui-meta">“{join.title}” is already with ServiceHands ({jobWords(join.state)[0].toLowerCase()}). No second job is raised.</p>
              </> : mayReport && sameLive ? <div data-testid="here-same-known">
                <Notice tone="warn">This reads like “{sameLive.title}”, which is already with ServiceHands ({jobWords(sameLive.state)[0].toLowerCase()}). Adding what you saw to it helps more than a second job.</Notice>
                <div className="hr-step__a"><Button kind="primary" onClick={() => send('joined', sameLive.id)} testId="here-add">Add what I saw to {sameLive.id}</Button><Button onClick={() => send('reported')} testId="here-send">It is different: send a new report</Button></div>
              </div> : mayReport ? <>
                <div className="hr-step__a"><Button kind="primary" onClick={() => send('reported')} testId="here-send">Send to ServiceHands</Button></div>
                <p className="ui-meta">It becomes a job in ServiceHands, with what you tried and what it points at. Nothing is ordered or changed by reporting.</p>
              </> : <div data-testid="here-told"><Notice tone="info">The {ROLES[role].label} does not report problems here. Tell your host or the front desk what you saw and what you tried: they can report it, and what is written above is what they need.</Notice></div>}
            </>}
            {done && <div className="hr-done" data-testid="here-done" data-outcome={done.outcome} data-incident={done.incidentId || ''} data-visit={done.id}>
              <h3 tabIndex={-1} ref={doneRef}>{done.outcome === 'fixed' ? 'Saved to the room’s history' : done.outcome === 'joined' ? `Added to ${done.incidentId}` : `Sent to ServiceHands as ${done.incidentId}`}</h3>
              <p>{done.outcome === 'fixed' ? `The next person in ${shortName(o)} will see that this happened and that “${done.fixedBy}” fixed it.` : done.outcome === 'joined' ? 'The technician working on it now sees that it was seen again, when, and what you tried.' : `${doneJob?.recurrenceOf ? `It is marked as coming back after ${doneJob.recurrenceOf}, so the cause is diagnosed before another visit. ` : ''}It is in the queue with what you tried, so the technician does not start from nothing.`}</p>
              {doneJob && <p><Tag tone={jobWords(doneJob.state)[1]}>{jobWords(doneJob.state)[0]}</Tag></p>}
              <p className="hr-links">{done.incidentId && opens('#/servicehands') && <a href={`#/servicehands?id=${done.incidentId}`} data-testid="here-follow">Open it in ServiceHands</a>}{opens('#/room') && <a href={`#/room/${id}?tab=history`}>Open the room’s history</a>}{opens('#/people') && <a href={`#/people?room=${id}`} data-testid="here-who">Who knows this room</a>}<a href="#/here">Help in another room</a></p>
              <p><Button onClick={restart} testId="here-again">Something else in this room</Button></p>
              <WhoKnows role={role} kind="room" id={id} seen={sym.label} heading="Contact the site champion" />
            </div>}
          </div>}

          {!done && <div className="hr-nav">{prev && <Button kind="quiet" onClick={() => go(prev)} testId="here-back">Back</Button>}{next && step !== 'try' && <Button kind="primary" onClick={() => go(next)} testId="here-next">Next: {STEP_TITLE[next][0]}</Button>}{step === 'try' && <Button kind={current ? 'secondary' : 'primary'} onClick={() => go('record')} testId="here-next">{current ? 'Skip to writing it down' : 'Next: Write it down'}</Button>}</div>}
        </div>
      </div>

      {mine.length > 0 && <section className="hr-mine" aria-labelledby="hr-mine-h" data-testid="here-mine"><h2 className="build__h" id="hr-mine-h">Written down in this room, on this device</h2>
        <ul>{mine.slice(0, 6).map((v) => { const j = v.incidentId ? S.incidentOf(w, v.incidentId) : undefined; const s = symptomOf(v.symptom); return (
          <li key={v.id} data-id={v.id} data-outcome={v.outcome}><b>{s?.label || 'A problem'}</b> <span className="ui-muted">{day(v.at)} · {v.outcome === 'fixed' ? 'fixed in the room' : v.outcome === 'joined' ? `added to ${v.incidentId}` : `reported as ${v.incidentId}`}</span> {j ? <Tag tone={jobWords(j.state)[1]}>{jobWords(j.state)[0]}</Tag> : v.outcome === 'fixed' ? <Tag tone="ok">Fixed in the room</Tag> : null}</li>); })}</ul>
      </section>}
    </section>
  );
}
