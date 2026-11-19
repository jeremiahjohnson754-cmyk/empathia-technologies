// Price book 2 and Build Your Empathia (founder 18 Nov 2026 19:39, adopted 20:51). The founder's own illustration is the first check:
// its figures (50 rooms → $52,185.00; 310 rooms with 3 Nano, 2 Edge, 2 Pulse → $215,038.80 and $219,781.80) are written out here and
// must come back to the cent. Then every boundary the directive names (§22), recomputed independently of estimate().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimate, PRICE_BOOK, platformFee, roomTier, isSuperseded, usd, SKUS, MAX_ROOMS } from '../src/index.js';
// Changed 19 Nov 2026: the founder replaced the jump from $4,999 to $15,000 at 25 rooms with $499 a room past 24 up to $15,000, and a
// $1,399 cap to 30 rooms for estates that started at 24 rooms or fewer (03:36 recommendation, approved 03:47). The tests that held the
// old step (the band list, byHand's fee, the boundary ids and the 25-room note) now hold the new schedule; nothing else is loosened.

test('the price book holds the founder’s 19:39 rates exactly, each with its status and source', () => {
  assert.equal(PRICE_BOOK.user.cents, 999);
  assert.deepEqual([PRICE_BOOK.rooms.standard.cents, PRICE_BOOK.rooms.large.cents], [3999, 7499]);
  assert.deepEqual(PRICE_BOOK.platform.map((b) => [b.from, b.to, b.cents, b.startingAt]), [[1, 9, 249900, false], [10, 19, 349900, false], [20, 24, 499900, false]]);
  const g = PRICE_BOOK.growth; assert.deepEqual([g.from, g.baseCents, g.perRoomCents, g.enterpriseCents, g.grace.startedAtOrBelow, g.grace.throughRooms, g.grace.capCents, g.status], [25, 499900, 49900, 1500000, 24, 30, 139900, 'founder-directed']); assert.match(g.source, /03:47/);
  assert.deepEqual(PRICE_BOOK.hardware.map((h) => [h.id, h.cents, h.status]), [['FIELDLINK-NANO', 24900, 'proposed-concept'], ['FIELDLINK-EDGE', 149900, 'proposed-concept'], ['FIELDLINK-PULSE', 49900, 'proposed-concept']]);
  assert.equal(PRICE_BOOK.implementation.status, 'custom-quote');
  for (const r of [PRICE_BOOK.user, PRICE_BOOK.rooms.standard, PRICE_BOOK.rooms.large, ...PRICE_BOOK.platform]) { assert.equal(r.status, 'founder-directed'); assert.match(r.source, /19:39/); }
  // the $19.99 lives on only as the proposed Pro pilot rate (founder 20:51), with its terms waiting for approval
  const p = PRICE_BOOK.pilots[0]!; assert.deepEqual([p.cents, p.priceStatus, p.termsStatus], [1999, 'founder-suggested', 'pending-approval']); assert.match(p.source, /20:51/);
  assert.ok(p.complementaryChoices.every((s) => SKUS.some((x) => x.sku === s) && !isSuperseded(s)));
  // the book carries no cost, margin or supplier field anywhere
  assert.doesNotMatch(JSON.stringify(PRICE_BOOK), /cost|margin|bom|supplier|landed/i);
});

test('the founder’s illustration, to the cent: 50 rooms (10 large), 75 users, then one Nano', () => {
  const e = estimate({ standardRooms: 40, largeRooms: 10, users: 75 });
  assert.deepEqual(e.recurring.map((l) => [l.id, l.cents]), [['PLATFORM-ENTERPRISE', 1500000], ['ROOM-STD', 1919520], ['ROOM-LRG', 899880], ['USER', 899100]]);
  assert.equal(usd(e.annualRecurringCents), '$52,185.00'); assert.equal(e.oneTimeCents, 0); assert.equal(usd(e.firstYearCents), '$52,185.00');
  const n = estimate({ standardRooms: 40, largeRooms: 10, users: 75, hardware: { nano: 1 } });
  assert.equal(usd(n.annualRecurringCents), '$52,185.00'); assert.equal(usd(n.oneTimeCents), '$249.00'); assert.equal(usd(n.firstYearCents), '$52,434.00');
});

test('the founder’s illustration, to the cent: 310 rooms (65 large), 200 users, 3 Nano, 2 Edge, 2 Pulse', () => {
  const e = estimate({ standardRooms: 245, largeRooms: 65, users: 200, hardware: { nano: 3, edge: 2, pulse: 2 } });
  assert.deepEqual(e.recurring.map((l) => usd(l.cents)), ['$15,000.00', '$117,570.60', '$58,492.20', '$23,976.00']);
  assert.equal(usd(e.annualRecurringCents), '$215,038.80'); assert.equal(usd(e.oneTimeCents), '$4,743.00'); assert.equal(usd(e.firstYearCents), '$219,781.80');
  assert.equal(e.threeYearCents, 3 * 21503880 + 474300); assert.equal(e.fiveYearCents, 5 * 21503880 + 474300);
});

/** an independent computation, written without estimate(): the formula the directive states (§5) */
/** the founder's schedule written out by hand (19:39 bands; 03:47 growth from 25 rooms, with the grace band for estates that started small) */
function feeByHand(rooms: number, startedSmall = false) {
  if (rooms <= 9) return 249900; if (rooms <= 19) return 349900; if (rooms <= 24) return 499900;
  if (!startedSmall) return Math.min(1500000, 499900 + 49900 * (rooms - 24));
  return Math.min(1500000, 499900 + Math.min(49900 * (Math.min(rooms, 30) - 24), 139900) + 49900 * Math.max(0, rooms - 30));
}
function byHand(std: number, lrg: number, users: number, hw: [number, number, number] = [0, 0, 0], startedSmall = false) {
  const rooms = std + lrg;
  const fee = feeByHand(rooms, startedSmall);
  const annual = fee + 12 * (std * 3999 + lrg * 7499 + users * 999);
  const once = hw[0] * 24900 + hw[1] * 149900 + hw[2] * 49900;
  return { annual, once, first: annual + once, three: 3 * annual + once, five: 5 * annual + once };
}

test('every boundary: 1, 9, 10, 19, 20, 24, 25, 26, 27, 30, 31, 44, 45, 46, 48, 50, 150, 500, 501 rooms, new and started-small estates, recomputed independently', () => {
  for (const rooms of [1, 9, 10, 19, 20, 24, 25, 26, 27, 30, 31, 44, 45, 46, 48, 50, 150, 500, 501]) for (const startedSmall of [false, true]) {
    for (const largeShare of [0, 0.2, 1]) {
      const lrg = Math.round(rooms * largeShare); const std = rooms - lrg; const users = rooms * 2;
      const e = estimate({ standardRooms: std, largeRooms: lrg, users, hardware: { nano: 1, edge: rooms >= 25 ? 1 : 0, pulse: 2 }, startedSmall });
      const h = byHand(std, lrg, users, [1, rooms >= 25 ? 1 : 0, 2], startedSmall);
      assert.deepEqual([e.annualRecurringCents, e.oneTimeCents, e.firstYearCents, e.threeYearCents, e.fiveYearCents], [h.annual, h.once, h.first, h.three, h.five], `${rooms} rooms, ${lrg} large`);
      assert.equal(e.recurring.reduce((a, l) => a + l.cents, 0), e.annualRecurringCents);
      assert.equal(e.monthlyCents * 12 + e.band.cents, e.annualRecurringCents);
    }
  }
  assert.deepEqual([1, 9, 10, 19, 20, 24, 25, 44, 45, 501].map((r) => platformFee(r).id), ['PLATFORM-1-9', 'PLATFORM-1-9', 'PLATFORM-10-19', 'PLATFORM-10-19', 'PLATFORM-20-24', 'PLATFORM-20-24', 'PLATFORM-GROWTH', 'PLATFORM-GROWTH', 'PLATFORM-ENTERPRISE', 'PLATFORM-ENTERPRISE']);
  assert.deepEqual([25, 27, 30, 31].map((r) => platformFee(r, true).id), ['PLATFORM-GROWTH', 'PLATFORM-GROWTH-BAND', 'PLATFORM-GROWTH-BAND', 'PLATFORM-GROWTH-BAND']);
});

test('the schedule the founder approved (03:47), to the cent, with no cliff: from 24 rooms up, no added room raises the fee by more than $499', () => {
  const fees = (small: boolean) => [24, 25, 26, 27, 30, 31, 44, 45, 47, 48].map((r) => usd(platformFee(r, small).cents));
  assert.deepEqual(fees(false), ['$4,999.00', '$5,498.00', '$5,997.00', '$6,496.00', '$7,993.00', '$8,492.00', '$14,979.00', '$15,000.00', '$15,000.00', '$15,000.00']);
  assert.deepEqual(fees(true), ['$4,999.00', '$5,498.00', '$5,997.00', '$6,398.00', '$6,398.00', '$6,897.00', '$13,384.00', '$13,883.00', '$14,881.00', '$15,000.00']);
  for (const small of [false, true]) for (let r = 25; r <= 600; r++) { const step = platformFee(r, small).cents - platformFee(r - 1, small).cents; assert.ok(step >= 0 && step <= 49900, `${r} rooms, started small ${small}: step ${step}`); }
  for (let r = 25; r <= 600; r++) assert.ok(platformFee(r, true).cents <= platformFee(r, false).cents, `started small never pays more (${r})`);
  assert.ok(platformFee(45).startingAt && !platformFee(44).startingAt && platformFee(48, true).startingAt && !platformFee(47, true).startingAt);
});

test('the growth band is explained on the estimate: the $499 a room, the $1,399 cap to 30 rooms, told before any change, what the fee pays for', () => {
  const at27 = estimate({ standardRooms: 27, largeRooms: 0, users: 0, startedSmall: true });
  const n = at27.notes.join(' ');
  assert.match(n, /From 25 rooms the platform fee grows \$499\.00 a year for each room past 24, and stops at \$15,000\.00/);
  assert.match(n, /started with 24 rooms or fewer pays at most \$1,399\.00 more until it passes 30 rooms/);
  assert.match(n, /Nothing is charged up automatically: you are told before your fee changes/);
  assert.match(n, /operational services outside the Empathia platform and the engineering that larger estates need/);
  assert.match(at27.recurring[0]!.label, /growth band/);
  const at45 = estimate({ standardRooms: 45, largeRooms: 0, users: 0 });
  assert.ok(at45.notes.some((x) => /starting figure/.test(x)) && !at45.notes.some((x) => /From 25 rooms/.test(x)));
  assert.ok(!estimate({ standardRooms: 10, largeRooms: 0, users: 0 }).notes.some((x) => /From 25 rooms/.test(x)));
  assert.throws(() => estimate({ standardRooms: 27, largeRooms: 0, users: 0, startedSmall: 'yes' as unknown as boolean }), /yes or no/);
});

test('a room’s tier: 19 devices is standard, 20 is large (rule pending approval); the per-room, per-user and per-device figures', () => {
  assert.equal(roomTier(0), 'standard'); assert.equal(roomTier(19), 'standard'); assert.equal(roomTier(20), 'large');
  assert.throws(() => roomTier(-1)); assert.throws(() => roomTier(1.5));
  assert.equal(PRICE_BOOK.roomRule.status, 'pending-approval');
  const e = estimate({ standardRooms: 40, largeRooms: 10, users: 75, devices: 600 });
  assert.equal(e.perRoomAnnualCents, Math.round(5218500 / 50)); assert.equal(e.perUserAnnualCents, Math.round(5218500 / 75)); assert.equal(e.perDeviceAnnualCents, Math.round(5218500 / 600));
  const z = estimate({ standardRooms: 3, largeRooms: 0, users: 0 });   // zero licensed users is a valid estate
  assert.equal(z.perUserAnnualCents, null); assert.equal(z.perDeviceAnnualCents, null); assert.ok(!z.recurring.some((l) => l.id === 'USER'));
  assert.equal(z.annualRecurringCents, 249900 + 12 * 3 * 3999);
});

test('refused, with a reason: 0 rooms, negative or fractional quantities, too many rooms, replaced v1.5 lines, a duplicate add-on, an unknown one', () => {
  assert.throws(() => estimate({ standardRooms: 0, largeRooms: 0, users: 5 }), /at least one room/);
  assert.throws(() => estimate({ standardRooms: -1, largeRooms: 2, users: 0 }), /whole number/);
  assert.throws(() => estimate({ standardRooms: 2.5, largeRooms: 0, users: 0 }), /whole number/);
  assert.throws(() => estimate({ standardRooms: 1, largeRooms: 0, users: -3 }), /whole number/);
  assert.throws(() => estimate({ standardRooms: MAX_ROOMS, largeRooms: 1, users: 0 }), /custom quote/);
  assert.throws(() => estimate({ standardRooms: 1, largeRooms: 0, users: 0, hardware: { edge: -1 } }), /whole number/);
  for (const sku of ['PRO-ROOM', 'CORE-STARTER', 'CORE-ENTERPRISE', 'SEAT-ENTERPRISE']) assert.throws(() => estimate({ standardRooms: 5, largeRooms: 0, users: 0, addOns: [{ sku, quantity: 5 }] }), /replaced in price book 2/, sku);
  assert.throws(() => estimate({ standardRooms: 5, largeRooms: 0, users: 0, addOns: [{ sku: 'COMMISSION', quantity: 5 }, { sku: 'COMMISSION', quantity: 2 }] }), /listed twice/);
  assert.throws(() => estimate({ standardRooms: 5, largeRooms: 0, users: 0, addOns: [{ sku: 'NOPE', quantity: 1 }] }), /unknown add-on/);
});

test('add-ons are v1.5 list lines priced by the one quote(): per room, per tenant, and the Search Party minimum instead of the per-asset charge', () => {
  const e = estimate({ standardRooms: 50, largeRooms: 0, users: 10, addOns: [{ sku: 'COMMISSION', quantity: 50 }, { sku: 'APEX', quantity: 1 }, { sku: 'SEARCH', quantity: 20 }] });
  const by = (id: string) => e.recurring.find((l) => l.id === id)!;
  assert.equal(by('COMMISSION').cents, 50 * 1299 * 12); assert.equal(by('APEX').cents, 17999 * 12);
  assert.equal(by('SEARCH-MIN').cents, 4999 * 12);   // 20 × $0.45 is under the $49.99 minimum: the minimum replaces it, never both
  assert.ok(!e.recurring.some((l) => l.id === 'SEARCH'));
  assert.equal(e.annualRecurringCents, byHand(50, 0, 10).annual + 12 * (50 * 1299 + 17999 + 4999));
  for (const l of e.recurring.filter((x) => ['COMMISSION', 'APEX', 'SEARCH-MIN'].includes(x.id))) assert.equal(l.status, 'list-v1.5');
});

test('what an estimate never includes is said on every one: implementation is a quote, discounts are not applied, taxes are excluded', () => {
  const e = estimate({ standardRooms: 10, largeRooms: 0, users: 10, hardware: { pulse: 1 } });
  assert.ok(e.excluded.some((x) => /Implementation: a one-time, scope-based quote/.test(x)));
  assert.ok(e.excluded.some((x) => /Discounts/.test(x)) && e.excluded.some((x) => /Taxes/.test(x)));
  assert.ok(e.notes.some((n) => /FieldLink is optional hardware at proposed concept prices/.test(n)));
  assert.ok(!e.recurring.concat(e.oneTime).some((l) => /IMPLEMENT/i.test(l.id)));
});
