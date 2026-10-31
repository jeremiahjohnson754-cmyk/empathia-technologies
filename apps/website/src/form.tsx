// The lead form, rendered at build time; apps/website/src/main.ts handles the submission in the browser.
import React from 'react';
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
