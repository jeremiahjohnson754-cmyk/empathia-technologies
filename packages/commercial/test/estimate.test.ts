// Price Book 3 and Build Your Empathia (founder 19 Nov 2026: per-device room rates 04:04, approved 04:30; "approve 1B, 2 IN, 3 YES,
// 4 YES" 04:45). Every figure is recomputed here by hand, independently of estimate(): byHand prices each room from its own device count
// and fills the volume tranches room by room. Then every boundary, every bundle, the Search Party count and the promise that adding a room
// or a device never lowers a bill.
//
// Changed 19 Nov 2026 (Price Book 3, founder 04:45): the room rates ($39.99 / $74.99 flat) became per-device rates ($34.99 with 8 devices
// included, then $2.99; $68.99 with 20 included, then $3.99); the input became three room groups with their devices; the enterprise fee
// became a firm $15,000 (no "from"); discounts (volume tranches and the seven bundles) are applied as lines of their own; Search Party is
// counted by the price book. The price book 2 illustration ($52,185.00 at 50 rooms) no longer applies and is replaced by the archetype
// estates below; the platform schedule tests carry over unchanged, and every refusal is kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimate, PRICE_BOOK, platformFee, roomTier, roomMonthlyCents, groupsOf, checkGroups, searchPartyAssets, volumeDiscount, isSuperseded, usd, SKUS, BUNDLES, MAX_ROOMS, type RoomGroups } from '../src/index.js';

// ---- an independent computation, written without estimate() ----
function feeByHand(rooms: number, startedSmall = false) {
  if (rooms <= 9) return 249900; if (rooms <= 19) return 349900; if (rooms <= 24) return 499900;
  if (!startedSmall) return Math.min(1500000, 499900 + 49900 * (rooms - 24));
  return Math.min(1500000, 499900 + Math.min(49900 * (Math.min(rooms, 30) - 24), 139900) + 49900 * Math.max(0, rooms - 30));
}
const room = (d: number) => (d >= 20 ? 6899 + Math.max(0, d - 20) * 399 : 3499 + Math.max(0, d - 8) * 299);
const base = (d: number) => (d >= 20 ? 6899 : 3499);
const off = (c: number, pct: number) => c - Math.floor((c * (100 - pct) + 50) / 100);
/** rooms as a list of device counts; the volume tranche of each room is found by walking the rooms, standard rooms first */
function byHand(devs: number[], users: number, opt: { small?: boolean; bundle?: { pct: number; rooms: boolean; platform: boolean } } = {}) {
  const ordered = [...devs.filter((d) => d < 20), ...devs.filter((d) => d >= 20)];
  let volCentPct = 0; ordered.forEach((d, i) => { const pos = i + 1; volCentPct += (pos > 500 ? 15 : pos > 250 ? 10 : pos > 100 ? 5 : 0) * base(d); });
  const volume = Math.floor((volCentPct * 12 + 50) / 100);
  const lines = [
    12 * 3499 * devs.filter((d) => d < 20).length, 12 * 299 * devs.filter((d) => d < 20).reduce((a, d) => a + Math.max(0, d - 8), 0),
    12 * 6899 * devs.filter((d) => d >= 20).length, 12 * 399 * devs.filter((d) => d >= 20).reduce((a, d) => a + d - 20, 0),
  ];
  const roomsList = lines.reduce((a, c) => a + c, 0); assert.equal(roomsList, 12 * devs.reduce((a, d) => a + room(d), 0));
  const bundleRooms = opt.bundle?.rooms ? lines.reduce((a, c) => a + off(c, opt.bundle!.pct), 0) : 0;
  const roomDiscount = opt.bundle?.rooms && bundleRooms >= volume ? bundleRooms : volume;
  const fee = feeByHand(devs.length, opt.small); const feeOff = opt.bundle?.platform ? off(fee, opt.bundle.pct) : 0;
  return fee - feeOff + roomsList - roomDiscount + 12 * 999 * users;
}
// deterministic estates: a list of per-room device counts
const lcg = (seed: number) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const estateOf = (n: number, pick: (r: () => number) => number, seed = 7) => { const r = lcg(seed); return Array.from({ length: n }, () => pick(r)); };
const office = (r: () => number) => [3, 5, 5, 8, 8, 10, 16][Math.floor(r() * 7)]!;
const dense = (r: () => number) => [8, 15, 18, 25, 40, 60, 200, 500][Math.floor(r() * 8)]!;
const run = (devs: number[], users: number, extra: Partial<Parameters<typeof estimate>[0]> = {}) => estimate({ rooms: groupsOf(devs), users, ...extra });

test('the price book holds the approved rates, each with its status and source; no cost or margin field anywhere', () => {
  const { standard: S, large: L } = PRICE_BOOK.rooms;
  assert.deepEqual([S.cents, S.includedDevices, S.perDeviceCents, L.cents, L.includedDevices, L.perDeviceCents], [3499, 8, 299, 6899, 20, 399]);
  for (const r of [S, L]) { assert.equal(r.status, 'founder-directed'); assert.match(r.source, /04:04/); }
  assert.equal(PRICE_BOOK.user.cents, 999); assert.equal(PRICE_BOOK.roomRule.largeFromDevices, 20);
  assert.match(PRICE_BOOK.roomRule.counts, /verified, unique assets installed and in service in the room’s commissioned baseline/);
  assert.match(PRICE_BOOK.roomRule.billing, /never retroactive/); assert.match(PRICE_BOOK.roomRule.source, /04:45/);
  assert.deepEqual(PRICE_BOOK.platform.map((b) => [b.from, b.to, b.cents]), [[1, 9, 249900], [10, 19, 349900], [20, 24, 499900]]);
  const g = PRICE_BOOK.growth; assert.deepEqual([g.from, g.baseCents, g.perRoomCents, g.enterpriseCents, g.grace.startedAtOrBelow, g.grace.throughRooms, g.grace.capCents], [25, 499900, 49900, 1500000, 24, 30, 139900]); assert.match(g.source, /03:47/); assert.match(g.source, /04:30/);
  assert.deepEqual(PRICE_BOOK.volume.tranches.map((t) => [t.from, t.to, t.pct]), [[101, 250, 5], [251, 500, 10], [501, null, 15]]); assert.match(PRICE_BOOK.volume.source, /04:30/);
  assert.match(PRICE_BOOK.searchParty.source, /04:45/); assert.match(PRICE_BOOK.searchParty.counts, /except the devices a room already charges per device/);
  assert.equal(PRICE_BOOK.protection.terms.length, 5); assert.ok(PRICE_BOOK.protection.terms.some((t) => /10 % a year/.test(t)) && PRICE_BOOK.protection.terms.some((t) => /never retroactive/.test(t)));
  assert.deepEqual(PRICE_BOOK.hardware.map((h) => [h.id, h.cents, h.status]), [['FIELDLINK-NANO', 24900, 'proposed-concept'], ['FIELDLINK-EDGE', 149900, 'proposed-concept'], ['FIELDLINK-PULSE', 49900, 'proposed-concept']]);
  assert.equal(PRICE_BOOK.implementation.status, 'custom-quote');
  assert.doesNotMatch(JSON.stringify(PRICE_BOOK), /\bcost|margin|\bbom\b|supplier|landed/i);
});

test('the Pro pilot: explicit limits, customer-approved conversion, no unexpected charges (04:45); two terms of mine marked as proposals', () => {
  const p = PRICE_BOOK.pilots[0]!;
  assert.deepEqual([p.id, p.cents, p.priceStatus, p.termsStatus], ['PILOT-PRO-PLUS', 1999, 'founder-directed', 'founder-directed']); assert.match(p.source, /20:51/); assert.match(p.source, /04:45/);
  const t = p.terms.join(' | ');
  for (const re of [/Up to 10 rooms, for 90 days/, /The only charges: \$19\.99 a room a month, and licensed users at \$9\.99 a month each, named on the pilot order before it starts/,
    /No platform fee, no device charges and no hardware/, /nothing continues unless you sign a conversion order, nothing renews by itself/, /list prices of the pilot’s first day for 12 months/]) assert.match(t, re);
  assert.deepEqual([...p.proposedTerms], ['One pilot at a time per estate', 'Onboarding beyond the self-serve setup is a separate quote, only if you ask for one']);
  assert.ok(p.complementaryChoices.every((s) => SKUS.some((x) => x.sku === s) && !isSuperseded(s)));
});

test('a room’s price at every device count 0–80: it never falls, no device adds more than $3.99, 20 or more is large', () => {
  const at = (d: number) => roomMonthlyCents(d);
  assert.deepEqual([0, 8, 9, 19, 20, 21, 22, 40, 60, 80].map(at), [3499, 3499, 3798, 6788, 6899, 7298, 7697, 14879, 22859, 30839]);
  for (let d = 1; d <= 80; d++) { const step = at(d) - at(d - 1); assert.ok(step >= 0 && step <= 399, `${d}: ${step}`); assert.equal(at(d), room(d)); }
  assert.equal(at(20) - at(19), 111); assert.equal(at(21) - at(20), 399);
  assert.equal(roomTier(19), 'standard'); assert.equal(roomTier(20), 'large'); assert.throws(() => roomTier(-1)); assert.throws(() => roomTier(1.5));
});

test('the three room groups: from each room’s own count, and refused when the devices cannot fit the rooms', () => {
  assert.deepEqual(groupsOf([3, 8, 9, 19, 20, 60]), { small: 2, smallDevices: 11, mid: 2, midDevices: 28, large: 2, largeDevices: 80 });
  const ok: RoomGroups = { small: 2, smallDevices: 16, mid: 1, midDevices: 9, large: 1, largeDevices: 20 }; assert.equal(checkGroups(ok).rooms, 4);
  for (const [bad, re] of [[{ ...ok, smallDevices: 17 }, /hold at most 16 devices/], [{ ...ok, midDevices: 8 }, /hold 9 to 19 devices/], [{ ...ok, midDevices: 20 }, /hold 9 to 19 devices/],
    [{ ...ok, largeDevices: 19 }, /hold at least 20 devices/], [{ ...ok, small: 0, mid: 0, large: 0, smallDevices: 0, midDevices: 0, largeDevices: 0 }, /at least one room/], [{ ...ok, small: 1.5 }, /whole number/]] as const)
    assert.throws(() => checkGroups(bad as RoomGroups), re as RegExp);
  assert.throws(() => checkGroups({ small: MAX_ROOMS, smallDevices: 0, mid: 0, midDevices: 0, large: 1, largeDevices: 20 }), /custom quote/);
});

test('the archetype estates the builder starts from, to the cent, recomputed by hand', () => {
  // device counts from Empathia's room archetypes (packages/domain-data/data/ARCHETYPES.json); users 1.3 a room
  const of = (m: Record<number, number>) => Object.entries(m).flatMap(([d, k]) => Array(k).fill(Number(d)) as number[]);
  const presets: [string, number[], number, number][] = [   // the expected totals are the private pricing model's, to the cent
    ['10-room office', of({ 3: 3, 5: 4, 8: 3 }), 13, 925624],
    ['50-room HQ', of({ 3: 8, 5: 11, 8: 13, 10: 3, 15: 6, 16: 5, 17: 2, 18: 1, 25: 1 }), 65, 4859568],
    ['150-room HQ', of({ 3: 23, 5: 33, 8: 38, 10: 8, 15: 19, 16: 15, 17: 7, 18: 4, 25: 3 }), 195, 11553726],
    ['500-room HQ', of({ 3: 75, 5: 110, 8: 125, 10: 25, 15: 65, 16: 50, 17: 25, 18: 15, 25: 10 }), 650, 34120830],
  ];
  for (const [name, devs, users, expected] of presets) {
    const e = run(devs, users); const h = byHand(devs, users);
    assert.equal(e.annualRecurringCents, h, name); assert.equal(e.annualRecurringCents, expected, `${name} (model)`);
    assert.equal(e.recurring.reduce((a, l) => a + l.cents, 0), e.annualRecurringCents);
    assert.equal(Math.round(e.monthlyCents * 12) + e.band.cents, e.annualRecurringCents);
  }
});

test('every boundary: 1–600 rooms, new and started small, office and dense estates, recomputed by hand to the cent', () => {
  for (const n of [1, 9, 10, 19, 20, 24, 25, 26, 27, 30, 31, 44, 45, 46, 47, 48, 50, 100, 101, 150, 250, 251, 310, 500, 501, 600]) for (const small of [false, true]) for (const pick of [office, dense]) {
    const devs = estateOf(n, pick, n); const users = Math.floor((13 * n + 5) / 10);
    const e = run(devs, users, { startedSmall: small, hardware: { nano: 1, pulse: 2 } });
    assert.equal(e.annualRecurringCents, byHand(devs, users, { small }), `${n} rooms`);
    assert.equal(e.oneTimeCents, 24900 + 2 * 49900); assert.equal(e.threeYearCents, 3 * e.annualRecurringCents + e.oneTimeCents); assert.equal(e.fiveYearCents, 5 * e.annualRecurringCents + e.oneTimeCents);
    assert.equal(e.devices, devs.reduce((a, d) => a + d, 0)); assert.equal(e.perDeviceAnnualCents === null, e.devices === 0);
  }
});

test('adding a room or a device never lowers a bill, from 1 to 700 rooms, even in very dense estates', () => {
  for (const pick of [office, dense]) {
    const devs = estateOf(700, pick, 41); let prev = -1;
    for (let n = 1; n <= 700; n++) { const a = run(devs.slice(0, n), 0).annualRecurringCents; assert.ok(a > prev, `${n} rooms: ${a} after ${prev}`); prev = a; }
  }
  // a cheap room added to an estate of 500-device rooms (an average rate over unequal rooms would lower this bill)
  const heavy = Array(600).fill(500); assert.ok(run([...heavy, 3], 0).annualRecurringCents > run(heavy, 0).annualRecurringCents);
  const g: RoomGroups = { small: 120, smallDevices: 500, mid: 80, midDevices: 1000, large: 30, largeDevices: 900 };
  for (const k of ['smallDevices', 'midDevices', 'largeDevices'] as const) { const up = { ...g, [k]: g[k] + 1 }; assert.ok(estimate({ rooms: up, users: 0 }).annualRecurringCents >= estimate({ rooms: g, users: 0 }).annualRecurringCents, k); }
});

test('the volume tranches, line by line: standard rooms first, base licences only, never with a bundle on the same rooms', () => {
  assert.equal(volumeDiscount(100, 0).cents, 0);
  assert.equal(volumeDiscount(101, 0).cents, Math.floor((5 * 3499 * 12 + 50) / 100));
  assert.equal(volumeDiscount(500, 100).cents, Math.floor(((150 * 5 + 250 * 10 + 0) * 3499 * 12 + 100 * 15 * 6899 * 12 + 50) / 100));
  const e = run(Array(150).fill(12), 0); const v = e.recurring.find((l) => l.id === 'DISCOUNT-VOLUME')!;
  assert.equal(v.cents, -Math.floor((50 * 5 * 3499 * 12 + 50) / 100)); assert.match(v.note!, /rooms 101–150: 5 % off 50 standard/);
  assert.ok(e.notes.some((n) => /Device charges are not volume-discounted, and adding a room or a device never lowers the bill/.test(n)));
  assert.ok(!run(Array(100).fill(12), 0).recurring.some((l) => l.id === 'DISCOUNT-VOLUME'));
});

test('all seven bundles keep every product: each bought whole, each eligible line discounted to the cent, the platform fee in Core’s place', () => {
  assert.equal(BUNDLES.length, 7);
  const qty: Record<string, number> = { LITE: 3, SPACE: 12, EXPERIENCES: 2, EVENT: 4, 'SIGNAL-TEAM': 25 };
  const devs = estateOf(160, office, 3); const groups = groupsOf(devs);
  for (const b of BUNDLES) {
    const addOns = b.skus.filter((s) => !isSuperseded(s)).map((sku) => ({ sku, ...(qty[sku] ? { quantity: qty[sku] } : {}) }));
    for (const s of b.skus) assert.ok(SKUS.some((x) => x.sku === s), `${b.id}: ${s} is in the catalogue`);
    const withB = estimate({ rooms: groups, users: 200, addOns, bundle: b.id, assetsOutsideRooms: 40 });
    const without = estimate({ rooms: groups, users: 200, addOns, assetsOutsideRooms: 40 });
    const line = withB.recurring.find((l) => l.id === 'DISCOUNT-BUNDLE')!; assert.ok(line, `${b.id} has its discount line`);
    let expect = 0;
    for (const l of without.recurring) {
      const eligible = (l.id.startsWith('PLATFORM') && b.skus.includes('CORE-ENTERPRISE')) || (b.skus.includes(l.id) && !isSuperseded(l.id)) || (l.id === 'SEARCH-MIN' && b.skus.includes('SEARCH'));
      if (eligible) expect += off(l.cents, b.discountPct);
    }
    const roomLines = without.recurring.filter((l) => /^(ROOM|DEVICE)-/.test(l.id)); const vol = -(without.recurring.find((l) => l.id === 'DISCOUNT-VOLUME')?.cents ?? 0);
    const bundleRooms = roomLines.reduce((a, l) => a + off(l.cents, b.discountPct), 0);
    if (b.skus.includes('PRO-ROOM') && bundleRooms >= vol) expect += bundleRooms;
    assert.equal(-line.cents, expect, b.id);
    assert.equal(withB.recurring.some((l) => l.id === 'DISCOUNT-VOLUME'), !(b.skus.includes('PRO-ROOM') && bundleRooms >= vol), `${b.id}: the larger room discount only`);
    for (const id of without.recurring.map((l) => l.id).filter((x) => !x.startsWith('DISCOUNT'))) assert.ok(withB.recurring.some((l) => l.id === id), `${b.id} keeps ${id}`);
    if (b.skus.includes('CORE-ENTERPRISE')) assert.match(line.note!, /platform fee/); else assert.doesNotMatch(line.note!, /platform fee/);
    assert.ok(withB.notes.some((n) => n.includes(b.rule)));
  }
  assert.throws(() => estimate({ rooms: groups, users: 0, bundle: 'NOPE' }), /unknown bundle/);
  // the platform fee in Unified Estate: $15,000 less 8 %
  const ue = estimate({ rooms: groups, users: 0, bundle: 'FOUR-WORLD-OPERATIONS' }); assert.match(ue.recurring.find((l) => l.id === 'DISCOUNT-BUNDLE')!.note!, /platform fee \$1,200\.00/);
});

test('Search Party (1B), the per-asset line and the minimum, and a quantity that disagrees is refused', () => {
  const big: RoomGroups = { small: 100, smallDevices: 600, mid: 50, midDevices: 700, large: 5, largeDevices: 150 };
  const e = estimate({ rooms: big, users: 0, addOns: [{ sku: 'SEARCH' }], assetsOutsideRooms: 90 });
  const n = 600 + 50 * 8 + 5 * 20 + 90; assert.equal(e.searchAssets, n); assert.equal(e.recurring.find((l) => l.id === 'SEARCH')!.cents, n * 45 * 12);
  assert.ok(e.notes.some((x) => /Search Party counts every managed asset except the devices a room already charges per device/.test(x)));
  const small = estimate({ rooms: { small: 2, smallDevices: 6, mid: 0, midDevices: 0, large: 0, largeDevices: 0 }, users: 0, addOns: [{ sku: 'SEARCH' }] });
  assert.equal(small.searchAssets, 6); assert.equal(small.recurring.find((l) => l.id === 'SEARCH-MIN')!.cents, 4999 * 12); assert.ok(!small.recurring.some((l) => l.id === 'SEARCH'));
  assert.throws(() => estimate({ rooms: big, users: 0, addOns: [{ sku: 'SEARCH', quantity: 1450 }] }), /counted by the price book/);
  const none = estimate({ rooms: { small: 1, smallDevices: 0, mid: 0, midDevices: 0, large: 0, largeDevices: 0 }, users: 0, addOns: [{ sku: 'SEARCH' }] });   // nothing to count yet: the minimum, still
  assert.equal(none.searchAssets, 0); assert.equal(none.recurring.find((l) => l.id === 'SEARCH-MIN')!.cents, 4999 * 12);
});

test('add-ons follow the estate: per room, per tenant; a unit the estate cannot give needs its quantity', () => {
  const g = groupsOf(Array(50).fill(5));
  const e = estimate({ rooms: g, users: 10, addOns: [{ sku: 'COMMISSION' }, { sku: 'APEX' }, { sku: 'LITE', quantity: 2 }] });
  const by = (id: string) => e.recurring.find((l) => l.id === id)!;
  assert.equal(by('COMMISSION').cents, 50 * 1299 * 12); assert.equal(by('APEX').cents, 17999 * 12); assert.equal(by('LITE').cents, 2 * 34999 * 12);
  for (const id of ['COMMISSION', 'APEX', 'LITE']) assert.equal(by(id).status, 'list-v1.5');
  assert.throws(() => estimate({ rooms: g, users: 0, addOns: [{ sku: 'LITE' }] }), /give the quantity of LITE/);
  assert.throws(() => estimate({ rooms: g, users: 0, addOns: [{ sku: 'SIGNAL-TRIAL', quantity: 1 }] }), /not an add-on/);
});

test('the platform schedule the founder approved (03:47), now with a firm $15,000 (04:30): no cliff, no "from"', () => {
  const fees = (small: boolean) => [24, 25, 26, 27, 30, 31, 44, 45, 47, 48].map((r) => usd(platformFee(r, small).cents));
  assert.deepEqual(fees(false), ['$4,999.00', '$5,498.00', '$5,997.00', '$6,496.00', '$7,993.00', '$8,492.00', '$14,979.00', '$15,000.00', '$15,000.00', '$15,000.00']);
  assert.deepEqual(fees(true), ['$4,999.00', '$5,498.00', '$5,997.00', '$6,398.00', '$6,398.00', '$6,897.00', '$13,384.00', '$13,883.00', '$14,881.00', '$15,000.00']);
  for (const small of [false, true]) for (let r = 25; r <= 600; r++) { const step = platformFee(r, small).cents - platformFee(r - 1, small).cents; assert.ok(step >= 0 && step <= 49900, `${r}`); }
  for (let r = 25; r <= 600; r++) assert.ok(platformFee(r, true).cents <= platformFee(r, false).cents);
  assert.deepEqual([1, 9, 10, 19, 20, 24, 25, 44, 45, 501].map((r) => platformFee(r).id), ['PLATFORM-1-9', 'PLATFORM-1-9', 'PLATFORM-10-19', 'PLATFORM-10-19', 'PLATFORM-20-24', 'PLATFORM-20-24', 'PLATFORM-GROWTH', 'PLATFORM-GROWTH', 'PLATFORM-ENTERPRISE', 'PLATFORM-ENTERPRISE']);
  assert.match(platformFee(45).label, /\$15,000\.00, firm/); assert.doesNotMatch(platformFee(600).label, /from/);
});

test('the notes: devices counted as approved, never retroactive; the growth band; the firm fee; told before any change', () => {
  const e = estimate({ rooms: { small: 27, smallDevices: 100, mid: 0, midDevices: 0, large: 0, largeDevices: 0 }, users: 0, startedSmall: true });
  const n = e.notes.join(' ');
  assert.match(n, /verified, unique assets installed and in service in the room’s commissioned baseline; spares, stock, retired devices and virtual endpoints do not count\. Device charges are never retroactive/);
  assert.match(n, /stops at a firm \$15,000\.00: no added room raises it by more than \$499\.00/); assert.match(n, /at most \$1,399\.00 more until it passes 30 rooms/);
  assert.match(n, /Nothing is charged up automatically: you are told before your fee changes/); assert.match(e.recurring[0]!.label, /growth band/);
  assert.doesNotMatch(n, /starting figure|confirmed in a quote/);
  assert.throws(() => estimate({ rooms: { small: 27, smallDevices: 0, mid: 0, midDevices: 0, large: 0, largeDevices: 0 }, users: 0, startedSmall: 'yes' as unknown as boolean }), /yes or no/);
});

test('refused, with a reason: negative or fractional quantities, replaced v1.5 lines, a duplicate add-on, an unknown one; and what an estimate never includes', () => {
  const g = groupsOf([5, 5, 5]);
  assert.throws(() => estimate({ rooms: g, users: -3 }), /whole number/);
  assert.throws(() => estimate({ rooms: g, users: 0, hardware: { edge: -1 } }), /whole number/);
  assert.throws(() => estimate({ rooms: g, users: 0, assetsOutsideRooms: -1 }), /whole number/);
  for (const sku of ['PRO-ROOM', 'CORE-STARTER', 'CORE-ENTERPRISE', 'SEAT-ENTERPRISE']) assert.throws(() => estimate({ rooms: g, users: 0, addOns: [{ sku, quantity: 5 }] }), /replaced in the price book/, sku);
  assert.throws(() => estimate({ rooms: g, users: 0, addOns: [{ sku: 'COMMISSION' }, { sku: 'COMMISSION' }] }), /listed twice/);
  assert.throws(() => estimate({ rooms: g, users: 0, addOns: [{ sku: 'NOPE', quantity: 1 }] }), /unknown add-on/);
  const e = estimate({ rooms: g, users: 1, hardware: { pulse: 1 } });
  assert.ok(e.excluded.some((x) => /Implementation: a one-time, scope-based quote/.test(x)) && e.excluded.some((x) => /Taxes/.test(x)));
  assert.ok(e.notes.some((n) => /FieldLink is optional hardware at proposed concept prices/.test(n)));
  assert.ok(!e.recurring.concat(e.oneTime).some((l) => /IMPLEMENT/i.test(l.id)));
  const z = estimate({ rooms: g, users: 0 }); assert.equal(z.perUserAnnualCents, null); assert.equal(z.annualRecurringCents, 249900 + 12 * 3 * 3499);
});
