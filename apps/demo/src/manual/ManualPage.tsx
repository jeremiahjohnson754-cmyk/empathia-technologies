/**
 * #/manual — the AV Engineering Standards & Design Manual (founder, §08 Product C).
 *   #/manual               the contents, a search of the rules, and what the manual connects to
 *   #/manual/ch/<chapter>  a chapter: each rule, why, how it is checked, the catalogue tests that check it, the values it needs
 *   #/manual/build         one room's design requirements and commissioning template (ManualWork.tsx)
 *   #/manual/set/<id>      a saved set and the findings recorded against it
 *   #/manual/exceptions    exceptions asked for, decided and closed
 *   #/manual/edition       the organisation's edition: values with their sources, additions for a building, revisions
 * The manual's text is a draft and says so on every view. It carries no pass marks: a value is the organisation's own or "not set".
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, Notice, Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { C } from '../campus/design.js';
import { BUILDINGS } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { ALL_PRINCIPLES, CHAPTERS, CONTENT_STATUS, NO_NUMBERS, STAGE_LABEL, VALUES, chapterById, searchManual, type Chapter, type Principle } from './content.js';
import { addForSite, adopt, freshnessOf, inForce, isOwner, manualView, neverExcepted, neverWaived, pending, setValue, type ManualState } from './store.js';
import { BuildView, ExceptionsView, SetView } from './ManualWork.js';

export type Act = (fn: (w: Parameters<typeof adopt>[0]) => unknown, ok: string) => boolean;
export const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const testLabel = (id: string) => C.testLabel[id] || C.packTests[id]?.label || id;
const VIEWS = [['', 'Contents'], ['build', 'Requirements for a room'], ['exceptions', 'Exceptions'], ['edition', 'Your edition']] as const;

export default function ManualPage({ role, params, query, can }: PageProps) {
  const { w, apply } = useWorkspace(); const [no, setNo] = useState<string | null>(null); const [said, setSaid] = useState<string | null>(null);
  const s = manualView(w); const now = Date.now(); const fresh = freshnessOf(s, now); const view = params['view'] || ''; const id = params['id'] || '';
  const act: Act = (fn, ok) => { const r = apply(fn) as unknown; const why = r && typeof r === 'object' && 'why' in (r as object) ? (r as { why: string[] }).why : null; setNo(why ? why.join(' ') : null); setSaid(why ? null : ok); return !why; };
  const chapter = view === 'ch' ? chapterById(id) : undefined; const at = view === 'ch' ? '' : view === 'set' ? 'build' : view;
  const known = ['', 'ch', 'build', 'set', 'exceptions', 'edition'].includes(view) && (view !== 'ch' || !!chapter);
  return (
    <div className="pa mn" data-native="" data-testid="manual" data-view={view || 'contents'} data-rev={fresh.rev.rev}>
      <PageHero compact eyebrow="Standards" title={chapter ? chapter.title : 'AV Engineering Standards & Design Manual'} product="learn" icon="book"
        lede={chapter ? chapter.aim : 'The rules a room is designed, built and accepted by; your organisation’s edition of them; and one room’s requirements, exceptions and evidence.'}
        meta={[<Chip key="s" small tone="warn">Synthetic data</Chip>, <span key="d" data-testid="mn-status"><Chip small tone="muted">Draft: not yet reviewed by a practising professional</Chip></span>,
          <span key="f" data-testid="mn-fresh" data-state={fresh.state}><Chip small tone={fresh.state === 'CURRENT' ? 'muted' : fresh.state === 'DUE' ? 'warn' : 'bad'}>Edition revision {fresh.rev.rev}, adopted {day(fresh.rev.at)} · {fresh.state === 'OVERDUE' ? `review overdue by ${plural(-fresh.days, 'day')}` : `review due in ${plural(fresh.days, 'day')}`}</Chip></span>]} />
      <nav className="mn-nav" aria-label="The manual" data-testid="mn-nav">{VIEWS.map(([v, label]) => <a key={v} className="pa-own" href={v ? `#/manual/${v}` : '#/manual'} aria-current={at === v && view !== 'ch' ? 'page' : undefined}>{label}</a>)}</nav>
      {no ? <div role="alert" className="mn-msg mn-msg--no" data-testid="mn-refused"><Icon name="alert" size={18} /><span>{no}</span></div> : null}
      {said && !no ? <p role="status" className="mn-msg mn-msg--ok" data-testid="mn-said"><Icon name="check" size={18} /><span>{said}</span></p> : null}

      {!known ? <Notice tone="warn"><span data-testid="mn-unknown">The manual has no such page. <a href="#/manual">Open the contents.</a></span></Notice>
        : chapter ? <ChapterView c={chapter} s={s} mayAsk={can('manual.exception')} />
          : view === 'build' ? <BuildView role={role} s={s} now={now} act={act} can={can} room={query.get('room')} />
            : view === 'set' ? <SetView role={role} s={s} now={now} act={act} can={can} id={id} />
              : view === 'exceptions' ? <ExceptionsView role={role} s={s} now={now} act={act} can={can} rule={query.get('rule')} room={query.get('room')} />
                : view === 'edition' ? <EditionView role={role} s={s} act={act} />
                  : <Contents s={s} />}

      <Notice tone="info">
        <b>What this manual is.</b> {CONTENT_STATUS} {NO_NUMBERS} It gives no fixing, rigging, mains or work-at-height instruction: those belong to the qualified installer under the site’s rules. Adopting a revision is your organisation’s act and does not review the manual’s text.
      </Notice>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- the contents
function Contents({ s }: { s: ManualState }) {
  const [q, setQ] = useState(''); const hits = useMemo(() => searchManual(q), [q]); const rev = inForce(s); const set = Object.keys(rev.values).length; const never = neverWaived().length;
  return (<>
    <Card title="Find a rule" icon="search" sub={`${ALL_PRINCIPLES.length} rules in ${CHAPTERS.length} chapters. Every word you type must be in the rule, its reason or its chapter.`} testId="mn-search">
      <div className="ui-field mn-q"><label htmlFor="mn-q">Search the manual</label><input id="mn-q" type="text" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} autoComplete="off" data-testid="mn-q" placeholder="echo reference, camera height, exception…" /></div>
      {q.trim().length >= 2 ? (hits.length ? <ul className="mn-hits" data-testid="mn-hits" data-count={hits.length}>{hits.slice(0, 30).map(({ chapter, principle }) => <li key={principle.id}><a href={`#/manual/ch/${chapter.id}`}><b>{principle.id}</b> · {chapter.title}</a><span>{principle.say}</span></li>)}</ul>
        : <p className="mn-note" data-testid="mn-nohits">No rule holds all of those words. The manual does not guess at a near match.</p>) : null}
    </Card>

    <section className="mn-chapters" aria-labelledby="mn-ch-h" data-testid="mn-chapters"><h2 id="mn-ch-h">Chapters</h2>
      <ol>{CHAPTERS.map((c, i) => <li key={c.id}><a className="pa-own" href={`#/manual/ch/${c.id}`} data-chapter={c.id}><span className="mn-num">{i + 1}</span><span className="mn-ct"><b>{c.title}</b><span>{c.aim}</span></span><span className="mn-count">{plural(c.principles.length, 'rule')}</span></a></li>)}</ol>
    </section>

    <Card title="How to read it" icon="info" testId="mn-how">
      <ul className="mn-plain">
        <li><b>A rule has a reason.</b> Each one says what to do, why, and how a reviewer can tell it was done.</li>
        <li><b>A rule names its tests.</b> Where the commissioning catalogue already holds a test that checks a rule, the rule names it. The method, the verifier and the evidence accepted are the catalogue’s.</li>
        <li data-testid="mn-values-line"><b>A number is yours.</b> {VALUES.length} values are for your organisation to settle, each with its source. Your edition in force has set {set} of them. <a href="#/manual/edition">Open your edition.</a></li>
        <li data-testid="mn-never-line"><b>Some rules never bend.</b> {never} of the {ALL_PRINCIPLES.length} rules are never excepted: critical security, mandatory safety, a legal duty, the integrity of evidence, and anything a never-waived test checks.</li>
      </ul>
    </Card>

    <Card title="Where the manual is used" icon="layers" sub="The same rules, met in the products that act on them." testId="mn-connects">
      <ul className="mn-links">
        <li><a href="#/manual/build">Requirements for a room</a><span>A room’s design requirements and commissioning template, from its own record.</span></li>
        <li><a href="#/lite">Empathia Lite</a><span>The room, what stands in it, and its coverage as modelled.</span></li>
        <li><a href="#/drawings">Drawing Intelligence</a><span>A drawing package read against a room type’s standard.</span></li>
        <li><a href="#/commissioning">Commissioning</a><span>The tests these rules name, and the evidence recorded for each.</span></li>
        <li><a href="#/assurance">Assurance</a><span>Rooms that a change has sent back for checking.</span></li>
        <li><a href="#/v25/fi">Field Intelligence</a><span>What the network shows, read-only.</span></li>
        <li><a href="#/pro/eng">Pro: Standards and Engineering</a><span>Room types, templates and conformance across the estate.</span></li>
        <li><a href="#/campus/scouter">Scouter</a><span>The campus as built.</span></li>
        <li><a href="#/knowledge">Knowledge Ledger</a><span>Sources and their standing.</span></li>
        <li><a href="#/story">SIGNAL</a><span>What it looks like when these rules are skipped.</span></li>
      </ul>
      <div className="mn-row"><button type="button" className="ui-btn ui-btn--sm" onClick={() => window.print()} data-testid="mn-print">Print or save as PDF</button></div>
    </Card>

    <Card title="Editions" icon="clock" sub="Each revision your organisation adopted, kept as it stood." testId="mn-revisions">
      <ol className="mn-revs" reversed>{[...s.revisions].reverse().map((r) => <li key={r.rev} data-rev={r.rev} data-state={r.state}><b>Revision {r.rev}</b> <Chip small tone={r.state === 'IN_FORCE' ? 'ok' : 'muted'}>{r.state === 'IN_FORCE' ? 'In force' : 'Archived'}</Chip>
        <span>Adopted {day(r.at)} by the {ROLES[r.by].label}. {plural(Object.keys(r.values).length, 'value')} set, {plural(r.siteAdds.length, 'building addition')}. Review by {day(r.reviewBy)}.</span><span>“{r.note}”</span></li>)}</ol>
    </Card>
  </>);
}

// ------------------------------------------------------------------------------------------------------------------ a chapter
function Rule({ p, s, mayAsk }: { p: Principle; s: ManualState; mayAsk: boolean }) {
  const never = neverExcepted(p); const rev = inForce(s);
  return (
    <li id={p.id} data-rule={p.id} data-when={p.stage} data-never={never ? 'yes' : 'no'}>
      <header><span className="mn-id">{p.id}</span><Chip small tone="muted">{STAGE_LABEL[p.stage]}</Chip>{never ? <Chip small tone="bad" title={never}>Never excepted</Chip> : null}</header>
      <p className="mn-say">{p.say}</p>
      <p className="mn-why"><b>Why.</b> {p.why}</p>
      {p.check ? <p className="mn-why"><b>How it is checked.</b> {p.check}</p> : null}
      {p.tests?.length ? <p className="mn-why" data-tests={p.tests.join(' ')}><b>Tests in the catalogue.</b> {p.tests.map((t, i) => <span key={t}>{i ? '; ' : ''}{testLabel(t)}{(C.tests[t] || C.packTests[t])?.nonwaivable ? ' (never waived)' : ''}</span>)}.</p> : null}
      {p.values?.length ? <dl className="mn-vals">{p.values.map((v) => { const def = VALUES.find((x) => x.id === v)!; const held = rev.values[v]; return (
        <div key={v} data-value={v} data-set={held ? 'yes' : 'no'}><dt>{def.name}</dt><dd>{held ? <><b>{held.value}</b> <span>Source: {held.source}</span></> : <span>Not set by your organisation. {def.ask}</span>}</dd></div>); })}</dl> : null}
      {never ? <p className="mn-never">{never}</p> : mayAsk ? <p className="mn-ask"><a href={`#/manual/exceptions?rule=${p.id}`} data-testid={`mn-ask-${p.id}`}>Ask for an exception to {p.id}</a></p> : null}
    </li>
  );
}
function ChapterView({ c, s, mayAsk }: { c: Chapter; s: ManualState; mayAsk: boolean }) {
  const i = CHAPTERS.indexOf(c); const prev = CHAPTERS[i - 1]; const next = CHAPTERS[i + 1];
  return (<>
    <section className="mn-chapter" aria-label={`${c.title}: the rules`} data-testid="mn-chapter" data-chapter={c.id}>
      <p className="mn-note">Chapter {i + 1} of {CHAPTERS.length} · {plural(c.principles.length, 'rule')}. <a href="#/manual">All chapters</a></p>
      <ol className="mn-rules" data-testid="mn-rules">{c.principles.map((p) => <Rule key={p.id} p={p} s={s} mayAsk={mayAsk} />)}</ol>
    </section>
    <Card title="For your organisation to settle" icon="info" sub="The manual asks these questions. It does not answer them." testId="mn-open"><ul className="mn-plain">{c.open.map((o) => <li key={o}>{o}</li>)}</ul></Card>
    <Card title="Where this chapter is used" icon="layers" testId="mn-see"><ul className="mn-links">{c.see.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul></Card>
    <nav className="mn-pager" aria-label="Chapters">{prev ? <a href={`#/manual/ch/${prev.id}`} data-testid="mn-prev">Previous: {prev.title}</a> : <span />}{next ? <a href={`#/manual/ch/${next.id}`} data-testid="mn-next">Next: {next.title}</a> : <span />}</nav>
  </>);
}

// ------------------------------------------------------------------------------------------------------------- your edition
function EditionView({ role, s, act }: { role: PageProps['role']; s: ManualState; act: Act }) {
  const owner = isOwner(role); const rev = inForce(s); const p = pending(s);
  const [vid, setVid] = useState(VALUES[0]!.id); const [val, setVal] = useState(''); const [src, setSrc] = useState('');
  const [b, setB] = useState(BUILDINGS[0]!.key); const [rule, setRule] = useState('C-09'); const [words, setWords] = useState(''); const [note, setNote] = useState(''); const [days, setDays] = useState('180');
  return (<>
    <Card title={`Revision ${rev.rev} is in force`} icon="check" sub={`Adopted ${day(rev.at)} by the ${ROLES[rev.by].label}. Review by ${day(rev.reviewBy)}.`} testId="mn-edition">
      <p className="mn-note">“{rev.note}”</p>
      <p className="mn-note" data-testid="mn-holder">The standard is held by the {ROLES.architect.label} in this demonstration. {owner ? 'That is you: you work on a copy, and nothing in it is in force until you adopt a revision.' : `The ${ROLES[role].label} reads the edition and does not change it.`}</p>
    </Card>

    <Card title="Values" icon="layers" sub="Each value is your organisation’s, recorded with where it came from. The manual supplies none." testId="mn-values">
      <div className="mn-scroll"><table className="mn-table"><thead><tr><th scope="col">Value</th><th scope="col">In force</th><th scope="col">Working copy</th><th scope="col">Where a value may come from</th></tr></thead>
        <tbody>{VALUES.map((v) => { const f = rev.values[v.id]; const wv = s.values[v.id]; const changed = p.values.includes(v.id); return (
          <tr key={v.id} data-value={v.id} data-set={f ? 'yes' : 'no'} data-pending={changed ? 'yes' : 'no'}><th scope="row">{v.name}<span className="mn-sub">{v.ask}</span></th>
            <td>{f ? <><b>{f.value}</b><span className="mn-sub">Source: {f.source}</span></> : <span className="mn-sub">Not set</span>}</td>
            <td>{changed && wv ? <><b>{wv.value}</b><span className="mn-sub">Source: {wv.source}. Not in force.</span></> : <span className="mn-sub">As in force</span>}</td><td><span className="mn-sub">{v.from}</span></td></tr>); })}</tbody></table></div>
      {owner ? <form className="mn-form" onSubmit={(e) => { e.preventDefault(); if (act((n) => setValue(n, role, vid, val, src), 'The value is in your working copy. It is not in force until you adopt a revision.')) { setVal(''); setSrc(''); } }} data-testid="mn-value-form">
        <div className="ui-field"><label htmlFor="mn-v-id">Value to settle</label><select id="mn-v-id" value={vid} onChange={(e) => setVid(e.target.value)} data-testid="mn-v-id">{VALUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
        <div className="ui-field"><label htmlFor="mn-v-val">The value, with its unit</label><input id="mn-v-val" type="text" maxLength={60} value={val} onChange={(e) => setVal(e.target.value)} data-testid="mn-v-val" autoComplete="off" /></div>
        <div className="ui-field mn-wide"><label htmlFor="mn-v-src">Where it comes from</label><input id="mn-v-src" type="text" maxLength={160} value={src} onChange={(e) => setSrc(e.target.value)} data-testid="mn-v-src" autoComplete="off" /></div>
        <button type="submit" className="ui-btn ui-btn--sm" data-testid="mn-v-go">Put it in the working copy</button></form> : null}
    </Card>

    <Card title="Additions for a building" icon="campus" sub="A building may ask for more than the manual does, never for less." testId="mn-adds">
      {s.siteAdds.length ? <ul className="mn-plain" data-testid="mn-add-list">{s.siteAdds.map((a) => <li key={a.id} data-add={a.id} data-inforce={rev.siteAdds.some((x) => x.id === a.id) ? 'yes' : 'no'}><b>{a.id}</b> · {BUILDINGS.find((x) => x.key === a.building)?.name || a.building} · adds to {a.principle}: {a.text} {rev.siteAdds.some((x) => x.id === a.id) ? '' : <Chip small tone="warn">Not in force</Chip>}</li>)}</ul> : <p className="mn-note">No building has an addition.</p>}
      {owner ? <form className="mn-form" onSubmit={(e) => { e.preventDefault(); if (act((n) => addForSite(n, role, b, rule, words), 'The addition is in your working copy. It is not in force until you adopt a revision.')) setWords(''); }} data-testid="mn-add-form">
        <div className="ui-field"><label htmlFor="mn-a-b">Building</label><select id="mn-a-b" value={b} onChange={(e) => setB(e.target.value)} data-testid="mn-a-b">{BUILDINGS.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></div>
        <div className="ui-field"><label htmlFor="mn-a-rule">The rule it adds to</label><select id="mn-a-rule" value={rule} onChange={(e) => setRule(e.target.value)} data-testid="mn-a-rule">{ALL_PRINCIPLES.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.say.slice(0, 60)}</option>)}</select></div>
        <div className="ui-field mn-wide"><label htmlFor="mn-a-text">The addition</label><input id="mn-a-text" type="text" maxLength={300} value={words} onChange={(e) => setWords(e.target.value)} data-testid="mn-a-text" autoComplete="off" /></div>
        <button type="submit" className="ui-btn ui-btn--sm" data-testid="mn-a-go">Put it in the working copy</button></form> : null}
    </Card>

    <Card title="Adopt a revision" icon="clock" sub="What the working copy holds that is not yet in force." testId="mn-adopt">
      <p className="mn-note" data-testid="mn-pending" data-values={p.values.length} data-adds={p.adds.length}>{p.values.length || p.adds.length ? `${plural(p.values.length, 'value')} and ${plural(p.adds.length, 'building addition')} wait for the next revision.` : 'The working copy matches the revision in force.'}</p>
      {owner ? <form className="mn-form" onSubmit={(e) => { e.preventDefault(); if (act((n) => adopt(n, role, note, Number(days)), 'The revision is adopted and in force. The earlier revision is archived as it stood.')) setNote(''); }} data-testid="mn-adopt-form">
        <div className="ui-field mn-wide"><label htmlFor="mn-r-note">What changed, and why</label><input id="mn-r-note" type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} data-testid="mn-r-note" autoComplete="off" /></div>
        <div className="ui-field"><label htmlFor="mn-r-days">Review it again in</label><select id="mn-r-days" value={days} onChange={(e) => setDays(e.target.value)} data-testid="mn-r-days"><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option></select></div>
        <button type="submit" className="ui-btn ui-btn--primary" data-testid="mn-r-go">Adopt as revision {rev.rev + 1}</button></form>
        : <p className="mn-note">Adopting a revision is for the person who holds the standard.</p>}
      <ol className="mn-revs" reversed data-testid="mn-rev-list">{[...s.revisions].reverse().map((r) => <li key={r.rev} data-rev={r.rev} data-state={r.state}><b>Revision {r.rev}</b> <Chip small tone={r.state === 'IN_FORCE' ? 'ok' : 'muted'}>{r.state === 'IN_FORCE' ? 'In force' : 'Archived'}</Chip>
        <span>Adopted {day(r.at)} by the {ROLES[r.by].label}. {plural(Object.keys(r.values).length, 'value')} set, {plural(r.siteAdds.length, 'building addition')}.</span><span>“{r.note}”</span></li>)}</ol>
    </Card>
  </>);
}
