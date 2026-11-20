/**
 * Where enquiries go: the owner's hosted Tally form "Connect with Empathia Technologies", opened outside the site, never embedded.
 * Owner-approved 2026-10-31 20:18 CT. Linking out keeps the site's security headers as they are: nothing from tally.so loads here,
 * and with `Referrer-Policy: no-referrer` Tally is not told which page sent the visitor.
 *
 * The form cannot be pre-filled (it has no hidden fields), so each entry point names the "Area of Interest" choice to make in it.
 * The investor demonstration links to the same form (apps/demo/src/enquiry.ts); tests/browser/website.test.mjs checks that the two agree.
 * When a build is given an API (`--api`), the site's own lead form is used instead and these links are not rendered.
 */
export const ENQUIRY = {
  url: 'https://tally.so/r/VpG0Vy',
  host: 'tally.so',
  provider: 'Tally',
  /** stated by Tally (https://tally.so/help/gdpr): hosting and storage with Google Cloud in Belgium */
  storage: 'the EU',
} as const;

export type EnquiryTopic = 'demo' | 'pilot' | 'partner' | 'investor' | 'contact';
/** The button wording and the matching "Area of Interest" choice in the form, for each entry point. */
export const TOPICS: Record<EnquiryTopic, { action: string; choose: string[] }> = {
  demo: { action: 'Request a demonstration', choose: ['Product Demonstration'] },
  pilot: { action: 'Explore an enterprise pilot', choose: ['Enterprise Pilot'] },
  partner: { action: 'Discuss a partnership', choose: ['Strategic Partnership', 'MSP / AV Integration Partnership'] },
  investor: { action: 'Start an investor conversation', choose: ['Investment Conversation'] },
  contact: { action: 'Send an enquiry', choose: ['General Inquiry'] },
};
