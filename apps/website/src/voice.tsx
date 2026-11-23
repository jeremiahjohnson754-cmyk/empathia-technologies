// Empathia VOICE (Enterprise 3.0 directive 1A; founder scope confirmation 23 Nov 2026): the product page for telephony and unified-
// communications intelligence. VOICE is the CallPath Digital Twin; it is not narration, a voice assistant or call recording.
// What this page may say is bounded by what exists: a simulated scenario in the demonstration and a specification. So it claims no
// carrier, no partnership, no certification, no supported provider and no measured result, and it says which parts are roadmap.
// The "open it" button is a catalogued launch (packages/ui/src/launches.ts › MODULE_LAUNCHES.voice): it opens the same room's CallPath
// in the demonstration and offers the way back to this page.
import React from 'react';
import { Hero, Section, Cards, Steps, Note, Actions, Tag } from './ui.js';
import { MODULE_LAUNCHES, launchHref } from '../../../packages/ui/src/launches.ts';

const PATH = [
  { title: 'Room endpoint', body: 'The room’s calling device, as the room’s own record names it.' },
  { title: 'Access switch and core uplink', body: 'The same network records the rest of the platform reads, with where each came from.' },
  { title: 'QoS and WAN edge', body: 'Shown as unknown when nothing observes it. An unobserved hop is never drawn as healthy.' },
  { title: 'Session border controller', body: 'The trunk and its controller, from declared records.' },
  { title: 'UC provider connection', body: 'A provider’s call-quality record, when a licensed connector exists. Without one: not configured.' },
];
const ROLES = [
  { title: 'UC / Voice administrator', body: 'Reads the configured route beside what was observed for a session, hop by hop, for the sites in their scope. Session tokens and signalling-side detail stay with this role alone.', icon: 'plug' },
  { title: 'AV operations and engineering', body: 'See the path and which rooms share an uplink before deciding where to look. They do not read signalling-side detail.', icon: 'scope' },
  { title: 'Support technician', body: 'Opens the room from the job, reads the path and the samples for their site, and never sees session tokens or directory numbers.', icon: 'service' },
  { title: 'Executive', body: 'Reads non-identifying summaries: whether calling met the organisation’s own targets, and where evidence is missing.', icon: 'exec' },
];
const STATUS: { title: string; body: string; meta: React.ReactNode }[] = [
  { title: 'In the demonstration today', body: 'One room’s CallPath on synthetic data: six hops, one simulated session, quality samples with their method, a shared-uplink view, a missing-telemetry case, a stale-data case, a report from the room that becomes a job followed through to independent verification, the network view in FLOW, readiness in MissionProof, and refusals by role and by site.', meta: <Tag s="simulated">Available in the demonstration · simulated</Tag> },
  { title: 'Specified, not built', body: 'Scoped evidence for a partner, redacted search and exports, and the data model and API contracts for an engineering team.', meta: <Tag s="declared">Engineering specification</Tag> },
  { title: 'Roadmap, depends on others', body: 'Connectors to calling platforms and session border controllers. Each depends on that product’s API, licensing and the customer’s consent. None is connected, and no partnership is claimed.', meta: <Tag s="unknown">Roadmap · nothing connected</Tag> },
];

export const voicePage = (demoUrl: string) => {
  const open = launchHref(demoUrl, MODULE_LAUNCHES['voice']!, '/voice');
  return {
    path: '/voice', title: 'VOICE, calling you can explain — Empathia Technologies',
    description: 'Empathia VOICE is telephony and unified-communications intelligence: the CallPath Digital Twin, which keeps what is configured apart from what was observed and what is not known. A simulation in the demonstration; no carrier, partnership or certification is claimed.',
    body: (
      <div data-voice>
        <Hero label="Empathia VOICE · infrastructure and communications" title="Calling you can explain" lead="When a call breaks up, the first question is where. VOICE draws the path a call is meant to take, from the room to the provider, beside what was actually observed on each hop, and says plainly what nobody has measured." action={{ href: open, label: 'Open the CallPath in the demonstration' }}>
          <p className="note" data-voice-status><b>A simulation today.</b> The demonstration shows VOICE on synthetic data. No real call, network, carrier or provider is read, and no calling platform is connected.</p>
        </Hero>
        <Section id="callpath" eyebrow="CallPath Digital Twin" title="Configured, observed and unknown are three different things" lead="Most calling tools show a route as if it were a fact. VOICE keeps three claims apart on every hop, each with its source and its age: the route someone declared, what a source reported for a session, and what is not known.">
          <Steps steps={PATH} />
          <Note>VOICE does not infer a call’s path from device names, and does not present a configured route as the path a call took.</Note>
        </Section>
        <Section id="quality" tone="warm" title="A quality figure comes with its method, or it is not shown" lead="Loss, jitter and delay are shown with their window, unit and source. An estimated listening score appears only when its inputs and a documented method support it; a missing input, an unsupported codec or a stale sample gets no estimate.">
          <Cards cols={3} items={[
            { title: 'Measurements first', body: 'Loss, jitter and delay lead. The demonstration also shows an experimental estimate from the published ITU-T G.107 E-model in a reduced form; it is an engineering-review implementation, not independently validated, and it decides nothing.' },
            { title: 'Your targets, not ours', body: 'Samples are compared with the calling targets your organisation declares. VOICE sets none of its own.' },
            { title: 'Missing is not healthy', body: 'A provider that sends nothing, a timeout or an old sample reads as unknown, and stays unknown everywhere downstream.' },
          ]} />
        </Section>
        <Section id="connected" title="One room, the same records" lead="A calling problem is rarely only a calling problem. VOICE reads the same room, device and network records as the rest of Empathia, so the path from a report to a fix stays in one place.">
          <Cards cols={3} items={[
            { title: 'From the room', body: 'Someone in the room reports the problem from their phone. They get a receipt and follow their own report; they never see how calls are routed.' },
            { title: 'To the network', body: 'The uplink a room shares with its neighbours is the platform’s own network record, so three rooms with one cause read as one problem.' },
            { title: 'To a hypothesis', body: 'What the evidence suggests is recorded as a hypothesis with its citations and its unknowns, never as a root cause.' },
            { title: 'To a job', body: 'The report is a ServiceHands job with the room attached, assigned to someone authorised for that site.' },
            { title: 'To proof', body: 'Closing a job does not pass an acceptance test. Only reviewed evidence changes what Assurance says about the room.' },
            { title: 'To the event', body: 'Readiness for a town hall moves when its calling path does, and only on verified repair plus later evidence. In the demonstration this is simulated.' },
          ]} />
        </Section>
        <Section id="roles" tone="warm" title="Who reads what" lead="The same record, read differently by each role. A role that should not see something is not shown it.">
          <Cards cols={4} items={ROLES} />
        </Section>
        <Section id="privacy" title="Privacy and safety, stated as limits" lead="VOICE works from call and endpoint metadata. These are limits of the product, not settings.">
          <ul className="ticks" data-voice-never>
            <li>No call recording, transcription or listening by default. Session identities are pseudonymous tokens.</li>
            <li>Directory numbers and personal contact details are redacted unless a role is authorised to read them.</li>
            <li>No test call to an emergency number, ever. Emergency-location records are a configuration audit aid, not a compliance certificate.</li>
            <li>No command to a provider or a device without a verified capability and an approval. Reading comes first.</li>
          </ul>
        </Section>
        <Section id="status" tone="warm" title="What exists today" lead="Stated the way the rest of this site states it.">
          <Cards cols={3} items={STATUS} />
          <Actions><a className="btn btn--primary" href={open} data-voice-open>Open the CallPath in the demonstration</a><a className="btn" href="/proof">What is real across the platform</a><a className="btn btn--ghost" href="/products">All products</a></Actions>
        </Section>
      </div>
    ),
  };
};
