// Enquiries go to the founder's hosted Tally form (owner-approved 2026-10-31 20:18 CT), opened in a new tab, never embedded: nothing from
// tally.so loads on this site and its CSP is unchanged. Attribution (owner's choice 2026-10-31 21:51 CT, task #337): each entry point
// appends a hidden `source` parameter naming the button, never the visitor. The live form is NOT modified from here; until the owner adds
// the hidden field `source` in Tally (docs/operations/LEAD_CAPTURE_TALLY.md), Tally ignores the parameter. The "Area of Interest" question
// stays as it is: each entry point names the choice to make.
export const TALLY_FORM = 'https://tally.so/r/VpG0Vy';

export type Source = 'founder' | 'website-demo' | 'website-pilot' | 'website-partner' | 'website-investor' | 'website-contact';
export interface Enquiry { source: Source; button: string; area: string; title: string; body: string }

/** The CTA → source mapping from LEAD_CAPTURE_TALLY.md, one row per website entry point. */
export const ENQUIRIES: Record<Source, Enquiry> = {
  founder: { source: 'founder', button: 'Connect with the founder', area: 'Investment Conversation or General Inquiry', title: 'Connect with the founder', body: 'Your enquiry goes through Empathia’s enquiry form and is marked for the founder.' },
  'website-demo': { source: 'website-demo', button: 'Request a demonstration', area: 'Product Demonstration', title: 'Request a demonstration', body: 'A guided walk through the scenarios on synthetic data, for your team and your questions.' },
  'website-pilot': { source: 'website-pilot', button: 'Explore an enterprise pilot', area: 'Enterprise Pilot', title: 'An enterprise pilot', body: 'Tell us the scope you have in mind; we will come back with what a bounded pilot would take.' },
  'website-partner': { source: 'website-partner', button: 'Discuss a partnership', area: 'Strategic Partnership or MSP / AV Integration Partnership', title: 'Partnerships', body: 'Systems integrators, managed service providers and technology partners.' },
  'website-investor': { source: 'website-investor', button: 'Start an investor conversation', area: 'Investment Conversation', title: 'Investor conversations', body: 'The company, the platform and the demonstration, with the evidence behind each claim.' },
  'website-contact': { source: 'website-contact', button: 'Send an enquiry', area: 'General Inquiry', title: 'Anything else', body: 'Questions about the platform, press or anything not covered above.' },
};

export const enquiryUrl = (source: Source) => `${TALLY_FORM}?source=${encodeURIComponent(source)}`;
/** What every visitor is told beside the button, before leaving the site. */
export const disclosure = (e: Enquiry) => `Opens Empathia’s enquiry form on tally.so in a new tab. Tally, our form provider, stores what you send in the EU; nothing you type passes through this site. Choose “${e.area}” as the area of interest.`;
