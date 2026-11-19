/**
 * Build Your Empathia, the view (founder 18 Nov 2026 19:39 and 20:51). One renderer for the pre-rendered page and for the page's
 * script (src/build.ts → dist/build.js), so the two can never show different figures. Every amount comes from estimate() in
 * packages/commercial; nothing is added up here. The markup holds only numbers and fixed words (no visitor text), and is escaped anyway.
 */
import { estimate, usd, PRICE_BOOK, SKUS, type Estimate, type EstimateInput } from '../../../packages/commercial/src/index.ts';

/** Four starting estates (directive §7: comparable default profiles, not one room mix or user density for every estate). */
export const PROFILES = [
  { rooms: 10, large: 1, users: 12, says: 'A small office, a school building or a church campus' },
  { rooms: 50, large: 10, users: 75, says: 'A headquarters building: the founder’s own illustration' },
  { rooms: 150, large: 25, users: 200, says: 'Several buildings on one campus' },
  { rooms: 500, large: 90, users: 650, says: 'A multinational estate across sites' },
] as const;

/** Products a buyer can add, from the v1.5 list (price book 2 keeps them): per-room ones follow the room count. */
export const ADDONS = [
  { sku: 'COMMISSION', perRoom: true, demo: 'commissioning' },
  { sku: 'ASSURANCE', perRoom: true, demo: 'commissioning' },
  { sku: 'SERVICE', perRoom: true, demo: 'servicehands' },
  { sku: 'FIELD-CORE', perRoom: true, demo: 'field' },
  { sku: 'APEX', perRoom: false, demo: 'apex' },
  { sku: 'HARMONY', perRoom: false, demo: 'mission-control' },
  { sku: 'SUPPORT-PREMIUM', perRoom: false, demo: 'mission-control' },
  // the one per-device price (founder 19 Nov 03:47: "what we're charging per device"): $0.45 a managed asset a month, $49.99 minimum
  { sku: 'SEARCH', perRoom: false, perDevice: true, demo: 'search-party' },
] as const;
export type AddonSku = (typeof ADDONS)[number]['sku'];
export const addonInfo = (sku: string) => { const s = SKUS.find((x) => x.sku === sku)!; return { name: s.name, cents: s.cents, unit: s.billingUnit === 'managed-room-month' ? 'per room, per month' : s.billingUnit === 'managed-asset-month' ? 'per device, per month ($49.99 minimum)' : 'per month' }; };

/** `devices`: the estate's devices, for the per-device figure and Search Party (0 = not given); `small`: it started with 24 rooms or fewer */
export interface BuildState { rooms: number; large: number; users: number; devices: number; small: boolean; nano: number; edge: number; pulse: number; addons: AddonSku[] }
export const DEFAULT_STATE: BuildState = { rooms: 50, large: 10, users: 75, devices: 0, small: false, nano: 0, edge: 0, pulse: 0, addons: [] };

export const toInput = (s: BuildState): EstimateInput => ({
  standardRooms: s.rooms - s.large, largeRooms: s.large, users: s.users,
  hardware: { nano: s.nano, edge: s.edge, pulse: s.pulse },
  addOns: ADDONS.filter((a) => s.addons.includes(a.sku)).map((a) => ({ sku: a.sku, quantity: a.perRoom ? s.rooms : 'perDevice' in a ? s.devices : 1 })),
  ...(s.devices ? { devices: s.devices } : {}),
  ...(s.small ? { startedSmall: true } : {}),
});

/** The estate in the address, so an estimate can be shared: #build?rooms=50&large=10&users=75&nano=0&edge=0&pulse=0&add=APEX */
export function stateHash(s: BuildState): string {
  const q = new URLSearchParams({ rooms: String(s.rooms), large: String(s.large), users: String(s.users), nano: String(s.nano), edge: String(s.edge), pulse: String(s.pulse) });
  if (s.devices) q.set('devices', String(s.devices));
  if (s.small) q.set('small', '1');
  if (s.addons.length) q.set('add', s.addons.join(','));
  return `#build?${q.toString()}`;
}
const n = (v: string | null, max: number, d: number) => { const x = Number(v); return v !== null && Number.isInteger(x) && x >= 0 && x <= max ? x : d; };
export function parseHash(hash: string): BuildState | null {
  const m = /^#build\?(.*)$/.exec(hash); if (!m) return null;
  const q = new URLSearchParams(m[1]);
  const rooms = Math.max(1, n(q.get('rooms'), 100000, DEFAULT_STATE.rooms));
  const add = (q.get('add') || '').split(',').filter((x): x is AddonSku => ADDONS.some((a) => a.sku === x));
  return { rooms, large: Math.min(rooms, n(q.get('large'), 100000, 0)), users: n(q.get('users'), 1000000, 0), devices: n(q.get('devices'), 100000000, 0), small: q.get('small') === '1', nano: n(q.get('nano'), 9999, 0), edge: n(q.get('edge'), 9999, 0), pulse: n(q.get('pulse'), 9999, 0), addons: [...new Set(add)] };
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const STATUS: Record<string, string> = { 'founder-directed': 'Founder-set list price', 'list-v1.5': 'v1.5 list price', 'proposed-concept': 'Proposed price, concept hardware' };

/** The receipt: what the buyer pays every year, once, and over three and five years, line by line. */
export function receiptHtml(e: Estimate): string {
  const line = (l: Estimate['recurring'][number], once = false) => `<li data-line="${esc(l.id)}"><span class="by-r__what"><b>${esc(l.label)}</b><small>${esc(once ? `${usd(l.unitCents)} each, once` : l.id.startsWith('PLATFORM') ? 'per year' : `${usd(l.unitCents)} ${l.per.replace(', from the v1.5 list', '')}`)} · ${esc(STATUS[l.status] || l.status)}</small></span><span class="by-r__amt" data-cents="${l.cents}">${usd(l.cents)}</span></li>`;
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
  const lines = [
    `Empathia estimate — ${PRICE_BOOK.label}`,
    `${s.rooms} rooms (${s.large} large, 20+ devices), ${s.users} licensed users${s.devices ? `, ${s.devices} devices` : ''}${s.small ? ' (an estate that started with 24 rooms or fewer)' : ''}${s.addons.length ? `, with ${s.addons.map((a) => addonInfo(a).name).join(', ')}` : ''}${s.nano + s.edge + s.pulse ? `; FieldLink: ${s.nano} Nano, ${s.edge} Edge, ${s.pulse} Pulse` : ''}.`,
    ...e.recurring.map((l) => `  ${l.label}: ${usd(l.cents)} a year`),
    ...e.oneTime.map((l) => `  ${l.label}: ${usd(l.cents)} once`),
    `Every year: ${usd(e.annualRecurringCents)}. First year: ${usd(e.firstYearCents)}. Three years: ${usd(e.threeYearCents)}. Five years: ${usd(e.fiveYearCents)}.`,
    `Not included: ${e.excluded.join('; ')}.`,
    `Open this estimate: ${url}`,
  ];
  return lines.join('\n');
}

export const compute = (s: BuildState) => estimate(toInput(s));
