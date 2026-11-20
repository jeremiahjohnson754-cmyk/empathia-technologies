/**
 * Platform jumps (0047; founder, 18 Nov 2026, 07:49). A jump opens the organization's own portal for a platform in the person's own
 * browser: the address is the organization's (set by the operations lead or the security administrator) or, for one room or one device, the address someone recorded.
 * Empathia sends nothing to the platform and reads nothing from it; a jump is not an integration and implies no certification or
 * partnership. Vendor and product names are used only to say what the platform is. A default address is offered only where the
 * vendor's own documentation gives one sign-in address for every customer (read 18 Nov 2026; the page is kept with it): the Teams Rooms
 * Pro Management portal and the Microsoft 365 admin center (commercial cloud; government clouds set their own). Every other platform needs
 * the organization's address, because its portal is the organization's own (a SharePoint site, a ServiceNow instance, a Dante domain).
 */
import type { RequestContext } from '../auth/context.js';
import type { Queryable } from '../db/pg.js';
import { invalid, notFound } from '../http/errors.js';
import { findRoom } from './rooms.js';

export interface Platform { key: string; name: string; vendor: string; category: 'device-cloud' | 'meeting-rooms' | 'collaboration' | 'dsp' | 'audio-network' | 'signage' | 'audio' | 'design' | 'itsm'; for: string; at: Array<'room' | 'device' | 'ticket' | 'estate'>; defaultUrl?: { url: string; source: string } }
export const PLATFORMS: Platform[] = [
  { key: 'xio-cloud', name: 'XiO Cloud', vendor: 'Crestron', category: 'device-cloud', for: 'Crestron device status, configuration and firmware for the organization’s rooms', at: ['room', 'device', 'estate'] },
  { key: 'utelogy', name: 'Utelogy', vendor: 'Utelogy', category: 'device-cloud', for: 'Multi-vendor AV monitoring and management', at: ['room', 'device', 'estate'] },
  { key: 'teams-rooms-pro', name: 'Teams Rooms Pro Management portal', vendor: 'Microsoft', category: 'meeting-rooms', for: 'Microsoft Teams Rooms health, incidents and updates', at: ['room', 'device', 'estate'], defaultUrl: { url: 'https://portal.rooms.microsoft.com/', source: 'https://learn.microsoft.com/en-us/microsoftteams/rooms/enrolling-mtrp-managed-service' } },
  { key: 'm365-admin', name: 'Microsoft 365 admin center', vendor: 'Microsoft', category: 'collaboration', for: 'Accounts, licences and resource mailboxes for rooms', at: ['room', 'estate'], defaultUrl: { url: 'https://admin.microsoft.com/', source: 'https://learn.microsoft.com/microsoft-365/admin/admin-overview' } },
  { key: 'sharepoint', name: 'SharePoint', vendor: 'Microsoft', category: 'collaboration', for: 'The organization’s document libraries (drawings, manuals, as-builts)', at: ['room', 'estate'] },
  { key: 'xyte', name: 'Xyte', vendor: 'Xyte', category: 'device-cloud', for: 'Device cloud for connected AV equipment', at: ['room', 'device', 'estate'] },
  { key: 'q-sys-reflect', name: 'Q-SYS Reflect', vendor: 'Q-SYS', category: 'dsp', for: 'Q-SYS cores and peripherals: status, alerts, remote access', at: ['room', 'device', 'estate'] },
  { key: 'dante', name: 'Dante management', vendor: 'Audinate', category: 'audio-network', for: 'The organization’s Dante network management (domain manager or cloud)', at: ['room', 'device', 'estate'] },
  { key: 'appspace', name: 'Appspace', vendor: 'Appspace', category: 'signage', for: 'Room booking panels and workplace signage', at: ['room', 'estate'] },
  { key: 'signage', name: 'Digital signage', vendor: 'The organization’s signage platform', category: 'signage', for: 'The signage content management system the organization uses', at: ['room', 'device', 'estate'] },
  { key: 'sennheiser', name: 'Sennheiser management', vendor: 'Sennheiser', category: 'audio', for: 'Sennheiser microphones: Control Cockpit or the organization’s Sennheiser cloud', at: ['room', 'device', 'estate'] },
  { key: 'autodesk', name: 'Autodesk Construction Cloud', vendor: 'Autodesk', category: 'design', for: 'The project’s drawings and models', at: ['room', 'estate'] },
  { key: 'servicenow', name: 'ServiceNow', vendor: 'ServiceNow', category: 'itsm', for: 'The organization’s IT service management instance', at: ['ticket', 'room', 'estate'] },
];
const URL_RX = /^https:\/\/[A-Za-z0-9.-]+(:[0-9]{2,5})?(\/[^\s<>"]*)?$/;
/** who sets where the organization's portals are: the security administrator, and the operations lead who accepts rooms into operation and runs them */
export const CONFIGURE = ['policy.configure', 'handoff.accept'];
/** who records where one room or device is in a platform: the people who design, install, serve or triage it */
export const RECORD = ['room.design', 'work.evidence', 'service.triage'];
const cleanUrl = (u: unknown, max: number) => { const s = String(u ?? '').trim(); if (!URL_RX.test(s) || s.length > max) throw invalid('an address is https://… on a named host, at most ' + max + ' characters'); return s; };

async function catalogue(q: Queryable) {
  const rows = (await q.query<{ platform: string; url: string; label: string | null; enabled: boolean; set_at: string }>('SELECT platform, url, label, enabled, set_at FROM app.platform_link')).rows;
  const by = new Map(rows.map((r) => [r.platform, r]));
  return PLATFORMS.map((p) => { const r = by.get(p.key); return { ...p, configured: r ? { url: r.url, label: r.label, enabled: r.enabled, setAt: r.set_at } : null, opens: r ? (r.enabled ? r.url : null) : p.defaultUrl?.url ?? null }; });
}
export const NOTE = 'A jump opens the organization’s own portal in your browser. Empathia sends nothing to it and reads nothing from it; it is not an integration, and no certification or partnership is implied.';
/** the catalogue with what the organization has set, for anyone signed in: a person sees where a jump goes before pressing it */
export async function list(ctx: RequestContext) {
  return ctx.tx(async (q) => ({ items: await catalogue(q), note: NOTE, may: { configure: ctx.can(CONFIGURE), record: ctx.can(RECORD) } }));
}
export async function configure(ctx: RequestContext, key: string, body: { url?: string; label?: string | null; enabled?: boolean }) {
  await ctx.require(CONFIGURE, 'set where a platform jump goes', { type: 'PlatformLink', id: key });
  if (!PLATFORMS.some((p) => p.key === key)) throw notFound(`platform ${key}`);
  const url = cleanUrl(body.url, 300); const label = body.label == null ? null : String(body.label).trim().slice(0, 80) || null; const enabled = body.enabled !== false;
  return ctx.tx(async (q) => {
    const before = (await q.query<{ url: string; enabled: boolean }>('SELECT url, enabled FROM app.platform_link WHERE platform = $1 FOR UPDATE', [key])).rows[0] || null;
    await q.query(`INSERT INTO app.platform_link (tenant_id, platform, url, label, enabled, set_by) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (tenant_id, platform) DO UPDATE SET url = EXCLUDED.url, label = EXCLUDED.label, enabled = EXCLUDED.enabled, set_by = EXCLUDED.set_by, set_at = now()`, [ctx.p.tenantId, key, url, label, enabled, ctx.p.personId]);
    await ctx.audit(q, 'platform.link', 'ALLOWED', { type: 'PlatformLink', id: key }, { from: before, to: { url, enabled } });
    return { platform: key, url, label, enabled };
  });
}
/** the subject's own code, or not found: a room the caller may see (its site scope), or a unit in the organization's inventory */
async function subjectCode(ctx: RequestContext, q: Queryable, subject: 'room' | 'device', ref: string): Promise<string> {
  if (subject === 'room') return (await findRoom(ctx, q, ref)).code;
  const a = (await q.query<{ code: string }>('SELECT code FROM app.physical_asset WHERE code = $1', [ref])).rows[0]; if (!a) throw notFound(`device ${ref}`); return a.code;
}
/** the jumps for one room or device: its own recorded address where there is one, else the organization's portal */
export async function forSubject(ctx: RequestContext, subject: 'room' | 'device', ref: string) {
  return ctx.tx(async (q) => {
    const code = await subjectCode(ctx, q, subject, ref); const all = await catalogue(q);
    const refs = (await q.query<{ platform: string; url: string; recorded_at: string }>('SELECT platform, url, recorded_at FROM app.platform_ref WHERE subject = $1 AND subject_ref = $2 AND replaced_at IS NULL', [subject, code])).rows;
    const own = new Map(refs.map((r) => [r.platform, r]));
    const items = all.filter((p) => p.at.includes(subject) && (own.has(p.key) || p.opens)).map((p) => ({ key: p.key, name: p.name, vendor: p.vendor, for: p.for, opens: own.get(p.key)?.url || p.opens!, own: own.has(p.key), recordedAt: own.get(p.key)?.recorded_at || null }));
    return { subject, ref: code, items, unset: all.filter((p) => p.at.includes(subject) && !own.has(p.key) && !p.opens).map((p) => ({ key: p.key, name: p.name })), note: NOTE, may: { record: ctx.can(RECORD), configure: ctx.can(CONFIGURE) } };
  });
}
export async function recordRef(ctx: RequestContext, subject: 'room' | 'device', ref: string, body: { platform?: string; url?: string }) {
  await ctx.require(RECORD, `record where this ${subject} is in a platform`, { type: subject === 'room' ? 'Room' : 'Device', id: ref });
  const key = String(body.platform || ''); const p = PLATFORMS.find((x) => x.key === key); if (!p || !p.at.includes(subject)) throw invalid(`no platform ${key} for a ${subject}`);
  const url = cleanUrl(body.url, 400);
  return ctx.tx(async (q) => {
    ref = await subjectCode(ctx, q, subject, ref);
    await q.query('UPDATE app.platform_ref SET replaced_at = now() WHERE platform = $1 AND subject = $2 AND subject_ref = $3 AND replaced_at IS NULL', [key, subject, ref]);
    await q.query('INSERT INTO app.platform_ref (tenant_id, platform, subject, subject_ref, url, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)', [ctx.p.tenantId, key, subject, ref, url, ctx.p.personId]);
    await ctx.audit(q, 'platform.ref', 'ALLOWED', { type: subject === 'room' ? 'Room' : 'Device', id: ref }, { platform: key, url });
    return { platform: key, subject, ref, url };
  });
}
