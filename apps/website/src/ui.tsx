// Building blocks of the public site (LEI direction on the Experience System). Rendered at build time; the browser needs no framework.
// Every component has one job and names it in its class.
import React from 'react';
import { PRODUCTS, CANON, DEMO_STATE, type Product } from './products.js';
import { ENQUIRIES, enquiryUrl, disclosure, type Source } from './enquiry.js';

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
export const Section = ({ id, title, lead, children, tone, eyebrow }: { id?: string; title: string; lead?: React.ReactNode; children?: React.ReactNode; tone?: 'warm' | 'deep'; eyebrow?: string }) => (
  <section id={id} className={`section${tone ? ` section--${tone}` : ''}`}><div className="wrap">
    <div className="section__head">{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2>{title}</h2>{lead ? <p className="section__lead">{lead}</p> : null}</div>{children}
  </div></section>
);
/** A small line icon (24 px grid, stroked in currentColor), decorative: the card's heading carries the meaning. */
const ICONS: Record<string, string> = {
  exec: 'M4 20V10M10 20V4M16 20v-7M22 20H2', integrator: 'M4 7h16v10H4zM8 21h8M12 17v4M8 11h3M8 13.5h6', service: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z', facility: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6M3 21h18',
  evidence: 'M9 12l2 2 4-4M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z', key: 'M15 3a6 6 0 0 0-5.7 7.9L3 17.2V21h3.8v-2.2H9v-2.3h2.3l1.8-1.8A6 6 0 1 0 15 3zM16.5 7.5h.01', history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  model: 'M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10', db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', code: 'M8 8l-5 4 5 4M16 8l5 4-5 4M14 4l-4 16', gauge: 'M12 14l4-4M3.5 18a9 9 0 1 1 17 0', plug: 'M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5',
  scope: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', data: 'M4 5h16M4 12h16M4 19h10', report: 'M6 3h9l3 3v15H6zM9 12h6M9 16h6M9 8h3', file: 'M6 3h9l3 3v15H6zM9 13l2 2 4-4',
};
export const Icon = ({ name }: { name: string }) => ICONS[name] ? <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[name]} /></svg> : null;
export const Cards = ({ items, cols }: { items: { title: string; body: React.ReactNode; href?: string; meta?: React.ReactNode; icon?: string }[]; cols?: 2 | 3 | 4 }) => (
  <div className={`cards cards--${cols || 3}`}>{items.map((it) => (
    <article key={it.title} className={`card${it.href ? ' card--link' : ''}`}>
      {it.icon ? <span className="card__ico"><Icon name={it.icon} /></span> : null}
      <h3>{it.href ? <a href={it.href}>{it.title}</a> : it.title}</h3><p>{it.body}</p>{it.meta ? <div className="card__meta">{it.meta}</div> : null}{it.href ? <span className="card__go" aria-hidden="true">→</span> : null}
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
    <source type="image/webp" srcSet="/media/founder/480.webp 480w, /media/founder/800.webp 800w, /media/founder/1200.webp 1200w" sizes="(max-width: 720px) 300px, (max-width: 1100px) 340px, 460px" />
    <img src="/media/founder/800.jpg" srcSet="/media/founder/480.jpg 480w, /media/founder/800.jpg 800w, /media/founder/1200.jpg 1200w" sizes="(max-width: 720px) 300px, (max-width: 1100px) 340px, 460px" width={800} height={1000} loading={size === 'lg' ? 'eager' : 'lazy'} decoding="async" alt="Portrait of Jeremiah Johnson in a light hoodie, indoors." />
  </picture>
);
export const CREDENTIALS = [{ abbr: 'CTS', full: 'Certified Technology Specialist', by: 'AVIXA' }, { abbr: 'CAPM', full: 'Certified Associate in Project Management', by: 'PMI' }, { abbr: 'Network+', full: 'CompTIA Network+', by: 'CompTIA' }];
export const Credentials = () => <ul className="creds" aria-label="Credentials">{CREDENTIALS.map((c) => <li key={c.abbr}><abbr title={c.full}>{c.abbr}</abbr><span>{c.by}</span></li>)}</ul>;
export const FOUNDER_QUOTE = 'Empathia grew from a simple conviction: the technology behind a workplace should be understandable, accountable and provable. We’re connecting design, people, systems, service, and learning into one evidence-backed lifecycle.';

/** The nine product colours as one strip: the website's hero signature in both themes, above the hero's glow (V2.5.3 atmosphere). */
export const Spectrum = () => <div className="spectrum" aria-hidden="true">{CANON.map((p) => <i key={p.id} data-p={p.id} />)}</div>;

export interface Capture { w: number; h: number; route: string }
/** A dark capture of the investor demonstration (D43), with its provenance stated. */
export const Shot = ({ p, cap, eager }: { p: Product; cap?: Capture; eager?: boolean }) => cap ? (
  <figure className="shot" data-p={p.id}>
    <div className="shot__frame">
      <img src={`/media/product/${p.id}-1280.webp`} srcSet={`/media/product/${p.id}-640.webp 640w, /media/product/${p.id}-1280.webp 1280w`} sizes="(max-width: 1100px) 92vw, 620px" width={cap.w} height={cap.h} loading={eager ? 'eager' : 'lazy'} decoding="async" alt={`${p.name} in the investor demonstration: ${p.purpose.charAt(0).toLowerCase() + p.purpose.slice(1)}.`} />
    </div>
    <figcaption><b>Synthetic demonstration data</b><span>Captured from the investor demonstration</span></figcaption>
  </figure>
) : null;

/** The nine products as image-led tiles, in the canonical order (D37/D40), each in its own colour. */
export const ProductTiles = ({ captures, exclude, compact }: { captures: Record<string, Capture>; exclude?: string; compact?: boolean }) => (
  <ul className="tiles" aria-label="The nine products">{PRODUCTS.filter((p) => p.id !== exclude).map((p) => {
    const n = CANON.findIndex((c) => c.id === p.id) + 1; const cap = captures[p.id];
    return (
      <li key={p.id} className="tile" data-p={p.id} data-product={p.id}>
        <div className={`tile__art${cap ? '' : ' tile__art--empty'}`}>
          <span className="tile__n" aria-hidden="true">{String(n).padStart(2, '0')}</span>
          {cap ? <img src={`/media/product/${p.id}-640.webp`} width={640} height={Math.round(640 * cap.h / cap.w)} loading="lazy" decoding="async" alt="" /> : <b aria-hidden="true">{p.name}</b>}
        </div>
        <div className="tile__body"><h3><a href={`/products/${p.slug}`}>{p.name}</a></h3><p>{p.purpose}</p>{p.apps.length ? <p className="tile__apps">Includes {p.apps.join(' and ')}</p> : null}{compact ? null : <Tag s={DEMO_STATE[p.demoState].s}>{DEMO_STATE[p.demoState].text}</Tag>}</div>
      </li>
    );
  })}</ul>
);

export const ExtIcon = () => <svg className="ext" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 2h5v5M14 2 7 9" /></svg>;
/** An entry point to the hosted enquiry form: new tab, noopener noreferrer, the destination in its accessible name, the disclosure beside it. */
export const EnquiryLink = ({ source, primary, id }: { source: Source; primary?: boolean; id?: string }) => {
  const e = ENQUIRIES[source]; const did = `disc-${id || source}`;
  return (<>
    <a className={`btn${primary ? ' btn--primary' : ''}`} href={enquiryUrl(source)} target="_blank" rel="noopener noreferrer" data-enquiry={source} aria-describedby={did}>{e.button}<span className="sr"> (opens the enquiry form on tally.so in a new tab)</span><ExtIcon /></a>
    <p className="disclosure" id={did}>{disclosure(e)} <a href="/privacy#enquiries">How enquiries are handled</a>.</p>
  </>);
};
export const EnquiryCard = ({ source, primary }: { source: Source; primary?: boolean }) => { const e = ENQUIRIES[source]; return (
  <div className="enquire"><h3>{e.title}</h3><p>{e.body}</p><EnquiryLink source={source} primary={primary} /></div>
); };

/** The founder: the person and the thinking behind the company, not a second product page (founder 2026-10-31 21:35 / 21:42 / 21:46).
 *  Two distinct calls to action: "About the founder" (this site, same tab) and "Connect with the founder" (the enquiry form, new tab,
 *  marked source=founder). Only the supplied portrait, only the three credentials, no invented biography. */
export const FounderBlock = ({ page }: { page: 'home' | 'founder' }) => (
  <div className="founder" data-founder={page}>
    <Portrait size={page === 'founder' ? 'lg' : 'sm'} />
    <div className="founder__text">
      <p className="label">{page === 'founder' ? 'Founder' : 'The founder'}</p>
      {page === 'founder' ? <h1 className="founder__name">Jeremiah Johnson</h1> : <h2 className="founder__name">Jeremiah Johnson</h2>}
      <p className="founder__role">Founder, Empathia Technologies</p>
      <Credentials />
      <blockquote className="philosophy"><p>{FOUNDER_QUOTE}</p><footer>Jeremiah Johnson, on why Empathia exists</footer></blockquote>
      <div className="founder__ctas">
        {page === 'home' ? <a className="btn btn--lg" href="/founder" data-founder-about>About the founder</a> : null}
        <a className="btn btn--primary btn--lg" href={enquiryUrl('founder')} target="_blank" rel="noopener noreferrer" data-enquiry="founder" aria-describedby={`disc-founder-${page}`}>Connect with the founder<span className="sr"> (opens the enquiry form on tally.so in a new tab)</span><ExtIcon /></a>
      </div>
      <p className="disclosure" id={`disc-founder-${page}`}>{disclosure(ENQUIRIES.founder)} The enquiry is marked for the founder; it is not a private channel. <a href="/privacy#enquiries">How enquiries are handled</a>.</p>
    </div>
  </div>
);

/** The home hero's composition: Mission Control as the screen, a room record layered over it (the evidence labels the product keeps),
 *  and the counts this site is built from (computed from the product list and the room mix, never typed). All synthetic, and labelled. */
export const Stage = ({ p, cap, counts }: { p: Product; cap?: Capture; counts: { label: string; n: number }[] }) => (
  <div className="stage" data-p={p.id}>
    <span className="stage__glow" aria-hidden="true" />
    {cap ? <Shot p={p} cap={cap} eager /> : <RecordCard />}
    {cap ? <figure className="stage__card" aria-label="A room record from the demonstration">
      <figcaption><span className="record__id">ATL-4.218</span><span>Executive collaboration</span></figcaption>
      <ul>
        <li><span>Speech coverage, every seat</span><Tag s="modeled" /></li>
        <li><span>Far-end audio test</span><Tag s="verified" /></li>
        <li><span>Occupancy sensor</span><Tag s="unknown" /></li>
      </ul>
    </figure> : null}
    <ul className="stage__chip" aria-label="The demonstration in numbers">{counts.map((c) => <li key={c.label}><b>{c.n}</b><span>{c.label}</span></li>)}</ul>
  </div>
);

export interface ChapterItem { p: Product; title: string; body: string; points: string[]; also?: Product }
/** The home page's story: each stage of the lifecycle told with the product's own screen (a dark capture, D43), in lifecycle order. */
export const Chapters = ({ items, captures }: { items: ChapterItem[]; captures: Record<string, Capture> }) => (
  <ol className="chapters">{items.map((c, i) => (
    <li key={c.p.id} className="chapter" data-p={c.p.id}>
      <div className="chapter__media"><span className="chapter__glow" aria-hidden="true" /><Shot p={c.p} cap={captures[c.p.id]} /></div>
      <div className="chapter__text">
        <p className="chapter__n"><span className="dot" aria-hidden="true" />{String(i + 1).padStart(2, '0')} · {c.p.name}{c.also ? ` and ${c.also.name}` : ''}</p>
        <h3>{c.title}</h3><p>{c.body}</p>
        <ul className="ticks">{c.points.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="chapter__go"><a href={`/products/${c.p.slug}`}>{c.p.name}<span className="sr">: the product page</span><span aria-hidden="true"> →</span></a>{c.also ? <a href={`/products/${c.also.slug}`} data-p={c.also.id}>{c.also.name}<span className="sr">: the product page</span><span aria-hidden="true"> →</span></a> : null}</p>
      </div>
    </li>
  ))}</ol>
);

/** The thirty demonstration rooms as thirty cells, one per room, marked by how each was made; the approved wording stays beside it. */
export const RoomMix = ({ mix }: { mix: { n: number; label: string; k: string }[] }) => (
  <div className="mix">
    <ul className="mix__cells" aria-hidden="true">{mix.flatMap((m) => Array.from({ length: m.n }, (_, i) => <li key={m.k + i} data-k={m.k} />))}</ul>
    <ul className="mix__key">{mix.map((m) => <li key={m.k} data-k={m.k}><i aria-hidden="true" /><b>{m.n}</b><span>{m.label}</span></li>)}</ul>
  </div>
);
