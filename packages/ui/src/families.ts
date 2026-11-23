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
export interface Family { id: string; name: string; says: string; members: readonly Capability[] }
const P = (id: string, name: string, says: string, demo: string): Capability => ({ id, name, kind: 'product', says, demo, site: `/products/${id === 'field' ? 'field-intelligence' : id}`, built: true });
const C = (id: string, name: string, says: string, demo?: string, site?: string): Capability => ({ id, name, kind: 'capability', says, ...(demo ? { demo } : {}), ...(site ? { site } : {}), built: !!demo });

export const FAMILIES: readonly Family[] = [
  { id: 'operations', name: 'Operations', says: 'What is happening, what matters and what to do about it', members: [
    P('mission-control', 'Mission Control', 'What changed, what matters and what needs action', '/v25'),
    P('pro', 'Pro', 'Operational intelligence: portfolio, projects and service performance', '/pro'),
    P('servicehands', 'ServiceHands', 'Work orders closed with field evidence and a verified retest', '/servicehands'),
    P('apex', 'APEX', 'Diagnosis that cites its evidence and names what it does not know', '/v25/apex'),
    C('missionproof', 'MissionProof', 'Readiness for an event that must not fail, traced to the records it depends on', '/missionproof'),
  ] },
  { id: 'design', name: 'Design and engineering', says: 'From an idea for a room to an approved, buildable design', members: [
    P('lite', 'Lite', 'Spatial room design on the real engine; Scouter proposes equipment from comparable rooms', '/lite'),
    C('forge', 'FORGE', 'Room-as-Code: approved design intent as versioned, reviewable engineering artefacts'),
  ] },
  { id: 'field', name: 'Field and assurance', says: 'Proof that a room does what it was approved to do, and keeps doing it', members: [
    P('commissioning', 'Commissioning & Assurance', 'Adaptive tests, evidence, independent verification, accepted baselines and drift', '/commissioning'),
    P('field', 'Field Intelligence', 'Authorised, labelled observations of a room, inside policy limits', '/v25/fi'),
  ] },
  { id: 'infrastructure', name: 'Infrastructure and communications', says: 'The network and the calling that every room depends on', members: [
    C('flow', 'FLOW', 'AVoIP signal and network intelligence, read-only: what depends on what, layer by layer', '/flow'),
    C('voice', 'VOICE', 'Telephony and UC intelligence: the CallPath Digital Twin', '/voice', '/voice'),
  ] },
  { id: 'experience', name: 'Experience and safety', says: 'What people in the building see, and how they are reached', members: [
    C('prism', 'PRISM', 'Signage and experience assurance: intended content against what a screen actually shows'),
    C('sentinel', 'SENTINEL', 'Emergency communications assurance for approved secondary channels; never a life-safety system'),
    C('omnipresence', 'OMNIPRESENCE', 'A building QR or tag opens the room’s context on a phone; presence and control need separate proof'),
  ] },
  { id: 'collaboration', name: 'Collaboration and knowledge', says: 'Finding things, sharing proof across organisations, and learning from it', members: [
    P('search-party', 'Search Party', 'Universal search and the relationships between rooms, devices, people and projects', '/search'),
    C('accord', 'ACCORD', 'Scoped, expiring evidence shared between a customer, an integrator and a service provider'),
    P('learn', 'Learn', 'SIGNAL and the lessons that come out of real jobs', '/learn'),
  ] },
];
export const CAPABILITIES: readonly Capability[] = FAMILIES.flatMap((f) => f.members);
export const familyOf = (id: string): Family | undefined => FAMILIES.find((f) => f.members.some((m) => m.id === id));
