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

/** `exclusive`: the film plays only on the pages in `placement`, never on /films (the build checks it). `sound: 'none'`: the film is
 *  silent and its rendition has no audio stream. `textTrack: 'descriptions'`: there is no speech to caption, so the film carries a
 *  description of what it shows (descriptions.vtt), printed under the player cue by cue. */
export interface Film { key: string; title: string; runtime: string; summary: string; disclosure: string; placement: string[]; exclusive?: boolean; sound?: 'none'; textTrack?: 'descriptions'; /** printed directly above the player, always visible: what a viewer must know to read the film honestly */ qualifier?: string; /** a label burned into the rendition for its whole length, on a band added above the picture */ burnedLabel?: { text: string; band: number }; /** the rendition's width and height when it is not 1280 × 720 (a band was added) */ frame?: [number, number] }
export interface Cue { from: string; to: string; text: string }
/** A film, if it was built into this site (rights cleared, or a preview build). Captions are a real WebVTT track; the transcript is the
 *  same text, readable without playing anything. No autoplay with sound; nothing downloads until the viewer presses play.
 *  A silent film (`cues` given) has nothing to caption: its captions track holds one cue that says so, its descriptions track and the
 *  text under the player say what is shown, with the on-screen words quoted. No spoken word is ever invented for it. */
export const FilmPlayer = ({ film, transcript, cues, lead }: { film: Film; transcript: string[]; cues?: Cue[]; lead?: boolean }) => {
  const described = film.textTrack === 'descriptions' && !!cues?.length;
  return (
    <figure className={`film${lead ? ' film--lead' : ''}${described ? ' film--described' : ''}${film.burnedLabel ? ' film--band' : ''}`} id={`film-${film.key}`} data-film={film.key}>
      {film.qualifier ? <p className="film__qualifier" role="note" id={`film-${film.key}-q`} data-film-qualifier>{film.qualifier}</p> : null}
      <div className="film__frame">
        <video controls preload="none" playsInline poster={`/media/${film.key}/poster.webp`} width={film.frame?.[0]} height={film.frame?.[1]} aria-describedby={`${film.qualifier ? `film-${film.key}-q ` : ''}film-${film.key}-cap`}>
          <source src={`/media/${film.key}/720.mp4`} type="video/mp4" />
          {described ? <track kind="captions" src={`/media/${film.key}/captions.vtt`} srcLang="en" label="English (this film has no sound)" /> : <track kind="captions" src={`/media/${film.key}/captions.vtt`} srcLang="en" label="English" default />}
          {described ? <track kind="descriptions" src={`/media/${film.key}/descriptions.vtt`} srcLang="en" label="Text description (English)" /> : null}
        </video>
      </div>
      <figcaption id={`film-${film.key}-cap`} className="film__cap"><b>{film.title}</b><span>{described ? `${film.runtime} · no sound · text description below` : `${film.runtime} · captions · transcript below`}</span><span className="film__disc">{film.disclosure}</span></figcaption>
      {described ? <>
        <p className="film__how" data-film-how>This film has no sound and no narration: everything it says is written on screen. The description below is of what is shown, scene by scene, with the on-screen words in quotation marks and this page’s own notes in square brackets. Nothing in it was spoken.</p>
        <details className="film__transcript film__transcript--described" data-film-description><summary>What the film shows: a text description</summary>
          <ol className="film__cues">{cues!.map((c) => <li key={c.from}><span className="film__time"><span className="sr">From </span>{c.from}<span aria-hidden="true"> – </span><span className="sr"> to </span>{c.to}</span><p>{c.text}</p></li>)}</ol>
        </details>
      </> : <details className="film__transcript"><summary>Transcript</summary><div>{transcript.map((t, i) => <p key={i}>{t}</p>)}</div></details>}
    </figure>
  );
};

/** A film that is not yet cleared for publication: a drawn poster (no frame of the film), its title, runtime and summary, and the honest
 *  reason it does not play here. Nothing is downloaded. */
export const FilmPending = ({ film, n }: { film: Pick<Film, 'key' | 'title' | 'runtime' | 'summary' | 'disclosure'>; n: number }) => (
  <article className="filmcard" data-film-pending={film.key}>
    <div className="filmcard__poster" aria-hidden="true"><span className="filmcard__n">{String(n).padStart(2, '0')}</span><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" /><path d="M19 15v18l15-9z" /></svg><span className="filmcard__rt">{film.runtime}</span></div>
    <div className="filmcard__body"><h3>{film.title}</h3><p>{film.summary}</p><p className="filmcard__state"><Tag s="unknown">Not yet published</Tag><span>It appears here, with captions and a transcript, once its rights for the website are confirmed.</span></p></div>
  </article>
);

/** The Collabora-SING film's own evidence words. They are that plan's labels, not this site's six (EVIDENCE above), and here a label
 *  says what kind of evidence a value WILL be: it never says that the value exists. Drawn dashed for that reason (site.css, .plan). */
export type PlanLabel = 'measured' | 'estimated' | 'observed' | 'subjective' | 'not-yet';
const PLAN_LABEL: Record<PlanLabel, string> = { measured: 'Measured', estimated: 'Estimated', observed: 'Observed', subjective: 'Subjective', 'not-yet': 'Not yet measured' };
export const PlanTag = ({ l }: { l: PlanLabel }) => <span className={`tag tag--${l}`}><i aria-hidden="true" />{PLAN_LABEL[l]}</span>;
/** A table of a plan: what it will look at, and the label each will carry. `state` says, in the header, that nothing has a value yet. */
export const PlanRecord = ({ id, title, state, cols, rows, foot }: { id: string; title: string; state: string; cols: [string, string]; rows: { name: string; labels: PlanLabel[] }[]; foot?: string }) => (
  <figure className="record plan" data-plan={id}>
    <figcaption className="record__top" id={`plan-${id}`}><span className="record__id">{title}</span><span className="record__syn">{state}</span></figcaption>
    <table className="plan__table" aria-labelledby={`plan-${id}`}>
      <thead><tr><th scope="col">{cols[0]}</th><th scope="col">{cols[1]}</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.name}><th scope="row">{r.name}</th><td><span className="plan__tags">{r.labels.map((l) => <PlanTag key={l} l={l} />)}</span></td></tr>)}</tbody>
    </table>
    {foot ? <p className="plan__foot">{foot}</p> : null}
  </figure>
);

/** FounderPortrait: the one place the founder's photograph is rendered (the home page's founder section and the founder page).
 *  It is the photograph he supplied on 2026-11-10 (1440 × 1440) and chose to keep, shown whole. The original is kept untouched at
 *  apps/website/media-src/founder/founder-original.webp; the three sizes served here are made from it by
 *  apps/website/scripts/portrait.mjs with a restrained, whole-picture grade (settings and hashes: docs/media/FOUNDER_PORTRAIT.json).
 *  Responsive sources, the intrinsic size (so the page does not shift while it loads) and an alternative text that names him and his
 *  role and describes nothing else. It has no animation of its own. */
const PORTRAIT_SIZES = '(max-width: 720px) 300px, (max-width: 1100px) 340px, 480px';
const portraitSet = (ext: 'webp' | 'jpg') => [320, 640, 960].map((w) => `/media/founder/${w}.${ext} ${w}w`).join(', ');
export const FounderPortrait = ({ size }: { size: 'lg' | 'sm' }) => (
  <picture className={`portrait portrait--${size}`} data-founder-portrait>
    <source type="image/webp" srcSet={portraitSet('webp')} sizes={PORTRAIT_SIZES} />
    <img src="/media/founder/640.jpg" srcSet={portraitSet('jpg')} sizes={PORTRAIT_SIZES} width={960} height={960} loading={size === 'lg' ? 'eager' : 'lazy'} decoding="async" alt="Jeremiah Johnson, founder of Empathia Technologies" />
  </picture>
);
export const CREDENTIALS = [{ abbr: 'CTS', full: 'Certified Technology Specialist', by: 'AVIXA' }, { abbr: 'CAPM', full: 'Certified Associate in Project Management', by: 'PMI' }, { abbr: 'Network+', full: 'CompTIA Network+', by: 'CompTIA' }];
export const Credentials = () => <ul className="creds" aria-label="Credentials">{CREDENTIALS.map((c) => <li key={c.abbr}><abbr title={c.full}>{c.abbr}</abbr><span>{c.by}</span></li>)}</ul>;
import { FOUNDER_BIO, FOUNDING_STORY, FOUNDING_STORY_CLOSE } from './founder.js';
export { FOUNDER_BIO, FOUNDING_STORY, FOUNDING_STORY_CLOSE };
export const FOUNDER_QUOTE = 'Empathia grew from a simple conviction: the technology behind a workplace should be understandable, accountable and provable. We’re connecting design, people, systems, service, and learning into one evidence-backed lifecycle.';

/** The nine product colours as one strip: the website's hero signature in both themes, above the hero's glow (V2.5.3 atmosphere). */
export const Spectrum = () => <div className="spectrum" aria-hidden="true">{CANON.map((p) => <i key={p.id} data-p={p.id} />)}</div>;

export interface Capture { w: number; h: number; route: string }
/** A dark capture of the investor demonstration (D43), with its provenance stated. */
export const Shot = ({ p, cap, eager, file, alt, cta }: { p: Product; cap?: Capture; eager?: boolean; file?: string; alt?: string; cta?: { href: string; label: string } }) => { const f = file || p.id; return cap ? (
  <figure className="shot" data-p={p.id}>
    <div className="shot__frame">
      <img src={`/media/product/${f}-1280.webp`} srcSet={`/media/product/${f}-640.webp 640w, /media/product/${f}-1280.webp 1280w`} sizes="(max-width: 1100px) 92vw, 620px" width={cap.w} height={cap.h} loading={eager ? 'eager' : 'lazy'} decoding="async" alt={alt || p.shotAlt || `${p.name} in the investor demonstration: ${p.purpose.charAt(0).toLowerCase() + p.purpose.slice(1)}.`} />
    <span className="shot__badge" aria-hidden="true">Synthetic demonstration data</span>{cta ? <a className="shot__cta btn btn--primary" href={cta.href}>{cta.label}<span aria-hidden="true"> →</span></a> : null}
    </div>
    <figcaption><b>Synthetic demonstration data</b><span>Captured from the investor demonstration</span></figcaption>
  </figure>
) : null; };

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
    <FounderPortrait size={page === 'founder' ? 'lg' : 'sm'} />
    <div className="founder__text">
      <p className="label">{page === 'founder' ? 'Founder' : 'The founder'}</p>
      {page === 'founder' ? <h1 className="founder__name">Jeremiah Johnson</h1> : <h2 className="founder__name">Jeremiah Johnson</h2>}
      <p className="founder__role">Founder, Empathia Technologies</p>
      {page === 'founder' ? <p className="founder__bio" data-founder-bio>{FOUNDER_BIO}</p> : null}
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
/** The founding story, in the founder's own words (2026-11-01 05:46 CT); its closing line stands alone with generous space, as he asked. */
export const FoundingStory = () => (
  <section className="section story" aria-labelledby="story-title" data-founding-story><div className="wrap story__wrap">
    <h2 id="story-title">The Missing Piece</h2>
    {FOUNDING_STORY.map((t, i) => <p key={i}>{t}</p>)}
    <p className="story__close">{FOUNDING_STORY_CLOSE}</p>
  </div></section>
);

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

/** shot: another capture than the product's own (the room record), with its own description */
export interface ChapterItem { p: Product; title: string; body: string; points: string[]; also?: Product; shot?: { file: string; alt: string } }
/** The home page's story: each stage of the lifecycle told with the product's own screen (a dark capture, D43), in lifecycle order. */
export const Chapters = ({ items, captures }: { items: ChapterItem[]; captures: Record<string, Capture> }) => (
  <ol className="chapters">{items.map((c, i) => (
    <li key={c.p.id} className="chapter" data-p={c.p.id}>
      <div className="chapter__media"><span className="chapter__glow" aria-hidden="true" /><Shot p={c.p} cap={captures[c.shot && captures[c.shot.file] ? c.shot.file : c.p.id]} file={c.shot && captures[c.shot.file] ? c.shot.file : undefined} alt={c.shot && captures[c.shot.file] ? c.shot.alt : undefined} /></div>
      <div className="chapter__text">
        <p className="chapter__n"><span className="dot" aria-hidden="true" />{String(i + 1).padStart(2, '0')} · {c.p.name}{c.also ? ` and ${c.also.name}` : ''}</p>
        <h3>{c.title}</h3><p>{c.body}</p>
        <ul className="ticks">{c.points.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="chapter__go"><a href={`/products/${c.p.slug}`}>{c.p.name}<span className="sr">: the product page</span><span aria-hidden="true"> →</span></a>{c.also ? <a href={`/products/${c.also.slug}`} data-p={c.also.id}>{c.also.name}<span className="sr">: the product page</span><span aria-hidden="true"> →</span></a> : null}</p>
      </div>
    </li>
  ))}</ol>
);

/** One drawn line icon per product (24 px grid, currentColor): the glass rail's signifier; the name beside it carries the meaning. */
const PRODUCT_ICON: Record<string, string> = {
  'mission-control': 'M12 3a9 9 0 1 0 9 9M12 7.5a4.5 4.5 0 1 0 4.5 4.5M12 12l6.5-6.5', lite: 'M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10',
  pro: 'M4 20V11M10 20V5M16 20v-6M21 20H3', 'search-party': 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM21 21l-5.2-5.2M8 10.5h5M10.5 8v5',
  servicehands: ICONS.service!, commissioning: ICONS.evidence!, apex: 'M3 20 12 4l9 16zM7.5 15h3l1.2-2.4 2.1 4.2 1.2-1.8h1.5',
  field: 'M4 13a8 8 0 0 1 16 0M7.5 13a4.5 4.5 0 0 1 9 0M12 13v7M9 20h6', learn: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
};
const Glyph = ({ d }: { d: string }) => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

/** The nine products as glass tiles under the home hero (the concept's product row, in the canonical order D37/D40), each tinted by its
 *  own colour. Navigation, not imagery: the image-led tiles further down carry the captures. */
export const GlassRail = () => (
  <ul className="glass" aria-label="The nine products, in lifecycle order">{PRODUCTS.map((p) => (
    <li key={p.id} className="glass__tile" data-p={p.id}>
      <span className="glass__ico"><Glyph d={PRODUCT_ICON[p.id] || ICONS.model!} /></span>
      <span className="glass__txt"><a href={`/products/${p.slug}`}>{p.name}</a><small>{p.purpose}</small></span>
      <span className="glass__go" aria-hidden="true">→</span>
    </li>
  ))}</ul>
);

/** A labelled strip of glass chips (the concept's industries / workflow / architecture rows): a title block, then the chips. With
 *  `flow`, the chips are steps joined by arrows and read as an ordered list. */
export interface StripItem { title: string; sub: string; icon: string; href?: string; p?: string }
export const Strip = ({ id, eyebrow, title, items, flow, foot }: { id: string; eyebrow: string; title: string; items: StripItem[]; flow?: boolean; foot?: React.ReactNode }) => {
  const L = flow ? 'ol' : 'ul';
  return (
    <section className="strip" aria-labelledby={`${id}-h`} data-strip={id}><div className="wrap"><div className="strip__panel">
      <div className="strip__head"><p className="eyebrow">{eyebrow}</p><h2 id={`${id}-h`}>{title}</h2></div>
      <L className={`strip__items${flow ? ' strip__items--flow' : ''}`}>{items.map((it) => (
        <li key={it.title} className="strip__item" data-p={it.p}>
          <span className="strip__ico"><Glyph d={PRODUCT_ICON[it.icon] || ICONS[it.icon] || STRIP_ICON[it.icon] || ICONS.model!} /></span>
          <span className="strip__txt">{it.href ? <a href={it.href}>{it.title}</a> : <b>{it.title}</b>}<small>{it.sub}</small></span>
        </li>
      ))}</L>
      {foot ? <div className="strip__foot">{foot}</div> : null}
    </div></div></section>
  );
};
const STRIP_ICON: Record<string, string> = {
  health: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', civic: 'M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M2 10l10-6 10 6z', venue: 'M3 4h18v11H3zM7 20h10M12 15v5',
  mixed: 'M3 21V8h7v13M10 21V3h11v18M2 21h20M6 12h1M6 16h1M14 7h3M14 11h3M14 15h3', school: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5',
  label: 'M3 12V4h8l10 10-8 8zM7.5 8h.01', flask: 'M9 3h6M10 3v6L4 20h16l-6-11V3',
};

/** The closing call to action with a drawn illustration (never stock imagery): one room in line work, its devices as nodes, each node
 *  wearing an evidence colour, the way the product labels them. Decorative; the heading and the buttons carry the meaning. */
export const RoomDrawing = () => (
  <svg className="drawing" viewBox="0 0 420 320" aria-hidden="true" focusable="false">
    <g className="drawing__room"><path d="M30 215 210 125l180 90-180 90z" /><path d="M30 215V105L210 15l180 90v110M210 125V15" /></g>
    <g className="drawing__wall"><path d="M75 170v-58l90-45v58z" /><path d="M90 150l60-30M90 136l60-30" /><path d="M262 82l76 38v40l-76-38z" /></g>
    <g className="drawing__table"><path d="M150 215l60-30 60 30-60 30z" /><path d="M150 215v8l60 30 60-30v-8M210 245v8" /></g>
    <g className="drawing__links"><path d="M210 212 120 80M210 212 120 118M210 212 150 242M210 212 270 242M210 212 300 112" /></g>
    <g className="drawing__nodes">
      <circle cx="120" cy="80" r="9" data-s="verified" /><circle cx="120" cy="118" r="8" data-s="observed" /><circle cx="210" cy="212" r="11" data-s="verified" />
      <circle cx="150" cy="242" r="8" data-s="modeled" /><circle cx="270" cy="242" r="8" data-s="declared" /><circle cx="300" cy="112" r="8" data-s="unknown" />
    </g>
  </svg>
);

/** The thirty demonstration rooms as thirty cells, one per room, marked by how each was made; the approved wording stays beside it. */
export const RoomMix = ({ mix }: { mix: { n: number; label: string; k: string }[] }) => (
  <div className="mix">
    <ul className="mix__cells" aria-hidden="true">{mix.flatMap((m) => Array.from({ length: m.n }, (_, i) => <li key={m.k + i} data-k={m.k} />))}</ul>
    <ul className="mix__key">{mix.map((m) => <li key={m.k} data-k={m.k}><i aria-hidden="true" /><b>{m.n}</b><span>{m.label}</span></li>)}</ul>
  </div>
);
