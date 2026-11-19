/**
 * Build Your Empathia, the view (Price Book 3, founder 19 Nov 2026 04:45). One renderer for the pre-rendered page and for the page's
 * script (src/build.ts → dist/build.js), so the two can never show different figures. Every amount comes from estimate() in
 * packages/commercial; nothing is added up here. The markup holds only numbers and fixed words (no visitor text), and is escaped anyway.
 *
 * Rooms come in three groups, each with its devices in total: standard rooms with up to 8 devices (no device charge), standard rooms with
 * 9 to 19, and large rooms with 20 or more. That prices every room exactly without asking about each one.
 */
import { estimate, usd, PRICE_BOOK, SKUS, BUNDLES, type Estimate, type EstimateInput } from '../../../packages/commercial/src/index.ts';

export interface Groups { smallRooms: number; smallDevices: number; midRooms: number; midDevices: number; largeRooms: number; largeDevices: number }
/**
 * Four starting estates: device counts from Empathia's own room archetypes (an office of focus, huddle and collaboration rooms; a
 * headquarters mix with boardrooms, training and AV-over-IP rooms and a townhall), licensed users at 1.3 a room.
 */
export const PROFILES: readonly ({ rooms: number; users: number; says: string } & Groups)[] = [
  { rooms: 10, users: 13, says: 'A small office: focus, huddle and collaboration rooms', smallRooms: 10, smallDevices: 53, midRooms: 0, midDevices: 0, largeRooms: 0, largeDevices: 0 },
  { rooms: 50, users: 65, says: 'A headquarters building, with boardrooms and a townhall', smallRooms: 32, smallDevices: 183, midRooms: 17, midDevices: 252, largeRooms: 1, largeDevices: 25 },
  { rooms: 150, users: 195, says: 'Several buildings on one campus', smallRooms: 94, smallDevices: 538, midRooms: 53, midDevices: 796, largeRooms: 3, largeDevices: 75 },
  { rooms: 500, users: 650, says: 'A multinational estate across sites', smallRooms: 310, smallDevices: 1775, midRooms: 180, midDevices: 2720, largeRooms: 10, largeDevices: 250 },
];

/** Products a buyer can add, from the v1.5 list: per-room ones follow the room count, Search Party is counted by the price book. */
export const ADDONS = [
  { sku: 'COMMISSION', demo: 'commissioning' },
  { sku: 'ASSURANCE', demo: 'commissioning' },
  { sku: 'SERVICE', demo: 'servicehands' },
  { sku: 'FIELD-CORE', demo: 'field' },
  { sku: 'APEX', demo: 'apex' },
  { sku: 'HARMONY', demo: 'mission-control' },
  { sku: 'SUPPORT-PREMIUM', demo: 'mission-control' },
  { sku: 'SEARCH', demo: 'search-party' },
] as const;
export type AddonSku = (typeof ADDONS)[number]['sku'];
/** the bundles that hold room licences (the other four of the seven hold products this builder does not offer) */
export const ROOM_BUNDLES = BUNDLES.filter((b) => b.skus.includes('PRO-ROOM'));
export const addonInfo = (sku: string) => { const s = SKUS.find((x) => x.sku === sku)!; return { name: s.name, cents: s.cents, unit: s.billingUnit === 'managed-room-month' ? 'per room, per month' : s.billingUnit === 'managed-asset-month' ? 'per managed asset, per month ($49.99 minimum); never a device a room already charges' : 'per month' }; };

export interface BuildState extends Groups { users: number; outside: number; startedSmall: boolean; bundle: string; nano: number; edge: number; pulse: number; addons: AddonSku[] }
const P50 = PROFILES[1]!;
export const DEFAULT_STATE: BuildState = { smallRooms: P50.smallRooms, smallDevices: P50.smallDevices, midRooms: P50.midRooms, midDevices: P50.midDevices, largeRooms: P50.largeRooms, largeDevices: P50.largeDevices, users: P50.users, outside: 0, startedSmall: false, bundle: '', nano: 0, edge: 0, pulse: 0, addons: [] };
export const roomsOf = (s: Groups) => s.smallRooms + s.midRooms + s.largeRooms;

/** The devices a group can hold, for its rooms: [least, most] (most null: no upper limit). */
export function deviceRange(kind: 'small' | 'mid' | 'large', rooms: number): [number, number | null] {
  const inc = PRICE_BOOK.rooms.standard.includedDevices; const big = PRICE_BOOK.roomRule.largeFromDevices;
  return kind === 'small' ? [0, rooms * inc] : kind === 'mid' ? [rooms * (inc + 1), rooms * (big - 1)] : [rooms * big, null];
}
/** What a group's rooms can hold, in words, for the hint under its inputs. */
export function rangeText(kind: 'small' | 'mid' | 'large', rooms: number): string {
  if (!rooms) return 'None';
  const [lo, hi] = deviceRange(kind, rooms); const f = (x: number) => x.toLocaleString('en-US');
  return `${f(rooms)} room${rooms === 1 ? '' : 's'} hold ${hi === null ? `at least ${f(lo)} devices` : `${f(lo)} to ${f(hi)} devices`}`;
}
/** Bring every group's devices into what its rooms can hold, and keep at least one room. */
export function normalize(s: BuildState): BuildState {
  const t = { ...s };
  if (roomsOf(t) < 1) t.smallRooms = 1;
  const fit = (v: number, [lo, hi]: [number, number | null]) => Math.max(lo, hi === null ? v : Math.min(hi, v));
  t.smallDevices = fit(t.smallDevices, deviceRange('small', t.smallRooms)); t.midDevices = fit(t.midDevices, deviceRange('mid', t.midRooms)); t.largeDevices = fit(t.largeDevices, deviceRange('large', t.largeRooms));
  if (!ROOM_BUNDLES.some((b) => b.id === t.bundle)) t.bundle = '';
  return t;
}

export const toInput = (s: BuildState): EstimateInput => ({
  rooms: { small: s.smallRooms, smallDevices: s.smallDevices, mid: s.midRooms, midDevices: s.midDevices, large: s.largeRooms, largeDevices: s.largeDevices },
  users: s.users,
  hardware: { nano: s.nano, edge: s.edge, pulse: s.pulse },
  addOns: ADDONS.filter((a) => s.addons.includes(a.sku)).map((a) => ({ sku: a.sku })),
  ...(s.outside ? { assetsOutsideRooms: s.outside } : {}),
  ...(s.bundle ? { bundle: s.bundle } : {}),
  ...(s.startedSmall ? { startedSmall: true } : {}),
});

const KEYS: [keyof Groups | 'users' | 'outside' | 'nano' | 'edge' | 'pulse', string][] = [['smallRooms', 'sr'], ['smallDevices', 'sd'], ['midRooms', 'mr'], ['midDevices', 'md'], ['largeRooms', 'lr'], ['largeDevices', 'ld'], ['users', 'users'], ['outside', 'out'], ['nano', 'nano'], ['edge', 'edge'], ['pulse', 'pulse']];
/** The estate in the address, so an estimate can be shared: #build?sr=32&sd=183&mr=17&md=252&lr=1&ld=25&users=65… */
export function stateHash(s: BuildState): string {
  const q = new URLSearchParams(); for (const [k, short] of KEYS) if (s[k] || ['sr', 'users'].includes(short)) q.set(short, String(s[k]));
  if (s.startedSmall) q.set('small', '1');
  if (s.bundle) q.set('bundle', s.bundle);
  if (s.addons.length) q.set('add', s.addons.join(','));
  return `#build?${q.toString()}`;
}
const n = (v: string | null, max: number) => { const x = Number(v); return v !== null && Number.isInteger(x) && x >= 0 && x <= max ? x : 0; };
export function parseHash(hash: string): BuildState | null {
  const m = /^#build\?(.*)$/.exec(hash); if (!m) return null;
  const q = new URLSearchParams(m[1]); const s = { ...DEFAULT_STATE, addons: [] as AddonSku[] };
  for (const [k, short] of KEYS) s[k] = n(q.get(short), k === 'users' ? 1000000 : /Devices|outside/.test(k) ? 100000000 : k === 'nano' || k === 'edge' || k === 'pulse' ? 9999 : 100000);
  s.startedSmall = q.get('small') === '1'; s.bundle = q.get('bundle') || '';
  s.addons = [...new Set((q.get('add') || '').split(',').filter((x): x is AddonSku => ADDONS.some((a) => a.sku === x)))];
  return normalize(s);
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const money = (c: number) => (c < 0 ? `−${usd(-c)}` : usd(c));
const STATUS: Record<string, string> = { 'founder-directed': 'Founder-set list price', 'list-v1.5': 'v1.5 list price', 'proposed-concept': 'Proposed price, concept hardware' };

/** The receipt: what the buyer pays every year, once, and over three and five years, line by line; discounts are lines of their own. */
export function receiptHtml(e: Estimate): string {
  const line = (l: Estimate['recurring'][number], once = false) => {
    const what = once ? `${usd(l.unitCents)} each, once · ${STATUS[l.status] || l.status}` : l.cents < 0 ? (l.note || '') : l.id.startsWith('PLATFORM') ? `per year · ${STATUS[l.status] || l.status}` : `${usd(l.unitCents)} ${l.per.replace(', from the v1.5 list', '')} · ${STATUS[l.status] || l.status}`;
    return `<li data-line="${esc(l.id)}"${l.cents < 0 ? ' class="by-r__off"' : ''}><span class="by-r__what"><b>${esc(l.label)}</b><small>${esc(what)}</small></span><span class="by-r__amt" data-cents="${l.cents}">${money(l.cents)}</span></li>`;
  };
  const per = [`<div><dt>Per room, per year</dt><dd data-k="per-room">${usd(e.perRoomAnnualCents)}</dd></div>`, e.perUserAnnualCents !== null ? `<div><dt>Per licensed user, per year</dt><dd data-k="per-user">${usd(e.perUserAnnualCents)}</dd></div>` : '', e.perDeviceAnnualCents !== null ? `<div><dt>Per device, per year</dt><dd data-k="per-device">${usd(e.perDeviceAnnualCents)}</dd></div>` : ''].join('');
  return [
    `<p class="by-r__k">Every year</p><p class="by-r__big" data-total="annual">${usd(e.annualRecurringCents)}</p>`,
    `<ul class="by-r__lines" aria-label="Every year, line by line">${e.recurring.map((l) => line(l)).join('')}</ul>`,
    e.oneTime.length ? `<p class="by-r__k">Once</p><ul class="by-r__lines" aria-label="Once, line by line">${e.oneTime.map((l) => line(l, true)).join('')}</ul>` : '',
    `<dl class="by-r__totals"><div class="by-r__first"><dt>First year</dt><dd data-total="first">${usd(e.firstYearCents)}</dd></div><div><dt>Three years</dt><dd data-total="three">${usd(e.threeYearCents)}</dd></div><div><dt>Five years</dt><dd data-total="five">${usd(e.fiveYearCents)}</dd></div>${per}</dl>`,
    `<ul class="by-r__notes">${e.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`,
    `<p class="by-r__ex"><b>Not in this estimate:</b> ${e.excluded.map(esc).join('; ')}.</p>`,
  ].join('');
}

/** The estimate as plain text, to paste into the enquiry form or an email. */
export function summaryText(s: BuildState, e: Estimate, url: string): string {
  const bundle = BUNDLES.find((b) => b.id === s.bundle);
  const lines = [
    `Empathia estimate — ${PRICE_BOOK.label}`,
    `${roomsOf(s)} rooms: ${s.smallRooms} with up to 8 devices (${s.smallDevices} devices), ${s.midRooms} with 9 to 19 (${s.midDevices}), ${s.largeRooms} large (${s.largeDevices}); ${s.users} licensed users${s.startedSmall ? '; an estate that started with 24 rooms or fewer' : ''}${s.addons.length ? `; with ${s.addons.map((a) => addonInfo(a).name).join(', ')}` : ''}${bundle ? `; ${bundle.name} bundle` : ''}${s.outside ? `; ${s.outside} managed assets outside rooms` : ''}${s.nano + s.edge + s.pulse ? `; FieldLink: ${s.nano} Nano, ${s.edge} Edge, ${s.pulse} Pulse` : ''}.`,
    ...e.recurring.map((l) => `  ${l.label}: ${money(l.cents)} a year`),
    ...e.oneTime.map((l) => `  ${l.label}: ${usd(l.cents)} once`),
    `Every year: ${usd(e.annualRecurringCents)}. First year: ${usd(e.firstYearCents)}. Three years: ${usd(e.threeYearCents)}. Five years: ${usd(e.fiveYearCents)}.`,
    `Not included: ${e.excluded.join('; ')}.`,
    `Open this estimate: ${url}`,
  ];
  return lines.join('\n');
}

export const compute = (s: BuildState) => estimate(toInput(normalize(s)));
