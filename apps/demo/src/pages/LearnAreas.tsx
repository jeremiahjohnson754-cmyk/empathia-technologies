/**
 * Empathia Learn, every area of V2.5.3's #/learn: the home (readiness, proven in the room, your SIGNAL path, the design clinic, six ratings,
 * competencies, learn from a room, how an incident becomes a lesson), SIGNAL (twelve seasons, the cast, the authored episodes played
 * scene by scene), Room story, Practice, Service Mode (the clock, ten actions and the six ratings on a room's own records; the SIGNAL
 * incidents run on their own rules), Case Files, the Design clinic and its eight lessons, the Fieldbook, the Learn library, Ask Empathia,
 * the Sanctuary explorer and the ServiceHands Academy. Content: learn/model.ts (V2.5.3's, extracted) and the SIGNAL library; every count
 * from the records. Scores stay in this browser; a completion is a training line in the ledger, never an authorization to work.
 */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PageHero, StatTile, Card, Chip, List, ListRow, MeterRow, Icon, Notice, Button, Tag, ProgressBar, EmptyState, ScoreRing, QuizRunner, DrillRunner, DRILL_KINDS, IncidentRunner, Incidents, type Quiz, type Drill, type IconName } from '@empathia/ui';
import { V, fill, trainingCases, caseById, loadProgress, record, minutesOf, RESPONSES, RULES, score, readinessOf, competencyEvidence, roomsFor, archetypesIn, hopsOf, type TrainingCase, type Progress, type Episode, type Scene } from '../learn/model.js';
import { loadLabs } from '../learn/store.js';
import { ChallengeRunner, Challenges as CHX, MeltdownRunner, Meltdowns as MDX, Bench } from '@empathia/ui';
import * as Story from '../signal/story.js';
import * as MC from '../signal/mission.js';
import * as Mentor from '../signal/mentor.js';
import { liteForText } from '../signal/lite.js';
import { LiteTryCard } from '../signal/LiteTry.js';
import * as RT from '../signal/ratings.js';
import { loadLib } from './Learn.js';
import { allRecords, roomRecord, type RoomRecord } from '../campus/design.js';
import { shortName, fullName, roomHref } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import * as S from '../workspace/store.js';
import { personaOf, personaLabel } from '../build/store.js';
import { openable } from './V25Nav.js';
import { plural, pct } from './viz.js';

type Lib = Awaited<ReturnType<typeof loadLib>> & { labs?: Record<string, { title: string; domain: string }>; incidents?: Record<string, SignalIncident>; incidentOrder?: string[]; explorers?: Explorer[]; seasonOf?: Record<string, number>; layerColors?: Record<string, string> };
const html = (s: string) => ({ __html: s });   // first-party content shipped with the build (V2.5.3 lesson cards, SIGNAL library), never user input

// ------------------------------------------------------------------------------------------------------------ shared frame
export const LEARN_AREAS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '#/learn', label: 'Learn home', icon: 'pulse' }, { href: '#/learn/signal', label: 'SIGNAL', icon: 'spark' }, { href: '#/learn/story', label: 'Room story', icon: 'play' },
  { href: '#/learn/labs', label: 'Labs', icon: 'layers' }, { href: '#/learn/servicehands', label: 'ServiceHands Academy', icon: 'wrench' }, { href: '#/learn/library', label: 'Library', icon: 'book' },
  { href: '#/learn/practice', label: 'Practice', icon: 'check' }, { href: '#/learn/design', label: 'Design clinic', icon: 'room' }, { href: '#/learn/service', label: 'Service Mode', icon: 'route' },
  { href: '#/learn/cases', label: 'Case Files', icon: 'book' }, { href: '#/learn/fieldbook', label: 'Fieldbook', icon: 'book' }, { href: '#/learn/challenges', label: 'Challenges', icon: 'spark' }, { href: '#/learn/mission', label: 'Mission Control', icon: 'pulse' }, { href: '#/learn/ask', label: 'Ask Empathia', icon: 'search' },
];
/** Learn's own navigation, on every Learn page: a chip only where the role may open that address (D44: absent, not disabled). */
export function LearnNav({ role, current }: { role: string; current: string }) {
  const items = LEARN_AREAS.filter((a) => openable(role, a.href));
  return <nav className="wk-v25nav ln-nav" aria-label="Empathia Learn">{items.map((a) => <Chip key={a.href} href={a.href} icon={a.icon} small selected={a.href === current}>{a.label}</Chip>)}</nav>;
}
const BADGES = [<Chip key="t" small tone="learn">Training simulation</Chip>, <Chip key="b" small tone="muted">Built from synthetic Core records</Chip>, <Chip key="s" small tone="accent">Scores stay in this browser</Chip>];
const FICTION = <Chip key="f" small tone="violet">SIGNAL world · fiction</Chip>;
function Head({ role, current, title, lede, meta = BADGES, actions, crumbs, aside }: { role: string; current: string; title: ReactNode; lede: ReactNode; meta?: ReactNode[]; actions?: ReactNode; crumbs?: Array<[string, string?]>; aside?: ReactNode }) {
  return <>
    {crumbs ? <nav className="ln-crumbs" aria-label="Where you are">{crumbs.map(([l, h], i) => <span key={l}>{i ? <span aria-hidden="true"> › </span> : null}{h ? <a href={h}>{l}</a> : <b aria-current="page">{l}</b>}</span>)}</nav> : null}
    <PageHero product="learn" icon="book" eyebrow="Empathia Learn" title={title} lede={lede} meta={meta} actions={actions} aside={aside} compact />
    <LearnNav role={role} current={current} />
  </>;
}
function useLib() {
  const [lib, setLib] = useState<Lib | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let live = true; loadLib().then((l) => live && setLib(l as Lib)).catch((e) => live && setErr(String(e))); return () => { live = false; }; }, []);
  return { lib, err };
}
function LibGate({ lib, err, children }: { lib: Lib | null; err: string | null; children: (l: Lib) => ReactNode }) {
  if (err) return <Notice tone="bad">The SIGNAL library did not load: {err}. <a href={location.hash}>Try again</a>.</Notice>;
  if (!lib) return <p className="ui-meta" role="status">Loading the SIGNAL library…</p>;
  return <>{children(lib)}</>;
}
function useProgress(): [Progress, (p: Progress) => void] {
  const [p, set] = useState<Progress>(loadProgress);
  useEffect(() => { const h = (e: StorageEvent) => { if (e.key === 'empathia.demo.learn.v1') set(loadProgress()); }; addEventListener('storage', h); return () => removeEventListener('storage', h); }, []);
  return [p, set];
}
const Chain = () => <ol className="ln-chain" aria-label="How an incident becomes a lesson">{['Incident', 'Pattern', 'Root cause', 'Known fix', 'Lesson', 'Training case', 'Competency', 'Better future operation'].map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol>;
const caseState = (p: Progress, c: TrainingCase) => { const r = p.runs[c.id]; return !r ? { label: 'Not taken', tone: 'muted' as const } : r.best.overall >= V.SCORE_PASS ? { label: `Proven · ${r.best.overall}`, tone: 'ok' as const } : { label: `Taken · ${r.best.overall}`, tone: 'warn' as const }; };
function CaseRow({ c, p, href }: { c: TrainingCase; p: Progress; href: string }) {
  const s = caseState(p, c);
  return <ListRow title={c.short} sub={<>{c.complaint}<span className="wk-r__m">{c.domain} · {c.minutes} min · {c.severity} · {c.state.toLowerCase().replace('_', ' ')}</span></>} href={href} chevron leading={<Icon name="room" />} trailing={<Chip small tone={s.tone}>{s.label}</Chip>} testId={`case-${c.id}`} />;
}

// ------------------------------------------------------------------------------------------------------------ #/learn
export function LearnHome({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const [p] = useProgress(); const { lib } = useLib();
  const cases = trainingCases(w); const labs = Object.values(loadLabs().results).filter((r) => r.persona === persona && r.passed).length;
  const R = readinessOf(w, persona, p, labs); const comps = competencyEvidence(w, p);
  const storyDone = Object.values(p.story).reduce((a, s) => a + Object.keys(s).length, 0);
  const firstOpen = cases.find((c) => !p.runs[c.id]);
  const designPassed = V.DESIGN_LESSONS.filter((l) => (p.design[l.id]?.right ?? 0) >= Math.ceil((p.design[l.id]?.of ?? 1) * 0.6) && p.design[l.id]).length;
  const flagged = allRecords().filter((r) => r.findings.some((f) => f.severity === 'High') || r.counts.failed > 0).length;
  const ratings = (() => { const runs = Object.values(p.runs); return V.SCORE_DIMS.map(([k, l, q]) => ({ k, l, q, v: runs.length ? Math.round(runs.reduce((a, r) => a + (r.first.score[k] || 0), 0) / runs.length) : null })); })();
  const proven = Object.entries(p.runs).filter(([, r]) => r.best.overall >= V.SCORE_PASS).map(([id]) => caseById(w, id)).filter((c): c is TrainingCase => !!c);
  const domains = lib ? lib.lessonDomains : []; const domainPct = (d: string) => { if (!lib) return 0; const ids = lib.drillOrder.filter((id) => lib.drills[id]?.domain === d); const ok = ids.filter((id) => w.training.some((t) => t.by === persona && t.drillId === id && t.correct)).length; return ids.length ? pct(ok, ids.length) : 0; };
  const nextDrill = lib?.drillOrder.find((id) => !w.training.some((t) => t.by === persona && t.drillId === id && t.correct));
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-home">
      <Head role={perspective} current="#/learn" title="Empathia Learn" lede={<>SIGNAL: the same Core that runs the estate, read as something to practise on. A case is a room’s own records; a score is evidence of how you reasoned. Acting as <b>{personaLabel(persona)}</b>.</>}
        actions={<><a className="ui-btn ui-btn--primary" href={firstOpen ? `#/learn/service/${firstOpen.id}` : '#/learn/service'}>{firstOpen ? `Service Mode: ${firstOpen.short}` : 'Service Mode'}</a><a className="ui-btn" href="#/learn/servicehands">ServiceHands Academy</a></>}
        aside={<ScoreRing value={R.next ? Math.round(((R.points - V.READINESS[R.index]![0]) / (R.next.at - V.READINESS[R.index]![0])) * 100) : 100} label={`Readiness: ${R.level[1]}, ${R.points} points`} caption={R.next ? `${R.next.need} points to ${R.next.name.toLowerCase()}` : 'the top level'} />} />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="learn-tiles">
        <StatTile label="Readiness" value={R.level[1]} icon="spark" tone="learn" hint={`${R.points} points${R.next ? ` · ${R.next.need} to ${R.next.name.toLowerCase()}` : ''}`} />
        <StatTile label="Cases proven" value={R.proven} unit={`of ${cases.length}`} icon="check" tone="ok" hint={`${R.taken} taken in Service Mode`} href="#/learn/service" />
        <StatTile label="Drills passed" value={R.drills} unit={lib ? `of ${lib.drillOrder.length + cases.length * 3}` : undefined} icon="layers" tone="info" hint="Short, and made from Core records" href="#/learn/practice" />
        <StatTile label="Story decisions" value={storyDone} unit={`of ${cases.length * 3}`} icon="play" tone="indigo" hint={storyDone ? 'from the room stories' : 'none taken yet'} href="#/learn/story" />
      </div>
      <p className="wk-note">Service Mode, the Labs, Lessons and the ServiceHands Academy all practise on the same records the engineers use.</p>
      <div className="wk-g3">
        <Card icon="check" tone="learn" title="Proven in the room" sub="Evidence from the cases you proved, recorded in this browser" testId="ln-proven">
          {proven.length ? <List label="Proven cases">{proven.map((c) => <ListRow key={c.id} title={c.short} sub={`${c.domain} · overall ${p.runs[c.id]!.best.overall}`} href={`#/learn/cases/${c.id}`} chevron leading={<Icon name="check" />} />)}</List>
            : <EmptyState title="Nothing proven yet" icon="spark">Start an episode of SIGNAL, take its problem into a lab or Service Mode, and record what you changed.</EmptyState>}
        </Card>
        <Card icon="arrow-right" title="What to do next" sub={`Readiness: ${V.READINESS.map((r) => r[1]).join(' → ')}`}>
          <List label="Next steps">
            {firstOpen ? <ListRow title={`Service Mode: ${firstOpen.short}`} sub="A case you have not taken yet" href={`#/learn/service/${firstOpen.id}`} chevron leading={<Icon name="route" />} /> : null}
            {nextDrill && lib ? <ListRow title={`Drill: ${lib.drills[nextDrill]!.title}`} sub={`${lib.drills[nextDrill]!.domain} · not passed yet`} href="#/learn/practice" chevron leading={<Icon name="check" />} /> : null}
            <ListRow title="SIGNAL, season 1, episode 1: Sound check" sub="Separate what you observe from what you suspect" href="#/learn/signal/S1E1" chevron leading={<Icon name="spark" />} />
          </List>
          <p className="wk-note">{R.level[1]}: {R.level[2]}.</p>
        </Card>
        <Card icon="spark" tone="violet" title="Your SIGNAL path" sub="SIGNAL world · fiction · progress stays in this browser" testId="ln-signal-path">
          <ul className="kit-meters">{domains.slice(0, 6).map((d) => <MeterRow key={d} label={d} value={domainPct(d)} sub={`${lib!.drillOrder.filter((id) => lib!.drills[id]?.domain === d).length} drills`} state={domainPct(d) ? 'healthy' : 'modelled'} />)}</ul>
          <p className="wk-note">{domains.length ? `${domains.length} domains: ${domains.filter((d) => domainPct(d) >= 50).length} proficient or better.` : 'Loading the SIGNAL library…'} Learning signals, never a performance rating.</p>
        </Card>
      </div>
      <div className="wk-g3">
        <Card icon="room" title="Design clinic" sub={`${designPassed} of ${V.DESIGN_LESSONS.length} lessons passed`} action={<a href="#/learn/design">All eight lessons</a>}>
          <List label="Design lessons">{V.DESIGN_LESSONS.slice(0, 3).map((l, i) => <ListRow key={l.id} title={`${i + 1} · ${l.title}`} sub={l.sum} href={`#/learn/design/${l.id}`} chevron />)}</List>
          <p className="wk-note">{plural(flagged, 'room')} the design rules flag on the records, each one a drill.</p>
        </Card>
        <Card icon="chart" title="Six ratings" sub={Object.keys(p.runs).length ? `First attempts · ${plural(Object.keys(p.runs).length, 'case')}` : 'No run yet: they fill in after your first case in Service Mode'} testId="ln-ratings">
          <ul className="kit-meters">{ratings.map((r) => <MeterRow key={r.k} label={r.l} sub={r.q} value={r.v} state={r.v === null ? 'modelled' : r.v >= V.SCORE_PASS ? 'healthy' : r.v >= 50 ? 'monitor' : 'action'} />)}</ul>
          <p className="wk-note">The pass mark is {V.SCORE_PASS}. Ratings are read from the first attempt at each case, so practice improves you and not the record.</p>
        </Card>
        <Card icon="shield" title="Competencies" sub={`Evidenced by proven cases · ${comps.filter((c) => c.by.length).length} of ${comps.length}`} testId="ln-competencies">
          <ul className="kit-meters">{comps.map((c) => <MeterRow key={c.id} label={c.name} sub={c.by.length ? `proven in ${c.by.map((x) => x.short).join(', ')}` : `${plural(c.teach, 'case')} teach${c.teach === 1 ? 'es' : ''} it · none proven`} value={c.by.length ? 100 : 0} state={c.by.length ? 'healthy' : 'modelled'} />)}</ul>
        </Card>
      </div>
      <Card icon="book" title="Learn from a room" sub={`Case files · ${cases.length} rooms whose records hold an issue`} action={<a href="#/learn/cases">Case Files</a>} testId="learn-rooms">
        <List label="Rooms with a case">{cases.map((c) => <CaseRow key={c.id} c={c} p={p} href={`#/learn/cases/${c.id}`} />)}</List>
      </Card>
      <Card icon="route" title="How an incident becomes a lesson" sub="The path every case file walks" action={cases[0] ? <a href={`#/learn/cases/${cases.find((c) => c.roomId === 'R-BCN-3-225')?.id || cases[0].id}`}>See it for a room</a> : undefined}><Chain /></Card>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ #/learn/signal and episodes
const seasonCounts = (lib: Lib | null, n: number) => { const so = lib?.seasonOf || {}; const c = { lesson: 0, lab: 0, drill: 0, incident: 0 } as Record<string, number>; for (const [k, s] of Object.entries(so)) if (s === n) { const kind = k.split(':')[0]!; if (kind in c) c[kind]! += 1; } return c; };
export function SignalPage({ perspective }: { perspective: string }) {
  const { lib } = useLib(); const [p] = useProgress();
  const signals = useMemo(() => { const out: Record<string, number> = {}; for (const ep of V.SIGNAL_EPISODES) { const e = p.episodes[ep.id]; if (!e) continue; for (const s of ep.scenes) { const i = e.choices[s.id]; if (i !== undefined && s.choices?.[i]) for (const [k, v] of Object.entries(s.choices[i]![2])) out[k] = (out[k] || 0) + v; } } return out; }, [p]);
  const marks = Object.values(p.episodes).flatMap((e) => e.marks);
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-signal">
      <Head role={perspective} current="#/learn/signal" title="SIGNAL" lede="A story in twelve seasons. Maya starts as a new technician; what she becomes depends on what you decide." meta={[FICTION, <Chip key="m" small tone="muted">Story mode</Chip>, <Chip key="s" small tone="accent">Your choices stay in this browser</Chip>]}
        actions={<a className="ui-btn ui-btn--primary" href="#/learn/signal/S1E1">Start the story</a>} />
      <Card icon="spark" tone="violet" title="Season 1 · The Sanctuary · Episode 1: Sound check" sub={`${V.SIGNAL_EPISODES[0]!.objective} · ${V.SIGNAL_EPISODES[0]!.minutes} minutes`}><p className="ln-p">{V.SIGNAL_EPISODES[0]!.env}</p></Card>
      <div className="wk-g2">
        <Card icon="chart" title="Competency signals" sub="Read from what you decide in the story · learning signals, never a rating" testId="signal-signals">
          {Object.keys(signals).length ? <ul className="kit-meters">{Object.entries(signals).map(([k, v]) => <MeterRow key={k} label={k[0]!.toUpperCase() + k.slice(1)} value={Math.max(0, Math.min(100, 50 + v * 10))} sub={`${v >= 0 ? '+' : ''}${v} from your decisions`} state={v >= 0 ? 'healthy' : 'action'} />)}</ul> : <EmptyState title="Nothing yet" icon="spark">Each decision in an episode moves one or more of these signals.</EmptyState>}
        </Card>
        <Card icon="book" title="The story remembers" sub="Later scenes change because of these">
          {marks.length ? <div className="ln-tags">{marks.map((m) => <Chip key={m} small tone="muted">{m.replace(/-/g, ' ')}</Chip>)}</div> : <EmptyState title="Nothing yet" icon="book">Some choices are remembered, and come back.</EmptyState>}
        </Card>
      </div>
      <Card icon="layers" title="Twelve seasons" sub="Each season is a place, a way of thinking, and the practice that goes with it" testId="signal-seasons">
        <ol className="ln-seasons">{V.SIGNAL_SEASONS.map(([n, name, level, sum, thinking]) => { const eps = V.SIGNAL_EPISODES.filter((e) => e.season === n); const played = eps.filter((e) => p.episodes[e.id]?.done).length; const c = seasonCounts(lib, n); return (
          <li key={n} className="ln-season"><span className="ln-season__n">{n}</span><div><b>{name}</b> <span className="ui-meta">{level} · {thinking}</span><p>{sum}</p>
            <span className="ui-meta">{eps.length ? `${played} of ${eps.length} authored episodes played` : 'Outlined'}{lib ? ` · ${plural(c.lesson!, 'lesson')} · ${plural(c.lab!, 'lab')} · ${plural(c.drill!, 'drill')} · ${plural(c.incident!, 'incident')}` : ''}</span>
            {eps.length ? <div className="ln-tags">{eps.map((e) => <Chip key={e.id} small href={`#/learn/signal/${e.id}`} tone={p.episodes[e.id]?.done ? 'ok' : undefined}>{`E${e.n} · ${e.title}`}</Chip>)}</div> : null}</div></li>); })}</ol>
      </Card>
      <Card icon="user" title="The people" sub="Recurring characters, with the flaws that make them useful">
        <div className="ln-cast">{V.SIGNAL_CAST.map(([name, role, motto, strength, flaw1, flaw2, quirk]) => <article key={name} className="ln-person"><span className="ln-ava" aria-hidden="true">{name[0]}</span><div><b>{name}</b><p className="ui-meta">{role}</p><p>“{motto}”</p><p className="ui-meta">Strength: {strength}. Flaws: {flaw1}; {flaw2.toLowerCase()}. {quirk}.</p></div></article>)}</div>
      </Card>
    </section>
  );
}
const EV_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'muted'> = { VERIFIED: 'ok', MEASURED: 'ok', OBSERVED: 'info', INFERRED: 'info', SUSPECTED: 'warn', ESCALATED: 'muted', CONTRADICTED: 'bad', UNKNOWN: 'muted' };
export function EpisodePage({ perspective, params }: { perspective: string; params: Record<string, string> }) {
  const persona = personaOf(perspective);
  const ep = V.SIGNAL_EPISODES.find((e) => e.id === params.ep);
  const [p, setP] = useProgress();
  const st = ep ? p.episodes[ep.id] || { choices: {}, done: false, marks: [] } : null;
  const [at, setAt] = useState<string>(() => ep?.scenes[0]!.id || 'a');
  const [cls, setCls] = useState<Record<string, string>>({});
  if (!ep || !st) return <section className="wk ln"><Head role={perspective} current="#/learn/signal" title="Episode not found" lede="This episode is outlined, not authored. The authored episodes are listed on the SIGNAL page." meta={[FICTION]} /><a className="ui-btn" href="#/learn/signal">All seasons</a></section>;
  const season = V.SIGNAL_SEASONS.find((s) => s[0] === ep.season)!;
  const idx = ep.scenes.findIndex((s) => s.id === at); const scene: Scene = ep.scenes[Math.max(0, idx)]!;
  const choose = (i: number) => { const ch = scene.choices![i]!; setP(record(persona, 'training.signal_decision', ep.id, `SIGNAL ${ep.id} scene ${scene.id}: ${ch[0]}`, (x) => { const e = (x.episodes[ep.id] ||= { choices: {}, done: false, marks: [] }); e.choices[scene.id] = i; if (!e.marks.includes(ch[3])) e.marks.push(ch[3]); })); };
  const chosen = st.choices[scene.id];
  const nextId = chosen !== undefined && scene.choices ? scene.choices[chosen]![4] : ep.scenes[idx + 1]?.id;
  const finish = () => setP(record(persona, 'training.signal_episode', ep.id, `SIGNAL ${ep.id} “${ep.title}” played to the end`, (x) => { (x.episodes[ep.id] ||= { choices: {}, done: false, marks: [] }).done = true; }));
  const clues = ep.scenes.flatMap((s) => s.evidence || []); const found = clues.filter(([t]) => cls[t]).length;
  const memo = (m?: Record<string, string>) => m ? Object.entries(m).filter(([k]) => st.marks.includes(k)).map(([, v]) => v) : [];
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-episode">
      <Head role={perspective} current="#/learn/signal" crumbs={[['Empathia Learn', '#/learn'], ['SIGNAL', '#/learn/signal'], [`Season ${ep.season}`, '#/learn/signal'], [`Episode ${ep.n}`]]} title={ep.title} lede={ep.objective} meta={[FICTION, <Chip key="s" small tone="muted">Season {ep.season} · {season[1]}</Chip>, <Chip key="m" small tone="muted">{ep.minutes} minutes</Chip>, ...(ep.boss ? [<Chip key="b" small tone="warn">Boss level</Chip>] : [])]} />
      <div className="wk-g2 wk-g2--wide">
        <Card icon="play" tone="violet" title={scene.beat.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} sub={`Scene ${idx + 1} of ${ep.scenes.length}${scene.speaker ? ` · ${scene.speaker}` : ''}${scene.timer ? ` · ${scene.timer} s to decide` : ''}`} testId="episode-scene">
          <p className="ln-scene">{scene.text}</p>
          {memo(scene.callback).map((t) => <Notice key={t} tone="info">{t}</Notice>)}{memo(scene.memoryText).map((t) => <Notice key={t} tone="info">{t}</Notice>)}
          {scene.evidence ? <div className="ln-evq"><p className="ui-meta">Classify each statement: what do you actually know?</p>{scene.evidence.map(([t, truth]) => <div key={t} className="ln-evq__row"><span>{t}</span><div className="ln-tags" role="group" aria-label={`Classify: ${t}`}>{['OBSERVED', 'SUSPECTED', 'MEASURED', 'INFERRED'].map((k) => <button key={k} type="button" className={`ui-btn ui-btn--sm${cls[t] === k ? ' ui-btn--primary' : ''}`} aria-pressed={cls[t] === k} onClick={() => setCls({ ...cls, [t]: k })}>{k.toLowerCase()}</button>)}</div>{cls[t] ? <Tag tone={cls[t] === truth ? 'ok' : 'warn'}>{cls[t] === truth ? 'right' : `it is ${truth.toLowerCase()}`}</Tag> : null}</div>)}</div> : null}
          {scene.choices ? <div className="ln-choices" role="group" aria-label="Your decision">{scene.choices.map((c, i) => <button key={c[0]} type="button" className={`ln-choice${chosen === i ? ' on' : ''}`} aria-pressed={chosen === i} disabled={chosen !== undefined && chosen !== i} onClick={() => chosen === undefined && choose(i)}><b>{c[0]}</b>{chosen === i ? <span>{c[1]}</span> : null}</button>)}</div> : null}
          {scene.reflect ? <Notice tone="info">You classified {found} of {clues.length} statements in this episode{found ? `, ${clues.filter(([t, s]) => cls[t] === s).length} as the record has them` : ''}.</Notice> : null}
          <div className="ui-row">
            {idx > 0 ? <Button small onClick={() => setAt(ep.scenes[idx - 1]!.id)}>Back</Button> : null}
            {scene.cliff || !nextId ? <Button kind="primary" small onClick={finish} testId="episode-finish">{st.done ? 'Played · record kept' : 'Finish the episode'}</Button>
              : <Button kind="primary" small disabled={!!scene.choices && chosen === undefined} onClick={() => setAt(nextId)} testId="episode-next">Continue</Button>}
          </div>
        </Card>
        <div className="stack">
          <Card icon="search" title="Casebook" sub={`${found} of ${clues.length} clues classified`}><ProgressBar value={found} max={Math.max(1, clues.length)} label="Clues classified" /></Card>
          <Card icon="layers" title="Take it into the room" sub="Story → decision → room → experiment → prove → resume">
            <p className="ln-p">{ep.id === 'S1E1' ? 'The back of the hall says “muddy again”. Bring the presence band up, or take the low end out with the high-pass, and listen for the consonants.' : 'Take the episode’s problem into the matching lab and prove what you changed.'}</p>
            <a className="ui-btn" href={ep.id === 'S1E1' ? '#/learn/labs/hear' : '#/learn/labs'}>Enter the lab</a>
          </Card>
          <a className="ui-btn" href="#/learn/signal">All seasons</a>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ #/learn/story: a room's history with three decisions
const STAGE_OF: Array<[RegExp, string]> = [[/design_created/, 'Request and design'], [/classification_approved/, 'Requirements'], [/revision_saved/, 'Design revision'], [/→ DESIGN_APPROVED/, 'Approval'], [/→ INSTALLATION_PENDING|→ INSTALLED_UNVERIFIED/, 'Build'], [/→ COMMISSIONING/, 'Commissioning'], [/→ ACCEPTED/, 'Baseline and acceptance'], [/issue\.opened|asset_replaced|exception/, 'Issue']];
function storyPanels(r: RoomRecord) {
  const evs = [...r.events].reverse(); const out: Array<{ stage: string; at: string; text: string; by: string }> = [];
  for (const e of evs) { const st = STAGE_OF.find(([re]) => re.test(`${e.type} ${e.detail}`)); if (st && !out.some((o) => o.stage === st[1])) out.push({ stage: st[1], at: e.at, text: e.detail, by: e.by }); }
  const cur = r.baselines.find((b) => b.state === 'CURRENT'); if (cur && !out.some((o) => o.stage === 'Baseline and acceptance')) out.push({ stage: 'Baseline and acceptance', at: cur.at, text: `baseline v${cur.version}: ${cur.note}`, by: cur.by || '—' });
  out.push({ stage: 'Where it is now', at: r.events[0]?.at || '', text: `${r.lifecycle.toLowerCase().replace(/_/g, ' ')} · ${r.counts.verified} of ${r.counts.applicable} applicable tests verified${r.nextStep?.blockers[0] ? ` · next step refused: ${r.nextStep.blockers[0]}` : ''}`, by: 'engine' });
  return out.slice(0, 8);
}
function storyDecisions(c: TrainingCase) {
  const r = c.room; const notTested = r.counts.notTested; const pend = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE');
  return [
    { id: 'd1', q: `${c.short} reached commissioning with ${plural(r.counts.applicable, 'applicable test')}. ${notTested ? `${notTested} are not tested yet.` : 'All were recorded.'} Do you accept the room?`,
      o: ['Accept it: the room works', 'Hold acceptance until every applicable test passes and is independently verified', 'Accept it with a note for later'], a: 1, why: 'The engine refuses acceptance until every applicable test is executed, passed and independently verified with evidence (its rule, in the room’s own refusals).' },
    { id: 'd2', q: `The report reads “${c.complaint}”. Where do you look first?`, o: c.hops.map((h) => h.label), a: c.cause, why: `The record ties the issue to ${c.hops[c.cause]?.devices.map((d) => d.label).join(', ') || 'this stage'}: the ${c.hops[c.cause]?.label.toLowerCase()} stage of the ${c.domain.toLowerCase()} path.` },
    { id: 'd3', q: 'Who owns the fix?', o: [V.OWNER_SAYS.own![0], V.OWNER_SAYS.design![0], V.OWNER_SAYS.vendor![0]], a: c.owner === 'design' ? 1 : 0, why: (c.owner === 'design' ? V.OWNER_SAYS.design! : V.OWNER_SAYS.own!)[1] + (pend ? ` A new baseline (v${pend.version}) waits for acceptance; v${pend.version - 1} stays current until then.` : '') },
  ];
}
export function StoryPage({ perspective, params }: { perspective: string; params: Record<string, string> }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const [p, setP] = useProgress();
  const cases = trainingCases(w); const c = params.room ? caseById(w, params.room) : null;
  if (!c) return (
    <section className="wk ln" data-native="workspace" data-testid="learn-story">
      <Head role={perspective} current="#/learn/story" title="Room story" lede="A room’s history, told from its own records, with three decisions left to you." />
      <Card icon="room" title="Choose a room" sub={`${cases.length} rooms · eight panels each`}><List label="Rooms">{cases.map((x) => <ListRow key={x.id} title={x.short} sub={x.complaint} href={`#/learn/story/${x.roomId}`} chevron leading={<Icon name="room" />} trailing={<Chip small tone={p.story[x.roomId] && Object.keys(p.story[x.roomId]!).length === 3 ? 'ok' : 'muted'}>{p.story[x.roomId] ? `${Object.keys(p.story[x.roomId]!).length} of 3 decided` : 'New'}</Chip>} />)}</List></Card>
    </section>);
  const panels = storyPanels(c.room); const ds = storyDecisions(c); const mine = p.story[c.roomId] || {};
  const decide = (d: typeof ds[number], i: number) => setP(record(persona, 'training.story_decision', c.roomId, `Room story ${c.short} ${d.id}: ${d.o[i]} (${i === d.a ? 'as the record supports' : 'not what the record supports'})`, (x) => { (x.story[c.roomId] ||= {})[d.id] = i; }));
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-story-room">
      <Head role={perspective} current="#/learn/story" crumbs={[['Empathia Learn', '#/learn'], ['Room story', '#/learn/story'], [c.short]]} title={`The story of ${c.short}`} lede={<>{c.room.outline.name} · {c.room.archetypeName}. Told from {plural(c.room.events.length, 'record')}; nothing here is written by hand.</>} />
      <ol className="ln-panels" aria-label="Eight panels">{panels.map((x, i) => <li key={x.stage + i} className="ln-panel"><span className="ln-panel__n">{i + 1}</span><b>{x.stage}</b><span className="ui-meta">{x.at.slice(0, 10)} · {x.by.replace(/_/g, ' ')}</span><p>{x.text}</p></li>)}</ol>
      <Card icon="check" title="Three decisions" sub={`${Object.keys(mine).length} of 3 taken · each judged against the record`} testId="story-decisions">
        {ds.map((d) => <div key={d.id} className="ln-dec"><p><b>{d.q}</b></p><div className="ln-choices" role="group" aria-label={d.q}>{d.o.map((o, i) => <button key={o} type="button" className={`ln-choice${mine[d.id] === i ? ' on' : ''}`} aria-pressed={mine[d.id] === i} disabled={mine[d.id] !== undefined} onClick={() => decide(d, i)}><b>{o}</b></button>)}</div>
          {mine[d.id] !== undefined ? <Notice tone={mine[d.id] === d.a ? 'ok' : 'warn'}>{mine[d.id] === d.a ? 'As the record supports. ' : `The record supports “${d.o[d.a]}”. `}{d.why}</Notice> : null}</div>)}
      </Card>
      <div className="ui-row"><a className="ui-btn" href={`#/replay/${c.roomId}`}>Replay the room</a><a className="ui-btn" href={`#/learn/cases/${c.id}`}>Its case file</a><a className="ui-btn" href={`#/learn/service/${c.id}`}>Take it in Service Mode</a></div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ room drills (Practice): three kinds made from every training case
export function roomDrills(c: TrainingCase): Array<{ kind: string; title: string; quiz: Quiz }> {
  const r = c.room; const pass = r.counts.verified; const other = trainingCases(S.load()).filter((x) => x.domain !== c.domain).flatMap((x) => x.tests).filter((t, i, a) => a.findIndex((y) => y.id === t.id) === i);
  const proving = c.tests.find((t) => t.result !== 'PASS_VERIFIED') || c.tests[0];
  const ev = [
    { q: `“${c.complaint}” — as ${c.source} records it. What is it?`, o: ['OBSERVED', 'MEASURED', 'VERIFIED', 'SUSPECTED'], a: /engine|design check|hypothesis/.test(c.source) ? 3 : 0, why: /engine|design check|hypothesis/.test(c.source) ? 'An engine design check is a modelled prediction until someone measures it: a suspicion with a reason.' : 'Somebody saw or heard it and wrote it down: observed, not yet measured.' },
    { q: `${pass} of ${r.counts.applicable} applicable tests passed and were independently verified. What is that evidence?`, o: ['INFERRED', 'VERIFIED', 'OBSERVED', 'UNKNOWN'], a: 1, why: 'Measured, then checked by a second person: the top of the ladder.' },
    { q: `The room’s geometry is ${r.outline.kind === 'reference' ? 'from the design record' : 'modelled from its archetype'}. A sightline worked from it is…`, o: ['MEASURED', 'INFERRED', 'VERIFIED', 'CONTRADICTED'], a: 1, why: 'Worked out from other records, not measured in the room.' },
  ];
  const hops = c.hops.map((h) => h.label);
  const follow = hops.length > 2 ? [
    { q: `In ${c.short}'s ${c.domain.toLowerCase()} path, what comes straight after the ${hops[0]!.toLowerCase()}?`, o: [hops[1]!, ...hops.slice(2), 'Building power'].slice(0, 4), a: 0, why: `The path, from the room’s own positions: ${hops.join(' → ')}.` },
    { q: 'Where does the path end?', o: [hops[hops.length - 1]!, hops[0]!, hops[1]!].filter((x, i, a) => a.indexOf(x) === i), a: 0, why: `${hops.join(' → ')}.` },
  ] : [{ q: `What is the first stage of ${c.short}'s ${c.domain.toLowerCase()} path?`, o: [hops[0] || 'Room compute', 'Far end', 'Building power'], a: 0, why: hops.join(' → ') }];
  const prove = proving && other.length >= 3 ? [{ q: `Which applicable test of ${c.short} would prove the ${c.domain.toLowerCase()} fix?`, o: [proving.label, ...other.slice(0, 3).map((t) => t.label)], a: 0, why: `${proving.id} (${proving.pack || 'core'}) is applicable to this room and covers ${c.domain.toLowerCase()}; its result on record is ${proving.result.toLowerCase().replace(/_/g, ' ')}.` }] : [];
  const shuffle = (qs: Quiz['qs']) => qs.map((q, n) => { const k = (c.roomId.length + n) % q.o.length; const o = [...q.o.slice(k), ...q.o.slice(0, k)]; return { ...q, o, a: o.indexOf(q.o[q.a]!) }; });
  return [
    { kind: 'evidence', title: 'Name the evidence', quiz: { title: `Name the evidence · ${c.short}`, domain: c.domain, qs: shuffle(ev) } },
    { kind: 'signal', title: 'Follow the signal', quiz: { title: `Follow the signal · ${c.short}`, domain: c.domain, qs: shuffle(follow) } },
    ...(prove.length ? [{ kind: 'proves', title: 'Which check proves it?', quiz: { title: `Which check proves it? · ${c.short}`, domain: c.domain, qs: shuffle(prove) } }] : []),
  ];
}
export function PracticePage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w, apply } = useWorkspace(); const { lib, err } = useLib(); const [p, setP] = useProgress();
  const [kind, setKind] = useState<string | null>(null); const [sel, setSel] = useState<string | null>(null); const [room, setRoom] = useState<string | null>(null);
  const cases = trainingCases(w); const RD = cases.flatMap((c) => roomDrills(c).map((d) => ({ ...d, c, key: `${d.kind}:${c.id}` })));
  const kinds = [['evidence', 'Name the evidence'], ['signal', 'Follow the signal'], ['proves', 'Which check proves it?']] as const;
  const pick = RD.find((d) => d.key === room);
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-practice">
      <Head role={perspective} current="#/learn/practice" title="Practice" lede="Short drills. Every statement, path and requirement in them is a record in Core." />
      <LibGate lib={lib} err={err}>{(l) => (
        <Card icon="spark" tone="violet" title="SIGNAL drills" sub={`SIGNAL world · fiction · ${new Set(w.training.filter((t) => t.by === persona && t.correct).map((t) => t.drillId)).size} of ${l.drillOrder.length} passed · timed and failable`} testId="practice-kinds">
          <div className="ln-kinds">{DRILL_KINDS.map(([k, label]) => { const ids = l.drillOrder.filter((id) => l.drills[id]?.type === k); const ok = ids.filter((id) => w.training.some((t) => t.by === persona && t.drillId === id && t.correct)).length; return <button key={k} type="button" className={`ln-kind${kind === k ? ' on' : ''}`} aria-pressed={kind === k} onClick={() => { setKind(k); setSel(null); }}><b>{label}</b><span>{ok} of {ids.length}</span><ProgressBar value={ok} max={Math.max(1, ids.length)} label={`${label} passed`} small showValue={false} /></button>; })}</div>
          {kind ? <div className="svc__grid"><ul className="svc__list" data-testid="drills">{l.drillOrder.filter((id) => l.drills[id]?.type === kind).map((id) => <li key={id} className={id === sel ? 'on' : ''}><a href="#/learn/practice" onClick={(e) => { e.preventDefault(); setSel(id); }}><b>{l.drills[id]!.title}</b><span className="ui-meta">{l.drills[id]!.domain} · {l.drills[id]!.time}s{w.training.some((t) => t.by === persona && t.drillId === id && t.correct) ? ' · passed' : ''}</span></a></li>)}</ul>
            <div className="svc__detail">{sel ? <DrillRunner key={sel} d={l.drills[sel] as Drill} onDone={(ok, s) => apply((x) => { S.recordTraining(x, persona, sel, ok, s); return null; })} /> : <Notice tone="info">Pick a drill. A completion is recorded as training — it never grants authority.</Notice>}</div></div> : null}
        </Card>)}</LibGate>
      <div className="wk-g3">{kinds.map(([k, label]) => { const ds = RD.filter((d) => d.kind === k); const ok = ds.filter((d) => p.drills[d.key]).length; return (
        <Card key={k} icon="check" title={label} sub={`${ok} of ${ds.length} passed · ${plural(ds.length, 'drill')}, each on a different room`} testId={`practice-${k}`}>
          <List label={label}>{ds.map((d) => <ListRow key={d.key} title={d.c.short} sub={d.c.domain} onClick={() => setRoom(d.key)} current={room === d.key} trailing={<Chip small tone={p.drills[d.key] ? 'ok' : 'muted'}>{p.drills[d.key] ? 'Passed' : 'Not passed'}</Chip>} />)}</List>
        </Card>); })}
        <Card icon="room" title="Work the figures" sub={`${V.DESIGN_LESSONS.filter((x) => p.design[x.id]).length} of ${V.DESIGN_LESSONS.length} taken · in the Design clinic`}><List label="Figures">{V.DESIGN_LESSONS.map((x) => <ListRow key={x.id} title={x.title} href={`#/learn/design/${x.id}`} chevron trailing={p.design[x.id] ? <Chip small tone="ok">{p.design[x.id]!.right} of {p.design[x.id]!.of}</Chip> : undefined} />)}</List></Card>
      </div>
      {pick ? <Card icon="check" title={pick.quiz.title} sub="All right to pass" testId="room-drill"><QuizRunner key={pick.key} q={pick.quiz} onComplete={(s, t) => setP(record(persona, 'training.room_drill', pick.c.roomId, `${pick.title} on ${pick.c.short}: ${s} of ${t}`, (x) => { x.drills[pick.key] = x.drills[pick.key] || s === t; }))} /></Card> : null}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ #/learn/service: Service Mode
interface SignalIncident { id: string; title: string; domain: string; source: string; priority: string; page: string; brief: string; clock: number; deadline: string; briefing: string; opening: string; status: Record<string, { label: string; v: string; ok: string }>; trust: Record<string, number>; evidence: Record<string, { l: string; s: string }>; actions: SignalAction[]; win: { restored: string[]; proven: string[] }; outcomes: Record<string, string>; expert: string[]; rv?: string[] }
interface SignalAction { id: string; label: string; cost: number; text: string; why?: string; good?: boolean; gain?: string[]; lose?: string[]; set?: string[]; unset?: string[]; req?: string[]; hideIf?: string[]; hideUntil?: string[]; stop?: string; end?: string; status?: Record<string, string>; trust?: Record<string, number>; badges?: Array<[string, string]>; costIf?: Array<[string, number]>; calc?: { q: string; answer: number; unit: string; hint: string; penalty: number; tol: number } }
export function ServiceModePage({ perspective }: { perspective: string }) {
  const { w } = useWorkspace(); const { lib, err } = useLib(); const [p] = useProgress(); const cases = trainingCases(w);
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-service">
      <Head role={perspective} current="#/learn/service" title="Service Mode" lede="A call, a clock and ten things you can do. The room, the fault and the evidence are a room’s records in Core." />
      <LibGate lib={lib} err={err}>{(l) => { const order = l.incidentOrder || []; const inc = l.incidents || {}; const doms = [...new Set(order.map((id) => inc[id]!.domain))]; return (
        <Card icon="spark" tone="violet" title="SIGNAL incidents" sub={`SIGNAL world · fiction · ${Object.values(p.incidents).filter((x) => x === 'proven').length} of ${order.length} proven · each one on a clock`} testId="service-signal">
          <div className="ln-kinds">{doms.map((d) => { const ids = order.filter((id) => inc[id]!.domain === d); return <details key={d} className="ln-dom"><summary><b>{d}</b> <span className="ui-meta">{plural(ids.length, 'incident')} · {ids.filter((id) => p.incidents[id] === 'proven').length} proven</span></summary><List label={`${d} incidents`}>{ids.map((id) => <ListRow key={id} title={inc[id]!.title} sub={`${inc[id]!.priority} · ${inc[id]!.source}`} href={`#/learn/service/${id}`} chevron trailing={p.incidents[id] ? <Chip small tone={p.incidents[id] === 'proven' ? 'ok' : p.incidents[id] === 'partial' ? 'warn' : 'bad'}>{p.incidents[id]}</Chip> : undefined} />)}</List></details>; })}</div>
          <p className="wk-note">Work an incident the way the service desk does: symptoms, evidence, the first thing to try, and an escalation with facts.</p>
        </Card>); }}</LibGate>
      <MeltdownList />
      <Card icon="speaker" title="The bench · hear it, see it" sub="Six demos to try before you touch a live room: the ear, EQ and the analyser, compression, shutter and flicker, beams, colour temperature. Illustrative models — sound only when you press play, quietly." testId="service-bench"><Bench /></Card>
      <div className="wk-g2">
        <Card icon="menu" title="Ten actions" sub="Look, test, measure, escalate and six more: what each one does and what it costs on the clock">
          <ul className="ln-verbs">{V.SERVICE_VERBS.map(([k, l, wd]) => <li key={k}><b>{l}</b><span>{wd}</span><span className="ui-meta">{V.VERB_MIN[k]} min</span></li>)}</ul>
        </Card>
        <Card icon="room" title="Cases" sub={`${Object.keys(p.runs).length} of ${cases.length} taken`} testId="service-cases"><List label="Cases">{cases.map((c) => <CaseRow key={c.id} c={c} p={p} href={`#/learn/service/${c.id}`} />)}</List></Card>
      </div>
      <div className="wk-g2">
        <Card icon="layers" title="Eight evidence states" sub="How much weight each can carry: the ladder a finding climbs"><Ladder /></Card>
        <Card icon="chart" title="What is scored" sub={`Six ratings and their weights · pass mark ${V.SCORE_PASS}`}>
          <List label="Ratings">{V.SCORE_DIMS.map(([k, l, q, wt]) => <ListRow key={k} title={l} sub={<>{q}<span className="wk-r__m">{RULES[k]}</span></>} trailing={<b className="num">{Math.round(wt * 100)}%</b>} />)}</List>
        </Card>
      </div>
    </section>
  );
}
function Ladder() { return <ul className="ln-ladder">{V.EVIDENCE_LADDER.map(([s, m, wt]) => <li key={s}><Tag tone={EV_TONE[s]}>{s}</Tag><span>{m}</span><span className="ln-w" role="img" aria-label={`Weight ${wt} of 4`}>{[0, 1, 2, 3].map((i) => <i key={i} className={i < wt ? 'on' : ''} />)}</span></li>)}</ul>; }

export function ServiceRunPage({ perspective, params }: { perspective: string; params: Record<string, string> }) {
  const { w } = useWorkspace(); const { lib, err } = useLib();
  const id = params.id || ''; const tc = caseById(w, id);
  if (tc) return <CaseRun perspective={perspective} c={tc} />;
  return <LibGate lib={lib} err={err}>{(l) => { const inc = l.incidents?.[id]; return inc ? <IncidentRun perspective={perspective} inc={inc} /> : <NoCase perspective={perspective} id={id} current="#/learn/service" />; }}</LibGate>;
}
/** One room case on the clock: actions spend V2.5.3's minutes; diagnose commits to a stage; declare closes with a response. */
function CaseRun({ perspective, c }: { perspective: string; c: TrainingCase }) {
  const persona = personaOf(perspective); const [p, setP] = useProgress();
  const [log, setLog] = useState<string[]>([]); const [started, setStarted] = useState(false); const [cause, setCause] = useState<number | null>(null); const [resp, setResp] = useState<string | null>(null); const [done, setDone] = useState<ReturnType<typeof score> | null>(null);
  const used = minutesOf(log); const left = V.SERVICE_WINDOW - used; const r = c.room;
  const say: Record<string, string> = {
    inspect: `${c.devices.length ? c.devices.map((d) => `${d.label} (${d.identity.toLowerCase()})`).join(', ') : 'No device of this path is recorded'} — positions from the record; ${r.outline.kind === 'reference' ? 'surveyed' : 'modelled'} geometry.`,
    ask: `The people in the room repeat it: “${c.complaint}”. It was recorded as ${c.source}.`,
    measure: c.tests.length ? `${c.tests.filter((t) => t.result === 'PASS_VERIFIED').length} of ${c.tests.length} ${c.domain.toLowerCase()} tests passed and verified at commissioning; no live measurement exists in a synthetic record.` : 'There is no measurement of this path on record.',
    test: `${c.tests.slice(0, 3).map((t) => `${t.label}: ${t.result.toLowerCase().replace(/_/g, ' ')}`).join('; ') || 'No applicable test of this domain.'}`,
    trace: `${c.hops.map((h) => `${h.label}${h.devices.length ? ` (${h.devices.map((d) => d.code).join(', ')})` : ''}`).join(' → ')}.`,
    classify: `The fault is in the ${c.domain.toLowerCase()} path.`,
    diagnose: cause === null ? 'Choose the stage below.' : `You commit to: ${c.hops[cause]?.label}.`,
    repair: c.owner === 'design' ? 'This changes the design: it is not yours to change in the field.' : `A repair on ${c.hops[c.cause]?.label.toLowerCase()} is a documented procedure: yours to do.`,
    verify: `Retest against baseline v${r.baselines.find((b) => b.state === 'CURRENT')?.version ?? '—'}: the applicable tests of this path are run again.`,
    escalate: `${(c.owner === 'design' ? V.OWNER_SAYS.design! : V.OWNER_SAYS.own!).join(': ')}`,
  };
  const act = (v: string) => { if (v === 'diagnose' && cause === null) return; setLog([...log, v]); };
  const declare = () => { if (cause === null || !resp) return; const run = score(c, log.includes('diagnose') ? log : [...log, 'diagnose'], cause, resp); setDone(run);
    setP(record(persona, 'training.service_case', c.roomId, `Service Mode ${c.short}: overall ${run.overall} (${run.overall >= V.SCORE_PASS ? 'proven' : 'not proven'})`, (x) => { const prev = x.runs[c.id]; x.runs[c.id] = { first: prev?.first || run, best: !prev || run.overall > prev.best.overall ? run : prev.best, attempts: (prev?.attempts || 0) + 1 }; })); };
  const reset = () => { setLog([]); setCause(null); setResp(null); setDone(null); setStarted(true); };
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-case-run">
      <Head role={perspective} current="#/learn/service" crumbs={[['Empathia Learn', '#/learn'], ['Service Mode', '#/learn/service'], [c.short]]} title={c.short} lede={<>“{c.complaint}”</>}
        aside={<ScoreRing value={Math.max(0, left)} max={V.SERVICE_WINDOW} label={`${Math.max(0, left)} of ${V.SERVICE_WINDOW} minutes left`} caption={<><b>{Math.max(0, left)} min</b><br />left of {V.SERVICE_WINDOW}</>} band={left < 0 ? 'action' : left < 15 ? 'monitor' : 'healthy'} />} />
      <div className="wk-g2 wk-g2--wide">
        <Card icon="bell" title="The call" sub={`${c.severity} severity · ${r.archetypeName}`}>
          <p className="ln-p">{c.complaint}. Noted in {fullName(r.outline)}, on {c.devices[0]?.label.toLowerCase() || 'the room'}; source: {c.source}.</p>
          <p className="ln-p">You have a {V.SERVICE_WINDOW}-minute window before the next session. Every action takes time. Some actions are not yours to take. Close the call by declaring what is true.</p>
          {!started ? <div className="ui-row"><Button kind="primary" onClick={() => setStarted(true)} testId="start-clock">Start the clock</Button><a className="ui-btn" href={`#/learn/cases/${c.id}`}>Read the case file first</a></div> : null}
        </Card>
        <Card icon="book" title="What you can use" sub="Seven sources, all in Core"><ul className="ln-sources">{['Room model', 'Signal path', 'Commissioning result', 'Measurements', 'Issue', 'Standards', 'Device data'].map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul></Card>
      </div>
      {started && !done ? <>
        <Card icon="route" title="Ten actions" sub={`${used} of ${V.SERVICE_WINDOW} minutes used${left < 0 ? ' · over the window' : ''}`} testId="case-actions">
          <div className="ln-actions">{V.SERVICE_VERBS.map(([k, l, wd]) => <button key={k} type="button" className="ln-act" onClick={() => act(k)} disabled={k === 'diagnose' && cause === null}><b>{l}</b><span>{wd}</span><span className="ui-meta">{V.VERB_MIN[k]} min</span></button>)}</div>
          <div className="ln-dec"><p><b>Diagnose: where is the cause?</b></p><div className="ln-choices" role="group" aria-label="The stage you commit to">{c.hops.map((h, i) => <button key={h.key} type="button" className={`ln-choice${cause === i ? ' on' : ''}`} aria-pressed={cause === i} onClick={() => setCause(i)}><b>{h.label}</b><span className="ui-meta">{h.devices.map((d) => d.label).join(', ') || 'outside the room'}</span></button>)}</div></div>
        </Card>
        {log.length ? <Card icon="menu" title="What you did" sub={`${log.length} actions`}><ol className="ln-log">{log.map((v, i) => <li key={i}><b>{V.SERVICE_VERBS.find((x) => x[0] === v)?.[1]}</b> · {V.VERB_MIN[v]} min — {say[v]}</li>)}</ol></Card> : null}
        <Card icon="check" title="Declare" sub="Commit to a cause and a response; the call closes">
          <div className="ln-choices" role="group" aria-label="Your response">{RESPONSES(c).map((x) => <button key={x.key} type="button" className={`ln-choice${resp === x.key ? ' on' : ''}`} aria-pressed={resp === x.key} onClick={() => setResp(x.key)}><b>{x.label}</b></button>)}</div>
          <Button kind="primary" disabled={cause === null || !resp} onClick={declare} testId="declare">Declare and close the call</Button>{cause === null || !resp ? <p className="ui-meta">Choose a stage under Diagnose and a response first.</p> : null}
        </Card>
      </> : null}
      {done ? <Card icon="chart" tone={done.overall >= V.SCORE_PASS ? 'ok' : 'warn'} title={`Overall ${done.overall} · ${done.overall >= V.SCORE_PASS ? 'proven' : 'not proven'}`} sub={`Pass mark ${V.SCORE_PASS} · ${minutesOf(done.log)} of ${V.SERVICE_WINDOW} minutes`} testId="case-score">
        <ul className="kit-meters">{V.SCORE_DIMS.map(([k, l]) => <MeterRow key={k} label={l} value={done.score[k] ?? 0} sub={RULES[k]} state={(done.score[k] ?? 0) >= V.SCORE_PASS ? 'healthy' : (done.score[k] ?? 0) >= 50 ? 'monitor' : 'action'} />)}</ul>
        <Notice tone="info">The record places the cause at <b>{c.hops[c.cause]?.label}</b>{c.hops[c.cause]?.devices.length ? ` (${c.hops[c.cause]!.devices.map((d) => d.label).join(', ')})` : ''}; the fix is {c.owner === 'design' ? 'an engineering decision' : 'a documented repair, proved against the baseline'}. First attempt kept: {p.runs[c.id]?.first.overall ?? done.overall}.</Notice>
        <div className="ui-row"><Button onClick={reset}>Take it again</Button><a className="ui-btn" href={`#/learn/cases/${c.id}`}>How it became a better operation</a></div>
      </Card> : null}
    </section>
  );
}
/** A SIGNAL incident, run on its own rules (the library's actions: cost, requirements, evidence gained and lost, status and trust). */
function IncidentRun({ perspective, inc }: { perspective: string; inc: SignalIncident }) {
  // Since 11 Nov 2026 the shared runner on the reference's rules (packages/ui/src/incidents.ts), as the story uses it.
  const persona = personaOf(perspective); const [, setP] = useProgress(); const RANK = { fail: 0, partial: 1, proven: 2 } as const;
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-incident">
      <Head role={perspective} current="#/learn/service" crumbs={[['Empathia Learn', '#/learn'], ['Service Mode', '#/learn/service'], [inc.id]]} title={inc.title} lede={inc.page} meta={[FICTION, <Chip key="p" small tone="warn">{inc.priority}</Chip>, <Chip key="d" small tone="muted">{inc.domain}</Chip>]} />
      <IncidentRunner inc={{ ...inc } as unknown as Incidents.Incident} factor={1} onEnd={(o) => setP(record(persona, 'training.signal_incident', inc.id, `SIGNAL incident ${inc.id} “${inc.title}”: ${o}`, (x) => { const prev = x.incidents[inc.id]; x.incidents[inc.id] = prev && RANK[prev] > RANK[o] ? prev : o; }))} />
    </section>
  );
}

/** An address for a room (or an id) with no case: say what the record does hold, and where the cases are. */
function NoCase({ perspective, id, current }: { perspective: string; id: string; current: string }) {
  const { w } = useWorkspace(); const r = roomRecord(id.replace(/^TC-/, ''));
  return <section className="wk ln" data-testid="learn-nocase"><Head role={perspective} current={current} title={r ? `No case for ${shortName(r.outline)} yet` : 'Not a case on record'}
    lede={r ? <>{fullName(r.outline)} holds no issue on its record, so there is nothing to learn from yet. It is {r.lifecycle.toLowerCase().replace(/_/g, ' ')}: {r.counts.verified} of {r.counts.applicable} applicable tests verified{r.counts.notTested ? `, ${r.counts.notTested} not tested` : ''}.</> : `“${id}” is neither a room case nor a SIGNAL incident.`} />
    <Card icon="book" title="Rooms with a case" sub={plural(trainingCases(w).length, 'room')}><List label="Cases">{trainingCases(w).map((c) => <ListRow key={c.id} title={c.short} sub={c.complaint} href={`${current === '#/learn/service' ? '#/learn/service' : '#/learn/cases'}/${c.id}`} chevron />)}</List></Card></section>;
}

// ------------------------------------------------------------------------------------------------------------ #/learn/cases and a case file
const GENERALIZED: Array<[string, number]> = [['Find the echo', 3], ['Chase the dropout', 1], ['Trace the link', 4], ['Spot the drift', 3], ['Hear the back row', 10], ['Read the lifecycle', 8]];   // V2.5.3: name, root-cause index
export function CaseFilesPage({ perspective }: { perspective: string }) {
  const { w } = useWorkspace(); const [p] = useProgress(); const { lib, err } = useLib(); const cases = trainingCases(w);
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-cases">
      <Head role={perspective} current="#/learn/cases" title="Case Files" lede="Every room with an issue on its record has one. It is not written by hand: it is the room’s records, read as something to learn from." />
      <Card icon="route" title="Operations become learning"><Chain /></Card>
      <Card icon="room" title="Learn from a room" sub={plural(cases.length, 'room')}><List label="Rooms">{cases.map((c) => <CaseRow key={c.id} c={c} p={p} href={`#/learn/cases/${c.id}`} />)}</List></Card>
      <Card icon="layers" title="Generalized cases" sub="Patterns, not incidents: each from a root cause and its known fix">
        <List label="Generalized cases">{GENERALIZED.map(([n, ci]) => { const rc = V.ROOT_CAUSES[ci]; const kf = V.KNOWN_FIXES.find((k) => k[1] === ci); return <ListRow key={n} title={n} sub={<>{rc?.[0]}: {rc?.[1]}{kf ? <span className="wk-r__m">Known fix: {kf[0]} — {kf[2].join(' · ')}</span> : null}</>} leading={<Icon name="book" />} />; })}</List>
      </Card>
      <LibGate lib={lib} err={err}>{(l) => { const bySeason = new Map<number, string[]>(); for (const id of l.caseOrder) { const s = Number(/S(\d+)/.exec(l.cases[id]!.episode)?.[1] || 0); bySeason.set(s, [...(bySeason.get(s) || []), id]); } return (
        <Card icon="spark" tone="violet" title="SIGNAL case files" sub={`SIGNAL world · fiction · ${l.caseOrder.length} cases: what happened, why, how it was proven`} testId="signal-casefiles">
          {[...bySeason.entries()].sort((a, b) => a[0] - b[0]).map(([s, ids]) => <details key={s} className="ln-dom"><summary><b>Season {s}</b> <span className="ui-meta">{plural(ids.length, 'case')}</span></summary>{ids.map((id) => <SignalCase key={id} id={id} l={l} />)}</details>)}
        </Card>); }}</LibGate>
    </section>
  );
}
/** One SIGNAL case file, restored 12 Nov 2026 to the founder's build package (reference app.js renderCases / casePane / calcStep): one
 *  failure pattern seen three ways — Learn (what happened and why, with its check), Service (the live incident and drill), Engineer (the
 *  arithmetic behind the fix, step by step: a number and its unit, a hint, then the equation). */
interface CaseStep { prompt: string; answer: number; unit: string; units: string[]; tol?: number; hint: string; hint2?: string; why: string; unitWhy?: string; f?: string }
interface SignalCaseData { title: string; episode: string; chapter?: string; canon: boolean; incident?: string; hook: string; learn: string[]; quiz?: string; service: string; serviceDrill?: string; engineer: { intro: string; flag?: string; steps: CaseStep[]; drill?: string }; fb?: string }
function SignalCase({ id, l }: { id: string; l: Lib }) {
  const c = (l.cases as unknown as Record<string, SignalCaseData>)[id]!; const [tab, setTab] = useState<'learn' | 'service' | 'engineer'>('learn');
  const inc = c.incident ? l.incidents?.[c.incident] : undefined; const q = c.quiz ? l.quizzes[c.quiz] : undefined; const F = (l as unknown as { formulas?: Record<string, Fx> }).formulas;
  // the support ladder (reference ladder.js tierFor): the reader's setting, else the case's own tier, else Intermediate
  const [sp] = useState(() => Story.load().support); const tier = sp && sp !== 'auto' ? Number(sp) : (l as unknown as { tierOf?: Record<string, number> }).tierOf?.[`case:${id}`] ?? 2;
  const GLF = (l as unknown as { glossary?: Array<{ term: string; d: string; f?: string[] }> }).glossary || [];
  const ch = c.chapter ? (/^s\d\de\d\d$/i.test(c.chapter) ? c.chapter.toLowerCase() : null) : null;
  return <article className="ln-canon ln-case" data-case={id}>
    <p className="ln-case__pills"><Chip small tone="warn">{id}</Chip> <Chip small tone="muted">{c.episode}</Chip> <Chip small tone={c.canon ? 'ok' : 'muted'}>{c.canon ? 'Canonical' : 'SIGNAL adaptation'}</Chip></p>
    <b className="ln-case__t">{c.title}</b><p>{c.hook}</p>
    <div className="ln-tabs" role="tablist" aria-label={`${c.title}: perspective`}>{(['learn', 'service', 'engineer'] as const).map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="ui-btn ui-btn--quiet" onClick={() => setTab(k)} data-tab={k}>{k === 'learn' ? 'Learn' : k === 'service' ? 'Service' : 'Engineer'}</button>)}</div>
    {tab === 'learn' && <div className="stack" data-pane="learn">{c.learn.map((x, i) => <p key={i} className="learn__card" dangerouslySetInnerHTML={html(x)} />)}
      {c.fb && <p className="ui-meta">📒 From the Empathia Learn Fieldbook case study, {c.fb}. SIGNAL tells it as a story; the mechanism is the Fieldbook’s.</p>}
      {!c.canon && <p className="ui-meta">⚑ Q-004: {c.fb ? 'SIGNAL adaptation of a Fieldbook case — the owner should confirm it. Safety changes: FB-03.' : 'a SIGNAL original case (not from the Fieldbook) — subject-matter review before release.'}</p>}
      {q && <QuizRunner key={`${id}-q`} q={q} />}{ch && <p><a className="ui-btn ui-btn--quiet" href={`#/story/${ch}`}>Read the episode</a></p>}</div>}
    {tab === 'service' && <div className="stack" data-pane="service"><p className="learn__card"><b>Service perspective.</b> <span dangerouslySetInnerHTML={html(c.service)} /></p>
      {inc && <p>Incident {c.incident}: {inc.title} · clock {Math.floor(inc.clock / 60)}:{String(Math.ceil(inc.clock) % 60).padStart(2, '0')} <a className="ui-btn" href={`#/learn/service/${c.incident}`}>▶ Take the live incident</a></p>}
      {c.serviceDrill && <p className="ui-meta">Drill {c.serviceDrill} · <a href="#/learn/practice">run it in Practice</a></p>}</div>}
    {tab === 'engineer' && <div className="stack" data-pane="engineer"><p className="learn__card"><b>Engineer perspective.</b> <span dangerouslySetInnerHTML={html(c.engineer.intro)} /></p>
      {c.engineer.flag && <p className="ui-meta">⚑ {c.engineer.flag}</p>}
      <p className="ui-meta" data-testid="case-tier" data-tier={tier}>Support: {TIER_NAME[tier] || 'Intermediate'}{sp && sp !== 'auto' ? ' (your setting in Mission Control)' : ' (this case’s level)'}</p>
      {c.engineer.steps.map((st, i) => <CalcStep key={`${id}-${i}-${tier}`} id={`${id}-${i}`} s={st} fk={st.f} F={F || {}} tier={tier} terms={st.f ? GLF.filter((g) => g.f?.includes(st.f!)).slice(0, 2) : []} />)}
      {c.engineer.drill && <p className="ui-meta">Drill {c.engineer.drill} · <a href="#/learn/practice">run it in Practice</a></p>}</div>}
  </article>;
}
const TIER_NAME = ['', 'Beginner', 'Intermediate', 'Advanced', 'Mastery'];
interface Fx { name: string; eq: string; where?: Array<[string, string]>; note?: string; ex?: string; when?: string; opts?: string[] }
/** The formula scaffold by tier (reference ladder.js fxTier): Beginner the card, two terms and the worked example; Intermediate the card;
 *  Advanced the card on request; Mastery none. */
function FxScaffold({ F, tier, terms }: { F: Fx; tier: number; terms: Array<{ term: string; d: string }> }) {
  if (tier >= 4) return <p className="ui-meta" data-testid="case-fx-mastery">🎯 Mastery: nobody hands you the formula. The Fieldbook has the reference.</p>;
  const card = <div className="ln-calc__f" data-testid="case-fx"><p><span className="ui-meta">ƒ {F.name}</span> <span dangerouslySetInnerHTML={html(F.eq)} /></p>
    {tier <= 1 && terms.length > 0 && <dl className="lt-dl">{terms.map((g) => <Fragment key={g.term}><dt>{g.term}</dt><dd>{g.d}</dd></Fragment>)}</dl>}
    {F.where && F.where.length > 0 && <p className="ui-meta" dangerouslySetInnerHTML={html(F.where.map(([k, v]) => `${k}: ${v}`).join(' · '))} />}
    {tier <= 1 && F.ex && <p className="ui-meta"><b>Worked example.</b> {F.ex}</p>}</div>;
  return tier === 3 ? <details className="ln-calc__ask"><summary>ƒ Formula available — ask for it</summary>{card}</details> : card;
}
/** One step of the arithmetic (reference calcStep): the number and its unit are both checked; the second miss shows the equation. A step
 *  with a formula follows the support ladder; at Mastery the answer stays locked until the right relationship is chosen (reference fxGate). */
function CalcStep({ id, s, fk, F, tier, terms }: { id: string; s: CaseStep; fk?: string; F: Record<string, Fx>; tier: number; terms: Array<{ term: string; d: string }> }) {
  const f = fk ? F[fk] : undefined; const gate = tier >= 4 && !!f?.opts && f.opts.filter((k) => F[k]).length >= 2;
  const [chose, setChose] = useState(false); const [wrong, setWrong] = useState<string[]>([]); const ready = !gate || chose;
  const [v, setV] = useState(''); const [u, setU] = useState(s.units[0]!); const [tries, setTries] = useState(0); const [fb, setFb] = useState<{ ok: boolean; t: string } | null>(null); const [work, setWork] = useState(false);
  const check = () => { const n = parseFloat(v.replace(',', '.')); if (Number.isNaN(n)) { setFb({ ok: false, t: 'Enter a number first.' }); return; } const t = tries + 1; setTries(t);
    const okN = Math.abs(n - s.answer) <= (s.tol ?? Math.abs(s.answer) * 0.03 + 1e-9), okU = u === s.unit;
    setFb(okN && okU ? { ok: true, t: `✓ Correct: ${s.answer} ${s.unit}. ${s.why}` } : okN ? { ok: false, t: `✕ Right number, wrong unit. A number without the right unit is a different quantity. ${s.unitWhy || ''}` } : { ok: false, t: `✕ Not yet. ${t >= 2 ? (s.hint2 ? 'The equation is shown below.' : s.hint) : s.hint}` });
    if ((okN && okU) || t >= 2) setWork(true); };
  return <div className="ln-calc" data-step={id} data-ok={fb?.ok ?? ''}>
    <label htmlFor={`calc-${id}`}>{s.prompt}</label>
    {f && !gate && <FxScaffold F={f} tier={tier} terms={terms} />}
    {gate && f && <div className="stack" data-testid="case-fx-choose"><p className="lab__k">🎯 Mastery · which relationship do you need? Choose it, then solve.</p>
      <div className="dr__chips" role="group" aria-label="Which relationship">{f.opts!.filter((k) => F[k]).map((k) => <button key={k} type="button" className="dr__chip" data-f={k} data-right={k === fk ? (chose ? 'true' : undefined) : wrong.includes(k) ? 'false' : undefined} aria-pressed={chose && k === fk} disabled={chose || wrong.includes(k)} onClick={() => { if (k === fk) setChose(true); else setWrong([...wrong, k]); }}>{F[k]!.name}</button>)}</div>
      <p className="ui-meta" aria-live="polite" data-testid="case-fx-why">{chose ? `✓ ${f.when || 'That’s the one.'}` : wrong.length ? `✕ Not this one — ${F[wrong[wrong.length - 1]!]?.when || ''} Think about what the problem gives you and what it asks for.` : ''}</p></div>}
    <div className="ln-calc__row"><input id={`calc-${id}`} inputMode="decimal" autoComplete="off" placeholder={ready ? 'number' : 'choose the relationship first'} disabled={!ready} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ready) check(); }} />
      <select aria-label="Unit" value={u} disabled={!ready} onChange={(e) => setU(e.target.value)}>{s.units.map((x) => <option key={x} value={x}>{x}</option>)}</select>
      <Button onClick={check} disabled={!ready}>Check</Button><Button kind="quiet" onClick={() => setWork(!work)}>{work ? 'Hide the equation' : 'Show the equation'}</Button></div>
    <p aria-live="polite" className={fb ? (fb.ok ? 'ln-calc__ok' : 'ln-calc__no') : undefined}>{fb?.t}</p>
    {work && <p className="ui-meta ln-calc__w">{s.hint2 || s.hint}</p>}
  </div>;
}
export function CaseFilePage({ perspective, params }: { perspective: string; params: Record<string, string> }) {
  const { w } = useWorkspace(); const [p] = useProgress(); const c = caseById(w, params.id || '');
  const [open, setOpen] = useState(false);
  if (!c) return <NoCase perspective={perspective} id={params.id || ''} current="#/learn/cases" />;
  const r = c.room; const cur = r.baselines.find((b) => b.state === 'CURRENT'); const pend = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE');
  const drills = roomDrills(c); const kf = V.KNOWN_FIXES.find((k) => V.ROOT_CAUSES[k[1]]?.[0].toLowerCase().includes(c.domain === 'Audio' ? 'configuration' : c.domain === 'Network' ? 'network' : c.domain === 'Power' ? 'power' : 'firmware'));
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-casefile">
      <Head role={perspective} current="#/learn/cases" crumbs={[['Empathia Learn', '#/learn'], ['Case Files', '#/learn/cases'], [c.short]]} title={`Learn from ${c.short}`} lede={<>The learner receives: <b>“{c.complaint}.”</b></>}
        actions={<><a className="ui-btn ui-btn--primary" href={`#/learn/service/${c.id}`}>Service Mode · {c.minutes} minutes</a><a className="ui-btn" href={`#/learn/story/${c.roomId}`}>Story, with three decisions</a></>} />
      <nav className="wk-v25nav" aria-label={`${c.short} in`}>{[['Room', roomHref(r.outline)], ['Assurance', `#/assurance/room/${c.roomId}`], ['Commissioning', `#/commissioning/room/${c.roomId}`], ['Replay', `#/replay/${c.roomId}`]].filter(([, h]) => openable(perspective, h!)).map(([l, h]) => <Chip key={l} href={h} small icon="arrow-right">{l}</Chip>)}</nav>
      <Card icon="book" title="Available information" sub="Seven sources, all in Core" testId="casefile-sources">
        <div className="ln-src">
          <article><h3>Room model</h3><p><b>{fullName(r.outline)}</b></p><p className="ui-meta">{r.archetypeName} · seats {r.outline.capacity} · {r.outline.dims.join(' × ')} m ({r.outline.kind === 'reference' ? 'design record' : 'modelled'})</p><Chip small tone={r.lifecycle === 'COMMISSIONING' ? 'warn' : 'ok'}>{r.lifecycle.toLowerCase().replace(/_/g, ' ')}</Chip></article>
          <article><h3>Signal path</h3><ol className="ln-hops">{c.hops.map((h) => <li key={h.key}>{h.label}</li>)}</ol><p className="ui-meta">{c.domain} path through this room’s own positions.</p></article>
          <article><h3>Commissioning result</h3><p><b>{cur ? `Baseline v${cur.version}` : 'No baseline on record'}</b>{pend ? ` · v${pend.version} pending acceptance` : ''}</p><p className="ui-meta">{r.counts.verified} of {r.counts.applicable} applicable tests verified · {r.counts.failed} failed · {r.counts.notTested} not tested</p></article>
          <article><h3>Measurements</h3>{c.tests.length ? <ul className="plain">{c.tests.slice(0, 4).map((t) => <li key={t.id}>{t.label} <Tag tone={t.result === 'PASS_VERIFIED' ? 'ok' : t.result.startsWith('FAIL') ? 'bad' : 'muted'}>{t.result.toLowerCase().replace(/_/g, ' ')}</Tag></li>)}</ul> : <p className="ui-meta">No measurement of this path is on record. The demonstration never invents a reading.</p>}</article>
          <article><h3>Issue</h3><p><b>{c.complaint}</b></p><p className="ui-meta">{c.issueId} · {c.source} · {c.severity} · {c.state.toLowerCase()}</p></article>
          <article><h3>Standards</h3><p className="ui-meta">{r.analysis.applicability.applicable} of {r.analysis.applicability.library} library tests applicable, in packs: {(r.analysis.applicability.packs || []).join(', ')}.</p><p className="ui-meta">{plural(c.tests.length, `${c.domain.toLowerCase()} test`)} on this path.</p></article>
          <article><h3>Device data</h3><ul className="plain">{c.devices.slice(0, 5).map((d) => <li key={d.code}>{d.label} <span className="ui-meta">{d.code} · {d.device} · identity {d.identity.toLowerCase()}</span></li>)}</ul>{!c.devices.length ? <p className="ui-meta">No device of this path is recorded.</p> : null}</article>
        </div>
        <p className="wk-note">The learner must reason. Nothing here says what the cause is: the records have to be read, compared and weighed.</p>
      </Card>
      <div className="wk-g2">
        <Card icon="check" title="Work the case" sub="Service Mode, the story and three drills on this room"><List label="Work the case">
          <ListRow title={`Service Mode · ${c.minutes} minutes`} sub={caseState(p, c).label} href={`#/learn/service/${c.id}`} chevron leading={<Icon name="route" />} />
          <ListRow title="Story, with three decisions" sub={`${Object.keys(p.story[c.roomId] || {}).length} of 3 decided`} href={`#/learn/story/${c.roomId}`} chevron leading={<Icon name="play" />} />
          {drills.map((d) => <ListRow key={d.kind} title={d.title} sub={p.drills[`${d.kind}:${c.id}`] ? 'Passed' : 'Not passed'} href="#/learn/practice" chevron leading={<Icon name="check" />} />)}
        </List></Card>
        <Card icon="spark" title="How it became a better operation" sub="Open it after you have worked the case: it names the cause">
          {!open ? <Button onClick={() => setOpen(true)} testId="reveal">Show the cause</Button> : <><Chain /><p className="ln-p">The record places the cause at the <b>{c.hops[c.cause]?.label.toLowerCase()}</b>{c.hops[c.cause]?.devices.length ? ` (${c.hops[c.cause]!.devices.map((d) => d.label).join(', ')})` : ''}. {(c.owner === 'design' ? V.OWNER_SAYS.design! : V.OWNER_SAYS.own!)[1]}</p>{kf ? <p className="ui-meta">The nearest known fix in the library: {kf[0]} — {kf[2].join(' · ')}.</p> : null}</>}
        </Card>
      </div>
      <div className="ui-row"><a className="ui-btn" href={`#/replay/${c.roomId}`}>Replay the room</a><a className="ui-btn" href={roomHref(r.outline)}>Open the room</a></div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ #/learn/design and its lessons
const ROOM_FINDINGS = () => allRecords().filter((r) => r.findings.length || r.counts.failed).map((r) => ({ r, high: r.findings.filter((f) => f.severity === 'High').length, failed: r.counts.failed }));
export function DesignClinicPage({ perspective }: { perspective: string }) {
  const [p] = useProgress(); const flagged = ROOM_FINDINGS();
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-design">
      <Head role={perspective} current="#/learn/design" title="Design clinic" lede="Read a room the way an experienced AV designer does: the figures, the rules and the fix, worked on rooms in Core with the same engineering model Lite and Assurance use."
        meta={[...BADGES, <Chip key="m" small tone="warn">Modelled figures: for design comparison, not sign-off</Chip>]} />
      <Card icon="book" title="Eight lessons" sub="Each ends with figures to work out" testId="design-lessons">
        <ol className="ln-lessons">{V.DESIGN_LESSONS.map((l, i) => { const worked = roomsFor(l.rooms); const d = p.design[l.id]; return <li key={l.id}><a href={`#/learn/design/${l.id}`}><span className="ln-season__n">{i + 1}</span><span><b>{l.title}</b><span className="ln-p">{l.sum}</span><span className="ui-meta">{worked.length ? `Worked on ${worked.map((r) => shortName(r.outline)).join(', ')}` : 'A method lesson'}</span></span><Chip small tone={d ? (d.right / d.of >= 0.6 ? 'ok' : 'warn') : 'muted'}>{d ? `${d.right} of ${d.of}` : 'Not taken'}</Chip></a></li>; })}</ol>
      </Card>
      <div className="wk-g2">
        <Card icon="room" title="Rooms the rules flag" sub={`${plural(flagged.length, 'room')} with a design finding or a failed test on record`} testId="design-flagged">
          <List label="Flagged rooms">{flagged.map(({ r, high, failed }) => <ListRow key={r.outline.id} title={shortName(r.outline)} sub={<>{r.findings[0]?.title || 'a failed commissioning test'}<span className="wk-r__m">{plural(r.findings.length, 'finding')}{high ? ` · ${high} high` : ''}{failed ? ` · ${failed} failed test${failed > 1 ? 's' : ''}` : ''}</span></>} href={roomHref(r.outline)} chevron leading={<Icon name="room" />} />)}</List>
        </Card>
        <Card icon="layers" title="Three kinds of finding" sub="What each one is a fact about">
          <List label="Kinds of finding">
            <ListRow title="Simulated design deficiency" sub="Read from the drawing and the catalog: true wherever the design is built." trailing={<Chip small tone="info">{allRecords().reduce((a, r) => a + r.findings.filter((f) => f.category === 'DESIGN_DEFICIENCY').length, 0)} on record</Chip>} />
            <ListRow title="Predicted performance issue" sub="What the model expects people to experience." trailing={<Chip small tone="warn">{allRecords().reduce((a, r) => a + r.findings.filter((f) => f.category !== 'DESIGN_DEFICIENCY').length, 0)} on record</Chip>} />
            <ListRow title="Field-verified failure" sub="Measured or tested in the room: the measurement governs." trailing={<Chip small tone="bad">{allRecords().reduce((a, r) => a + r.counts.failed, 0)} on record</Chip>} />
          </List>
        </Card>
      </div>
      <Card icon="route" title="Design to assurance, end to end" sub="Build a Room takes a design through request, proposal, edit, approval, build and Assurance’s review"><p className="ln-p">Each step is a record you can open afterwards, and Reset demo removes them.</p>{openable(perspective, '#/v25/build') ? <a className="ui-btn" href="#/v25/build">Open Build a Room</a> : null}</Card>
    </section>
  );
}
/** "Work the figures": three to five questions per lesson, worked from the lesson's rooms as they stand in the records (dimensions,
 * positions, findings) and the materials table; every answer shows its working. */
function figures(id: string): Quiz['qs'] {
  const rooms = roomsFor(V.DESIGN_LESSONS.find((l) => l.id === id)?.rooms || []); const r = rooms[0] || roomRecord('R-ATL-4-218')!; const [wd, ln, h] = r.outline.dims;
  const opts = (v: number, d = 1) => { const f = (x: number) => Number(x.toFixed(d)); const o = [f(v), f(v * 1.5), f(v * 0.6), f(v * 2)]; return o.map(String); };
  const M = V.MATERIALS; const a500 = (k: string) => M[k]!.a[2]!;
  const vol = wd * ln * h; const floor = wd * ln; const walls = 2 * (wd + ln) * h;
  const A = floor * a500('carpet-tile') + floor * a500('tile') + walls * 0.8 * a500('wall') + walls * 0.2 * a500('glass'); const T = (0.161 * vol) / A;
  const cnt = (cat: string) => r.positions.filter((x) => x.cat === cat).length;
  const seats = r.positions.filter((x) => x.cat === 'chairs'); const disp = r.positions.find((x) => x.cat === 'display' || x.cat === 'ledwall' || x.cat === 'projector');
  const far = disp && seats.length ? Math.max(...seats.map((s) => Math.hypot(s.x - disp.x, s.y - disp.y))) : ln * 0.9;
  switch (id) {
    case 'review': return [
      { q: 'A room’s design score is 82 and one critical rule fails. Is a design review opened?', o: ['Yes: the score never cancels a critical failure', 'No: 82 is above the trigger', 'Only if two rules fail'], a: 0, why: `Rule DR-${V.PLACEHOLDERS.DR}: a score under ${V.PLACEHOLDERS.DR} or any one critical failure opens it.` },
      { q: `How many design findings does ${shortName(r.outline)} carry on its record?`, o: opts(r.findings.length, 0), a: 0, why: `${r.findings.map((f) => f.title).join('; ') || 'none'} — from the engine’s design check.` },
      { q: 'Rejecting a corrective action accepts a critical failure. How long must the explanation be?', o: [`${V.PLACEHOLDERS.JMAT} characters or more`, `${V.PLACEHOLDERS.JMIN} characters or more`, 'Any length'], a: 0, why: 'A material decision needs a reason code and a full explanation.' },
    ];
    case 'absorb': return [
      { q: `${shortName(r.outline)} is ${wd} × ${ln} m with a ${h} m ceiling. What is its volume (m³)?`, o: opts(vol, 0), a: 0, why: `${wd} × ${ln} × ${h} = ${vol.toFixed(0)} m³ (dimensions ${r.outline.kind === 'reference' ? 'from the design record' : 'modelled'}).` },
      { q: 'With carpet tile, a mineral tile ceiling, painted walls and 20 % glazing, what is the absorption at 500 Hz (m² sabins)?', o: opts(A, 1), a: 0, why: `Floor ${floor.toFixed(1)} m² × ${a500('carpet-tile')} + ceiling ${floor.toFixed(1)} × ${a500('tile')} + walls ${(walls * 0.8).toFixed(1)} × ${a500('wall')} + glass ${(walls * 0.2).toFixed(1)} × ${a500('glass')} = ${A.toFixed(1)}. The finishes are an assumption stated here; the record holds none.` },
      { q: 'Sabine’s decay at 500 Hz, T = 0.161 V ÷ A (seconds)?', o: opts(T, 2), a: 0, why: `0.161 × ${vol.toFixed(0)} ÷ ${A.toFixed(1)} = ${T.toFixed(2)} s.` },
      { q: 'Carpet tile at 500 Hz absorbs…', o: [a500('carpet-tile').toFixed(2), a500('carpet-heavy').toFixed(2), a500('panel').toFixed(2)], a: 0, why: 'Carpet is not acoustic treatment: it quietens footfall and the top of speech.' },
    ];
    case 'mics': return [
      { q: `${shortName(r.outline)} has ${cnt('micceil')} ceiling microphone(s) over ${floor.toFixed(0)} m². How much floor does each cover (m²)?`, o: opts(floor / Math.max(1, cnt('micceil')), 0), a: 0, why: `${floor.toFixed(0)} ÷ ${Math.max(1, cnt('micceil'))} = ${(floor / Math.max(1, cnt('micceil'))).toFixed(0)} m² — counted from the room’s positions.` },
      { q: 'What comes first when choosing room microphones?', o: ['Distance to the talker', 'Gain', 'The brand'], a: 0, why: 'Distance first, then directivity, mounting height and one echo reference. Gain comes last, if at all.' },
      { q: `How many delegate or table microphones does the record place?`, o: opts(cnt('mictable'), 0), a: 0, why: `${cnt('mictable')} positions of class “table microphone”.` },
    ];
    case 'sight': { const ih = 0.49 * 65 * 0.0254; return [
      { q: 'A 65-inch 16:9 image is how tall (m)?', o: opts(ih, 2), a: 0, why: `0.49 × 65 in × 0.0254 = ${ih.toFixed(2)} m.` },
      { q: `The farthest seat of ${shortName(r.outline)} is ${far.toFixed(1)} m from the display. At 8 image heights, how tall must the image be (m)?`, o: opts(far / 8, 2), a: 0, why: `${far.toFixed(1)} ÷ 8 = ${(far / 8).toFixed(2)} m — the distance from the room’s seat and display positions.` },
      { q: 'And the diagonal that gives that height (inches)?', o: opts(far / 8 / 0.49 / 0.0254, 0), a: 0, why: `${(far / 8).toFixed(2)} ÷ 0.49 ÷ 0.0254 = ${(far / 8 / 0.49 / 0.0254).toFixed(0)} in.` },
      { q: 'Where does the main camera belong?', o: ['On the display wall, where people look', 'Behind the seats', 'In a corner of the ceiling'], a: 0, why: 'A camera behind the seats sees the backs of heads.' },
    ]; }
    case 'lines': { const n = cnt('speaker'); return [
      { q: `${shortName(r.outline)} has ${n} loudspeaker(s), each tapped at 6 W on a 70 V line. What is the line load (W)?`, o: opts(n * 6, 0), a: 0, why: `${n} × 6 W = ${n * 6} W; taps add up on a constant-voltage line (the 6 W tap is this question’s assumption).` },
      { q: 'Four 8 Ω loudspeakers in parallel on a low-impedance amplifier present…', o: ['2 Ω', '8 Ω', '32 Ω', '4 Ω'], a: 0, why: '8 ÷ 4 = 2 Ω: impedances combine.' },
      { q: 'A networked loudspeaker is powered by…', o: ['The switch (PoE)', 'The 70 V line', 'Its own amplifier rack'], a: 0, why: 'None of that says the seats can hear: coverage is a separate check.' },
    ]; }
    case 'divisible': return [
      { q: 'A hall that splits in two is designed and commissioned as how many states?', o: ['Three: combined and each half', 'One', 'Two'], a: 0, why: 'Each state has its own routing, presets and tests.' },
      { q: 'With the partition closed, may a microphone in one half be heard in the other?', o: ['No: nothing may be heard across a closed partition', 'Yes, at a lower level', 'Only for announcements'], a: 0, why: 'Isolation is a commissioning test of the divided state.' },
    ];
    case 'tracking': return [
      { q: 'What decides when an automated shot moves?', o: ['Zones, hysteresis and dwell', 'The loudest voice only', 'A timer'], a: 0, why: 'Hysteresis and dwell stop the shot chasing every movement.' },
      { q: `How many cameras does ${shortName(r.outline)} place?`, o: opts(cnt('camera'), 0), a: 0, why: `${cnt('camera')} camera positions on record; the room’s state decides which are in it. Simulated here, never claimed as integration.` },
    ];
    default: return [
      { q: 'A designer edits a Room Builder proposal with a reason. What does the next proposal learn?', o: ['A rule adapted from the edit, with its reason', 'A retrained model', 'Nothing'], a: 0, why: 'Rule adaptation, not training: the edit and its reason are kept and shown.' },
      { q: 'May a rule adapted from one designer’s edit change other rooms silently?', o: ['No: it is proposed, shown and approved', 'Yes'], a: 0, why: 'Every adaptation is a record with its author.' },
    ];
  }
}
export function DesignLessonPage({ perspective, params }: { perspective: string; params: Record<string, string> }) {
  const persona = personaOf(perspective); const [p, setP] = useProgress();
  const i = V.DESIGN_LESSONS.findIndex((l) => l.id === params.lesson); const l = V.DESIGN_LESSONS[i];
  if (!l) return <section className="wk ln"><Head role={perspective} current="#/learn/design" title="No such lesson" lede="The Design clinic has eight lessons." /><a className="ui-btn" href="#/learn/design">Design clinic</a></section>;
  const worked = roomsFor(l.rooms); const next = V.DESIGN_LESSONS[i + 1]; const qs = figures(l.id);
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-design-lesson">
      <Head role={perspective} current="#/learn/design" crumbs={[['Empathia Learn', '#/learn'], ['Design clinic', '#/learn/design'], [`Lesson ${i + 1}`]]} title={l.title} lede={l.sum} meta={[...BADGES, <Chip key="n" small tone="muted">Lesson {i + 1} of {V.DESIGN_LESSONS.length}</Chip>, <Chip key="c" small tone="muted">Manual {l.chapter}</Chip>]} />
      <div className="wk-g2 wk-g2--wide">
        <Card icon="book" title="The lesson">{l.cards.map((c, k) => <p key={k} className="learn__card" dangerouslySetInnerHTML={html(fill(c))} />)}</Card>
        <div className="stack">
          <Card icon="room" title="Worked here" sub={worked.length ? `${plural(worked.length, 'room')} in Core` : 'A method lesson: no room needed'}>
            {worked.length ? <List label="Rooms">{worked.map((r) => <ListRow key={r.outline.id} title={shortName(r.outline)} sub={<>{r.outline.name}<span className="wk-r__m">{r.outline.dims.join(' × ')} m · {r.positions.filter((x) => !x.furniture).length} devices · {plural(r.findings.length, 'finding')}</span></>} href={roomHref(r.outline)} chevron />)}</List> : null}
            {l.rooms.length > worked.length ? <p className="ui-meta">{l.rooms.length - worked.length} of V2.5.3’s worked rooms are not among this demonstration’s thirty.</p> : null}
          </Card>
          <Card icon="check" title="Work the figures" sub={`${qs.length} questions, worked from the model as it stands now`} testId="design-figures">
            <QuizRunner key={l.id} q={{ title: `Work the figures · ${l.title}`, domain: 'Design', qs }} onComplete={(s, t) => setP(record(persona, 'training.design_lesson', l.id, `Design clinic “${l.title}”: ${s} of ${t}`, (x) => { const prev = x.design[l.id]; x.design[l.id] = !prev || s > prev.right ? { right: s, of: t } : prev; }))} />
            {p.design[l.id] ? <p className="ui-meta">Best so far: {p.design[l.id]!.right} of {p.design[l.id]!.of}.</p> : null}
          </Card>
          {next ? <a className="ui-btn" href={`#/learn/design/${next.id}`}>Next: {next.title}</a> : <a className="ui-btn" href="#/learn/design">Back to the clinic</a>}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ #/learn/fieldbook, #/learn/library
export function FieldbookPage({ perspective }: { perspective: string }) {
  const { lib, err } = useLib(); const [q, setQ] = useState(''); const [dom, setDom] = useState<string | null>(null);
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-fieldbook">
      <Head role={perspective} current="#/learn/fieldbook" title="Fieldbook" lede="The formulas the labs use, and the language of the trade: what each word means and where it comes from." meta={[FICTION]} />
      <LibGate lib={lib} err={err}>{(l) => { const doms = [...new Set(l.glossary.map((g) => g.dom))].sort(); 
        const terms = l.glossary.filter((g) => (!dom || g.dom === dom) && (!q || `${g.term} ${g.d}`.toLowerCase().includes(q.toLowerCase())));
        const formulas = Object.values(l.formulas).filter((f) => !q || `${f.name} ${f.eq}`.toLowerCase().includes(q.toLowerCase()));
        return <>
          <input className="sp__input" type="search" aria-label="Find a term or formula" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find a term or formula · ${l.glossary.length} terms, ${Object.keys(l.formulas).length} formulas`} />
          <div className="wk-g2">
            <Card icon="book" title="Glossary" sub={`${l.glossary.length} terms in ${doms.length} domains${dom ? ` · showing ${dom}` : ''}`} testId="glossary">
              <div className="ln-tags">{doms.map((d) => <Chip key={d} small selected={dom === d} onClick={() => setDom(dom === d ? null : d)}>{`${d} · ${l.glossary.filter((g) => g.dom === d).length}`}</Chip>)}</div>
              <ul className="plain ln-terms">{terms.slice(0, 60).map((g) => <li key={g.id}><b>{g.term}</b> <Tag tone="muted">{g.dom}</Tag><div className="ui-meta">{g.d}</div></li>)}</ul>{terms.length > 60 ? <p className="ui-meta">{terms.length - 60} more: narrow the search.</p> : !terms.length ? <p className="ui-meta">No term matches.</p> : null}
            </Card>
            <Card icon="chart" title="Formulas" sub={`${Object.keys(l.formulas).length} formulas`}>
              <ul className="plain ln-terms">{formulas.slice(0, 40).map((f, i) => <li key={i}><b>{f.name}</b> <span className="learn__eq" dangerouslySetInnerHTML={html(f.eq)} /><div className="ui-meta">{f.where.map(([k, v]) => `${k.replace(/<[^>]+>/g, '')}: ${v}`).join(' · ')}</div>{f.ex ? <div className="ui-meta">e.g. {f.ex}</div> : null}</li>)}</ul>
            </Card>
          </div></>; }}</LibGate>
    </section>
  );
}
export function LibraryPage({ perspective }: { perspective: string }) {
  const { w } = useWorkspace(); const { lib, err } = useLib(); const [sel, setSel] = useState<string | null>(null);
  const cases = trainingCases(w); const types = archetypesIn();
  const held: Record<string, number | null> = { 'Known Fix': V.KNOWN_FIXES.length, 'Training Case': cases.length, 'Signal Flow': types.length, 'Lesson Learned': w.learnCases.filter((c) => c.state === 'APPROVED').length, Standard: new Set(allRecords().flatMap((r) => r.analysis.applicability.packs || [])).size, 'As-Built Concept': allRecords().filter((r) => r.installations.length).length };
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-library">
      <Head role={perspective} current="#/learn/library" title="Learn" lede="The knowledge that belongs to the estate: thirteen kinds, each linked to the rooms, devices and issues it explains." />
      <LibGate lib={lib} err={err}>{(l) => (
        <Card icon="spark" tone="violet" title="SIGNAL lessons" sub={`SIGNAL world · fiction · ${l.lessonOrder.length} lessons, each with a check`} testId="library-lessons">
          <div className="ln-kinds">{l.lessonDomains.map((d) => { const ids = l.lessonOrder.filter((id) => l.lessons[id]?.domain === d); return <details key={d} className="ln-dom"><summary><b>{d}</b> <span className="ui-meta">{plural(ids.length, 'lesson')}</span></summary><List label={`${d} lessons`}>{ids.map((id) => <ListRow key={id} title={l.lessons[id]!.title} sub={l.lessons[id]!.sum} onClick={() => setSel(id)} current={sel === id} />)}</List></details>; })}</div>
          {sel && l.lessons[sel] ? <article className="stack ln-lesson" data-testid="lesson"><h3>{l.lessons[sel]!.title}</h3>{l.lessons[sel]!.cards.map((c, i) => <p key={i} className="learn__card" dangerouslySetInnerHTML={html(c)} />)}{l.lessons[sel]!.quiz && l.quizzes[l.lessons[sel]!.quiz!] ? <QuizRunner q={l.quizzes[l.lessons[sel]!.quiz!]!} /> : null}</article> : null}
        </Card>)}</LibGate>
      <Timeline />
      <Card icon="layers" title="Thirteen kinds of knowledge" sub="What each kind is, and how many this demonstration's records hold">
        <div className="ln-kk">{V.KNOWLEDGE_KINDS.map(([k, d]) => <div key={k} className="ln-kk__i"><b className="num">{held[k] ?? '—'}</b><span><b>{k}</b><span className="ui-meta">{d}</span></span></div>)}</div>
        <p className="wk-note">A dash is a kind V2.5.3’s knowledge graph holds that is not part of this demonstration’s records; nothing is invented to fill it.</p>
      </Card>
      <Card icon="route" title="Signal flows" sub={`One per kind of room · ${types.length} kinds in the records`} testId="library-flows">
        <div className="ln-flows">{types.map(([k, name]) => { const r = allRecords().find((x) => x.outline.archetype === k)!; return <article key={k}><b>{name}</b> <span className="ui-meta">e.g. {shortName(r.outline)}</span>{(['Audio', 'Video'] as const).map((d) => <p key={d} className="ui-meta"><b>{d}</b> {hopsOf(r, d).map((h) => h.label).join(' → ')}</p>)}</article>; })}</div>
      </Card>
    </section>
  );
}

/** The quick-facts timeline (restored 12 Nov 2026, reference app.js after the Fundamentals): the history notes spaced out of the story so
 *  no chapter carries more than one, by season, each tied to the chapter it came from. Unchecked history (RV-27) and says so. */
let tlCache: Promise<{ seasons: Record<string, string>; timeline: Array<{ ch: string; title: string; body: string }> }> | null = null;
function Timeline() {
  const [d, setD] = useState<Awaited<NonNullable<typeof tlCache>> | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let live = true; (tlCache ||= fetch('signal/timeline.json').then((r) => { if (!r.ok) throw new Error(`timeline ${r.status}`); return r.json(); }).catch((e) => { tlCache = null; throw e; }))
    .then((x) => live && setD(x)).catch((e) => live && setErr(String(e))); return () => { live = false; }; }, []);
  if (err) return <Notice tone="bad">The quick-facts timeline did not load: {err}.</Notice>; if (!d || !d.timeline.length) return null;
  const seasons = [...new Set(d.timeline.map((t) => Number(t.ch.slice(1, 3))))].sort((a, b) => a - b);
  return <Card icon="clock" title="Quick facts timeline" sub={`SIGNAL world · ${d.timeline.length} history notes spaced out of the story so no chapter carries more than one; each is tied to the chapter it came from`} testId="library-timeline">
    <div className="ln-kinds">{seasons.map((n) => { const items = d.timeline.filter((t) => Number(t.ch.slice(1, 3)) === n);
      return <details key={n} className="ln-dom" data-season={n}><summary><b>Season {n}{d.seasons[String(n)] ? ` · ${d.seasons[String(n)]}` : ''}</b> <span className="ui-meta">{plural(items.length, 'fact')}</span></summary>
        <ul className="plain stack">{items.map((t) => <li key={`${t.ch}-${t.title}`} className="ln-fact"><span className="ui-meta">📜 {t.ch.toUpperCase()} · quick fact · <a href={`#/story/${t.ch}`}>open the chapter</a></span><b>{t.title}</b><p dangerouslySetInnerHTML={html(t.body)} /></li>)}</ul></details>; })}</div>
    <p className="wk-note">⚑ RV-27: these history notes are short summaries written from general knowledge; dates and attributions need a citation check before release.</p>
  </Card>;
}

// ------------------------------------------------------------------------------------------------------------ #/learn/ask
interface Answer { text: ReactNode; sources: Array<[string, string]>; known: boolean }
function answer(qn: number, w: S.Workspace): Answer {
  const recs = allRecords(); const cases = trainingCases(w); const rec = (id: string) => roomRecord(id)!; const src = (r: RoomRecord): [string, string] => [fullName(r.outline), roomHref(r.outline)];
  const none = (what: string): Answer => ({ known: false, text: `${what} is not part of this demonstration’s records, so Ask Empathia does not answer it. It never makes an answer up.`, sources: [] });
  switch (qn) {
    case 0: { const r = rec('R-ATL-4-218'); const o = r.issues.filter((i) => i.state !== 'RESOLVED'); const pd = r.baselines.find((b) => b.state === 'PENDING_ACCEPTANCE'); return { known: true, text: <>Atlas 4.218 is back in commissioning: {plural(o.length, 'open issue')} ({o.map((i) => i.title).join('; ')}){pd ? `, and baseline v${pd.version} waits for acceptance` : ''}; {plural(r.reopened.length, 'test')} reopened by a replacement.</>, sources: [src(r), ['Assurance comparison', '#/assurance/room/R-ATL-4-218']] }; }
    case 1: { const r = rec('R-ATL-4-218'); const rm = r.installations.filter((i) => i.removedAt); return { known: true, text: <>Since commissioning: {rm.map((i) => `${i.asset} on ${i.position} ${i.removalReason?.toLowerCase() || 'removed'} (${i.removedAt!.slice(0, 10)})`).join('; ') || 'no change of unit'}; {plural(r.reopened.length, 'test')} reopened; {r.baselines.length} baseline versions on record.</>, sources: [src(r), ['Core Replay', '#/replay/R-ATL-4-218']] }; }
    case 2: { const r = rec('R-BCN-3-101'); return { known: true, text: <>Beacon 3.101 cannot be accepted yet: {r.nextStep?.blockers.join('; ') || r.events.find((e) => e.outcome === 'DENIED')?.detail}.</>, sources: [src(r), ['Commissioning record', '#/commissioning/room/R-BCN-3-101']] }; }
    case 3: { const a = cases.filter((c) => c.domain === 'Audio'); return { known: true, text: <>{plural(a.length, 'room')} with an audio problem on record: {a.map((c) => `${c.short} (${c.complaint})`).join('; ') || 'none'}.</>, sources: a.map((c) => src(c.room)) }; }
    case 4: { const by = new Map<string, number>(); for (const c of cases) by.set(c.domain, (by.get(c.domain) || 0) + 1); const top = [...by.entries()].sort((x, y) => y[1] - x[1]); return { known: true, text: <>By the path each issue sits on: {top.map(([d, n]) => `${d} ${n}`).join(', ')}. The records name the path, not a root-cause code; the library’s root causes are patterns, not counts.</>, sources: [['Case Files', '#/learn/cases']] }; }
    case 5: { const d = recs.filter((r) => r.issues.some((i) => i.state !== 'RESOLVED' && /moved|drift/i.test(i.title))); return { known: true, text: <>{d.map((r) => `${shortName(r.outline)}: ${r.issues.find((i) => /moved|drift/i.test(i.title))!.title}`).join('; ') || 'None.'}</>, sources: d.map(src) }; }
    case 6: return none('Support end dates for devices');
    case 7: { const d = recs.filter((r) => r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE') || r.reopened.length || r.issues.some((i) => i.state !== 'RESOLVED' && /moved|drift/i.test(i.title))); return { known: true, text: <>Recommission: {d.map((r) => shortName(r.outline)).join(', ')} — a pending baseline, reopened tests or drift against the baseline on record.</>, sources: d.map(src) }; }
    case 8: return none('A budget for next year');
    case 9: return none('Wayfinding (the Tech Zone)');
    case 10: return none('Visitor check-in');
    case 11: return none('A room’s user guide');
    case 12: return { known: true, text: <>The Design clinic lesson “Choosing room microphones”: distance first, then directivity, mounting height and one echo reference.</>, sources: [['Choosing room microphones', '#/learn/design/mics']] };
    case 13: { const r = rec('R-BCN-3-225'); return { known: true, text: <>Beacon 3.225: {r.counts.failed} failed commissioning test and an open high-severity issue — {r.issues.find((i) => i.state !== 'RESOLVED')?.title}.</>, sources: [src(r), ['Commissioning record', '#/commissioning/room/R-BCN-3-225']] }; }
    default: { const d = recs.filter((r) => r.findings.some((f) => f.severity === 'High') || r.counts.failed); return { known: true, text: <>{d.map((r) => `${shortName(r.outline)}: ${r.findings.find((f) => f.severity === 'High')?.title || 'a failed test'}`).join('; ') || 'None.'}</>, sources: d.map(src) }; }
  }
}
const GROUPS: Array<[string, number[]]> = [['Rooms', [0, 1, 2, 3]], ['The estate', [4, 5, 6, 7, 8]], ['Design', [13, 14]], ['The workplace', [9, 10, 11, 12]]];
/** Words every question shares: they never make an unknown question look like a prepared one ("what is the weather"). */
const ASK_STOP = new Set('what which who whom whose why how when where the this that these those are was were does did has have had can could should would will for and but with from into about than then there here its our your you any all not'.split(' '));
export function AskPage({ perspective }: { perspective: string }) {
  const { w } = useWorkspace(); const [q, setQ] = useState(''); const [n, setN] = useState<number | null>(null); const [miss, setMiss] = useState(false);
  const ask = (text: string) => { const words = text.toLowerCase().replace(/[^a-z0-9. ]/g, ' ').split(/\s+/).filter((x) => x.length > 2 && !ASK_STOP.has(x)); let best = -1; let bs = 0; V.ASK_QUESTIONS.forEach((x, i) => { const s = words.filter((wd) => x.toLowerCase().includes(wd)).length; if (s > bs) { bs = s; best = i; } }); if (bs >= 2) { setN(best); setMiss(false); } else { setN(null); setMiss(true); } };
  const a = n === null ? null : answer(n, w);
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-ask">
      <Head role={perspective} current="#/learn/ask" title="Ask Empathia" lede="A question, an answer built from Core, and the records it stands on." meta={[<Chip key="a" small tone="learn">Answers from Core · no external AI</Chip>, <Chip key="c" small tone="muted">Every answer cites its sources</Chip>, <Chip key="s" small tone="muted">Synthetic data</Chip>]} />
      <form className="ui-row ln-ask" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }} role="search"><input className="sp__input" type="search" maxLength={200} aria-label="Ask a question" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a room, the estate, a design or the workplace" /><Button kind="primary" type="submit">Ask</Button></form>
      {a ? <Card icon="spark" tone={a.known ? 'learn' : undefined} title={V.ASK_QUESTIONS[n!]!} sub={a.known ? `Built from ${plural(a.sources.length, 'record')}` : 'Not in the records'} testId="ask-answer"><p className="ln-p">{a.text}</p>{a.sources.length ? <div className="ln-tags">{a.sources.map(([l, h]) => <Chip key={h + l} small href={h} icon="arrow-right">{l}</Chip>)}</div> : null}</Card> : null}
      {miss ? <Notice tone="info">That is not a question Ask Empathia knows. It answers a fixed set of questions by reading Core, and says so when a question is not one of them.</Notice> : null}
      <Card icon="menu" title="Questions it can answer" sub={`${V.ASK_QUESTIONS.length} prepared`}>
        <div className="wk-g2">{GROUPS.map(([g, ids]) => <div key={g}><h3 className="ln-h3">{g}</h3><List label={g}>{ids.map((i) => <ListRow key={i} title={V.ASK_QUESTIONS[i]!} onClick={() => { setN(i); setQ(V.ASK_QUESTIONS[i]!); setMiss(false); }} current={n === i} chevron />)}</List></div>)}</div>
        <p className="wk-note">Ask Empathia answers a fixed set of questions by reading Core. It does not generate text, and it says so when a question is not one it knows.</p>
      </Card>
      <MentorChannel role={perspective} />
    </section>
  );
}

/** SIGNAL's mentor channel (restored 12 Nov 2026, reference app.js renderAsk, built-in answers): it asks before it tells and names the
 *  concept. No live model here: each question is matched to the source's twenty prepared answers, and the page says so. */
let askCache: Promise<{ offline: Mentor.MentorAnswer[]; suggest: string[] }> | null = null;
function MentorChannel({ role }: { role: string }) {
  const [d, setD] = useState<{ offline: Mentor.MentorAnswer[]; suggest: string[] } | null>(null); const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<Array<{ me: boolean; t: string }>>([{ me: false, t: Mentor.MENTOR_OPEN }]); const [q, setQ] = useState(''); const [nudge, setNudge] = useState(false);
  useEffect(() => { let live = true; (askCache ||= fetch('signal/ask.json').then((r) => { if (!r.ok) throw new Error(`ask ${r.status}`); return r.json(); }).catch((e) => { askCache = null; throw e; }))
    .then((x) => live && setD(x)).catch((e) => live && setErr(String(e))); return () => { live = false; }; }, []);
  if (err) return <Notice tone="bad">The mentor channel did not load: {err}.</Notice>; if (!d) return null;
  const send = (text: string) => { const t = text.trim(); if (!t) { setNudge(true); return; } setNudge(false); setQ(''); setLog((l) => [...l, { me: true, t }, { me: false, t: Mentor.mentorAnswer(t, d.offline).text }]); };
  return <Card icon="spark" tone="violet" title="SIGNAL mentor channel" sub="SIGNAL world · ask about a concept, a drill or an incident; it asks before it tells, names the concept, and says who a job belongs to" testId="ask-mentor">
    <p className="wk-note" data-testid="ask-mentor-note">Built-in answers only: your question is matched to {d.offline.length} prepared answers from the SIGNAL source. No AI model is used and nothing leaves this page.</p>
    <div className="ln-chat" aria-live="polite" data-testid="ask-mentor-log">{log.map((m, i) => <Fragment key={i}><p className={`ln-msg${m.me ? ' is-me' : ''}`}>{m.t}</p>{!m.me && i > 0 && <LiteTryCard t={liteForText(`${log[i - 1]?.t || ''} ${m.t}`)} role={role} after="mentor answer" compact />}</Fragment>)}</div>
    <div className="ln-suggest" role="group" aria-label="Suggested questions">{d.suggest.map((x) => <button key={x} type="button" className="ui-btn ui-btn--quiet" onClick={() => send(x)}>{x}</button>)}</div>
    <form className="ln-askform" onSubmit={(e) => { e.preventDefault(); send(q); }}>
      <textarea aria-label="Your question to the mentor" maxLength={400} rows={2} value={q} placeholder={nudge ? 'Type a question first — for example: why does my stream drop every 40 seconds?' : 'e.g. Why does EQ not fix a notch that moves between seats?'} data-nudge={nudge}
        onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(q); } }} />
      <Button type="submit">Send</Button>
    </form>
  </Card>;
}

// ------------------------------------------------------------------------------------------------------------ #/learn/explore: the system explorers
interface Explorer { id: string; title: string; intro: string; layers: string[]; base: string; els: Array<{ layer: string; level: number; note: string; x: number; y: number; d: string | null; dash: string }>; hot: Array<{ x: number; y: number; label: string; real: string; sys: string; level: number }> }
/** The system explorers, restored 12 Nov 2026 to the founder's build package (reference app.js explorer()): a Reality view (the place as
 *  it looks, every "?" answered as it looks) and a System view (the layers drawn over it, every "?" answered as the system sees it); three
 *  levels — L0 paths, L1 adds measurements, L2 adds evidence and requirements; the first two layers on to start, each in its own colour. */
export function ExplorePage({ perspective, params }: { perspective: string; params: Record<string, string> }) {
  const { lib, err } = useLib(); const [layers, setLayers] = useState<string[] | null>(null); const [level, setLevel] = useState(0); const [hot, setHot] = useState<number | null>(null); const [mode, setMode] = useState<'reality' | 'system'>('system');
  useEffect(() => { setLayers(null); setHot(null); setLevel(0); setMode('system'); }, [params.id]);
  return <LibGate lib={lib} err={err}>{(l) => { const xs = l.explorers || []; const x = xs.find((e) => e.id === params.id) || xs[0]; if (!x) return <EmptyState title="No explorer in the library" />;
    const on = layers ?? x.layers.slice(0, 2); const els = mode === 'system' ? x.els.filter((e) => on.includes(e.layer) && e.level <= level) : []; const col = (k: string) => l.layerColors?.[k] || 'currentColor';
    const LEVELS = ['L0 · Paths', 'L1 · + Measurements', 'L2 · + Evidence and requirements'];
    return (
      <section className="wk ln" data-native="workspace" data-testid="learn-explore" data-mode={mode} data-level={level}>
        <Head role={perspective} current="#/learn" title={x.title} lede={x.intro} meta={[FICTION, <Chip key="i" small tone="muted">Illustrative</Chip>]} />
        <nav className="wk-v25nav" aria-label="System explorers">{xs.map((e) => <Chip key={e.id} small href={`#/learn/explore/${e.id}`} selected={e.id === x.id}>{e.title}</Chip>)}</nav>
        <div className="ln-tabs" role="tablist" aria-label="View">{([['reality', 'Reality view'], ['system', 'System view']] as const).map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={mode === k} className="ui-btn ui-btn--quiet" onClick={() => setMode(k)} data-view={k}>{t}</button>)}</div>
        <div className="ln-tabs" role="tablist" aria-label="Level">{LEVELS.map((t, i) => <button key={t} type="button" role="tab" aria-selected={level === i} className="ui-btn ui-btn--quiet" onClick={() => setLevel(i)} disabled={mode === 'reality'} data-level={i}>{t}</button>)}</div>
        <div className="ln-tags" role="group" aria-label="Layers">{x.layers.map((k) => { const sel = on.includes(k); return <button key={k} type="button" aria-pressed={sel} className="ln-layer" style={{ borderColor: col(k), background: sel ? col(k) : 'transparent', color: sel ? '#05070C' : undefined }} onClick={() => setLayers(sel ? on.filter((y) => y !== k) : [...on, k])} disabled={mode === 'reality'} data-layer={k}>{k}</button>; })}</div>
        <figure className="ln-explore"><svg viewBox="0 0 800 480" role="img" aria-label={`${x.title}: ${mode === 'reality' ? 'Reality view' : `System view, level ${level}, ${on.join(', ')} layers. ${els.length} items listed below the picture.`}`}><g className={mode === 'system' ? 'ln-ex__real is-dim' : 'ln-ex__real'} dangerouslySetInnerHTML={html(x.base)} />
          {els.map((e, i) => e.d ? <path key={`p${i}`} d={e.d} fill="none" stroke={col(e.layer)} strokeWidth={7} strokeLinecap="round" strokeDasharray={/stroke-dasharray="([^"]+)"/.exec(e.dash)?.[1]} /> : null)}
          {els.map((e, i) => <g key={i}><circle cx={e.x} cy={e.y} r="17" fill="#05070C" stroke={col(e.layer)} strokeWidth={4} /><text x={e.x} y={e.y + 7} textAnchor="middle" className="ln-ex__t" fill="#F8FAFC">{i + 1}</text></g>)}
          {x.hot.filter((h) => h.level <= level).map((h, i) => <g key={`h${i}`} className="ln-ex__hot" role="button" tabIndex={0} aria-label={`What is this: ${h.label}`} onClick={() => setHot(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHot(i); } }}><circle cx={h.x} cy={h.y} r="17" /><text x={h.x} y={h.y + 7} textAnchor="middle">?</text></g>)}
        </svg></figure>
        <p className="ln-p" aria-live="polite" data-testid="explore-info">{hot !== null && x.hot[hot] ? <><b>{x.hot[hot]!.label}</b> — {mode === 'reality' ? x.hot[hot]!.real : x.hot[hot]!.sys}</> : x.intro}</p>
        {mode === 'system' && <Card icon="menu" title="Numbered points" sub="What each is, and what it does in the system">{els.length ? <ol className="ln-log">{els.map((e, i) => <li key={i}><Tag tone="muted">{e.layer}</Tag> {e.note}</li>)}</ol> : <p className="ui-meta">Choose a layer to see its points.</p>}</Card>}
      </section>); }}</LibGate>;
}

// ------------------------------------------------------------------------------------------------------------ #/learn/servicehands: the ServiceHands Academy
const STAGE_GROUPS: Array<[string, string[]]> = [['Intake', ['triage', 'scope']], ['Engineering checks', ['dependency', 'standard', 'device']], ['Authorize and schedule', ['teams', 'authorize', 'schedule']], ['In the field', ['install', 'minicx', 'evidence']], ['Close-out', ['handoff', 'baseline', 'close', 'learn']]];
const WAITING: Record<string, S.Incident['state'][]> = { triage: ['OPEN', 'REOPENED'], scope: ['TRIAGED'], schedule: ['ASSIGNED'], install: ['ACCEPTED', 'IN_PROGRESS'], minicx: ['VERIFYING'], close: ['RESOLVED'] };
export function AcademyPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const [p, setP] = useProgress(); const [job, setJob] = useState<string | null>(null);
  const stages = V.SH_STAGES.filter(([k]) => k !== 'request'); const cleared = stages.filter(([k]) => (p.academy[k]?.right ?? 0) >= 2).length;
  const waiting = (k: string) => k === 'learn' ? w.incidents.filter((i) => i.state === 'CLOSED' && !i.learnCaseId).length : w.incidents.filter((i) => (WAITING[k] || []).includes(i.state)).length;
  const quizOf = (k: string): Quiz => { const i = V.SH_STAGES.findIndex((s) => s[0] === k); const [, label, owner] = V.SH_STAGES[i]!; const roles = [...new Set(V.SH_STAGES.map((s) => s[2]))].filter((r) => r !== owner).slice(0, 3); const next = V.SH_STAGES[i + 1]; const prev = V.SH_STAGES[i - 1]!;
    return { title: `${label} · the job`, domain: 'ServiceHands', qs: [
      { q: `Who owns “${label}”?`, o: [owner, ...roles], a: 0, why: `${owner} owns it in the ServiceHands flow.` },
      { q: `What comes straight before “${label}”?`, o: [prev[1], ...(next ? [next[1]] : []), 'Close'].filter((x, n, a) => a.indexOf(x) === n), a: 0, why: `${prev[1]} → ${label}${next ? ` → ${next[1]}` : ''}.` },
      { q: 'Does clearing this job give you the authority to do it on a live request?', o: ['No: training never grants work authorization', 'Yes'], a: 0, why: 'Practice evidence only.' },
    ] }; };
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-academy">
      <Head role={perspective} current="#/learn/servicehands" title="ServiceHands Academy" lede={<>Fifteen jobs from intake to close. Practise on a live request, answer three questions. {cleared} of {stages.length} jobs cleared; a job clears with two of its three questions right.</>}
        actions={openable(perspective, '#/servicehands') ? <a className="ui-btn ui-btn--primary" href="#/servicehands">Open ServiceHands</a> : undefined} aside={<ScoreRing value={pct(cleared, stages.length)} label={`${cleared} of ${stages.length} jobs cleared`} caption={<><b>{cleared}</b> of {stages.length}<br />cleared</>} band="modelled" />} />
      <div className="wk-g3 ln-academy">{STAGE_GROUPS.map(([g, ks]) => <Card key={g} icon="wrench" title={g} testId={`academy-${g}`}>
        <List label={g}>{ks.map((k) => { const s = V.SH_STAGES.find((x) => x[0] === k)!; const n = V.SH_STAGES.indexOf(s); const a = p.academy[k]; return <ListRow key={k} title={`${n} · ${s[1]}`} sub={s[2]} onClick={() => setJob(k)} current={job === k} trailing={<Chip small tone={a ? (a.right >= 2 ? 'ok' : 'warn') : 'muted'}>{a ? (a.right >= 2 ? 'Cleared' : `${a.right} of ${a.of}`) : 'Not started'}</Chip>} />; })}</List>
      </Card>)}</div>
      {job ? <Card icon="check" title={V.SH_STAGES.find((s) => s[0] === job)![1]} sub={`${V.SH_STAGES.find((s) => s[0] === job)![2]} · ${plural(waiting(job), 'live request')} waiting on this job`} testId="academy-job">
        <QuizRunner key={job} q={quizOf(job)} onComplete={(s, t) => setP(record(persona, 'training.academy_job', job, `ServiceHands Academy “${job}”: ${s} of ${t}`, (x) => { const prev = x.academy[job]; x.academy[job] = !prev || s > prev.right ? { right: s, of: t } : prev; }))} />
      </Card> : null}
      <Card icon="pulse" title="On the campus now" sub="Live requests you can open, by the job they are waiting on" testId="academy-now">
        <List label="Waiting">{stages.filter(([k]) => waiting(k)).map(([k, l]) => <ListRow key={k} title={l} sub={`${plural(waiting(k), 'request')} waiting on this job`} onClick={() => setJob(k)} trailing={openable(perspective, '#/servicehands') ? <a className="ui-btn ui-btn--sm" href="#/servicehands" onClick={(e) => e.stopPropagation()}>Practise</a> : undefined} />)}</List>
        {!stages.some(([k]) => waiting(k)) ? <p className="ui-meta">No live request is waiting on a job right now.</p> : null}
      </Card>
      <Card icon="route" title="How requests are routed" sub="Four routes, chosen by risk and scope"><List label="Routes">{Object.entries(V.SH_ROUTES).map(([k, [l, d]]) => <ListRow key={k} title={l} sub={d} />)}</List></Card>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ challenges (reference chalCatalog)
/** The thirteen SIGNAL challenges by mode, each at four levels with your best score, one shared stage below (the reference's chalCatalog).
 *  Records are the story's own (id@level), so a try here and a try inside a boss level are one history. Restored 12 Nov 2026. */
export function ChallengesPage({ perspective }: { perspective: string }) {
  const [mode, setMode] = useState<string>(CHX.MODES[0].id); const [pick, setPick] = useState<{ id: string; lv: number } | null>(null); const [prog, setProg] = useState(() => Story.load());
  const factor = prog.clock === 'off' ? 0 : prog.clock === 'extended' ? 2 : 1; const M = CHX.MODES.find((m) => m.id === mode)!;
  const record = (id: string, lv: number, score: number, passed: boolean) => setProg((cur) => { const n = Story.recordChalTry(cur, CHX.key(id, lv), score, passed, Date.now()); Story.save(n); return n; });
  return (
    <section className="wk ln" data-native="workspace" data-testid="learn-challenges">
      <Head role={perspective} current="#/learn/challenges" title="Challenges" lede="Thirteen small physical models in five modes: fix the audio, the picture, the light, the build and the recording by the numbers a working engineer uses. Some of the gear is a joke. Level 4 runs on the clock." meta={[FICTION]} />
      <div className="ui-tabs" role="tablist" aria-label="Challenge modes">{CHX.MODES.map((m) => <button key={m.id} type="button" role="tab" className="ui-tab" aria-selected={m.id === mode} onClick={() => setMode(m.id)} data-mode={m.id}>{m.icon} {m.name}</button>)}</div>
      <p className="ln-lede">{M.blurb}</p>
      <div className="wk-g2">{CHX.CHALLENGES.filter((c) => c.mode === mode).map((c) => <Card key={c.id} title={`${c.icon} ${c.title}`} sub={c.brief(1).split('. ')[0] + '.'} testId={`chal-card-${c.id}`}>
        <div className="ch__lvrow" role="group" aria-label={`Choose a level for ${c.title}`}>{[1, 2, 3, 4].map((n) => { const r = prog.challenges[CHX.key(c.id, n)];
          return <button key={n} type="button" className="ch__lv" aria-pressed={pick?.id === c.id && pick.lv === n} data-lv={n} onClick={() => setPick({ id: c.id, lv: n })}>L{n}{r ? `${r.passed ? ' ✔ ' : ' · '}${r.best}` : ''}</button>; })}</div></Card>)}</div>
      {pick && <div className="card" data-testid="chal-stage"><ChallengeRunner id={pick.id} lv={pick.lv} factor={factor} heading="h2" records={prog.challenges} onLevel={(n) => setPick({ id: pick.id, lv: n })} onResult={(o) => record(pick.id, pick.lv, o.score, o.passed)} /></div>}
      <p className="ui-meta">Timers follow the story’s clock setting ({prog.clock === 'off' ? 'off: Mastery without the clock' : prog.clock === 'extended' ? 'double time' : 'on'}). Every attempt is kept in this browser with the story’s progress; it is practice, not a credential.</p>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ Mission Control (reference renderHome)
const SEASON_HOME = ['', 'Citylight', 'Halyard Live', 'Aldermoor Group', 'Kestrel Valley Media', 'Brackenmoor University', 'Linden Row Design', 'Corvane Group', 'The Wyndmere Centre', 'The Wyndmere Centre', 'Lowfield Studio', 'Regional EOC', 'Principal review'];
let missionCache: Promise<[MC.MissionIndex, RT.RatingsIndex, Story.StoryIndex]> | null = null;
const loadMission = () => (missionCache ||= Promise.all(['signal/mission.json', 'signal/ratings.json', 'signal/index.json'].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); }))).catch((e) => { missionCache = null; throw e; }) as Promise<[MC.MissionIndex, RT.RatingsIndex, Story.StoryIndex]>);
/** SIGNAL Mission Control: continue the story, the competency level, the evidence locker, the role path, crew trust, competency by domain,
 *  the systems map, the six ratings, timers and support, reviewer mode and reset — from the story's own stored progress. Restored 12 Nov 2026. */
export function MissionPage({ perspective }: { perspective: string }) {
  const [data, setData] = useState<[MC.MissionIndex, RT.RatingsIndex, Story.StoryIndex] | null>(null); const [err, setErr] = useState<string | null>(null);
  const [P, setP] = useState(() => Story.load()); const [arm, setArm] = useState<string | null>(null); const [mapSe, setMapSe] = useState<number | null>(null);
  useEffect(() => { let live = true; loadMission().then((d) => live && setData(d)).catch((e) => live && setErr(String(e))); return () => { live = false; }; }, []);
  const commit = (n: Story.Progress) => { setP(n); Story.save(n); };
  const head = <Head role={perspective} current="#/learn/mission" title="Mission Control" lede="Your station. Pick up the story, run a drill, take a live incident, or ask for a nudge. Every result lands in your evidence locker." meta={[FICTION]} />;
  if (err) return <section className="wk ln" data-testid="learn-mission">{head}<Notice tone="bad">Mission Control did not load: {err}. <a href={location.hash}>Try again</a>.</Notice></section>;
  if (!data) return <section className="wk ln" data-testid="learn-mission" aria-busy="true">{head}<p>Opening the console…</p></section>;
  const [M, X, ix] = data; const pts = MC.points(P, M), lv = MC.level(pts.total), ev = MC.evidence(P, M), ct = MC.crew(P, M), se = MC.currentSeason(P), last = ix.chapters.find((c) => c.id === P.last) || ix.chapters.find((c) => c.id === 's01e00') || ix.chapters[0]!;
  const names = Object.keys(ct.trust).sort((a, b) => Math.abs(ct.trust[b]!) - Math.abs(ct.trust[a]!)).slice(0, 8); const role = M.roles.find((r) => r.id === P.role) || M.roles[0]!;
  const R = RT.ratingsFor(P, X, 99), shownSe = mapSe ?? (M.sysmaps[String(se)] ? se : 1), map = M.sysmaps[String(shownSe)]!;
  const pct = lv.next ? Math.min(100, (100 * (pts.total - lv.floor)) / (lv.next[0] - lv.floor)) : 100;
  const tap = (k: string, act: () => void) => { if (arm === k) { setArm(null); act(); } else setArm(k); };
  return (
    <section className="wk ln mc" data-testid="learn-mission">
      {head}
      <p className="ui-meta" data-testid="mc-console">{SEASON_HOME[se] || 'Empathia Learn'} · operations console · Season {se}</p>
      <div className="wk-g2">
        <Card title="Continue story" testId="mc-continue"><p className="mc__big">{last.title}</p><p className="ui-meta">Season {last.season} · {ix.seasons[String(last.season)] || 'Prologue'} · {Object.keys(P.chapters).length} of {M.totals.chapters} chapters opened</p><p><a className="ui-btn ui-btn--primary" href={`#/story/${last.id}`}>Resume ▸</a></p></Card>
        <Card title="Competency level" testId="mc-level"><p className="mc__big">{lv.code} · {lv.name}</p><ProgressBar value={pct} label={`${Math.round(pct)}% of the way to the next level`} /><p>{lv.next ? `${lv.next[0] - pts.total} evidence points to ${lv.next[1]} · ${lv.next[2]}` : 'Top of the ladder.'}</p><p className="ui-meta">⚑ Level thresholds are provisional (RV-20).</p></Card>
        <Card title="Evidence locker" testId="mc-locker"><p className="mc__big" data-testid="mc-points">{pts.total}</p><dl className="mc__kv"><dt>Drills passed</dt><dd>{ev.drills} / {ev.drillsOf}</dd><dt>Incidents proven</dt><dd>{ev.proven} / {ev.incidentsOf}</dd><dt>Labs fixed</dt><dd>{ev.labs} / {ev.labsOf}</dd><dt>Quizzes taken</dt><dd>{ev.quizzes}</dd><dt>Decisions logged</dt><dd>{ev.decisions}</dd><dt>Bosses cleared</dt><dd>{ev.bosses} / 12</dd><dt>Challenge levels passed</dt><dd>{ev.challenges} / 52</dd></dl></Card>
        <Card title="Role path" testId="mc-role"><label className="ch__field"><span>Role path</span><select value={role.id} onChange={(e) => commit({ ...P, role: e.target.value })}>{M.roles.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}</select></label><p>{role.text}</p></Card>
        <Card title="Crew trust · the weight of your choices" testId="mc-crew"><p className="mc__big">Merit {ct.merit > 0 ? '+' : ''}{ct.merit}</p>
          {!names.length ? <p>No choices yet. Every decision card in the story moves somebody’s trust — up or down.</p> : <ul className="plain mc__trust">{names.map((n) => { const v = ct.trust[n]!; return <li key={n} data-sign={v < 0 ? 'neg' : 'pos'}><span>{n}</span><Bar v={Math.min(100, Math.abs(v) * 12)} /><b>{v > 0 ? '+' : ''}{v}</b></li>; })}</ul>}</Card>
        <Card title="Competency by domain" testId="mc-domains"><dl className="mc__kv">{M.domains.map((d) => { const n = pts.dom[d] || 0; return [<dt key={`t${d}`}>{d}</dt>, <dd key={`d${d}`}>{MC.elevel(n)} · {n} pts</dd>]; })}</dl></Card>
      </div>
      <div className="wk-g2">{([['#/learn/practice', 'Practice', `${M.totals.labs} Fix-It Labs and Physics in Motion simulators, plus routing, first-failure hunts, clue boards and triage. Timed. Failable.`], ['#/learn/service', 'Service Mode', 'Live incidents on a running clock. Keep the evidence, keep the trust, prove the fix.'], ['#/learn/challenges', 'Challenges', 'Thirteen challenges in five modes, four levels each, scored with your best.'], ['#/learn/cases', 'Case Files', `${M.totals.cases} cases across every season, each from the Learn, Service and Engineer side.`], ['#/learn/ask', 'Ask Empathia Learn', 'A mentor that asks before it tells — and says whose job it is.']] as const).filter(([h]) => openable(perspective, h)).map(([h, t, d]) => <a key={h} className="card mc__link" href={h}><b>{t}</b><span className="ui-meta">{d}</span></a>)}</div>
      <Card title="Systems map" sub="Systems light up as you meet them in the story or prove them in Service Mode." testId="mc-map">
        <div className="ui-tabs" role="tablist" aria-label="Season maps">{Object.keys(M.sysmaps).map((k) => <button key={k} type="button" role="tab" className="ui-tab" aria-selected={Number(k) === shownSe} onClick={() => setMapSe(Number(k))}>S{k}{M.sysmaps[k]!.title ? ` · ${M.sysmaps[k]!.title}` : ''}</button>)}</div>
        <SysMapView M={map} P={P} lanes={M.lanes} />
      </Card>
      <Card title="Ratings · from your first attempts" sub={`Story Score ${R.score} / 100 · ${R.seen} first attempts counted`} testId="mc-ratings">
        <ul className="plain mc__ratings">{RT.DIMS.map(([k, name, q]) => <li key={k}><span><b>{name}</b> <span className="ui-meta">{q}</span></span><Bar v={R.dims[k].score} /><b>{R.dims[k].score}</b></li>)}</ul>
        <p className="ui-meta">Each season ends with a review: below {RT.PASS} the story stops until you retry the season. Practice, not a credential.</p></Card>
      <Card title="Timers and support" testId="mc-support">
        <label className="ch__field"><span>Timers</span><select value={P.clock} onChange={(e) => commit({ ...P, clock: e.target.value as Story.Clock })}><option value="on">Normal</option><option value="extended">Relaxed — every allowance doubled</option><option value="off">Off — no countdowns</option></select></label>
        <label className="ch__field"><span>Support level</span><select value={P.support || 'auto'} onChange={(e) => commit({ ...P, support: e.target.value as Story.Progress['support'] })}><option value="auto">By season (automatic)</option><option value="1">1 · Beginner — terms, formulas and worked examples</option><option value="2">2 · Intermediate — formulas and their variables</option><option value="3">3 · Advanced — formulas on request</option><option value="4">4 · Mastery — choose the tool yourself</option></select></label></Card>
      <QuestLog P={P} M={M} ix={ix} se={se} />
      <Journal P={P} M={M} />
      <Card title={`Reviewer mode · ${P.gates ? 'off' : 'on'}`} testId="mc-review"><p>{P.gates ? 'The story is gated: your choices and the core skills in each chapter open the pages after them; everything marked optional can wait. Each chapter opens when the one before it is cleared. Reviewers can open everything.' : 'Every page and chapter is open for expert review. Readers see the story gated.'}</p><p className="ui-meta">⚑ GT-01 · reviewer mode is for authors and subject-matter reviewers.</p>
        <p><Button onClick={() => (P.gates ? tap('review', () => commit({ ...P, gates: false })) : commit({ ...P, gates: true }))}>{!P.gates ? 'Turn reviewer mode off' : arm === 'review' ? 'Tap again: open every page for review' : 'Open every page (reviewer mode)'}</Button></p></Card>
      <p><Button onClick={() => tap('reset', () => commit({ ...Story.emptyProgress(), clock: P.clock }))} testId="mc-reset">{arm === 'reset' ? 'Tap again to erase everything' : 'Reset my progress'}</Button></p>
    </section>
  );
}
function QuestLog({ P, M, ix, se }: { P: Story.Progress; M: MC.MissionIndex; ix: Story.StoryIndex; se: number }) {
  const locks = useMemo(() => Story.chapterLocks(ix, P), [ix, P]); const LQ = ix.lessonQuiz || {};
  const seasons = [...new Set(ix.chapters.filter((c) => M.quests[c.id]).map((c) => c.season))];
  return <Card title="🗺 Quest log" sub="Every chapter’s quest: its objectives tick as you clear them, and a finished chapter earns a rating from S to D." testId="mc-quests">
    {seasons.map((n) => <details key={n} className="mc__season" open={n === se}><summary>{n ? `Season ${n} · ${ix.seasons[String(n)] || ''}` : 'Prologue'}</summary>
      <ul className="plain mc__quests">{ix.chapters.filter((c) => c.season === n && M.quests[c.id]).map((c) => { const q = M.quests[c.id]!, nDone = q.objectives.filter(([k]) => MC.objectiveDone(P, M, c.id, k, LQ)).length, fin = Story.chapterCleared(c, P, LQ), r = fin ? MC.questRating(P, M, c.id, LQ) : null;
        return <li key={c.id} data-quest={c.id} data-done={fin}><a href={`#/story/${c.id}`}>{c.id.toUpperCase()} · {q.title}</a><span className="ui-meta">{locks[c.id] ? '🔒 Locked · ' : ''}{nDone}/{q.objectives.length} objectives{r ? ` · rating ${r.grade}` : ''}</span>
          {r && <span className="ui-meta">{r.got} / {r.max} — {MC.GRADE_LINE[r.grade]}</span>}</li>; })}</ul></details>)}
  </Card>;
}
function Journal({ P, M }: { P: Story.Progress; M: MC.MissionIndex }) {
  const ids = Object.keys(M.discoveries); const got = new Set(Object.values(P.chapters).flatMap((c) => c.found)); const threads: Record<string, string[]> = {};
  for (const k of ids) (threads[M.discoveries[k]!.thread || 'Loose ends'] ||= []).push(k);
  return <Card title={`📓 Case journal · ${ids.filter((k) => got.has(k)).length} / ${ids.length} discoveries`} sub="Clues, side scenes and lore you found by looking closer. The threads run across seasons — some only make sense later." testId="mc-journal">
    {Object.entries(threads).map(([t, ks]) => <details key={t} className="mc__season"><summary>{t} · {ks.filter((k) => got.has(k)).length} / {ks.length}</summary>
      <ul className="plain mc__journal">{ks.map((k) => { const d = M.discoveries[k]!; return got.has(k) ? <li key={k} data-found="true"><span className="ui-meta">{d.ch.toUpperCase()}</span> <b>{d.title}</b><p dangerouslySetInnerHTML={html(d.body)} /></li> : <li key={k} data-found="false"><span className="ui-meta">{d.ch.toUpperCase()}</span> <b>??? — not found yet</b><p className="ui-meta">Somewhere in {d.ch.toUpperCase()}: {d.teaser}</p></li>; })}</ul></details>)}
  </Card>;
}
/** A plain meter: the number beside it carries the value, so the bar is decoration for sighted readers. */
const Bar = ({ v }: { v: number }) => <svg className="mc__bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect className="boss__mtrack" width={100} height={8} rx={4} /><rect className="boss__mfill" width={Math.max(0, Math.min(100, v))} height={8} rx={4} /></svg>;
/** The reference's label wrap: one line up to 14 characters, else two. */
const wrap2 = (t: string) => { if (t.length <= 14) return [t]; let a = '', b = ''; for (const w of t.split(' ')) { if (!b && `${a} ${w}`.trim().length <= 14) a = `${a} ${w}`.trim(); else b = `${b} ${w}`.trim(); } return b ? [a, b] : [a]; };
function SysMapView({ M, P, lanes }: { M: MC.SysMap; P: Story.Progress; lanes: Record<string, string> }) {
  const vb = M.view || [800, 360], by = (id: string) => M.nodes.find((n) => n.id === id)!, lit = M.nodes.filter((n) => MC.nodeOn(n, P));
  const dash: Record<string, string | undefined> = { NETWORK: '3 7', POWER: '18 6 4 6', CONTROL: '10 8' };
  return <div className="lab__svgwrap"><svg className="mc__map" viewBox={`0 0 ${vb[0]} ${vb[1]}`} role="img" aria-label={`${M.title || 'Systems'} map. Lit systems: ${lit.map((n) => n.label).join(', ') || 'none yet'}.`}>
    {M.links.map(([a, b, lane], i) => { const A = by(a), B = by(b), on = MC.nodeOn(A, P) && MC.nodeOn(B, P); return <line key={i} x1={A.x + A.w / 2} y1={A.y + A.h / 2} x2={B.x + B.w / 2} y2={B.y + B.h / 2} stroke={on ? lanes[lane] || 'currentColor' : 'var(--line2)'} strokeWidth={on ? 4 : 2} strokeDasharray={dash[lane]} />; })}
    {M.nodes.map((n) => { const on = MC.nodeOn(n, P); return <g key={n.id} className={on ? 'mc__node is-on' : 'mc__node'}><rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} /><text x={n.x + n.w / 2} y={n.y + n.h / 2 + 6} textAnchor="middle">{wrap2(on ? n.label : '? ? ?').map((t, j, all) => <tspan key={j} x={n.x + n.w / 2} dy={all.length > 1 ? (j ? 22 : -10) : 0}>{t}</tspan>)}</text></g>; })}
  </svg><p className="ui-meta">Lanes: {Object.keys(lanes).map((l) => l.toLowerCase()).join(', ')} (line pattern differs by lane). Unlit systems show as ? ? ?.</p></div>;
}

// ------------------------------------------------------------------------------------------------------------ meltdowns in Service Mode (reference meltdownList)
type MdLib = [{ order: string[]; meltdowns: Record<string, MDX.Meltdown & { kicker?: string; source?: string; brief?: string; title: string }> }, RT.RatingsIndex];
let mdCache: Promise<MdLib> | null = null;
const loadMeltdowns = (): Promise<MdLib> => (mdCache ||= (Promise.all(['signal/meltdowns.json', 'signal/ratings.json'].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); }))) as Promise<MdLib>).catch((e) => { mdCache = null; throw e; }));
/** The end-of-season boss fights, takeable here as in the reference's Service Mode; records are the story's own. Restored 12 Nov 2026. */
function MeltdownList() {
  const [d, setD] = useState<MdLib | null>(null); const [err, setErr] = useState<string | null>(null); const [P, setP] = useState(() => Story.load()); const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { let live = true; loadMeltdowns().then((x) => live && setD(x)).catch((e) => live && setErr(String(e))); return () => { live = false; }; }, []);
  if (err) return <Notice tone="bad">The meltdowns did not load: {err}.</Notice>; if (!d) return null;
  const [L, X] = d, lo = RT.currentLoadout(P, X), factor = P.clock === 'off' ? 0 : P.clock === 'extended' ? 2 : 1;
  return <Card icon="spark" tone="violet" title={`☢ Meltdowns · mission-critical boss fights · ${L.order.length}`} sub="The end-of-season boss fights. Everything fails at once, and every failure touches the next. Contain, fail over, prove — without touching what isn’t yours." testId="service-meltdowns">
    <ul className="plain mc__quests">{L.order.map((id) => { const M = L.meltdowns[id]!, r = P.meltdowns[id];
      return <li key={id} data-meltdown={id}>{open === id ? <MeltdownRunner M={M} heading="h4" factor={factor} resMet={(q) => RT.resMet(lo, q)} resWhy={(q) => RT.resWhy(lo, q)} onEnd={(S) => setP((cur) => { const n = { ...cur, meltdowns: { ...cur.meltdowns, [id]: MDX.recordMeltdown(cur.meltdowns[id] as MDX.MeltdownRecord | undefined, S) as Story.MeltdownRecord } }; Story.save(n); return n; })} />
        : <><span className="ui-meta">☢ {id}{M.kicker ? ` · ${M.kicker}` : ''} · {r ? `${r.best === 'proven' ? 'Contained' : r.best === 'partial' ? 'Survived' : 'Failed'} · rating ${r.grade}` : 'Open'}</span><b>{M.title}</b>{M.brief && <span>{M.brief}</span>}{M.source && <span className="ui-meta">From {M.source}</span>}
          <span><Button onClick={() => setOpen(id)}>Take the meltdown</Button></span></>}</li>; })}</ul>
    <p className="wk-note">Meltdown loadouts come from your story ratings, as in the story. SIGNAL world · fiction.</p>
  </Card>;
}
