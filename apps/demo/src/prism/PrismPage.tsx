/**
 * #/prism — Empathia PRISM (journey J7, first half): every screen of the declared signage group, with what the schedule intends, what
 * its player last reported and whether there is proof of play, each with its evidence state. An exception can be raised as a real
 * ServiceHands job (prism.raise); the card then reads that job from the workspace. Each screen links to its room, its asset in
 * Search Party and to SENTINEL, which uses these screens as one of its secondary channels.
 */
import { PageHero, Notice, Tag, Button } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { roomById, roomHref } from '../campus/canon.js';
import { useWorkspace, isRefusal } from '../workspace/useWorkspace.js';
import * as S from '../workspace/store.js';
import { holds, personaOf } from '../hardening/kit.js';
import { State } from '../voice/CallPathPage.js';
import { ADAPTERS, FRESH_SECONDS, SCHEDULE, VERDICT_WORD, jobFor, jobSummary, jobTitle, screens, summary, type Screen, type ScreenVerdict } from './model.js';

const TONE: Record<ScreenVerdict, 'ok' | 'warn' | 'bad'> = { MATCH: 'ok', MISMATCH: 'bad', OFFLINE: 'bad', UNKNOWN: 'warn' };
const READY: Record<ScreenVerdict, string> = { MATCH: 'READY', MISMATCH: 'NOT_READY', OFFLINE: 'NOT_READY', UNKNOWN: 'UNKNOWN' };
export default function PrismPage({ role, can }: PageProps) {
  const { w, apply } = useWorkspace(); const all = screens(); const sum = summary(all);
  const opens = (h: string) => { const r = resolve(h.split('?')[0]!); return !!r && canOpen(role, r); };
  const raise = (s: Screen) => { const persona = personaOf(role); const by = ['request.submit', 'service.triage', 'work.evidence'].some((a) => holds(persona, a)) ? persona : 'requestor';
    const out = apply((x) => S.raiseIncident(x, by, { roomId: s.roomId, roomName: s.roomName, buildingKey: s.building, title: jobTitle(s), summary: `${jobSummary(s)} Raised by the ${ROLES[role].label}.` })); return !isRefusal(out); };
  return (<div className="vc" data-testid="prism" data-exceptions={sum.exceptions}>
    <PageHero eyebrow="Empathia PRISM · simulation" title="What every screen is showing" product="pro" icon="display"
      lede="PRISM compares what the schedule intends with what each screen’s player reports, and says where there is proof of play and where there is not. It publishes nothing and replaces no content system."
      meta={[<Tag key="t" tone={sum.exceptions ? 'bad' : 'ok'}>{sum.exceptions ? `${sum.exceptions} to look at` : 'All as scheduled'}</Tag>, <span key="s">{SCHEDULE.id} r{SCHEDULE.revision}</span>]} />
    <p className={`vc-verdict vc-verdict--${sum.exceptions ? 'outside_policy' : 'within_policy'}`} data-testid="prism-summary"><b>{sum.match} of {sum.total} as scheduled.</b> {sum.says}</p>
    <Notice tone="info"><b>Simulated.</b> The schedule is declared; every player report is a fixture. A report older than {FRESH_SECONDS / 60} minutes is stale (the synthetic tenant’s rule), and a stale or missing report is never read as correct.</Notice>
    <section className="vc-sec" aria-labelledby="pr-s-h"><h2 id="pr-s-h">Screens</h2>
      <ul className="mp-deps" data-testid="prism-screens">{all.map((s) => { const job = jobFor(w, s); const o = roomById(s.roomId); return (<li key={s.id} className="mp-dep" data-screen={s.id} data-verdict={s.verdict} data-ready={READY[s.verdict]}>
        <h3>{s.label} · {o && opens(roomHref(o)) ? <a href={roomHref(o)}>{s.roomName}</a> : s.roomName}</h3>
        <p><Tag tone={TONE[s.verdict]}>{VERDICT_WORD[s.verdict]}</Tag> <span className="ui-muted">{s.id} · position {s.position} · {s.kind === 'ledwall' ? 'LED wall' : 'display'}</span></p>
        <p>{s.why}</p>
        <dl className="md-kv">
          <div><dt>Intended</dt><dd><State s={s.intended.state} /> {s.intended.says}</dd></div>
          <div><dt>Reported</dt><dd><State s={s.actual.state} /> {s.actual.says}</dd></div>
          <div><dt>Proof of play</dt><dd><State s={s.proof.state} /> {s.proof.says}</dd></div>
        </dl>
        <p className="fl-refs">{opens('#/search') ? <a href={`#/search?focus=Asset:${s.id}`} data-testid={`prism-asset-${s.id}`}>The screen in Search Party</a> : null}
          {opens('#/sentinel') ? <a href="#/sentinel">Its route in SENTINEL</a> : null}</p>
        {s.verdict === 'MATCH' ? null : job ? <p data-testid={`prism-job-${s.id}`}><b>Job {job.id}</b> is {job.state.toLowerCase().replace(/_/g, ' ')}. {opens('#/servicehands') ? <a href="#/servicehands">Open ServiceHands</a> : null}</p>
          : can('prism.raise') ? <p><Button kind="secondary" testId={`prism-raise-${s.id}`} onClick={() => raise(s)}>Raise a job for this screen</Button></p>
          : <p className="ui-muted">No job is on record for this screen. Operations or service management can raise one.</p>}
      </li>); })}</ul>
    </section>
    <section className="vc-sec vc-two" aria-label="Adapters and limits">
      <div><h2>Where the data would come from</h2><ul className="vc-next" data-testid="prism-adapters">{ADAPTERS.map((a) => <li key={a.id}><b>{a.target}</b> <Tag tone={a.status === 'MOCK' ? 'info' : 'muted'}>{a.status === 'MOCK' ? 'Mock' : 'Contract only'}</Tag><br /><span className="ui-muted">{a.note}</span></li>)}</ul></div>
      <div><h2>What PRISM does not do</h2><ul className="vc-next"><li>It does not publish, schedule or change content.</li><li>It does not call a player’s state report proof of play.</li><li>It does not watch the screen with a camera here; a visual check would be a separate, authorised observation.</li><li>It names no signage vendor and claims no integration.</li></ul></div>
    </section>
  </div>);
}
