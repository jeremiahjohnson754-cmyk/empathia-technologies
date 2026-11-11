/**
 * #/docs/<report> — Commissioning Phase 5: documentation tracking and submission for the room of the dossier (founder's directive of
 * 11 Nov 2026, §12: "a first-class Documentation Tracking & Submission experience. It cannot be a single file-upload field").
 *
 * The page is the engine's reading of the record (@empathia/proof-registry `replayDocs`): what the room needs and why, who owns each
 * item, its due date and revision, what is wrong with it, and whether it stops acceptance. Nothing on it is typed as a status.
 *   #/docs/<report>            the checklist, what is missing, the ten release controls, field captures
 *   #/docs/<report>/<item>     one deliverable: submit, review, acknowledge, history (DeliverablePage)
 *   #/docs/<report>/capture    field capture on a phone, kept offline until synchronised (CapturePage)
 *   #/docs/applies             what applies to which room, three rooms side by side
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, StatTile, Segmented, EmptyState, Icon } from '@empathia/ui';
import { DOSSIER_4218 as D, DELIVERABLES, requiredFor, whatIsMissing, type WorkingDoc } from '@empathia/proof-registry';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { allRecords } from '../campus/design.js';
import { Crumbs, honest } from '../parity/ui.js';
import { TRACKED_REPORT, TRACKED_ROOM, bytes, mayRead, profileOf } from './model.js';
import { useDocs } from './store.js';
import { ReleaseControls, StateChip, day, docHref, plural, when } from './ui.js';

import Deliverable from './DeliverablePage.js';
import Capture from './CapturePage.js';

type Filter = 'mine' | 'open' | 'all' | 'na';
/** Is there a step here that this role, and not someone else, takes next? */
export function needsMe(d: WorkingDoc, role: RoleKey, can: (id: string) => boolean): boolean {
  if (!d.applies) return false; const s = d.submission; const owner = d.owner?.role ?? d.ownerRole;
  if (can('docs.acknowledge') && d.acknowledgements.outstanding.some((a) => a.role === role)) return true;
  if (d.gate === 'dossier' && !d.test) return false;                                   // read from the dossier's deficiencies: nothing to do here
  if (can('docs.review') && d.state === 'SUBMITTED' && !!s && s.by.role !== role) return true;
  if (can('docs.submit') && owner === role && (d.state === 'NOT_STARTED' || d.state === 'ASSIGNED' || d.state === 'CORRECTION_REQUESTED' || d.state === 'OUTDATED' || (d.state === 'ACCEPTED' && d.findings.some((f) => f.blocking)))) return true;
  if (can('docs.assign') && !d.owner && !s) return true;
  return false;
}

export default function Docs(p: PageProps) {
  const report = p.params['report']; const item = p.params['doc'];
  if (report === 'applies') return <Applies {...p} />;
  if (report && report !== TRACKED_REPORT) return (
    <div className="pa d5" data-native="" data-testid="docs-missing"><Crumbs items={[['Commissioning & Assurance', '#/commissioning'], ['Documentation']]} /><h1 className="ui-visually-hidden">Documentation not found</h1>
      <EmptyState title="No documentation under that report number" icon="search" action={<a className="ui-btn" href={docHref()}>Open {TRACKED_REPORT}</a>}>The demonstration tracks the documentation of one room, the room of the commissioning dossier. What would be required of any other room is on the <a href="#/docs/applies">applicability page</a>.</EmptyState></div>);
  if (item === 'capture') return <Capture {...p} />;
  if (item) return <Deliverable {...p} />;
  return <Checklist {...p} />;
}

function Checklist({ role, can, sees }: PageProps) {
  const { working: w, dossier, captures, events, reset } = useDocs();
  const [filter, setFilter] = useState<Filter>('mine'); const [allMissing, setAllMissing] = useState(false);
  if (!w) return <div className="pa d5" data-native="" data-testid="docs-missing"><EmptyState title="The room’s record could not be read" icon="alert">Nothing can be said about its documentation without it.</EmptyState></div>;
  const narrow = role === 'sitechamp';
  const docs = w.docs.filter((d) => mayRead(role, d.acknowledgements.need));
  const req = docs.filter((d) => d.applies); const mine = req.filter((d) => needsMe(d, role, can)); const open = req.filter((d) => !d.met); const overdue = req.filter((d) => d.overdue);
  const eff: Filter = filter === 'mine' && !mine.length ? 'open' : filter;
  const shown = eff === 'mine' ? mine : eff === 'open' ? open : eff === 'all' ? req : docs.filter((d) => !d.applies);
  const missing = whatIsMissing(w).filter((m) => docs.some((d) => d.type === m.doc)); const viaTest = open.filter((d) => d.gate === 'dossier').length;
  const acts = can('docs.submit') || can('docs.review') || can('docs.assign') || can('docs.acknowledge') || can('docs.vendor');
  return (
    <div className="pa d5" data-native="" data-testid="docs" data-required={w.required} data-met={w.met} data-blockers={w.blockers.length} data-dropped={w.dropped}>
      <Crumbs items={narrow ? [['My site', '#/site'], ['Documentation']] : [['Commissioning & Assurance', '#/commissioning'], [`Dossier ${TRACKED_REPORT}`, `#/dossier/${TRACKED_REPORT}`], ['Documentation']]} />
      <PageHero compact eyebrow="Commissioning · Phase 5" title={narrow ? 'What you are asked to read and acknowledge' : `Documentation · ${D.room.name}`} product="commissioning" icon="book"
        lede={narrow ? 'As the room’s site champion you acknowledge the operator guide once it is accepted. That is all of the engineering record you are shown.'
          : `${w.met} of ${w.required} required documents are complete. ${w.blockers.length ? `${plural(w.blockers.length, 'document stops', 'documents stop')} acceptance here` : 'No document stops acceptance here'}${viaTest ? `; ${plural(viaTest, 'more is', 'more are')} decided by the dossier` : ''}.`}
        meta={[...honest(['Synthetic data', 'warn'], ['Files stay on the device', 'muted']), <Chip key="r" small tone="muted">{TRACKED_ROOM}</Chip>]}
        actions={narrow ? undefined : <>{can('docs.capture') ? <a className="ui-btn ui-btn--primary" href={docHref('capture')} data-testid="docs-capture-link">Capture in the room</a> : null}<a className="ui-btn" href={`#/dossier/${TRACKED_REPORT}`}>Open the dossier</a></>} />

      {narrow ? null : <div className="kit-grid kit-grid--tiles" data-testid="docs-totals">
        <StatTile testId="docs-complete" label="Complete" value={`${w.met} of ${w.required}`} tone={w.met === w.required ? 'ok' : 'warn'} hint="required for this room" />
        <StatTile testId="docs-blocking" label="Stop acceptance" value={w.blockers.length} tone={w.blockers.length ? 'bad' : 'ok'} hint={viaTest ? `${viaTest} more through a test on the dossier` : 'documents gated by this tracker'} />
        <StatTile testId="docs-overdue" label="Overdue" value={overdue.length} tone={overdue.length ? 'bad' : 'ok'} hint={overdue.length ? `oldest was due ${day([...overdue].sort((a, b) => a.due!.localeCompare(b.due!))[0]!.due!)}` : 'nothing past its due date'} />
        <StatTile testId="docs-mine" label={`For the ${ROLES[role].label}`} value={mine.length} tone={mine.length ? 'warn' : 'ok'} hint={mine.length ? 'a step is yours to take' : 'nothing is waiting for you'} />
      </div>}

      <section className="d5-list" aria-labelledby="d5-list-h">
        <header><h2 id="d5-list-h">{narrow ? 'For you' : 'Checklist'}</h2>
          {narrow ? null : <Segmented<Filter> label="Which documents" small value={eff} onChange={setFilter} options={[{ value: 'mine', label: 'Needs me', count: mine.length }, { value: 'open', label: 'Open', count: open.length }, { value: 'all', label: 'All required', count: req.length }, { value: 'na', label: 'Does not apply', count: docs.length - req.length }]} />}</header>
        {filter === 'mine' && !mine.length && !narrow ? <p className="d5-note" data-testid="docs-nothing-mine">Nothing is waiting for the {ROLES[role].label}. Showing what is open.</p> : null}
        {shown.length ? <ul data-testid="docs-list">{shown.map((d) => { const first = d.findings.find((f) => f.blocking) ?? d.findings[0]; const s = d.submission; return (
          narrow ? <li key={d.type} data-doc={d.type} data-state={d.state} data-met={d.acknowledgements.outstanding.length ? 'no' : 'yes'} data-mine={needsMe(d, role, can) ? 'yes' : 'no'}>
            <div className="d5-row__head"><a href={docHref(d.type)}>{d.title}</a><StateChip d={d} /></div>
            <p className="d5-row__meta">{s ? `Revision ${s.revision}, from the ${s.by.label}` : 'Not issued yet'}{d.accepted ? ` · accepted by the ${d.accepted.by.label}` : ''}</p>
            <p className="d5-row__finding" data-blocking="no"><Icon name={needsMe(d, role, can) ? 'info' : 'check'} size={16} /><span>{needsMe(d, role, can) ? `Revision ${d.accepted!.revision} is waiting for you to read and acknowledge it.` : d.accepted ? 'You have acknowledged it.' : 'There is nothing to acknowledge until it is accepted.'}</span></p>
          </li> : <li key={d.type} data-doc={d.type} data-state={d.state} data-met={d.met ? 'yes' : 'no'} data-gate={d.gate} data-mine={needsMe(d, role, can) ? 'yes' : 'no'}>
            <div className="d5-row__head"><a href={docHref(d.type)}>{d.title}</a><StateChip d={d} />{d.overdue ? <Chip small tone="bad">Overdue</Chip> : null}{d.applies && d.met && d.state !== 'ACCEPTED' ? <Chip small tone="ok">Met on the dossier</Chip> : null}</div>
            {d.applies ? <p className="d5-row__meta">{d.gate === 'dossier' && !d.test ? 'Nothing is submitted here' : d.owner ? d.owner.label : `${d.ownerLabel} by default, not yet assigned`}{d.due ? ` · due ${day(d.due)}` : ''}{s ? ` · revision ${s.revision}${s.vendor ? `, from ${s.vendor}` : ''}${s.attachment ? ` · ${s.attachment.name} (${bytes(s.attachment.bytes)})` : ''}` : ''}
              {d.test ? <> · decided at acceptance by test <a href={`#/dossier/${TRACKED_REPORT}?focus=${d.test}`}><code>{d.test}</code></a></> : d.gate === 'dossier' ? ' · read from the dossier’s deficiencies' : ''}</p> : null}
            <p className="d5-row__why">{d.applies ? 'Required: ' : 'Not required: '}{d.why.charAt(0).toLowerCase()}{d.why.slice(1)}.</p>
            {first ? <p className="d5-row__finding" data-blocking={first.blocking ? 'yes' : 'no'}><Icon name={first.blocking ? 'alert' : 'info'} size={16} /><span>{first.detail}{d.findings.length > 1 ? ` And ${plural(d.findings.length - 1, 'more finding')}.` : ''}</span></p> : null}
          </li>); })}</ul>
          : <EmptyState title={eff === 'na' ? 'Everything applies to this room' : eff === 'open' ? 'Every required document is complete' : 'Nothing here'} icon="check">{eff === 'open' ? 'Nothing in the documentation stops acceptance.' : null}</EmptyState>}
      </section>

      {narrow ? null : <div className="d5-grid">
        <Card title="What is missing" icon="alert" sub="Each line is one finding from the record, with what would correct it. Nothing is written by a model, and nothing is assumed." testId="docs-missing-list">
          {missing.length ? <><ul className="d5-findings">{(allMissing ? missing : missing.slice(0, 6)).map((m, i) => <li key={i} data-finding={m.finding.kind} data-doc={m.doc} data-blocking={m.finding.blocking ? 'yes' : 'no'}><Icon name={m.finding.blocking ? 'alert' : 'info'} size={16} /><span><a href={docHref(m.doc)}>{m.title}</a>. <b>{m.finding.detail}</b> {m.finding.action}</span></li>)}</ul>
            {missing.length > 6 ? <button type="button" className="ui-btn ui-btn--sm" aria-expanded={allMissing} onClick={() => setAllMissing((v) => !v)} data-testid="docs-missing-more">{allMissing ? 'Show fewer' : `Show all ${missing.length}`}</button> : null}</>
            : <p className="d5-note">Nothing is missing.</p>}
        </Card>
        <Card title="Release controls" icon="shield" sub="The ten checks before acceptance." testId="docs-release">
          <ReleaseControls dossier={dossier} docs={w} />
        </Card>
      </div>}

      {narrow ? null : <Card title="Field captures" icon="camera" sub="Photographs, notes and measurements taken in the room and synchronised to this record. The photographs stay in this browser." testId="docs-captures">
        {captures.length ? <ul className="d5-caps">{captures.map((c) => <li key={c.key} data-capture={c.key}><b><code>{c.key}</code> for {c.target.kind === 'test' ? `test ${c.target.id}` : w.docs.find((d) => d.type === c.target.id)?.title ?? c.target.id}</b>
          <span>{c.by.label} · {when(c.at)}{c.photo ? ` · ${c.photo.name} (${bytes(c.photo.bytes)}${c.photo.annotated ? ', annotated' : ''})` : ' · no photograph'}{c.measurements.length ? ` · ${plural(c.measurements.length, 'measurement')}` : ''}</span>
          {c.note ? <p>{c.note}</p> : null}
          {c.measurements.length ? <ul>{c.measurements.map((m, i) => <li key={i}>{m.quantity}: <b>{m.value} {m.unit}</b>, {m.instrument}, {m.method}</li>)}</ul> : null}</li>)}</ul>
          : <p className="d5-note">None yet.{can('docs.capture') ? ' Open field capture on a phone in the room.' : ''}</p>}
      </Card>}

      {sees('engineering') ? <p className="d5-foot"><a href="#/docs/applies">What applies to which room, and why</a>{acts && (events.length || captures.length) ? <> · <button type="button" className="d5-linkbtn" onClick={reset} data-testid="docs-reset">Start the demonstration again</button> ({plural(events.length, 'step')} added in this browser)</> : null}</p> : null}
      {w.dropped ? <p className="d5-note" data-testid="docs-dropped">{plural(w.dropped, 'stored record was', 'stored records were')} refused by the rules and left out.</p> : null}
    </div>
  );
}

function Applies({ sees }: PageProps) {
  const recs = useMemo(() => allRecords().map((r) => ({ r, p: profileOf(r) })).sort((a, b) => a.r.outline.name.localeCompare(b.r.outline.name)), []);
  const defaults = useMemo(() => { const by = [...recs].filter((x) => x.p.devices > 0).sort((a, b) => a.p.devices - b.p.devices || a.p.seats - b.p.seats); return [by[0]!.p.roomId, TRACKED_ROOM, by[by.length - 1]!.p.roomId]; }, [recs]);
  const [picked, setPicked] = useState<string[]>(defaults);
  if (!sees('engineering')) return <div className="pa d5" data-native="" data-testid="docs-applies-hidden"><h1 className="ui-visually-hidden">Applicability</h1><EmptyState title="Not part of this role’s view" icon="lock">Which engineering documents a room needs is shown to the roles that produce and review them.</EmptyState></div>;
  const cols = picked.map((id) => recs.find((x) => x.p.roomId === id)!).filter(Boolean);
  return (
    <div className="pa d5" data-native="" data-testid="docs-applies">
      <Crumbs items={[['Commissioning & Assurance', '#/commissioning'], ['Documentation', docHref()], ['What applies']]} />
      <PageHero compact eyebrow="Commissioning · Phase 5" title="What applies to which room" product="commissioning" icon="filter"
        lede="The same eighteen deliverables are considered for every room. A rule decides whether each applies, from the room’s own record, and says why. A small room is not asked for what it has nothing to show."
        meta={honest(['Synthetic data', 'warn'], ['Rules, not a status: only the dossier’s room is tracked', 'muted'])} />
      <div className="d5-applies" data-testid="applies-grid">{cols.map(({ r, p }, i) => { const q = requiredFor(p, p.roomId === TRACKED_ROOM ? 2 : 0); const n = q.filter((x) => x.applies).length; return (
        <section key={i} className="d5-applies__col" data-room={p.roomId} data-required={n} aria-labelledby={`ap-${i}`}>
          <div className="ui-field"><label htmlFor={`ap-sel-${i}`}>Room {i + 1}</label>
            <select id={`ap-sel-${i}`} value={p.roomId} onChange={(e) => setPicked((v) => v.map((x, k) => (k === i ? e.target.value : x)))} data-testid={`applies-room-${i}`}>{recs.map((x) => <option key={x.p.roomId} value={x.p.roomId}>{x.r.outline.name} · {x.p.seats} seats</option>)}</select></div>
          <h2 id={`ap-${i}`}>{r.outline.name}</h2>
          <p className="d5-note">{p.seats} seats · {plural(p.devices, 'installed position')} · <b>{n} of {DELIVERABLES.length} required</b>{p.roomId === TRACKED_ROOM ? <> · <a href={docHref()}>tracked</a></> : null}</p>
          <ul>{q.map((x) => <li key={x.type} data-doc={x.type} data-applies={x.applies ? 'yes' : 'no'}><Icon name={x.applies ? 'check' : 'close'} size={16} label={x.applies ? 'Required' : 'Not required'} /><span><b>{x.title}</b><span>{x.why}.{x.applies ? ` ${x.ownerLabel}.` : ''}</span></span></li>)}</ul>
        </section>); })}</div>
    </div>
  );
}
