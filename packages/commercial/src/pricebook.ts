/**
 * The Empathia price book, version 3 (founder, 19 Nov 2026: per-device room pricing set at 04:04, the review approved at 04:30, the
 * remaining decisions at 04:45: "approve 1B, 2 IN, 3 YES, 4 YES for Price Book 3"). It builds on price book 2 (18 Nov 2026 19:39, adopted
 * 20:51) and its growth schedule (19 Nov 03:47). This file is the one place a rate is written. The website's calculator, the pricing
 * pages and the tests all read it from here.
 *
 * Each rate carries its status and its source, so a page can say what a figure is:
 *   founder-directed   a rate or rule the founder set or approved — still a proposed list price, not a binding offer
 *   founder-suggested  a figure the founder floated whose terms are drafted here and wait for approval
 *   list-v1.5          a price from the founder's v1.5 list (generated catalogue), kept where v3 does not replace it
 *   proposed-concept   FieldLink hardware: a proposed price for a concept that has not been built
 *   custom-quote       priced by scope (implementation): never a fixed figure on a page
 *   pending-approval   a rule or term drafted here for the founder's decision
 *
 * Public fields only. Hardware unit costs, margins, cost assumptions and supplier figures are never written in this repository.
 * Money is integer cents.
 */
import { usd } from './money.js';

export type RateStatus = 'founder-directed' | 'founder-suggested' | 'list-v1.5' | 'proposed-concept' | 'custom-quote' | 'pending-approval';

export interface Rate { id: string; name: string; cents: number; unit: string; status: RateStatus; source: string; note?: string }
/** a room licence: a monthly price that includes a number of devices, and the monthly price of each device beyond them */
export interface RoomRate extends Rate { includedDevices: number; deviceId: string; perDeviceCents: number }
export interface PlatformBand { id: string; from: number; to: number; cents: number; status: RateStatus; source: string }
/** the platform fee one estate pays, with the rule that produced it */
export interface PlatformFee { id: string; label: string; cents: number; grace: boolean; status: RateStatus; source: string }
export interface Tranche { from: number; to: number | null; pct: number }
export interface Superseded { sku: string; by: string; note: string }
export interface PilotOffer { id: string; name: string; cents: number; unit: string; priceStatus: RateStatus; termsStatus: RateStatus; source: string; includes: string; complementaryChoices: readonly string[]; terms: readonly string[]; proposedTerms: readonly string[] }

const S1939 = 'Founder directive, 18 Nov 2026 19:39 (60/10 pricing baseline); adopted 20:51';
const S2051 = 'Founder, 18 Nov 2026 20:51: "maybe the $19.99 price can be a pilot package price for just pro and another complimentary product item"';
const S0347 = 'Founder, 19 Nov 2026 03:36 (the growth band) and 03:47 ("go with those figures you mentioned"): $499 a room past 24 up to $15,000; $1,399 cap to 30 rooms for estates that started at 24 or fewer';
const S0404 = 'Founder, 19 Nov 2026 04:04 (per-device room rates), approved 04:30 ("approve the commercial direction") with the rule "20 or more devices = large" and the firm $15,000 fee';
const S0430 = 'Founder, 19 Nov 2026 04:30: "Approve the tiered volume discounts, $15,000 platform cap, customer protections, and no retroactive device billing"';
const S0445 = 'Founder, 19 Nov 2026 04:45: "approve 1B, 2 IN, 3 YES, 4 YES for Price Book 3"';

export const PRICE_BOOK = {
  id: 'EMPATHIA-PB-3',
  version: '3.0.0-draft.1',
  effective: '2026-11-19',
  currency: 'USD',
  label: 'Proposed list prices, price book 3 (founder-approved, 19 Nov 2026). Not a quote and not a binding offer; before any applicable tax.',
  /** which devices count, and which tier a room is (D-05, decided 04:45 "3 YES"; 20 or more = large, 04:30) */
  roomRule: {
    largeFromDevices: 20,
    counts: 'verified, unique assets installed and in service in the room’s commissioned baseline',
    excludes: 'spares, stock, retired devices and virtual endpoints',
    billing: 'Device charges are never retroactive: a device added during a term is billed from the next invoice after you have seen it.',
    status: 'founder-directed' as RateStatus, source: S0445,
  },
  user: { id: 'USER', name: 'Licensed user', cents: 999, unit: 'per licensed user, per month', status: 'founder-directed', source: S1939, note: 'Named, active staff; public guests are never charged per user.' } satisfies Rate,
  rooms: {
    standard: { id: 'ROOM-STD', name: 'Standard room (up to 19 devices)', cents: 3499, unit: 'per room, per month', includedDevices: 8, deviceId: 'DEVICE-STD', perDeviceCents: 299, status: 'founder-directed', source: S0404 } satisfies RoomRate,
    large: { id: 'ROOM-LRG', name: 'Large room (20 or more devices)', cents: 6899, unit: 'per room, per month', includedDevices: 20, deviceId: 'DEVICE-LRG', perDeviceCents: 399, status: 'founder-directed', source: S0404 } satisfies RoomRate,
  },
  /** annual platform fee below 25 rooms, by band (founder 19:39) */
  platform: [
    { id: 'PLATFORM-1-9', from: 1, to: 9, cents: 249900, status: 'founder-directed', source: S1939 },
    { id: 'PLATFORM-10-19', from: 10, to: 19, cents: 349900, status: 'founder-directed', source: S1939 },
    { id: 'PLATFORM-20-24', from: 20, to: 24, cents: 499900, status: 'founder-directed', source: S1939 },
  ] as readonly PlatformBand[],
  /**
   * From 25 rooms (03:47): the fee grows $499 a year for each room past 24 until it reaches $15,000 (at 45 rooms), and it is a firm
   * $15,000 from there (04:30: no "from"). An estate that started with 24 rooms or fewer pays at most $1,399 more until it passes 30
   * rooms, then $499 a room again, so it reaches $15,000 at 48. No added room raises the fee by more than $499. Scope beyond the standard
   * platform is its own named line on a quote, never part of this fee.
   */
  growth: {
    from: 25, baseCents: 499900, perRoomCents: 49900, enterpriseCents: 1500000,
    grace: { startedAtOrBelow: 24, throughRooms: 30, capCents: 139900 },
    status: 'founder-directed' as RateStatus, source: `${S0347}; firm cap: ${S0430}`,
    explains: 'The platform fee pays for the operational services outside the Empathia platform and the engineering that larger estates need.',
    notice: 'Nothing is charged up automatically: you are told before your fee changes.',
  },
  /**
   * Volume tranches (04:30). Each rate applies only to the rooms in its tranche: a room's monthly base licence takes its tranche's rate,
   * standard rooms counted first, then large rooms. Device charges are not volume-discounted: that keeps the rule provable — adding a
   * room or a device never lowers a bill — which a rate averaged over unequal rooms cannot promise for very dense estates.
   */
  volume: {
    tranches: [{ from: 101, to: 250, pct: 5 }, { from: 251, to: 500, pct: 10 }, { from: 501, to: null, pct: 15 }] as readonly Tranche[],
    rule: 'Room licences take their bundle discount or their volume discount, whichever is larger, never both. The platform fee never takes a volume discount.',
    status: 'founder-directed' as RateStatus, source: S0430,
  },
  /** bundles (the seven of the v1.5 list): what replaced a bundle's product takes its place in the bundle (04:45 "2 IN") */
  bundleSuccessors: { 'PRO-ROOM': 'room licences (their base and device charges)', 'CORE-ENTERPRISE': 'the platform fee' } as Readonly<Record<string, string>>,
  /** Search Party (04:45 "1B"): its own line and its own price; it never charges a device a room already charges per device */
  searchParty: {
    sku: 'SEARCH',
    counts: 'every managed asset except the devices a room already charges per device: the devices within each room’s included allowance, and the spares, stock and loaners you manage outside rooms',
    status: 'founder-directed' as RateStatus, source: S0445,
  },
  /** customer protection (04:30) */
  protection: {
    terms: [
      'The prices on a signed order hold for its whole term.',
      'At renewal, a room line that rises under per-device pricing rises by no more than 10 % a year until it reaches list; a line that falls takes the lower price at once.',
      'You are told 90 days before any change at renewal, line by line.',
      'Device charges are never retroactive.',
      'A pilot converts at the list prices in force on its first day, held for 12 months.',
    ] as readonly string[],
    status: 'founder-directed' as RateStatus, source: S0430,
  },
  hardware: [
    { id: 'FIELDLINK-NANO', name: 'FieldLink Nano', cents: 24900, unit: 'per device, once', status: 'proposed-concept', source: S1939, note: 'Concept; no unit has been built. Optional: Empathia works without FieldLink.' },
    { id: 'FIELDLINK-EDGE', name: 'FieldLink Edge', cents: 149900, unit: 'per device, once', status: 'proposed-concept', source: S1939, note: 'Concept; no unit has been built. Optional; not one per room.' },
    { id: 'FIELDLINK-PULSE', name: 'FieldLink Pulse', cents: 49900, unit: 'per device, once', status: 'proposed-concept', source: S1939, note: 'Concept; no unit has been built. Optional.' },
  ] as readonly Rate[],
  implementation: { status: 'custom-quote' as RateStatus, source: S1939, says: 'One-time, scope-based quote: rooms, sites, integrations, data quality and training set it.' },
  /** v1.5 lines that v2 and v3 replace everywhere; the history stays in the generated v1.5 catalogue */
  superseded: [
    { sku: 'PRO-ROOM', by: 'ROOM-STD, ROOM-LRG', note: 'The v1.5 $19.99 Pro room licence is replaced by the standard and large room licences; $19.99 lives on only as the Pro pilot rate.' },
    { sku: 'CORE-STARTER', by: 'PLATFORM-*', note: 'Replaced by the annual platform fee.' },
    { sku: 'CORE-ENTERPRISE', by: 'PLATFORM-*', note: 'Replaced by the annual platform fee.' },
    { sku: 'SEAT-ENTERPRISE', by: 'USER', note: 'Same $9.99 a month; one licensed-user line, never two.' },
  ] as readonly Superseded[],
  pilots: [
    {
      id: 'PILOT-PRO-PLUS', name: 'Pro pilot, plus one product', cents: 1999, unit: 'per room, per month',
      priceStatus: 'founder-directed', termsStatus: 'founder-directed', source: `${S2051}; terms: ${S0445} ("Pilots must have explicit limits, customer-approved conversion, and no unexpected charges")`,
      includes: 'Empathia Pro for each pilot room, and one more product from the list, included',
      complementaryChoices: ['COMMISSION', 'ASSURANCE', 'SERVICE', 'SEARCH'],
      terms: [
        'Up to 10 rooms, for 90 days',
        'The only charges: $19.99 a room a month, and licensed users at $9.99 a month each, named on the pilot order before it starts',
        'No platform fee, no device charges and no hardware during the pilot',
        'It ends on day 90; nothing continues unless you sign a conversion order, nothing renews by itself, and nothing renews at the pilot rate',
        'A converted estate keeps the list prices of the pilot’s first day for 12 months',
      ],
      proposedTerms: ['One pilot at a time per estate', 'Onboarding beyond the self-serve setup is a separate quote, only if you ask for one'],
    },
  ] as readonly PilotOffer[],
} as const;

/** Which tier a room is, from its verified in-service devices (20 or more: large). */
export function roomTier(devicesInService: number): 'standard' | 'large' {
  if (!Number.isInteger(devicesInService) || devicesInService < 0) throw new Error('a room’s device count must be a whole number ≥ 0');
  return devicesInService >= PRICE_BOOK.roomRule.largeFromDevices ? 'large' : 'standard';
}

/** One room's monthly licence, base and device charge, in cents. */
export function roomMonthlyCents(devicesInService: number): number {
  const r = PRICE_BOOK.rooms[roomTier(devicesInService)];
  return r.cents + Math.max(0, devicesInService - r.includedDevices) * r.perDeviceCents;
}

/** The annual platform fee for an estate of this many rooms (at least one); `startedSmall` = it started with 24 rooms or fewer. */
export function platformFee(rooms: number, startedSmall = false): PlatformFee {
  if (!Number.isInteger(rooms) || rooms < 1) throw new Error('an estate has at least one room');
  const band = PRICE_BOOK.platform.find((b) => rooms >= b.from && rooms <= b.to);
  if (band) return { id: band.id, label: `Annual platform fee (${band.from}–${band.to} rooms)`, cents: band.cents, grace: false, status: band.status, source: band.source };
  const g = PRICE_BOOK.growth; const past = rooms - (g.from - 1);
  const ramp = g.baseCents + g.perRoomCents * past;
  const graced = startedSmall ? g.baseCents + Math.min(g.perRoomCents * (Math.min(rooms, g.grace.throughRooms) - g.grace.startedAtOrBelow), g.grace.capCents) + g.perRoomCents * Math.max(0, rooms - g.grace.throughRooms) : ramp;
  const cents = Math.min(g.enterpriseCents, graced);
  if (cents === g.enterpriseCents) return { id: 'PLATFORM-ENTERPRISE', label: `Annual platform fee (enterprise: ${usd(g.enterpriseCents)}, firm)`, cents, grace: false, status: g.status, source: g.source };
  const plus = cents - g.baseCents;
  if (startedSmall && graced < ramp) return { id: 'PLATFORM-GROWTH-BAND', label: `Annual platform fee (${rooms} rooms, growth band: ${usd(g.baseCents)} + ${usd(plus)}${rooms <= g.grace.throughRooms ? `, capped at ${usd(g.grace.capCents)} to ${g.grace.throughRooms} rooms` : ''})`, cents, grace: true, status: g.status, source: g.source };
  return { id: 'PLATFORM-GROWTH', label: `Annual platform fee (${rooms} rooms: ${usd(g.baseCents)} + ${past} × ${usd(g.perRoomCents)})`, cents, grace: false, status: g.status, source: g.source };
}

const SUPERSEDED = new Set(PRICE_BOOK.superseded.map((s) => s.sku));
export const isSuperseded = (sku: string) => SUPERSEDED.has(sku);
