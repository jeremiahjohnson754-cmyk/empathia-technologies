/**
 * Typed launch intents (#232, founder directive 18 Nov 2026 17:25 §6 "Open This Exact Demonstration"): every place the corporate
 * website opens the investor demonstration names ONE entry here. The website builds the link with launchHref; the demonstration reads
 * it back with readLaunch and shows a strip saying where the visitor came from, as whom the page is shown, and a way back to the exact
 * website page they left.
 *
 * Rules (tests/unit/launch-intents.test.mjs checks every one against the demonstration's own registry and policy):
 *   - `route` is a registered demonstration address that `perspective` may open (a page the role cannot open is a failed launch);
 *   - `perspective` is a demonstration role; a launch never grants anything, and the strip offers the visitor's previous view back;
 *   - a room, device or asset named in `route` exists in the synthetic estate;
 *   - `back` is a path on the corporate website, never a full address (no open redirect): readLaunch refuses anything else.
 * Only the catalogue id travels in the link: the demonstration takes the title and perspective from this file, never from the URL.
 * No imports: this file runs as-is under Node's type stripping and in every bundler.
 */
export interface Launch {
  /** stable id carried in the link as li=<id> */
  id: string;
  /** what the visitor opens, as the strip names it */
  title: string;
  /** one line on what they will see there */
  shows: string;
  /** the demonstration address (hash route, without the leading #), before the launch parameters are added */
  route: string;
  /** the demonstration role the page is shown as (a key of the demonstration's ROLES) */
  perspective: string;
  /** that role's name, as the website button says it */
  perspectiveLabel: string;
}

/** The reference room of the flagship tour (Atlas 4.218) and the device the website follows through the platform. */
export const FOLLOW_ROOM = 'R-ATL-4-218';
export const FOLLOW_POSITION = 'A-0104';
export const FOLLOW_ASSET = 'AS-0103';

/** "Follow one microphone": the same ceiling microphone, room and records seen from five products, in the order the website tells it. */
export const FOLLOW: readonly Launch[] = [
  { id: 'follow-lite', title: 'Atlas 4.218 in Lite, ceiling microphone 1 selected', shows: 'The furnished boardroom in 3D, with position A-0104 (asset AS-0103) selected and its coverage drawn.', route: `/lite/room/${FOLLOW_ROOM}?mode=engineer&device=${FOLLOW_POSITION}`, perspective: 'syseng', perspectiveLabel: 'Systems Engineer' },
  { id: 'follow-commissioning', title: 'Atlas 4.218, its commissioning record', shows: 'The tests that apply to this room: what was required, what was observed, by whom, and who verified it.', route: `/commissioning/room/${FOLLOW_ROOM}`, perspective: 'cxeng', perspectiveLabel: 'Commissioning Engineer' },
  { id: 'follow-assurance', title: 'Atlas 4.218 in Assurance', shows: 'The accepted baseline and its revisions, so a later difference shows as drift against a known state.', route: `/assurance/room/${FOLLOW_ROOM}`, perspective: 'ops', perspectiveLabel: 'AV Operations Lead' },
  { id: 'follow-support', title: 'Atlas 4.218 in Search Party', shows: 'Who supports the room, who knows it, and its relationships, each with where it comes from.', route: `/search?focus=Room:${FOLLOW_ROOM}`, perspective: 'service', perspectiveLabel: 'Service Engineer' },
  { id: 'follow-replay', title: 'Atlas 4.218 in Core Replay, at the camera change', shows: 'The room’s life played back from its records, stopped where a like-for-like change reopens only the tests it touches.', route: `/replay/${FOLLOW_ROOM}?at=change`, perspective: 'syseng', perspectiveLabel: 'Systems Engineer' },
];

/** The demonstration each product page opens (the product's own "Open …" button), keyed by product id: each product's best screen,
 *  shown as the role that uses it (founder, 19 Nov 2026 09:09: "exact that screen with the role selected best looking screen"). */
export const PRODUCT_LAUNCHES: Readonly<Record<string, Launch>> = {
  'mission-control': { id: 'product-mission-control', title: 'Mission Control', shows: 'The campus at a glance and the products that read it.', route: '/v25', perspective: 'architect', perspectiveLabel: 'Product Architect' },
  lite: { id: 'product-lite', title: 'Lite, a furnished room in 3D', shows: 'Atlas 4.218 drawn in 3D with its seats, displays, cameras and microphones, and its modeled coverage labeled as a model.', route: `/lite/room/${FOLLOW_ROOM}`, perspective: 'designer', perspectiveLabel: 'Designer' },
  pro: { id: 'product-pro', title: 'Pro, the executive measures', shows: 'Estate measures that trace to the rooms and jobs they came from.', route: '/v25/exec', perspective: 'exec', perspectiveLabel: 'Executive' },
  'search-party': { id: 'product-search-party', title: 'Search Party', shows: 'One search across rooms, devices, people and their relationships.', route: '/search', perspective: 'service', perspectiveLabel: 'Service Engineer' },
  servicehands: { id: 'product-servicehands', title: 'ServiceHands', shows: 'Jobs tied to the room and the device, from report to resolution.', route: '/servicehands', perspective: 'service', perspectiveLabel: 'Service Engineer' },
  commissioning: { id: 'product-commissioning', title: 'Commissioning, a room’s record', shows: 'Atlas 4.218’s five check phases and the approval it is blocked on, with every unresolved item named.', route: `/commissioning/room/${FOLLOW_ROOM}`, perspective: 'cxeng', perspectiveLabel: 'Commissioning Engineer' },
  apex: { id: 'product-apex', title: 'APEX, diagnosis and analytics', shows: 'Diagnosis and analytics on simulated evidence, each figure traced to its source.', route: '/v25/apex', perspective: 'ops', perspectiveLabel: 'AV Operations Lead' },
  field: { id: 'product-field', title: 'Field Intelligence, a room scan', shows: 'A scan of Atlas 4.218 you play step by step: what it observes, inside the policy limits, with provenance.', route: `/v25/fi/scan/${FOLLOW_ROOM}`, perspective: 'syseng', perspectiveLabel: 'Systems Engineer' },
  learn: { id: 'product-learn', title: 'SIGNAL: Ten Seats', shows: 'Season 1, episode 1 as an interactive film you play.', route: '/film/s01e01', perspective: 'architect', perspectiveLabel: 'Product Architect' },
};

/**
 * The investor start (founder, 19 Nov 2026 09:09: opened "normally or through the main open the demo button" it should open "with
 * product architect role selected"): the welcome page as the Product Architect, who may open every surface.
 */
export const START_LAUNCH: Launch = { id: 'start', title: 'Welcome to Empathia', shows: 'The campus, Search Party and every product, one choice away.', route: '/investor', perspective: 'architect', perspectiveLabel: 'Product Architect' };

/**
 * Modules beyond the nine products (Enterprise 3.0 directive, 23 Nov 2026): the demonstration each module's website page opens.
 * VOICE opens the CallPath of the followed room as the UC / Voice Administrator (founder decision E3-D2, 23 Nov 2026). The same rules apply: the route is registered and the perspective may open it.
 */
export const MODULE_LAUNCHES: Readonly<Record<string, Launch>> = {
  voice: { id: 'module-voice', title: 'VOICE, the CallPath of Atlas 4.218', shows: 'One room’s call path hop by hop: what is configured, what was observed in a simulated session, and what is not known.', route: `/voice/callpath/${FOLLOW_ROOM}`, perspective: 'ucadmin', perspectiveLabel: 'UC / Voice Administrator' },
  flow: { id: 'module-flow', title: 'FLOW, the uplink of access switch ATL-4A', shows: 'What is declared, observed and unknown about one switch, layer by layer, and the rooms that depend on it.', route: '/flow/link/SW-ATL-4A', perspective: 'ops', perspectiveLabel: 'AV Operations Lead' },
  missionproof: { id: 'module-missionproof', title: 'MissionProof, the company town hall', shows: 'Readiness of one event, read from the records it depends on.', route: '/missionproof', perspective: 'ops', perspectiveLabel: 'AV Operations Lead' },
  prism: { id: 'module-prism', title: 'PRISM, the estate’s screens', shows: 'What each screen should show, what its player reports, and where there is proof of play.', route: '/prism', perspective: 'ops', perspectiveLabel: 'AV Operations Lead' },
  sentinel: { id: 'module-sentinel', title: 'SENTINEL, one simulated drill', shows: 'Whether an approved secondary notice was requested, acknowledged, proven shown or failed on each route. A simulation, not a life-safety system.', route: '/sentinel', perspective: 'ops', perspectiveLabel: 'AV Operations Lead' },
  accord: { id: 'module-accord', title: 'ACCORD, one evidence capsule', shows: 'Scoped evidence shared with a service provider until a date, with what is withheld.', route: '/accord', perspective: 'steward', perspectiveLabel: 'Data Steward' },
  forge: { id: 'module-forge', title: 'FORGE, the package of Atlas 4.218', shows: 'A room’s design record compiled into reviewable artefacts, and the configuration FORGE refuses to generate.', route: `/forge/room/${FOLLOW_ROOM}`, perspective: 'cxeng', perspectiveLabel: 'Commissioning Engineer' },
  omnipresence: { id: 'module-omnipresence', title: 'OMNIPRESENCE, the tag of the Atlas building', shows: 'What a building’s tag opens on a phone, and what it does not prove.', route: '/omnipresence/b/ATL', perspective: 'ops', perspectiveLabel: 'AV Operations Lead' },
};

export const LAUNCHES: readonly Launch[] = [START_LAUNCH, ...FOLLOW, ...Object.values(PRODUCT_LAUNCHES), ...Object.values(MODULE_LAUNCHES)];
export const launchById = (id: string | null | undefined): Launch | null => LAUNCHES.find((l) => l.id === id) || null;

/** A website path the demonstration may send the visitor back to: absolute path, optional #anchor, nothing that leaves the site. */
export const isSitePath = (p: string | null | undefined): p is string => !!p && /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?(?:#[a-z0-9-]+)?$/.test(p);

/** The link the website puts on "Open this exact demonstration": the demonstration's address plus from=site, the id and the way back. */
export function launchHref(demoUrl: string, l: Launch, back: string): string {
  if (!isSitePath(back)) throw new Error(`launch ${l.id}: back must be a site path, got ${back}`);
  const sep = l.route.includes('?') ? '&' : '?';
  return `${demoUrl.replace(/\/$/, '')}/#${l.route}${sep}from=site&li=${encodeURIComponent(l.id)}&back=${encodeURIComponent(back)}`;
}

export interface LaunchIntent { launch: Launch; back: string }
/** Reads a launch from a demonstration address's query: only a catalogued id from the website, with a safe way back; otherwise null. */
export function readLaunch(query: URLSearchParams): LaunchIntent | null {
  if (query.get('from') !== 'site') return null;
  const launch = launchById(query.get('li')); const back = query.get('back');
  if (!launch) return null;
  return { launch, back: isSitePath(back) ? back : '/' };
}
