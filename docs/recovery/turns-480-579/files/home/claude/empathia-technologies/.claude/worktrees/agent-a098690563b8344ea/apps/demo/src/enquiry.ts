/**
 * The way out of the demonstration to a real conversation: the owner's hosted Tally form, the same one the corporate website uses
 * (apps/website/src/enquiry.ts; tests/browser/website.test.mjs checks that the two agree). It opens outside the demonstration in a new
 * tab and is never embedded; the demonstration itself sends nothing anywhere. Owner-approved 2026-10-31 20:18 CT.
 */
export const ENQUIRY = { url: 'https://tally.so/r/VpG0Vy', host: 'tally.so', provider: 'Tally', storage: 'the EU' } as const;

/** The corporate website (founder, privacy notice). Set at build time: `node apps/demo/build.mjs --website=<url>` or DEMO_WEBSITE_URL. */
declare const process: { env: Record<string, string | undefined> };
export const WEBSITE_URL = (process.env.EMPATHIA_WEBSITE_URL || 'https://empathia-website.onrender.com').replace(/\/$/, '');

/** The entry points the investor start offers, each with the "Area of Interest" choice to make in the form (it cannot be pre-filled). */
export const ENTRY_POINTS: { key: string; title: string; body: string; choose: string }[] = [
  { key: 'pilot', title: 'Explore an enterprise pilot', body: 'A bounded scope with your own rooms and people, ending in a readiness report that states what was verified and what was not.', choose: 'Enterprise Pilot' },
  { key: 'partner', title: 'Discuss a partnership', body: 'Strategic partners, and managed service providers and AV integrators who design, commission and service rooms for their customers.', choose: 'Strategic Partnership or MSP / AV Integration Partnership' },
  { key: 'investor', title: 'Start an investor conversation', body: 'The platform, its evidence and its limits, with the founder.', choose: 'Investment Conversation' },
  { key: 'demo', title: 'Request a guided demonstration', body: 'This demonstration, walked through with your team and your questions.', choose: 'Product Demonstration' },
];
