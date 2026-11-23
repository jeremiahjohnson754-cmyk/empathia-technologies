/**
 * #/missionproof — MissionProof for the company town hall (journey J8, and where J6B-VOICE ends). Each dependency is read from an
 * existing record and links to it; the evidence case in the address (?case=) is the same one the CallPath and FLOW read, so moving
 * between them keeps it. Recording a rehearsal is the page's one action (mission.rehearse). The page compares the current reading
 * with the degraded call, so the change a repair makes, and the change it does not make, are both visible.
 */
import { useState } from 'react';
import { PageHero, Notice, Tag, Segmented, Button } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { State } from '../voice/CallPathPage.js';
import { CASES, caseOf, type CaseId } from '../voice/model.js';
import { MISSION, READY_WORD, loadRehearsals, readiness, recordRehearsal, type Ready } from './model.js';

const TONE: Record<Ready, 'ok' | 'warn' | 'bad'> = { READY: 'ok', AT_RISK: 'bad', NOT_READY: 'bad', UNKNOWN: 'warn' };
export default function MissionPage({ role, query, can }: PageProps) {
  const { w } = useWorkspace(); const id: CaseId = caseOf(query.get('case')); const [reh, setReh] = useState(() => loadRehearsals());
  const opens = (h: string) => { const r = resolve(h.split('?')[0]!); return !!r && canOpen(role, r); };
  const now = readiness(w, id, reh); const base = readiness(w, 'degraded', reh);
  const changed = now.deps.filter((d, i) => d.ready !== base.deps[i]!.ready);
  return (<div className="vc" data-testid="mission" data-overall={now.overall} data-case={id}>
    <PageHero eyebrow="MissionProof · simulation" title={MISSION.name} product="pro" icon="route" lede={`${MISSION.when}. Readiness is read from the records the event depends on. Nothing here is typed in, and an unknown is never counted as ready.`}
      meta={[<Tag key="o" tone={TONE[now.overall]}>{READY_WORD[now.overall]}</Tag>, <span key="m">{MISSION.id}</span>]} />
    <p className={`vc-verdict vc-verdict--${now.overall === 'READY' ? 'within_policy' : now.overall === 'UNKNOWN' ? 'unknown' : 'outside_policy'}`} data-testid="mission-overall"><b>{READY_WORD[now.overall]}.</b> {now.says}</p>
    <div className="vc-cases"><Segmented label="Which calling evidence to read" value={id} onChange={(c) => { location.hash = c === 'degraded' ? '#/missionproof' : `#/missionproof?case=${c}`; }} options={CASES.map((c) => ({ value: c.id, label: c.label }))} />
      <p className="ui-muted" data-testid="mission-delta">{id === 'degraded' ? 'This is the reading with the degraded call.' : changed.length ? `Against the degraded call, ${changed.length} dependenc${changed.length === 1 ? 'y reads' : 'ies read'} differently: ${changed.map((d) => `${d.title.split(':')[0]!.split(' (')[0]} is ${READY_WORD[d.ready].toLowerCase()}`).join('; ')}.` : 'Against the degraded call, no dependency reads differently.'}</p></div>
    <section className="vc-sec" aria-labelledby="mp-d-h"><h2 id="mp-d-h">What the town hall depends on</h2>
      <ul className="mp-deps" data-testid="mission-deps">{now.deps.map((d) => (<li key={d.id} className="mp-dep" data-dep={d.id} data-ready={d.ready}>
        <h3>{d.title}</h3><p><Tag tone={TONE[d.ready]}>{READY_WORD[d.ready]}</Tag> <State s={d.basis} /> <span className="ui-muted">Owner: {d.owner}</span></p><p>{d.why}</p>
        {d.href && opens(d.href) ? <p><a href={d.href} data-testid={`mission-open-${d.id}`}>{d.hrefLabel}</a></p> : null}
      </li>))}</ul>
    </section>
    <section className="vc-sec vc-two" aria-label="Rehearsal and contingency">
      <div><h2>Rehearsal</h2>{reh.length ? <ul className="vc-next" data-testid="mission-rehearsals">{reh.map((r) => <li key={r.at}>{r.at.slice(0, 16).replace('T', ' ')} UTC · recorded as {r.by}{r.note ? ` · ${r.note}` : ''}</li>)}</ul> : <p className="ui-muted">None recorded.</p>}
        {can('mission.rehearse') ? <Button kind="secondary" testId="mission-rehearse" onClick={() => setReh(recordRehearsal(role, 'Full run with the three remote rooms'))}>Record a rehearsal</Button> : <p className="ui-muted">A rehearsal is recorded by the operations lead.</p>}
        <p className="ui-muted">Kept in this browser (demonstration). A rehearsal is a declaration; it is not a test result.</p></div>
      <div><h2>Contingency</h2><ul className="vc-next">{MISSION.contingency.map((c) => <li key={c}>{c}</li>)}</ul></div>
    </section>
    <Notice tone="muted"><b>Not built yet:</b> the archive of the event and the lessons recorded after it. A closed service job never makes a dependency ready by itself: the calling dependency needs the repair verified and a later session within targets.</Notice>
  </div>);
}
