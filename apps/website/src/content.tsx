// The public Empathia Technologies site: every page's content. Nothing here may name a customer, a partner, a certification of the
// company, an award, revenue or a measured outcome; everything shown runs on synthetic data and says so. Claims are limited to what
// the repository demonstrates (docs/legacy-parity.md). The founder's credentials are exactly the three the founder supplied.
import React from 'react';
import { LeadForm } from './form.js';
import { Hero, Section, Cards, Steps, Note, Actions, Tag, EVIDENCE, EvidenceLine, RecordCard, FilmPlayer, Portrait, Credentials, FOUNDER_QUOTE, type Evidence, type Film } from './ui.js';

export interface Page { path: string; title: string; description: string; nav?: string; body: React.ReactNode; }
export interface SiteContext { films: Film[]; transcripts: Record<string, string[]>; demoUrl: string; preview: boolean }

/** The products, by what each does in the demonstrated lifecycle, with where the public demonstration shows it and how far it is. */
export interface Product { slug: string; name: string; purpose: string; body: string; shows: string[]; limits: string; demo?: { href: string; label: string }; demoState: 'native' | 'partial' | 'not-in-demo' | 'app-only'; film?: string }
export const PRODUCTS: Product[] = [
  { slug: 'lite', name: 'Lite — Build a Room', purpose: 'Spatial room design on the real engine', body: 'A conceptual room model from an archetype, dimensions, plans and photos. Geometry carries its provenance: extracted, inferred, simulated, field-measured or engineer-approved — never promoted silently. Coverage is predicted and labelled modeled.',
    shows: ['Drawing a room from an archetype and its dimensions', 'Seats, displays, cameras and microphones placed in plan and 3D', 'Modeled coverage with the assumptions stated'], limits: 'Predictions are modeled values; a calibrated instrument measures. Photo and plan extraction are not part of the public demonstration.', demo: { href: '#/v25/build', label: 'Open Build a Room' }, demoState: 'native' },
  { slug: 'scouter', name: 'Scouter', purpose: 'Equipment proposals from comparable rooms', body: 'Equipment shortlists and standardization proposals from comparable rooms, with the limits stated. A proposal is reviewed by the discipline engineer before anything is deployed.',
    shows: ['Comparable-room reasoning, with its limits', 'Engineer review before anything is adopted'], limits: 'Scouter has not been rebuilt in the new demonstration yet; its original V2.5.3 pages are being migrated.', demoState: 'not-in-demo' },
  { slug: 'commissioning', name: 'Universal Commissioning', purpose: 'Adaptive test plans, evidence and independent verification', body: 'An adaptive test plan compiled from the project type, the room, the device inventory, the approved design and the standard versions — with the reason for every test. Failed tests open deficiencies; nothing is accepted on the word of the person who did the work.',
    shows: ['The plan with why each test applies, and why others do not', 'A blocked approval that names every unresolved item', 'Retest, independent verification and acceptance'], limits: 'Test results in the demonstration are synthetic; no instrument is connected.', demo: { href: '#/v25/build?tab=checks', label: 'Open the commissioning plan' }, demoState: 'native', film: 'F02P' },
  { slug: 'assurance-apex', name: 'Assurance and APEX', purpose: 'Accepted baselines, drift, and cited diagnosis', body: 'An accepted commissioning result becomes the room\'s baseline, and drift is read against it. The platform is designed to keep every baseline version, the original acceptance never overwritten. APEX ranks hypotheses with their evidence and says why each is not yet proven.',
    shows: ['A room carried to an accepted baseline, and recommissioned to the next', 'Ranked hypotheses with cited evidence and bounded action tiers'], limits: 'Baseline history and recommissioning pages are partly migrated; APEX runs on simulated evidence.', demo: { href: '#/v25/apex', label: 'Open APEX' }, demoState: 'partial' },
  { slug: 'search-party', name: 'Search Party', purpose: 'Relationships across rooms, devices, people and projects', body: 'One search across people, rooms, devices, projects, standards and documents, with the relationships between them: who owns this, who covers it, what depends on it — each relationship with its source and freshness.',
    shows: ['“If this switch fails, what is affected?”', 'Recorded relationships with provenance; unknown edges shown as unknown'], limits: 'Relationships are recorded in the synthetic estate; no network discovery runs.', demo: { href: '#/search?focus=NetworkNode:SW-ATL-4A', label: 'Ask what depends on a switch' }, demoState: 'native' },
  { slug: 'servicehands', name: 'ServiceHands', purpose: 'Work orders closed with evidence and a verified retest', body: 'Issues become work orders, closed with field evidence and resolved only by a verified retest. A technician sees the sites assigned, nothing else; eligibility and the context of the room travel with the job.',
    shows: ['The service context packet: the room, its dependencies, its baseline', 'Corrective action, retest and closure'], limits: 'Dispatch, scheduling and notifications are demonstrated on synthetic people and sites.', demo: { href: '#/v25/service', label: 'Open ServiceHands' }, demoState: 'native' },
  { slug: 'field-intelligence', name: 'Field Intelligence', purpose: 'What a collector declares, what a check observes, what is verified', body: 'Every observation is labelled declared, observed, verified, modeled, unknown or unavailable. A device that answers is not a room that works; the plan keeps every pair untested until evidence arrives.',
    shows: ['Collector facts as declared, with their limits', 'Plan versus executed, with nothing filled in', 'An optional physical-validation flow, simulated'], limits: 'No collector is connected in the public demonstration; physical validation is simulated.', demo: { href: '#/v25/fi', label: 'Open Field Intelligence' }, demoState: 'native', film: 'IE' },
  { slug: 'learn', name: 'Learn and SIGNAL', purpose: 'Reviewed cases and training from what actually happened', body: 'A case needs permission, de-identification, a subject-matter review and approval before it teaches anyone. Lessons, labs and the SIGNAL story link to competencies — and training never grants authority.',
    shows: ['Reviewed cases linked to lessons and competencies', 'SIGNAL lessons, labs and drills from V1.4.1'], limits: 'Three SIGNAL episodes are playable in the V2.5.3 source; the twelve-season corpus is not yet produced as playable media, and narration is not yet cleared for public use.', demo: { href: '#/v25/learn', label: 'Open Learn' }, demoState: 'partial' },
  { slug: 'pro', name: 'Pro and Mission Control', purpose: 'The whole lifecycle, every station counted', body: 'Mission Control counts live records at every station from intake to service. Executive intelligence shows its work: each measure with its numerator, denominator, window, coverage and freshness, and missing data shown as missing.',
    shows: ['Mission Control across the lifecycle', 'Executive measures with their denominators', 'The ledger behind every state'], limits: 'The Pro command centre, operations hub and standards pages are still being migrated.', demo: { href: '#/v25', label: 'Open Mission Control' }, demoState: 'partial' },
];
const DEMO_STATE: Record<Product['demoState'], { text: string; s: Evidence }> = {
  native: { text: 'In the public demonstration', s: 'observed' }, partial: { text: 'Partly in the public demonstration', s: 'declared' },
  'not-in-demo': { text: 'Not yet in the public demonstration', s: 'unknown' }, 'app-only': { text: 'In the authenticated application only', s: 'declared' },
};

const AUDIENCES = [
  { title: 'CIOs and CTOs', body: 'One accountable record for the technology estate: what was approved, funded, installed, proved and accepted.', href: '/solutions#enterprise' },
  { title: 'AV systems integrators', body: 'Design, commissioning and handoff with the evidence the customer will ask for, generated as the work is done.', href: '/solutions#integrators' },
  { title: 'Managed service providers', body: 'Coverage, dispatch and verified repair against a baseline the customer accepted.', href: '/solutions#msp' },
  { title: 'Facilities and workplace teams', body: 'Room readiness, service coverage and who to call — without the engineering detail they do not need.', href: '/solutions#facilities' },
];

export function buildPages(ctx: SiteContext): Page[] {
  const film = (key: string, lead?: boolean) => { const f = ctx.films.find((x) => x.key === key); return f ? <FilmPlayer film={f} transcript={ctx.transcripts[key] || []} lead={lead} /> : null; };
  const demo = (href = '#/investor') => ctx.demoUrl + '/' + href;
  const hasFilms = ctx.films.length > 0;
  const home: Page = { path: '/', title: 'Empathia Technologies — every room, every device, every decision, with its evidence', description: 'Empathia Living Campus connects the request, design, commissioning, service and assurance of every room into one record of what actually happened — and labels what is declared, modeled, observed and verified.', nav: 'Home', body: (
    <>
      <section className="hero hero--home"><div className="wrap hero__grid">
        <div className="hero__copy">
          <p className="label">Empathia Living Campus</p>
          <h1 className="display"><span>Every room.</span> <span>Every device.</span> <span>Every decision.</span> <span>With its evidence.</span></h1>
          <p className="lede">The request, the design, the commissioning tests, the service work and the accepted baseline of every room — connected in one record of what actually happened, and honest about what is only declared or modeled.</p>
          <Actions><a className="btn btn--primary" href="/request-demo">Request a demonstration</a><a className="btn" href={demo()}>Explore the live demo</a></Actions>
        </div>
        <div className="hero__aside">{film('M2', true) || <RecordCard />}</div>
      </div>
      <div className="wrap"><EvidenceLine /></div></section>
      <Section title="Three ways into the same record" lead="Design a room, operate it, and learn from it — each step adds to one record instead of starting another spreadsheet.">
        <Cards items={[
          { title: 'Design', body: 'Requests become briefs, rooms are drawn with the provenance of every dimension, equipment is proposed from comparable rooms and approved by the engineer who answers for it.', href: '/products/lite', meta: <Tag s="modeled" /> },
          { title: 'Operate', body: 'Commissioning proves the room, an independent reviewer accepts it, and service work is closed against that accepted baseline — not against a technician\'s word.', href: '/products/commissioning', meta: <Tag s="verified" /> },
          { title: 'Learn', body: 'What happened in the field becomes reviewed cases, labs and the SIGNAL story, linked to competencies — without ever granting authority by itself.', href: '/products/learn', meta: <Tag s="observed" /> },
        ]} />
      </Section>
      <Section title="Six words the product will not blur" lead="Every value on every screen carries one of these labels. Most tools collapse them; Empathia keeps them apart so a decision can be traced to what was actually known." tone="deep">
        <dl className="states">{(Object.keys(EVIDENCE) as Evidence[]).map((s) => <div key={s}><dt><Tag s={s} /></dt><dd>{EVIDENCE[s].meaning}</dd></div>)}</dl>
      </Section>
      <Section title="The products, one lifecycle" lead="Each product is a stage of the same governed lifecycle and shares one identity for every room, device, person and project. Each page says how much of it you can see in the public demonstration today.">
        <Cards cols={3} items={PRODUCTS.map((p) => ({ title: p.name, body: p.purpose, href: `/products/${p.slug}`, meta: <Tag s={DEMO_STATE[p.demoState].s}>{DEMO_STATE[p.demoState].text}</Tag> }))} />
      </Section>
      <Section title="Who it is for"><Cards cols={4} items={AUDIENCES} /></Section>
      <Section title="Founder" tone="warm">
        <div className="founder-row">
          <Portrait size="sm" />
          <div><p className="founder-row__name">Jeremiah Johnson</p><p className="founder-row__role">Founder, Empathia Technologies</p><Credentials /><blockquote className="quote"><p>{FOUNDER_QUOTE}</p></blockquote><a className="btn" href="/founder">About the founder</a></div>
        </div>
      </Section>
      <section className="band"><div className="wrap band__in"><h2>See it on your own rooms.</h2><p>A guided walk through the scenarios on synthetic data, or a bounded pilot with your rooms and your people.</p><Actions><a className="btn btn--primary" href="/request-demo">Request a demonstration</a><a className="btn" href="/pilot-partners">Pilot partnerships</a></Actions></div></section>
      <div className="wrap"><Note>What you can see today is a demonstration on synthetic data. No customer, partner or device is named or connected, and every measurement shown is labelled modeled, simulated, declared, observed or verified.</Note></div>
    </>
  ) };

  const productPages: Page[] = PRODUCTS.map((p) => ({ path: `/products/${p.slug}`, title: `${p.name} — Empathia Technologies`, description: `${p.name}: ${p.purpose}. ${p.body.split('. ')[0]}.`, body: (
    <>
      <Hero label="Product" title={p.name} lead={p.body}><Actions>{p.demo ? <a className="btn btn--primary" href={demo(p.demo.href)}>{p.demo.label}</a> : null}<a className="btn" href="/request-demo">Request a demonstration</a></Actions><p className="status-line"><Tag s={DEMO_STATE[p.demoState].s}>{DEMO_STATE[p.demoState].text}</Tag></p></Hero>
      {p.film && film(p.film) ? <Section title="Watch it">{film(p.film)}</Section> : null}
      <Section title="What the demonstration shows"><ul className="ticks">{p.shows.map((s) => <li key={s}>{s}</li>)}</ul></Section>
      <Section title="Limits, stated" lead={p.limits} tone="deep" />
      <Section title="Where it sits in the lifecycle"><EvidenceLine /></Section>
      <Section title="The other products"><Cards cols={4} items={PRODUCTS.filter((x) => x.slug !== p.slug).map((x) => ({ title: x.name, body: x.purpose, href: `/products/${x.slug}` }))} /></Section>
    </>
  ) }));

  const pages: Page[] = [
    home,
    { path: '/platform', title: 'Platform — Empathia Technologies', description: 'The Empathia Living Campus platform: one identity for every room, device, person and project; one governed lifecycle; one audit record.', nav: 'Platform', body: (
      <>
        <Hero label="Platform" title="One record. One governed lifecycle." lead="One canonical identity for every room, device, person, project and standard; one governed lifecycle that every product reads from and writes to; one audit record of who did what, with which evidence." />
        {film('FA') ? <Section title="The platform in two minutes">{film('FA')}</Section> : null}
        <Section title="The lifecycle"><EvidenceLine /></Section>
        <Section title="The products"><Cards cols={3} items={PRODUCTS.map((p) => ({ title: p.name, body: p.body, href: `/products/${p.slug}`, meta: <Tag s={DEMO_STATE[p.demoState].s}>{DEMO_STATE[p.demoState].text}</Tag> }))} /></Section>
        <Section id="executive" title="Executive Intelligence" lead="Projects started and funded, commissioning conformance, open issues, standards alignment and room usage — each metric with its source, its period, its denominator and its coverage. Missing data shows as missing, never as success." />
        <Section title="What runs where" lead="The authenticated application enforces every permission on the server and in the database. The public demonstration runs on synthetic data in your browser. The two never share data." tone="deep"><Note>Integrations with manufacturers' systems are described as simulated, proposed or configured; none is claimed to work until it has been verified with that system.</Note></Section>
      </>
    ) },
    { path: '/products', title: 'Products — Empathia Technologies', description: 'The Empathia products: Lite, Scouter, Universal Commissioning, Assurance and APEX, Search Party, ServiceHands, Field Intelligence, Learn and SIGNAL, Pro and Mission Control.', nav: 'Products', body: (
      <>
        <Hero label="Products" title="Nine products, one record" lead="Each product is a stage of the same lifecycle. Each page states what the public demonstration shows today, and what it does not." />
        <Section title="All products"><Cards cols={3} items={PRODUCTS.map((p) => ({ title: p.name, body: p.purpose, href: `/products/${p.slug}`, meta: <Tag s={DEMO_STATE[p.demoState].s}>{DEMO_STATE[p.demoState].text}</Tag> }))} /></Section>
      </>
    ) },
    ...productPages,
    { path: '/solutions', title: 'Solutions — Empathia Technologies', description: 'Empathia for enterprise IT and AV teams, systems integrators, managed service providers and facilities teams.', nav: 'Solutions', body: (
      <>
        <Hero label="Solutions" title="The same record, read by each team" lead="The same platform, read through the responsibilities of each team." />
        <Section id="enterprise" title="Enterprise IT and AV" lead="Standards, approvals and funding decisions with their rationale; the commissioning record and the accepted baseline of every room; executive metrics that show their denominators." />
        <Section id="integrators" title="Systems integrators" lead="Design revisions with change-impact traceability, an adaptive commissioning plan with the reason for each test, field evidence captured as the work is done, and a documentation packet that is complete when the applicable requirements are met — not when files are uploaded." />
        <Section id="msp" title="Managed service providers" lead="Who covers each room and in what order; work orders with eligibility, preflight and verified completion; recommissioning as a new baseline version rather than a replaced record." />
        <Section id="facilities" title="Facilities and workplace" lead="Room readiness, service coverage and the right contact, with engineering detail kept where engineers need it." />
      </>
    ) },
    { path: '/how-it-works', title: 'How it works — Empathia Technologies', description: 'The governed lifecycle from request to assurance baseline.', nav: 'How it works', body: (
      <>
        <Hero label="How it works" title="From request to accepted baseline" lead="The governed lifecycle the platform is built around, as the demonstration shows it: every transition with an authorized persona, the required evidence, a guard, an event and an audit record." />
        <Section title="Nine steps, one record"><Steps steps={[
          { title: 'Request', body: 'A requestor describes the room, with photos, plans, known dimensions and constraints. Photos follow a stated privacy policy.' },
          { title: 'Acknowledgement and pitch', body: 'The assigned supplier acknowledges; the operations lead assembles a revisioned business case.' },
          { title: 'Approval, then funding', body: 'An eligible executive approves, holds or rejects with rationale. Funding is a separate authority with an amount and an expiry. Neither can be given by the author.' },
          { title: 'Engineering brief and design', body: 'The operations lead and the systems engineer sign off scope; design revisions carry geometry provenance and change impact.' },
          { title: 'Equipment and standards', body: 'Scouter proposes compatible equipment and reviewed configuration standards; a discipline engineer decides.' },
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
          { title: 'One canonical data model', body: 'One record for every room, device, person and project, with stable identifiers and revisioned room designs. The measurement model (unit, provenance, validation, reviewer on every field) is specified and on the build plan.' },
          { title: 'Authorization in the database', body: 'Tenant and site scope enforced with PostgreSQL row-level security as well as in the API; a role switch in the interface grants nothing.' },
          { title: 'Append-only evidence and audit', body: 'Evidence and audit records cannot be edited or deleted by the application roles; events are written in the same transaction as the change and delivered by a worker with retries.' },
          { title: 'Typed contracts', body: 'An OpenAPI document generated from the route table, a generated typed client, JSON Schemas for events and records.' },
          { title: 'Engines with golden tests', body: 'The commissioning and assurance engines are deterministic rule systems with published parity cases — not trained models.' },
          { title: 'Connectors by capability', body: 'Adapters declare what they can observe or do and carry an honest state; today every adapter is a mock or a contract, and none is claimed to work with a manufacturer\'s system. The field-collector design is outbound-only: the web application never executes remote commands.' },
        ]} /></Section>
      </>
    ) },
    { path: '/trust', title: 'Security and trust — Empathia Technologies', description: 'What Empathia does and does not claim about security, privacy and compliance.', nav: 'Trust', body: (
      <>
        <Hero label="Trust" title="Security and trust" lead="What is in place, what is planned, and what we do not claim." />
        <Section title="In place in the product"><Cards cols={3} items={[
          { title: 'Server-side authorization', body: 'Every API operation, search, file read and background job checks the actor, the tenant, the site and the role. Negative tests cover cross-tenant and cross-site access.' },
          { title: 'Private evidence storage', body: 'Evidence files are stored privately, hashed on upload and re-verified on every read; a download is authorized against the caller\'s tenant and site scope.' },
          { title: 'Audit', body: 'Administrative and workflow actions are recorded append-only with the actor and the time.' },
        ]} /></Section>
        <Section title="Planned, not yet in place" lead="Signed, short-lived download links from object storage; an enterprise identity provider with MFA; versioned assurance baselines; the measurement model; verified manufacturer adapters. Each is on the build plan and will be described here only once it is tested." />
        <Section title="What we do not claim" lead="Empathia holds no SOC 2, ISO 27001 or HIPAA certification. No external security assessment of the platform has been completed. No manufacturer integration is claimed to work until verified with that manufacturer's system. The demonstrations use synthetic data only." tone="deep" />
        <Section title="Privacy" lead="Room photos and recordings are processed only under a tenant-approved policy with consent; nothing is sent to an external AI service without an agreement. See the privacy notice."><Actions><a className="btn" href="/privacy">Privacy notice</a></Actions></Section>
      </>
    ) },
    { path: '/founder', title: 'Jeremiah Johnson, founder — Empathia Technologies', description: 'Jeremiah Johnson founded Empathia Technologies. CTS (AVIXA), CAPM (PMI), CompTIA Network+.', nav: 'Founder', body: (
      <>
        <section className="hero hero--founder"><div className="wrap founder">
          <Portrait size="lg" />
          <div className="founder__text">
            <p className="label">Founder</p>
            <h1>Jeremiah Johnson</h1>
            <p className="founder__role">Founder, Empathia Technologies</p>
            <Credentials />
            <blockquote className="quote quote--lg"><p>{FOUNDER_QUOTE}</p></blockquote>
          </div>
        </div></section>
        <Section title="Why Empathia" lead="Jeremiah founded Empathia after enterprise AV, IT and service delivery work in which the record of a room — what was designed, installed, tested and accepted — was scattered across suppliers, spreadsheets and memory. Empathia is the record, and the workflow that keeps it true." />
        <Section title="What he holds himself to" tone="deep"><Cards cols={3} items={[
          { title: 'Say what the evidence supports', body: 'Every state in the product has a guard, an actor and an event behind it, and the product labels what is declared, modeled, measured or verified.' },
          { title: 'Authority is explicit', body: 'No one approves their own work; no simulated result becomes an engineering fact; no suggestion becomes an action by itself.' },
          { title: 'Preserve the history', body: 'Evidence is append-only, room designs are revisioned, decisions keep their rationale — and a baseline, once accepted, is never to be overwritten.' },
        ]} /></Section>
        <section className="band"><div className="wrap band__in"><h2>Talk to the founder.</h2><p>Demonstrations, pilots and investor conversations.</p><Actions><a className="btn btn--primary" href="/request-demo">Request a demonstration</a><a className="btn" href="/contact">Contact</a></Actions></div></section>
      </>
    ) },
    { path: '/about', title: 'About — Empathia Technologies', description: 'Empathia Technologies and its founder.', body: (
      <>
        <Hero label="Company" title="About Empathia" lead="Empathia Technologies builds the Living Campus: software that keeps the technology of a workplace honest about its own state." />
        <Section title="Founder" lead="Empathia was founded by Jeremiah Johnson (CTS, CAPM, CompTIA Network+)."><Actions><a className="btn" href="/founder">About the founder</a></Actions></Section>
        <Section title="Principles"><Cards cols={3} items={[
          { title: 'Say what the evidence supports', body: 'Every state in the product has a guard, an actor and an event behind it, and the product labels what is declared, modeled, measured or verified.' },
          { title: 'Authority is explicit', body: 'No one approves their own work; no simulated result becomes an engineering fact; no suggestion becomes an action by itself.' },
          { title: 'Preserve the history', body: 'Evidence is append-only, room designs are revisioned, decisions keep their rationale — and a baseline, once accepted, is never to be overwritten.' },
        ]} /></Section>
      </>
    ) },
    { path: '/request-demo', title: 'Request a demonstration — Empathia Technologies', description: 'Request a guided demonstration of the Empathia Living Campus.', nav: 'Request demo', body: (
      <>
        <Hero label="Request a demonstration" title="See it with your questions" lead="A guided walk through the seven scenarios on synthetic data, for your team and your questions." />
        <Section title="Tell us about your estate"><LeadForm kind="demo" /></Section>
      </>
    ) },
    { path: '/pilot-partners', title: 'Pilot partnerships — Empathia Technologies', description: 'Pilot the Empathia Living Campus on a bounded scope with your own rooms and people.', nav: 'Pilots', body: (
      <>
        <Hero label="Pilots" title="A bounded pilot, with a factual report" lead="An agreed set of rooms and people, the authenticated application, your standards, your evidence — and a readiness report at the end that states what was verified and what was not." />
        <Section title="What a pilot includes"><Cards cols={3} items={[
          { title: 'Scope', body: 'A site or a building, the personas involved, the lifecycle stages in scope.' },
          { title: 'Data', body: 'Your rooms, devices and standards entered through the product; no customer data leaves your tenant.' },
          { title: 'Readiness report', body: 'A factual account of what the pilot verified, with the tests and the evidence, and what remains.' },
        ]} /></Section>
        <Section title="Start the conversation"><LeadForm kind="pilot" /></Section>
      </>
    ) },
    { path: '/contact', title: 'Contact — Empathia Technologies', description: 'Contact Empathia Technologies.', nav: 'Contact', body: (
      <>
        <Hero label="Contact" title="Write to us" lead="Questions about the platform, pilots or investor demonstrations." />
        <Section title="How messages are handled" lead="The form stores your message with Empathia's own service when this site's lead endpoint is configured; until then it says so and cannot send. Postal and email addresses are published here once the company's public contact details are approved for release." />
        <Section title="Your message"><LeadForm kind="contact" /></Section>
      </>
    ) },
    { path: '/privacy', title: 'Privacy notice — Empathia Technologies', description: 'How Empathia Technologies handles personal data on this site.', body: (
      <>
        <Hero label="Privacy" title="Privacy notice" lead="What this website collects, and what it does with it." />
        <Section title="This website" lead="The site itself sets no tracking cookies and loads nothing from third parties. Films on this site load only when you press play, from this site. The forms send what you type — your name, organization, email and message — to Empathia's own service, where it is stored for the purpose of answering you. Analytics, if enabled, run only with your consent." />
        <Section title="The product" lead="In the authenticated application, personal data is scoped to the tenant that owns it, authorized on every read, and retained under the tenant's policy. Room photos and recordings are processed only with the tenant's approved policy and the consent it requires." />
        <Section title="Your rights" lead="You may ask what we hold about you and ask for it to be corrected or deleted by writing to us through the contact page." />
      </>
    ) },
    { path: '/legal', title: 'Legal — Empathia Technologies', description: 'Legal notices for the Empathia Technologies website.', body: (
      <>
        <Hero label="Legal" title="Legal" lead="Notices for this website." />
        <Section title="Demonstrations" lead="All demonstrations run on synthetic data. Every person, organization, room, device, figure and approval in them is invented. Roles and permissions in the demonstration are a front-end illustration of a policy, not security." />
        <Section title="Names" lead="Product names of other companies, where they appear in the product, identify categories of equipment or systems; no affiliation, partnership or endorsement is implied, and no integration is claimed to work until verified." />
        <Section title="Intellectual property" lead="The Empathia Living Campus software, its engines, documentation and demonstrations are the property of Empathia Technologies." />
        <Section title="Accessibility" lead="This site aims at WCAG 2.2 AA: keyboard navigation, visible focus, text contrast of at least 4.5:1, captions and transcripts for every film, and no motion for readers who ask for reduced motion. Tell us through the contact page if something does not work for you." />
      </>
    ) },
  ];
  if (hasFilms) pages.splice(pages.findIndex((p) => p.path === '/technology'), 0, { path: '/films', title: 'Films — Empathia Technologies', description: 'Films of the Empathia Living Campus, with captions and transcripts.', nav: 'Films', body: (
    <>
      <Hero label="Films" title="Watch the record being made" lead="Each film is recorded from the demonstration or illustrates a scenario, and says which. Every one has captions and a transcript." />
      {ctx.films.map((f) => <Section key={f.key} title={f.title} lead={f.summary}>{film(f.key)}</Section>)}
    </>
  ) });
  return pages;
}
