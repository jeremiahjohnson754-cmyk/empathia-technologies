/**
 * #/knowledge/sources — governed document ingestion, SIMULATED (founder's directive of 11 Nov 2026, §09). The journey a customer's
 * administrator and reviewers take to bring the customer's own documents into the Knowledge Ledger: Connect → Authorize → Select
 * scope → Preview → Classify → Import → Validate → Index → Approve → Surface. Each step is real state with a rule (ingest.ts ›
 * advance), written through the one write path (store.ts › act) with an audit line. After the first run, "Keep it in step" lets a
 * visitor change the simulated source (rename, edit, delete, revoke, throttle) and sync, to see what follows.
 *
 * The page says what is not there: no document system is connected, nothing was validated against a real library, and malware
 * scanning and embeddings are not built. Imported text is shown as text; nothing here builds markup from a document.
 * The step is kept in the address (?step=) without a navigation, and focus moves to the step's heading.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Button, Notice, Tag, Field, Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { mayRead } from './contract.js';
import { DIRECTORY, readerFor, hrefOfObject } from './ledger.js';
import { loadState, act, type Stored } from './store.js';
import { STEPS, STEP_WORD, KINDS, ALLOWED_TYPES, MAX_BYTES, MAX_ATTEMPTS, STALE_AFTER_DAYS, connected, stepAt, foldersOf, folderOf, nameOf, previewOf, conflictsVisible, objectsOf, inScope, staleness, type DocKind, type IngestAction, type Item, type Step, type SyncReport } from './ingest.js';
import { HOME_TENANT, tenantName } from './types.js';

const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const GUESS: Record<string, DocKind> = { '/Standards': 'standard', '/Runbooks': 'procedure', '/Incidents': 'incident-review' };
const NAME_KEY = 'empathia.demo.knowledge.reviewer';
const groupWords = (g: string) => `${g} (${(DIRECTORY[HOME_TENANT]?.[g] || []).map((r) => ROLES[r].label).join(', ') || 'nobody'})`;
const statusOf = (it: Item | undefined, scoped: boolean, imported: boolean): [string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'] =>
  !scoped ? ['Outside the scope: not read', 'muted'] : !it ? [imported ? 'Not in the index' : 'Not imported yet', 'muted'] : it.status === 'REFUSED' ? ['Refused', 'bad'] : it.flags.includes('INSTRUCTION_LIKE') ? ['Held: instruction-like text', 'warn'] : it.rejected ? ['Rejected by a reviewer', 'muted'] : it.approved ? ['Approved', 'ok'] : ['Candidate', 'info'];

function Report({ r }: { r: SyncReport }) {
  const rows: Array<[string, string[]]> = [['Added', r.added], ['Updated', r.updated], ['Renamed', r.renamed], ['Removed from the index, with everything derived from them', r.removed], ['Access changed at the source', r.permissions], ['Returned to review because the text changed', r.returnedToReview], ['Refused', r.refused], ['Flagged', r.flagged]];
  const quiet = r.ok && rows.every(([, l]) => !l.length);
  return (<div className="kn-report" data-testid="ing-report" data-ok={r.ok ? 'yes' : 'no'} data-attempts={r.attempts.length} data-removed={r.removed.length} data-updated={r.updated.length} data-renamed={r.renamed.length} data-permissions={r.permissions.length} data-added={r.added.length}>
    <p><Tag tone={r.ok ? 'ok' : 'bad'}>{r.ok ? (r.full ? 'Full read' : 'Changes since the last read') : 'Not synced'}</Tag> <Tag tone="warn">SIMULATED</Tag> <span className="ui-meta">{r.at.slice(0, 16).replace('T', ' ')} UTC</span></p>
    {!r.ok && <p>{r.why}</p>}
    {r.attempts.length > 0 && <p data-testid="ing-backoff">The source answered “slow down” {plural(r.attempts.length, 'time')}. Waited {r.attempts.map((a) => `${a.waitS} s`).join(', then ')} before asking again (the waits are reported, not slept: the source is simulated).</p>}
    {quiet && <p>Nothing had changed at the source.</p>}
    {rows.filter(([, l]) => l.length).map(([h, l]) => <div key={h}><b>{h}</b><ul>{l.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
  </div>);
}

export default function IngestPage({ role, query, can }: PageProps) {
  const { apply } = useWorkspace(); const [stored, setStored] = useState<Stored>(() => loadState()); const s = stored.ingest; const ix = s.index;
  const admin = can('knowledge.sources.admin'); const reviewer = can('knowledge.sources.approve'); const reader = useMemo(() => readerFor(role), [role]);
  const frontier = stepAt(s); const want = query.get('step') as Step | null;
  const [step, setStepRaw] = useState<Step>(() => (want && STEPS.includes(want) && STEPS.indexOf(want) <= STEPS.indexOf(frontier) ? want : frontier));
  const [said, setSaid] = useState(''); const [refused, setRefused] = useState<string | null>(null); const [name, setNameRaw] = useState(() => { try { return sessionStorage.getItem(NAME_KEY) || ''; } catch { return ''; } });
  const [authName, setAuthName] = useState(''); const [folders, setFolders] = useState<string[]>(() => (ix.scope.length ? ix.scope : foldersOf(s.source).filter((f) => f !== '/People')));
  const [kinds, setKinds] = useState<Record<string, string>>(() => ({ ...GUESS, ...ix.kinds })); const [pick, setPick] = useState(''); const [group, setGroup] = useState(''); const [sure, setSure] = useState(false); const [why, setWhy] = useState(''); const [rejecting, setRejecting] = useState<string | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null); const fbRef = useRef<HTMLDivElement>(null); const railRef = useRef<HTMLOListElement>(null); const moved = useRef(false);
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  const setName = (v: string) => { setNameRaw(v); try { sessionStorage.setItem(NAME_KEY, v); } catch { /* the name lasts the page */ } };

  useEffect(() => { try { history.replaceState(null, '', `#/knowledge/sources?step=${step}`); } catch { /* the address stays */ } }, [step]);
  useEffect(() => { if (moved.current) headRef.current?.focus(); railRef.current?.querySelector('[aria-current=step]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' }); }, [step]);
  // a link to another step of this page (from the ledger, from Surface) moves there, when the journey has got that far
  useEffect(() => { const q = query.get('step') as Step | null; if (q && STEPS.includes(q) && STEPS.indexOf(q) <= STEPS.indexOf(stepAt(s))) { moved.current = true; setStepRaw(q); } }, [query.get('step')]);   // eslint-disable-line react-hooks/exhaustive-deps
  /** Take an action through the one write path. `next`: the step to show when it succeeds. */
  const run = (a: IngestAction, next?: Step): boolean => {
    const out = apply((w) => act(w, role, { t: 'ingest', a }));
    if ('why' in out) { setRefused(out.why.join(' ')); setSaid(''); requestAnimationFrame(() => fbRef.current?.focus()); return false; }
    setStored(out.state);
    // a sync the source refused is saved (the throttle was used up and the report is kept) but it is not a success, and is not said as one
    const failed = (a.t === 'sync' || a.t === 'import') && out.state.ingest.reports[0]?.ok === false;
    if (failed) { setRefused(out.state.ingest.reports[0]!.why || 'The source did not answer.'); setSaid(''); requestAnimationFrame(() => fbRef.current?.focus()); return false; }
    setRefused(null); setSaid(out.said);
    if (next) { moved.current = true; setStepRaw(next); } else requestAnimationFrame(() => fbRef.current?.focus());
    return true;
  };
  const go = (to: Step) => { moved.current = true; if (STEPS.indexOf(to) > STEPS.indexOf(frontier)) { setRefused(`${STEP_WORD[to][0]} is not open yet. ${STEP_WORD[frontier][0]} comes first.`); setSaid(''); setStepRaw(frontier); return; } setRefused(null); setSaid(''); setStepRaw(to); };
  const nextOf = (x: Step) => STEPS[STEPS.indexOf(x) + 1] || 'surface';

  const items = Object.values(ix.items).sort((a, b) => a.path.localeCompare(b.path)); const docs = Object.values(s.source.docs).sort((a, b) => a.path.localeCompare(b.path));
  const objects = useMemo(() => objectsOf(ix), [ix]);
  // The administrator sees the library's names and access lists. A document's CONTENT (its title, text and what was read from it) is
  // shown only to someone the source lists as its reader, administrator or not; a reviewer is not shown a document they may not read.
  const listed = (groups: readonly string[]) => reader.tenant === ix.tenant && groups.some((g) => reader.groups.includes(g)); const reads = (i: Item) => listed(i.groups);
  const preview = useMemo(() => previewOf(s, folders), [s, folders]); const conflicts = conflictsVisible(ix, (docId) => !!ix.items[docId] && reads(ix.items[docId]!));
  const WITHHELD = <span className="ui-meta" data-testid="ing-withheld">The source does not list you as a reader of this document, so its content is not shown to you.</span>;
  const candidates = items.filter((i) => i.status === 'CANDIDATE'); const approved = objects.filter((o) => o.zone === 3); const stale = staleness(ix, new Date().toISOString());
  const indexed = ix.stage === 'INDEXED'; const picked = pick && s.source.docs[pick] ? s.source.docs[pick]! : null;
  const head = (x: Step) => <h2 className="build__h" tabIndex={-1} ref={headRef}>{STEP_WORD[x][1]}</h2>;
  const adminOnly = <p className="ui-muted" data-testid="ing-admin-only">This step is taken by {tenantName(HOME_TENANT)}’s administrator. You are the {ROLES[role].label}.</p>;

  return (
    <section className="kn kn-ing" data-native="" data-testid="ing-page" data-step={step} data-frontier={frontier} data-pipeline={ix.stage} data-connected={s.connected ? 'yes' : 'no'} data-items={items.length}>
      <PageHero compact eyebrow={<a href="#/knowledge">Knowledge Ledger</a>} icon="link" product="search-party" title="Document sources"
        lede="How a customer’s own documents come into the ledger: under the customer’s authority, only the folders it chooses, only to the readers the source lists, and as candidates until a person approves them."
        meta={[<Tag key="m" tone="warn">Simulated source</Tag>, <Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">You are the {ROLES[role].label}</span>]} />
      <div data-testid="ing-honest"><Notice tone="warn"><b>Simulated.</b> No document system is connected ({connected().length} real sources). The library on this page is synthetic and lives in this browser; nothing was validated against a real library. Malware scanning is not implemented, and no embeddings are built: search here is by words.</Notice></div>

      <nav aria-label="Steps of bringing documents in"><ol className="hr-rail kn-rail" data-testid="ing-rail" ref={railRef}>{STEPS.map((x, i) => { const isDone = s.done.includes(x); return (
        <li key={x} className={x === step ? 'on' : isDone ? 'done' : ''}><button type="button" aria-current={x === step ? 'step' : undefined} onClick={() => go(x)} data-testid={`ing-step-${x}`}><span className="hr-rail__n" aria-hidden="true">{isDone ? <Icon name="check" size={14} /> : i + 1}</span>{STEP_WORD[x][0]}{isDone && <span className="ui-visually-hidden"> (done)</span>}</button></li>); })}</ol></nav>

      <div className="kn-ing__cols">
        <div className="kn-main">
          <div ref={fbRef} tabIndex={-1} className="kn-feedback" aria-live="polite">{refused ? <div data-testid="ing-refused"><Notice tone="bad"><b>Refused.</b> {refused}</Notice></div> : said ? <div data-testid="ing-said"><Notice tone="ok">{said}.</Notice></div> : null}</div>
          {s.disconnected && step === 'connect' && <div data-testid="ing-disconnected"><Notice tone="info">The source was disconnected on {s.disconnected.on.slice(0, 10)}. {plural(s.disconnected.removed, 'index entry', 'index entries')} and everything derived from them were removed. The source itself was not touched.</Notice></div>}

          {step === 'connect' && <div data-testid="ing-connect">{head('connect')}
            <p>A connection names one document library of the customer. Here it is a simulated one: “{s.source.site} / {s.source.library}”, {plural(docs.length, 'document')} in {plural(foldersOf(s.source).length, 'folder')}.</p>
            <p className="ui-muted">A real connection would be an application registered by the customer’s administrator, given read access to the sites the customer selects and to nothing else, with its credentials held on a server and never in a page. None of that exists here.</p>
            {s.connected ? <p><Tag tone="ok">Connected (simulated)</Tag></p> : admin ? <p><Button kind="primary" onClick={() => run({ t: 'connect' }, 'authorize')} testId="ing-do-connect">Connect the simulated source</Button></p> : adminOnly}
          </div>}

          {step === 'authorize' && <div data-testid="ing-authorize">{head('authorize')}
            <p>What is asked for: <b>read-only access to this one site</b>. Not the whole organisation; nothing can be written or deleted at the source; no mail, chat or people.</p>
            {s.authorized ? <p data-testid="ing-authorized"><Tag tone="ok">Authorized</Tag> by {s.authorized.by} on {s.authorized.on}.</p> : admin ? <>
              <Field label="Administrator authorizing this" hint="Recorded with the authorization.">{(id, d) => <input id={id} aria-describedby={d} value={authName} maxLength={80} autoComplete="off" onChange={(e) => setAuthName(e.target.value)} data-testid="ing-auth-name" />}</Field>
              <p><Button kind="primary" onClick={() => run({ t: 'authorize', name: authName }, 'scope')} testId="ing-do-authorize">Authorize read access to this site only</Button></p></> : adminOnly}
          </div>}

          {step === 'scope' && <div data-testid="ing-scope">{head('scope')}
            <p>Choose the folders to read. Nothing outside them is read, listed or counted.</p>
            <ul className="kn-checks">{foldersOf(s.source).map((f) => { const n = docs.filter((d) => folderOf(d.path) === f).length; return (
              <li key={f}><label><input type="checkbox" checked={folders.includes(f)} disabled={!admin} onChange={(e) => setFolders(e.target.checked ? [...folders, f].sort() : folders.filter((x) => x !== f))} data-testid={`ing-folder-${f.slice(1)}`} /><span><b>{f}</b> <span className="ui-meta">{plural(n, 'document')}{f === '/People' ? ' · holds employee information: left out unless the customer decides otherwise' : ''}</span></span></label></li>); })}</ul>
            {ix.scope.length > 0 && <p className="ui-meta" data-testid="ing-scope-now">In scope now: {ix.scope.join(', ')}.</p>}
            {admin ? <p><Button kind="primary" onClick={() => run({ t: 'scope', folders }, 'preview')} testId="ing-do-scope">Use these folders</Button></p> : adminOnly}
          </div>}

          {step === 'preview' && <div data-testid="ing-preview" data-rows={preview.length}>{head('preview')}
            <p>What an import would do with each document in {ix.scope.join(', ') || 'the scope'}. Nothing has been imported.</p>
            <ul className="kn-rows">{preview.map((p) => <li key={p.path} data-verdict={p.verdict}><b>{p.path}</b><span className="ui-meta">v{p.version} · changed {p.modified} · readers: {p.groups.join(', ') || 'none listed'}</span><span><Tag tone={p.verdict === 'import' ? 'ok' : p.verdict === 'flag' ? 'warn' : 'bad'}>{p.verdict === 'import' ? 'Would be imported' : p.verdict === 'flag' ? 'Would be imported and held' : 'Would be refused'}</Tag> {p.why}</span></li>)}</ul>
            <p className="ui-meta">Allowed file types: {ALLOWED_TYPES.map((x) => `.${x}`).join(', ')}. Largest file: {MAX_BYTES / 1024 / 1024} MB. Malware scanning is not implemented.</p>
            {admin ? <p><Button kind="primary" onClick={() => run({ t: 'preview' }, 'classify')} testId="ing-do-preview">I have read the preview</Button></p> : adminOnly}
          </div>}

          {step === 'classify' && <div data-testid="ing-classify">{head('classify')}
            <p>Say what each folder holds. It decides how much weight a document carries once approved, and a folder with no answer is not imported.</p>
            <ul className="kn-classes">{ix.scope.map((f) => <li key={f}><label><span><b>{f}</b></span><select value={kinds[f] || ''} disabled={!admin} onChange={(e) => setKinds({ ...kinds, [f]: e.target.value })} data-testid={`ing-kind-${f.slice(1)}`}><option value="">Choose what it holds</option>{(Object.keys(KINDS) as DocKind[]).map((k) => <option key={k} value={k}>{KINDS[k].label}</option>)}</select></label></li>)}</ul>
            {admin ? <p><Button kind="primary" onClick={() => run({ t: 'classify', kinds }, 'import')} testId="ing-do-classify">Save the classification</Button></p> : adminOnly}
          </div>}

          {step === 'import' && <div data-testid="ing-import">{head('import')}
            <p>Reads every document in the scope once and remembers where it got to, so that the next read asks only for what changed.</p>
            {ix.stage !== 'NONE' && <p data-testid="ing-imported"><Tag tone="ok">Imported</Tag> {plural(items.length, 'document')} read; {plural(items.filter((i) => i.status === 'REFUSED').length, 'was', 'were')} refused.</p>}
            {admin && s.reports[0] && <Report r={s.reports[0]} />}
            {admin ? <p>{ix.stage === 'NONE' ? <Button kind="primary" onClick={() => run({ t: 'import' })} testId="ing-do-import">Import now</Button> : <Button kind="primary" onClick={() => go('validate')} testId="ing-next">Next: Validate</Button>}</p> : adminOnly}
          </div>}

          {step === 'validate' && <div data-testid="ing-validate" data-refused={items.filter((i) => i.status === 'REFUSED').length} data-flagged={items.filter((i) => i.flags.includes('INSTRUCTION_LIKE')).length} data-conflicts={conflicts.length}>{head('validate')}
            <p>Every imported document is treated as untrusted. Its text is kept and shown as text; it is never run, followed or drawn as a page.</p>
            <h3 className="kn-h3">Refused, with the reason</h3>
            {items.some((i) => i.status === 'REFUSED') ? <ul className="kn-rows" data-testid="ing-refusals">{items.filter((i) => i.status === 'REFUSED').map((i) => <li key={i.docId}><b>{i.path}</b><span>{i.refusal}</span></li>)}</ul> : <p className="ui-muted">Nothing was refused.</p>}
            <h3 className="kn-h3">Flagged</h3>
            {items.some((i) => i.flags.length) ? <ul className="kn-rows" data-testid="ing-flags">{items.filter((i) => i.flags.length).map((i) => <li key={i.docId} data-flags={i.flags.join(' ')}><b>{i.path}</b>
              {i.flags.includes('INSTRUCTION_LIKE') && <span><Tag tone="warn">Instruction-like text</Tag> It reads as an instruction to a system. It was not followed and it changed nothing: no access, no other document. The document is held back from approval. {reads(i) ? <>The line{i.flagged.length === 1 ? '' : 's'}, as text: {i.flagged.map((l) => <q key={l} className="kn-quoted">{l}</q>)}</> : null}</span>}
              {i.flags.includes('MARKUP_AS_TEXT') && <span><Tag tone="info">Contains markup</Tag> It is shown as the characters that were typed, never as a page.</span>}</li>)}</ul> : <p className="ui-muted">Nothing was flagged.</p>}
            <h3 className="kn-h3">Documents that disagree</h3>
            {conflicts.length ? <ul className="kn-rows" data-testid="ing-conflicts">{conflicts.map((c) => <li key={c.key} data-key={c.key}><b>{c.label}</b>{c.entries.map((e) => <span key={e.docId}>{e.path} (v{e.version}, line {e.line}) says <b>{e.value}</b></span>)}<span className="ui-meta">Both are kept. Nothing was chosen for you: a person settles it at the source.</span></li>)}</ul> : <p className="ui-muted">No two documents state different values for the same thing.</p>}
            {admin ? <p>{ix.stage === 'IMPORTED' ? <Button kind="primary" onClick={() => run({ t: 'validate' }, 'index')} testId="ing-do-validate">Mark as validated</Button> : <Button kind="primary" onClick={() => go('index')} testId="ing-next">Next: Index</Button>}</p> : adminOnly}
          </div>}

          {step === 'index' && <div data-testid="ing-index" data-candidates={candidates.length}>{head('index')}
            <p>What was read from each document, with where it came from, how it was obtained and how sure the reading is. These are candidates: none is knowledge until a reviewer approves it.</p>
            <ul className="kn-rows">{candidates.map((i) => <li key={i.docId} data-doc={i.docId}><b>{reads(i) ? i.title : nameOf(i.path)}</b><span className="ui-meta">{i.path} · v{i.version}{i.history.length > 1 ? ` · ${plural(i.history.length, 'version')} seen` : ''}</span>
              {!reads(i) && WITHHELD}
              {reads(i) && i.facts.length > 0 && <ul className="kn-facts-list">{i.facts.map((f) => <li key={`${f.line}:${f.key}`}><span>{f.label}: <b>{f.value}</b></span> <Tag tone="info">{f.derivation}</Tag> <span className="ui-meta">line {f.line} of {f.source} · confidence {Math.round(f.confidence * 100)}%</span></li>)}</ul>}
              {reads(i) && i.relations.length > 0 && <ul className="kn-facts-list">{i.relations.map((r) => <li key={r.to}><span>{r.why}: <b>{r.to.replace(/^cat:/, '')}</b></span> <Tag tone={r.derivation === 'INFERRED' ? 'warn' : 'info'}>{r.derivation}</Tag> <span className="ui-meta">line {r.line} of {r.source} · confidence {Math.round(r.confidence * 100)}%</span></li>)}</ul>}
            </li>)}</ul>
            {admin ? <p>{!indexed ? <Button kind="primary" onClick={() => run({ t: 'index' }, 'approve')} testId="ing-do-index">Index as candidates</Button> : <Button kind="primary" onClick={() => go('approve')} testId="ing-next">Next: Approve</Button>}</p> : adminOnly}
          </div>}

          {step === 'approve' && <div data-testid="ing-approve" data-approved={approved.length}>{head('approve')}
            <p>A reviewer the source lets read the document approves the exact version that was read. If the document changes, it returns here. A model or an automation can never approve.</p>
            {reviewer ? <Field label="Your name, as the reviewer" hint="Recorded with each decision.">{(id, d) => <input id={id} aria-describedby={d} value={name} maxLength={80} autoComplete="off" onChange={(e) => setName(e.target.value)} data-testid="ing-name" />}</Field> : <p className="ui-muted" data-testid="ing-reviewer-only">A reviewer approves each document. You are the {ROLES[role].label}; {plural(candidates.filter((i) => !i.approved && !i.rejected).length, 'document')} wait for one.</p>}
            <ul className="kn-rows" data-testid="ing-cands">{candidates.filter((i) => admin || reads(i)).map((i) => { const [word, tone] = statusOf(i, true, true); const held = i.flags.includes('INSTRUCTION_LIKE'); return (
              <li key={i.docId} data-doc={i.docId} data-status={i.approved ? 'approved' : i.rejected ? 'rejected' : held ? 'held' : 'candidate'}><b>{reads(i) ? i.title : nameOf(i.path)}</b><span className="ui-meta">{i.path} · v{i.version} · readers: {i.groups.join(', ')}</span>
                <span><Tag tone={tone}>{word}</Tag>{i.approved ? ` by ${i.approved.by} on ${i.approved.on}` : i.rejected ? ` by ${i.rejected.by}: ${i.rejected.why}` : ''}</span>
                {!reads(i) && WITHHELD}
                {reads(i) && !i.approved && !i.rejected && <span className="kn-quoted-body">{i.body.slice(0, 3).join(' ')}</span>}
                {reviewer && reads(i) && !i.approved && !i.rejected && <span className="kn-cand__a">
                  <Button kind="primary" small onClick={() => run({ t: 'approve', docId: i.docId, name })} testId="ing-do-approve">Approve this version</Button>
                  <Button small onClick={() => { setRejecting(rejecting === i.docId ? null : i.docId); setWhy(''); }} testId="ing-reject-open">Reject</Button>
                  <Button kind="quiet" small onClick={() => run({ t: 'approve', docId: i.docId, name: 'Automation', as: 'ai' })} testId="ing-auto">Let an automation approve it</Button></span>}
                {rejecting === i.docId && <span className="kn-cand__why"><Field label="Why it is rejected">{(id) => <input id={id} value={why} maxLength={200} onChange={(e) => setWhy(e.target.value)} data-testid="ing-why" />}</Field><Button kind="danger" small onClick={() => { if (run({ t: 'reject', docId: i.docId, name, why })) setRejecting(null); }} testId="ing-do-reject">Reject it</Button></span>}
              </li>); })}</ul>
            <p><Button kind="primary" onClick={() => run({ t: 'surface' }, 'surface')} testId="ing-do-surface">Next: See where it surfaces</Button></p>
          </div>}

          {step === 'surface' && <div data-testid="ing-surface" data-surfaced={approved.length}>{head('surface')}
            <p>An approved document is {tenantName(HOME_TENANT)}’s own knowledge (zone 3). It is offered in the Knowledge Ledger, in Search Party and in Ask Empathia, to the readers its source lists and to nobody else, and it is cited wherever it is used.</p>
            {stale?.stale && <div data-testid="ing-stale"><Notice tone="warn">The source was last read {plural(stale.days, 'day')} ago, more than {STALE_AFTER_DAYS}. What is shown may be out of date until the next sync.</Notice></div>}
            {approved.length ? <ul className="kn-rows" data-testid="ing-surfaced">{approved.filter((o) => admin || mayRead(o, reader).ok).map((o) => <li key={o.id} data-id={o.id}>{mayRead(o, reader).ok ? <a href={hrefOfObject(o.id)}><b>{o.title}</b></a> : <b>{nameOf(o.sources[0]?.system || 'A document')}</b>}<span className="ui-meta">Readers, from the source: {o.acl.groups.map(groupWords).join('; ')}</span></li>)}</ul> : <p className="ui-muted">Nothing is approved, so nothing surfaces.</p>}
            <p className="hr-links">{opens('#/knowledge') && <a href="#/knowledge?zone=3" data-testid="ing-to-ledger">See them in the Knowledge Ledger</a>}{opens('#/search') && <a href="#/search?q=board%20day" data-testid="ing-to-search">Find “board day” in Search Party</a>}{opens('#/ask') && <a href="#/ask?q=What%20is%20the%20board%20day%20check%3F" data-testid="ing-to-ask">Ask Empathia about the board day check</a>}</p>
          </div>}

          <div className="hr-nav">{STEPS.indexOf(step) > 0 && <Button kind="quiet" onClick={() => go(STEPS[STEPS.indexOf(step) - 1]!)} testId="ing-back">Back</Button>}{s.done.includes(step) && step !== 'surface' && step !== 'approve' && !['import', 'validate', 'index'].includes(step) && <Button onClick={() => go(nextOf(step))} testId="ing-forward">Next: {STEP_WORD[nextOf(step)][0]}</Button>}</div>
        </div>

        <aside className="kn-side" aria-labelledby="ing-lib-h">
          <h2 className="build__h" id="ing-lib-h">The simulated library</h2>
          <p className="ui-meta">{s.source.site} / {s.source.library}. {admin ? 'What the source holds now, who it lets read each document, and what the index made of it: names and access lists, as its administrator sees them.' : 'The documents the source lets you read, and what the index made of them.'}</p>
          <ul className="kn-lib" data-testid="ing-library" data-docs={docs.filter((d) => admin || listed(d.groups)).length}>{docs.filter((d) => admin || listed(d.groups)).map((d) => { const scoped = inScope(d.path, ix.scope); const [word, tone] = statusOf(ix.items[d.id], scoped, ix.stage !== 'NONE'); return (
            <li key={d.id} data-doc={d.id} data-path={d.path} data-version={d.version} data-groups={d.groups.join(' ')}><b>{nameOf(d.path)}</b><span className="ui-meta">{folderOf(d.path)} · v{d.version} · {d.modified}</span><span className="ui-meta">Readers: {d.groups.join(', ') || 'none listed'}</span><Tag tone={tone}>{word}</Tag></li>); })}</ul>
        </aside>
      </div>

      {indexed && <section className="kn-keep" aria-labelledby="ing-keep-h" data-testid="ing-keep">
        <h2 className="build__h" id="ing-keep-h">Keep it in step</h2>
        <p className="ui-muted">Change something at the simulated source, then sync. The index asks only for what changed since its last read, and follows it: a deleted document leaves with everything derived from it, and a reader removed at the source loses the document on the next sync.</p>
        {stale && <p className="ui-meta" data-testid="ing-last">Last read {stale.days === 0 ? 'today' : `${plural(stale.days, 'day')} ago`}.</p>}
        {admin ? <>
          <div className="kn-keep__grid">
            <label>Document at the source<select value={pick} onChange={(e) => { setPick(e.target.value); setGroup(''); }} data-testid="ing-pick"><option value="">Choose a document</option>{docs.filter((d) => inScope(d.path, ix.scope)).map((d) => <option key={d.id} value={d.id}>{d.path}</option>)}</select></label>
            <label>Group to remove from its readers<select value={group} disabled={!picked} onChange={(e) => setGroup(e.target.value)} data-testid="ing-group"><option value="">Choose a group</option>{(picked?.groups || []).map((g) => <option key={g} value={g}>{g}</option>)}</select></label>
          </div>
          <div className="kn-keep__a" role="group" aria-label="Changes at the simulated source">
            <Button disabled={!picked} onClick={() => picked && run({ t: 'source', op: { op: 'rename', id: picked.id, path: `${picked.path.replace(/\/[^/]*$/, '')}/Renamed ${nameOf(picked.path).replace(/^Renamed /, '')}` } })} testId="ing-src-rename">Rename it</Button>
            <Button disabled={!picked} onClick={() => picked && run({ t: 'source', op: { op: 'update', id: picked.id, text: `${picked.text}\nRevision note: edited at the source, revision ${picked.version + 1}` } })} testId="ing-src-update">Edit it</Button>
            <Button disabled={!picked} onClick={() => { if (picked && run({ t: 'source', op: { op: 'delete', id: picked.id } })) setPick(''); }} testId="ing-src-delete">Delete it</Button>
            <Button disabled={!picked || !group} onClick={() => { if (picked && group && run({ t: 'source', op: { op: 'revoke', id: picked.id, group } })) setGroup(''); }} testId="ing-src-revoke">Remove that group</Button>
            <Button onClick={() => run({ t: 'source', op: { op: 'add', doc: { id: `D-9${String(s.source.seq).padStart(2, '0')}`, path: `/Runbooks/Huddle room reset ${s.source.seq}.md`, groups: ['grp-service-desk'], text: 'Huddle room reset\nReset time: 5 minutes\nUse the touch panel’s own restart; do not unplug anything.' } } })} testId="ing-src-add">Add a document</Button>
            <Button onClick={() => run({ t: 'source', op: { op: 'throttle', times: 2 } })} testId="ing-src-throttle">Make it say “slow down” twice</Button>
            <Button onClick={() => run({ t: 'source', op: { op: 'throttle', times: MAX_ATTEMPTS + 1 } })} testId="ing-src-throttle-hard">Make it say “slow down” {MAX_ATTEMPTS + 1} times</Button>
          </div>
          <p><Button kind="primary" onClick={() => run({ t: 'sync' })} testId="ing-sync">Sync now</Button></p>
          {s.reports[0] && <Report r={s.reports[0]} />}
          <div className="kn-keep__end">
            {sure ? <><span>Remove the whole index and everything derived from it?</span> <Button kind="danger" onClick={() => { if (run({ t: 'disconnect' }, 'connect')) setSure(false); }} testId="ing-disconnect-yes">Yes, disconnect and remove</Button> <Button kind="quiet" onClick={() => setSure(false)}>Keep it</Button></> : <Button kind="danger" onClick={() => setSure(true)} testId="ing-disconnect">Disconnect the source</Button>}
            <Button kind="quiet" onClick={() => { if (run({ t: 'reset' }, 'connect')) { setPick(''); setFolders(foldersOf(stored.ingest.source).filter((f) => f !== '/People')); } }} testId="ing-reset">Put the demonstration back as it began</Button>
          </div></> : adminOnly}
      </section>}
    </section>
  );
}
