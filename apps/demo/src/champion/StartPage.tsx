/**
 * #/site/start — a Site Champion's first weeks, tracked (see start.ts). The list at the top is read from the record: what the
 * champion has marked as read, the last try at the check, the rooms checked on site, the documents waiting for them, and their notes.
 * Two things are written here and nowhere else: "I have read this" (markRead) and a set of answers (answerCheck, marked in the store).
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Chip, Notice, Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { CHAMPION_SITES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { buildingByKey, roomById, roomsIn } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { backupOf, baseFloor, escalationOf, personaPerson } from '../connect/directory.js';
import { DAY_SHORT } from '../connect/time.js';
import { readDocs } from '../docs5/store.js';
import { TRACKED_REPORT, TRACKED_ROOM } from '../docs5/model.js';
import { answerCheck, championView, markRead } from './store.js';
import { CHECK, LESSONS, PASS_MARK, startView, type CheckResult } from './start.js';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const days = (d: readonly number[]) => (d.length === 5 && d.every((x, i) => x === i + 1) ? 'Monday to Friday' : d.map((x) => DAY_SHORT[x]).join(', '));

export default function StartPage({ role, can }: PageProps) {
  const { w, apply } = useWorkspace(); const c = championView(w);
  const site = CHAMPION_SITES[0]!; const B = buildingByKey(site); const rooms = useMemo(() => roomsIn(site).length, [site]);
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  const me = personaPerson(role); const backup = backupOf(site); const esc = useMemo(() => (me ? escalationOf(me) : []), [me]);
  const waiting = roomById(TRACKED_ROOM)?.building === site ? (readDocs()?.docs ?? []).filter((d) => d.acknowledgements.outstanding.some((a) => a.role === role)).length : 0;
  const docsHref = `#/docs/${TRACKED_REPORT}`; const profile = me ? `#/people/${me.id}` : null;
  const v = startView(c, rooms, opens(docsHref) ? waiting : null, { site: '#/site', docs: opens(docsHref) ? docsHref : null, profile });
  const [picked, setPicked] = useState<Record<string, number>>({}); const [result, setResult] = useState<CheckResult | null>(null); const [no, setNo] = useState<string | null>(null);
  const read = (id: string) => { const r = apply((n) => markRead(n, role, id)) as { why?: string[] }; setNo(r.why ? r.why.join(' ') : null); };   // a refusal is shown by the check, where the only refusals a champion can meet arise
  const submit = () => {
    const r = apply((n) => answerCheck(n, role, CHECK.map((q) => picked[q.id] ?? -1))) as { why?: string[] } & Partial<CheckResult>;
    if (r.why) { setNo(r.why.join(' ')); setResult(null); return; }
    setNo(null); setResult({ score: r.score!, of: r.of!, passed: r.passed!, wrong: r.wrong! });
  };
  const k = c.start.check;

  return (
    <div className="pa sc st" data-native="" data-testid="start" data-done={v.done} data-complete={v.complete ? 'yes' : 'no'}>
      <PageHero compact eyebrow="Site Champion" title={`Getting started at ${B?.name || site}`} product="lite" icon="book"
        lede={v.complete ? 'Everything on this list is done. It stays here to come back to.' : `${v.done} of ${v.total} done. Six short lessons, a check, and four things you do on your own site. Take them in any order, over days.`}
        meta={[<Chip key="s" small tone="warn">Synthetic data</Chip>, <Chip key="d" small tone="muted">Draft: not yet reviewed by a practising AV engineer</Chip>, <Chip key="q" small tone="muted">A list, not a qualification</Chip>]} />

      <div className="st-top">
        <Card title="Your list" icon="check" sub="Each line says who knows it is done: the record, or you." testId="start-list">
          <ol className="st-steps" data-testid="start-steps">{v.steps.map((s) => (
            <li key={s.id} data-step={s.id} data-done={s.done ? 'yes' : 'no'}>
              <span className="st-mark" aria-hidden="true">{s.done ? <Icon name="check" size={16} /> : null}</span>
              <div><b>{s.title}</b><span>{s.why}</span>
                <span className="st-ev"><Chip small tone={s.done ? 'ok' : 'muted'}>{s.done ? 'Done' : 'To do'}</Chip> {s.evidence} · {s.by === 'record' ? 'from the record' : 'your own word'}</span></div>
              {s.cta && s.href ? <a className="ui-btn ui-btn--sm" href={s.href}>{s.cta}</a> : null}
            </li>))}</ol>
        </Card>

        <Card title="You, on the directory" icon="users" sub="What colleagues see when they look for the champion of this site." testId="start-profile">
          {me ? <dl className="st-facts">
            <div><dt>Name</dt><dd>{me.name} <span className="ui-meta">(synthetic)</span></dd></div>
            <div><dt>Site</dt><dd>{B?.name || site}{baseFloor(me) !== null ? `, based on floor ${baseFloor(me)}` : ''} · {rooms} rooms</dd></div>
            <div><dt>Hours</dt><dd>{days(me.hours.days)}, {me.hours.start} to {me.hours.end}</dd></div>
            <div><dt>Backup</dt><dd>{backup ? `${backup.name}, ${days(backup.hours.days)}, ${backup.hours.start} to ${backup.hours.end}` : 'Nobody is recorded as your backup'}</dd></div>
          </dl> : <p className="sc-note">No directory entry is recorded for this role.</p>}
          {profile && opens(profile) ? <p className="sc-note"><a href={profile} data-testid="start-profile-link">See your profile as colleagues see it</a>, with what the role may and may not do.</p> : null}
        </Card>
      </div>

      <section className="st-sec" id="start-lessons" aria-labelledby="st-lessons-h">
        <header><h2 id="st-lessons-h">The lessons</h2><p className="ui-meta">{v.lessonsRead} of {LESSONS.length} read. Each takes about two minutes.</p></header>
        <div className="st-lessons">{LESSONS.map((l) => { const at = c.start.read[l.id]; return (
          <article key={l.id} className="st-lesson" data-testid={`lesson-${l.id}`} data-read={at ? 'yes' : 'no'} aria-labelledby={`st-l-${l.id}`}>
            <h3 id={`st-l-${l.id}`}>{l.title}</h3>
            <ul>{l.points.map((p) => <li key={p}>{p}</li>)}</ul>
            {at ? <p className="st-read"><Icon name="check" size={14} /> Read on {day(at)}</p>
              : can('site.start.read') ? <button type="button" className="ui-btn ui-btn--sm" data-testid={`lesson-read-${l.id}`} onClick={() => read(l.id)}>I have read this</button> : null}
          </article>); })}</div>
      </section>

      <section className="st-sec" id="start-check" aria-labelledby="st-check-h">
        <header><h2 id="st-check-h">The check</h2><p className="ui-meta">Six questions. Five right pass, as long as the last one is among them. You can try again as often as you like.{k ? ` Last try: ${k.score} of ${k.of} on ${day(k.at)}.` : ''}</p></header>
        <form className="st-check" noValidate data-testid="start-check" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {CHECK.map((q, i) => { const wrong = result?.wrong.includes(q.id); return (
            <fieldset key={q.id} data-q={q.id} data-marked={result ? (wrong ? 'wrong' : 'right') : 'no'}>
              <legend>{i + 1}. {q.q}</legend>
              {q.options.map((o, j) => <label key={o} className="st-opt"><input type="radio" name={q.id} value={j} checked={picked[q.id] === j} onChange={() => { setPicked({ ...picked, [q.id]: j }); setResult(null); }} /><span>{o}</span></label>)}
              {result ? <p className={`st-why st-why--${wrong ? 'no' : 'ok'}`}><Icon name={wrong ? 'alert' : 'check'} size={14} /><span><b>{wrong ? 'Not this one.' : 'Right.'}</b> {q.why}</span></p> : null}
            </fieldset>); })}
          {can('site.start.check') ? <div className="sc-actions"><button type="submit" className="ui-btn ui-btn--primary" data-testid="check-go">Check my answers</button></div> : null}
          {no ? <div role="alert" className="sc-msg sc-msg--no" data-testid="start-refused"><Icon name="alert" size={18} /><span>{no}</span></div> : null}
          {result ? <p role="status" className={`sc-msg sc-msg--${result.passed ? 'ok' : 'no'}`} data-testid="check-result" data-passed={result.passed ? 'yes' : 'no'} data-score={result.score}><Icon name={result.passed ? 'check' : 'info'} size={18} />
            <span>{result.score} of {result.of}. {result.passed ? 'That passes. It is a check of understanding, not a qualification, and it gives you no new permission.' : result.score >= PASS_MARK ? 'Not passed: the last question has to be right, whatever the total. Read “When to step back” again and try once more.' : `Not passed yet: ${PASS_MARK} are needed. The reasons are under each question; try again when you are ready.`}</span></p> : null}
        </form>
      </section>

      <section className="st-sec" id="start-support" aria-labelledby="st-support-h" data-testid="start-support" data-read={c.start.read['support'] ? 'yes' : 'no'}>
        <header><h2 id="st-support-h">Who supports your site</h2><p className="ui-meta">The order a problem travels in. You start it; you do not have to chase it.</p></header>
        <ol className="sc-path">
          {esc.map((e) => <li key={e.role}><b>{e.title}{e.person ? `: ${e.person.name}` : ''}</b><span>{e.when}.</span></li>)}
          <li><b>Your backup{backup ? `: ${backup.name}` : ''}</b><span>{backup ? 'Stands in for you when you are away. Tell them what is open before you go.' : 'Nobody is recorded. Ask the service manager who stands in for you.'}</span></li>
        </ol>
        <p className="sc-note">Names are synthetic. {opens('#/people') ? <a href={`#/people?site=${site}`}>The people of this site, and how to reach each</a> : null}</p>
        {c.start.read['support'] ? <p className="st-read"><Icon name="check" size={14} /> Read on {day(c.start.read['support'])}</p>
          : can('site.start.read') ? <button type="button" className="ui-btn ui-btn--sm" data-testid="support-read" onClick={() => read('support')}>I have read this</button> : null}
      </section>

      <Notice tone="info">
        <b>What this list is.</b> A way to learn the role, and a record that you did. Marking a lesson as read is your own word; the check is marked here and its result is kept as a count on the ledger. None of it is a qualification, and none of it changes what a Site Champion may do. The lessons were written for this demonstration and have not yet been reviewed by a practising AV engineer.
      </Notice>
    </div>
  );
}
