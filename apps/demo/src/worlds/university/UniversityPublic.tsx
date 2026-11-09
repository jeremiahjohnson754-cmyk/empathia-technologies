/**
 * University, public journeys: Student Life (the Student configuration only), Discover Campus and Study & Play. Nothing of the campus
 * AV estate is in this module, and the sample timetable appears on the Student's own screen only (EMP-REQ-0437).
 */
import { useState, type ComponentType } from 'react';
import { Block, Ev, Fresh, Pick, Plan, Rows, Said, ScreenHead, useScoped, type ScreenProps } from '../kit.js';
import { scopedStore } from '../scope.js';
import { CATALOGUE, CLASSES, DINING, OFFICE_HOURS, QUEST, REMINDERS, SHUTTLES, SPOTS, STOPS, TOUR, VIEW, ZONES, route, spot, type Mode } from './data.public.js';
import { journeyAt, journeyHref } from '../registry.js';

function StudentLife({ world, journey, config }: ScreenProps) {
  const [on, setOn] = useState(true); const [quiet, setQuiet] = useState(true);
  const there = journeyHref(journeyAt('university', 'discover-campus')!, config.id);
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">A sample student’s day. No student record, course site or identity system is connected.</p></ScreenHead>
    <div className="w-two">
      <Block title="Today" sub="sample timetable" testId="today">
        <ol className="w-cues">{CLASSES.map((x) => <li key={x.at}><span className="w-cues__t">{x.at}</span><span><b>{x.what}</b><span className="ui-meta">{x.where}</span></span><a className="w-link" href={`${there}${there.includes('?') ? '&' : '?'}to=${x.spot}`}>Get there<span className="ui-sr"> to {x.where}</span></a></li>)}</ol>
        <p className="ui-meta">Shown to the student it belongs to and to no engineering or operations view <Ev state="SIMULATED" /></p>
      </Block>
      <Block title="Reminders" sub="yours to switch off">
        <label className="w-check"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} data-testid="reminders-on" /> <span>Send me reminders</span></label>
        <label className="w-check"><input type="checkbox" checked={quiet} disabled={!on} onChange={(e) => setQuiet(e.target.checked)} /> <span>Quiet hours, 22:00 to 07:00</span></label>
        {on ? <ul className="w-list" data-testid="reminders">{REMINDERS.map((r) => <li key={r.id}>{r.text}</li>)}</ul> : <p className="ui-meta" data-testid="reminders-off">Reminders are off. Nothing is sent, and every other part of this page still works.</p>}
        <Said>{on ? `Reminders on${quiet ? ', quiet from 22:00 to 07:00' : ''}.` : 'Reminders off.'}</Said>
      </Block>
    </div>
    <div className="w-two">
      <Block title="Dining" sub="published menus">
        {DINING.map((d) => <div key={d.hall} className="w-sub"><h3>{d.hall}</h3><p><Fresh state={d.state} age={d.age} /></p><ul className="w-menu" aria-label={`Menu at ${d.hall}`}>{d.menu.map((i) => <li key={i.item}><b>{i.item}</b><span className="ui-meta">Declared allergens: {i.allergens}</span></li>)}</ul></div>)}
        <p className="ui-meta">Sample menus <Ev state="DECLARED" />. Ask the kitchen about allergens: a published list is not a guarantee.</p>
      </Block>
      <Block title="Next shuttles" sub="arrival estimates">
        <Rows label="Next shuttles" rows={SHUTTLES.map((s) => ({ k: `${s.stop} · ${s.route}`, v: s.mins == null ? 'No estimate' : `about ${s.mins} min`, sub: s.age == null ? 'no source in this snapshot' : `declared ${s.age} min before this snapshot`, ev: s.mins == null ? 'UNAVAILABLE' as const : 'SIMULATED' as const }))} />
        <p className="ui-meta">A synthetic timetable. No transit feed is connected; a real one needs a licence and proof of access first. Every shuttle is low-floor.</p>
        <h3>Office hours and support</h3>
        <Rows label="Office hours and support" rows={OFFICE_HOURS.map((o) => ({ k: o.who, v: o.when, sub: o.where }))} />
      </Block>
    </div>
  </>);
}

const MODES: readonly (readonly [Mode, string])[] = [['walk', 'Walk'], ['cycle', 'Cycle'], ['shuttle', 'Shuttle']];
function DiscoverCampus({ world, journey, config }: ScreenProps) {
  const asked = new URLSearchParams(location.hash.split('?')[1] || '').get('to');
  const [from, setFrom] = useState('WEL'); const [to, setTo] = useState(SPOTS.some((s) => s.id === asked) ? asked! : 'LIB');
  const [mode, setMode] = useState<Mode>('walk'); const [stepFree, setStepFree] = useState(false);
  const r = route(from, to, mode, stepFree);
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">A 2D map of a fictional campus. Your location is never asked for: you choose where you start.</p></ScreenHead>
    <div className="w-two">
      <Block title="Find the way" sub="you choose both ends" testId="wayfinding">
        <div className="w-fields">
          <label className="w-field"><span>From</span><select value={from} onChange={(e) => setFrom(e.target.value)} data-testid="from">{SPOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label className="w-field"><span>To</span><select value={to} onChange={(e) => setTo(e.target.value)} data-testid="to">{SPOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        </div>
        <Pick label="How you travel" value={mode} options={MODES} onChange={setMode} />
        <label className="w-check"><input type="checkbox" checked={stepFree} onChange={(e) => setStepFree(e.target.checked)} data-testid="step-free" /> <span>Step-free route</span></label>
        {r ? (<>
          <ol className="w-way" data-testid="way">{r.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="ui-meta" data-testid="way-sum">About {r.metres} m · about {r.minutes} min <Ev state="MODELED" /> from the plan; not surveyed and not a real-time estimate.</p>
        </>) : <p className="ui-meta" data-testid="way-none">You are already there: choose a different place to go to.</p>}
      </Block>
      <Plan label={`Map of ${world.place}${r ? `: the way from ${spot(from).label} to ${spot(to).label}` : ''}`} view={VIEW} zones={ZONES} places={STOPS} lit={[from, to]} route={r?.points} selected={mode === 'shuttle' ? 'stop-u' : null}
        caption={<>2D map · not to scale · S marks a shuttle stop. The steps are listed beside the map.</>} />
    </div>
    <div className="w-two">
      <Block title="Places" sub={`${SPOTS.length} on the map`}>
        <ul className="w-list w-list--pick">{SPOTS.map((s) => <li key={s.id}><button type="button" className="w-item" aria-pressed={to === s.id} onClick={() => setTo(s.id)}><b>{s.label}</b><span className="ui-meta">{s.about} · {s.steps ? 'main entrance has steps; level entrance on the east side' : 'level entrance'}</span></button></li>)}</ul>
      </Block>
      <Block title="A first visit" sub="four stops, about 40 minutes">
        <ol className="w-way">{TOUR.map((id) => <li key={id}><b>{spot(id).label}</b> <span className="ui-meta">{spot(id).about}</span></li>)}</ol>
        <p className="ui-meta">A suggested order for visitors and prospective students. Tours with a guide are booked at the Welcome Centre.</p>
      </Block>
    </div>
  </>);
}

/** The quest's progress belongs to one context: it is dropped when the world or the role changes (scope.ts). */
const quest = scopedStore(() => ({ round: 0, score: 0, tries: 0, picked: null as number | null, done: false }));
function StudyPlay({ world, journey, config }: ScreenProps) {
  const [q, setQ] = useScoped(quest);
  const round = QUEST[q.round]!; const pick = q.picked == null ? null : round.options[q.picked]!;
  const choose = (i: number) => setQ((s) => { if (s.picked != null && round.options[s.picked]!.right) return s; const right = round.options[i]!.right; return { ...s, picked: i, tries: s.tries + 1, score: s.score + (right ? (s.tries === 0 ? 10 : 5) : 0) }; });
  const next = () => setQ((s) => (s.round + 1 < QUEST.length ? { ...s, round: s.round + 1, picked: null, tries: 0 } : { ...s, done: true }));
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">Play needs no account and no location, and nothing here is required for any student service.</p></ScreenHead>
    <div className="w-two">
      <Block title="Circuit quest" sub={`round ${Math.min(q.round + 1, QUEST.length)} of ${QUEST.length}`} testId="quest">
        {q.done ? (<div data-testid="quest-done">
          <p><b>Quest complete: {q.score} of {QUEST.length * 10} points.</b></p>
          <p>{q.score >= 20 ? 'Badge earned: Circuit Starter.' : 'No badge this time: 20 points earn Circuit Starter.'} <span className="ui-meta">A badge is a keepsake. It costs nothing, pays nothing and counts toward no grade.</span></p>
          <button type="button" className="ui-btn w-btn" onClick={() => quest.reset()}>Play again</button>
        </div>) : (<>
          <svg className="w-circuit" viewBox="0 0 240 90" aria-hidden="true" focusable="false"><rect x="20" y="15" width="200" height="60" rx="6" /><line x1="20" y1="35" x2="20" y2="55" className="w-circuit__gap" /><line x1="12" y1="38" x2="28" y2="38" /><line x1="15" y1="52" x2="25" y2="52" /><path d="M90 15 l5 -7 l10 14 l10 -14 l10 14 l10 -14 l5 7" /><circle cx="180" cy="75" r="9" /></svg>
          <p className="w-quest__q"><b>{round.prompt}</b></p><p className="ui-meta">{round.given}</p>
          <div className="w-pick" role="group" aria-label="Your answer">{round.options.map((o, i) => <button key={o.label} type="button" className="w-pick__b" aria-pressed={q.picked === i} onClick={() => choose(i)} data-right={o.right || undefined}>{o.label}</button>)}</div>
          <Said>{pick ? <span data-testid="quest-feedback" data-ok={pick.right}>{pick.right ? 'Correct. ' : 'Not quite. '}{pick.why}</span> : 'Choose an answer; each one explains itself.'}</Said>
          {pick?.right && <button type="button" className="ui-btn ui-btn--primary w-btn" onClick={next} data-testid="quest-next">{q.round + 1 < QUEST.length ? 'Next round' : 'Finish'}</button>}
        </>)}
        <p className="ui-meta" data-testid="quest-score">Score: {q.score}. Ten points for a first-try answer, five after that.</p>
      </Block>
      <Block title="More quests" sub="specified, not built yet">
        <ul className="w-list">{CATALOGUE.map((x) => <li key={x}>{x} <span className="ui-meta">planned</span></li>)}</ul>
        <p className="ui-meta">Only the circuit quest is playable in this demonstration. Rewards stay non-monetary; vouchers and scholarships are not offered.</p>
      </Block>
    </div>
  </>);
}

export const SCREENS: Record<string, ComponentType<ScreenProps>> = { 'student-life': StudentLife, 'discover-campus': DiscoverCampus, 'study-play': StudyPlay };
