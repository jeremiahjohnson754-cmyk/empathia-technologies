// Price book 2 and Build Your Empathia (founder 18 Nov 2026 19:39, adopted 20:51). The founder's own illustration is the first check:
// its figures (50 rooms → $52,185.00; 310 rooms with 3 Nano, 2 Edge, 2 Pulse → $215,038.80 and $219,781.80) are written out here and
// must come back to the cent. Then every boundary the directive names (§22), recomputed independently of estimate().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimate, PRICE_BOOK, platformBand, roomTier, isSuperseded, usd, SKUS, MAX_ROOMS } from '../src/index.js';

test('the price book holds the founder’s 19:39 rates exactly, each with its status and source', () => {
  assert.equal(PRICE_BOOK.user.cents, 999);
  assert.deepEqual([PRICE_BOOK.rooms.standard.cents, PRICE_BOOK.rooms.large.cents], [3999, 7499]);
  assert.deepEqual(PRICE_BOOK.platform.map((b) => [b.from, b.to, b.cents, b.startingAt]), [[1, 9, 249900, false], [10, 19, 349900, false], [20, 24, 499900, false], [25, null, 1500000, true]]);
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
function byHand(std: number, lrg: number, users: number, hw: [number, number, number] = [0, 0, 0]) {
  const rooms = std + lrg;
  const fee = rooms <= 9 ? 249900 : rooms <= 19 ? 349900 : rooms <= 24 ? 499900 : 1500000;
  const annual = fee + 12 * (std * 3999 + lrg * 7499 + users * 999);
  const once = hw[0] * 24900 + hw[1] * 149900 + hw[2] * 49900;
  return { annual, once, first: annual + once, three: 3 * annual + once, five: 5 * annual + once };
}

test('every boundary the directive names: 1, 9, 10, 19, 20, 24, 25, 26, 50, 150, 500, 501 rooms, recomputed independently', () => {
  for (const rooms of [1, 9, 10, 19, 20, 24, 25, 26, 50, 150, 500, 501]) {
    for (const largeShare of [0, 0.2, 1]) {
      const lrg = Math.round(rooms * largeShare); const std = rooms - lrg; const users = rooms * 2;
      const e = estimate({ standardRooms: std, largeRooms: lrg, users, hardware: { nano: 1, edge: rooms >= 25 ? 1 : 0, pulse: 2 } });
      const h = byHand(std, lrg, users, [1, rooms >= 25 ? 1 : 0, 2]);
      assert.deepEqual([e.annualRecurringCents, e.oneTimeCents, e.firstYearCents, e.threeYearCents, e.fiveYearCents], [h.annual, h.once, h.first, h.three, h.five], `${rooms} rooms, ${lrg} large`);
      assert.equal(e.recurring.reduce((a, l) => a + l.cents, 0), e.annualRecurringCents);
      assert.equal(e.monthlyCents * 12 + e.band.cents, e.annualRecurringCents);
    }
  }
  assert.deepEqual([1, 9, 10, 19, 20, 24, 25, 26, 501].map((r) => platformBand(r).id), ['PLATFORM-1-9', 'PLATFORM-1-9', 'PLATFORM-10-19', 'PLATFORM-10-19', 'PLATFORM-20-24', 'PLATFORM-20-24', 'PLATFORM-ENTERPRISE', 'PLATFORM-ENTERPRISE', 'PLATFORM-ENTERPRISE']);
});

test('the 25-room step is shown, not hidden: the note names both fees; the enterprise fee says it is a starting figure', () => {
  const at24 = estimate({ standardRooms: 24, largeRooms: 0, users: 0 }); const at25 = estimate({ standardRooms: 25, largeRooms: 0, users: 0 });
  assert.equal(at25.annualRecurringCents - at24.annualRecurringCents, 1500000 - 499900 + 12 * 3999);
  for (const e of [at24, at25]) assert.ok(e.notes.some((n) => /At 25 rooms the platform fee moves from \$4,999\.00 to the enterprise fee, from \$15,000\.00/.test(n)));
  assert.ok(at25.notes.some((n) => /starting figure/.test(n)) && !at24.notes.some((n) => /starting figure/.test(n)));
  assert.ok(!estimate({ standardRooms: 150, largeRooms: 0, users: 0 }).notes.some((n) => /At 25 rooms/.test(n)));
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
