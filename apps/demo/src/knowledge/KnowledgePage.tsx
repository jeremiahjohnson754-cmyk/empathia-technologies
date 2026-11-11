/**
 * #/knowledge and #/knowledge/<id> — the Technical Knowledge Ledger (founder's directive of 11 Nov 2026, §07). Search and browse what
 * is known by domain, kind, audience and trust zone; open an object for its body, its worked examples, its sources and citation, its
 * state and freshness, what else answers the same question (strongest source first, the weaker ones shown and never hidden), and
 * where it is used. Reviewers decide on candidates; the customer's administrator consents to sharing and a reviewer releases it.
 *
 * Everything on the page is computed from `viewFor(all, reader)`: what this reader may read, and nothing else (ledger.ts). The
 * "read as" switch is a demonstration control on this page only: it shows that a reader of the second customer receives none of the
 * first customer's private knowledge. Decisions are made in one's own customer only.
 * Imported text is rendered as text. Nothing here builds markup from a string.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Button, Notice, Tag, Field, Segmented, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import type { ContentType, TrustZone } from './contract.js';
import { ASOF, ZONES, AUTHORITIES, viewFor, readerFor, cite, isFact, freshness, anonymise, hrefOfObject, sharedIdOf, standingLabel, STATE_WORD, FRESH_WORD, STANDING_WORD, TYPE_WORD, type Filters, type View } from './ledger.js';
import { loadState, allObjects, act, type LedgerAction, type Stored } from './store.js';
import { staleness } from './ingest.js';
import { HOME_TENANT, OTHER_TENANT, TENANTS, tenantName, type LedgerObject } from './types.js';

const NAME_KEY = 'empathia.demo.knowledge.reviewer';
const RIGHTS_WORD: Record<string, string> = { 'empathia-original': 'Written by Empathia', 'founder-owned': 'Owned by the founder', 'licensed-reproduction': 'Reproduced under licence', 'metadata-only': 'Title and number only: the text is not held here', 'tenant-owned': 'Owned by the customer', 'tenant-shared-with-consent': 'Shared by a customer, with consent', unknown: 'Rights not known' };
const toneOf = (o: LedgerObject): 'ok' | 'warn' | 'muted' | 'info' => (o.zone === 5 ? 'warn' : isFact(o) ? 'ok' : o.state === 'SUPERSEDED' || o.state === 'ARCHIVED' ? 'muted' : 'info');
const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const remembered = () => { try { return sessionStorage.getItem(NAME_KEY) || ''; } catch { return ''; } };

interface Acts { run: (a: LedgerAction) => boolean; said: string; refused: string[] | null; at: string | null; name: string; setName: (s: string) => void }
function Feedback({ acts, here }: { acts: Acts; here: string }) {
  const ref = useRef<HTMLDivElement>(null); const mine = acts.at === here && (!!acts.said || !!acts.refused);
  useEffect(() => { if (mine) ref.current?.focus(); }, [mine, acts.said, acts.refused]);
  if (!mine) return null;
  return <div ref={ref} tabIndex={-1} className="kn-feedback" data-testid={acts.refused ? 'kn-refused' : 'kn-said'}>{acts.refused ? <Notice tone="bad"><b>Refused.</b> {acts.refused.join(' ')}</Notice> : <Notice tone="ok">{acts.said}.</Notice>}</div>;
}
const NameField = ({ acts }: { acts: Acts }) => (
  <Field label="Your name, as the reviewer" hint="Recorded with the decision. A decision with no named person is refused.">{(id, by) => <input id={id} aria-describedby={by} value={acts.name} maxLength={80} autoComplete="off" onChange={(e) => acts.setName(e.target.value)} data-testid="kn-name" />}</Field>);

function Worked({ o }: { o: LedgerObject }) {
  if (!o.worked?.length) return null;
  return (<section className="kn-sec" aria-labelledby="kn-worked-h"><h2 id="kn-worked-h">Worked {o.worked.length === 1 ? 'example' : 'examples'}</h2>
    {o.worked.map((w, i) => (<div key={i} className="kn-worked" data-testid="kn-worked" data-calc={w.calc} data-result={w.result}>
      <h3>{w.label}</h3><p className="kn-formula"><code>{w.formula}</code></p>
      <dl className="kn-inputs">{Object.entries(w.inputs).map(([k, v]) => <div key={k}><dt><code>{k}</code> = {v}</dt><dd>{w.about[k]}</dd></div>)}</dl>
      <p className="kn-result"><b>{w.result.toFixed(w.dp)} {w.unit}</b> <Tag tone="info">MODELED</Tag> <span className="ui-meta">Computed from the inputs above. It is arithmetic, not a measurement of any room.</span></p>
    </div>))}
  </section>);
}

/** Sharing a customer's own object: the administrator's consent, then a reviewer's release of the anonymised copy. */
function Share({ o, stored, view, can, acts }: { o: LedgerObject; stored: Stored; view: View; can: PageProps['can']; acts: Acts }) {
  const consent = stored.decisions.consents[o.id]; const released = stored.decisions.released[o.id]; const copy = view.get(sharedIdOf(o.id));
  const mayConsent = can('knowledge.consent'); const mayRelease = can('knowledge.release'); const anon = useMemo(() => anonymise(o), [o]);
  const [by, setBy] = useState(''); const [statement, setStatement] = useState('');
  if (o.zone !== 3 || o.tenant !== HOME_TENANT || o.state !== 'APPROVED' || (!mayConsent && !mayRelease)) return null;
  return (<section className="kn-sec kn-share" aria-labelledby="kn-share-h" data-testid="kn-share" data-consent={consent ? 'yes' : 'no'} data-released={released ? 'yes' : 'no'}>
    <h2 id="kn-share-h">Share this with consent</h2>
    <p className="ui-muted">This object is private to {tenantName(o.tenant)}. A copy can be released for everyone only with {tenantName(o.tenant)}’s recorded consent, anonymised, and reviewed by a person. The original stays private.</p>
    <Feedback acts={acts} here="share" />
    {!consent && mayConsent && <>
      <div className="kn-preview" data-testid="kn-anon"><h3>The copy that would be shared</h3><p><b>{anon.object.title}</b></p>{(anon.object.body || []).map((p, i) => <p key={i}>{p}</p>)}{(anon.object.steps || []).length > 0 && <ol>{anon.object.steps!.map((s, i) => <li key={i}>{s}</li>)}</ol>}
        <p className="ui-meta" data-testid="kn-anon-statement">{anon.statement}</p></div>
      <Field label="Consent given by" hint="The person who speaks for the customer about its data.">{(id, d) => <input id={id} aria-describedby={d} value={by} maxLength={80} autoComplete="off" onChange={(e) => setBy(e.target.value)} data-testid="kn-consent-by" />}</Field>
      <Field label="What the consent covers, and what must stay out" hint="For example: the lesson may be shared; no room, person, date or job number.">{(id, d) => <textarea id={id} aria-describedby={d} rows={2} maxLength={300} value={statement} onChange={(e) => setStatement(e.target.value)} data-testid="kn-consent-statement" />}</Field>
      <p><Button kind="primary" onClick={() => acts.run({ t: 'consent', id: o.id, by, statement })} testId="kn-consent">Record the customer’s consent</Button></p>
    </>}
    {!consent && !mayConsent && <p data-testid="kn-share-wait">The customer’s administrator has not given consent. Nothing is shared without it.</p>}
    {consent && <p data-testid="kn-consent-record"><b>Consent recorded</b> by {consent.by} on {consent.on}: {consent.statement}</p>}
    {consent && !released && mayRelease && <><NameField acts={acts} /><p><Button kind="primary" onClick={() => acts.run({ t: 'release', id: o.id, name: acts.name })} testId="kn-release">Release the anonymised copy</Button></p></>}
    {consent && !released && !mayRelease && <p data-testid="kn-share-wait">Waiting for a reviewer to release it. It is not shared yet.</p>}
    {released && <p data-testid="kn-released">Released by {released.by} on {released.on}. {copy ? <a href={hrefOfObject(copy.id)}>Open the shared copy</a> : 'The shared copy is not among what you can read.'}</p>}
    {consent && mayConsent && <p><Button kind="quiet" onClick={() => acts.run({ t: 'withdraw', id: o.id })} testId="kn-withdraw">Withdraw the consent</Button></p>}
  </section>);
}

function ObjectView({ o, view, stored, opens, can, acts, back, home, role }: { o: LedgerObject; view: View; stored: Stored; opens: (h: string) => boolean; can: PageProps['can']; acts: Acts; back: string; home: boolean; role: PageProps['role'] }) {
  const fresh = freshness(o, ASOF); const citation = cite(o, ASOF); const same = view.sameQuestion(o); const related = view.related(o); const usedIn = view.usedIn(o); const newer = view.supersededBy(o); const older = o.supersedes ? view.get(o.supersedes) : null;
  const [copied, setCopied] = useState(''); const imported = o.id.startsWith('src.'); const stale = imported ? staleness(stored.ingest.index, new Date().toISOString()) : null;
  const copy = async () => { try { await navigator.clipboard.writeText(citation); setCopied('Citation copied.'); } catch { setCopied('Select the citation and copy it.'); } };
  const as = home ? '' : '?as=other';
  return (
    <article className="kn kn-object" data-native="" data-testid="kn-page" data-view="object" data-tenant={view.reader.tenant}>
      <PageHero compact eyebrow={<a href={back} data-testid="kn-back">Knowledge Ledger</a>} icon="book" product="search-party" title={o.title}
        lede={o.objectives[0]} meta={[<Tag key="z" tone={o.zone === 5 ? 'warn' : 'muted'}>Zone {o.zone} · {ZONES[o.zone].name}</Tag>, <Tag key="s" tone={toneOf(o)}>{standingLabel(o)}</Tag>, <span key="t">{TYPE_WORD[o.contentType] || o.contentType} · {o.domain}</span>, <Tag key="y" tone="warn">Synthetic data</Tag>]} />
      <div className="kn-object__cols" data-testid="kn-object" data-id={o.id} data-zone={o.zone} data-state={o.state} data-fact={isFact(o) ? 'yes' : 'no'} data-fresh={fresh}>
        <div className="kn-main">
          {o.zone === 5 && <Notice tone="warn"><b>A candidate, not knowledge.</b> It is {o.sources[0]?.derivation === 'INFERRED' ? 'a generated suggestion' : 'an observation'} that no reviewer has approved. It is shown to reviewers of {tenantName(o.tenant)} only, and never as fact.</Notice>}
          {o.zone !== 5 && !isFact(o) && <Notice tone="info"><b>{STATE_WORD[o.state]}: not approved.</b> {o.zone <= 2 ? 'Written by Empathia for this demonstration. Every worked example is recomputed by a test; no engineer has signed it yet, so it is shown with that state and not as fact.' : o.state === 'SUPERSEDED' ? 'Kept so that the history can be read. It is not current.' : 'Shown with its state, not as fact.'}</Notice>}
          {(o.zone === 3 || o.zone === 5) && <p className="ui-meta" data-testid="kn-private">Private to {tenantName(o.tenant)}{o.acl.roles.length || o.acl.groups.length ? ', and within it to the readers its source lists' : ''}. No other customer’s reader receives it, in any form.</p>}
          {stale?.stale && <Notice tone="warn">The source of this document was last read {plural(stale.days, 'day')} ago. It may have changed since.</Notice>}
          {o.zone === 1 && <section className="kn-sec"><h2>What it is used for here</h2><p>{o.applies}</p><p className="ui-muted">The text of this standard is not held here: only its title and number. Its figures, tables and clauses are read in the standard itself, from its publisher.</p></section>}
          {(o.body || []).length > 0 && <section className="kn-sec kn-body" data-testid="kn-body">{o.body!.map((p, i) => <p key={i}>{p}</p>)}</section>}
          {(o.steps || []).length > 0 && <section className="kn-sec" aria-labelledby="kn-steps-h"><h2 id="kn-steps-h">Steps</h2><ol className="kn-steps" data-testid="kn-steps">{o.steps!.map((s, i) => <li key={i}>{s}</li>)}</ol></section>}
          {(o.tree || []).length > 0 && <section className="kn-sec" aria-labelledby="kn-tree-h"><h2 id="kn-tree-h">Work down the questions</h2><ol className="kn-tree" data-testid="kn-tree">{o.tree!.map((n, i) => <li key={i}><p className="kn-tree__q">{n.ask}</p><dl><div><dt>Yes</dt><dd>{n.yes}</dd></div><div><dt>No</dt><dd>{n.no}</dd></div></dl></li>)}</ol></section>}
          <Worked o={o} />
          {(o.safety || []).length > 0 && <section className="kn-sec" aria-labelledby="kn-safe-h"><h2 id="kn-safe-h">Staying safe</h2><ul>{o.safety!.map((s) => <li key={s}>{s}</li>)}</ul></section>}
          {o.verification && <section className="kn-sec" aria-labelledby="kn-ver-h"><h2 id="kn-ver-h">How you know it was done right</h2><p>{o.verification}</p></section>}
          {o.consent && <section className="kn-sec" data-testid="kn-consent-shown"><h2>Shared with consent</h2><p>Consent given by {o.consent.by} on {o.consent.on}.</p><p><b>What was anonymised:</b> {o.consent.anonymised}</p></section>}
          {home && <Share o={o} stored={stored} view={view} can={can} acts={acts} />}
        </div>
        <aside className="kn-side" aria-label="Sources and connections">
          <section className="kn-sec" aria-labelledby="kn-src-h"><h2 id="kn-src-h">Where it comes from</h2>
            <ul className="kn-sources" data-testid="kn-sources">{o.sources.map((s, i) => <li key={i}><b>{s.title}{s.version ? `, ${s.version}` : ''}</b><span>{AUTHORITIES[s.authority]} (level {s.authority} of 10)</span><span>{RIGHTS_WORD[s.rights]}</span>{s.derivation && <span>How it was obtained: {s.derivation}{typeof s.confidence === 'number' ? ` · confidence ${Math.round(s.confidence * 100)}%` : ''}</span>}</li>)}</ul>
            <p className="kn-cite"><span className="ui-meta">Cite it as</span> <span data-testid="kn-cite">{citation}</span></p>
            <p><Button small onClick={() => { void copy(); }} testId="kn-copy">Copy the citation</Button> <span className="ui-meta" role="status" aria-live="polite">{copied}</span></p>
            <dl className="kn-facts"><div><dt>State</dt><dd>{STATE_WORD[o.state]}</dd></div><div><dt>Reviewed</dt><dd>{o.reviewer ? `${o.reviewer}, ${o.reviewedOn}` : 'Not yet reviewed by a person'}</dd></div><div><dt>Freshness</dt><dd data-testid="kn-fresh">{FRESH_WORD[fresh]}{o.reviewBy ? ` (next review by ${o.reviewBy})` : ''}</dd></div><div><dt>Written for</dt><dd>{o.audience} · {o.difficulty}</dd></div></dl>
          </section>
          {(older || newer) && <section className="kn-sec" data-testid="kn-versions"><h2>Versions</h2>{older && <p>Supersedes <a href={`${hrefOfObject(older.id)}${as}`}>{older.title}</a>.</p>}{newer && <p>Superseded by <a href={`${hrefOfObject(newer.id)}${as}`}>{newer.title}</a>.</p>}</section>}
          {same.length > 1 && <section className="kn-sec" aria-labelledby="kn-same-h" data-testid="kn-same" data-count={same.length}><h2 id="kn-same-h">The same question, every source you can read</h2><p className="ui-meta">{o.topic} The strongest source is first. Weaker and superseded ones are shown, not hidden.</p>
            <ol className="kn-same">{same.map(({ object: x, standing }) => <li key={x.id} data-id={x.id} data-standing={standing} aria-current={x.id === o.id ? 'true' : undefined}><span className="kn-same__s">{STANDING_WORD[standing]}</span>{x.id === o.id ? <b>{x.title}</b> : <a href={`${hrefOfObject(x.id)}${as}`}>{x.title}</a>}<span className="ui-meta">{AUTHORITIES[x.sources[0]?.authority || 10]}</span></li>)}</ol></section>}
          {related.length > 0 && <section className="kn-sec" aria-labelledby="kn-rel-h" data-testid="kn-related"><h2 id="kn-rel-h">About</h2><ul className="kn-links">{related.map((r) => <li key={r.id} data-kind={r.kind}><span className="kn-kind">{{ room: 'Room', issue: 'Job', device: 'Equipment', symptom: 'Symptom', object: 'Knowledge', standard: 'Standard' }[r.kind]}</span>{r.kind === 'object' || r.kind === 'standard' ? <a href={`${r.href}${as}`}>{r.label}</a> : opens(r.href) ? <a href={r.href}>{r.label}</a> : <span>{r.label}</span>}</li>)}</ul></section>}
          {usedIn.length > 0 && <section className="kn-sec" aria-labelledby="kn-used-h" data-testid="kn-usedin"><h2 id="kn-used-h">Used in</h2><ul className="kn-links">{usedIn.map((x) => <li key={x.id}><span className="kn-kind">{TYPE_WORD[x.contentType] || 'Knowledge'}</span><a href={`${hrefOfObject(x.id)}${as}`}>{x.title}</a></li>)}</ul></section>}
          {o.zone === 5 && home && can('knowledge.review') && <p><a className="ui-btn" href={imported ? '#/knowledge/sources?step=approve' : '#/knowledge?zone=5'} data-testid="kn-to-queue">{imported ? 'Imported documents are reviewed on the document sources page' : 'Decide on it in the review queue'}</a></p>}
          <p className="ui-meta">You are the {ROLES[role].label}, reading as {view.reader.tenant === 'guest' ? 'a guest' : tenantName(view.reader.tenant)}.</p>
        </aside>
      </div>
    </article>
  );
}

function Queue({ view, stored, acts }: { view: View; stored: Stored; acts: Acts }) {
  const [rejecting, setRejecting] = useState<string | null>(null); const [why, setWhy] = useState('');
  const waiting = Object.keys(stored.decisions.consents).filter((id) => !stored.decisions.released[id]).map((id) => view.get(id)).filter((x): x is LedgerObject => !!x);
  if (!view.queue.length && !waiting.length) return <section className="kn-queue" data-testid="kn-queue" data-count="0" aria-labelledby="kn-queue-h"><h2 id="kn-queue-h">Candidates awaiting review</h2><Feedback acts={acts} here="queue" /><p className="ui-muted">Nothing is waiting for a decision.</p></section>;
  return (
    <section className="kn-queue" data-testid="kn-queue" data-count={view.queue.length} aria-labelledby="kn-queue-h">
      <h2 id="kn-queue-h">Candidates awaiting review</h2>
      <p className="ui-muted">Observations and generated suggestions of {tenantName(view.reader.tenant)}. None is knowledge until a named reviewer approves it. A model or an automation can propose; it can never approve.</p>
      <Feedback acts={acts} here="queue" />
      <NameField acts={acts} />
      <ul className="kn-cands">{view.queue.map((o) => { const s = o.sources[0]; const imported = o.id.startsWith('src.'); return (
        <li key={o.id} data-id={o.id} data-testid="kn-cand">
          <h3><a href={hrefOfObject(o.id)}>{o.title}</a></h3>
          <p className="kn-cand__meta"><Tag tone="warn">Candidate — not fact</Tag> <span>{s?.title}</span>{s?.derivation && <span>{s.derivation}{typeof s.confidence === 'number' ? ` · confidence ${Math.round(s.confidence * 100)}%` : ''}</span>}</p>
          <p>{(o.body || [])[0]}</p>
          {imported ? <p><a href="#/knowledge/sources?step=approve">Review it on the document sources page, against the version that was read</a></p> : <div className="kn-cand__a">
            <Button kind="primary" onClick={() => acts.run({ t: 'review', id: o.id, decision: 'approve', name: acts.name })} testId="kn-approve">Approve as {tenantName(o.tenant)}’s knowledge</Button>
            <Button onClick={() => { setRejecting(rejecting === o.id ? null : o.id); setWhy(''); }} testId="kn-reject-open">Reject</Button>
            <Button kind="quiet" onClick={() => acts.run({ t: 'review', id: o.id, decision: 'approve', name: 'Automation', as: 'ai' })} testId="kn-auto">Let an automation approve it</Button>
          </div>}
          {rejecting === o.id && <div className="kn-cand__why"><Field label="Why it is rejected" hint="Kept with the decision.">{(id, d) => <input id={id} aria-describedby={d} value={why} maxLength={200} onChange={(e) => setWhy(e.target.value)} data-testid="kn-why" />}</Field><Button kind="danger" onClick={() => { if (acts.run({ t: 'review', id: o.id, decision: 'reject', name: acts.name, why })) setRejecting(null); }} testId="kn-reject">Reject it</Button></div>}
        </li>); })}</ul>
      {waiting.length > 0 && <div data-testid="kn-waiting"><h3>Consent given, waiting for a reviewer to release</h3><ul className="kn-links">{waiting.map((o) => <li key={o.id}><a href={hrefOfObject(o.id)}>{o.title}</a></li>)}</ul></div>}
    </section>
  );
}

export default function KnowledgePage({ role, params, query, can, sees }: PageProps) {
  const { w, apply } = useWorkspace(); const [stored, setStored] = useState<Stored>(() => loadState());
  const other = query.get('as') === 'other' && role !== 'visitor'; const tenant = other ? OTHER_TENANT : HOME_TENANT; const home = !other;
  const reader = useMemo(() => readerFor(role, tenant), [role, tenant]); const all = useMemo(() => allObjects(stored, w), [stored, w]); const view = useMemo(() => viewFor(all, reader), [all, reader]);
  const [q, setQ] = useState(query.get('q') || ''); const [domain, setDomain] = useState(query.get('domain') || ''); const [type, setType] = useState(query.get('type') || ''); const [aud, setAud] = useState(query.get('aud') || ''); const [zone, setZone] = useState(Number(query.get('zone')) || 0);
  const [said, setSaid] = useState(''); const [refused, setRefused] = useState<string[] | null>(null); const [at, setAt] = useState<string | null>(null); const [name, setNameRaw] = useState(remembered);
  const id = params['id'] || ''; const o = id ? view.get(id) : null;
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  const setName = (s: string) => { setNameRaw(s); try { sessionStorage.setItem(NAME_KEY, s); } catch { /* the name lasts the page */ } };
  const run = (a: LedgerAction): boolean => {
    const out = apply((next) => act(next, role, a)); setAt(a.t === 'review' ? 'queue' : 'share');
    if ('why' in out) { setRefused(out.why); setSaid(''); return false; }
    setRefused(null); setSaid(out.said); setStored(out.state); return true;
  };
  const acts: Acts = { run, said, refused, at, name, setName };
  // the filters live in the address, so a link reopens the same list and Back from an object returns to it
  const qs = useMemo(() => { const p = new URLSearchParams(); if (other) p.set('as', 'other'); if (q.trim()) p.set('q', q.trim().slice(0, 80)); if (domain) p.set('domain', domain); if (type) p.set('type', type); if (aud) p.set('aud', aud); if (zone) p.set('zone', String(zone)); const s = p.toString(); return s ? `?${s}` : ''; }, [other, q, domain, type, aud, zone]);
  useEffect(() => { if (id) return; try { history.replaceState(null, '', `#/knowledge${qs}`); } catch { /* the address stays */ } }, [id, qs]);
  useEffect(() => { if (!id) setZone(Number(query.get('zone')) || 0); }, [id, query.get('zone')]);   // eslint-disable-line react-hooks/exhaustive-deps
  const filters: Filters = { domain, type: type as ContentType | '', audience: aud, zone: zone as TrustZone | 0 };
  const found = useMemo(() => view.search(q, filters), [view, q, domain, type, aud, zone]);   // eslint-disable-line react-hooks/exhaustive-deps
  const back = `#/knowledge${other ? '?as=other' : ''}`;

  if (id && !o) return (
    <section className="kn" data-native="" data-testid="kn-page" data-view="none" data-tenant={reader.tenant}>
      <PageHero eyebrow="Knowledge Ledger" icon="book" product="search-party" title="No knowledge object has this address" lede="Either nothing is kept under it, or it is not yours to read. The ledger does not say which." actions={<a className="ui-btn ui-btn--primary" href={back}>Search the ledger</a>} />
    </section>);
  if (o) return <ObjectView key={o.id} o={o} view={view} stored={stored} opens={opens} can={can} acts={acts} back={back} home={home} role={role} />;

  const zoneCount = (z: TrustZone) => view.facets.zones.find(([k]) => k === z)?.[1] || 0; const who = reader.tenant === 'guest' ? 'a guest' : tenantName(tenant);
  return (
    <section className="kn" data-native="" data-testid="kn-page" data-view="list" data-tenant={reader.tenant} data-count={view.list.length}>
      <PageHero eyebrow="Technical Knowledge Ledger" icon="book" product="search-party" title="What is known, and who may read it"
        lede="Concepts, worked calculations, procedures, decision trees and failure patterns, with a customer’s own standards and incident reviews beside them. Each object says where it came from and how far it can be trusted, and one customer’s private knowledge never reaches another customer’s reader."
        meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">You are the {ROLES[role].label}</span>, <span key="t" data-testid="kn-reading-as">Reading as {who}</span>]}
        actions={opens('#/knowledge/sources') ? <a className="ui-btn" href="#/knowledge/sources" data-testid="kn-to-sources">Document sources</a> : undefined} />

      {role !== 'visitor' ? <div className="kn-as" data-testid="kn-as">
        <p className="kn-as__h"><Tag tone="info">Demonstration control</Tag> Read this page as a {ROLES[role].label} of</p>
        <Segmented label="Customer to read as" value={other ? 'other' : 'home'} onChange={(v) => { location.hash = `#/knowledge${v === 'other' ? '?as=other' : ''}`; }} options={TENANTS.map((t) => ({ value: t.id === HOME_TENANT ? 'home' as const : 'other' as const, label: t.name }))} />
        <p className="ui-meta">A real reader belongs to one customer and cannot switch. The switch is here so you can see that a reader of {TENANTS[1]!.name}, {TENANTS[1]!.note}, receives none of {TENANTS[0]!.name}’s private knowledge.</p>
      </div> : <p className="ui-muted" data-testid="kn-guest">You are a guest, not a member of a customer: you read what everyone may read.</p>}
      {other && <div data-testid="kn-other-note"><Notice tone="info">You are reading as a {ROLES[role].label} of {tenantName(OTHER_TENANT)}. Nothing private to {tenantName(HOME_TENANT)} is on this page: not a title, a count, a snippet or a link. Reviewing and sharing are done in one’s own customer, so they are not offered here.</Notice></div>}

      <details className="kn-legend" open data-testid="kn-legend"><summary>The five trust zones, and what you can read in each</summary>
        <ol className="kn-zones">{([1, 2, 3, 4, 5] as TrustZone[]).map((z) => <li key={z} data-zone={z} data-count={zoneCount(z)}>
          <span className="kn-zone__n" aria-hidden="true">{z}</span>
          <div><b>{ZONES[z].name}</b><span>{ZONES[z].holds}.</span><span className="ui-meta">Who reads it: {ZONES[z].readers.toLowerCase()}.</span></div>
          <button type="button" className="kn-zone__c" aria-pressed={zone === z} disabled={!zoneCount(z)} onClick={() => setZone(zone === z ? 0 : z)}>{zoneCount(z) ? `${zoneCount(z)} you can read` : 'None for you'}</button>
        </li>)}</ol>
        <p className="ui-meta">Empathia’s own notes (zone 2) and the standards references (zone 1) were written for this demonstration and are in review: every worked example is recomputed by a test, and no engineer has signed them yet. They are shown with that state, never as fact.</p>
      </details>

      <div className="kn-find" role="search" aria-label="Search the Knowledge Ledger">
        <Field label="Search what you can read" hint="For example “echo”, “reverberation”, “PoE”, “display size”.">{(fid, by) => <input id={fid} aria-describedby={by} type="search" autoComplete="off" maxLength={80} value={q} onChange={(e) => setQ(e.target.value)} data-testid="kn-q" />}</Field>
        <div className="kn-filters">
          <label>Domain<select value={domain} onChange={(e) => setDomain(e.target.value)} data-testid="kn-domain"><option value="">Every domain</option>{view.facets.domains.map(([d, n]) => <option key={d} value={d}>{d} ({n})</option>)}</select></label>
          <label>Kind<select value={type} onChange={(e) => setType(e.target.value)} data-testid="kn-type"><option value="">Every kind</option>{view.facets.types.map(([t, n]) => <option key={t} value={t}>{TYPE_WORD[t as ContentType] || t} ({n})</option>)}</select></label>
          <label>Written for<select value={aud} onChange={(e) => setAud(e.target.value)} data-testid="kn-aud"><option value="">Everyone’s</option>{view.facets.audiences.map(([a, n]) => <option key={a} value={a}>{a} ({n})</option>)}</select></label>
          <label>Zone<select value={zone} onChange={(e) => setZone(Number(e.target.value))} data-testid="kn-zone"><option value={0}>Every zone</option>{view.facets.zones.map(([z, n]) => <option key={z} value={z}>{z} · {ZONES[z].name} ({n})</option>)}</select></label>
        </div>
      </div>
      <p className="ui-muted" role="status" aria-live="polite" data-testid="kn-count" data-found={found.length}>{plural(found.length, 'object')} of the {view.list.length} you can read{q.trim() ? ` match “${q.trim()}”` : ''}.</p>
      {found.length ? <ul className="kn-list" data-testid="kn-results">{found.slice(0, 80).map(({ object: x, snippet }) => (
        <li key={x.id} data-id={x.id} data-zone={x.zone} data-state={x.state}><a className="kn-card" href={`${hrefOfObject(x.id)}${other ? '?as=other' : ''}`}>
          <span className="kn-card__top"><span className="kn-zonechip" data-zone={x.zone}>Zone {x.zone}</span><span>{TYPE_WORD[x.contentType] || x.contentType}</span><span>{x.domain}</span></span>
          <b>{x.title}</b><span className="kn-card__snip">{snippet}</span>
          <span className="kn-card__meta"><Tag tone={toneOf(x)}>{standingLabel(x)}</Tag>{(x.zone === 3 || x.zone === 5) && <span>Private to {tenantName(x.tenant)}</span>}{x.zone === 4 && <span>Shared with consent</span>}</span>
        </a></li>))}</ul>
        : <EmptyState title="Nothing you can read matches" icon="search">Try fewer words, or clear a filter. The ledger never says whether something you cannot read exists.</EmptyState>}
      {found.length > 80 && <p className="ui-meta">Showing the first 80. Narrow the search to see the rest.</p>}

      {home && sees('knowledge.queue') && <Queue view={view} stored={stored} acts={acts} />}
    </section>
  );
}
