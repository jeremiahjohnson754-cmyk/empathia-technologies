// The public Empathia Technologies site: every page's content, as data and small React fragments. Nothing here may name a customer,
// a partner, a certification, an award, revenue or a measured outcome; everything shown runs on synthetic data and says so.
// Claims are limited to what the repository demonstrates (see docs/legacy-parity.md and EMPATHIA_MASTER_COMPLETION_REPORT.md).
import React from 'react';
import { LeadForm } from './form.js';

export interface Page { path: string; title: string; description: string; nav?: string; body: React.ReactNode; }

const Hero = ({ kicker, title, lead, children }: { kicker?: string; title: string; lead: string; children?: React.ReactNode }) => (
  <section className="hero"><div className="wrap">{kicker ? <p className="kicker">{kicker}</p> : null}<h1>{title}</h1><p className="lead">{lead}</p>{children}</div></section>
);
const Section = ({ id, title, lead, children }: { id?: string; title: string; lead?: string; children?: React.ReactNode }) => (
  <section id={id} className="section"><div className="wrap"><h2>{title}</h2>{lead ? <p className="lead-sm">{lead}</p> : null}{children}</div></section>
);
const Grid = ({ items }: { items: { title: string; body: string; href?: string }[] }) => (
  <div className="grid">{items.map((it) => (
    <article key={it.title} className="tile"><h3>{it.href ? <a href={it.href}>{it.title}</a> : it.title}</h3><p>{it.body}</p></article>
  ))}</div>
);
const Steps = ({ steps }: { steps: { title: string; body: string }[] }) => (
  <ol className="steps">{steps.map((s, i) => <li key={s.title}><span className="n">{i + 1}</span><div><h3>{s.title}</h3><p>{s.body}</p></div></li>)}</ol>
);
const Note = ({ children }: { children: React.ReactNode }) => <p className="note">{children}</p>;

/** The seven operational products, described by what they do in the demonstrated lifecycle. */
export const PRODUCTS = [
  { title: 'Intake Portal', body: 'A room request with photos, plans, known dimensions and constraints becomes an engineering brief. Approval, funding and engineering authorization are separate decisions by separate people, each bound to a scope revision.', href: '/platform#intake' },
  { title: 'Build a Room with Lite', body: 'A conceptual room model from an archetype, dimensions, plans and photos. Geometry carries its provenance: extracted, inferred, simulated, field-measured or engineer-approved — never promoted silently.', href: '/platform#lite' },
  { title: 'Scouter', body: 'Equipment shortlists and standardization proposals from comparable rooms, with the limits stated. A proposal is reviewed by the discipline engineer before anything is deployed.', href: '/platform#scouter' },
  { title: 'Universal Commissioning', body: 'An adaptive test plan compiled from the project type, the room, the device inventory, the approved design and the standard versions — with the reason for every test. Failed tests open deficiencies; nothing is verified by the person who ran it.', href: '/platform#commissioning' },
  { title: 'Search Party', body: 'One search across people, rooms, devices, projects, standards and documents, with the relationships between them: who owns this, who covers it, what depends on it.', href: '/platform#search-party' },
  { title: 'ServiceHands', body: 'Issues become work orders with hard-gated eligibility, dispatch preflight, field evidence and independent verification. A technician sees the sites and work assigned, nothing else.', href: '/platform#servicehands' },
  { title: 'Assurance and APEX', body: 'An accepted commissioning result becomes a versioned baseline. Drift, incidents and repairs create new versions; the original acceptance is never overwritten. APEX diagnosis is advisory, with its evidence and its uncertainty.', href: '/platform#assurance' },
];

export const PAGES: Page[] = [
  { path: '/', title: 'Empathia Technologies', description: 'Empathia Living Campus: an operating platform for the rooms, devices and people of an enterprise campus — from request to commissioning to assurance, with evidence at every step.', nav: 'Home', body: (
    <>
      <Hero kicker="Empathia Living Campus" title="Every room, every device, every decision — with its evidence." lead="Empathia is an operating platform for enterprise AV, collaboration and workplace technology: the request, the design, the commissioning tests, the service work and the assurance baseline of every room, connected in one record of what actually happened.">
        <div className="cta"><a className="btn primary" href="/request-demo">Request a demonstration</a><a className="btn" href="/platform">See the platform</a></div>
        <Note>What you can see today is a demonstration on synthetic data. No customer, partner or device is named or connected, and every measurement shown is labelled as modeled, simulated or declared.</Note>
      </Hero>
      <Section title="Seven operational products, one lifecycle" lead="Each product is a stage of the same governed lifecycle, sharing one identity for every room, device, person and project."><Grid items={PRODUCTS} /></Section>
      <Section title="Built on evidence, not on claims" lead="The platform distinguishes what is declared, what is modeled, what is measured and what is verified — and says so on every screen.">
        <Grid items={[
          { title: 'Declared is not verified', body: 'A configuration file says a camera exists; a commissioning test proves it is where the design says.' },
          { title: 'Modeled is not measured', body: 'Lite predicts coverage from geometry; a calibrated instrument measures it. The two are never confused.' },
          { title: 'Reachability is not performance', body: 'A device that answers a ping is not a room that works. Health is read from evidence, not from telemetry alone.' },
          { title: 'An AI recommendation is not an approved action', body: 'Suggestions cite their sources and their uncertainty; a person with the authority decides.' },
        ]} />
      </Section>
      <Section title="Who it is for"><Grid items={[
        { title: 'CIOs and CTOs', body: 'One accountable record for the technology estate: what was approved, funded, installed, proved and accepted.', href: '/solutions#enterprise' },
        { title: 'AV systems integrators', body: 'Design, commissioning and handoff with the evidence the customer will ask for, generated as the work is done.', href: '/solutions#integrators' },
        { title: 'Managed service providers', body: 'Coverage, dispatch and verified repair against a baseline the customer accepted.', href: '/solutions#msp' },
        { title: 'Facilities and workplace teams', body: 'Room readiness, service coverage and who to call — without the engineering detail they do not need.', href: '/solutions#facilities' },
      ]} /></Section>
    </>
  ) },
  { path: '/platform', title: 'Platform — Empathia Technologies', description: 'The Empathia Living Campus platform: Intake, Build a Room with Lite, Scouter, Universal Commissioning, Search Party, ServiceHands, Assurance and APEX, Executive Intelligence.', nav: 'Platform', body: (
    <>
      <Hero title="The platform" lead="One canonical identity for every room, device, person, project and standard; one governed lifecycle that every product reads from and writes to; one audit record of who did what, with which evidence." />
      {PRODUCTS.map((p) => <Section key={p.title} id={p.href.split('#')[1]} title={p.title} lead={p.body} />)}
      <Section id="executive" title="Executive Intelligence" lead="Projects started and funded, commissioning conformance, open issues, standards alignment and room usage — each metric with its source, its period, its denominator and its coverage. Missing data shows as missing, never as success." />
      <Section title="What runs where" lead="The authenticated application enforces every permission on the server and in the database. The public demonstration runs on synthetic data in your browser. The two never share data."><Note>Integrations with manufacturers' systems are described as simulated, proposed or configured; none is claimed to work until it has been verified with that system.</Note></Section>
    </>
  ) },
  { path: '/solutions', title: 'Solutions — Empathia Technologies', description: 'Empathia for enterprise IT and AV teams, systems integrators, managed service providers and facilities teams.', nav: 'Solutions', body: (
    <>
      <Hero title="Solutions" lead="The same platform, read through the responsibilities of each team." />
      <Section id="enterprise" title="Enterprise IT and AV" lead="Standards, approvals and funding decisions with their rationale; the commissioning record and the accepted baseline of every room; executive metrics that show their denominators." />
      <Section id="integrators" title="Systems integrators" lead="Design revisions with change-impact traceability, an adaptive commissioning plan with the reason for each test, field evidence captured as the work is done, and a documentation packet that is complete when the applicable requirements are met — not when files are uploaded." />
      <Section id="msp" title="Managed service providers" lead="Who covers each room and in what order; work orders with eligibility, preflight and verified completion; recommissioning as a new baseline version rather than a replaced record." />
      <Section id="facilities" title="Facilities and workplace" lead="Room readiness, service coverage and the right contact, with engineering detail kept where engineers need it." />
    </>
  ) },
  { path: '/how-it-works', title: 'How it works — Empathia Technologies', description: 'The governed lifecycle from request to assurance baseline.', nav: 'How it works', body: (
    <>
      <Hero title="How it works" lead="A reference lifecycle, every transition with an authorized persona, the required evidence, a guard, an event and an audit record." />
      <Section title="From request to accepted baseline"><Steps steps={[
        { title: 'Request', body: 'A requestor describes the room, with photos, plans, known dimensions and constraints. Photos follow a stated privacy policy.' },
        { title: 'Acknowledgement and pitch', body: 'The assigned supplier acknowledges; the operations lead assembles a revisioned business case.' },
        { title: 'Approval, then funding', body: 'An eligible executive approves, holds or rejects with rationale. Funding is a separate authority with an amount and an expiry. Neither can be given by the author.' },
        { title: 'Engineering brief and design', body: 'The operations lead and the systems engineer sign off scope; design revisions carry geometry provenance and change impact.' },
        { title: 'Equipment and standards', body: 'Scouter proposes compatible equipment and reviewed configuration standards; a discipline engineer decides.' },
        { title: 'Adaptive commissioning', body: 'A plan compiled from the rule pack; a camera replacement does not inherit a town hall’s tests. Design values are never read as measured values.' },
        { title: 'Field work and evidence', body: 'Technicians record results with provenance; failures open deficiencies and targeted retests; a reviewer verifies independently.' },
        { title: 'Documentation and handoff', body: 'Completeness counts applicable approved requirements. No acceptance before the mandatory documents and final photos.' },
        { title: 'Baseline and assurance', body: 'Acceptance creates an immutable, versioned baseline; drift, repair and recommissioning add versions and keep the history.' },
      ]} /></Section>
    </>
  ) },
  { path: '/technology', title: 'Technology — Empathia Technologies', description: 'Architecture of the Empathia platform: modular monolith, PostgreSQL with row-level security, append-only evidence, transactional outbox, typed contracts.', nav: 'Technology', body: (
    <>
      <Hero title="Technology" lead="A modular monolith with clear boundaries, built for correctness first." />
      <Section title="Architecture"><Grid items={[
        { title: 'One canonical data model', body: 'Globally unique identifiers, explicit relationships and versioned records; no name-based joins. Measurement fields carry unit, provenance, validation and reviewer.' },
        { title: 'Authorization in the database', body: 'Tenant and site scope enforced with PostgreSQL row-level security as well as in the API; a role switch in the interface grants nothing.' },
        { title: 'Append-only evidence and audit', body: 'Evidence and audit records cannot be edited or deleted by the application roles; the outbox delivers events transactionally and consumers are idempotent.' },
        { title: 'Typed contracts', body: 'An OpenAPI document generated from the route table, a generated typed client, JSON Schemas for events and records.' },
        { title: 'Engines with golden tests', body: 'The commissioning and assurance engines are deterministic rule systems with published parity cases — not trained models.' },
        { title: 'Connectors by capability', body: 'Adapters declare what they can observe or do; each is labelled simulated, proposed, configured, healthy, stale or failed. Field collectors are outbound-only and never execute remote commands from the web application.' },
      ]} /></Section>
    </>
  ) },
  { path: '/trust', title: 'Security and trust — Empathia Technologies', description: 'What Empathia does and does not claim about security, privacy and compliance.', nav: 'Trust', body: (
    <>
      <Hero title="Security and trust" lead="What is in place, what is planned, and what we do not claim." />
      <Section title="In place in the product"><Grid items={[
        { title: 'Server-side authorization', body: 'Every API operation, search, file read and background job checks the actor, the tenant, the site and the role. Negative tests cover cross-tenant and cross-site access.' },
        { title: 'Private evidence storage', body: 'Engineering documents and photos are stored privately with hashes and version records; downloads are authorized and short-lived.' },
        { title: 'Audit', body: 'Administrative and workflow actions are recorded append-only with the actor and the time.' },
      ]} /></Section>
      <Section title="What we do not claim" lead="Empathia holds no SOC 2, ISO 27001 or HIPAA certification. No external security assessment of the platform has been completed. No manufacturer integration is claimed to work until verified with that manufacturer's system. The demonstrations use synthetic data only." />
      <Section title="Privacy" lead="Room photos and recordings are processed only under a tenant-approved policy with consent; nothing is sent to an external AI service without an agreement. See the privacy notice."><a className="btn" href="/privacy">Privacy notice</a></Section>
    </>
  ) },
  { path: '/about', title: 'About — Empathia Technologies', description: 'Empathia Technologies and its founder.', nav: 'About', body: (
    <>
      <Hero title="About Empathia" lead="Empathia Technologies builds the Living Campus: software that keeps the technology of a workplace honest about its own state." />
      <Section title="Founder" lead="[Founder name] founded Empathia after years of enterprise AV, IT and service delivery work in which the record of a room — what was designed, installed, tested and accepted — was scattered across suppliers, spreadsheets and memory. Empathia is the record, and the workflow that keeps it true." />
      <Section title="Principles"><Grid items={[
        { title: 'Say what the evidence supports', body: 'Every state in the product has a guard, an actor and an event behind it, and the product labels what is declared, modeled, measured or verified.' },
        { title: 'Authority is explicit', body: 'No one approves their own work; no simulated result becomes an engineering fact; no suggestion becomes an action by itself.' },
        { title: 'Preserve the history', body: 'Baselines are versioned, evidence is append-only, decisions keep their rationale.' },
      ]} /></Section>
    </>
  ) },
  { path: '/request-demo', title: 'Request a demonstration — Empathia Technologies', description: 'Request a guided demonstration of the Empathia Living Campus.', nav: 'Request demo', body: (
    <>
      <Hero title="Request a demonstration" lead="A guided walk through the seven scenarios on synthetic data, for your team and your questions." />
      <Section title="Tell us about your estate"><LeadForm kind="demo" /></Section>
    </>
  ) },
  { path: '/pilot-partners', title: 'Pilot partnerships — Empathia Technologies', description: 'Pilot the Empathia Living Campus on a bounded scope with your own rooms and people.', nav: 'Pilots', body: (
    <>
      <Hero title="Pilot partnerships" lead="A bounded pilot: an agreed set of rooms and people, the authenticated application, your standards, your evidence — and a readiness report at the end that states what was verified and what was not." />
      <Section title="What a pilot includes"><Grid items={[
        { title: 'Scope', body: 'A site or a building, the personas involved, the lifecycle stages in scope.' },
        { title: 'Data', body: 'Your rooms, devices and standards entered through the product; no customer data leaves your tenant.' },
        { title: 'Readiness report', body: 'A factual account of what the pilot verified, with the tests and the evidence, and what remains.' },
      ]} /></Section>
      <Section title="Start the conversation"><LeadForm kind="pilot" /></Section>
    </>
  ) },
  { path: '/contact', title: 'Contact — Empathia Technologies', description: 'Contact Empathia Technologies.', nav: 'Contact', body: (
    <>
      <Hero title="Contact" lead="Questions about the platform, pilots or investor demonstrations." />
      <Section title="Write to us"><LeadForm kind="contact" /></Section>
    </>
  ) },
  { path: '/privacy', title: 'Privacy notice — Empathia Technologies', description: 'How Empathia Technologies handles personal data on this site.', body: (
    <>
      <Hero title="Privacy notice" lead="What this website collects, and what it does with it." />
      <Section title="This website" lead="The site itself sets no tracking cookies and loads nothing from third parties. The forms send what you type — your name, organization, email and message — to Empathia's own service, where it is stored for the purpose of answering you. Analytics, if enabled, run only with your consent." />
      <Section title="The product" lead="In the authenticated application, personal data is scoped to the tenant that owns it, authorized on every read, and retained under the tenant's policy. Room photos and recordings are processed only with the tenant's approved policy and the consent it requires." />
      <Section title="Your rights" lead="You may ask what we hold about you and ask for it to be corrected or deleted by writing to us through the contact page." />
    </>
  ) },
  { path: '/legal', title: 'Legal — Empathia Technologies', description: 'Legal notices for the Empathia Technologies website.', body: (
    <>
      <Hero title="Legal" lead="Notices for this website." />
      <Section title="Demonstrations" lead="All demonstrations run on synthetic data. Every person, organization, room, device, figure and approval in them is invented. Roles and permissions in the demonstration are a front-end illustration of a policy, not security." />
      <Section title="Names" lead="Product names of other companies, where they appear in the product, identify categories of equipment or systems; no affiliation, partnership or endorsement is implied, and no integration is claimed to work until verified." />
      <Section title="Intellectual property" lead="The Empathia Living Campus software, its engines, documentation and demonstrations are the property of Empathia Technologies." />
    </>
  ) },
];
