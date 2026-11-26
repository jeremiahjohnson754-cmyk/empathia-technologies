// The public Empathia Technologies site: every page's content. Nothing here may name a customer, a partner, a certification of the
// company, an award, revenue or a measured outcome; everything shown runs on synthetic data and says so. Claims are limited to what
// the repository demonstrates (docs/legacy-parity.md). The founder's credentials are exactly the three the founder supplied; the founder
// pages carry the founder's own words and portrait only, never an invented biography.
import { proofPage, LeadClaim } from './proof.js';
import React from 'react';
import { LeadForm, type LeadKind } from './form.js';
import { Hero, Section, Cards, Steps, Note, Actions, Tag, EVIDENCE, EvidenceLine, FilmPlayer, Spectrum, Shot, ExpShot, ProductTiles, EnquiryCard, EnquiryLink, FounderBlock, Stage, Counts, Scenes, Chapters, RoomMix, GlassRail, Strip, RoomDrawing, FilmPending, PlanRecord, type StripItem, type Evidence, type Film, type Cue, type Capture, type ChapterItem } from './ui.js';
import { PRODUCTS, DEMO_STATE, ROOMS_SENTENCE, ROOM_MIX, ROOM_TOTAL } from './products.js';
import { TALLY_FORM } from './enquiry.js';
import { commercialPages } from './commercial.js';
import { fieldlinkPage } from './fieldlink.js';
import { voicePage } from './voice.js';
import { intakePage } from './intake.js';
import { Follow } from './follow.js';
import { Opening, type HeroFrame } from './opening.js';
import { MODULE_LAUNCHES, PRODUCT_LAUNCHES, START_LAUNCH, launchHref } from '../../../packages/ui/src/launches.ts';
import { FAMILIES } from '../../../packages/ui/src/families.ts';
import { FamilyGrid, FamilyQuestions, Plate, SharedIntelligence, Thread, familyPages, POSITIONING } from './platform.tsx';
import { DEFAULT_STATE, stateHash, type AddonSku } from './build-view.js';
/** each product page's way into Build Your Empathia (founder 19:39: lead generation off the interactive sales part), its own line ticked */
const PRICE_ADD: Record<string, AddonSku[]> = { commissioning: ['COMMISSION', 'ASSURANCE'], servicehands: ['SERVICE'], field: ['FIELD-CORE'], apex: ['APEX'] };
const priceHref = (id: string) => `/pricing${PRICE_ADD[id] ? stateHash({ ...DEFAULT_STATE, addons: PRICE_ADD[id]! }) : '#build'}`;
import { FounderReveal, SearchPartyStory, SearchPartyOrigin, BeforeTheExplanation } from './founderStory.js';   // the founder page's plate and the Search Party founding story   // v18/pilot: /pricing and /pilots

export interface Page { path: string; title: string; description: string; nav?: string; body: React.ReactNode; /** a page's own script in dist (e.g. 'pilot.js'), loaded after site.js on that page only */ script?: string; /** a small script of the page's own loaded in <head>, before first paint (the founder page's introduction must start from its opening frame) */ headScript?: string; }
export interface SiteContext { asOf?: string; films: Film[]; pendingFilms?: Pick<Film, 'key' | 'title' | 'runtime' | 'summary' | 'disclosure'>[]; transcripts: Record<string, string[]>; /** a silent film's description, cue by cue (build.mjs reads its descriptions.vtt) */ cues?: Record<string, Cue[]>; demoUrl: string; preview: boolean; captures: Record<string, Capture>; api?: boolean; /** short silent scenes cleared for the website (broll.json) */ broll?: { key: string; title: string }[]; /** the home page's opening frames (media/hero/PROVENANCE.json) */ hero?: HeroFrame[];
  /** the guides as printed booklets (media/booklets/BOOKLETS.json, made by scripts/media/make-booklets.mjs) */ booklets?: Booklet[] }
export interface Booklet { file: string; title: string; bytes: number; pages: number; cover: string; sha256: string; blurb: string }

const AUDIENCES = [
  { title: 'CIOs and CTOs', body: 'One accountable record for the technology estate: what was approved, funded, installed, proved and accepted.', href: '/solutions#enterprise', icon: 'exec' },
  { title: 'AV systems integrators', body: 'Design, commissioning and handoff with the evidence the customer will ask for, generated as the work is done.', href: '/solutions#integrators', icon: 'integrator' },
  { title: 'Managed service providers', body: 'Coverage, dispatch and verified repair against a baseline the customer accepted.', href: '/solutions#msp', icon: 'service' },
  { title: 'Facilities and workplace teams', body: 'Room readiness, service coverage and who to call, without the engineering detail they do not need.', href: '/solutions#facilities', icon: 'facility' },
];
const PRINCIPLES = [
  { title: 'Say what the evidence supports', body: 'Every state in the product has a guard, an actor and an event behind it, and the product labels what is declared, modeled, measured or verified.', icon: 'evidence' },
  { title: 'Authority is explicit', body: 'No one approves their own work; no simulated result becomes an engineering fact; no suggestion becomes an action by itself.', icon: 'key' },
  { title: 'Preserve the history', body: 'Evidence is append-only, room designs are revisioned, decisions keep their rationale, and an accepted baseline is never overwritten.', icon: 'history' },
];
const Campus = () => (
  <div className="campus" data-rooms><p className="campus__n">{ROOM_TOTAL}<small>demonstration rooms</small></p>
    <div className="campus__text"><p>The demonstration campus has {ROOM_TOTAL} rooms: {ROOMS_SENTENCE}</p><RoomMix mix={ROOM_MIX} /></div></div>
);
const byId = (id: string) => PRODUCTS.find((p) => p.id === id)!;
/** The estates whose rooms the demonstration models (the concept's industries strip). No customer is named and no deployment is claimed. */
const ESTATES: StripItem[] = [
  { title: 'Corporate campuses', sub: 'Boardrooms, huddles, town halls', icon: 'facility' },
  { title: 'Higher education', sub: 'Lecture halls, active learning', icon: 'school' },
  { title: 'Healthcare', sub: 'Conference and training rooms', icon: 'health' },
  { title: 'Public sector', sub: 'Chambers and briefing rooms', icon: 'civic' },
  { title: 'Venues and events', sub: 'Divisible halls, auditoriums', icon: 'venue' },
  { title: 'Mixed-use estates', sub: 'Rooms shared across tenants', icon: 'mixed' },
];
/** The workflow strip: five moves of one record, each the product that makes it. */
/** What the products do along the lifecycle's stations (ui.tsx › LIFECYCLE): five moves, each naming the stations it belongs to, so the
 *  two never read as two different lifecycles (25 Nov 2026, directive §8.3). */
const FLOW: StripItem[] = [
  { title: 'Design', sub: 'Intake and Design · Lite draws the room and its coverage', icon: 'lite', p: 'lite', href: '/products/lite' },
  { title: 'Prove', sub: 'Commissioning and Acceptance · tests, then a reviewer verifies', icon: 'commissioning', p: 'commissioning', href: '/products/commissioning' },
  { title: 'Operate', sub: 'Service · Mission Control reads it against the baseline', icon: 'mission-control', p: 'mission-control', href: '/products/mission-control' },
  { title: 'Repair', sub: 'Service · ServiceHands closes on a verified retest', icon: 'servicehands', p: 'servicehands', href: '/products/servicehands' },
  { title: 'Learn', sub: 'In operation · APEX explains, Learn teaches', icon: 'learn', p: 'learn', href: '/products/learn' },
];
/** The architecture strip: only what the repository enforces and tests (the trust page says what is not claimed). */
const ARCH: StripItem[] = [
  { title: 'Deny by default', sub: 'The server and the database decide every read', icon: 'key' },
  { title: 'Append-only evidence', sub: 'Never edited, never overwritten', icon: 'history' },
  { title: 'Typed contracts', sub: 'OpenAPI and JSON Schemas, generated', icon: 'code' },
  { title: 'Every value labeled', sub: 'Six evidence words, kept apart', icon: 'label' },
  { title: 'Synthetic in public', sub: 'Nothing connected, nothing live', icon: 'flask' },
];
const archFoot = <p><a href="/trust">What is in place, and what we do not claim<span aria-hidden="true"> →</span></a></p>;
const estatesFoot = <p>The demonstration’s rooms are modeled on these estates. No customer is named and no deployment in any of them is claimed.</p>;
const CtaBand = ({ title, body, children }: { title: string; body: string; children: React.ReactNode }) => (
  <section className="band band--drawn"><div className="wrap"><div className="band__copy"><h2>{title}</h2><p>{body}</p>{children}</div><RoomDrawing /></div></section>
);
/** The three other worlds on the home page (founder, 19 Nov 2026 09:09 G: "a small screenshot section on the corporate home page"):
 *  each the frame captured from the demonstration's own 3D world, opening that world; wording kept to the Experiences page. */
const WORLDS3 = [
  { file: 'exp-stadium', world: 'Stadium', name: 'Stadium LIVE', line: 'Run the bowl under the lights from the LIVE console.', route: '#/play/stadium' },
  { file: 'exp-campus', world: 'University', name: 'Campus Life', line: 'Walk the Quad and fix a lecture theater’s circuit bench.', route: '#/play/campus' },
  { file: 'exp-expo', world: 'Convention', name: 'Expo LIVE', line: 'Fly to a booth, join a session, answer its poll.', route: '#/play/expo' },
] as const;
/** The nine worlds of the Experiences page (founder: Enterprise, Stadium, University, Convention, Festival, Community, Collabora-SING,
 *  Shelter, E-Waste). `walk`: in the demonstration today; `dev`: in development with its own page; `plan`: planned, not built. The lines
 *  for the planned worlds say only their purpose, from the founder's directives, with no real place, brand or organization named. */
const NINE: Array<{ key: string; name: string; state: 'walk' | 'dev' | 'plan'; line: string; href?: string; cta?: string }> = [
  { key: 'enterprise', name: 'Enterprise', state: 'walk', line: 'Northstar Innovation Campus: a workplace estate of rooms, devices and the evidence behind them. The Living Campus.', href: '#/investor', cta: 'Open the Living Campus' },
  { key: 'stadium', name: 'Stadium', state: 'walk', line: 'Harborlight Stadium: a match day you operate from the LIVE console, from the seat to the broadcast gallery.', href: '#/play/stadium', cta: 'Open Stadium LIVE' },
  { key: 'university', name: 'University', state: 'walk', line: 'Kestrel Valley University: a campus day you play, and a lecture theater’s circuit bench to fix before class.', href: '#/play/campus', cta: 'Play Campus Life' },
  { key: 'convention', name: 'Convention', state: 'walk', line: 'Larkspur Exchange Convention Center: a technology expo, from the hall floor to the keynote.', href: '#/play/expo', cta: 'Walk the Expo hall' },
  { key: 'festival', name: 'Festival', state: 'plan', line: 'A multi-day music festival in a city park: attendees, artists, vendors, production crews and engineers on one record.' },
  { key: 'community', name: 'Community', state: 'plan', line: 'A large church, a multi-campus ministry and the community programs around it, coordinated on one record.' },
  { key: 'collabora-sing', name: 'Collabora-SING', state: 'dev', line: 'A research plan for musicians playing across a network: what if the performance were sent, not only the sound? The pilot has not been run.', href: '/collabora-sing', cta: 'Read about Collabora-SING' },
  { key: 'shelter', name: 'Shelter', state: 'plan', line: 'Citywide coordination of shelter resources between nonprofits, outreach teams and public agencies, designed so that no sensitive location is ever shown.' },
  { key: 'e-waste', name: 'E-Waste', state: 'plan', line: 'A living electronics-recycling facility, with SIGNAL: The Second Life for the people who work in it.' },
];
/** The home page's story, in lifecycle order, each chapter told with that product's own screen. Wording kept to what the
 *  demonstration shows (products.ts), so a chapter never claims more than its product page. */
const STORY: ChapterItem[] = [
  { p: byId('lite'), stations: 'Intake and Design', title: 'Design the room before anything is bought', body: 'Lite draws the room from an archetype and its dimensions and places every seat, display, camera and microphone. Predicted coverage is labeled modeled, and Scouter, inside Lite, proposes equipment from comparable rooms for the engineer to decide.', points: ['Every dimension says where it came from', 'Coverage predicted, with the assumptions stated', 'Scouter proposals reviewed before anything is adopted'], outcome: 'fewer surprises at installation, because the room is checked before anything is bought.' },
  { p: byId('commissioning'), stations: 'Commissioning and Acceptance', outcome: 'fewer incomplete handoffs, and a baseline every later change can be compared with.', title: 'Prove it, then accept it', body: 'An adaptive plan states why each test applies and why others do not. A failed test opens a deficiency, someone other than the engineer verifies, and acceptance makes the room’s baseline.', points: ['The reason for every test', 'An approval that names every unresolved item', 'Retest, independent verification, acceptance'], shot: { file: 'room', alt: 'The room record of Atlas 4.218 in the product demonstration: its health, devices, open issues and lifecycle stage, each computed from the room’s records.' } },
  { p: byId('servicehands'), also: byId('mission-control'), stations: 'Service', outcome: 'repairs that stay fixed, because a job closes only when a retest is verified.', title: 'Run it against what was accepted', body: 'Mission Control counts every room at every stage and says what changed. ServiceHands turns an issue into a work order that closes only with field evidence and a verified retest.', points: ['What changed, what matters, what needs action', 'Hard gates before dispatch', 'Closure on a verified retest, not on a checkbox'] },
  { p: byId('apex'), also: byId('learn'), stations: 'In operation', outcome: 'less time spent finding a cause, and people prepared by what actually happened.', title: 'Learn from what actually happened', body: 'APEX ranks the hypotheses that could explain a change, each with its evidence and the reason it is not yet proven. Learn turns reviewed cases into lessons, and training never grants authority.', points: ['Ranked hypotheses with cited evidence', 'A person decides; a suggestion never acts by itself', 'Reviewed, de-identified cases that teach'] },
];

export function buildPages(ctx: SiteContext): Page[] {
  const film = (key: string, lead?: boolean, transcriptAt?: string) => { const f = ctx.films.find((x) => x.key === key); return f ? <FilmPlayer film={f} transcript={ctx.transcripts[key] || []} cues={ctx.cues?.[key]} lead={lead} transcriptAt={transcriptAt} /> : null; };
  const demo = (href = '#/investor') => ctx.demoUrl + '/' + href;
  // #232: a product's own demonstration, as a typed launch (its perspective, and the way back to the page that opened it)
  const go = (id: string, back: string) => { const l = PRODUCT_LAUNCHES[id]; return l ? launchHref(ctx.demoUrl, l, back) : demo(); };
  // /films lists the films of the Living Campus; a film marked `exclusive` (Collabora-SING's) belongs to its own section and is not listed there
  const indexFilms = ctx.films.filter((f) => !f.exclusive);
  const hasFilms = indexFilms.length > 0;
  const lead = (kind: LeadKind, source: Parameters<typeof EnquiryCard>[0]['source']) => ctx.api ? <LeadForm kind={kind} /> : <EnquiryCard source={source} primary />;
  const heroCounts = [{ n: PRODUCTS.length, label: 'products' }, { n: ROOM_TOTAL, label: 'rooms' }, { n: 1, label: 'record' }];
  const heroArt = <Stage p={byId('mission-control')} cap={ctx.captures['mission-control']} counts={heroCounts} />;
  // the home film (M2) takes the stage's place when it is cleared for the website; the counts stay, under it
  const heroFilm = film('M2', true);

  const home: Page = { path: '/', title: 'Empathia Technologies — every room, every device, every decision, with its evidence', description: 'Empathia Living Campus connects the request, design, commissioning, service and assurance of every room into one record of what actually happened, and labels what is declared, modeled, observed and verified.', nav: 'Home', body: (
    <>
      <section className="hero hero--home"><div className="wrap">
        <Spectrum />
        <div className="hero__grid">
          <div className="hero__copy">
            <p className="label">Empathia Technologies</p>
            {/* 25 Nov 2026 (commercial-readiness directive §8.1): the proposition leads; the founder's line stays as the brand line under it */}
            <h1 className="display display--prop">From infrastructure request to verified operational readiness.</h1>
            <p className="brandline" aria-label="Technology. Space. Intelligence. Experience. Connected."><span>Technology.</span> <span>Space.</span> <span>Intelligence.</span> <span>Experience.</span> <span>Connected.</span></p>
            <p className="lede">One connected platform to design, commission, operate and understand the spaces your organization runs on. Engineering, AV and UC operations, service, people and learning share one record: every room, every device, every decision, with its evidence.</p>
            <Actions><a className="btn btn--primary btn--lg" href={launchHref(ctx.demoUrl, START_LAUNCH, '/')}>Experience the platform</a>{heroFilm ? <a className="btn btn--lg" href="#film-M2">Watch the film</a> : <a className="btn btn--lg" href="/request-demo">Request a demonstration</a>}</Actions>
          </div>
          <div className="hero__aside">{ctx.hero?.length ? <><Opening frames={ctx.hero} /><Counts counts={heroCounts} under /></> : heroFilm ? <>{heroFilm}<Counts counts={heroCounts} under /></> : heroArt}</div>
        </div>
        <GlassRail />
      </div></section>
      <nav className="doors wrap" aria-label="More ways in"><a href="/platform">Explore Empathia</a><a href="/fieldlink">Discover FieldLink</a></nav>
      {ctx.hero?.length && heroFilm ? <section className="section section--film"><div className="wrap">{film('M2', true, '/films#film-M2')}</div></section> : null}
      {/* 25 Nov 2026: the lifecycle is told once on this page, as the product's eight stations; the four chapters are parts of it */}
      <Section id="lifecycle" eyebrow="The lifecycle" title="Eight stations, one record of every room" lead="From the first request to a room in operation, each station adds evidence to the same record. Four of them follow, each on the product’s own screen in the public demonstration, on synthetic data.">
        <EvidenceLine />
        <Chapters items={STORY} captures={ctx.captures} />
      </Section>
      {/* 24 Nov 2026 (founder, 23 Nov 19:22): the positioning leads the list of products: seventeen capabilities are six families of one
          platform. The home page's size budget (50 KB) leaves room for the compact picture (platform.tsx Plate); /platform tells it in full. */}
      <Section id="platform" eyebrow="The platform" title={POSITIONING.line} lead={POSITIONING.lead} tone="deep">
        <Plate home />
        <p className="fam6__core">The nine core products, in lifecycle order</p>
        <ProductTiles captures={ctx.captures} />
      </Section>
      {/* a buyer meets who it is for third, not tenth (20 Nov 2026, the four-perspective pass) */}
      <Section eyebrow="Who it is for" title="Read by every team that touches a room"><Cards cols={4} items={AUDIENCES} /></Section>
      {/* 25 Nov 2026 (directive §10): the market-entry position, a layer beside what an estate already runs; nothing claimed connected */}
      <Section id="alongside" eyebrow="Alongside what you run" title="Keep your monitoring. Add the record behind every room." lead="Empathia does not ask you to replace the room-monitoring or management tools you already use. It adds what they do not keep: the lifecycle of each room from the request to acceptance, the evidence of how it was commissioned, and the work that keeps it that way. Where a connector to one of your tools has been verified, Empathia reads from it; in the public demonstration nothing is connected." />
      <Section id="worlds" eyebrow="Experiences" title="The same Core, in venues you can walk" lead="In 3D, in the browser. Fictional venues, synthetic data, first versions.">
        <p className="rail-hint" aria-hidden="true">Swipe through the three worlds →</p>
        <ul className="worlds3">{WORLDS3.map((w) => { const cap = ctx.captures[w.file]; return (
          <li key={w.file} data-exp={w.file}><a className="world3" href={demo(w.route)}>{cap ? <img src={`/media/product/${w.file}-640.webp`} width={640} height={Math.round(640 * cap.h / cap.w)} loading="lazy" alt="" /> : null}<i>{w.world}</i><b>{w.name}</b><span>{w.line}</span></a></li>); })}</ul>
        <p className="world3__more"><a href="/experiences">All nine worlds, built, in development and planned →</a></p>
      </Section>
      <Section eyebrow="The demonstration campus" title={`${ROOM_TOTAL} rooms, each with its record`}><Campus /></Section>
      <Strip id="estates" eyebrow="Where it fits" title="Built for the rooms of every estate" items={ESTATES} foot={estatesFoot} />
      <Section eyebrow="Evidence" title="Six words the product will not blur" lead="Every value on every screen carries one of these labels. Most tools collapse them; Empathia keeps them apart so a decision can be traced to what was actually known." tone="deep">
        <dl className="states">{(Object.keys(EVIDENCE) as Evidence[]).map((s) => <div key={s} data-s={s}><dt><Tag s={s} /></dt><dd>{EVIDENCE[s].meaning}</dd></div>)}</dl>
      </Section>
      <Strip id="architecture" eyebrow="The architecture" title="Built to be checked" items={ARCH} foot={archFoot} />
      <Section eyebrow="Proof" title="Every claim is a record you can check" lead="Each thing we say about the product is a record with a state, the same on this site and in the demonstration. This one is read from the registry the demonstration reads."><LeadClaim asOf={ctx.asOf || new Date().toISOString()} demoUrl={ctx.demoUrl} /></Section>
      <section className="section section--deep"><div className="wrap"><FounderBlock page="home" /></div></section>
      <CtaBand title="See it on your own rooms." body="A guided walk through the scenarios on synthetic data, or a bounded pilot with your rooms and your people."><Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href="/pilot-partners">Pilots and partnerships</a></Actions></CtaBand>
      <div className="wrap"><Note>What you can see today is a demonstration on synthetic data. No customer, partner or device is named or connected, and every measurement shown is labeled modeled, simulated, declared, observed or verified.</Note></div>
    </>
  ) };

  const productPages: Page[] = PRODUCTS.map((p) => ({ path: `/products/${p.slug}`, title: `${p.name} — Empathia Technologies`, description: `${p.name}: ${p.purpose}. ${p.body.split('. ')[0]}.`, body: (
    <div data-p={p.id}>
      <section className="hero hero--product hero--split"><div className="hero__band" aria-hidden="true" /><div className="wrap hero__grid">
        <div className="hero__copy"><p className="label"><span className="dot" aria-hidden="true" />Product {String(PRODUCTS.indexOf(p) + 1).padStart(2, '0')} of 9</p><h1>{p.name}</h1><p className="hero__sub">{p.purpose}</p><p className="lede">{p.body}</p>
          <Actions>{p.demo ? <a className="btn btn--primary" href={go(p.id, `/products/${p.slug}`)}>{p.demo.label}</a> : null}<a className="btn" href="/request-demo">Request a demonstration</a>{p.id === 'lite' ? <a className="btn btn--quiet" href="#scouter">Scouter, inside Lite</a> : null}</Actions>
          <p className="status-line"><Tag s={DEMO_STATE[p.demoState].s}>{DEMO_STATE[p.demoState].text}</Tag></p></div>
        <div className="hero__aside"><Shot p={p} cap={ctx.captures[p.id]} eager cta={p.demo ? { href: go(p.id, `/products/${p.slug}`), label: 'Open the interactive demonstration' } : undefined} />
          <ul className="claims" aria-label="What the demonstration shows, with its evidence label">{p.shows.map((t, i) => <li key={t}><Tag s={p.showsAs[i] || 'declared'} /><span>{t}</span></li>)}</ul></div>
      </div></section>
      {film(`P-${p.slug}`) ? <Section title="See it work" lead="Recorded from the demonstration itself: every step in it was checked before its words appeared.">{film(`P-${p.slug}`)}</Section> : null}
      {p.film && film(p.film) ? <Section title="Watch it">{film(p.film)}</Section> : null}
      <section className="section"><div className="wrap"><div className="facts">
        <div className="facts__shows"><p className="eyebrow">Try it</p><h2>Open it in the demonstration</h2><p>{DEMO_STATE[p.demoState].text}, on synthetic data in your browser. Every value on its screens carries its evidence label; nothing is connected to a live system.{PRODUCT_LAUNCHES[p.id] ? ` It opens as the ${PRODUCT_LAUNCHES[p.id]!.perspectiveLabel}, with a way back to this page.` : ''}</p>
          <Actions>{p.demo ? <a className="btn btn--primary" href={go(p.id, `/products/${p.slug}`)}>{p.demo.label}</a> : null}<a className="btn" href={priceHref(p.id)} data-price-it>Price it for your estate</a><a className="btn" href="/request-demo">Request a guided demonstration</a></Actions></div>
        <div className="facts__limits"><p className="eyebrow">Limits</p><h2>Limits, stated</h2><p>{p.limits}</p></div>
      </div></div></section>
      {p.id === 'search-party' ? <SearchPartyOrigin /> : null}
      {p.id === 'lite' ? <section className="section" id="scouter" aria-labelledby="scouter-h"><div className="wrap"><div className="scouter">
        <div><p className="label">Part of Lite</p><h2 id="scouter-h">Scouter</h2><p>Ask Scouter whether a device suits a room before anyone buys it. It proposes equipment from comparable rooms and checks each proposal against the room’s recorded requirements, not against other products.</p><p>Every proposal states its limits and goes to the discipline engineer, who decides. Nothing is adopted by Scouter itself.</p></div>
        <div><ul className="ticks"><li>Proposals from comparable rooms, with the comparison stated</li><li>Each check against the requirement, with its source</li><li>Engineer review before anything is adopted</li></ul>
          <Actions><a className="btn btn--primary" href={go('lite', '/products/lite#scouter')}>Open Lite in the demonstration</a></Actions></div>
      </div></div></section> : null}
      <Section title="Where it sits in the lifecycle" tone="deep"><EvidenceLine /></Section>
      <Section title="The other products"><ProductTiles captures={ctx.captures} exclude={p.id} compact /></Section>
    </div>
  ) }));

  const pages: Page[] = [
    home,
    { path: '/platform', title: 'Platform — Empathia Technologies', description: 'One platform, six product families, shared engineering intelligence: seventeen capabilities on one record of every room, device, person and job.', nav: 'Platform', body: (
      <>
        <Hero label="Platform" action={{ href: demo(), label: 'See the record in the live demo' }} title={POSITIONING.line} lead={POSITIONING.lead} />
        <div className="wrap plate-wrap" id="map"><Plate demoUrl={ctx.demoUrl} back="/platform#map" /></div>
        <Section id="families" eyebrow="Six product families" title="Six questions an estate has to answer" lead="Each family answers one of them, and hands what it records to the next.">
          <FamilyQuestions />
        </Section>
        <Section id="shared" eyebrow="Shared engineering intelligence" title="What all seventeen share" lead="This is the product. The families are six views of it, not six products that were integrated afterward." tone="deep"><SharedIntelligence /></Section>
        <Section id="thread" eyebrow="See it connect" title="One issue, followed through the families" lead="A calling problem in one synthetic room, Atlas 4.218. Each step opens the demonstration at that same room, as the person who does that work, with the way back to this page.">
          <Thread demoUrl={ctx.demoUrl} back="/platform#thread" />
          <Note>The demonstration runs on synthetic data in your browser. The eight further capabilities are simulations; nothing is connected to a live system.</Note>
        </Section>
        {film('FA') ? <Section title="The platform in two minutes">{film('FA')}</Section> : null}
        <Section title="The lifecycle"><EvidenceLine /></Section>
        <Follow demoUrl={ctx.demoUrl} captures={ctx.captures} />
        {film('F-FOLLOW') ? <Section id="follow-film" title="The same five views, as one film" lead="Recorded from the demonstration, opened the way this page opens it: each view switches to its own perspective and says so.">{film('F-FOLLOW')}</Section> : null}
        <Strip id="flow" eyebrow="Along the stations" title="Five moves of one record" items={FLOW} flow />
        <Section title="The nine core products"><ProductTiles captures={ctx.captures} /></Section>
        <Section title="The demonstration campus" tone="deep"><Campus /></Section>
        <Section id="executive" title="Executive Intelligence" lead="Projects started and funded, commissioning conformance, open issues, standards alignment and room usage, each measure with its source, its period, its denominator and its coverage. Missing data shows as missing, never as success." />
        <Section title="What runs where" lead="The authenticated application enforces every permission on the server and in the database. The public demonstration runs on synthetic data in your browser. The two never share data." tone="deep"><Note>Integrations with manufacturers' systems are described as simulated, proposed or configured; none is claimed to work until it has been verified with that system.</Note></Section>
        <Strip id="architecture" eyebrow="The architecture" title="Built to be checked" items={ARCH} foot={archFoot} />
        <CtaBand title="Walk the record with us." body="A guided demonstration on synthetic data, with your questions."><Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href={demo()}>Explore the live demo</a></Actions></CtaBand>
      </>
    ) },
    ...familyPages(ctx.demoUrl),
    { path: '/products', title: 'Products — Empathia Technologies', description: `Empathia’s nine core products (${PRODUCTS.map((p) => p.name).join(', ')}) and eight further capabilities, in six families on one record.`, body: (
      <>
        <section className="hero"><div className="wrap"><Spectrum /><p className="label">Products</p><h1>Nine core products, one record</h1><p className="lede">Each product is a stage of the same lifecycle. Each page states what the public demonstration shows today, and what it does not. Scouter is part of Lite. Eight further capabilities build on the same record; the families below place all seventeen.</p><div className="actions hero__action"><a className="btn btn--primary btn--lg" href={demo()} data-hero-action>Explore the live demo</a></div></div></section>
        <Section title="The nine core products, in lifecycle order"><ProductTiles captures={ctx.captures} /></Section>
        <Section id="families" eyebrow="The platform" title="Six families, seventeen capabilities" lead={<>The nine products are the core. Eight further capabilities build on the same record. Each can be opened in the demonstration as a simulation on synthetic data; none is connected to a live system. <a href="/platform">How the six families share one record</a>.</>}>
          <div className="cards cards--3" data-families={FAMILIES.length}>{FAMILIES.map((f) => (<article key={f.id} className="card" data-family={f.id}><h3><a className="fam__link" href={`/platform/${f.id}`}>{f.name}</a></h3><p>{f.says}</p>
            <ul className="ticks">{f.members.map((m) => (<li key={m.id} data-cap={m.id} data-built={m.built ? '1' : '0'}>{m.site ? <a href={m.site}>{m.name}</a> : m.built && MODULE_LAUNCHES[m.id] ? <a href={launchHref(ctx.demoUrl, MODULE_LAUNCHES[m.id]!, '/products#families')} data-launch={m.id}>{m.name}</a> : m.name}{m.kind === 'capability' ? <span className="note"> {m.built ? '· in the demonstration, simulated' : '· specified, not built'}</span> : null}</li>))}</ul></article>))}</div>
        </Section>
        <Section id="voice" eyebrow="Infrastructure and communications · simulation" title="VOICE: calling you can explain" lead="Telephony and unified-communications intelligence on the same record. The CallPath Digital Twin keeps what is configured apart from what was observed and what is not known. In the demonstration as a simulation; no calling platform is connected."><Actions><a className="btn btn--primary" href="/voice">Discover VOICE</a></Actions></Section>
        <Section id="fieldlink" eyebrow="Optional hardware · concept" title="FieldLink extends what Empathia can observe" lead="Three proposed devices — Nano, Edge and Pulse — for sites that want local, hardware-attributed evidence. None of the nine products needs them; no unit has been built yet."><Actions><a className="btn btn--primary" href="/fieldlink">Discover FieldLink</a><a className="btn" href="/fieldlink#optional">Do I need FieldLink? No.</a></Actions></Section>
        {ctx.booklets?.length ? <Section id="guides" title="Guides for the people who use the rooms" lead="The End-User Success Guide and the IT Onboarding Success Guide as printed booklets, set from the demonstration’s own content and screenshots. Both are drafts on synthetic data, not yet reviewed by a practicing specialist.">
          <ul className="booklets" data-booklets={ctx.booklets.length}>{ctx.booklets.map((b) => <li key={b.file} className="booklet">
            <a href={`/media/booklets/${b.file}`} className="booklet__cover" aria-label={`${b.title} (PDF, ${b.pages} pages)`}><img src={`/media/booklets/${b.cover}`} alt="" width={600} height={776} loading="lazy" /></a>
            <div className="booklet__t"><h3>{b.title}</h3><p>{b.blurb}</p><p className="booklet__meta">PDF · {b.pages} pages · {(b.bytes / 1048576).toFixed(1)} MB · draft</p><a className="btn" href={`/media/booklets/${b.file}`} download>Download the booklet</a></div>
          </li>)}</ul>
        </Section> : null}
      </>
    ) },
    ...productPages,
    { path: '/solutions', title: 'Solutions — Empathia Technologies', description: 'Empathia for enterprise IT and AV teams, systems integrators, managed service providers and facilities teams.', body: (
      <>
        <Hero label="Solutions" action={{ href: '/request-demo', label: 'Request a demonstration for your team' }} title="The same record, read by each team" lead="The same platform, read through the responsibilities of each team." />
        <Section id="enterprise" title="Enterprise IT and AV" lead="Standards, approvals and funding decisions with their rationale; the commissioning record and the accepted baseline of every room; executive measures that show their denominators." />
        <Section id="integrators" title="Systems integrators" lead="Design revisions with change-impact traceability, an adaptive commissioning plan with the reason for each test, field evidence captured as the work is done, and a documentation packet that is complete when the applicable requirements are met, not when files are uploaded." />
        <Section id="msp" title="Managed service providers" lead="Who covers each room and in what order; work orders with hard gates before dispatch and verified completion; recommissioning as a new baseline version rather than a replaced record." />
        <Section id="facilities" title="Facilities and workplace" lead="Room readiness, service coverage and the right contact, with engineering detail kept where engineers need it." />
        <Strip id="estates" eyebrow="Where it fits" title="Built for the rooms of every estate" items={ESTATES} foot={estatesFoot} />
        <CtaBand title="Bring your team’s questions." body="A guided demonstration on synthetic data, or a bounded pilot with your rooms."><Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href="/pilot-partners">Pilots and partnerships</a></Actions></CtaBand>
      </>
    ) },
    { path: '/experiences', title: 'Experiences — Empathia Technologies', description: 'Nine worlds on one Core: the Enterprise campus, a stadium, a university and a convention hall you can walk in the browser today; Collabora-SING in development; a festival, a community network, shelter coordination and an e-waste facility planned. Fictional venues, synthetic data.', nav: 'Experiences', body: (
      <>
        <Hero label="Experiences" title="Walk into the rooms the platform runs" lead="Nine worlds on one Core. Four can be walked in the browser today, Collabora-SING is in development and four more are planned. Every venue is fictional and every figure synthetic; each world says what it is and what it is not."
          action={{ href: demo('#/play/campus'), label: 'Play Campus Life' }} />
        {/* 25 Nov 2026 (commercial-readiness directive §9): every one of the nine worlds, with what exists today. A planned world shows no
            picture and no detail beyond its purpose: nothing unfinished is shown as built. Venues and places are fictional. */}
        <Section id="nine" eyebrow="Nine worlds" title="One Core, nine places it runs" lead="Each world uses the same record, evidence labels and engineering as the Enterprise campus.">
          <ul className="worlds9" data-worlds={NINE.length}>{NINE.map((x) => (
            <li key={x.key} className="world9" data-world={x.key} data-state={x.state}>
              <p className="world9__state">{x.state === 'walk' ? 'In the demonstration' : x.state === 'dev' ? 'In development' : 'Planned'}</p>
              <h3>{x.name}</h3><p>{x.line}</p>
              {x.href ? <a href={x.href.startsWith('#') ? demo(x.href) : x.href}>{x.cta}<span aria-hidden="true"> →</span></a> : <p className="world9__note">Not built yet. No date is given.</p>}
            </li>))}</ul>
          <p>The SIGNAL series in Learn tells stories set in these worlds; <a href="/products/learn">see Learn</a>.</p>
        </Section>
        {([
          ['exp-campus', 'Campus Life', 'A university you play', 'Walk and run across the Quad of Kestrel Valley University, meet Professor Calder, open Science Hall and fix the circuit bench in the SCI-110 lecture theater before her 09:00 lecture. Three circuits, worked out with Ohm’s law, light the board; fact cards, experience and levels along the way; progress kept in your browser.', '#/play/campus', 'Play Campus Life', 'The SCI-110 lecture theater in Campus Life, with the circuit bench, the desks and the projection screen'],
          ['exp-stadium', 'Stadium LIVE', 'A stadium you operate', 'Harborlight Stadium under the lights. The console changes the bowl itself: seven atmospheres from pregame to concert, five cameras, cheers and a wave, a replayable match, the ribbon and the boards, a modeled crowd-level map that states its assumptions, PA and wireless coverage, the venue’s AV devices and their (simulated) state. Sound only when you turn it on.', '#/play/stadium', 'Open Stadium LIVE', 'Harborlight Stadium at night in Stadium LIVE, with the LIVE console beside the bowl'],
          ['exp-expo', 'Expo LIVE', 'An expo hall you explore', 'Hall A of the Larkspur Exchange Convention Center: twenty fictional exhibitors and the Empathia showcase, the plan beside the hall. Fly to a booth, save it to your agenda, leave your details only with consent, join a session and answer its poll, ask a question that waits for the moderator; the organizer’s view adds modeled footfall.', '#/play/expo', 'Walk the Expo hall', 'The Empathia stand in Expo LIVE, with the hall plan and the stand’s card'],
        ] as Array<[string, string, string, string, string, string, string]>).map(([file, name, kicker, body, route, cta, alt], i) => (
          <Section key={file} id={file} eyebrow={kicker} title={name} tone={i === 1 ? 'deep' : undefined} lead={body}>
            <ExpShot file={file} cap={ctx.captures[file]} alt={alt} eager={i === 0} />
            <Actions><a className="btn btn--primary" href={demo(route)}>{cta}</a></Actions>
          </Section>))}
        <Section id="honest" title="What these are, and what they are not" lead="First versions: the venues, people and figures are fictional; levels and footfall are modeled and say so; device states are simulated; nothing here is a live feed or a measurement. They are drawn by your browser’s graphics hardware; frame rates on real phones and computers have not yet been measured, and the characters and buildings are early models that will be replaced with richer ones." />
        <CtaBand title="See them with your team." body="A guided demonstration walks the three worlds and the platform behind them."><Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href={demo('#/worlds')}>Choose a world</a></Actions></CtaBand>
      </>
    ) },
    { path: '/how-it-works', title: 'How it works — Empathia Technologies', description: 'The governed lifecycle from request to assurance baseline.', nav: 'How it works', body: (
      <>
        <Hero label="How it works" action={{ href: demo(), label: 'Walk the lifecycle in the live demo' }} title="From request to accepted baseline" lead="The governed lifecycle the platform is built around, as the demonstration shows it: every transition with an authorized role, the required evidence, a guard, an event and an audit record." />
        <Strip id="flow" eyebrow="Along the stations" title="Design, prove, operate, repair, learn" items={FLOW} flow />
        {film('F-LIFE') ? <Section id="life" title="One room’s whole life" lead="Core Replay plays a room’s life back from its records, recorded here from the demonstration: the request, the design, the build, the tests, the first baseline, a camera change that reopens only the tests it touches, and the second baseline.">{film('F-LIFE')}</Section> : null}
        <Section title="Nine steps, one record"><Steps steps={[
          { title: 'Request', body: 'A requestor describes the room, with photos, plans, known dimensions and constraints. Photos follow a stated privacy policy.' },
          { title: 'Acknowledgment and pitch', body: 'The assigned supplier acknowledges; the operations lead assembles a revisioned business case.' },
          { title: 'Approval, then funding', body: 'An eligible executive approves, holds or rejects with rationale. Funding is a separate authority with an amount and an expiry. Neither can be given by the author.' },
          { title: 'Engineering brief and design', body: 'The operations lead and the systems engineer sign off scope; design revisions carry geometry provenance and change impact.' },
          { title: 'Equipment and standards', body: 'Scouter, inside Lite, proposes compatible equipment against reviewed configuration standards; a discipline engineer decides.' },
          { title: 'Adaptive commissioning', body: 'A plan compiled from the rule pack; a camera replacement does not inherit a town hall’s tests. Design values are never read as measured values.' },
          { title: 'Field work and evidence', body: 'Technicians record results with provenance; failures open deficiencies and targeted retests; a reviewer verifies independently.' },
          { title: 'Documentation and handoff', body: 'Completeness counts applicable approved requirements. No acceptance before the mandatory documents and final photos.' },
          { title: 'Baseline and assurance', body: 'Acceptance creates the room\'s baseline; drift, repair and recommissioning add versions and keep the history.' },
        ]} /></Section>
        {film('F02P') ? <Section title="A divisible hall, from design to proven">{film('F02P')}</Section> : null}
      </>
    ) },
    { path: '/technology', title: 'Technology — Empathia Technologies', description: 'Architecture of the Empathia platform: modular monolith, PostgreSQL with row-level security, append-only evidence, transactional outbox, typed contracts.', nav: 'Technology', body: (
      <>
        <Hero label="Technology" action={{ href: '/proof', label: 'See what is proven, and what is not' }} title="Built for correctness first" lead="A modular monolith with clear boundaries: the database enforces who may see what, evidence is append-only, and every engine is a deterministic rule system with published test cases." />
        <Section title="Architecture"><Cards cols={3} items={[
          { icon: 'model', title: 'One canonical data model', body: 'One record for every room, device, person and project, with stable identifiers and revisioned room designs. A room position and the physical unit installed in it are separate records, linked by dated installations.' },
          { icon: 'db', title: 'Authorization in the database', body: 'Tenant and site scope enforced with PostgreSQL row-level security as well as in the API; deny by default. A perspective switch in the demonstration grants nothing.' },
          { icon: 'history', title: 'Append-only evidence and audit', body: 'Evidence and audit records cannot be edited or deleted by the application roles; events are written in the same transaction as the change and delivered by a worker with retries.' },
          { icon: 'code', title: 'Typed contracts', body: 'An OpenAPI document generated from the route table, a generated typed client, JSON Schemas for events and records.' },
          { icon: 'gauge', title: 'Engines with golden tests', body: 'The commissioning and assurance engines are deterministic rule systems with published parity cases, not trained models. The demonstration and the API share one reverification rule.' },
          { icon: 'plug', title: 'Connectors by capability', body: 'Adapters declare what they can observe or do and carry an honest state; today every adapter is a mock or a contract, and none is claimed to work with a manufacturer\'s system.' },
        ]} /></Section>
        <Strip id="architecture" eyebrow="In five lines" title="Built to be checked" items={ARCH} foot={archFoot} />
      </>
    ) },
    proofPage(ctx.demoUrl, ctx.asOf || new Date().toISOString()),
    { path: '/trust', title: 'Security and trust — Empathia Technologies', description: 'What Empathia does and does not claim about security, privacy and compliance.', nav: 'Trust', body: (
      <>
        <Hero label="Trust" action={{ href: '/proof', label: 'Open the Proof Center' }} title="Security and trust" lead="What is in place, what is planned, and what we do not claim." />
        <Section title="In place in the product"><Cards cols={3} items={[
          { icon: 'key', title: 'Server-side authorization', body: 'Every API operation, search, file read and background job checks the actor, the tenant, the site and the role. Negative tests cover cross-tenant and cross-site access.' },
          { icon: 'lock', title: 'Private evidence storage', body: 'Evidence files are stored privately, hashed on upload and re-verified on every read; a download is authorized against the caller\'s tenant and site scope.' },
          { icon: 'file', title: 'Audit', body: 'Administrative and workflow actions are recorded append-only with the actor and the time.' },
        ]} /></Section>
        <Section title="Planned, not yet in place" lead="Signed, short-lived download links from object storage; an enterprise identity provider with MFA; verified manufacturer adapters. Each is on the build plan and will be described here only once it is tested." />
        <Section title="What we do not claim" lead="Empathia holds no SOC 2, ISO 27001 or HIPAA certification. No external security assessment of the platform has been completed. No manufacturer integration is claimed to work until verified with that manufacturer's system. The demonstrations use synthetic data only." tone="deep" />
        <Section title="This website" lead="The site loads nothing from third parties and runs under a strict content security policy. Enquiries open on Tally’s own site, in a new tab; nothing you type in them passes through this site."><Actions><a className="btn" href="/privacy">Privacy notice</a></Actions></Section>
      </>
    ) },
    { path: '/founder', title: 'Jeremiah Johnson, founder — Empathia Technologies', description: 'Jeremiah Johnson founded Empathia Technologies. CTS (AVIXA), CAPM (PMI), CompTIA Network+.', nav: 'Founder', headScript: 'founder.js', body: (
      <>
        <section className="hero hero--founder"><div className="wrap"><FounderBlock page="founder" portrait={<FounderReveal />} /></div></section>
        <SearchPartyStory sp={byId('search-party')} cap={ctx.captures['search-party']} demoHref={go('search-party', '/founder')} />
        <BeforeTheExplanation />
        <Section title="The thinking behind the company" lead="A workplace’s technology is designed, installed, tested, accepted and serviced by different people, and its record is usually scattered across suppliers, spreadsheets and memory. Empathia is built so that record stays whole, and stays honest about what is known." />
        <Section title="The principles Empathia is built on" tone="deep"><Cards cols={3} items={PRINCIPLES} /></Section>
        <section className="band"><div className="wrap"><h2>Talk with the founder.</h2><p>Investor conversations, pilots and partnerships go through Empathia’s enquiry form, marked for the founder.</p><div className="actions"><EnquiryLink source="founder" primary id="founder-band" /></div></div></section>
      </>
    ) },
    { path: '/about', title: 'About — Empathia Technologies', description: 'Empathia Technologies and its founder.', body: (
      <>
        <Hero label="Company" title="About Empathia" lead="Empathia Technologies builds the Living Campus: software that keeps the technology of a workplace honest about its own state." />
        <Section title="Founder" lead="Empathia was founded by Jeremiah Johnson (CTS, CAPM, CompTIA Network+)."><Actions><a className="btn" href="/founder">About the founder</a></Actions></Section>
        <Section id="fieldlink" title="FieldLink: optional hardware, a concept" lead="Nano, Edge and Pulse: three proposed devices that would let Empathia observe and verify more of a room locally. Empathia does not need them. No unit has been built."><Actions><a className="btn" href="/fieldlink">FieldLink</a></Actions></Section>
        <Section id="in-development" title="In Development: Collabora-SING" lead="Collabora-SING is a product in development. Its page sets out a research plan; the pilot has not been run yet."><Actions><a className="btn" href="/collabora-sing">Collabora-SING</a></Actions></Section>
        <Section title="Principles" tone="deep"><Cards cols={3} items={PRINCIPLES} /></Section>
        <Section id="investors" title="Investor conversations" lead="The company, the platform and the demonstration, with the evidence behind each claim."><div className="enquire"><EnquiryLink source="website-investor" primary /></div></Section>
      </>
    ) },
    // Collabora-SING (founder, 2026-11-10): a product in development, with its own section of the corporate site, labelled "In Development". Its film plays here
    // and nowhere else (films.json: exclusive). Every sentence below is taken from what the film shows on screen: it is a research plan.
    // No result, measurement, latency figure, customer, partner, institution or date is stated, because the pilot has not been run.
    { path: '/collabora-sing', title: 'Collabora-SING, In Development — Empathia Technologies', description: 'Collabora-SING is a product in development at Empathia Technologies. Its film sets out a research plan in eight scenes. The pilot has not been run yet.', body: (
      <div data-collabora>
        <section className="hero hero--split hero--collabora"><div className="wrap hero__grid">
          <div className="hero__copy">
            <p className="label">In Development</p>
            <h1>Collabora-SING</h1>
            <p className="hero__sub">“What if we transmitted the performance... instead of only the sound?”</p>
            <p className="lede" data-collabora-status>Collabora-SING is a product in development at Empathia Technologies. Its film, Collabora-SING SyncLab, sets out a research plan in eight scenes. The pilot has not been run yet, so there is no result to report here.</p>
            <Actions>{film('SYNCLAB') ? <a className="btn btn--primary" href="#film">Watch the 35-second film</a> : null}<a className="btn" href="#plan">Read the plan</a></Actions>
            <p className="status-line"><Tag s="unknown">In Development · pilot not yet run</Tag></p>
          </div>
          <div className="hero__aside">
            <PlanRecord id="evidence" title="From “not yet measured” to evidence" state="The pilot has not been run yet" cols={['What the plan looks at', 'The label it will carry']} rows={[
              { name: 'A real keyboard', labels: ['measured'] },
              { name: 'Real networks', labels: ['estimated', 'measured'] },
              { name: 'Facilitator’s notes', labels: ['observed'] },
              { name: 'What a player feels', labels: ['subjective'] },
              { name: 'Loss and stuck notes', labels: ['measured', 'observed'] },
              { name: 'Playing together', labels: ['not-yet'] },
            ]} foot="Today every row is not yet measured. The labels are the plan’s, shown in the film’s last scene: they say what kind of evidence each will be, not that it exists." />
          </div>
        </div></section>
        {film('SYNCLAB') ? <Section id="film" eyebrow="The film" title="The plan, in thirty-five seconds" lead="An animated explainer in eight scenes, with no sound. It shows a plan: what a pilot is designed to do, before any pilot has run.">{film('SYNCLAB')}</Section> : null}
        <Section id="plan" eyebrow="The plan" title="Eight steps, from a hypothesis to evidence" lead="Each step follows one scene of the film, in plain words and as what it is: a plan. Together they describe what the pilot is designed to do. The pilot has not been run yet." tone="deep"><Steps steps={[
          { title: 'Hypothesis', body: 'What if we transmitted the performance instead of only the sound? The plan’s aim is to test that on a real network, with a real instrument and a real musician. It is not yet measured.' },
          { title: 'Bench', body: 'One performance, two ways to send it. In the plan, Mode A sends rendered audio through Opus and WebRTC and a jitter buffer, and Mode B sends MIDI events through a data channel to a software instrument. Both arrive at the same output.' },
          { title: 'Network', body: 'Five network conditions are planned, one stage at a time: wired LAN, church Wi-Fi, hotspot or internet, a remote site, and controlled degradation.' },
          { title: 'Musician', body: 'The plan puts a real player at a real keyboard, on wired headphones with the keyboard’s own sound off, so that the player hears only what crossed the network.' },
          { title: 'Blind test', body: 'Twenty trials are planned with the transport hidden, so that nobody in the room knows which is which. In each one the player is to be asked how immediate it feels, from 1 to 5.' },
          { title: 'Telemetry', body: 'Every note is to be stamped at five moments: device event, captured, sent, received and triggered. What one clock times will be labeled measured; what takes two clocks will be labeled estimated.' },
          { title: 'Analyzer', body: 'Exports, ratings and worksheets are to flow into one place, each with its label: exports measured, ratings subjective, worksheets observed. Thresholds are to be fixed before the first session.' },
          { title: 'Evidence', body: 'From “not yet measured” to evidence. This is the plan. The pilot has not been run yet.' },
        ]} /></Section>
        <section className="section" aria-labelledby="collabora-limits"><div className="wrap"><div className="facts facts--plan">
          <PlanRecord id="analyzer" title="Pilot Analyzer" state="No pilot data yet" cols={['What the pilot records', 'The label it will carry']} rows={[
            { name: 'Median / p95 latency', labels: ['estimated'] },
            { name: 'Round-trip time', labels: ['measured'] },
            { name: 'Jitter', labels: ['measured'] },
            { name: 'Packet loss', labels: ['measured'] },
            { name: 'A/B preference', labels: ['subjective'] },
            { name: 'Musician ratings', labels: ['subjective'] },
            { name: 'Network condition', labels: ['observed'] },
          ]} foot="Thresholds fixed before the first session. The panel is drawn as the film shows it: every row has a label and no value." />
          <div className="facts__limits"><p className="eyebrow">Limits</p><h2 id="collabora-limits">What this page does not claim</h2>
            <p>The pilot has not been run yet. This page gives no result, no measurement, no latency figure, no customer, no partner and no date, because none exists to give.</p>
            <p>The figures that appear in the film are marked on screen “DEMO DATA not a measurement”, and none of them is repeated here.</p>
            <p>Collabora-SING is not one of the nine Living Campus products listed on this site.</p></div>
        </div></div></section>
        <section className="band"><div className="wrap"><h2>Questions about Collabora-SING?</h2><p>Write to us through the contact page and say that your message is about Collabora-SING.</p><div className="actions"><a className="btn btn--primary btn--lg" href="/contact">Contact</a></div></div></section>
      </div>
    ) },
    voicePage(ctx.demoUrl),   // Enterprise 3.0 directive 1A (founder, 23 Nov 2026): VOICE, telephony and UC intelligence (voice.tsx)
    fieldlinkPage(demo),   // founder 18 Nov 2026 17:25: the optional hardware family, a concept (fieldlink.tsx)
    intakePage(demo, ctx.captures),   // founder 19 Nov 2026 13:28: Intake, not a product, its own page with screenshots only (intake.tsx)
    { path: '/request-demo', title: 'Request a demonstration — Empathia Technologies', description: 'Request a guided demonstration of the Empathia Living Campus.', body: (
      <>
        <Hero label="Request a demonstration" title="See it with your questions" lead="A guided walk through the scenarios on synthetic data, for your team and your questions." />
        <Section title="Tell us about your estate">{lead('demo', 'website-demo')}</Section>
      </>
    ) },
    { path: '/pilot-partners', title: 'Pilots and partnerships — Empathia Technologies', description: 'Pilot the Empathia Living Campus on a bounded scope with your own rooms and people, or partner with Empathia.', body: (
      <>
        <Hero label="Pilots and partnerships" action={{ href: '/pilots', label: 'Check which pilot fits' }} title="A bounded pilot, with a factual report" lead="An agreed set of rooms and people, the authenticated application, your standards, your evidence, and a readiness report at the end that states what was verified and what was not." />
        <Section title="What a pilot includes"><Cards cols={3} items={[
          { icon: 'scope', title: 'Scope', body: 'A site or a building, the roles involved, the lifecycle stages in scope.' },
          { icon: 'data', title: 'Data', body: 'Your rooms, devices and standards entered through the product; no customer data leaves your tenant.' },
          { icon: 'report', title: 'Readiness report', body: 'A factual account of what the pilot verified, with the tests and the evidence, and what remains.' },
        ]} /></Section>
        <Section title="Start the conversation">{ctx.api ? <LeadForm kind="pilot" /> : <div className="enquire__grid"><EnquiryCard source="website-pilot" primary /><EnquiryCard source="website-partner" /></div>}</Section>
      </>
    ) },
    { path: '/contact', title: 'Contact — Empathia Technologies', description: 'Contact Empathia Technologies.', body: (
      <>
        <Hero label="Contact" title="Write to us" lead="Demonstrations, pilots, partnerships, investor conversations, or anything else." />
        {ctx.api ? <Section title="Your message"><LeadForm kind="contact" /></Section> : <Section title="Choose what fits" lead="Every option opens Empathia’s enquiry form on tally.so in a new tab. The form asks for an area of interest; each option below names the one to choose.">
          <div className="enquire__grid"><EnquiryCard source="website-demo" /><EnquiryCard source="website-pilot" /><EnquiryCard source="website-partner" /><EnquiryCard source="website-investor" /><EnquiryCard source="website-contact" primary /></div>
        </Section>}
      </>
    ) },
    { path: '/privacy', title: 'Privacy notice — Empathia Technologies', description: 'How Empathia Technologies handles personal data on this site.', body: (
      <>
        <Hero label="Privacy" title="Privacy notice" lead="What this website collects, and what it does with it." />
        <Section title="This website" lead="The site itself sets no cookies and loads nothing from third parties. Films on this site load only when you press play, from this site. Your color theme choice, if you make one, is kept in your own browser and never sent anywhere." />
        {ctx.api
          ? <Section id="enquiries" title="Enquiries" lead="The forms on this build send what you type (your name, organization, email and message) to Empathia's own service, where it is stored for the purpose of answering you." />
          : <section id="enquiries" className="section"><div className="wrap"><div className="section__head"><h2>Enquiries</h2><p className="section__lead">Enquiries use a form hosted by Tally (tally.so), opened in a new tab. Nothing you type in it passes through this site.</p></div>
            <ul className="ticks">
              <li>The form collects your name, business email, organization, job title (optional), area of interest, timeline (optional), your message and your acknowledgment.</li>
              <li>Empathia Technologies is the controller of every enquiry; Tally is the processor. Tally states that form data is encrypted and stored in Europe (Google Cloud, Belgium).</li>
              <li>Tally’s sub-processors include a US email provider, used when Tally notifies Empathia of a new enquiry.</li>
              <li>The link tells Tally which button you used (for example “founder”), so we can route your enquiry; it carries nothing about you.</li>
              <li>Enquiries are kept only as long as needed to answer and follow up, then deleted.</li>
            </ul>
            <p className="disclosure">Form address: <a href={TALLY_FORM} target="_blank" rel="noopener noreferrer">{TALLY_FORM.replace('https://', '')}<span className="sr"> (opens in a new tab)</span></a></p></div></section>}
        <Section title="The product" lead="In the authenticated application, personal data is scoped to the tenant that owns it, authorized on every read, and retained under the tenant's policy. Room photos and recordings are processed only with the tenant's approved policy and the consent it requires." />
        <Section title="Your rights" lead="You may ask what we hold about you and ask for it to be corrected or deleted, through the enquiry form on the contact page."><Actions><a className="btn" href="/contact">Contact</a></Actions></Section>
      </>
    ) },
    { path: '/legal', title: 'Legal — Empathia Technologies', description: 'Legal notices for the Empathia Technologies website.', body: (
      <>
        <Hero label="Legal" title="Legal" lead="Notices for this website." />
        <Section title="Demonstrations" lead="All demonstrations run on synthetic data. Every person, organization, room, device, figure and approval in them is invented. Roles in the demonstration show a policy; real access is decided by the authenticated application's server." />
        <Section title="Names" lead="Product names of other companies, where they appear in the product, identify categories of equipment or systems; no affiliation, partnership or endorsement is implied, and no integration is claimed to work until verified." />
        <Section title="Intellectual property" lead="The Empathia Living Campus software, its engines, documentation, emblem and demonstrations are the property of Empathia Technologies." />
        <Section title="Accessibility" lead="This site aims at WCAG 2.2 AA: keyboard navigation, visible focus, text contrast of at least 4.5:1 in the light and the dark theme, captions and a transcript for every film with speech, a text description for a film without sound, and no motion for readers who ask for reduced motion. Tell us through the contact page if something does not work for you." />
      </>
    ) },
  ];
  // /films always exists (31 Oct and 3 Nov screens): a cleared film plays with captions and a transcript; a film whose rights for the
  // website are not yet confirmed is listed by title and summary only, with the reason, and nothing of it is shipped
  const pending = ctx.pendingFilms || [];
  pages.splice(pages.findIndex((p) => p.path === '/technology'), 0, { path: '/films', title: 'Films — Empathia Technologies', description: 'Films of the Empathia Living Campus, with captions and transcripts.', nav: 'Films', body: (
    <>
      <Hero label="Films" action={{ href: demo(), label: 'Explore the live demo' }} title="Watch the record being made" lead="Each film is recorded from the demonstration or illustrates a scenario, and says which. Every one has captions and a transcript." />
      {indexFilms.map((f) => <Section key={f.key} title={f.title} lead={f.summary}>{film(f.key)}</Section>)}
      {ctx.broll?.length ? <Section title="Scenes from the rooms we serve" lead="Short scenes, eight seconds each, of the places and the people the platform is for: sanctuaries and sound desks, training rooms, towers at night. They play silently when they come into view, unless your device asks for reduced motion." tone="deep"><Scenes clips={ctx.broll} /></Section> : null}
      {pending.length ? <Section title={hasFilms ? 'Coming to this page' : 'The films'} lead="These films are made. Each is published here only once its rights for the website are confirmed; until then, the demonstration itself is the best way to see the product." tone={hasFilms ? 'deep' : undefined}>
        <div className="filmcards">{pending.map((f, i) => <FilmPending key={f.key} film={f} n={i + 1} />)}</div>
        <Actions><a className="btn btn--primary" href={demo()}>Explore the live demo</a><a className="btn" href="/request-demo">Request a guided demonstration</a></Actions>
      </Section> : null}
    </>
  ) });
  pages.splice(pages.findIndex((p) => p.path === '/request-demo'), 0, ...commercialPages(ctx.demoUrl));   // v18/pilot: the price list and the pilot packages
  return pages;
}

/** The not-found page (served with status 404): the Agora Owl, the address asked for, the way back and the main destinations. The owl
 *  appears here and on no-access pages only (D39). Addresses that moved are explained by the script from the same map the server uses. */
export function notFoundPage(): Page {
  return { path: '/404', title: 'Page not found — Empathia Technologies', description: 'This address is not part of the Empathia Technologies website.', body: (
    <section className="hero"><div className="wrap lost">
      <div>
        <p className="label">Error 404 · Page not found</p>
        <h1>This address isn’t part of the site.</h1>
        <p className="lede">You asked for <code data-asked>this address</code>. It may be mistyped, or the page may have moved.</p>
        <p className="lost__moved" data-moved hidden />
        <Actions><a className="btn btn--primary btn--lg" href="/">Back to the home page</a><a className="btn btn--lg" href="/products">All products</a></Actions>
        <ul className="lost__dest" aria-label="Main destinations">{[['/', 'Home', 'Every room, every device, every decision, with its evidence.'], ['/platform', 'Platform', 'One record and one governed lifecycle, read by every product.'], ['/products', 'Products', 'The nine products, in lifecycle order.'], ['/how-it-works', 'How it works', 'From request to accepted baseline.'], ['/founder', 'Founder', 'The person and the thinking behind the company.'], ['/request-demo', 'Request a demonstration', 'A guided walk through the scenarios on synthetic data.']].map(([h, t, d]) => <li key={h}><a href={h}><b>{t}</b><span>{d}</span><i aria-hidden="true">→</i></a></li>)}</ul>
      </div>
      <img className="lost__owl" src="/brand/owl.svg" width={300} height={300} alt="" data-owl />
    </div></section>
  ) };
}
