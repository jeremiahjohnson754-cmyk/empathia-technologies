/**
 * The Empathia price book, version 2 (founder directive 18 Nov 2026, 19:39, the "60/10 Master Commercial Pricing Architecture"; adopted
 * "all the way there" at 20:51: "the updated pricing is king"). This file is the one place a v2 rate is written. The website's
 * calculator, the pricing pages, the exported MASTER_PRICE_BOOK.json and the tests all read it from here.
 *
 * Each rate carries its status and its source, so a page can say what a figure is:
 *   founder-directed   a rate the founder set (19:39), adopted by the founder (20:51) — still a proposed list price, not a binding offer
 *   founder-suggested  a figure the founder floated ("maybe") whose terms are drafted here and wait for approval
 *   list-v1.5          a price from the founder's v1.5 list (generated catalogue), kept where v2 does not replace it
 *   proposed-concept   FieldLink hardware: a proposed price for a concept that has not been built
 *   custom-quote       priced by scope (implementation): never a fixed figure on a page
 *   pending-approval   a rule or term drafted here for the founder's decision
 *
 * Public fields only. Hardware unit costs, margins and supplier figures are never written in this repository (FL-10 guards the site).
 * Money is integer cents.
 */
export type RateStatus = 'founder-directed' | 'founder-suggested' | 'list-v1.5' | 'proposed-concept' | 'custom-quote' | 'pending-approval';

export interface Rate { id: string; name: string; cents: number; unit: string; status: RateStatus; source: string; note?: string }
export interface PlatformBand { id: string; from: number; to: number | null; cents: number; startingAt: boolean; status: RateStatus; source: string }
export interface Superseded { sku: string; by: string; note: string }
export interface PilotOffer { id: string; name: string; cents: number; unit: string; priceStatus: RateStatus; termsStatus: RateStatus; source: string; includes: string; complementaryChoices: readonly string[]; proposedTerms: readonly string[] }

const S1939 = 'Founder directive, 18 Nov 2026 19:39 (60/10 pricing baseline); adopted 20:51';
const S2051 = 'Founder, 18 Nov 2026 20:51: "maybe the $19.99 price can be a pilot package price for just pro and another complimentary product item"';

export const PRICE_BOOK = {
  id: 'EMPATHIA-PB-2',
  version: '2.0.0-draft.1',
  effective: '2026-11-18',
  currency: 'USD',
  label: 'Proposed list prices (founder-directed, 18 Nov 2026). Not a quote and not a binding offer; before any applicable tax.',
  /** the device rule that decides a room's tier (D-05): pending the founder's approval */
  roomRule: {
    largeFromDevices: 20,
    counts: 'devices installed and in service in the room’s current baseline',
    excludes: 'spares, retired devices and virtual endpoints',
    status: 'pending-approval' as RateStatus,
  },
  user: { id: 'USER', name: 'Licensed user', cents: 999, unit: 'per licensed user, per month', status: 'founder-directed', source: S1939, note: 'Named, active staff; public guests are never charged per user.' } satisfies Rate,
  rooms: {
    standard: { id: 'ROOM-STD', name: 'Standard room (up to 19 devices)', cents: 3999, unit: 'per room, per month', status: 'founder-directed', source: S1939 } satisfies Rate,
    large: { id: 'ROOM-LRG', name: 'Large room (20 or more devices)', cents: 7499, unit: 'per room, per month', status: 'founder-directed', source: S1939 } satisfies Rate,
  },
  /** annual platform fee by the estate's room count; the enterprise fee is a starting figure confirmed in a quote */
  platform: [
    { id: 'PLATFORM-1-9', from: 1, to: 9, cents: 249900, startingAt: false, status: 'founder-directed', source: S1939 },
    { id: 'PLATFORM-10-19', from: 10, to: 19, cents: 349900, startingAt: false, status: 'founder-directed', source: S1939 },
    { id: 'PLATFORM-20-24', from: 20, to: 24, cents: 499900, startingAt: false, status: 'founder-directed', source: S1939 },
    { id: 'PLATFORM-ENTERPRISE', from: 25, to: null, cents: 1500000, startingAt: true, status: 'founder-directed', source: S1939 },
  ] as readonly PlatformBand[],
  hardware: [
    { id: 'FIELDLINK-NANO', name: 'FieldLink Nano', cents: 24900, unit: 'per device, once', status: 'proposed-concept', source: S1939, note: 'Concept; no unit has been built. Optional: Empathia works without FieldLink.' },
    { id: 'FIELDLINK-EDGE', name: 'FieldLink Edge', cents: 149900, unit: 'per device, once', status: 'proposed-concept', source: S1939, note: 'Concept; no unit has been built. Optional; not one per room.' },
    { id: 'FIELDLINK-PULSE', name: 'FieldLink Pulse', cents: 49900, unit: 'per device, once', status: 'proposed-concept', source: S1939, note: 'Concept; no unit has been built. Optional.' },
  ] as readonly Rate[],
  implementation: { status: 'custom-quote' as RateStatus, source: S1939, says: 'One-time, scope-based quote: rooms, sites, integrations, data quality and training set it.' },
  /** v1.5 lines that v2 replaces everywhere ("all the way there"); the history stays in the generated v1.5 catalogue */
  superseded: [
    { sku: 'PRO-ROOM', by: 'ROOM-STD, ROOM-LRG', note: 'The v1.5 $19.99 Pro room licence is replaced by the standard and large room licences; $19.99 lives on only as the proposed Pro pilot rate.' },
    { sku: 'CORE-STARTER', by: 'PLATFORM-*', note: 'Replaced by the annual platform fee.' },
    { sku: 'CORE-ENTERPRISE', by: 'PLATFORM-*', note: 'Replaced by the annual platform fee.' },
    { sku: 'SEAT-ENTERPRISE', by: 'USER', note: 'Same $9.99 a month; one licensed-user line, never two.' },
  ] as readonly Superseded[],
  pilots: [
    {
      id: 'PILOT-PRO-PLUS', name: 'Pro pilot, plus one product', cents: 1999, unit: 'per room, per month',
      priceStatus: 'founder-suggested', termsStatus: 'pending-approval', source: S2051,
      includes: 'Empathia Pro for each pilot room, and one more product from the list, included',
      complementaryChoices: ['COMMISSION', 'ASSURANCE', 'SERVICE', 'SEARCH'],
      proposedTerms: ['Up to 10 rooms', '90 days', 'No platform fee during the pilot', 'Licensed users at the standard $9.99 a month', 'Converts to the room licences above; nothing renews at the pilot rate'],
    },
  ] as readonly PilotOffer[],
} as const;

/** Which tier a room is, from the devices that count (D-05, pending approval). */
export function roomTier(devicesInService: number): 'standard' | 'large' {
  if (!Number.isInteger(devicesInService) || devicesInService < 0) throw new Error('a room’s device count must be a whole number ≥ 0');
  return devicesInService >= PRICE_BOOK.roomRule.largeFromDevices ? 'large' : 'standard';
}

/** The platform band for an estate of this many rooms (at least one). */
export function platformBand(rooms: number): PlatformBand {
  if (!Number.isInteger(rooms) || rooms < 1) throw new Error('an estate has at least one room');
  return PRICE_BOOK.platform.find((b) => rooms >= b.from && (b.to === null || rooms <= b.to))!;
}

const SUPERSEDED = new Set(PRICE_BOOK.superseded.map((s) => s.sku));
export const isSuperseded = (sku: string) => SUPERSEDED.has(sku);
