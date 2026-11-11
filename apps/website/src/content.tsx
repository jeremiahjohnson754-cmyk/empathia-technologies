// The public Empathia Technologies site: every page's content. Nothing here may name a customer, a partner, a certification of the
// company, an award, revenue or a measured outcome; everything shown runs on synthetic data and says so. Claims are limited to what
// the repository demonstrates (docs/legacy-parity.md). The founder's credentials are exactly the three the founder supplied; the founder
// pages carry the founder's own words and portrait only, never an invented biography.
import { proofPage, LeadClaim } from './proof.js';
import React from 'react';
import { LeadForm, type LeadKind } from './form.js';
import { Hero, Section, Cards, Steps, Note, Actions, Tag, EVIDENCE, EvidenceLine, FilmPlayer, Spectrum, Shot, ProductTiles, EnquiryCard, EnquiryLink, FounderBlock, Stage, Chapters, RoomMix, GlassRail, Strip, RoomDrawing, FilmPending, PlanRecord, type StripItem, type Evidence, type Film, type Cue, type Capture, type ChapterItem } from './ui.js';
import { PRODUCTS, DEMO_STATE, ROOMS_SENTENCE, ROOM_MIX, ROOM_TOTAL } from './products.js';
import { TALLY_FORM } from './enquiry.js';
import { commercialPages } from './commercial.js';
import { FounderReveal, SearchPartyStory, SearchPartyOrigin } from './founderStory.js';   // the founder page's plate and the Search Party founding story   // v18/pilot: /pricing and /pilots

export interface Page { path: string; title: string; description: string; nav?: string; body: React.ReactNode; /** a page's own script in dist (e.g. 'pilot.js'), loaded after site.js on that page only */ script?: string; /** a small script of the page's own loaded in <head>, before first paint (the founder page's introduction must start from its opening frame) */ headScript?: string; }
export interface SiteContext { asOf?: string; films: Film[]; pendingFilms?: Pick<Film, 'key' | 'title' | 'runtime' | 'summary' | 'disclosure'>[]; transcripts: Record<string, string[]>; /** a silent film's description, cue by cue (build.mjs reads its descriptions.vtt) */ cues?: Record<string, Cue[]>; demoUrl: string; preview: boolean; captures: Record<string, Capture>; api?: boolean }

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
    <div className="campus__text"><p>The demonstration campus has thirty rooms: {ROOMS_SENTENCE}</p><RoomMix mix={ROOM_MIX} /></div></div>
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
const FLOW: StripItem[] = [
  { title: 'Design', sub: 'Lite draws the room and its coverage', icon: 'lite', p: 'lite', href: '/products/lite' },
  { title: 'Prove', sub: 'Commissioning tests, a reviewer verifies', icon: 'commissioning', p: 'commissioning', href: '/products/commissioning' },
  { title: 'Operate', sub: 'Mission Control reads it against the baseline', icon: 'mission-control', p: 'mission-control', href: '/products/mission-control' },
  { title: 'Repair', sub: 'ServiceHands closes on a verified retest', icon: 'servicehands', p: 'servicehands', href: '/products/servicehands' },
  { title: 'Learn', sub: 'APEX explains, Learn teaches', icon: 'learn', p: 'learn', href: '/products/learn' },
];
/** The architecture strip: only what the repository enforces and tests (the trust page says what is not claimed). */
const ARCH: StripItem[] = [
  { title: 'Deny by default', sub: 'The server and the database decide every read', icon: 'key' },
  { title: 'Append-only evidence', sub: 'Never edited, never overwritten', icon: 'history' },
  { title: 'Typed contracts', sub: 'OpenAPI and JSON Schemas, generated', icon: 'code' },
  { title: 'Every value labelled', sub: 'Six evidence words, kept apart', icon: 'label' },
  { title: 'Synthetic in public', sub: 'Nothing connected, nothing live', icon: 'flask' },
];
const archFoot = <p><a href="/trust">What is in place, and what we do not claim<span aria-hidden="true"> →</span></a></p>;
const estatesFoot = <p>The demonstration’s rooms are modelled on these estates. No customer is named and no deployment in any of them is claimed.</p>;
const CtaBand = ({ title, body, children }: { title: string; body: string; children: React.ReactNode }) => (
  <section className="band band--drawn"><div className="wrap"><div className="band__copy"><h2>{title}</h2><p>{body}</p>{children}</div><RoomDrawing /></div></section>
);
/** The home page's story, in lifecycle order, each chapter told with that product's own screen. Wording kept to what the
 *  demonstration shows (products.ts), so a chapter never claims more than its product page. */
const STORY: ChapterItem[] = [
  { p: byId('lite'), title: 'Design the room before anything is bought', body: 'Lite draws the room from an archetype and its dimensions and places every seat, display, camera and microphone. Predicted coverage is labelled modeled, and Scouter, inside Lite, proposes equipment from comparable rooms for the engineer to decide.', points: ['Geometry with its provenance, never promoted silently', 'Coverage predicted, with the assumptions stated', 'Scouter proposals reviewed before anything is adopted'] },
  { p: byId('commissioning'), title: 'Prove it, then accept it', body: 'An adaptive plan states why each test applies and why others do not. A failed test opens a deficiency, someone other than the engineer verifies, and acceptance makes the room’s baseline.', points: ['The reason for every test', 'An approval that names every unresolved item', 'Retest, independent verification, acceptance'], shot: { file: 'room', alt: 'The room record of Atlas 4.218 in the investor demonstration: its health, devices, open issues and lifecycle stage, each computed from the room’s records.' } },
  { p: byId('servicehands'), also: byId('mission-control'), title: 'Run it against what was accepted', body: 'Mission Control counts every room at every stage and says what changed. ServiceHands turns an issue into a work order that closes only with field evidence and a verified retest.', points: ['What changed, what matters, what needs action', 'Hard gates before dispatch', 'Closure on a verified retest, not on a checkbox'] },
  { p: byId('apex'), also: byId('learn'), title: 'Learn from what actually happened', body: 'APEX ranks the hypotheses that could explain a change, each with its evidence and the reason it is not yet proven. Learn turns reviewed cases into lessons, and training never grants authority.', points: ['Ranked hypotheses with cited evidence', 'A person decides; a suggestion never acts by itself', 'Reviewed, de-identified cases that teach'] },
];

export function buildPages(ctx: SiteContext): Page[] {
  const film = (key: string, lead?: boolean) => { const f = ctx.films.find((x) => x.key === key); return f ? <FilmPlayer film={f} transcript={ctx.transcripts[key] || []} cues={ctx.cues?.[key]} lead={lead} /> : null; };
  const demo = (href = '#/investor') => ctx.demoUrl + '/' + href;
  // /films lists the films of the Living Campus; a film marked `exclusive` (Collabora-SING's) belongs to its own section and is not listed there
  const indexFilms = ctx.films.filter((f) => !f.exclusive);
  const hasFilms = indexFilms.length > 0;
  const lead = (kind: LeadKind, source: Parameters<typeof EnquiryCard>[0]['source']) => ctx.api ? <LeadForm kind={kind} /> : <EnquiryCard source={source} primary />;
  const heroArt = <Stage p={byId('mission-control')} cap={ctx.captures['mission-control']} counts={[{ n: PRODUCTS.length, label: 'products' }, { n: ROOM_TOTAL, label: 'rooms' }, { n: 1, label: 'record' }]} />;

  const home: Page = { path: '/', title: 'Empathia Technologies — every room, every device, every decision, with its evidence', description: 'Empathia Living Campus connects the request, design, commissioning, service and assurance of every room into one record of what actually happened, and labels what is declared, modeled, observed and verified.', nav: 'Home', body: (
    <>
      <section className="hero hero--home"><div className="wrap">
        <Spectrum />
        <div className="hero__grid">
          <div className="hero__copy">
            <p className="label">Empathia Living Campus</p>
            <h1 className="display"><span>Every room.</span> <span>Every device.</span> <span>Every decision.</span> <span>With its evidence.</span></h1>
            <p className="lede">The request, the design, the commissioning tests, the service work and the accepted baseline of every room, connected in one record of what actually happened, and honest about what is only declared or modeled.</p>
            <Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href={demo()}>Explore the live demo</a></Actions>
          </div>
          <div className="hero__aside">{film('M2', true) || heroArt}</div>
        </div>
        <EvidenceLine />
        <GlassRail />
      </div></section>
      <Section eyebrow="The lifecycle, in the product" title="From an empty room to an accepted baseline" lead="Four moments of one record, each shown on the product’s own screen in the public demonstration. Every screen runs on synthetic data.">
        <Chapters items={STORY} captures={ctx.captures} />
      </Section>
      <Section eyebrow="The products" title="Nine products. One record." lead="Each product is a stage of the same governed lifecycle and shares one identity for every room, device, person and project. Each says how much of it you can see in the public demonstration today." tone="deep">
        <ProductTiles captures={ctx.captures} />
      </Section>
      <Strip id="flow" eyebrow="The workflow" title="From request to a proven room" items={FLOW} flow />
      <Section eyebrow="The demonstration campus" title="Thirty rooms, each with its record"><Campus /></Section>
      <Strip id="estates" eyebrow="Where it fits" title="Built for the rooms of every estate" items={ESTATES} foot={estatesFoot} />
      <Section eyebrow="Evidence" title="Six words the product will not blur" lead="Every value on every screen carries one of these labels. Most tools collapse them; Empathia keeps them apart so a decision can be traced to what was actually known." tone="deep">
        <dl className="states">{(Object.keys(EVIDENCE) as Evidence[]).map((s) => <div key={s} data-s={s}><dt><Tag s={s} /></dt><dd>{EVIDENCE[s].meaning}</dd></div>)}</dl>
      </Section>
      <Section eyebrow="Who it is for" title="Read by every team that touches a room"><Cards cols={4} items={AUDIENCES} /></Section>
      <Strip id="architecture" eyebrow="The architecture" title="Built to be checked" items={ARCH} foot={archFoot} />
      <Section eyebrow="Proof" title="One claim, the same on both sites" lead="Each thing we say about the product is a record with a state. This one is read from the same registry the demonstration reads."><LeadClaim asOf={ctx.asOf || new Date().toISOString()} demoUrl={ctx.demoUrl} /></Section>
      <section className="section section--deep"><div className="wrap"><FounderBlock page="home" /></div></section>
      <CtaBand title="See it on your own rooms." body="A guided walk through the scenarios on synthetic data, or a bounded pilot with your rooms and your people."><Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href="/pilot-partners">Pilots and partnerships</a></Actions></CtaBand>
      <div className="wrap"><Note>What you can see today is a demonstration on synthetic data. No customer, partner or device is named or connected, and every measurement shown is labelled modeled, simulated, declared, observed or verified.</Note></div>
    </>
  ) };

  const productPages: Page[] = PRODUCTS.map((p) => ({ path: `/products/${p.slug}`, title: `${p.name} — Empathia Technologies`, description: `${p.name}: ${p.purpose}. ${p.body.split('. ')[0]}.`, body: (
    <div data-p={p.id}>
      <section className="hero hero--product hero--split"><div className="hero__band" aria-hidden="true" /><div className="wrap hero__grid">
        <div className="hero__copy"><p className="label"><span className="dot" aria-hidden="true" />Product {String(PRODUCTS.indexOf(p) + 1).padStart(2, '0')} of 9</p><h1>{p.name}</h1><p className="hero__sub">{p.purpose}</p><p className="lede">{p.body}</p>
          <Actions>{p.demo ? <a className="btn btn--primary" href={demo(p.demo.href)}>{p.demo.label}</a> : null}<a className="btn" href="/request-demo">Request a demonstration</a>{p.id === 'lite' ? <a className="btn btn--quiet" href="#scouter">Scouter, inside Lite</a> : null}</Actions>
          <p className="status-line"><Tag s={DEMO_STATE[p.demoState].s}>{DEMO_STATE[p.demoState].text}</Tag></p></div>
        <div className="hero__aside"><Shot p={p} cap={ctx.captures[p.id]} eager cta={p.demo ? { href: demo(p.demo.href), label: 'Open the interactive demonstration' } : undefined} />
          <ul className="claims" aria-label="What the demonstration shows, with its evidence label">{p.shows.map((t, i) => <li key={t}><Tag s={p.showsAs[i] || 'declared'} /><span>{t}</span></li>)}</ul></div>
      </div></section>
      {p.film && film(p.film) ? <Section title="Watch it">{film(p.film)}</Section> : null}
      <section className="section"><div className="wrap"><div className="facts">
        <div className="facts__shows"><p className="eyebrow">Try it</p><h2>Open it in the demonstration</h2><p>{DEMO_STATE[p.demoState].text}, on synthetic data in your browser. Every value on its screens carries its evidence label; nothing is connected to a live system.</p>
          <Actions>{p.demo ? <a className="btn btn--primary" href={demo(p.demo.href)}>{p.demo.label}</a> : null}<a className="btn" href="/request-demo">Request a guided demonstration</a></Actions></div>
        <div className="facts__limits"><p className="eyebrow">Limits</p><h2>Limits, stated</h2><p>{p.limits}</p></div>
      </div></div></section>
      {p.id === 'search-party' ? <SearchPartyOrigin /> : null}
      {p.id === 'lite' ? <section className="section" id="scouter" aria-labelledby="scouter-h"><div className="wrap"><div className="scouter">
        <div><p className="label">Part of Lite</p><h2 id="scouter-h">Scouter</h2><p>Ask Scouter whether a device suits a room before anyone buys it. It proposes equipment from comparable rooms and checks each proposal against the room’s recorded requirements, not against other products.</p><p>Every proposal states its limits and goes to the discipline engineer, who decides. Nothing is adopted by Scouter itself.</p></div>
        <div><ul className="ticks"><li>Proposals from comparable rooms, with the comparison stated</li><li>Each check against the requirement, with its source</li><li>Engineer review before anything is adopted</li></ul>
          <Actions><a className="btn btn--primary" href={demo('#/v25/build')}>Open Lite in the demonstration</a></Actions></div>
      </div></div></section> : null}
      <Section title="Where it sits in the lifecycle" tone="deep"><EvidenceLine /></Section>
      <Section title="The other products"><ProductTiles captures={ctx.captures} exclude={p.id} compact /></Section>
    </div>
  ) }));

  const pages: Page[] = [
    home,
    { path: '/platform', title: 'Platform — Empathia Technologies', description: 'The Empathia Living Campus platform: one identity for every room, device, person and project; one governed lifecycle; one audit record.', nav: 'Platform', body: (
      <>
        <Hero label="Platform" title="One record. One governed lifecycle." lead="One canonical identity for every room, device, person, project and standard; one governed lifecycle that every product reads from and writes to; one audit record of who did what, with which evidence." />
        {film('FA') ? <Section title="The platform in two minutes">{film('FA')}</Section> : null}
        <Section title="The lifecycle"><EvidenceLine /></Section>
        <Strip id="flow" eyebrow="The workflow" title="Five moves of one record" items={FLOW} flow />
        <Section title="The products"><ProductTiles captures={ctx.captures} /></Section>
        <Section title="The demonstration campus" tone="deep"><Campus /></Section>
        <Section id="executive" title="Executive Intelligence" lead="Projects started and funded, commissioning conformance, open issues, standards alignment and room usage, each measure with its source, its period, its denominator and its coverage. Missing data shows as missing, never as success." />
        <Section title="What runs where" lead="The authenticated application enforces every permission on the server and in the database. The public demonstration runs on synthetic data in your browser. The two never share data." tone="deep"><Note>Integrations with manufacturers' systems are described as simulated, proposed or configured; none is claimed to work until it has been verified with that system.</Note></Section>
        <Strip id="architecture" eyebrow="The architecture" title="Built to be checked" items={ARCH} foot={archFoot} />
        <CtaBand title="Walk the record with us." body="A guided demonstration on synthetic data, with your questions."><Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href={demo()}>Explore the live demo</a></Actions></CtaBand>
      </>
    ) },
    { path: '/products', title: 'Products — Empathia Technologies', description: `The nine Empathia products: ${PRODUCTS.map((p) => p.name).join(', ')}.`, body: (
      <>
        <section className="hero"><div className="wrap"><Spectrum /><p className="label">Products</p><h1>Nine products, one record</h1><p className="lede">Each product is a stage of the same lifecycle. Each page states what the public demonstration shows today, and what it does not. Scouter is part of Lite.</p></div></section>
        <Section title="All nine, in lifecycle order"><ProductTiles captures={ctx.captures} /></Section>
      </>
    ) },
    ...productPages,
    { path: '/solutions', title: 'Solutions — Empathia Technologies', description: 'Empathia for enterprise IT and AV teams, systems integrators, managed service providers and facilities teams.', body: (
      <>
        <Hero label="Solutions" title="The same record, read by each team" lead="The same platform, read through the responsibilities of each team." />
        <Section id="enterprise" title="Enterprise IT and AV" lead="Standards, approvals and funding decisions with their rationale; the commissioning record and the accepted baseline of every room; executive measures that show their denominators." />
        <Section id="integrators" title="Systems integrators" lead="Design revisions with change-impact traceability, an adaptive commissioning plan with the reason for each test, field evidence captured as the work is done, and a documentation packet that is complete when the applicable requirements are met, not when files are uploaded." />
        <Section id="msp" title="Managed service providers" lead="Who covers each room and in what order; work orders with hard gates before dispatch and verified completion; recommissioning as a new baseline version rather than a replaced record." />
        <Section id="facilities" title="Facilities and workplace" lead="Room readiness, service coverage and the right contact, with engineering detail kept where engineers need it." />
        <Strip id="estates" eyebrow="Where it fits" title="Built for the rooms of every estate" items={ESTATES} foot={estatesFoot} />
        <CtaBand title="Bring your team’s questions." body="A guided demonstration on synthetic data, or a bounded pilot with your rooms."><Actions><a className="btn btn--primary btn--lg" href="/request-demo">Request a demonstration</a><a className="btn btn--lg" href="/pilot-partners">Pilots and partnerships</a></Actions></CtaBand>
      </>
    ) },
    { path: '/how-it-works', title: 'How it works — Empathia Technologies', description: 'The governed lifecycle from request to assurance baseline.', nav: 'How it works', body: (
      <>
        <Hero label="How it works" title="From request to accepted baseline" lead="The governed lifecycle the platform is built around, as the demonstration shows it: every transition with an authorized role, the required evidence, a guard, an event and an audit record." />
        <Strip id="flow" eyebrow="In five moves" title="Design, prove, operate, repair, learn" items={FLOW} flow />
        <Section title="Nine steps, one record"><Steps steps={[
          { title: 'Request', body: 'A requestor describes the room, with photos, plans, known dimensions and constraints. Photos follow a stated privacy policy.' },
          { title: 'Acknowledgement and pitch', body: 'The assigned supplier acknowledges; the operations lead assembles a revisioned business case.' },
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
        <Hero label="Technology" title="Built for correctness first" lead="A modular monolith with clear boundaries: the database enforces who may see what, evidence is append-only, and every engine is a deterministic rule system with published test cases." />
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
        <Hero label="Trust" title="Security and trust" lead="What is in place, what is planned, and what we do not claim." />
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
        <SearchPartyStory sp={byId('search-party')} cap={ctx.captures['search-party']} demoHref={demo(byId('search-party').demo?.href)} />
        <Section title="The thinking behind the company" lead="A workplace’s technology is designed, installed, tested, accepted and serviced by different people, and its record is usually scattered across suppliers, spreadsheets and memory. Empathia is built so that record stays whole, and stays honest about what is known." />
        <Section title="The principles Empathia is built on" tone="deep"><Cards cols={3} items={PRINCIPLES} /></Section>
        <section className="band"><div className="wrap"><h2>Talk with the founder.</h2><p>Investor conversations, pilots and partnerships go through Empathia’s enquiry form, marked for the founder.</p><div className="actions"><EnquiryLink source="founder" primary id="founder-band" /></div></div></section>
      </>
    ) },
    { path: '/about', title: 'About — Empathia Technologies', description: 'Empathia Technologies and its founder.', body: (
      <>
        <Hero label="Company" title="About Empathia" lead="Empathia Technologies builds the Living Campus: software that keeps the technology of a workplace honest about its own state." />
        <Section title="Founder" lead="Empathia was founded by Jeremiah Johnson (CTS, CAPM, CompTIA Network+)."><Actions><a className="btn" href="/founder">About the founder</a></Actions></Section>
        <Section id="in-development" title="In Development: Collabora-SING" lead="Collabora-SING is a product in development. Its page sets out a research plan; the pilot has not been run yet."><Actions><a className="btn" href="/collabora-sing">Collabora-SING</a></Actions></Section>
        <Section title="Principles" tone="deep"><Cards cols={3} items={PRINCIPLES} /></Section>
        <Section id="investors" title="Investor conversations" lead="The company, the platform and the demonstration, with the evidence behind each claim."><EnquiryCard source="website-investor" primary /></Section>
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
          { title: 'Telemetry', body: 'Every note is to be stamped at five moments: device event, captured, sent, received and triggered. What one clock times will be labelled measured; what takes two clocks will be labelled estimated.' },
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
    { path: '/request-demo', title: 'Request a demonstration — Empathia Technologies', description: 'Request a guided demonstration of the Empathia Living Campus.', body: (
      <>
        <Hero label="Request a demonstration" title="See it with your questions" lead="A guided walk through the scenarios on synthetic data, for your team and your questions." />
        <Section title="Tell us about your estate">{lead('demo', 'website-demo')}</Section>
      </>
    ) },
    { path: '/pilot-partners', title: 'Pilots and partnerships — Empathia Technologies', description: 'Pilot the Empathia Living Campus on a bounded scope with your own rooms and people, or partner with Empathia.', body: (
      <>
        <Hero label="Pilots and partnerships" title="A bounded pilot, with a factual report" lead="An agreed set of rooms and people, the authenticated application, your standards, your evidence, and a readiness report at the end that states what was verified and what was not." />
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
        <Section title="This website" lead="The site itself sets no cookies and loads nothing from third parties. Films on this site load only when you press play, from this site. Your colour theme choice, if you make one, is kept in your own browser and never sent anywhere." />
        {ctx.api
          ? <Section id="enquiries" title="Enquiries" lead="The forms on this build send what you type (your name, organization, email and message) to Empathia's own service, where it is stored for the purpose of answering you." />
          : <section id="enquiries" className="section"><div className="wrap"><div className="section__head"><h2>Enquiries</h2><p className="section__lead">Enquiries use a form hosted by Tally (tally.so), opened in a new tab. Nothing you type in it passes through this site.</p></div>
            <ul className="ticks">
              <li>The form collects your name, business email, organization, job title (optional), area of interest, timeline (optional), your message and your acknowledgement.</li>
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
      <Hero label="Films" title="Watch the record being made" lead="Each film is recorded from the demonstration or illustrates a scenario, and says which. Every one has captions and a transcript." />
      {indexFilms.map((f) => <Section key={f.key} title={f.title} lead={f.summary}>{film(f.key)}</Section>)}
      {pending.length ? <Section title={hasFilms ? 'Coming to this page' : 'The films'} lead="These films are made. Each is published here only once its rights for the website are confirmed; until then, the demonstration itself is the best way to see the product." tone={hasFilms ? 'deep' : undefined}>
        <div className="filmcards">{pending.map((f, i) => <FilmPending key={f.key} film={f} n={i + 1} />)}</div>
        <Actions><a className="btn btn--primary" href={demo()}>Explore the live demo</a><a className="btn" href="/request-demo">Request a guided demonstration</a></Actions>
      </Section> : null}
    </>
  ) });
  pages.splice(pages.findIndex((p) => p.path === '/request-demo'), 0, ...commercialPages());   // v18/pilot: the price list and the pilot packages
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
        <Actions><a className="btn btn--primary btn--lg" href="/">Back to the home page</a><a className="btn btn--lg" href="/products">All nine products</a></Actions>
        <ul className="lost__dest" aria-label="Main destinations">{[['/', 'Home', 'Every room, every device, every decision, with its evidence.'], ['/platform', 'Platform', 'One record and one governed lifecycle, read by every product.'], ['/products', 'Products', 'The nine products, in lifecycle order.'], ['/how-it-works', 'How it works', 'From request to accepted baseline.'], ['/founder', 'Founder', 'The person and the thinking behind the company.'], ['/request-demo', 'Request a demonstration', 'A guided walk through the scenarios on synthetic data.']].map(([h, t, d]) => <li key={h}><a href={h}><b>{t}</b><span>{d}</span><i aria-hidden="true">→</i></a></li>)}</ul>
      </div>
      <img className="lost__owl" src="/brand/owl.svg" width={300} height={300} alt="" data-owl />
    </div></section>
  ) };
}
