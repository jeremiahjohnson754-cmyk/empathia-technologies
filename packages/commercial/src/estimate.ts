/**
 * Build Your Empathia: the estimate for one estate from price book 3 (pricebook.ts). The website's calculator, its no-script fallback and
 * the tests all call this, so no total is ever added up anywhere else.
 *
 *   annual recurring = platform fee (a year) + (room licences + device charges + users + add-ons, each a month) × 12 − discounts
 *   one-time         = optional FieldLink hardware (implementation is a scope-based quote and is never priced here)
 *   first year       = annual recurring + one-time
 *   three / five years = annual recurring × 3 / × 5 + one-time, at today's list prices (no escalation, renewal change or discount)
 *
 * Rooms come in three groups so every room is priced exactly without listing each one: standard rooms with 8 devices or fewer (no device
 * charge), standard rooms with 9 to 19 devices (each device past 8 at $2.99), and large rooms with 20 or more (each past 20 at $3.99).
 * Devices are verified, unique assets in service in each room's commissioned baseline (04:45 "3 YES").
 *
 * Discounts are lines of their own, never hidden in a price: the volume tranches on room licences (04:30), or a bundle's discount on its
 * own products (the seven bundles of the v1.5 list; the platform fee takes Core's place and the room licences the Pro room's, 04:45
 * "2 IN"), only when the whole bundle is on the order (06:08). A room licence takes the larger of the two, never both. Search Party is counted by the price book: every managed asset except
 * the devices a room already charges per device (04:45 "1B"). Add-ons are v1.5 list products priced by quote(), so its rules (the Search
 * Party minimum) live in one place. Lines the price books replaced are refused, so nothing is charged twice. Integer cents throughout;
 * every figure is before any applicable tax.
 */
import { PRICE_BOOK, platformFee, isSuperseded, type PlatformFee, type RateStatus } from './pricebook.js';
import { quote } from './quote.js';
import { SKUS, BUNDLES } from './generated/catalog.js';
import { usd } from './money.js';

export type HardwareKey = 'nano' | 'edge' | 'pulse';
/** An estate's rooms in three groups, each with its devices in total. */
export interface RoomGroups {
  /** standard rooms with 8 devices or fewer, and their devices in total (0 to 8 a room) */
  small: number; smallDevices: number;
  /** standard rooms with 9 to 19 devices, and their devices in total (9 to 19 a room) */
  mid: number; midDevices: number;
  /** large rooms, 20 devices or more, and their devices in total (at least 20 a room) */
  large: number; largeDevices: number;
}
export interface EstimateInput {
  rooms: RoomGroups;
  users: number;
  /** v1.5 products. The quantity follows the estate where the unit says so (a room: the room count; a tenant: one); Search Party is counted by the price book. */
  addOns?: ReadonlyArray<{ sku: string; quantity?: number }>;
  /** assets Search Party manages outside the rooms: spares, stock, loaners */
  assetsOutsideRooms?: number;
  /** one of the seven bundles of the list */
  bundle?: string;
  hardware?: Partial<Record<HardwareKey, number>>;
  /** the estate started with 24 rooms or fewer: its growth band applies (founder 19 Nov 03:47) */
  startedSmall?: boolean;
}
export interface EstimateLine { id: string; label: string; quantity: number; unitCents: number; per: string; cents: number; status: RateStatus; note?: string }
export interface Estimate {
  rooms: number;
  devices: number;
  /** the platform fee and the rule that set it */
  band: PlatformFee;
  /** each recurring line as a year's amount; discounts are lines with a negative amount */
  recurring: EstimateLine[];
  oneTime: EstimateLine[];
  /** the lines billed by the month (rooms, devices, users, add-ons, net of their discounts), for one month; the platform fee is billed by the year */
  monthlyCents: number;
  annualRecurringCents: number;
  oneTimeCents: number;
  firstYearCents: number;
  threeYearCents: number;
  fiveYearCents: number;
  perRoomAnnualCents: number;
  perUserAnnualCents: number | null;
  perDeviceAnnualCents: number | null;
  /** Search Party's managed-asset count, when it is in the estimate */
  searchAssets: number | null;
  /** the bundle asked for: complete (its discount applies) or the products still to add (06:08: the discount is for the complete bundle) */
  bundle: { id: string; complete: boolean; missing: string[] } | null;
  excluded: string[];
  notes: string[];
}

export const MAX_ROOMS = 100000;
export const MAX_USERS = 1000000;
export const MAX_DEVICES = 100000000;
const HW: Record<HardwareKey, string> = { nano: 'FIELDLINK-NANO', edge: 'FIELDLINK-EDGE', pulse: 'FIELDLINK-PULSE' };
const whole = (n: unknown, what: string, max: number) => { if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > max) throw new Error(`${what} must be a whole number from 0 to ${max.toLocaleString('en-US')}`); return n; };
/** half-up division of non-negative integers */
const div = (a: number, b: number) => Math.floor((2 * a + b) / (2 * b));
/** a line less pct %, half up (the bundles' own rounding, quote()) */
const less = (cents: number, pct: number) => Math.floor((cents * (100 - pct) + 50) / 100);
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** The three groups from each room's own device count. */
export function groupsOf(devicesPerRoom: readonly number[]): RoomGroups {
  const g: RoomGroups = { small: 0, smallDevices: 0, mid: 0, midDevices: 0, large: 0, largeDevices: 0 };
  for (const d of devicesPerRoom) {
    whole(d, 'A room’s devices', MAX_DEVICES);
    if (d >= PRICE_BOOK.roomRule.largeFromDevices) { g.large++; g.largeDevices += d; }
    else if (d > PRICE_BOOK.rooms.standard.includedDevices) { g.mid++; g.midDevices += d; }
    else { g.small++; g.smallDevices += d; }
  }
  return g;
}

/** Validate the groups; returns the room count, the device count and the devices charged per device. */
export function checkGroups(r: RoomGroups) {
  const S = PRICE_BOOK.rooms.standard; const L = PRICE_BOOK.rooms.large; const big = PRICE_BOOK.roomRule.largeFromDevices;
  if (!r || typeof r !== 'object') throw new Error('rooms are given in three groups: small, mid and large, each with its devices');
  const small = whole(r.small, 'Rooms with up to 8 devices', MAX_ROOMS); const mid = whole(r.mid, 'Rooms with 9 to 19 devices', MAX_ROOMS); const large = whole(r.large, 'Large rooms', MAX_ROOMS);
  const sd = whole(r.smallDevices, 'Devices in rooms with up to 8', MAX_DEVICES); const md = whole(r.midDevices, 'Devices in rooms with 9 to 19', MAX_DEVICES); const ld = whole(r.largeDevices, 'Devices in large rooms', MAX_DEVICES);
  const rooms = small + mid + large;
  if (rooms < 1) throw new Error('An estimate needs at least one room');
  if (rooms > MAX_ROOMS) throw new Error(`More than ${MAX_ROOMS.toLocaleString('en-US')} rooms is a custom quote`);
  if (sd > small * S.includedDevices) throw new Error(`${plural(small, 'room')} with up to ${S.includedDevices} devices hold at most ${(small * S.includedDevices).toLocaleString('en-US')} devices`);
  if (md < mid * (S.includedDevices + 1) || md > mid * (big - 1)) throw new Error(`${plural(mid, 'room')} with ${S.includedDevices + 1} to ${big - 1} devices hold ${(mid * (S.includedDevices + 1)).toLocaleString('en-US')} to ${(mid * (big - 1)).toLocaleString('en-US')} devices`);
  if (ld < large * big) throw new Error(`${plural(large, 'large room')} hold at least ${(large * big).toLocaleString('en-US')} devices`);
  const extraStd = md - mid * S.includedDevices; const extraLrg = ld - large * L.includedDevices;
  return { small, mid, large, rooms, devices: sd + md + ld, extraStd, extraLrg, withinAllowance: sd + mid * S.includedDevices + large * L.includedDevices };
}

/**
 * The volume discount (04:30): each room's monthly base licence takes its tranche's rate (rooms 101–250: 5 %, 251–500: 10 %, from 501:
 * 15 %), standard rooms counted first, then large rooms; device charges are not volume-discounted. Because a room's base licence is
 * $34.99 or $68.99, adding a room or a device never lowers the bill. A year's amount, rounded half up once.
 */
export function volumeDiscount(standardRooms: number, largeRooms: number): { cents: number; words: string } {
  const S = PRICE_BOOK.rooms.standard.cents; const L = PRICE_BOOK.rooms.large.cents; const n = standardRooms + largeRooms;
  let sum = 0; const words: string[] = [];   // sum of pct × monthly base, in cent-percent
  for (const t of PRICE_BOOK.volume.tranches) {
    const lo = t.from; const hi = Math.min(t.to ?? n, n); if (hi < lo) continue;
    const stdIn = Math.max(0, Math.min(hi, standardRooms) - lo + 1); const lrgIn = (hi - lo + 1) - stdIn;
    sum += t.pct * (stdIn * S + lrgIn * L);
    words.push(`rooms ${lo}–${hi}: ${t.pct} % off ${stdIn ? `${stdIn.toLocaleString('en-US')} standard` : ''}${stdIn && lrgIn ? ' and ' : ''}${lrgIn ? `${lrgIn.toLocaleString('en-US')} large` : ''}`);
  }
  return { cents: Math.floor((sum * 12 + 50) / 100), words: words.join('; ') };
}

/** Search Party's count (04:45 "1B"): every managed asset except the devices a room already charges per device. */
export function searchPartyAssets(r: RoomGroups, assetsOutsideRooms = 0): number {
  return checkGroups(r).withinAllowance + whole(assetsOutsideRooms, 'Assets outside rooms', MAX_DEVICES);
}

export function estimate(input: EstimateInput): Estimate {
  const g = checkGroups(input.rooms);
  const users = whole(input.users, 'Licensed users', MAX_USERS);
  const outside = whole(input.assetsOutsideRooms ?? 0, 'Assets outside rooms', MAX_DEVICES);
  if (input.startedSmall !== undefined && typeof input.startedSmall !== 'boolean') throw new Error('startedSmall is yes or no');
  const bundle = input.bundle === undefined ? undefined : BUNDLES.find((b) => b.id === input.bundle);
  if (input.bundle !== undefined && !bundle) throw new Error(`unknown bundle ${input.bundle}`);
  const band = platformFee(g.rooms, input.startedSmall === true);
  const { standard: S, large: L } = PRICE_BOOK.rooms; const u = PRICE_BOOK.user;
  const year = (monthly: number) => monthly * 12;

  const recurring: EstimateLine[] = [{ id: band.id, label: band.label, quantity: 1, unitCents: band.cents, per: 'per year', cents: band.cents, status: band.status }];
  const roomLines: EstimateLine[] = [];
  const std = g.small + g.mid;
  if (std) roomLines.push({ id: S.id, label: plural(std, 'standard room'), quantity: std, unitCents: S.cents, per: `${S.unit}, ${S.includedDevices} devices included`, cents: year(std * S.cents), status: S.status });
  if (g.extraStd) roomLines.push({ id: S.deviceId, label: `${plural(g.extraStd, 'device')} beyond the ${S.includedDevices} each standard room includes`, quantity: g.extraStd, unitCents: S.perDeviceCents, per: 'per device, per month', cents: year(g.extraStd * S.perDeviceCents), status: S.status });
  if (g.large) roomLines.push({ id: L.id, label: plural(g.large, 'large room'), quantity: g.large, unitCents: L.cents, per: `${L.unit}, ${L.includedDevices} devices included`, cents: year(g.large * L.cents), status: L.status });
  if (g.extraLrg) roomLines.push({ id: L.deviceId, label: `${plural(g.extraLrg, 'device')} beyond the ${L.includedDevices} each large room includes`, quantity: g.extraLrg, unitCents: L.perDeviceCents, per: 'per device, per month', cents: year(g.extraLrg * L.perDeviceCents), status: L.status });
  recurring.push(...roomLines);
  if (users) recurring.push({ id: u.id, label: plural(users, 'licensed user'), quantity: users, unitCents: u.cents, per: u.unit, cents: year(users * u.cents), status: u.status });

  const notes: string[] = [];
  let searchAssets: number | null = null;
  const addLines: EstimateLine[] = [];
  const addOns = input.addOns || [];
  if (addOns.length) {
    const seen = new Set<string>(); const quantities: Record<string, number> = {};
    for (const a of addOns) {
      if (seen.has(a.sku)) throw new Error(`${a.sku} is listed twice`);
      seen.add(a.sku);
      if (isSuperseded(a.sku)) throw new Error(`${a.sku} is replaced in the price book (${PRICE_BOOK.superseded.find((s) => s.sku === a.sku)!.by}) and cannot be added`);
      const sku = SKUS.find((s) => s.sku === a.sku); if (!sku) throw new Error(`unknown add-on ${a.sku}`);
      if (sku.family === 'Pilot' || /^PILOT-|^SIGNAL-(TRIAL|FREE)$|^SEARCH-MIN$/.test(sku.sku)) throw new Error(`${a.sku} is not an add-on`);
      if (sku.sku === 'SEARCH') {
        searchAssets = g.withinAllowance + outside;
        if (a.quantity !== undefined && a.quantity !== searchAssets) throw new Error(`Search Party is counted by the price book: ${searchAssets.toLocaleString('en-US')} managed assets here, never the devices a room already charges per device`);
        quantities[sku.sku] = searchAssets; continue;
      }
      const auto = sku.billingUnit === 'managed-room-month' ? g.rooms : sku.billingUnit === 'tenant-month' ? 1 : undefined;
      if (a.quantity === undefined && auto === undefined) throw new Error(`give the quantity of ${a.sku} (${sku.billingUnit})`);
      quantities[sku.sku] = whole(a.quantity ?? auto, `The quantity of ${a.sku}`, MAX_ROOMS * 100);
    }
    const noAssets = searchAssets === 0; if (noAssets) delete quantities['SEARCH'];   // quote() prices quantities of 1 or more
    const q = quote({ quantities });
    for (const l of q.monthly) if (l.cents) addLines.push({ id: l.sku, label: l.name, quantity: l.quantity, unitCents: l.unitCents, per: 'per month, from the v1.5 list', cents: l.cents * 12, status: 'list-v1.5', note: l.note });
    if (noAssets) { const m = SKUS.find((s) => s.sku === 'SEARCH-MIN')!; addLines.push({ id: m.sku, label: m.name, quantity: 1, unitCents: m.cents, per: 'per month, from the v1.5 list', cents: m.cents * 12, status: 'list-v1.5', note: 'no managed asset to count yet: the monthly minimum applies' }); }
    if (q.oneTime.length) throw new Error('one-time v1.5 lines are not add-ons');
    notes.push(...q.notes.filter((n) => !/^Before any applicable tax/.test(n)));
  }
  recurring.push(...addLines);

  // discounts: lines of their own. A bundle's discount is for the complete bundle (06:08); room licences take the larger of their bundle
  // discount and their volume discount, never both.
  const have = new Set(addOns.map((a) => a.sku));
  const missing = bundle ? bundle.skus.filter((s) => !(s in PRICE_BOOK.bundleSuccessors) && !have.has(s)) : [];
  const complete = !!bundle && missing.length === 0;
  const volume = volumeDiscount(std, g.large);
  const bundleOnRooms = complete && bundle!.skus.includes('PRO-ROOM');
  const bundleOnRoomsCents = bundleOnRooms ? roomLines.reduce((a, l) => a + l.cents - less(l.cents, bundle!.discountPct), 0) : 0;
  const bundleWinsRooms = bundleOnRooms && bundleOnRoomsCents >= volume.cents;
  let monthDiscount = 0;
  if (!bundleWinsRooms && volume.cents > 0) {
    recurring.push({ id: 'DISCOUNT-VOLUME', label: `Volume discount on room licences (rooms 101 and up)`, quantity: 1, unitCents: -volume.cents, per: 'per year', cents: -volume.cents, status: PRICE_BOOK.volume.status, note: volume.words });
    monthDiscount += volume.cents;
    notes.push(`Volume discount: the monthly licence of rooms 101 to 250 is 5 % off, of rooms 251 to 500 10 % off, and of every room from the 501st 15 % off; standard rooms are counted first, then large rooms. Device charges are not volume-discounted, and adding a room or a device never lowers the bill. ${PRICE_BOOK.volume.rule}`);
  }
  if (bundle && !complete) {
    const name = (id: string) => SKUS.find((x) => x.sku === id)?.name || id;
    notes.push(`${bundle.name} takes ${bundle.discount} off when all ${bundle.skus.length} of its products are on the order. Still to add: ${missing.map(name).join(', ')}. Until then each product is at its list price.`);
  }
  if (bundle && complete) {
    const parts: string[] = []; let d = 0;
    const take = (cents: number, what: string, monthly: boolean) => { const x = cents - less(cents, bundle.discountPct); if (!x) return; d += x; if (monthly) monthDiscount += x; parts.push(`${what} ${usd(x)}`); };
    if (bundle.skus.includes('CORE-ENTERPRISE')) take(band.cents, 'platform fee', false);
    if (bundleWinsRooms) for (const l of roomLines) take(l.cents, l.id === S.id || l.id === L.id ? l.label : `${l.label.split(' beyond')[0]} charged per device`, true);
    for (const l of addLines) if (bundle.skus.includes(l.id) && l.id !== 'SEARCH-MIN') take(l.cents, l.label, true);
    for (const l of addLines) if (l.id === 'SEARCH-MIN' && bundle.skus.includes('SEARCH')) take(l.cents, l.label, true);
    if (d) recurring.push({ id: 'DISCOUNT-BUNDLE', label: `${bundle.name}: ${bundle.discount} off its own products`, quantity: 1, unitCents: -d, per: 'per year', cents: -d, status: 'list-v1.5', note: parts.join('; ') });
    notes.push(`${bundle.name}: ${bundle.discount} off each eligible line. The platform fee takes Core’s place in the bundle and the room licences the Pro room’s. ${bundle.rule}.${bundleOnRooms && !bundleWinsRooms ? ' Here the volume discount on room licences is larger, so the room licences take that one instead.' : ''}`);
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
  const monthBilled = recurring.filter((l) => l.id !== band.id && !l.id.startsWith('DISCOUNT-')).reduce((a, l) => a + l.cents, 0);
  const monthlyCents = (monthBilled - monthDiscount) / 12;

  notes.unshift(`Devices are counted as ${PRICE_BOOK.roomRule.counts}; ${PRICE_BOOK.roomRule.excludes} do not count. ${PRICE_BOOK.roomRule.billing}`);
  if (g.rooms >= 20) { const gr = PRICE_BOOK.growth; notes.push(`From ${gr.from} rooms the platform fee grows ${usd(gr.perRoomCents)} a year for each room past ${gr.from - 1}, and stops at a firm ${usd(gr.enterpriseCents)}: no added room raises it by more than ${usd(gr.perRoomCents)}. An estate that started with ${gr.grace.startedAtOrBelow} rooms or fewer pays at most ${usd(gr.grace.capCents)} more until it passes ${gr.grace.throughRooms} rooms. ${gr.notice} ${gr.explains}`); }
  if (searchAssets !== null) notes.push(`Search Party counts ${PRICE_BOOK.searchParty.counts}: ${searchAssets.toLocaleString('en-US')} here.`);
  if (oneTime.length) notes.push('FieldLink is optional hardware at proposed concept prices: no unit has been built, and Empathia works without it.');
  notes.push('Totals over three and five years use today’s list prices, with no escalation or renewal change.');

  return {
    rooms: g.rooms, devices: g.devices, band, recurring, oneTime, bundle: bundle ? { id: bundle.id, complete, missing } : null,
    monthlyCents,
    annualRecurringCents: annual, oneTimeCents: once,
    firstYearCents: annual + once, threeYearCents: annual * 3 + once, fiveYearCents: annual * 5 + once,
    perRoomAnnualCents: div(annual, g.rooms),
    perUserAnnualCents: users ? div(annual, users) : null,
    perDeviceAnnualCents: g.devices ? div(annual, g.devices) : null,
    searchAssets,
    excluded: [
      'Implementation: a one-time, scope-based quote',
      'Integrations and connector work beyond the products chosen',
      'Hardware installation and calibration',
      'Taxes',
    ],
    notes,
  };
}
