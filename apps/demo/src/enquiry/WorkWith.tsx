/**
 * The way from the demonstration to a real conversation (owner-approved 2026-10-31 20:18 CT): each entry point opens the owner's hosted
 * Tally form (src/enquiry.ts) in a new tab, never embedded, with the disclosure beside it; the demonstration itself sends nothing.
 * `WorkWith` sits on the investor start; `ContactLinks` is in the footer of every page. The Tally form itself is never modified here.
 */
import { Fragment } from 'react';
import { ENQUIRY, ENTRY_POINTS, WEBSITE_URL } from '../enquiry.js';

export function WorkWith() {
  return (
    <section className="workwith" aria-labelledby="workwith-h" data-testid="work-with">
      <h2 id="workwith-h">Work with Empathia</h2>
      <p className="workwith__lead">Everything above is a demonstration on invented data. To talk about your own rooms, a partnership or an investment, write to Empathia Technologies.</p>
      <ul className="workwith__list">{ENTRY_POINTS.map((e) => (
        <li key={e.key}>
          <a className="go workwith__go" href={ENQUIRY.url} target="_blank" rel="noopener noreferrer" data-enquiry={e.key}>
            <b>{e.title}<svg className="ext" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6 3h7v7M13 3 5.5 10.5M11 13H3V5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></b>
            <span>{e.body}</span><span className="ui-sr"> (opens the enquiry form on {ENQUIRY.host} in a new tab)</span>
            <span className="workwith__choose">In the form, choose {e.choose.map((c, i) => <Fragment key={c}>{i ? ' or ' : ''}<q>{c}</q></Fragment>)}.</span>
          </a>
        </li>))}
      </ul>
      <p className="workwith__note" data-enquiry-note="demo">The form opens on {ENQUIRY.host}, Empathia's form provider. Empathia Technologies receives your enquiry; {ENQUIRY.provider} stores it for us in {ENQUIRY.storage}. Nothing you do in this demonstration is sent with it. <a href={WEBSITE_URL + '/privacy#enquiries'}>How enquiries are handled</a> · <a href={WEBSITE_URL + '/founder'}>About the founder</a></p>
    </section>
  );
}
export function ContactLinks() {
  return <> · <a href={ENQUIRY.url} target="_blank" rel="noopener noreferrer" data-enquiry="footer">Contact Empathia<span className="ui-sr"> (opens the enquiry form on {ENQUIRY.host} in a new tab)</span></a> · <a href={WEBSITE_URL + '/founder'}>The founder</a></>;
}
