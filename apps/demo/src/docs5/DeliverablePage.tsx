/**
 * #/docs/<report>/<item> — one deliverable of Phase 5: what it must state and reference, the current revision, what is wrong with it,
 * who has to acknowledge it, and its whole history. A role sees only the steps it may take (D44); the rules' own refusals, which the
 * role is entitled to hear, are shown as alerts.
 *
 * Submitting never types a reference: equipment is chosen from the room's own positions and evidence from the dossier's own records.
 * A file is read where it is chosen to compute its SHA-256; the file is not stored and not sent anywhere.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Card, Chip, EmptyState, Icon } from '@empathia/ui';
import { DOSSIER_4218 as D, RULES, DELIVERABLES, type Attachment, type Authority, type DeliverableType, type DocEvent } from '@empathia/proof-registry';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { Crumbs, honest } from '../parity/ui.js';
import { useDossier } from '../proof/store.js';
import { DOC_ROLES, TRACKED_REPORT, actorOf, bytes, evidenceIdOf, mayRead, trackedSet } from './model.js';
import { nowIso, useDocs } from './store.js';
import { FindingLine, Said, StateChip, day, docHref, plural, when } from './ui.js';

const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
async function sha256(file: File): Promise<string> { const buf = await file.arrayBuffer(); const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function describe(e: DocEvent): string {
  switch (e.kind) {
    case 'ASSIGN': return `${e.by.label} assigned it to the ${e.owner.label}, due ${day(e.due)}`;
    case 'SUBMIT': return `${e.by.label} submitted revision ${e.revision}${e.attachment ? ` with ${e.attachment.name}` : ''}`;
    case 'VENDOR_SUBMISSION': return `${e.by.label} recorded revision ${e.revision} as received from ${e.vendor}${e.attachment ? ` with ${e.attachment.name}` : ''}`;
    case 'REQUEST_CORRECTION': return `${e.by.label} asked for a correction: ${e.comment}`;
    case 'ACCEPT': return `${e.by.label} accepted revision ${e.revision}`;
    case 'ACKNOWLEDGE': return `${e.by.label} acknowledged revision ${e.revision}`;
    case 'WITHDRAW': return `${e.by.label} withdrew the submission: ${e.reason}`;
  }
}

export default function Deliverable({ role, params, can }: PageProps) {
  const type = params['doc'] as DeliverableType; const known = (DELIVERABLES as readonly string[]).includes(type);
  const { working: w, ctx, act } = useDocs(); const dz = useDossier();
  const d = known && w ? w.docs.find((x) => x.type === type) ?? null : null; const rule = known ? RULES[type] : null;
  const record = trackedSet()?.record ?? null;
  const [no, setNo] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null); const alertRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<Record<string, string>>({}); const [equipment, setEquipment] = useState<string[] | null>(null); const [evidence, setEvidence] = useState<string[] | null>(null);
  const [file, setFile] = useState<Attachment | null>(null); const [hashing, setHashing] = useState(false); const [vendor, setVendor] = useState(''); const [fromVendor, setFromVendor] = useState(false);
  const [comment, setComment] = useState(''); const [reason, setReason] = useState(''); const [owner, setOwner] = useState<RoleKey | ''>(''); const [due, setDue] = useState(() => plusDays(7));
  useEffect(() => { setNo(null); setOk(null); }, [role, type]);
  useEffect(() => { if (no) alertRef.current?.querySelector<HTMLElement>('[role=alert]')?.focus?.(); }, [no]);
  const positions = useMemo(() => (record ? record.positions.filter((p) => !p.furniture) : []), [record]);

  if (!known || !d || !rule || !w || !ctx || !mayRead(role, d.acknowledgements.need)) return (
    <div className="pa d5" data-native="" data-testid="doc-missing"><Crumbs items={[['Documentation', docHref()], ['Not found']]} /><h1 className="ui-visually-hidden">Document not found</h1>
      <EmptyState title={known && d ? 'Not part of this role’s view' : 'No such deliverable'} icon={known && d ? 'lock' : 'search'} action={<a className="ui-btn" href={docHref()}>Back to the checklist</a>}>{known && d ? `The ${ROLES[role].label} is shown the documents they are asked to acknowledge.` : 'The checklist lists the eighteen deliverables considered for this room.'}</EmptyState></div>);

  const narrow = role === 'sitechamp';   // the champion reads the guide's own record and acknowledges it; the dossier and its findings are not theirs
  const me = actorOf(role); const s = d.submission; const eq = equipment ?? (rule.equipment === 'all' ? positions.map((p) => p.code) : []); const ev = evidence ?? (rule.evidence === 'packet' ? [...ctx.evidence] : []);
  const step = (e: DocEvent, done: string) => { const r = act(e); setNo(r); setOk(r ? null : done); return !r; };
  const derived = d.gate === 'dossier' && !d.test; const nextRev = d.lastRevision + 1;
  // a role submits its own work when the deliverable is its to submit; the Integration PM may instead record what a vendor sent
  const mayVendor = can('docs.vendor'); const ownSubmit = can('docs.submit') && !rule.vendor && (!d.owner || d.owner.role === role);
  const maySubmit = d.applies && !derived && (ownSubmit || mayVendor);
  const submitsAs: 'own' | 'vendor' = ownSubmit && !(mayVendor && fromVendor) ? 'own' : 'vendor';
  const mayReview = can('docs.review') && !!s && s.by.role !== role;
  const dependsRev = Object.fromEntries(rule.dependsOn.map((t) => [t, w.docs.find((x) => x.type === t)?.submission?.revision]).filter(([, v]) => v !== undefined)) as Partial<Record<DeliverableType, number>>;
  const counts = () => { const out: Record<string, number> = {}; for (const p of positions) if (eq.includes(p.code)) out[p.catLabel.toLowerCase()] = (out[p.catLabel.toLowerCase()] || 0) + 1; return out; };
  const choose = async (f: File | undefined) => { if (!f) { setFile(null); return; } setHashing(true); try { setFile({ name: f.name.slice(0, 160), bytes: f.size, sha256: await sha256(f) }); } catch { setNo('The file could not be read to compute its checksum.'); setFile(null); } finally { setHashing(false); } };
  const submit = () => {
    const body = { doc: type, revision: nextRev, fields: Object.fromEntries(rule.fields.map((x) => [x.key, (fields[x.key] || '').trim()])), equipment: eq, evidence: ev, attachment: file, against: { room: ctx.roomRevision, docs: dependsRev }, ...(rule.counts ? { counts: counts() } : {}), by: me, at: nowIso() };
    const e: DocEvent = submitsAs === 'vendor' ? { kind: 'VENDOR_SUBMISSION', vendor: vendor.trim(), ...body } : { kind: 'SUBMIT', ...body };
    if (submitsAs === 'vendor' && vendor.trim().length < 2) { setNo('Say which vendor sent it.'); setOk(null); return; }
    // A role's own submission is complete or it is not made. What a vendor sent is recorded as it arrived, gaps and all, and the gaps become findings.
    if (submitsAs === 'own') { const gaps = [...rule.fields.filter((x) => !(fields[x.key] || '').trim()).map((x) => `“${x.label}” is empty.`), ...(rule.attachment && !file ? ['No file is attached.'] : []), ...(rule.equipment === 'some' && !eq.length ? ['No position is chosen.'] : []), ...(rule.evidence === 'some' && !ev.length ? ['No evidence record is chosen.'] : [])];
      if (gaps.length) { setNo(`Not submitted. ${gaps.join(' ')}`); setOk(null); return; } }
    if (step(e, `Revision ${nextRev} is on the record. It now waits for review by a role other than the ${me.label}.`)) { setFields({}); setFile(null); setEquipment(null); setEvidence(null); setVendor(''); setFromVendor(false); }
  };
  const test = d.test ? dz.working.tests.find((t) => t.id === d.test) ?? null : null;
  const mayRecord: Authority = { record: can('docs.record'), verify: false, raise: false, accept: false, countersign: false };
  const toDossier = () => { if (!test || !s) return; const r = dz.act({ kind: 'RETEST', test: test.id, result: 'PASS', evidence: evidenceIdOf(type, s.revision), by: me, at: nowIso() }, mayRecord); setNo(r); setOk(r ? null : `Recorded on the dossier: ${test.id} now cites this document. It counts once a different role has verified it there.`); };
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="pa d5" data-native="" data-testid="doc" data-doc={type} data-state={d.state} data-met={d.met ? 'yes' : 'no'} data-revision={s?.revision ?? 0}>
      <Crumbs items={narrow ? [['My site', '#/site'], ['Documentation', docHref()], [d.title]] : [['Commissioning & Assurance', '#/commissioning'], ['Documentation', docHref()], [d.title]]} />
      <PageHero compact eyebrow={`Phase 5 · ${D.room.name}`} title={d.title} product="commissioning" icon="book"
        lede={`${d.applies ? 'Required' : 'Not required'}: ${d.why.charAt(0).toLowerCase()}${d.why.slice(1)}.`}
        meta={[<StateChip key="s" d={d} />, ...(narrow ? [] : [...(d.overdue ? [<Chip key="o" small tone="bad">Overdue</Chip>] : []), ...(d.applies && d.met ? [<Chip key="m" small tone="ok">Requirement met</Chip>] : d.applies ? [<Chip key="m" small tone="warn">Requirement open</Chip>] : [])]), ...honest(['Synthetic data', 'warn'])]} />

      <div ref={alertRef}><Said no={no} ok={ok} id="doc" /></div>

      {!d.applies ? <EmptyState title="Nothing to submit" icon="check" action={<a className="ui-btn" href="#/docs/applies">See what applies to other rooms</a>}>This room is not asked for it.</EmptyState> : <div className="d5-grid">
        <Card title={s ? `Revision ${s.revision}` : 'No submission'} icon="layers" sub={s ? `${s.vendor ? `Received from ${s.vendor}, recorded by the ${s.by.label}` : `Submitted by the ${s.by.label}`} on ${when(s.at)}` : derived ? 'Read from the dossier, not submitted' : d.lastRevision ? `Revision ${d.lastRevision} was withdrawn` : 'Nothing has been submitted yet'} testId="doc-current">
          <dl className="d5-facts">
            <div><dt>Owner</dt><dd data-testid="doc-owner">{derived ? 'The dossier' : d.owner ? d.owner.label : `Not assigned (normally the ${d.ownerLabel})`}</dd></div>
            {d.due ? <div><dt>Due</dt><dd>{day(d.due)}{d.overdue ? ' — overdue' : ''}</dd></div> : null}
            {s ? <>
              {rule.fields.map((x) => <div key={x.key}><dt>{x.label}</dt><dd>{s.fields[x.key]?.trim() || <em>not stated</em>}</dd></div>)}
              {rule.attachment || s.attachment ? <div><dt>File</dt><dd data-testid="doc-file">{s.attachment ? <>{s.attachment.name} · {bytes(s.attachment.bytes)}<br /><span className="d5-hash">SHA-256 <code>{s.attachment.sha256}</code></span></> : <em>none attached</em>}</dd></div> : null}
              <div><dt>Written against</dt><dd>Revision {s.against.room} of the room record (now at revision {ctx.roomRevision}){rule.dependsOn.map((t) => <span key={t}>; revision {s.against.docs[t] ?? '—'} of the {RULES[t].title.toLowerCase()}</span>)}</dd></div>
              {rule.equipment !== 'none' || s.equipment.length ? <div><dt>Equipment</dt><dd>{s.equipment.length ? <>{plural(s.equipment.length, 'position')} of {ctx.positions.length}: <span className="d5-codes">{s.equipment.join(', ')}</span></> : <em>none named</em>}</dd></div> : null}
              {rule.evidence !== 'none' || s.evidence.length ? <div><dt>Evidence</dt><dd>{s.evidence.length ? <details><summary>{plural(s.evidence.length, 'record')} of the dossier</summary><span className="d5-codes">{s.evidence.join(', ')}</span></details> : <em>none cited</em>}</dd></div> : null}
              {rule.counts ? <div><dt>Units listed</dt><dd>{Object.entries(s.counts).map(([k, v]) => `${v} ${k}`).join(', ') || <em>none</em>}</dd></div> : null}
            </> : null}
            {d.accepted ? <div><dt>Accepted</dt><dd>Revision {d.accepted.revision} by the {d.accepted.by.label}, {when(d.accepted.at)}</dd></div> : null}
            {d.correction ? <div><dt>Correction asked</dt><dd data-testid="doc-correction">“{d.correction.comment}” — {d.correction.by.label}, {when(d.correction.at)}</dd></div> : null}
          </dl>
          {d.acknowledgements.need.length ? <><h3 className="d5-h">Acknowledgement</h3><ul className="d5-acks" data-testid="doc-acks">{d.acknowledgements.need.map((a) => { const h = d.acknowledgements.have.find((x) => x.by.role === a.role); return <li key={a.role} data-ack={a.role} data-done={h ? 'yes' : 'no'}><Icon name={h ? 'check' : 'clock'} size={16} /><span>{a.label}: {h ? `acknowledged ${when(h.at)}` : d.accepted ? 'outstanding' : 'after it is accepted'}</span></li>; })}</ul></> : null}
          {narrow ? null : d.test ? <p className="d5-gate" data-testid="doc-gate"><Icon name="link" size={16} /><span>At acceptance this requirement is decided by test <a href={`#/dossier/${TRACKED_REPORT}?focus=${d.test}`}><code>{d.test}</code></a> on the dossier{test ? ` (${test.result === 'PASS' ? 'pass' : test.result.toLowerCase()}${test.evidence ? `, evidence ${test.evidence}` : ', no evidence'}${test.changed && !test.verifiedBy ? ', awaiting verification' : ''})` : ''}, so one missing thing is not counted twice.</span></p> : derived ? <p className="d5-gate"><Icon name="link" size={16} /><span>Each deficiency closes on the <a href={`#/dossier/${TRACKED_REPORT}`}>dossier</a> when its retest is independently verified. Nothing is submitted here.</span></p> : null}
        </Card>

        {narrow ? null : <Card title="Findings" icon="alert" sub="Computed from this revision and the room’s record as it is now." testId="doc-findings">
          {d.findings.length ? <ul className="d5-findings">{d.findings.map((x, i) => <FindingLine key={i} f={x} />)}</ul> : <p className="d5-note">None. {d.satisfied ? 'This document is complete.' : ''}</p>}
        </Card>}
      </div>}

      {d.applies && !derived ? <section className="d5-steps" aria-labelledby="d5-steps-h" data-testid="doc-steps">
        <h2 id="d5-steps-h">Steps</h2>
        {can('docs.assign') ? <form className="d5-form" data-testid="doc-assign" noValidate onSubmit={(e) => { e.preventDefault(); const o = (owner || d.ownerRole) as RoleKey; step({ kind: 'ASSIGN', doc: type, owner: actorOf(o), due, by: me, at: nowIso() }, `Assigned to the ${ROLES[o].label}, due ${day(due)}.`); }}>
          <h3 className="d5-h">{d.owner ? 'Reassign' : 'Assign'}</h3>
          <div className="d5-form__row">
            <div className="ui-field"><label htmlFor="as-owner">Owner</label><select id="as-owner" value={owner || d.owner?.role || d.ownerRole} onChange={(e) => setOwner(e.target.value as RoleKey)}>{(rule.vendor ? DOC_ROLES.vendor : DOC_ROLES.submit).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}</select></div>
            <div className="ui-field"><label htmlFor="as-due">Due</label><input id="as-due" type="date" value={due} min={plusDays(0)} onChange={(e) => setDue(e.target.value)} /></div>
          </div>
          <div className="d5-actions"><button type="submit" className="ui-btn" data-testid="doc-assign-go">{d.owner ? 'Reassign' : 'Assign'}</button></div>
        </form> : null}

        {maySubmit ? <form className="d5-form" data-testid="doc-submit" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <h3 className="d5-h">{submitsAs === 'vendor' ? `Record revision ${nextRev} as received from a vendor` : `Submit revision ${nextRev}`}</h3>
          {mayVendor && ownSubmit ? <label className="d5-check"><input type="checkbox" checked={fromVendor} onChange={(e) => setFromVendor(e.target.checked)} data-testid="doc-from-vendor" /> <span>This came from a vendor</span></label> : null}
          {submitsAs === 'vendor' ? <div className="ui-field"><label htmlFor="sb-vendor">Vendor it came from</label><input id="sb-vendor" type="text" maxLength={80} value={vendor} onChange={(e) => setVendor(e.target.value)} data-testid="doc-vendor" /></div> : null}
          {rule.fields.map((x) => <div className="ui-field" key={x.key}><label htmlFor={`sb-${x.key}`}>{x.label}</label><input id={`sb-${x.key}`} type="text" maxLength={400} value={fields[x.key] || ''} onChange={(e) => setFields((v) => ({ ...v, [x.key]: e.target.value }))} data-field={x.key} /></div>)}
          {rule.attachment ? <div className="ui-field"><label htmlFor="sb-file">File</label><input id="sb-file" type="file" onChange={(e) => { void choose(e.target.files?.[0]); }} data-testid="doc-file-input" aria-describedby="sb-file-h" />
            <p className="ui-hint" id="sb-file-h" data-testid="doc-file-chosen">{hashing ? 'Computing the checksum…' : file ? `${file.name} · ${bytes(file.bytes)} · SHA-256 ${file.sha256.slice(0, 16)}…` : 'The file stays on this device. Only its name, size and SHA-256 are recorded.'}</p></div> : null}
          {rule.equipment !== 'none' ? <fieldset className="d5-pick" data-testid="doc-equipment"><legend>{rule.equipment === 'all' ? 'Positions it lists (every installed position)' : 'Positions it covers'} · {eq.length} of {positions.length}</legend>
            <div>{positions.map((p) => <label key={p.code} className="d5-check"><input type="checkbox" checked={eq.includes(p.code)} onChange={() => toggle(eq, setEquipment, p.code)} value={p.code} /> <span><code>{p.code}</code> {p.label}</span></label>)}</div></fieldset> : null}
          {rule.evidence !== 'none' ? <fieldset className="d5-pick" data-testid="doc-evidence"><legend>{rule.evidence === 'packet' ? 'Evidence records in the packet (every record on the dossier)' : 'Evidence it rests on'} · {ev.length} of {ctx.evidence.length}</legend>
            <div className="d5-pick--dense">{ctx.evidence.map((id) => <label key={id} className="d5-check"><input type="checkbox" checked={ev.includes(id)} onChange={() => toggle(ev, setEvidence, id)} value={id} /> <span><code>{id}</code></span></label>)}</div></fieldset> : null}
          <p className="d5-note">Written against revision {ctx.roomRevision} of the room record{rule.dependsOn.map((t) => `, and revision ${dependsRev[t] ?? '—'} of the ${RULES[t].title.toLowerCase()}`).join('')}. These are read from the record, not typed.</p>
          <div className="d5-actions"><button type="submit" className="ui-btn ui-btn--primary" disabled={hashing} data-testid="doc-submit-go">{submitsAs === 'vendor' ? 'Record the vendor’s submission' : `Submit revision ${nextRev}`}</button></div>
        </form> : null}

        {mayReview && d.state === 'SUBMITTED' ? <div className="d5-form" data-testid="doc-review">
          <h3 className="d5-h">Review revision {s!.revision}</h3>
          <div className="d5-actions"><button type="button" className="ui-btn ui-btn--primary" data-testid="doc-accept" onClick={() => step({ kind: 'ACCEPT', doc: type, revision: s!.revision, by: me, at: nowIso() }, `Revision ${s!.revision} is accepted.${d.acknowledgements.need.length ? ` It now needs acknowledgement by: ${d.acknowledgements.need.map((a) => a.label).join(', ')}.` : ''}`)}>Accept revision {s!.revision}</button></div>
        </div> : null}
        {mayReview && !d.correction ? <form className="d5-form" data-testid="doc-correct" noValidate onSubmit={(e) => { e.preventDefault(); if (step({ kind: 'REQUEST_CORRECTION', doc: type, comment: comment.trim(), by: me, at: nowIso() }, `Correction requested. The ${s!.by.label} submits a new revision.`)) setComment(''); }}>
          <div className="ui-field"><label htmlFor="rv-comment">{d.accepted ? 'Reopen it: what has to be corrected' : 'What has to be corrected'}</label><textarea id="rv-comment" rows={2} maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)} data-testid="doc-correct-text" /></div>
          <div className="d5-actions"><button type="submit" className="ui-btn" data-testid="doc-correct-go">Ask for a correction</button></div>
        </form> : null}

        {can('docs.acknowledge') && d.acknowledgements.outstanding.some((a) => a.role === role) ? <div className="d5-form" data-testid="doc-ack">
          <h3 className="d5-h">Acknowledge</h3><p className="d5-note">By acknowledging, the {me.label} says they have read revision {d.accepted!.revision}. It approves nothing else.</p>
          <div className="d5-actions"><button type="button" className="ui-btn ui-btn--primary" data-testid="doc-ack-go" onClick={() => step({ kind: 'ACKNOWLEDGE', doc: type, revision: d.accepted!.revision, by: me, at: nowIso() }, `Acknowledged by the ${me.label}.`)}>I have read revision {d.accepted!.revision}</button></div>
        </div> : null}

        {s && ((s.by.role === role && (can('docs.submit') || mayVendor)) || can('docs.review')) ? <form className="d5-form" data-testid="doc-withdraw" noValidate onSubmit={(e) => { e.preventDefault(); if (step({ kind: 'WITHDRAW', doc: type, reason: reason.trim(), by: me, at: nowIso() }, `Revision ${s.revision} is withdrawn. The next submission will be revision ${s.revision + 1}.`)) setReason(''); }}>
          <div className="ui-field"><label htmlFor="wd-reason">Withdraw revision {s.revision}: why</label><input id="wd-reason" type="text" maxLength={600} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="doc-withdraw-text" /></div>
          <div className="d5-actions"><button type="submit" className="ui-btn" data-testid="doc-withdraw-go">Withdraw</button></div>
        </form> : null}

        {test && d.satisfied && !d.met && can('docs.record') ? <div className="d5-form" data-testid="doc-to-dossier">
          <h3 className="d5-h">Record on the dossier</h3><p className="d5-note">This document is complete here, and test {test.id} is still open on the dossier. Recording it makes this revision the test’s evidence; a different role then verifies it there.</p>
          <div className="d5-actions"><button type="button" className="ui-btn ui-btn--primary" data-testid="doc-to-dossier-go" onClick={toDossier}>Record on {test.id}</button></div>
        </div> : null}

        {!can('docs.assign') && !maySubmit && !mayReview && !can('docs.acknowledge') ? <p className="d5-note" data-testid="doc-readonly">The {ROLES[role].label} reads this record and takes no step in it.</p> : null}
      </section> : null}

      {d.history.length ? <section className="d5-history" aria-labelledby="d5-hist-h"><h2 id="d5-hist-h">History</h2>
        <ol data-testid="doc-history">{d.history.map((e, i) => <li key={i} data-kind={e.kind}><time dateTime={e.at}>{when(e.at)}</time><span>{describe(e)}</span></li>)}</ol></section> : null}
    </div>
  );
}
