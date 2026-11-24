/**
 * #/sentinel — Empathia SENTINEL (journey J7, second half). One recorded, simulated drill: a fictional authoritative source sends a
 * notice, the preapproved SECONDARY plan sends it to PRISM's screens and one mock staff channel, and the page shows each route as
 * requested, acknowledged, proven shown or failed at the chosen moment (?t=). The failed routes can be followed up as one real
 * ServiceHands job (sentinel.follow). The banner is always on the page and is not dismissible.
 */
import { PageHero, Notice, Tag, Segmented, Button } from '@empathia/ui';
import { Connected } from '../mission/Connected.js';
import type { PageProps } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { useWorkspace, isRefusal } from '../workspace/useWorkspace.js';
import * as S from '../workspace/store.js';
import { holds, personaOf } from '../hardening/kit.js';
import { State } from '../voice/CallPathPage.js';
import { roomById, fullName } from '../campus/canon.js';
import { ALERT, BANNER, JOB_TITLE, MOMENTS, NEVER, PLAN, ROUTE_WORD, jobFor, jobSummary, momentOf, routes, tally, type RouteState } from './model.js';

const TONE: Record<RouteState, 'ok' | 'warn' | 'bad' | 'muted'> = { NOT_STARTED: 'muted', REQUESTED: 'warn', ACKNOWLEDGED: 'warn', RENDERED: 'ok', FAILED: 'bad' };
const READY: Record<RouteState, string> = { NOT_STARTED: '', REQUESTED: 'UNKNOWN', ACKNOWLEDGED: 'UNKNOWN', RENDERED: 'READY', FAILED: 'NOT_READY' };
export default function SentinelPage({ role, query, can }: PageProps) {
  const { w, apply } = useWorkspace(); const t = momentOf(query.get('t')); const all = routes(t); const sum = tally(all); const final = routes(); const failed = final.filter((r) => r.state === 'FAILED'); const job = jobFor(w);
  const opens = (h: string) => { const r = resolve(h.split('?')[0]!); return !!r && canOpen(role, r); };
  const follow = () => { const first = roomById(failed[0]?.roomId || ''); if (!first) return; const persona = personaOf(role); const by = ['request.submit', 'service.triage', 'work.evidence'].some((a) => holds(persona, a)) ? persona : 'requestor';
    const out = apply((x) => S.raiseIncident(x, by, { roomId: first.id, roomName: fullName(first), buildingKey: first.building, title: JOB_TITLE, summary: `${jobSummary(failed)} Raised by the ${ROLES[role].label}.` })); return !isRefusal(out); };
  const last = MOMENTS[MOMENTS.length - 1]!.t;
  return (<div className="vc" data-testid="sentinel" data-t={t}>
    <p className="sn-banner" role="note" data-testid="sentinel-banner"><b>{BANNER}</b> A recorded drill with a fictional source. No alert is sent, and no alarm, panel or public address system is contacted.</p>
    <PageHero eyebrow="Empathia SENTINEL · simulation" title="Did the approved notice reach its secondary channels?" product="pro" icon="shield"
      lede="SENTINEL audits delivery of a notice that an authoritative source has already sent and a plan has already approved. It keeps requested, acknowledged and proven shown apart, and it records the routes that failed."
      meta={[<Tag key="a" tone="info">{ALERT.id}</Tag>, <span key="p">{PLAN.id}</span>]} />
    <Connected id="sentinel" role={role} />
    <section className="vc-sec vc-two" aria-label="The alert and the plan">
      <div data-testid="sentinel-alert"><h2>The alert</h2><ul className="vc-next"><li><b>{ALERT.kind}</b></li><li>From: {ALERT.source}</li><li><State s="SIMULATED" /> {ALERT.authentication}</li><li>Received {ALERT.receivedAt.slice(11, 19)} UTC, 23 November 2026</li><li>{ALERT.origin}</li></ul></div>
      <div data-testid="sentinel-plan"><h2>The approved secondary plan</h2><ul className="vc-next"><li><b>{PLAN.title}</b></li><li><State s="DECLARED" /> Approved by the {PLAN.approvedBy}, {PLAN.approvedOn}</li><li>Message: “{PLAN.message}”</li><li>A route with no acknowledgement in {PLAN.ackWindowSeconds} seconds is failed.</li><li><b>{PLAN.review}</b></li></ul></div>
    </section>
    <div className="vc-cases"><Segmented label="The drill at" value={String(t)} onChange={(v) => { location.hash = Number(v) === last ? '#/sentinel' : `#/sentinel?t=${v}`; }} options={MOMENTS.map((m) => ({ value: String(m.t), label: m.label }))} />
      <p className={`vc-verdict vc-verdict--${!sum.started ? 'unknown' : sum.failed ? 'outside_policy' : 'unknown'}`} data-testid="sentinel-tally"><b>{sum.says}</b></p></div>
    <section className="vc-sec" aria-labelledby="sn-r-h"><h2 id="sn-r-h">Routes</h2>
      <ul className="mp-deps" data-testid="sentinel-routes">{all.map((r) => (<li key={r.id} className="mp-dep" data-route={r.id} data-state={r.state} data-ready={READY[r.state]}>
        <h3>{r.channel}: {r.target}</h3><p><Tag tone={TONE[r.state]}>{ROUTE_WORD[r.state]}</Tag></p>
        <ol className="vc-job">{r.steps.map((s) => <li key={s.state} data-step={s.state} data-done={t >= 0 && s.at <= t ? (s.state === 'FAILED' ? 'x' : '1') : '0'}><span>{s.says} <span className="ui-muted">+{s.at} s</span> {t >= 0 && s.at <= t ? <State s={s.basis} /> : null}</span></li>)}</ol>
        {t >= last ? <p className="ui-muted">{r.why}</p> : null}
        {r.screen && opens('#/prism') ? <p className="fl-refs"><a href="#/prism">This screen in PRISM</a></p> : null}
      </li>))}</ul>
    </section>
    <section className="vc-sec vc-two" aria-label="Follow-up and limits">
      <div><h2>Failed routes</h2>{failed.length ? <ul className="vc-next" data-testid="sentinel-failed">{failed.map((r) => <li key={r.id}>{r.target}: {r.why}</li>)}</ul> : <p className="ui-muted">No route failed.</p>}
        {job ? <p data-testid="sentinel-job"><b>Job {job.id}</b> is {job.state.toLowerCase().replace(/_/g, ' ')}. {opens('#/servicehands') ? <a href="#/servicehands">Open ServiceHands</a> : null}</p>
          : failed.length && can('sentinel.follow') ? <p><Button kind="secondary" testId="sentinel-follow" onClick={follow}>Raise one job for the failed routes</Button></p>
          : failed.length ? <p className="ui-muted">No job is on record. Operations or service management can raise one.</p> : null}</div>
      <div><h2>What SENTINEL never does</h2><ul className="vc-next" data-testid="sentinel-never">{NEVER.map((n) => <li key={n}>{n}</li>)}</ul></div>
    </section>
    <Notice tone="muted"><b>Not built:</b> a connection to any alerting source, any real secondary channel, and the review record of a qualified life-safety designer. The calling platform is not a route: VOICE places no call.</Notice>
  </div>);
}
