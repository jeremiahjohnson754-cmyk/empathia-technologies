// The nine Empathia products on the public website, in the canonical order (founder decisions D37, D40, D42), read from the ONE shared
// list (packages/ui/src/products.ts: id, name, order, purpose, the --p-<id> colour, the apps each product owns). Scouter is part of
// Lite and stays highly discoverable inside it (D41). Only the website's storytelling fields live here. tests/browser/website.test.mjs
// (W-canon) fails if the menu, the home tiles, the products page or the footer drift from the shared order or names.
import { PRODUCTS as SHARED } from '../../../packages/ui/src/products.ts';

export interface CanonProduct { id: string; name: string; purpose: string; apps: string[] }
/** The shared vocabulary (id = the product colour token --p-<id>), with the featured apps named wherever the product is listed. */
export const CANON: CanonProduct[] = SHARED.map((p) => ({ id: p.id, name: p.name, purpose: p.purpose, apps: p.apps.filter((a) => a.featured).map((a) => a.name) }));
/** The website's address for each product: the id, except Field Intelligence keeps its established /products/field-intelligence. */
export const slugOf = (id: string) => (id === 'field' ? 'field-intelligence' : id);

export type DemoState = 'native' | 'partial' | 'not-in-demo';
export interface Product extends CanonProduct {
  slug: string; body: string; shows: string[];
  /** the evidence label of each line of shows, in order (3 Nov product pages: claims labelled as the product labels them). Everything
   *  in the public demonstration is synthetic, so no line is ever labelled observed or verified here. */
  showsAs: ('declared' | 'modeled' | 'simulated')[]; limits: string; demoState: DemoState; film?: string;
  demo?: { href: string; label: string };
  /** a dark capture of the investor demonstration (D43), built by apps/website/scripts/captures.mjs; absent until captured */
  capture?: string;
  /** what the capture shows, when it is not simply the product's purpose (the alt text of its image) */
  shotAlt?: string;
}

type Story = Omit<Product, keyof CanonProduct | 'slug'>;
const STORY: Record<string, Story> = {
  'mission-control': {
    body: 'Mission Control counts live records at every station of the lifecycle, from the first request to the last service visit, and says what changed, what matters and what needs action. Every count opens the records behind it.',
    showsAs: ['simulated', 'declared', 'simulated'], shows: ['The lifecycle with every station counted', 'What changed since you last looked, and why it matters', 'The ledger behind every state'],
    limits: 'The counts come from the synthetic demonstration estate; nothing is connected to a live system.', demoState: 'native', demo: { href: '#/v25', label: 'Open Mission Control' },
    shotAlt: 'Mission Control in the investor demonstration: the campus drawn as buildings, each with its health and open issues computed from its rooms’ records.',
  },
  lite: {
    body: 'A conceptual room model from an archetype, dimensions, plans and photos. Geometry carries its provenance: extracted, inferred, simulated, field-measured or engineer-approved, and never promoted silently. Coverage is predicted and labelled modeled. Scouter works inside Lite: equipment proposals from comparable rooms, reviewed by the engineer before anything is adopted.',
    showsAs: ['modeled', 'modeled', 'modeled', 'declared'], shows: ['Drawing a room from an archetype and its dimensions', 'Seats, displays, cameras and microphones placed in plan and 3D', 'Modeled coverage with the assumptions stated', 'Scouter: equipment proposals from comparable rooms, with their limits'],
    limits: 'Predictions are modeled values; a calibrated instrument measures. Photo and plan extraction are not part of the public demonstration.', demoState: 'native', demo: { href: '#/v25/build', label: 'Open Build a Room' },
  },
  pro: {
    body: 'Executive intelligence that shows its work: each measure with its numerator, denominator, window, coverage and freshness, and missing data shown as missing, never as success.',
    showsAs: ['simulated', 'simulated', 'declared'], shows: ['Executive measures with their denominators', 'Portfolio and service performance', 'Coverage and freshness on every figure'],
    limits: 'The Pro command centre, operations hub and standards pages are still being migrated in the public demonstration.', demoState: 'partial', demo: { href: '#/v25/exec', label: 'Open the executive measures' },
  },
  'search-party': {
    body: 'One search across people, rooms, devices, projects, standards and documents, with the relationships between them: who owns this, who covers it, what depends on it. Each relationship carries its source and its freshness.',
    showsAs: ['simulated', 'declared', 'simulated'], shows: ['“If this switch fails, what is affected?”', 'Recorded relationships with provenance; unknown links shown as unknown', 'A list first on phones, with the graph a tap away'],
    limits: 'Relationships are recorded in the synthetic estate; no network discovery runs.', demoState: 'native', demo: { href: '#/search', label: 'Open Search Party' },
  },
  servicehands: {
    body: 'Issues become work orders, closed with field evidence and resolved only by a verified retest. A technician sees the sites assigned and nothing else; the context of the room travels with the job.',
    showsAs: ['simulated', 'declared', 'simulated'], shows: ['The service context: the room, its dependencies, its baseline', 'Hard gates before dispatch; preferences kept separate', 'Corrective action, retest and closure'],
    limits: 'Dispatch, scheduling and notifications are demonstrated on synthetic people and sites.', demoState: 'native', demo: { href: '#/servicehands', label: 'Open ServiceHands' },
    shotAlt: 'ServiceHands in the investor demonstration: open jobs, jobs waiting for dispatch or verification, and how jobs are routed, counted from the service records.',
  },
  commissioning: {
    body: 'An adaptive test plan compiled from the project type, the room, its devices, the approved design and the standard versions, with the reason for every test. Failed tests open deficiencies; nothing is accepted on the word of the person who did the work. An accepted result becomes the room’s baseline, and drift is read against it.',
    showsAs: ['declared', 'simulated', 'simulated'], shows: ['The plan, with why each test applies and why others do not', 'A blocked approval that names every unresolved item', 'Retest, independent verification, acceptance and the baseline that follows'],
    limits: 'Test results in the demonstration are synthetic; no instrument is connected.', demoState: 'native', film: 'F02P', demo: { href: '#/v25/build?tab=checks', label: 'Open the commissioning plan' },
  },
  apex: {
    body: 'APEX reads a room against its accepted baseline and ranks the hypotheses that could explain what changed, each with the evidence that supports it and the reason it is not yet proven. Actions stay in bounded tiers; a suggestion never becomes an action by itself.',
    showsAs: ['simulated', 'modeled', 'declared'], shows: ['Ranked hypotheses with cited evidence', 'Why each hypothesis is not yet proven', 'Bounded action tiers, with a person deciding'],
    limits: 'APEX runs on simulated evidence in the public demonstration.', demoState: 'partial', demo: { href: '#/v25/apex', label: 'Open APEX' },
  },
  field: {
    body: 'Every observation is labelled declared, observed, verified, modeled, unknown or unavailable. A device that answers is not a room that works; the plan keeps every pair untested until evidence arrives.',
    showsAs: ['declared', 'simulated', 'simulated'], shows: ['Collector facts as declared, with their limits', 'Plan versus executed, with nothing filled in', 'An optional physical-validation flow, simulated'],
    limits: 'No collector is connected in the public demonstration; physical validation is simulated.', demoState: 'native', film: 'IE', demo: { href: '#/v25/fi', label: 'Open Field Intelligence' },
  },
  learn: {
    body: 'A case needs permission, de-identification, a subject-matter review and approval before it teaches anyone. Lessons, labs and the SIGNAL story link to competencies, and training never grants authority.',
    showsAs: ['declared', 'declared', 'modeled'], shows: ['Reviewed cases linked to lessons and competencies', 'SIGNAL lessons, labs and drills', 'Three flagship practice labs: mix a church live stream on a 32-channel desk, light the stage, shoot the service'],
    limits: 'The full SIGNAL corpus is not yet produced as playable media, and narration is not yet cleared for public use. The flagship labs are models for practice: a passing score proves nothing about a real room.', demoState: 'partial', demo: { href: '#/v25/learn', label: 'Open Learn' },
  },
};

export const PRODUCTS: Product[] = CANON.map((c) => ({ ...c, slug: slugOf(c.id), ...(STORY[c.id] as Story) }));

export const DEMO_STATE: Record<DemoState, { text: string; s: 'observed' | 'declared' | 'unknown' }> = {
  native: { text: 'In the public demonstration', s: 'observed' },
  partial: { text: 'Partly in the public demonstration', s: 'declared' },
  'not-in-demo': { text: 'Not yet in the public demonstration', s: 'unknown' },
};

/** Addresses that moved when the website's product pages followed the nine (D42); served as permanent redirects (render.yaml routes,
 *  the website's own server) and explained on the not-found page. */
export { default as MOVED } from '../redirects.json';

/** How the 140 demonstration rooms were made (the counts of the wording below; the total is their sum, never typed). Founder, 13 Nov 2026
 *  07:24 CT: "140 is a better size to show for a corporate enterprise". The thirty, rows 31–90 and the earlier release's fifty (canon.ts). */
export const ROOM_MIX = [
  { k: 'reference', c: 'r', n: 1, label: 'complete reference room' },
  { k: 'earlier', c: 'e', n: 3, label: 'with the demonstration’s earlier records' },
  { k: 'archetype', c: 'a', n: 86, label: 'designed from their archetypes' },
  { k: 'release', c: 'v', n: 50, label: 'the earlier release’s own rooms' },
];
export const ROOM_TOTAL = ROOM_MIX.reduce((a, m) => a + m.n, 0);
/** The demonstration rooms, in the founder-approved wording of the thirty, extended to the 140 by the same terms. */
export const ROOMS_SENTENCE = 'one is the complete reference room, three keep the demonstration’s earlier records, eighty-six are designed from their archetypes and fifty are the earlier release’s own rooms, laid out by its room types: modelled layouts and devices, never surveyed.';
