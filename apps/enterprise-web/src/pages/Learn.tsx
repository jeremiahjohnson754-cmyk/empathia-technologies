/**
 * Empathia Learn and SIGNAL (P8) in the enterprise application: the permission-aware knowledge base (as before), reviewed cases
 * from what actually happened (customer permission, de-identification checked against the organization's own names, SME review by
 * someone other than the proposer, the steward's approval by someone who is neither), and the SIGNAL library — lessons with their
 * checks, 146 drills in six kinds (the runners are shared with the demonstrator in @empathia/ui), the canon casebook, formulas and the
 * glossary. A completed check or drill is recorded as training through the API; training never grants work authorization.
 */
import { useMemo, useState } from 'react';
import { Button, DataTable, DrillRunner, DRILL_KINDS, Empty, ErrorState, Facts, Field, Loading, Notice, QuizRunner, Tabs, Tag, libHtml, type Column, type Drill, type Quiz } from '@empathia/ui';
import { api, newKey, useMutation, useQuery } from '../api.js';
import { href } from '../router.js';
import { Learn as Knowledge } from './Products.js';

type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'info';
const call = (op: string, args: Record<string, unknown> = {}) => api.call(op as never, args as never) as Promise<unknown>;
const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
interface Index { version: string; domains: string[]; lessons: Array<{ id: string; domain: string; title: string; sum: string; quiz: boolean }>; drills: Array<{ id: string; type: string; domain: string; time: number; title: string }>; canon: Array<{ id: string; title: string; episode: string; hook: string }>; counts: Record<string, number>; note: string }
interface LearnCase { code: string; title: string; lesson: string; state: string; workOrder: { code: string; state: string }; permission: { by: string; at: string; note: string | null }; proposedBy: string; proposedAt: string; smeReview: { decision: string; by: string; at: string; note: string } | null; approvedBy: string | null; approvedAt: string | null; yours: { review: boolean; approve: boolean } }
const TONE: Record<string, Tone> = { PROPOSED: 'info', SME_REVIEWED: 'warn', APPROVED: 'ok', REJECTED: 'bad' };

export function LearnHome({ tab }: { tab: string }) {
  const idx = useQuery<Index>('learn:index', () => call('getV1LearnLibrary') as Promise<Index>);
  const tabs = [{ key: 'knowledge', label: 'Knowledge' }, { key: 'cases', label: 'Reviewed cases' }, { key: 'competencies', label: 'Competencies' }, { key: 'lessons', label: 'Lessons', count: idx.data?.counts['lessons'] }, { key: 'drills', label: 'Drills', count: idx.data?.counts['drills'] }, { key: 'canon', label: 'Canon', count: idx.data?.counts['canon'] }, { key: 'reference', label: 'Reference' }];
  return (
    <section className="page" data-testid="learn">
      {tab !== 'knowledge' ? <header className="page__head"><div><p className="kicker">Empathia Learn · SIGNAL</p><h1>Evidence-backed knowledge, reviewed cases, training that never grants authority</h1>{idx.data ? <p className="ui-meta">SIGNAL library {idx.data.version}: {idx.data.counts['lessons']} lessons, {idx.data.counts['drills']} drills, {idx.data.counts['canon']} canon cases, {idx.data.counts['formulas']} formulas, {idx.data.counts['glossary']} terms. {idx.data.note}</p> : null}</div></header> : null}
      <Tabs label="Learn" active={tab} onChange={(k) => { location.hash = href('learn', k); }} tabs={tabs} />
      {tab === 'knowledge' ? <Knowledge /> : null}
      {tab === 'cases' ? <Cases /> : null}
      {tab === 'competencies' ? <Competencies /> : null}
      {idx.error && !['knowledge', 'cases', 'competencies'].includes(tab) ? <ErrorState error={idx.error} retry={idx.reload} /> : null}
      {idx.data && tab === 'lessons' ? <Lessons idx={idx.data} /> : null}
      {idx.data && tab === 'drills' ? <Drills idx={idx.data} /> : null}
      {idx.data && tab === 'canon' ? <Canon idx={idx.data} /> : null}
      {tab === 'reference' ? <Reference /> : null}
    </section>
  );
}

function Cases() {
  const q = useQuery<{ items: LearnCase[]; mayPropose: boolean }>('learn:cases', () => call('getV1LearnCases') as Promise<{ items: LearnCase[]; mayPropose: boolean }>);
  const act = useMutation((a: { op: string; code: string; body?: Record<string, unknown> }) => call(a.op, { params: { case: a.code }, ...(a.body ? { body: a.body } : {}) }), ['learn:cases']);
  const [sel, setSel] = useState<string | null>(null); const [note, setNote] = useState('');
  if (q.error) return <ErrorState error={q.error} retry={q.reload} />; if (!q.data) return <Loading />;
  const c = q.data.items.find((x) => x.code === sel) || null;
  const cols: Column<LearnCase>[] = [
    { key: 'c', header: 'Case', render: (x) => <a href="#" className="mono" onClick={(e) => { e.preventDefault(); setSel(x.code); }}>{x.code}</a> },
    { key: 's', header: 'State', render: (x) => <Tag tone={TONE[x.state] || 'muted'}>{x.state}</Tag> },
    { key: 't', header: 'Title', render: (x) => x.title }, { key: 'w', header: 'From', render: (x) => <a href={href('service', x.workOrder.code)} className="mono">{x.workOrder.code}</a> },
    { key: 'p', header: 'Proposed by', render: (x) => <span className="ui-meta">{x.proposedBy} · {when(x.proposedAt)}</span> },
  ];
  return (
    <div className="stack" data-testid="learn-cases">
      <Notice tone="info">A case is written from what actually happened: a resolved work order, the customer’s permission, text de-identified against this organization’s own names (the API checks), a subject-matter review by someone other than the proposer, the steward’s approval by someone who is neither. {q.data.mayPropose ? 'Propose one from a resolved work order (ServiceHands › the work order).' : ''}</Notice>
      {act.error ? <ErrorState error={act.error} /> : null}
      <DataTable rows={q.data.items} columns={cols} rowKey={(x) => x.code} caption="Reviewed cases" empty={<Empty title="No case yet">Cases are proposed from resolved work orders.</Empty>} />
      {c ? <section className="card stack" data-testid="learn-case"><h2 className="h3">{c.code} · {c.title} <Tag tone={TONE[c.state] || 'muted'}>{c.state}</Tag></h2><p>{c.lesson}</p>
        <Facts items={[['From', `${c.workOrder.code} (${c.workOrder.state})`], ['Permission', `${c.permission.note || 'recorded'} · ${when(c.permission.at)}`], ['Proposed by', `${c.proposedBy} · ${when(c.proposedAt)}`], ['SME review', c.smeReview ? `${c.smeReview.decision} by ${c.smeReview.by} · ${c.smeReview.note || ''}` : '—'], ['Approved', c.approvedBy ? `${c.approvedBy} · ${when(c.approvedAt)}` : '—']]} />
        {c.yours.review ? <div className="row-actions"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="review note" /><Button small kind="primary" busy={act.busy} onClick={() => void act.run({ op: 'postV1LearnCasesCaseReview', code: c.code, body: { decision: 'approve', note } })}>Approve as SME</Button><Button small busy={act.busy} onClick={() => void act.run({ op: 'postV1LearnCasesCaseReview', code: c.code, body: { decision: 'reject', note } })}>Reject</Button></div> : null}
        {c.yours.approve ? <div><Button small kind="primary" busy={act.busy} onClick={() => void act.run({ op: 'postV1LearnCasesCaseApprove', code: c.code })}>Approve as steward</Button></div> : null}
        {!c.yours.review && !c.yours.approve && c.state !== 'APPROVED' && c.state !== 'REJECTED' ? <p className="ui-meta">{c.state === 'PROPOSED' ? 'Awaiting a subject-matter reviewer other than the proposer.' : 'Awaiting a steward who is neither the proposer nor the reviewer.'}</p> : null}
      </section> : null}
    </div>
  );
}

interface Competency { id: string; person: { id: string; name: string }; competency: string; label: string; source: string; issuer: string; reference: string; issuedOn: string; expiresOn: string; expired: boolean; state: string; countsForDispatch: boolean; recordedBy: string; recordedAt: string; decidedBy: string | null; decidedAt: string | null; decisionNote: string | null; revokedAt: string | null; revokeReason: string | null; trainingRefs: number[]; yours: { decide: boolean; revoke: boolean } }
interface CompList { items: Competency[]; pool: Array<{ id: string; name: string }>; catalogue: Array<{ id: string; label: string }>; mayRecord: boolean; mayVerify: boolean; note: string }
const CTONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted'> = { VERIFIED: 'ok', PENDING_VERIFICATION: 'warn', REJECTED: 'bad', REVOKED: 'bad' };

/** Competency records (ADR-0009): the only credentials ServiceHands' hard gates read. Recorded by the service manager, verified by the
 *  data steward (never the recorder, never the holder), revocable. Training is shown elsewhere and never counts here by itself. */
function Competencies() {
  const q = useQuery<CompList>('learn:competencies', () => call('getV1Competencies') as Promise<CompList>);
  const act = useMutation((a: { op: string; id: string; body: Record<string, unknown> }) => call(a.op, { params: { competency: a.id }, body: a.body }), ['learn:competencies']);
  const rec = useMutation((b: Record<string, unknown>) => call('postV1Competencies', { idempotencyKey: newKey(), body: b }), ['learn:competencies']);
  const [sel, setSel] = useState<string | null>(null); const [note, setNote] = useState('');
  const [f, setF] = useState({ personId: '', competency: '', source: 'EXTERNAL_CERTIFICATE', issuer: '', reference: '', issuedOn: '', expiresOn: '' });
  if (q.error) return <ErrorState error={q.error} retry={q.reload} />; if (!q.data) return <Loading />;
  const c = q.data.items.find((x) => x.id === sel) || null;
  const status = (x: Competency) => x.state === 'VERIFIED' && x.expired ? <Tag tone="bad">EXPIRED</Tag> : <Tag tone={CTONE[x.state] || 'muted'}>{x.state.replace('_', ' ')}</Tag>;
  const cols: Column<Competency>[] = [
    { key: 'p', header: 'Person', render: (x) => <a href="#" onClick={(e) => { e.preventDefault(); setSel(x.id); setNote(''); }}>{x.person.name}</a> },
    { key: 'c', header: 'Competency', render: (x) => <span>{x.label} <span className="ui-meta mono">{x.competency}</span></span> },
    { key: 's', header: 'Status', render: status },
    { key: 'e', header: 'Expires', render: (x) => <span className="mono">{x.expiresOn}</span> },
    { key: 'd', header: 'Counts for dispatch', render: (x) => x.countsForDispatch ? 'yes' : <span className="ui-muted">no</span> },
  ];
  const ready = f.personId && f.competency && f.issuer.length >= 2 && f.reference && f.issuedOn && f.expiresOn;
  return (
    <div className="stack" data-testid="learn-competencies">
      <Notice tone="info">{q.data.note} {q.data.mayVerify ? 'You verify provenance for credentials someone else recorded.' : ''}</Notice>
      {act.error ? <ErrorState error={act.error} /> : null}
      <DataTable rows={q.data.items} columns={cols} rowKey={(x) => x.id} caption="Competency records" empty={<Empty title="No competency on record">A credential is recorded by the service manager and verified by the data steward before it counts.</Empty>} />
      {c ? <section className="card stack" data-testid="competency"><h2 className="h3">{c.label} · {c.person.name} {status(c)}</h2>
        <Facts items={[['Source', `${c.source.replace('_', ' ').toLowerCase()} · ${c.issuer} · ${c.reference}`], ['Valid', `${c.issuedOn} to ${c.expiresOn}${c.expired ? ' (expired)' : ''}`], ['Recorded by', `${c.recordedBy} · ${when(c.recordedAt)}`], ['Decision', c.decidedBy ? `${c.state === 'REJECTED' ? 'rejected' : 'verified'} by ${c.decidedBy} · ${when(c.decidedAt)} · ${c.decisionNote || ''}` : '—'], ['Revoked', c.revokedAt ? `${when(c.revokedAt)} · ${c.revokeReason}` : '—'], ['Supporting training', c.trainingRefs.length ? c.trainingRefs.map((n) => `#${n}`).join(', ') : '—']]} />
        {c.yours.decide || c.yours.revoke ? <div className="row-actions"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={c.yours.decide ? 'what you checked' : 'reason for revoking'} aria-label="Note" />
          {c.yours.decide ? <><Button small kind="primary" busy={act.busy} disabled={note.length < 3} onClick={() => void act.run({ op: 'postV1CompetenciesCompetencyVerify', id: c.id, body: { note } })}>Verify</Button><Button small busy={act.busy} disabled={note.length < 3} onClick={() => void act.run({ op: 'postV1CompetenciesCompetencyReject', id: c.id, body: { note } })}>Reject</Button></> : null}
          {c.yours.revoke ? <Button small busy={act.busy} disabled={note.length < 3} onClick={() => void act.run({ op: 'postV1CompetenciesCompetencyRevoke', id: c.id, body: { reason: note } })}>Revoke</Button> : null}</div>
          : c.state === 'PENDING_VERIFICATION' ? <p className="ui-meta">Awaiting the data steward — someone other than the recorder and the holder.</p> : null}
      </section> : null}
      {q.data.mayRecord ? <section className="card stack" data-testid="record-competency"><h2 className="h3">Record a credential</h2>
        <p className="ui-meta">It counts for nothing until the data steward verifies it against the issuer.</p>
        <div className="form-grid">
          <Field label="Person">{(i) => <select id={i} value={f.personId} onChange={(e) => setF({ ...f, personId: e.target.value })}><option value="">Choose…</option>{q.data!.pool.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
          <Field label="Competency">{(i) => <select id={i} value={f.competency} onChange={(e) => setF({ ...f, competency: e.target.value, source: e.target.value.startsWith('lic.') ? 'LICENCE' : 'EXTERNAL_CERTIFICATE' })}><option value="">Choose…</option>{q.data!.catalogue.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>}</Field>
          <Field label="Issuer">{(i) => <input id={i} value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} />}</Field>
          <Field label="Certificate or licence number">{(i) => <input id={i} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />}</Field>
          <Field label="Issued">{(i) => <input id={i} type="date" value={f.issuedOn} onChange={(e) => setF({ ...f, issuedOn: e.target.value })} />}</Field>
          <Field label="Expires">{(i) => <input id={i} type="date" value={f.expiresOn} onChange={(e) => setF({ ...f, expiresOn: e.target.value })} />}</Field>
        </div>
        {rec.error ? <ErrorState error={rec.error} /> : null}
        <div><Button kind="primary" busy={rec.busy} disabled={!ready} onClick={async () => { const r = await rec.run(f); if (r) setF({ personId: '', competency: '', source: 'EXTERNAL_CERTIFICATE', issuer: '', reference: '', issuedOn: '', expiresOn: '' }); }}>Record credential</Button></div>
      </section> : null}
    </div>
  );
}

/** The propose form lives on the work order (ServiceHands) — it is exported for that page. */
export function ProposeCase({ workOrder, state }: { workOrder: string; state: string }) {
  const [f, setF] = useState({ title: '', lesson: '', permission: false, deidentified: false, note: '' });
  const [done, setDone] = useState<string | null>(null);
  const m = useMutation(() => call('postV1WorkOrdersWorkOrderLearnCase', { params: { workOrder }, idempotencyKey: newKey(), body: { title: f.title, lesson: f.lesson, permission: f.permission, deidentified: f.deidentified, permissionNote: f.note || undefined } }), ['learn:cases']);
  if (done) return <Notice tone="ok">Case {done} proposed — it now needs a subject-matter review by someone else. <a href={href('learn', 'cases')}>Reviewed cases</a></Notice>;
  return (
    <section className="card stack" data-testid="propose-case"><h2 className="h3">Propose a Learn case from this work order</h2>
      {!['RESOLVED', 'CLOSED'].includes(state) ? <p className="ui-meta">A case is written from what actually happened: the work order must be resolved or closed first.</p> : <>
        <Field label="Title">{(i) => <input id={i} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
        <Field label="Lesson (de-identified: no room, building or person names)">{(i) => <textarea id={i} rows={3} value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} />}</Field>
        <Field label="Permission note">{(i) => <input id={i} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="who gave permission, how" />}</Field>
        <label className="check"><input type="checkbox" checked={f.permission} onChange={(e) => setF({ ...f, permission: e.target.checked })} /> The customer gave permission to reuse this incident</label>
        <label className="check"><input type="checkbox" checked={f.deidentified} onChange={(e) => setF({ ...f, deidentified: e.target.checked })} /> The text is de-identified (the API checks it against this organization’s names)</label>
        {m.error ? <ErrorState error={m.error} /> : null}
        <div><Button kind="primary" busy={m.busy} onClick={async () => { const r = await m.run(undefined); if (r) setDone((r as { caseId: string }).caseId); }}>Propose</Button></div></>}
    </section>
  );
}

function Lessons({ idx }: { idx: Index }) {
  const [dom, setDom] = useState(idx.domains[0] || 'Audio'); const [sel, setSel] = useState<string | null>(null);
  const l = useQuery<{ id: string; title: string; sum: string; cards: string[]; quizId: string | null; quiz: Quiz | null }>(sel ? `learn:lesson:${sel}` : null, () => call('getV1LearnLessonsLesson', { params: { lesson: sel } }) as never);
  const rec = useMutation((a: { itemId: string; score: number; total: number }) => call('postV1LearnTraining', { body: { kind: 'quiz', ...a } }), []);
  const ids = idx.lessons.filter((x) => x.domain === dom);
  return (
    <div className="svc__grid" data-testid="lessons">
      <div className="stack"><div className="learn__doms">{idx.domains.map((d) => <button key={d} type="button" className={`sp__chip${d === dom ? ' on' : ''}`} onClick={() => { setDom(d); setSel(null); }}>{d}</button>)}</div>
        <ul className="svc__list">{ids.map((x) => <li key={x.id} className={x.id === sel ? 'on' : ''}><a href="#" onClick={(e) => { e.preventDefault(); setSel(x.id); }}><b>{x.title}</b><span className="ui-meta">{x.sum}</span></a></li>)}</ul></div>
      <div className="svc__detail">{sel && l.data ? <article className="stack" data-testid="lesson"><h2 className="h3">{l.data.title}</h2><p className="ui-muted">{l.data.sum}</p>{l.data.cards.map((c, i) => <p key={i} className="learn__card" dangerouslySetInnerHTML={libHtml(c)} />)}{l.data.quiz ? <QuizRunner key={sel} q={l.data.quiz} onComplete={(score, total) => void rec.run({ itemId: l.data!.quizId || sel!, score, total })} /> : null}</article> : sel ? <Loading /> : <Notice tone="info">Pick a lesson. Each ends with a check; a completed check is recorded as training, nothing more.</Notice>}</div>
    </div>
  );
}

function Drills({ idx }: { idx: Index }) {
  const [kind, setKind] = useState('firstfail'); const [sel, setSel] = useState<string | null>(null);
  const d = useQuery<Drill>(sel ? `learn:drill:${sel}` : null, () => call('getV1LearnDrillsDrill', { params: { drill: sel } }) as Promise<Drill>);
  const mine = useQuery<{ items: Array<{ kind: string; itemId: string; correct: boolean | null }> }>('learn:training', () => call('getV1LearnTraining') as never);
  const rec = useMutation((a: { itemId: string; correct: boolean; elapsedS: number }) => call('postV1LearnTraining', { body: { kind: 'drill', ...a } }), ['learn:training']);
  const ids = idx.drills.filter((x) => x.type === kind);
  return (
    <div className="svc__grid" data-testid="drills">
      <div className="stack"><div className="learn__doms">{DRILL_KINDS.map(([k, l]) => <button key={k} type="button" className={`sp__chip${k === kind ? ' on' : ''}`} onClick={() => { setKind(k); setSel(null); }}>{l} ({idx.drills.filter((x) => x.type === k).length})</button>)}</div>
        <ul className="svc__list">{ids.map((x) => { const t = (mine.data?.items || []).filter((r) => r.kind === 'drill' && r.itemId === x.id); return <li key={x.id} className={x.id === sel ? 'on' : ''}><a href="#" onClick={(e) => { e.preventDefault(); setSel(x.id); }}><b>{x.title}</b><span className="ui-meta">{x.domain} · {x.time}s{t.length ? ` · done ${t.length}× (${t.filter((r) => r.correct).length} right)` : ''}</span></a></li>; })}</ul></div>
      <div className="svc__detail">{sel && d.data ? <DrillRunner key={sel} d={d.data} onDone={(correct, elapsedS) => void rec.run({ itemId: sel, correct, elapsedS })} /> : sel ? <Loading /> : <Notice tone="info">Pick a drill. Six kinds, all from the SIGNAL library; a completion is recorded as training — it never grants authority.</Notice>}</div>
    </div>
  );
}

function Canon({ idx }: { idx: Index }) {
  const [sel, setSel] = useState<string | null>(null);
  const c = useQuery<{ title: string; hook: string; learn: string[] }>(sel ? `learn:canon:${sel}` : null, () => call('getV1LearnCanonCase', { params: { case: sel } }) as never);
  return <div className="svc__grid" data-testid="canon"><ul className="svc__list">{idx.canon.map((x) => <li key={x.id} className={x.id === sel ? 'on' : ''}><a href="#" onClick={(e) => { e.preventDefault(); setSel(x.id); }}><b>{x.title}</b><span className="ui-meta">{x.episode} · {x.hook}</span></a></li>)}</ul>
    <div className="svc__detail">{sel && c.data ? <article className="stack"><h2 className="h3">{c.data.title} <Tag tone="ok">reviewed · canon</Tag></h2><p className="ui-muted">{c.data.hook}</p>{c.data.learn.map((p, i) => <p key={i} className="learn__card" dangerouslySetInnerHTML={libHtml(p)} />)}</article> : sel ? <Loading /> : <Notice tone="info">The reviewed casebook: what happened, why it sounded or looked that way, how it was proved.</Notice>}</div></div>;
}

function Reference() {
  const r = useQuery<{ formulas: Record<string, { name: string; eq: string; where: Array<[string, string]>; ex?: string }>; glossary: Array<{ id: string; term: string; d: string; dom: string }> }>('learn:reference', () => call('getV1LearnReference') as never);
  const [q, setQ] = useState('');
  const terms = useMemo(() => (r.data?.glossary || []).filter((g) => !q || `${g.term} ${g.d}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [r.data, q]);
  const formulas = useMemo(() => Object.values(r.data?.formulas || {}).filter((f) => !q || `${f.name} ${f.eq}`.toLowerCase().includes(q.toLowerCase())).slice(0, 20), [r.data, q]);
  if (r.error) return <ErrorState error={r.error} retry={r.reload} />; if (!r.data) return <Loading />;
  return <div className="stack" data-testid="reference"><input className="sp__input" aria-label="Search the reference" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${r.data.glossary.length} terms and ${Object.keys(r.data.formulas).length} formulas`} />
    <div className="svc__grid"><ul className="plain" data-testid="glossary">{terms.map((g) => <li key={g.id}><b>{g.term}</b> <Tag tone="muted">{g.dom}</Tag><div className="ui-meta">{g.d}</div></li>)}</ul>
      <ul className="plain">{formulas.map((f, i) => <li key={i}><b>{f.name}</b> <span className="learn__eq" dangerouslySetInnerHTML={libHtml(f.eq)} /><div className="ui-meta">{f.where.map(([k, v]) => `${k.replace(/<[^>]+>/g, '')}: ${v}`).join(' · ')}</div>{f.ex ? <div className="ui-meta">e.g. {f.ex}</div> : null}</li>)}</ul></div></div>;
}
