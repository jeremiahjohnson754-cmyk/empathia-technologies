/**
 * Build Your Empathia: the estimate for one estate from the v2 price book (pricebook.ts). The website's calculator, its no-script
 * fallback, the exported scenarios and the tests all call this, so no total is ever added up anywhere else.
 *
 *   annual recurring = platform fee (a year) + (rooms + users + add-ons, each a month) × 12
 *   one-time         = optional FieldLink hardware (implementation is a scope-based quote and is never priced here)
 *   first year       = annual recurring + one-time
 *   three / five years = annual recurring × 3 / × 5 + one-time, at today's list prices (no escalation, renewal change or discount)
 *
 * Add-ons are v1.5 list products that v2 keeps, priced by the existing quote() so its rules (the Search Party minimum) live in one
 * place. Lines v2 replaces (the v1.5 Pro room, Core and named-user seat) are refused, so nothing is charged twice. Bundle discounts are
 * not applied: in v2 they wait for the founder's approval. Integer cents throughout; every figure is before any applicable tax.
 */
import { PRICE_BOOK, platformFee, isSuperseded, type PlatformFee, type RateStatus } from './pricebook.js';
import { quote } from './quote.js';
import { SKUS } from './generated/catalog.js';
import { usd } from './money.js';

export type HardwareKey = 'nano' | 'edge' | 'pulse';
export interface EstimateInput {
  standardRooms: number;
  largeRooms: number;
  users: number;
  addOns?: ReadonlyArray<{ sku: string; quantity: number }>;
  hardware?: Partial<Record<HardwareKey, number>>;
  /** devices across the estate, used only for the per-device figure */
  devices?: number;
  /** the estate started with 24 rooms or fewer: its growth band applies (founder 19 Nov 03:47) */
  startedSmall?: boolean;
}
export interface EstimateLine { id: string; label: string; quantity: number; unitCents: number; per: string; cents: number; status: RateStatus; note?: string }
export interface Estimate {
  rooms: number;
  /** the platform fee and the rule that set it */
  band: PlatformFee;
  /** each recurring line as a year's amount */
  recurring: EstimateLine[];
  oneTime: EstimateLine[];
  /** the lines billed by the month (rooms, users, add-ons), for one month; the platform fee is billed by the year */
  monthlyCents: number;
  annualRecurringCents: number;
  oneTimeCents: number;
  firstYearCents: number;
  threeYearCents: number;
  fiveYearCents: number;
  perRoomAnnualCents: number;
  perUserAnnualCents: number | null;
  perDeviceAnnualCents: number | null;
  excluded: string[];
  notes: string[];
}

export const MAX_ROOMS = 100000;
export const MAX_USERS = 1000000;
const HW: Record<HardwareKey, string> = { nano: 'FIELDLINK-NANO', edge: 'FIELDLINK-EDGE', pulse: 'FIELDLINK-PULSE' };
const whole = (n: unknown, what: string, max: number) => { if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > max) throw new Error(`${what} must be a whole number from 0 to ${max.toLocaleString('en-US')}`); return n; };
/** half-up division of non-negative integers */
const div = (a: number, b: number) => Math.floor((2 * a + b) / (2 * b));

export function estimate(input: EstimateInput): Estimate {
  const std = whole(input.standardRooms, 'Standard rooms', MAX_ROOMS);
  const lrg = whole(input.largeRooms, 'Large rooms', MAX_ROOMS);
  const users = whole(input.users, 'Licensed users', MAX_USERS);
  const rooms = std + lrg;
  if (rooms < 1) throw new Error('An estimate needs at least one room');
  if (rooms > MAX_ROOMS) throw new Error(`More than ${MAX_ROOMS.toLocaleString('en-US')} rooms is a custom quote`);
  if (input.startedSmall !== undefined && typeof input.startedSmall !== 'boolean') throw new Error('startedSmall is yes or no');
  const band = platformFee(rooms, input.startedSmall === true);
  const { standard, large } = PRICE_BOOK.rooms; const u = PRICE_BOOK.user;
  const recurring: EstimateLine[] = [
    { id: band.id, label: band.label, quantity: 1, unitCents: band.cents, per: 'per year', cents: band.cents, status: band.status },
  ];
  if (std) recurring.push({ id: standard.id, label: `${std.toLocaleString('en-US')} standard room${std === 1 ? '' : 's'}`, quantity: std, unitCents: standard.cents, per: standard.unit, cents: std * standard.cents * 12, status: standard.status });
  if (lrg) recurring.push({ id: large.id, label: `${lrg.toLocaleString('en-US')} large room${lrg === 1 ? '' : 's'}`, quantity: lrg, unitCents: large.cents, per: large.unit, cents: lrg * large.cents * 12, status: large.status });
  if (users) recurring.push({ id: u.id, label: `${users.toLocaleString('en-US')} licensed user${users === 1 ? '' : 's'}`, quantity: users, unitCents: u.cents, per: u.unit, cents: users * u.cents * 12, status: u.status });

  const notes: string[] = [];
  const addOns = input.addOns || [];
  if (addOns.length) {
    const seen = new Set<string>(); const quantities: Record<string, number> = {};
    for (const a of addOns) {
      if (seen.has(a.sku)) throw new Error(`${a.sku} is listed twice`);
      seen.add(a.sku);
      if (isSuperseded(a.sku)) throw new Error(`${a.sku} is replaced in price book 2 (${PRICE_BOOK.superseded.find((s) => s.sku === a.sku)!.by}) and cannot be added`);
      if (!SKUS.some((s) => s.sku === a.sku)) throw new Error(`unknown add-on ${a.sku}`);
      quantities[a.sku] = whole(a.quantity, `The quantity of ${a.sku}`, MAX_ROOMS * 100);
    }
    const q = quote({ quantities });
    for (const l of q.monthly) if (l.cents) recurring.push({ id: l.sku, label: l.name, quantity: l.quantity, unitCents: l.unitCents, per: 'per month, from the v1.5 list', cents: l.cents * 12, status: 'list-v1.5', note: l.note });
    if (q.oneTime.length) throw new Error('one-time v1.5 lines are not add-ons');
    notes.push(...q.notes.filter((n) => !/^Before any applicable tax/.test(n)));
  }

  const oneTime: EstimateLine[] = [];
  for (const k of Object.keys(HW) as HardwareKey[]) {
    const n = whole(input.hardware?.[k] ?? 0, `FieldLink ${k}`, MAX_ROOMS * 10);
    if (!n) continue;
    const r = PRICE_BOOK.hardware.find((h) => h.id === HW[k])!;
    oneTime.push({ id: r.id, label: `${n.toLocaleString('en-US')} × ${r.name}`, quantity: n, unitCents: r.cents, per: r.unit, cents: n * r.cents, status: r.status, note: r.note });
  }

  const sum = (xs: EstimateLine[]) => xs.reduce((a, l) => a + l.cents, 0);
  const annual = sum(recurring); const once = sum(oneTime);
  const monthlyCents = recurring.filter((l) => l.id !== band.id).reduce((a, l) => a + l.cents, 0) / 12;   // every month-billed line is a whole month × 12
  const devices = input.devices === undefined ? null : whole(input.devices, 'Devices', MAX_ROOMS * 1000);

  if (rooms >= 20 && !band.startingAt) { const g = PRICE_BOOK.growth; notes.push(`From ${g.from} rooms the platform fee grows ${usd(g.perRoomCents)} a year for each room past ${g.from - 1}, and stops at ${usd(g.enterpriseCents)}. An estate that started with ${g.grace.startedAtOrBelow} rooms or fewer pays at most ${usd(g.grace.capCents)} more until it passes ${g.grace.throughRooms} rooms. ${g.notice} ${g.explains}`); }
  if (band.startingAt) notes.push('The enterprise platform fee is a starting figure; the fee for this estate is confirmed in a quote.');
  if (oneTime.length) notes.push('FieldLink is optional hardware at proposed concept prices: no unit has been built, and Empathia works without it.');
  notes.push('Totals over three and five years use today’s list prices, with no escalation, renewal change or discount.');

  return {
    rooms, band, recurring, oneTime,
    monthlyCents,
    annualRecurringCents: annual, oneTimeCents: once,
    firstYearCents: annual + once, threeYearCents: annual * 3 + once, fiveYearCents: annual * 5 + once,
    perRoomAnnualCents: div(annual, rooms),
    perUserAnnualCents: users ? div(annual, users) : null,
    perDeviceAnnualCents: devices ? div(annual, devices) : null,
    excluded: [
      'Implementation: a one-time, scope-based quote',
      'Integrations and connector work beyond the products chosen',
      'Hardware installation and calibration',
      'Discounts: bundle and volume discounts are not applied in price book 2 until approved',
      'Taxes',
    ],
    notes,
  };
}
