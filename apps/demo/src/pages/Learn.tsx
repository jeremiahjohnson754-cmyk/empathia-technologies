/**
 * Empathia Learn and SIGNAL — reviewed cases from what actually happened (customer permission, de-identification, SME review, the
 * steward's approval; training never grants work authorization), and the SIGNAL library carried over unchanged from V1.4.1: 161 lessons
 * with their checks, 146 drills (six interactive kinds), 62 canon cases, 125 formulas, a 522-term glossary. The library is loaded on
 * demand (signal-lib.json) so the demonstration shell stays small; every drill completion is recorded in the ledger as training, nothing
 * more.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Facts, Notice, Tag, Tabs, QuizRunner, DrillRunner, DRILL_KINDS, PageHero, StatTile, Card, Chip, List, ListRow, MeterRow, Icon, type Quiz, type Drill } from '@empathia/ui';
import { loadLabs, DOMAIN_COMPETENCY } from '../learn/store.js';
import { plural } from './viz.js';
import * as S from '../workspace/store.js';
import { useWorkspace, isRefusal } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel, holds } from '../build/store.js';

interface Lesson { domain: string; title: string; sum: string; cards: string[]; quiz?: string }
interface CanonCase { title: string; episode: string; hook: string; learn: string[]; id: string; canon: boolean }
interface Lib { lessons: Record<string, Lesson>; lessonOrder: string[]; lessonDomains: string[]; quizzes: Record<string, Quiz>; drills: Record<string, Drill>; drillOrder: string[]; cases: Record<string, CanonCase>; caseOrder: string[]; formulas: Record<string, { name: string; eq: string; where: Array<[string, string]>; ex: string }>; glossary: Array<{ id: string; term: string; d: string; dom: string }> }
let cache: Lib | null = null; let pending: Promise<Lib> | null = null;
export function loadLib(): Promise<Lib> { if (cache) return Promise.resolve(cache); if (!pending) pending = fetch('signal-lib.json').then((r) => { if (!r.ok) throw new Error(`signal-lib.json ${r.status}`); return r.json(); }).then((j: Lib) => { cache = j; return j; }, (e) => { pending = null; throw e; }); return pending; }   // a failed load can be retried (it was kept as a rejected promise)
const html = (s: string) => ({ __html: s });   // first-party library text (lesson cards carry <b> and formula spans), shipped with the build, never user input
const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { PROPOSED: 'warn', SME_REVIEWED: 'info', REJECTED: 'bad', APPROVED: 'ok' };
const when = (s: string) => s.slice(0, 16).replace('T', ' ');

export function LearnPage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective);
  const { w, apply, refusal } = useWorkspace();
  const [lib, setLib] = useState<Lib | null>(cache); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadLib().then(setLib).catch((e) => setErr(String(e))); }, []);
  const wantCase = /[?&]case=([A-Z0-9-]+)/.exec(hash)?.[1];
  const [tab, setTab] = useState(hash.startsWith('#/learn') ? 'lessons' : 'cases');
  return (
    <section className="learn wk" data-native="workspace">
      <PageHero product="learn" icon="book" eyebrow="Empathia Learn · SIGNAL" title="Reviewed cases from what actually happened"
        lede={<>SIGNAL: the same Core that runs the estate, read as something to practise on. A case needs customer permission, de-identification, an SME review and the steward's approval. Training performance never grants work authorization. Acting as <b>{personaLabel(persona)}</b>.</>}
        meta={lib ? [<Chip key="l" small tone="muted">{Object.keys(lib.lessons).length} lessons</Chip>, <Chip key="d" small tone="muted">{Object.keys(lib.drills).length} drills</Chip>, <Chip key="c" small tone="muted">{Object.keys(lib.cases).length} canon cases</Chip>, <Chip key="s" small tone="accent">Scores stay in this browser</Chip>] : [<Chip key="s" small tone="accent">Scores stay in this browser</Chip>]}
        actions={<><a className="ui-btn ui-btn--primary" href="#/learn/labs">Open the labs</a><a className="ui-btn" href="#/story" data-testid="learn-story">Read the SIGNAL story</a><a className="ui-btn" href="#/onboard" data-testid="learn-onboard">IT Onboarding Success Guide</a><a className="ui-btn" href="#/manual" data-testid="learn-manual">Engineering standards manual</a><a className="ui-btn" href="#/servicehands">ServiceHands</a></>} />
      <Overview w={w} persona={persona} lib={lib} />
      {refusal && <div role="alert"><Notice tone="bad"><b>Refused.</b><ul className="build__why">{refusal.why.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
      <Tabs label="Learn" active={tab} onChange={setTab} tabs={[{ key: 'cases', label: 'Cases', count: w.learnCases.length }, { key: 'lessons', label: 'Lessons' }, { key: 'drills', label: 'Drills' }, { key: 'canon', label: 'Casebook' }, { key: 'reference', label: 'Formulas & glossary' }]} />
      {tab === 'cases' && <Cases w={w} apply={apply} persona={persona} want={wantCase || null} />}
      {tab !== 'cases' && (err ? <Notice tone="bad">The SIGNAL library did not load: {err}</Notice> : !lib ? <p className="ui-meta">Loading the SIGNAL library…</p> : tab === 'lessons' ? <Lessons lib={lib} /> : tab === 'drills' ? <Drills lib={lib} w={w} apply={apply} persona={persona} /> : tab === 'canon' ? <Canon lib={lib} /> : <Reference lib={lib} />)}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ overview: readiness, competencies, learn from a room
/** Readiness points (the demonstration's stated rule; practice evidence only, never an authorization): a drill answered correctly 5,
 * a lab passed 10, a case this person proposed that reached APPROVED 20. Levels at 30, 90 and 200 points. */
export const POINTS = { drill: 5, lab: 10, case: 20 } as const;
export const LEVELS: Array<[number, string]> = [[0, 'Shadowing'], [30, 'Assisted'], [90, 'Independent'], [200, 'Trusted']];
export function readiness(w: S.Workspace, persona: string, labsPassed: number) {
  const drills = new Set(w.training.filter((t) => t.by === persona && t.correct).map((t) => t.drillId));
  const cases = w.learnCases.filter((c) => c.proposedBy === persona && c.state === 'APPROVED').length;
  const points = drills.size * POINTS.drill + labsPassed * POINTS.lab + cases * POINTS.case;
  const k = LEVELS.filter(([p]) => points >= p).length - 1; const next = LEVELS[k + 1];
  return { points, level: LEVELS[k]![1], next: next ? { at: next[0], name: next[1], need: next[0] - points } : null, drills: drills.size, cases };
}
function Overview({ w, persona, lib }: { w: S.Workspace; persona: string; lib: Lib | null }) {
  const labs = Object.values(loadLabs().results).filter((r) => r.persona === persona);
  const passed = labs.filter((r) => r.passed);
  const R = readiness(w, persona, passed.length);
  const drillTotal = lib ? lib.drillOrder.length : null; const labTotal = 3 + (lib && (lib as unknown as { labOrder?: string[] }).labOrder ? (lib as unknown as { labOrder: string[] }).labOrder.length : 0);
  const comps = [...new Set(Object.values(DOMAIN_COMPETENCY))].map((c) => ({ c, labs: passed.filter((r) => DOMAIN_COMPETENCY[r.domain] === c) }));
  const rooms = [...new Set(w.incidents.map((i) => i.roomId))].map((id) => { const inc = w.incidents.filter((i) => i.roomId === id); const kase = w.learnCases.find((c) => inc.some((i) => i.id === c.incidentId)); return { id, name: inc[0]!.roomName, inc, kase, eligible: inc.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.state) && !i.learnCaseId) }; });
  const nextDrill = lib?.drillOrder.find((id) => !w.training.some((t) => t.by === persona && t.drillId === id && t.correct));
  const tech = S.techForPersona(persona);
  return (<>
    <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="learn-tiles">
      <StatTile label="Readiness" value={R.level} icon="spark" tone="learn" hint={`${R.points} points${R.next ? ` · ${R.next.need} to ${R.next.name.toLowerCase()}` : ''}`} />
      <StatTile label="Cases proven" value={w.learnCases.filter((c) => c.state === 'APPROVED').length} unit={`of ${w.learnCases.length}`} icon="book" tone="ok" hint={`${R.cases} proposed by you`} />
      <StatTile label="Drills passed" value={R.drills} unit={drillTotal === null ? undefined : `of ${drillTotal}`} icon="check" tone="info" hint="Six kinds, from the SIGNAL library" />
      <StatTile label="Labs passed" value={passed.length} unit={`of ${labTotal}`} icon="play" tone="indigo" href="#/learn/labs" hint={`${labs.length - passed.length} attempted, not yet passed`} />
    </div>
    <div className="wk-g3">
      <Card icon="arrow-right" tone="learn" title="What to do next" sub="The next step for this perspective">
        <List label="Next steps">
          {rooms.some((r) => r.eligible.length) && S.LEARN_PROPOSE.some((a) => holds(persona, a)) ? <ListRow title="Write a case from a resolved incident" sub={`${rooms.flatMap((r) => r.eligible).length} incident(s) eligible`} href="#/v25/learn" chevron leading={<Icon name="book" />} /> : null}
          {nextDrill && lib ? <ListRow title={`Drill: ${lib.drills[nextDrill]!.title}`} sub={`${lib.drills[nextDrill]!.domain} · not passed yet`} href="#/learn" chevron leading={<Icon name="check" />} /> : null}
          <ListRow title={passed.length < 3 ? 'Open a lab: Audio, Camera or Lighting' : 'Try a SIGNAL fault lab'} sub="Simulated instruments; the result is evidence on your record" href="#/learn/labs" chevron leading={<Icon name="play" />} />
        </List>
      </Card>
      <Card icon="shield" title="Competencies" sub={tech ? 'Evidenced by passed labs on this person’s internal record' : 'Labs evidence the technicians’ internal records'}>
        <ul className="kit-meters">{comps.map(({ c, labs: l }) => <MeterRow key={c} label={c.replace('cert.', '').replace('_', ' ')} sub={l.length ? `lab-evidenced: ${l.map((x) => x.title.split(':')[0]).join(', ')}` : 'no lab evidence yet'} value={l.length ? 100 : 0} state={l.length ? 'healthy' : 'modelled'} />)}</ul>
        <p className="wk-note">Lab evidence is never a credential and never an authorization to work.</p>
      </Card>
      <Card icon="room" title="Learn from a room" sub="Rooms whose service history can become a reviewed case" testId="learn-rooms">
        <List label="Rooms with service history">{rooms.map((r) => <ListRow key={r.id} title={r.name} sub={`${plural(r.inc.length, 'service job')}${r.kase ? ` · case ${r.kase.id} ${r.kase.state}` : r.eligible.length ? ` · ${r.eligible.length} eligible for a case` : ''}`} href={`#/replay/${r.id}`} chevron leading={<Icon name="room" />} trailing={r.kase ? <Chip small tone={r.kase.state === 'APPROVED' ? 'ok' : 'warn'}>{r.kase.state === 'APPROVED' ? 'Case proven' : 'In review'}</Chip> : <Chip small tone="muted">Not taken</Chip>} />)}</List>
      </Card>
    </div>
  </>);
}

// ------------------------------------------------------------------------------------------------------------ governed cases
function Cases({ w, apply, persona, want }: { w: S.Workspace; apply: ReturnType<typeof useWorkspace>['apply']; persona: string; want: string | null }) {
  const [f, setF] = useState({ incidentId: '', title: '', lesson: '', permission: false, deidentified: false });
  const eligible = w.incidents.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.state) && !i.learnCaseId);
  const [sel, setSel] = useState<string | null>(want || w.learnCases[0]?.id || null);
  const c = w.learnCases.find((x) => x.id === sel) || null;
  const [note, setNote] = useState('');
  const canPropose = S.LEARN_PROPOSE.some((a) => holds(persona, a)); const canSme = S.LEARN_SME.some((a) => holds(persona, a)); const canApprove = holds(persona, 'case.approve');
  return (
    <div className="svc__grid">
      <div className="stack">
        <ul className="svc__list" data-testid="learn-cases">{w.learnCases.map((x) => <li key={x.id} className={x.id === sel ? 'on' : ''}><a href={`#/v25/learn?case=${x.id}`} onClick={(e) => { e.preventDefault(); setSel(x.id); }}><Tag tone={TONE[x.state]}>{x.state}</Tag> <b>{x.title}</b><span className="ui-meta">{x.id} · from {x.incidentId}</span></a></li>)}{!w.learnCases.length && <li className="ui-meta">No case proposed yet.</li>}</ul>
        {canPropose && <details className="card" open={!w.learnCases.length}><summary>Propose a case from a resolved incident</summary>
          <div className="stack" data-testid="propose">
            <select aria-label="Incident" value={f.incidentId} onChange={(e) => setF({ ...f, incidentId: e.target.value })}><option value="">— pick a RESOLVED or CLOSED incident —</option>{eligible.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.title}</option>)}</select>
            <input aria-label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title (de-identified)" />
            <textarea aria-label="Lesson" rows={3} value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} placeholder="The lesson, written so it is useful without the room or the people" />
            <label className="check"><input type="checkbox" checked={f.permission} onChange={(e) => setF({ ...f, permission: e.target.checked })} /> Customer permission to reuse obtained</label>
            <label className="check"><input type="checkbox" checked={f.deidentified} onChange={(e) => setF({ ...f, deidentified: e.target.checked })} /> De-identified (no room, person or tenant names)</label>
            <Button kind="primary" small onClick={() => { const r = apply((x) => S.proposeCase(x, persona, f.incidentId, f)); if (!isRefusal(r)) { setSel(r.id); setF({ incidentId: '', title: '', lesson: '', permission: false, deidentified: false }); } }}>Propose</Button>
          </div></details>}
      </div>
      <div className="svc__detail">{c ? <div className="stack" data-testid="learn-case">
        <h2 className="build__h">{c.title} <Tag tone={TONE[c.state]}>{c.state}</Tag></h2>
        <p>{c.lesson}</p>
        <Facts items={[['Source incident', `${c.incidentId}${c.apexId ? ` · APEX ${c.apexId}` : ''}`], ['Permission', c.permission ? `obtained · recorded by ${personaLabel(c.permission.by)} ${when(c.permission.at)}` : 'not obtained'], ['De-identified', c.deidentified ? 'yes' : 'no'], ['Proposed by', `${personaLabel(c.proposedBy)} · ${when(c.proposedAt)}`], ['SME review', c.smeReview ? `${c.smeReview.decision} by ${personaLabel(c.smeReview.by)} ${when(c.smeReview.at)}${c.smeReview.note ? ` — ${c.smeReview.note}` : ''}` : 'pending'], ['Steward approval', c.approvedBy ? personaLabel(c.approvedBy) : 'pending']]} />
        {c.state === 'PROPOSED' && (canSme ? <div className="build__row"><input aria-label="Review note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="SME note" /><Button small kind="primary" onClick={() => apply((x) => S.smeReview(x, persona, c.id, 'approve', note))}>SME review: approve</Button><Button small onClick={() => apply((x) => S.smeReview(x, persona, c.id, 'reject', note))}>Reject</Button></div> : <p className="ui-meta">SME review pending — a subject-matter reviewer (commissioning, DSP, camera, control or assurance) records it.</p>)}
        {c.state === 'SME_REVIEWED' && (canApprove ? <Button small kind="primary" onClick={() => apply((x) => S.approveCase(x, persona, c.id))}>Approve for Learn (training.case_approved)</Button> : <p className="ui-meta">Awaiting the data steward's approval (case.approve).</p>)}
        {c.state === 'APPROVED' && <Notice tone="ok">Published to Learn. It links the lesson to the incident's evidence chain; it grants nobody any authority.</Notice>}
        <div className="svc__links"><a href={`#/v25/service?id=${c.incidentId}`}>ServiceHands {c.incidentId}</a>{c.apexId ? <> · <a href={`#/v25/apex?case=${c.apexId}`}>APEX {c.apexId}</a></> : null}</div>
      </div> : <Notice tone="info">Cases are written from resolved incidents. {eligible.length} incident(s) are eligible right now.</Notice>}</div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------------ lessons + checks
function Lessons({ lib }: { lib: Lib }) {
  const [dom, setDom] = useState('Audio'); const [sel, setSel] = useState<string | null>(null);
  const ids = lib.lessonOrder.filter((id) => lib.lessons[id]?.domain === dom);
  const l = sel ? lib.lessons[sel] : null; const q = l?.quiz ? lib.quizzes[l.quiz] : null;
  return (
    <div className="svc__grid">
      <div className="stack"><div className="learn__doms">{lib.lessonDomains.map((d) => <button key={d} type="button" className={`sp__chip${d === dom ? ' on' : ''}`} onClick={() => { setDom(d); setSel(null); }}>{d}</button>)}</div>
        <ul className="svc__list" data-testid="lessons">{ids.map((id) => <li key={id} className={id === sel ? 'on' : ''}><a href="#" onClick={(e) => { e.preventDefault(); setSel(id); }}><b>{lib.lessons[id]!.title}</b><span className="ui-meta">{lib.lessons[id]!.sum}</span></a></li>)}</ul></div>
      <div className="svc__detail">{l ? <article className="stack" data-testid="lesson"><h2 className="build__h">{l.title}</h2><p className="ui-muted">{l.sum}</p>{l.cards.map((c, i) => <p key={i} className="learn__card" dangerouslySetInnerHTML={html(c)} />)}{q && <QuizRunner q={q} />}</article> : <Notice tone="info">Pick a lesson. Each ends with a check.</Notice>}</div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------------ drills (six kinds)
function Drills({ lib, w, apply, persona }: { lib: Lib; w: S.Workspace; apply: ReturnType<typeof useWorkspace>['apply']; persona: string }) {
  const [kind, setKind] = useState('firstfail'); const [sel, setSel] = useState<string | null>(null);
  const kinds = DRILL_KINDS;
  const ids = lib.drillOrder.filter((id) => lib.drills[id]?.type === kind);
  const d = sel ? lib.drills[sel] : null;
  const done = (correct: boolean, elapsedS: number) => apply((x) => { S.recordTraining(x, persona, sel!, correct, elapsedS); return null; });
  return (
    <div className="svc__grid">
      <div className="stack"><div className="learn__doms">{kinds.map(([k, l]) => <button key={k} type="button" className={`sp__chip${k === kind ? ' on' : ''}`} onClick={() => { setKind(k); setSel(null); }}>{l} ({lib.drillOrder.filter((id) => lib.drills[id]?.type === k).length})</button>)}</div>
        <ul className="svc__list" data-testid="drills">{ids.map((id) => { const t = w.training.filter((x) => x.drillId === id); return <li key={id} className={id === sel ? 'on' : ''}><a href="#" onClick={(e) => { e.preventDefault(); setSel(id); }}><b>{lib.drills[id]!.title}</b><span className="ui-meta">{lib.drills[id]!.domain} · {lib.drills[id]!.time}s{t.length ? ` · done ${t.length}× (${t.filter((x) => x.correct).length} right)` : ''}</span></a></li>; })}</ul></div>
      <div className="svc__detail">{d ? <DrillRunner key={d.id} d={d} onDone={done} /> : <Notice tone="info">Pick a drill. Six kinds, all from the SIGNAL library; a completion is recorded as training — it never grants authority.</Notice>}</div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------------ canon casebook, reference
function Canon({ lib }: { lib: Lib }) {
  const [sel, setSel] = useState<string | null>(null); const c = sel ? lib.cases[sel] : null;
  return <div className="svc__grid"><ul className="svc__list" data-testid="canon">{lib.caseOrder.map((id) => <li key={id} className={id === sel ? 'on' : ''}><a href="#" onClick={(e) => { e.preventDefault(); setSel(id); }}><b>{lib.cases[id]!.title}</b><span className="ui-meta">{lib.cases[id]!.episode} · {lib.cases[id]!.hook}</span></a></li>)}</ul>
    <div className="svc__detail">{c ? <article className="stack"><h2 className="build__h">{c.title} <Tag tone="ok">reviewed · canon</Tag></h2><p className="ui-muted">{c.hook}</p>{c.learn.map((p, i) => <p key={i} className="learn__card" dangerouslySetInnerHTML={html(p)} />)}</article> : <Notice tone="info">The reviewed casebook: what happened, why it sounded or looked that way, how it was proved.</Notice>}</div></div>;
}
function Reference({ lib }: { lib: Lib }) {
  const [q, setQ] = useState('');
  const terms = useMemo(() => lib.glossary.filter((g) => !q || `${g.term} ${g.d}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [lib, q]);
  const formulas = useMemo(() => Object.values(lib.formulas).filter((f) => !q || `${f.name} ${f.eq}`.toLowerCase().includes(q.toLowerCase())).slice(0, 20), [lib, q]);
  return <div className="stack"><input className="sp__input" aria-label="Search the reference" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 522 terms and 125 formulas" />
    <div className="svc__grid"><ul className="plain" data-testid="glossary">{terms.map((g) => <li key={g.id}><b>{g.term}</b> <Tag tone="muted">{g.dom}</Tag><div className="ui-meta">{g.d}</div></li>)}</ul>
      <ul className="plain">{formulas.map((f, i) => <li key={i}><b>{f.name}</b> <span className="learn__eq" dangerouslySetInnerHTML={html(f.eq)} /><div className="ui-meta">{f.where.map(([k, v]) => `${k.replace(/<[^>]+>/g, '')}: ${v}`).join(' · ')}</div>{f.ex && <div className="ui-meta">e.g. {f.ex}</div>}</li>)}</ul></div></div>;
}
