// The founder page (2026-11-11): the Search Party founding story told in full, and the ten-second introduction around his photograph.
//
// Whose words are whose. The founder's own words live in ./founder.ts and are rendered here exactly as they stand: never edited,
// trimmed, reordered or paraphrased, and "My Cinderella shoe." stays the last line of his block, alone (tests/browser/website.test.mjs
// compares the rendered text with the constants). Everything else in this file is the company describing its product in plain
// language. It names no employer, manager, customer or site, claims no endorsement, and gives no date or number he did not give.
//
// The photograph. FounderReveal draws a charcoal plate AROUND the founder's own photograph (FounderPortrait, unchanged: the same
// file, whole, never cropped, scaled, distorted or replaced). Every other layer is light, dust and line work above or beside it,
// decorative and hidden from assistive technology. Its resting composition is what the markup and the stylesheet draw with no
// script at all; the motion is added by src/reveal.ts (dist/founder.js) and described in docs/media/FOUNDER_REVEAL_QA.md.
import React from 'react';
import { FOUNDING_STORY, FOUNDING_STORY_CLOSE } from './founder.js';
import { FORTUNE_LINE, FOUNDER_QUOTE, FORTUNE_PHOTO } from './founderQuote.js';
import { FounderPortrait, Shot, Actions, type Capture } from './ui.js';
import type { Product } from './products.js';

/** The product's own four words, in the order the company says them. One record: the plate's motif, the diagram of what a list
 *  could not hold, and the tests all read it. `asks` is the question a contacts list has no column for. */
export const LAYERS = [
  { id: 'people', name: 'People', asks: 'Which person answers for which room?' },
  { id: 'process', name: 'Process', asks: 'Which process hands work from one person to the next?' },
  { id: 'technology', name: 'Technology', asks: 'Which system serves the room?' },
  { id: 'communication', name: 'Communication', asks: 'Who covers when that person is away?' },
] as const;
/** Empathia's approach, as the company's own statement (directive §30); not a quotation of the founder. */
export const APPROACH = ['Start with a real operational problem.', 'Understand the relationships around it.', 'Build a system that improves the entire workflow.'] as const;
/** What a contacts list does hold: its three columns. */
export const LIST_COLUMNS = ['Name', 'Role', 'Number'] as const;

// ---- the plate's geometry, in the units of its 400 × 500 drawing (the photograph is the 360 square at 20,20) ----
const ORIGIN = { x: 200, y: 384 }; const NODE_Y = 440;
/** one line from the photograph's lower edge to each word: where it ends, how long it is, and its angle */
export const FAN = LAYERS.map((l, i) => { const x = 62 + i * 92; const dx = x - ORIGIN.x; const dy = NODE_Y - ORIGIN.y; return { ...l, x, len: +Math.hypot(dx, dy).toFixed(2), deg: +(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2) }; });
// dust: fixed positions from a fixed seed, so every build and every visitor gets the same picture
const dust = (n: number, seed: number) => { let s = seed; const r = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; return Array.from({ length: n }, () => ({ x: +(14 + r() * 372).toFixed(1), y: +(30 + r() * 440).toFixed(1), r: +(0.5 + r() * 1.1).toFixed(2), o: +(0.35 + r() * 0.6).toFixed(2) })); };
const FAR = dust(18, 20261111); const NEAR = dust(10, 7);

/** The founder's photograph on its plate, with the introduction's layers and its two controls. The controls are in the markup but
 *  hidden: the script shows them only when there is motion to control (never with JavaScript off, never under reduced motion). */
export const FounderReveal = () => (
  <div className="reveal" data-reveal>
    <div className="reveal__plate">
      <span className="reveal__aurora" aria-hidden="true" /><span className="reveal__glow" aria-hidden="true" />
      <div className="reveal__photo"><FounderPortrait size="lg" /><span className="reveal__shade" aria-hidden="true"><i /></span></div>
      <svg className="reveal__fx" viewBox="0 0 400 500" aria-hidden="true" focusable="false">
        <defs><linearGradient id="rv-comet-tail" x1="0" x2="1"><stop offset="0" stopColor="#a78bfa" stopOpacity="0" /><stop offset=".6" stopColor="#2dd4bf" stopOpacity=".7" /><stop offset="1" stopColor="#ffffff" /></linearGradient></defs>
        <g className="rv-comet"><line x1="-46" y1="52" x2="0" y2="40" /><circle cx="0" cy="40" r="2.2" /></g>
        <g className="rv-dust rv-dust--far">{FAR.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} opacity={d.o} />)}</g>
        <g className="rv-dust rv-dust--near">{NEAR.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={+(d.r * 1.5).toFixed(2)} opacity={d.o} />)}</g>
        <g className="rv-links">{FAN.map((f, i) => (
          <g key={f.id} transform={`translate(${ORIGIN.x} ${ORIGIN.y}) rotate(${f.deg})`}>
            <line className={`rv-line rv-line--halo rv-d${i + 1}`} x1="0" y1="0" x2={f.len} y2="0" /><line className={`rv-line rv-d${i + 1}`} x1="0" y1="0" x2={f.len} y2="0" />
            <circle className={`rv-spark rv-spark--${i === 0 || i === FAN.length - 1 ? 'long' : 'short'} rv-d${i + 1}`} r="2.4" />
            <circle className={`rv-echo rv-echo--${i === 0 || i === FAN.length - 1 ? 'long' : 'short'}`} r="2.2" />
          </g>
        ))}</g>
        <g transform={`translate(${ORIGIN.x} ${ORIGIN.y})`}><g className="rv-origin"><circle r="7" className="rv-ring" /><circle r="2.6" className="rv-core" /></g></g>
        {FAN.map((f, i) => <g key={f.id} transform={`translate(${f.x} ${NODE_Y})`}><g className={`rv-node rv-n${i + 1}`} data-layer={f.id}><circle r="6" className="rv-ping" /><circle r="6" className="rv-ring" /><circle r="2.2" className="rv-core" /><text y="27" textAnchor="middle">{f.name}</text></g></g>)}
      </svg>
      <span className="reveal__sheen" aria-hidden="true" />
    </div>
    <p className="sr">Under the photograph, four words joined to it by lines: {LAYERS.map((l) => l.name).join(', ')}.</p>
    <div className="reveal__bar"><div className="reveal__ctl" role="group" aria-label="The introduction’s motion" data-reveal-ctl hidden>
      {/* Replay first: it is the one that stays, so it must not move when Pause is withdrawn at the end (no layout shift) */}
      <button type="button" className="btn btn--quiet" data-reveal-replay>Replay<span className="sr"> the introduction</span></button>
      <button type="button" className="btn btn--quiet" data-reveal-toggle><span data-reveal-word>Pause</span><span className="sr"> the introduction</span></button>
    </div></div>
  </div>
);

/** The founder's own words, exactly as he wrote them (./founder.ts): the heading, his five paragraphs in his order, then his closing
 *  line alone. Nothing else may be put inside this element. */
export const FoundersWords = () => (
  <div className="origin__words" data-founding-story>
    <h3 id="story-title">The Missing Piece</h3>
    {FOUNDING_STORY.map((t, i) => <p key={i}>{t}</p>)}
    <p className="story__close">{FOUNDING_STORY_CLOSE}</p>
  </div>
);

const Part = ({ n, id, children }: { n: number; id: string; children: React.ReactNode }) => (
  <div className={`origin__part origin__part--${id}`} data-origin-part={id}><p className="origin__n" aria-hidden="true">{String(n).padStart(2, '0')}</p><div className="origin__body">{children}</div></div>
);

/** How Search Party came to be: the request, what a list could not hold, his realisation in his own words, what it became, and the
 *  approach it set. `sp` is the Search Party product record (./products.ts): what it became is described from that record only. */
export const SearchPartyStory = ({ sp, cap, demoHref }: { sp: Product; cap?: Capture; demoHref: string }) => (
  <section className="section origin" id="search-party-story" aria-labelledby="origin-h" data-origin><div className="wrap">
    <div className="section__head"><p className="eyebrow">The founding story</p><h2 id="origin-h">How Search Party came to be</h2>
      <p className="section__lead">Search Party is the relationship layer of the Living Campus. It began with an ordinary request, and with what that request left out.</p></div>
    <div className="origin__parts">
      <Part n={1} id="request"><h3>The request</h3>
        <p>It began as a plain infrastructure task: a contacts list of who to call for which room, site and system. In the founder’s words, it was “a simple contacts-list request”.</p></Part>
      <Part n={2} id="list"><h3>What the list could not hold</h3>
        <p>A list holds a name, a role and a number. It has no column for how they relate.</p>
        <figure className="holds" data-holds>
          <div className="holds__list"><b>A contacts list</b>
            <div className="holds__cols">{LIST_COLUMNS.map((c) => <span key={c}>{c}</span>)}</div>
            {[0, 1, 2, 3].map((r) => <div key={r} className="holds__row" aria-hidden="true">{LIST_COLUMNS.map((c) => <i key={c} />)}</div>)}
          </div>
          <ol className="holds__links" aria-label="What a contacts list has no column for">{LAYERS.map((l) => <li key={l.id} data-layer={l.id}><b>{l.name}</b><span>{l.asks}</span></li>)}</ol>
          <figcaption>A drawing of the idea, in the four words the product is built on. It is not the record of any organisation.</figcaption>
        </figure></Part>
      <Part n={3} id="words"><p className="eyebrow">In the founder’s own words</p><FoundersWords /></Part>
      <Part n={4} id="became"><div className="origin__became">
        <div><h3>What it became</h3>
          <p>Search Party is now one of Empathia’s products: the relationship layer of the Living Campus. {sp.body}</p>
          <ul className="ticks"><li>Find a room, a device, a person or an issue.</li><li>See how they are connected, and where each connection came from.</li><li>Work from the same record every other product reads.</li></ul>
          <p className="origin__honest" data-origin-synthetic>The demonstration runs on synthetic data: every person, room and device in it is invented. {sp.limits}</p>
          <Actions><a className="btn btn--primary" href={`/products/${sp.slug}`}>Search Party, the product</a>{sp.demo ? <a className="btn" href={demoHref}>Open Search Party in the demonstration</a> : null}</Actions></div>
        <Shot p={sp} cap={cap} />
      </div></Part>
      <Part n={5} id="approach"><h3>The approach it set</h3>
        <p>Search Party shows how Empathia approaches a product.</p>
        <ol className="approach" data-approach>{APPROACH.map((t, i) => <li key={t}><span aria-hidden="true">{i + 1}</span>{t}</li>)}</ol></Part>
    </div>
  </div></section>
);

/** The short version, on the Search Party product page: two sentences and the way to the full story. */
export const SearchPartyOrigin = () => (
  <section className="section" id="origin" aria-labelledby="sp-origin-h" data-sp-origin><div className="wrap"><div className="origin-note">
    <p className="eyebrow">Where it came from</p><h2 id="sp-origin-h">It began with a contacts list</h2>
    <p>Search Party began with what the founder calls “a simple contacts-list request”, and with what a list cannot hold: how people, processes and technology relate. He tells the story in his own words on the founder page.</p>
    <Actions><a className="btn" href="/founder#search-party-story">How Search Party came to be</a></Actions>
  </div></div></section>
);

/** Before the explanation (founder, 13 Nov 2026): his quotation, opened by the fortune-cookie line it grew from, with his photograph of
 *  the slip. It stands between the story of what he felt and built, and the thinking the company is built on: the feeling, then the
 *  explanation that caught up with it. The words are his (./founderQuote.ts), rendered whole; the slip is a keepsake, held at a slight
 *  angle like a note pinned to a board. Decorative light is hidden from assistive technology; nothing here moves under reduced motion. */
export const BeforeTheExplanation = () => (
  <section className="section quote" id="before-the-explanation" aria-labelledby="quote-h" data-founder-quote><div className="wrap"><div className="quote__grid">
    <figure className="quote__slip">
      <span className="quote__halo" aria-hidden="true" />
      <picture><source type="image/webp" srcSet={`${FORTUNE_PHOTO.src}-640.webp 640w, ${FORTUNE_PHOTO.src}-960.webp 960w`} sizes="(max-width: 860px) 92vw, 440px" />
        <img src={`${FORTUNE_PHOTO.src}-960.jpg`} srcSet={`${FORTUNE_PHOTO.src}-640.jpg 640w, ${FORTUNE_PHOTO.src}-960.jpg 960w`} sizes="(max-width: 860px) 92vw, 440px" width={FORTUNE_PHOTO.w} height={FORTUNE_PHOTO.h} alt={FORTUNE_PHOTO.alt} loading="lazy" decoding="async" /></picture>
      <figcaption>The slip, as the founder kept it.</figcaption>
    </figure>
    <blockquote className="quote__words" data-founder-quote-words>
      <p className="eyebrow" aria-hidden="true">In the founder’s own words</p>
      <h2 id="quote-h" className="quote__line">{FORTUNE_LINE}</h2>
      {FOUNDER_QUOTE.map((t, i) => <p key={i} className={i === FOUNDER_QUOTE.length - 1 ? 'quote__close' : undefined}>{t}</p>)}
      <footer>Jeremiah Johnson, founder</footer>
    </blockquote>
  </div></div></section>
);
