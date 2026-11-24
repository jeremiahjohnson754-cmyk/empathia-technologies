/**
 * Platform families (founder decision E3-D1, 23 Nov 2026): "VOICE, FLOW, FORGE, PRISM, SENTINEL, ACCORD, MissionProof, and
 * OMNIPRESENCE must be represented as first-class, interconnected capabilities within Empathia. Organize them into logical product
 * families for navigation, but retain dedicated pages, workflows, routes, permissions, and technical contracts. Preserve the original
 * nine products and their identifiers."
 *
 * So: the nine products of products.ts keep their ids, order and colours, untouched. This file adds the eight accepted capabilities
 * and groups all seventeen into six families for navigation on both sites. `demo` is the capability's address in the demonstration
 * when it has one; `built: false` means it is specified and not built, and every surface that lists it must say so.
 * No imports: this file runs as-is under Node's type stripping and in every bundler.
 */
export interface Capability { id: string; name: string; kind: 'product' | 'capability'; says: string; /** demonstration address (hash route without #), when built */ demo?: string; /** website path of its page, when it has one */ site?: string; built: boolean }
export interface Family { id: string; name: string; says: string; /** the question the family answers, as a buyer would ask it */ asks: string; /** where its records go next */ hands: string; members: readonly Capability[] }
const P = (id: string, name: string, says: string, demo: string): Capability => ({ id, name, kind: 'product', says, demo, site: `/products/${id === 'field' ? 'field-intelligence' : id}`, built: true });
const C = (id: string, name: string, says: string, demo?: string, site?: string): Capability => ({ id, name, kind: 'capability', says, ...(demo ? { demo } : {}), ...(site ? { site } : {}), built: !!demo });

export const FAMILIES: readonly Family[] = [
  { id: 'operations', name: 'Operations', says: 'What is happening, what matters and what to do about it', asks: 'What is happening across the estate, and what do we do about it?', hands: 'Operations reads what every other family records, and sends work back to them: a job to the field, a change to design, a question to the people who know.', members: [
    P('mission-control', 'Mission Control', 'What changed, what matters and what needs action', '/v25'),
    P('pro', 'Pro', 'Operational intelligence: portfolio, projects and service performance', '/pro'),
    P('servicehands', 'ServiceHands', 'Work orders closed with field evidence and a verified retest', '/servicehands'),
    P('apex', 'APEX', 'Diagnosis that cites its evidence and names what it does not know', '/v25/apex'),
    C('missionproof', 'MissionProof', 'Readiness for an event that must not fail, traced to the records it depends on', '/missionproof'),
  ] },
  { id: 'design', name: 'Design and engineering', says: 'From an idea for a room to an approved, buildable design', asks: 'What should this room be, and can it be built as approved?', hands: 'An approved design becomes the tests commissioning runs and the numbered positions every later record names.', members: [
    P('lite', 'Lite', 'Spatial room design on the real engine; Scouter proposes equipment from comparable rooms', '/lite'),
    C('forge', 'FORGE', 'Room-as-Code: approved design intent as versioned, reviewable engineering artefacts', '/forge'),
  ] },
  { id: 'field', name: 'Field and assurance', says: 'Proof that a room does what it was approved to do, and keeps doing it', asks: 'Does the room do what was approved, and does it still?', hands: 'An accepted baseline is what operations compares every later change, failure and repair with.', members: [
    P('commissioning', 'Commissioning & Assurance', 'Adaptive tests, evidence, independent verification, accepted baselines and drift', '/commissioning'),
    P('field', 'Field Intelligence', 'Authorised, labelled observations of a room, inside policy limits', '/v25/fi'),
  ] },
  { id: 'infrastructure', name: 'Infrastructure and communications', says: 'The network and the calling that every room depends on', asks: 'Can the network and the calling carry what the rooms need?', hands: 'Its evidence is cited by diagnosis, attached to service jobs, and read by event readiness.', members: [
    C('flow', 'FLOW', 'AVoIP signal and network intelligence, read-only: what depends on what, layer by layer', '/flow'),
    C('voice', 'VOICE', 'Telephony and UC intelligence: the CallPath Digital Twin', '/voice', '/voice'),
  ] },
  { id: 'experience', name: 'Experience and safety', says: 'What people in the building see, and how they are reached', asks: 'What do people in the building see, and how are they reached?', hands: 'Its screens and tags are the same assets and rooms as everywhere else, so an exception becomes an ordinary service job.', members: [
    C('prism', 'PRISM', 'Signage and experience assurance: intended content against what a screen actually shows', '/prism'),
    C('sentinel', 'SENTINEL', 'Emergency communications assurance for approved secondary channels; never a life-safety system', '/sentinel'),
    C('omnipresence', 'OMNIPRESENCE', 'A building’s tag opens the building on a phone; presence and control need separate proof', '/omnipresence'),
  ] },
  { id: 'collaboration', name: 'Collaboration and knowledge', says: 'Finding things, sharing proof across organisations, and learning from it', asks: 'Who knows, who may see, and what did we learn?', hands: 'Search reaches any record of any family; a scoped capsule carries evidence to another organisation; a lesson goes back to the people who do the work.', members: [
    P('search-party', 'Search Party', 'Universal search and the relationships between rooms, devices, people and projects', '/search'),
    C('accord', 'ACCORD', 'Scoped, expiring evidence shared between a customer, an integrator and a service provider', '/accord'),
    P('learn', 'Learn', 'SIGNAL and the lessons that come out of real jobs', '/learn'),
  ] },
];
export const CAPABILITIES: readonly Capability[] = FAMILIES.flatMap((f) => f.members);
export const familyOf = (id: string): Family | undefined => FAMILIES.find((f) => f.members.some((m) => m.id === id));

/** The positioning, in the founder's words (23 Nov 2026): one line and the sentence under it, used by both sites. */
export const POSITIONING = { line: 'One platform. Six product families. Shared engineering intelligence.',
  lead: 'Seventeen capabilities stand on one record. A room, a device, a person and a job keep one identity from the first request to the last service visit, so each family reads what the others wrote.' } as const;
/** What every capability shares: the engineering intelligence under the six families. `icon` names a line icon of the website's set. */
export const SHARED: ReadonlyArray<{ id: string; title: string; says: string; icon: string }> = [
  { id: 'identity', title: 'One identity', says: 'A room, a position, an asset, a person and a job each have one id, the same in every capability. Nothing is re-keyed between products.', icon: 'key' },
  { id: 'evidence', title: 'One vocabulary for evidence', says: 'Every value says whether it was declared, modelled, simulated, observed or verified, and what is unknown stays unknown.', icon: 'evidence' },
  { id: 'graph', title: 'One relationship graph', says: 'What contains, feeds, supports and depends on what, each relationship with where it comes from. Impact is computed, not guessed.', icon: 'model' },
  { id: 'authority', title: 'One permission model', says: 'What a role may open and do is decided the same way everywhere, and a refusal says why.', icon: 'lock' },
  { id: 'ledger', title: 'One ledger', says: 'Who did what, when and on which evidence. Closing a job never accepts a room, and nobody verifies their own work.', icon: 'history' },
  { id: 'engines', title: 'One set of engines', says: 'Commissioning, assurance, relationships, service and diagnosis are shared rule sets. A capability reads them; it does not carry its own copy.', icon: 'code' },
];
/** One issue followed through the families, at one synthetic room (Atlas 4.218). `launch` is an id of the website's launch catalogue. */
export const THREAD: ReadonlyArray<{ family: string; launch: string; title: string; says: string }> = [
  { family: 'collaboration', launch: 'follow-support', title: 'Find the room', says: 'Search Party: the room, who supports it and what it depends on, each relationship with its source.' },
  { family: 'infrastructure', launch: 'module-voice', title: 'See the calling problem', says: 'VOICE: the room’s call path hop by hop, with what was observed kept apart from what is configured.' },
  { family: 'infrastructure', launch: 'module-flow', title: 'Look at the shared uplink', says: 'FLOW: the switch three rooms share, layer by layer. A hypothesis, not a root cause.' },
  { family: 'operations', launch: 'product-apex', title: 'Diagnose it', says: 'APEX: ranked hypotheses that cite their evidence, with VOICE’s reading beside them.' },
  { family: 'operations', launch: 'product-servicehands', title: 'Send the right person', says: 'ServiceHands: the job, its evidence, and a second person to verify the repair.' },
  { family: 'field', launch: 'follow-assurance', title: 'Check it against the baseline', says: 'Assurance: the accepted baseline, with the room’s calling evidence shown beside it.' },
  { family: 'collaboration', launch: 'module-accord', title: 'Share only what is needed', says: 'ACCORD: the service provider receives scoped evidence for this one issue, until a date.' },
  { family: 'operations', launch: 'module-missionproof', title: 'Ask whether the event is ready', says: 'MissionProof: the town hall’s readiness, read from the same records.' },
  { family: 'design', launch: 'module-forge', title: 'Go back to the design', says: 'FORGE: the room’s design record compiled into what a rebuild would need.' },
  { family: 'experience', launch: 'module-omnipresence', title: 'Stand at the door', says: 'OMNIPRESENCE: what the building’s tag opens on a phone, and what it does not prove.' },
];

/**
 * How the capabilities read from and hand to each other: the edges of the platform map. Each pair is listed once, from the side that
 * reads or hands over, with what passes between them. Every one of the eight further capabilities appears here at least once: a
 * capability that connects to nothing is not part of the platform (checked by the unit suite).
 */
export const CONNECTIONS: ReadonlyArray<{ from: string; to: string; says: string }> = [
  { from: 'voice', to: 'flow', says: 'The uplink a call depends on, with the evidence case kept' },
  { from: 'voice', to: 'servicehands', says: 'A reported calling problem is a ServiceHands job' },
  { from: 'voice', to: 'apex', says: 'The calling evidence is cited beside the diagnosis' },
  { from: 'voice', to: 'commissioning', says: 'The calling evidence is shown beside the accepted baseline' },
  { from: 'voice', to: 'missionproof', says: 'The event’s calling dependency' },
  { from: 'flow', to: 'search-party', says: 'The same network records and impact traversal' },
  { from: 'flow', to: 'missionproof', says: 'The event’s uplink dependency' },
  { from: 'missionproof', to: 'commissioning', says: 'The host room’s accepted baseline' },
  { from: 'missionproof', to: 'servicehands', says: 'A repair counts only when verified by a second person' },
  { from: 'prism', to: 'sentinel', says: 'PRISM’s screens are SENTINEL’s signage routes' },
  { from: 'prism', to: 'servicehands', says: 'A screen’s exception is a ServiceHands job' },
  { from: 'sentinel', to: 'servicehands', says: 'Failed routes are followed up as one job' },
  { from: 'accord', to: 'servicehands', says: 'The job the capsule is about' },
  { from: 'accord', to: 'voice', says: 'The calling measurements the capsule shares' },
  { from: 'accord', to: 'flow', says: 'The uplink reading the capsule shares' },
  { from: 'forge', to: 'lite', says: 'The design record FORGE compiles' },
  { from: 'forge', to: 'commissioning', says: 'The acceptance plan is the commissioning engine’s tests' },
  { from: 'omnipresence', to: 'lite', says: 'The rooms a building’s tag opens' },
  { from: 'omnipresence', to: 'search-party', says: 'The same rooms and passports that search finds' },
];
/** The capabilities connected to one capability, either way round, without repeats. */
export function connectionsOf(id: string): Array<{ other: string; says: string }> {
  const seen = new Set<string>(); const out: Array<{ other: string; says: string }> = [];
  for (const c of CONNECTIONS) { const other = c.from === id ? c.to : c.to === id ? c.from : null; if (other && !seen.has(other)) { seen.add(other); out.push({ other, says: c.says }); } }
  return out;
}
