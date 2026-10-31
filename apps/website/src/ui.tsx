// Building blocks of the public site (Experience System v1: docs/design-system/EXPERIENCE_SYSTEM.md, Figma "Empathia — Experience
// System v1"). Rendered at build time; the browser needs no framework. Every component has one job and names it in its class.
import React from 'react';

export type Evidence = 'verified' | 'observed' | 'declared' | 'modeled' | 'simulated' | 'unknown';
export const EVIDENCE: Record<Evidence, { label: string; meaning: string }> = {
  verified: { label: 'Verified', meaning: 'Checked by someone other than the person who recorded it, against stated acceptance criteria.' },
  observed: { label: 'Observed', meaning: 'Seen by a test or a check at a known time, by a known method.' },
  declared: { label: 'Declared', meaning: 'Stated by a configuration file, a supplier or a person, not yet tested.' },
  modeled: { label: 'Modeled', meaning: 'Predicted from geometry and assumptions; never treated as a measurement.' },
  simulated: { label: 'Simulated', meaning: 'Produced by a simulator or a fixture for demonstration; not a real system.' },
  unknown: { label: 'Unknown', meaning: 'Not known. Shown as unknown, never filled in.' },
};
export const Tag = ({ s, children }: { s: Evidence; children?: React.ReactNode }) => <span className={`tag tag--${s}`}><i aria-hidden="true" />{children || EVIDENCE[s].label}</span>;

export const Hero = ({ label, title, lead, children, aside }: { label?: string; title: string; lead: string; children?: React.ReactNode; aside?: React.ReactNode }) => (
  <section className={`hero${aside ? ' hero--split' : ''}`}><div className="wrap hero__grid">
    <div className="hero__copy">{label ? <p className="label">{label}</p> : null}<h1>{title}</h1><p className="lede">{lead}</p>{children}</div>
    {aside ? <div className="hero__aside">{aside}</div> : null}
  </div></section>
);
export const Section = ({ id, title, lead, children, tone }: { id?: string; title: string; lead?: React.ReactNode; children?: React.ReactNode; tone?: 'warm' | 'deep' }) => (
  <section id={id} className={`section${tone ? ` section--${tone}` : ''}`}><div className="wrap">
    <div className="section__head"><h2>{title}</h2>{lead ? <p className="section__lead">{lead}</p> : null}</div>{children}
  </div></section>
);
export const Cards = ({ items, cols }: { items: { title: string; body: React.ReactNode; href?: string; meta?: React.ReactNode }[]; cols?: 2 | 3 | 4 }) => (
  <div className={`cards cards--${cols || 3}`}>{items.map((it) => (
    <article key={it.title} className={`card${it.href ? ' card--link' : ''}`}>
      <h3>{it.href ? <a href={it.href}>{it.title}</a> : it.title}</h3><p>{it.body}</p>{it.meta ? <div className="card__meta">{it.meta}</div> : null}
    </article>
  ))}</div>
);
export const Steps = ({ steps }: { steps: { title: string; body: string }[] }) => (
  <ol className="steps">{steps.map((s, i) => <li key={s.title}><span className="steps__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><div><h3>{s.title}</h3><p>{s.body}</p></div></li>)}</ol>
);
export const Note = ({ children }: { children: React.ReactNode }) => <p className="note">{children}</p>;
export const Actions = ({ children }: { children: React.ReactNode }) => <div className="actions">{children}</div>;

/** The lifecycle as one continuous evidence line: each stage with the kind of evidence it adds to the room's record. */
export const LIFECYCLE: { stage: string; adds: string; s: Evidence }[] = [
  { stage: 'Request', adds: 'needs, photos, known dimensions', s: 'declared' },
  { stage: 'Design', adds: 'geometry with its provenance', s: 'modeled' },
  { stage: 'Authorize', adds: 'approval and funding, by different people', s: 'verified' },
  { stage: 'Commission', adds: 'an adaptive plan, results as recorded', s: 'observed' },
  { stage: 'Verify', adds: 'an independent reviewer signs', s: 'verified' },
  { stage: 'Baseline', adds: 'the accepted state, versioned', s: 'verified' },
  { stage: 'Operate', adds: 'drift read against the baseline', s: 'observed' },
  { stage: 'Learn', adds: 'reviewed cases from what happened', s: 'declared' },
];
export const EvidenceLine = () => (
  <ol className="eline" aria-label="The Empathia lifecycle">{LIFECYCLE.map((l) => (
    <li key={l.stage} className="eline__stop"><span className="eline__dot" aria-hidden="true" /><b>{l.stage}</b><span className="eline__adds">{l.adds}</span><Tag s={l.s} /></li>
  ))}</ol>
);

/** A record as the product shows it (demonstration data, labelled). Used where a film is not yet cleared for the public site. */
export const RecordCard = () => (
  <figure className="record" aria-label="A room record from the demonstration">
    <figcaption className="record__top"><span className="record__id">ATL-4.218</span><span>Executive collaboration room</span><span className="record__syn">Synthetic demonstration data</span></figcaption>
    <dl className="record__rows">
      <div><dt>Speech coverage at every seat</dt><dd><Tag s="modeled" /><span>Lite, from the approved geometry</span></dd></div>
      <div><dt>Ceiling microphone reachable</dt><dd><Tag s="observed" /><span>passive check, 09:58</span></dd></div>
      <div><dt>Far-end audio test</dt><dd><Tag s="verified" /><span>recorded by the engineer, signed by a reviewer</span></dd></div>
      <div><dt>Touch panel firmware</dt><dd><Tag s="declared" /><span>supplier record, not yet tested</span></dd></div>
      <div><dt>Occupancy sensor</dt><dd><Tag s="unknown" /><span>no source; shown as unknown</span></dd></div>
    </dl>
    <p className="record__base"><span>Baseline v2 accepted</span><span>v1 preserved, with the difference</span></p>
  </figure>
);

export interface Film { key: string; title: string; runtime: string; summary: string; disclosure: string; placement: string[] }
/** A film, if it was built into this site (rights cleared, or a preview build). Captions are a real WebVTT track; the transcript is the
 *  same text, readable without playing anything. No autoplay with sound; nothing downloads until the viewer presses play. */
export const FilmPlayer = ({ film, transcript, lead }: { film: Film; transcript: string[]; lead?: boolean }) => (
  <figure className={`film${lead ? ' film--lead' : ''}`} id={`film-${film.key}`}>
    <div className="film__frame">
      <video controls preload="none" playsInline poster={`/media/${film.key}/poster.webp`} aria-describedby={`film-${film.key}-cap`}>
        <source src={`/media/${film.key}/720.mp4`} type="video/mp4" />
        <track kind="captions" src={`/media/${film.key}/captions.vtt`} srcLang="en" label="English" default />
      </video>
    </div>
    <figcaption id={`film-${film.key}-cap`} className="film__cap"><b>{film.title}</b><span>{film.runtime} · captions · transcript below</span><span className="film__disc">{film.disclosure}</span></figcaption>
    <details className="film__transcript"><summary>Transcript</summary><div>{transcript.map((t, i) => <p key={i}>{t}</p>)}</div></details>
  </figure>
);

export const Portrait = ({ size }: { size: 'lg' | 'sm' }) => (
  <picture className={`portrait portrait--${size}`}>
    <source type="image/webp" srcSet="/media/founder/480.webp 480w, /media/founder/800.webp 800w, /media/founder/1200.webp 1200w" sizes={size === 'lg' ? '(max-width: 760px) 90vw, 420px' : '(max-width: 760px) 60vw, 220px'} />
    <img src="/media/founder/800.jpg" srcSet="/media/founder/480.jpg 480w, /media/founder/800.jpg 800w, /media/founder/1200.jpg 1200w" sizes={size === 'lg' ? '(max-width: 760px) 90vw, 420px' : '(max-width: 760px) 60vw, 220px'} width={800} height={1000} loading={size === 'lg' ? 'eager' : 'lazy'} decoding="async" alt="Portrait of Jeremiah Johnson in a light hoodie, indoors." />
  </picture>
);
export const CREDENTIALS = [{ abbr: 'CTS', full: 'Certified Technology Specialist', by: 'AVIXA' }, { abbr: 'CAPM', full: 'Certified Associate in Project Management', by: 'PMI' }, { abbr: 'Network+', full: 'CompTIA Network+', by: 'CompTIA' }];
export const Credentials = () => <ul className="creds" aria-label="Credentials">{CREDENTIALS.map((c) => <li key={c.abbr}><abbr title={c.full}>{c.abbr}</abbr><span>{c.by}</span></li>)}</ul>;
export const FOUNDER_QUOTE = 'Empathia grew from a simple conviction: the technology behind a workplace should be understandable, accountable and provable. We’re connecting design, people, systems, service, and learning into one evidence-backed lifecycle.';
