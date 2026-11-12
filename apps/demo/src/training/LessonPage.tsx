/**
 * #/learn/lesson/<id> — one equipment lesson (12 Nov 2026; acceptance A5): what it applies to and where each step comes from, its
 * verification state in words, the film with captions and a captioned silent version, the transcript, and one practice decision whose
 * feedback says why. A practice attempt is training evidence only; it never says a room or a device passed anything.
 */
import { useState } from 'react';
import { PageHero, Card, Chip, Button } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { LESSONS, lessonOf, recordAttempt, attempts, VERIFICATION, type Attempt } from './lessons.js';

export default function LessonPage({ params }: PageProps) {
  const l = lessonOf(params.id || '') || (params.id ? null : LESSONS[0]!);
  const [silent, setSilent] = useState(false); const [last, setLast] = useState<Attempt | null>(null); const [n, setN] = useState(() => attempts().length);
  if (!l) return <section className="stack" data-native="" data-testid="lesson-none"><PageHero compact eyebrow="Equipment lesson" title="No such lesson" lede="Lessons are listed on the Learn page." /></section>;
  const step = VERIFICATION.indexOf(l.state);
  return <section className="stack" data-native="" data-testid="lesson" data-lesson={l.id} data-state={l.state}>
    <PageHero compact eyebrow="Equipment lesson" title={l.title} lede={`${l.product} on ${l.platform}. ${l.audience}.`}
      meta={[<Chip key="s" small tone="warn">{l.state}</Chip>, <Chip key="v" small tone="muted">version {l.version}</Chip>, <Chip key="i" small tone="muted">illustration, not the actual screen</Chip>]} />
    <Card title="Does this apply to your room?" sub="Check before you follow it" testId="lesson-applies">
      <dl className="kv">
        <dt>Vendor · product</dt><dd>{l.vendor} · {l.product}</dd><dt>Platform</dt><dd>{l.platform}</dd><dt>Hardware</dt><dd>{l.hardware}</dd><dt>Software</dt><dd>{l.software}</dd>
      </dl>
      <p className="ui-meta">It differs from room to room in these ways:</p>
      <ul className="plain">{l.config.map((c) => <li key={c}>{c}</li>)}</ul>
      <p className="ui-meta" data-testid="lesson-room-check">No room in this demonstration records its meeting platform, so this lesson is not attached to a room automatically. In a real estate it appears only where the room’s asset record names this system; where the record is silent, the room’s owner confirms it.</p>
    </Card>
    <Card title="Watch" sub={silent ? 'Captioned silent version (captions are part of the picture)' : 'With captions; the narration is added when its take is approved'} testId="lesson-film"
      action={<Button small onClick={() => setSilent(!silent)}>{silent ? 'Show the captioned film' : 'Show the silent captioned version'}</Button>}>
      <video key={silent ? 'silent' : 'film'} controls preload="metadata" playsInline poster={l.media.poster} src={silent ? l.media.captioned : l.media.video} style={{ width: '100%', maxWidth: 960, borderRadius: 12 }} data-testid="lesson-video" aria-label={`${l.title}, ${silent ? 'captioned silent version' : 'film'}`}>
        {!silent && <track kind="captions" src={l.media.captions} srcLang="en" label="English" default />}
      </video>
      <p className="ui-meta">Narration: {l.media.narration === 'present' ? 'included' : 'pending (generated, awaiting import and review); this version has captions and no sound'}. <a href={l.media.transcript}>Transcript</a>.</p>
    </Card>
    <Card title="The steps" sub="In Empathia’s words; the button names are the vendor’s" testId="lesson-steps">
      <ol>{l.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <p className="ui-meta">Not covered: {l.notCovered.join('; ')}.</p>
    </Card>
    <Card title="Practise" sub="One decision from the lesson; your answer is training evidence only" testId="lesson-practice">
      <p><b>{l.practice.q}</b></p>
      <div className="build__row" role="group" aria-label="Choices">{l.practice.choices.map((c) => <Button key={c.id} small onClick={() => { setLast(recordAttempt(l, c.id)); setN((x) => x + 1); }} data-choice={c.id}>{c.text}</Button>)}</div>
      {last && <p role="status" data-testid="lesson-feedback" data-correct={String(last.correct)}>{last.correct ? <><b>Right.</b> {l.practice.why}</> : <><b>Not this one.</b> {l.practice.wrong[last.choice]} Try again.</>}</p>}
      <p className="ui-meta">{n} attempt{n === 1 ? '' : 's'} recorded on this computer for lesson version {l.version}. A practice answer never shows that a room or a device works.</p>
    </Card>
    <Card title="Where this comes from" sub={`Verification: step ${step + 1} of the lesson states, “${l.state}”`} testId="lesson-sources">
      <p>{l.stateNote}</p>
      <ul className="plain">{l.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> <span className="ui-meta">read {s.read}</span></li>)}</ul>
      <p className="ui-meta">Reviewed by: {l.reviewer} · {l.reviewed}. Rights: {l.rights}</p>
    </Card>
  </section>;
}
