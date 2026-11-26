/**
 * /intake — how work starts (founder, 19 Nov 2026 13:28: "make intake a colorful little button next to learn … it's not a product but we
 * should give it a page on the corporate website but it's not something that we want to market heavy but it should be given it's own space
 * to be explained and screenshots only no video. Screenshots of someone going [through the] process of making a new room or device request
 * and getting that proposed lite room at the end").
 *
 * Not one of the nine products, and not in the main navigation: reached from its tile beside Learn and from the footer. Screenshots only,
 * each taken from the built demonstration by apps/website/scripts/intake-shots.mjs (dark, synthetic data, listed with its hash in
 * media/product/PROVENANCE.json); a step without its screenshot is left out rather than drawn.
 */
import type { Capture } from './ui.js';
import { Hero, Section, Note, Actions } from './ui.js';
import type { Page } from './content.js';

/** The steps, in the order the person takes them (the same list the screenshot script captures). */
export const INTAKE_STEPS: Array<{ id: string; step: string; what: string; alt: string }> = [
  { id: 'intake-1', step: 'Describe it', what: 'The person types what they need in their own words. Intake reads it with word lists, not AI, says which words it went by, and suggests where to start. Nothing starts until the person says so.', alt: 'The Intake front door: “What can we help you create, improve, or fix?”, a description typed, and the suggestion “This sounds like a new room”.' },
  { id: 'intake-2', step: 'What you need', what: 'Step 1 of 5: the kind of request, the person’s words, and what should be better, already filled in. The draft has its own id and is kept as it changes.', alt: 'Step 1 of the request: the kind of request, the need in a sentence and the goals chosen.' },
  { id: 'intake-3', step: 'Where', what: 'Step 2: the building, the floor and a name for the space. A space that is not on record becomes a provisional space: requested, not built, and not an operational room.', alt: 'Step 2: building, floor and the space’s name, with the note that it becomes a provisional space.' },
  { id: 'intake-4', step: 'What it should do', what: 'Step 3: what the room is for and how many people. The room is drawn beside the answers by the same design engine that designs every room, its size modeled from rooms of the same kind and labeled so.', alt: 'Step 3: the room’s purpose and occupancy, with the proposed room drawn in plan beside them.' },
  { id: 'intake-5', step: 'Show us the space', what: 'Step 4: the photographs that would help for this kind of request, and why. Nobody has to produce a photograph to ask, and nothing is measured from one.', alt: 'Step 4: the photograph checklist for a new room and the policy that applies.' },
  { id: 'intake-6', step: 'Review, and the proposed room', what: 'Step 5: every answer, each one changeable, and the proposed room in Empathia Lite’s 3D room view, with camera and microphone coverage from Lite’s model. Proposed: not designed, not approved.', alt: 'The review step with the proposed room drawn in Empathia Lite’s 3D room view.' },
  { id: 'intake-7', step: 'Received', what: '“Your request has been received.” A real request id, where it stands, who acts next and what they do. Nobody is assigned and no date is promised by sending.', alt: 'The received page: the request id, its status, the next step and the proposed room.' },
  { id: 'intake-8', step: 'A device, from the room', what: 'From a room in Lite, a device request is one screen: the room and the device are already known, the device is marked in the picture, and the person says what is wrong.', alt: 'A device replacement asked for from the room: the device marked in the room’s plan and the need typed.' },
  { id: 'intake-9', step: 'Following it', what: 'Every request has its own page: what is happening, who acts next, what is needed, what happens next, and its history in the platform’s own events.', alt: 'The request’s page: what is happening, who acts next, what is needed, what happens next and its history.' },
];

const IntakeShot = ({ s, cap, eager }: { s: (typeof INTAKE_STEPS)[number]; cap: Capture; eager?: boolean }) => (
  <figure className="shot shot--intake" data-shot={s.id}>
    <div className="shot__frame"><img src={`/media/product/${s.id}-1280.webp`} srcSet={`/media/product/${s.id}-640.webp 640w, /media/product/${s.id}-1280.webp 1280w`} sizes="(max-width: 1100px) 92vw, 760px" width={cap.w} height={cap.h} loading={eager ? 'eager' : 'lazy'} decoding="async" alt={s.alt} />
      <span className="shot__badge" aria-hidden="true">Synthetic demonstration data</span></div>
    <figcaption><b>Screenshot of the demonstration</b><span>Synthetic data, nothing retouched</span></figcaption>
  </figure>
);

export function intakePage(demo: (href?: string) => string, captures: Record<string, Capture>): Page {
  const shown = INTAKE_STEPS.filter((s) => captures[s.id]);
  return { path: '/intake', title: 'Intake — Empathia Technologies', description: 'How work starts in Empathia: a request in plain words, the proposed room before it is sent, and where it goes next. Not a product; the front door to them.', body: (
    <>
      <Hero label="Intake · not a product" title="How work starts" lead="Intake is where a person asks for a room, a change or a device, in plain words, and sees what they are asking for before they send it. It is the front door to the products, not one of them." action={{ href: demo('#/request'), label: 'Try Intake in the demonstration' }} />
      <Section id="steps" eyebrow="A new room, then a device" title="One person, one request, step by step" lead={shown.length ? 'Screenshots of the demonstration as an employee asks for a new meeting room, from the front door to the proposed room and “received”, then asks for a device to be replaced from the room itself.' : 'The screenshots are being taken from the demonstration.'}>
        <ol className="intake-steps">{shown.map((s, i) => (
          <li key={s.id} id={s.id}><div className="intake-steps__txt"><h3><span className="intake-steps__n">{i + 1}</span>{s.step}</h3><p>{s.what}</p></div><IntakeShot s={s} cap={captures[s.id]!} eager={i === 0} /></li>))}</ol>
      </Section>
      <Section id="what-it-never-does" title="What asking never does" tone="deep">
        <ul className="intake-never"><li>Nothing is ordered, bought or approved by asking. Approval and funding are separate decisions, each by the person entitled to make it.</li>
          <li>Asking grants no access to a room, a system or a site.</li>
          <li>No size is read from a photograph. A size the person gives is labeled as theirs until it is surveyed.</li>
          <li>Every request has an owner for its next step: a team, never an invented name or a promised date.</li></ul>
        <Note>Everything shown is the product demonstration on synthetic data. Requests there are kept in the browser that made them; Teams, Outlook and SharePoint are not connected.</Note>
        <Actions><a className="btn btn--primary" href={demo('#/request')}>Open Intake in the demonstration</a><a className="btn" href="/how-it-works">How a request becomes a room</a></Actions>
      </Section>
    </>
  ) };
}
