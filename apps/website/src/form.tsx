// How a visitor reaches Empathia. Without an API (the default build) every entry point opens the hosted enquiry form on tally.so in a
// new tab, with the disclosure beside it (enquiry.ts). With an API (`build.mjs --api=<url>`) the site's own lead form is rendered and
// apps/website/src/main.ts sends it to the enterprise API's lead route; that path and its tests are kept for when the API is deployed.
import React from 'react';
import { ENQUIRY, TOPICS, type EnquiryTopic } from './enquiry.js';
export type LeadKind = 'demo' | 'pilot' | 'contact';
const FIELDS: Record<LeadKind, { intro: string; extra?: { name: string; label: string; options: string[] } }> = {
  demo: { intro: 'We will reply from a person, not a system, usually within two working days.', extra: { name: 'audience', label: 'Your role', options: ['CIO / CTO / IT leadership', 'AV or UC engineering', 'Systems integrator', 'Managed service provider', 'Facilities / workplace', 'Investor', 'Other'] } },
  pilot: { intro: 'Tell us the scope you have in mind; we will come back with what a bounded pilot would take.', extra: { name: 'scope', label: 'Pilot scope', options: ['One building', 'One site (several buildings)', 'A room programme (new build or refresh)', 'Service and assurance of existing rooms', 'Not sure yet'] } },
  contact: { intro: 'Anything else: questions, press, partnerships, investor demonstrations.' },
};

export function LeadForm({ kind }: { kind: LeadKind }) {
  const f = FIELDS[kind];
  return (
    <form className="leadform" data-lead={kind} method="post" action="/v1/public/leads">
      <p className="note">{f.intro} Fields marked * are required.</p>
      <div className="row"><label>Name *<input name="name" required autoComplete="name" maxLength={120} /></label><label>Organization *<input name="organization" required autoComplete="organization" maxLength={160} /></label></div>
      <div className="row"><label>Email *<input name="email" type="email" required autoComplete="email" maxLength={200} /></label>
        {f.extra ? <label>{f.extra.label}<select name={f.extra.name} defaultValue="">{['', ...f.extra.options].map((o) => <option key={o} value={o}>{o || 'Choose…'}</option>)}</select></label> : <span />}</div>
      <label>Message *<textarea name="message" required rows={5} maxLength={4000} /></label>
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="consent"><input name="consent" type="checkbox" required /> <span>I agree that Empathia stores this message to answer it (see the <a href="/privacy">privacy notice</a>). *</span></label>
      <p className="status" role="status" aria-live="polite" tabIndex={-1} data-status />
      <button className="btn btn--primary" type="submit">Send</button>
    </form>
  );
}

/** The external-link mark: tells sighted visitors the button leaves the site (the accessible name says it in words). */
const Leaves = () => <svg className="ext" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 3h7v7M13 3 5.5 10.5M11 13H3V5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** One button to the hosted enquiry form. It opens in a new tab and says so; it never sends anything from this site. */
export function EnquiryLink({ topic, quiet }: { topic: EnquiryTopic; quiet?: boolean }) {
  return (
    <a className={quiet ? 'btn btn--enquiry' : 'btn btn--primary btn--enquiry'} href={ENQUIRY.url} target="_blank" rel="noopener noreferrer" data-enquiry={topic}>
      {TOPICS[topic].action}<Leaves /><span className="sr"> (opens the enquiry form on {ENQUIRY.host} in a new tab)</span>
    </a>
  );
}

const choices = (t: EnquiryTopic) => TOPICS[t].choose.map((c, i, a) => <React.Fragment key={c}>{i ? (i === a.length - 1 ? ' or ' : ', ') : ''}<q>{c}</q></React.Fragment>);

/** The line that goes with every enquiry button: where the visitor is going, who receives what, and what to choose there. */
export function EnquiryDisclosure({ topic }: { topic: EnquiryTopic }) {
  return (
    <p className="enquiry__note" data-enquiry-note={topic}>
      The form opens on {ENQUIRY.host}, Empathia's form provider. Choose {choices(topic)} as your area of interest. Empathia Technologies
      receives your enquiry; {ENQUIRY.provider} stores it for us in {ENQUIRY.storage}. <a href="/privacy#enquiries">How enquiries are handled</a>
    </p>
  );
}

/** The enquiry block of a page: what happens next, the button, and the disclosure. */
export function EnquiryPanel({ topic, children }: { topic: EnquiryTopic; children?: React.ReactNode }) {
  return (
    <div className="enquiry" data-enquiry-panel={topic}>
      {children ? <div className="enquiry__lead">{children}</div> : null}
      <div className="actions"><EnquiryLink topic={topic} /></div>
      <EnquiryDisclosure topic={topic} />
    </div>
  );
}

/** The page's way in: the site's own form when an API is configured, otherwise the hosted enquiry form. */
export function Enquiry({ api, topic, kind, children }: { api: string | null; topic: EnquiryTopic; kind: LeadKind; children?: React.ReactNode }) {
  return api ? <LeadForm kind={kind} /> : <EnquiryPanel topic={topic}>{children}</EnquiryPanel>;
}
