/**
 * The support directory (migration 0044; source reconciliation item 2): who to call, for which domain, at which site, and who their
 * backup is — including people who never sign in here. That is what the name Search Party meant first.
 *
 *   record   someone who coordinates service, handoff or access (service.triage, handoff.accept, access.coordinate) records an
 *            organization, a contact, and proposes a support path
 *   verify   a data steward (provenance.review), never the recorder, verifies a contact and approves or rejects a path
 *
 * A path names verified contacts only, a backup who is someone else; one approved path per site and domain, a new approval
 * superseding the old. Nothing is deleted; a contact on an approved path is not retired until another path replaces it.
 */
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';
import { findRoom } from './rooms.js';

export const RECORD = ['service.triage', 'handoff.accept', 'access.coordinate'];
export const VERIFY = ['provenance.review'];
export const KINDS = ['OWNER', 'INTEGRATOR', 'VENDOR', 'MANUFACTURER', 'SERVICE_PROVIDER'];
export const DOMAINS = ['audio', 'video', 'network', 'control', 'av_infrastructure', 'power_ups', 'lighting', 'signage', 'conferencing', 'integration'];
export const CHANNELS = ['email', 'phone', 'queue', 'chat', 'radio'];
const agg = (type: string, id: string) => ({ type, id });

interface ContactRow { id: string; code: string; org: string; org_name: string; person_id: string | null; display_name: string; role_title: string; channels: Array<{ kind: string; value: string }>;
  recorded_by: string; recorded_at: string; verified_by: string | null; verified_at: string | null; retired_at: string | null; retired_reason: string | null }
interface PathRow { id: string; code: string; site: string; site_name: string; domain: string; primary_id: string; backup_id: string; escalation_id: string | null; vendor: string | null; vendor_name: string | null;
  queue: string | null; hours: string; state: string; proposed_by: string; proposed_at: string; decided_by: string | null; decided_at: string | null; decision_note: string | null }

const CONTACTS = `SELECT c.id, c.code, o.code AS org, o.name AS org_name, c.person_id, c.display_name, c.role_title, c.channels, c.recorded_by, c.recorded_at, c.verified_by, c.verified_at, c.retired_at, c.retired_reason
  FROM app.contact c JOIN app.organization o ON o.id = c.org_id`;
const PATHS = `SELECT p.id, p.code, s.code AS site, s.name AS site_name, p.domain, p.primary_id, p.backup_id, p.escalation_id, v.code AS vendor, v.name AS vendor_name, p.queue, p.hours, p.state,
  p.proposed_by, p.proposed_at, p.decided_by, p.decided_at, p.decision_note FROM app.support_path p JOIN app.site s ON s.id = p.site_id LEFT JOIN app.organization v ON v.id = p.vendor_org_id`;
/**
 * The hand-offs a contact offers (founder, 18 Nov: "the teams outlook and copy contact info on search party"). Each is a link into the
 * viewer's own app, in the form Microsoft and the RFCs publish (apps/demo/src/connect/apps.sources.ts): a Teams chat or call, an email
 * (opens the viewer's mail program, Outlook where that is theirs), a call, or the contact copied as text. Nothing is sent from here,
 * no meeting is booked, and no connector is used: what happens after the click is the viewer's.
 */
export interface ContactAction { id: 'teams.chat' | 'teams.call' | 'mail.compose' | 'phone.call' | 'copy'; label: string; href?: string; text?: string; note: string }
export function contactActions(c: { display_name: string; role_title: string; org_name: string; channels: Array<{ kind: string; value: string }> }): ContactAction[] {
  const email = c.channels.find((x) => x.kind === 'email' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.value))?.value;
  const phone = c.channels.find((x) => x.kind === 'phone')?.value; const tel = phone ? phone.replace(/[^+\d]/g, '') : '';
  const out: ContactAction[] = [];
  if (email) {
    const u = encodeURIComponent(email);
    out.push({ id: 'teams.chat', label: 'Chat in Teams', href: `https://teams.microsoft.com/l/chat/0/0?users=${u}`, note: 'Opens a chat in your own Teams; nothing is sent until you send it there.' });
    out.push({ id: 'teams.call', label: 'Call in Teams', href: `https://teams.microsoft.com/l/call/0/0?users=${u}`, note: 'Opens a call in your own Teams; it starts when you start it there.' });
    out.push({ id: 'mail.compose', label: 'Email (Outlook or your mail app)', href: `mailto:${email}`, note: 'Opens a new message in your mail program; nothing is sent from here.' });
  }
  if (/^\+\d{6,15}$/.test(tel)) out.push({ id: 'phone.call', label: 'Call', href: `tel:${tel}`, note: 'Hands the number to your phone.' });
  out.push({ id: 'copy', label: 'Copy contact info', text: [`${c.display_name} — ${c.role_title}, ${c.org_name}`, ...c.channels.map((x) => `${x.kind}: ${x.value}`)].join('\n'), note: 'Copies the contact as text.' });
  return out;
}
const contactView = (r: ContactRow) => ({ actions: r.retired_at ? [] : contactActions(r), code: r.code, org: { code: r.org, name: r.org_name }, name: r.display_name, role: r.role_title, channels: r.channels, signsIn: !!r.person_id,
  verified: !!r.verified_by, verifiedAt: r.verified_at, recordedAt: r.recorded_at, retired: r.retired_at ? { at: r.retired_at, reason: r.retired_reason } : null });
async function contactsById(q: Queryable): Promise<Map<string, ContactRow>> { return new Map((await q.query<ContactRow>(CONTACTS)).rows.map((r) => [r.id, r])); }
const pathView = (p: PathRow, byId: Map<string, ContactRow>) => {
  const who = (id: string | null) => (id && byId.get(id) ? contactView(byId.get(id)!) : null);
  return { code: p.code, site: { code: p.site, name: p.site_name }, domain: p.domain, state: p.state, primary: who(p.primary_id), backup: who(p.backup_id), escalation: who(p.escalation_id),
    vendor: p.vendor ? { code: p.vendor, name: p.vendor_name } : null, queue: p.queue, hours: p.hours, proposedAt: p.proposed_at, decidedAt: p.decided_at, decisionNote: p.decision_note };
};

/** The whole directory of the organization. */
export async function directory(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const orgs = (await q.query<{ code: string; name: string; kind: string; note: string | null }>('SELECT code, name, kind, note FROM app.organization ORDER BY kind, name')).rows;
    const byId = await contactsById(q); const paths = (await q.query<PathRow>(`${PATHS} ORDER BY s.code, p.domain, p.proposed_at`)).rows;
    return { organizations: orgs, contacts: [...byId.values()].sort((a, b) => a.code.localeCompare(b.code)).map(contactView), supportPaths: paths.map((p) => pathView(p, byId)),
      vocabulary: { kinds: KINDS, domains: DOMAINS, channels: CHANNELS }, may: { record: ctx.can(RECORD), verify: ctx.can(VERIFY) },
      basis: 'A contact is verified by a data steward who did not record it; a support path names verified contacts, a backup who is someone else, and is approved by a steward who did not propose it. Every channel in a demonstration is synthetic.' };
  });
}

export async function addOrganization(ctx: RequestContext, body: { name?: string; kind?: string; note?: string }) {
  await ctx.require(RECORD, 'record an organization');
  if (!KINDS.includes(String(body.kind))) throw invalid(`kind is one of ${KINDS.join(', ')}`);
  return ctx.tx(async (q) => {
    const name = String(body.name ?? '').trim(); if (name.length < 2) await ctx.refuse('directory.organization', undefined, ['an organization has a name']);
    if ((await q.query('SELECT 1 FROM app.organization WHERE lower(name) = lower($1)', [name])).rowCount) await ctx.refuse('directory.organization', undefined, [`${name} is in the directory already`]);
    const code = (await q.query<{ c: string }>("SELECT app.next_code('organization', 'ORG-') AS c")).rows[0]!.c;
    await q.query('INSERT INTO app.organization (tenant_id, code, name, kind, note, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)', [ctx.p.tenantId, code, name, body.kind, String(body.note ?? '').trim() || null, ctx.p.personId]);
    await ctx.audit(q, 'directory.organization', 'ALLOWED', agg('Organization', code), { kind: body.kind });
    return { code, name, kind: body.kind };
  });
}

export async function addContact(ctx: RequestContext, body: { org?: string; name?: string; role?: string; channels?: Array<{ kind: string; value: string }>; personId?: string }) {
  await ctx.require(RECORD, 'record a contact');
  return ctx.tx(async (q) => {
    const org = (await q.query<{ id: string }>('SELECT id FROM app.organization WHERE code = $1', [body.org])).rows[0]; const why: string[] = [];
    if (!org) why.push(`no organization ${body.org ?? ''} in this directory`);
    const name = String(body.name ?? '').trim(); const role = String(body.role ?? '').trim();
    if (name.length < 2) why.push('a contact has a name'); if (role.length < 2) why.push('a contact has a role');
    const ch = Array.isArray(body.channels) ? body.channels : [];
    if (!ch.length) why.push('a contact has at least one way to reach them');
    for (const c of ch) if (!CHANNELS.includes(c?.kind) || !String(c?.value ?? '').trim() || String(c.value).length > 120) why.push(`a channel is one of ${CHANNELS.join(', ')} with its address (up to 120 characters)`);
    if (body.personId && !(await q.query('SELECT 1 FROM app.membership WHERE person_id = $1', [body.personId])).rowCount) why.push('the account named is not a member of this organization');
    if (why.length) await ctx.refuse('directory.contact', undefined, [...new Set(why)]);
    const code = (await q.query<{ c: string }>("SELECT app.next_code('contact', 'CON-') AS c")).rows[0]!.c;
    await q.query('INSERT INTO app.contact (tenant_id, code, org_id, person_id, display_name, role_title, channels, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [ctx.p.tenantId, code, org!.id, body.personId || null, name, role, JSON.stringify(ch.map((c) => ({ kind: c.kind, value: String(c.value).trim() }))), ctx.p.personId]);
    await ctx.audit(q, 'directory.contact', 'ALLOWED', agg('Contact', code), { org: body.org });
    return { code, name, verified: false, next: 'a data steward who did not record it verifies it' };
  });
}

export async function verifyContact(ctx: RequestContext, code: string) {
  await ctx.require(VERIFY, 'verify a contact', agg('Contact', code));
  return ctx.tx(async (q) => {
    const c = (await q.query<{ id: string; recorded_by: string; verified_by: string | null; retired_at: string | null }>('SELECT id, recorded_by, verified_by, retired_at FROM app.contact WHERE code = $1 FOR UPDATE', [code])).rows[0];
    if (!c) throw notFound(`contact ${code}`);
    await ctx.separate('directory.verify', agg('Contact', code), [c.recorded_by], 'a contact');
    if (c.verified_by) await ctx.refuse('directory.verify', agg('Contact', code), [`${code} was verified already`]);
    if (c.retired_at) await ctx.refuse('directory.verify', agg('Contact', code), [`${code} is retired`]);
    await q.query('UPDATE app.contact SET verified_by = $2, verified_at = now() WHERE id = $1', [c.id, ctx.p.personId]);
    await ctx.audit(q, 'directory.verify', 'ALLOWED', agg('Contact', code));
    return { code, verified: true };
  });
}

export async function retireContact(ctx: RequestContext, code: string, body: { reason?: string }) {
  await ctx.require([...RECORD, ...VERIFY], 'retire a contact', agg('Contact', code));
  return ctx.tx(async (q) => {
    const c = (await q.query<{ id: string; retired_at: string | null }>('SELECT id, retired_at FROM app.contact WHERE code = $1 FOR UPDATE', [code])).rows[0];
    if (!c) throw notFound(`contact ${code}`); const why: string[] = [];
    if (c.retired_at) why.push(`${code} is retired already`);
    if (String(body.reason ?? '').trim().length < 5) why.push('say why the contact is retired');
    const on = (await q.query<{ code: string }>("SELECT code FROM app.support_path WHERE state = 'APPROVED' AND $1 IN (primary_id, backup_id, escalation_id)", [c.id])).rows.map((r) => r.code);
    if (on.length) why.push(`${code} is on the approved support path ${on.join(', ')}: approve a path that replaces it first`);
    if (why.length) await ctx.refuse('directory.retire', agg('Contact', code), why);
    await q.query('UPDATE app.contact SET retired_at = now(), retired_by = $2, retired_reason = $3 WHERE id = $1', [c.id, ctx.p.personId, String(body.reason).trim()]);
    await ctx.audit(q, 'directory.retire', 'ALLOWED', agg('Contact', code));
    return { code, retired: true };
  });
}

export async function proposePath(ctx: RequestContext, body: { site?: string; domain?: string; primary?: string; backup?: string; escalation?: string; vendor?: string; queue?: string; hours?: string }) {
  await ctx.require(RECORD, 'propose a support path');
  if (!DOMAINS.includes(String(body.domain))) throw invalid(`domain is one of ${DOMAINS.join(', ')}`);
  return ctx.tx(async (q) => {
    const why: string[] = [];
    const site = (await q.query<{ id: string }>('SELECT id FROM app.site WHERE code = $1', [body.site])).rows[0]; if (!site) why.push(`no site ${body.site ?? ''}`);
    const pick = async (codeOf: string | undefined, label: string, required: boolean) => {
      if (!codeOf) { if (required) why.push(`name the ${label}`); return null; }
      const c = (await q.query<{ id: string; verified_by: string | null; retired_at: string | null }>('SELECT id, verified_by, retired_at FROM app.contact WHERE code = $1', [codeOf])).rows[0];
      if (!c) { why.push(`no contact ${codeOf} (${label})`); return null; }
      if (c.retired_at) why.push(`${codeOf} (${label}) is retired`); else if (!c.verified_by) why.push(`${codeOf} (${label}) is not verified yet: a path names verified contacts`);
      return c.id;
    };
    const primary = await pick(body.primary, 'primary contact', true); const backup = await pick(body.backup, 'backup contact', true); const escalation = await pick(body.escalation, 'escalation contact', false);
    if (primary && backup && primary === backup) why.push('the backup is someone other than the primary contact');
    const vendor = body.vendor ? (await q.query<{ id: string }>('SELECT id FROM app.organization WHERE code = $1', [body.vendor])).rows[0]?.id : null;
    if (body.vendor && !vendor) why.push(`no organization ${body.vendor}`);
    if (String(body.hours ?? '').trim().length < 3) why.push('say when the path is staffed (hours)');
    if (why.length) await ctx.refuse('directory.path', undefined, [...new Set(why)]);
    const code = (await q.query<{ c: string }>("SELECT app.next_code('support_path', 'SPT-') AS c")).rows[0]!.c;
    await q.query('INSERT INTO app.support_path (tenant_id, code, site_id, domain, primary_id, backup_id, escalation_id, vendor_org_id, queue, hours, proposed_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [ctx.p.tenantId, code, site!.id, body.domain, primary, backup, escalation, vendor || null, String(body.queue ?? '').trim() || null, String(body.hours).trim(), ctx.p.personId]);
    await ctx.audit(q, 'directory.path', 'ALLOWED', agg('SupportPath', code), { site: body.site, domain: body.domain });
    return { code, state: 'PROPOSED', next: 'a data steward who did not propose it approves or rejects it' };
  });
}

export async function decidePath(ctx: RequestContext, code: string, body: { decision?: string; note?: string }) {
  await ctx.require(VERIFY, 'decide a support path', agg('SupportPath', code));
  if (!['APPROVED', 'REJECTED'].includes(String(body.decision))) throw invalid('decision is APPROVED or REJECTED');
  return ctx.tx(async (q) => {
    const p = (await q.query<{ id: string; site_id: string; domain: string; state: string; proposed_by: string; primary_id: string; backup_id: string; escalation_id: string | null }>(
      'SELECT id, site_id, domain, state, proposed_by, primary_id, backup_id, escalation_id FROM app.support_path WHERE code = $1 FOR UPDATE', [code])).rows[0];
    if (!p) throw notFound(`support path ${code}`);
    await ctx.separate('directory.decide', agg('SupportPath', code), [p.proposed_by], 'a support path');
    const why: string[] = [];
    if (p.state !== 'PROPOSED') why.push(`${code} was decided already (${p.state})`);
    if (body.decision === 'REJECTED' && String(body.note ?? '').trim().length < 5) why.push('a rejection says why');
    if (body.decision === 'APPROVED' && (await q.query('SELECT 1 FROM app.contact WHERE id = ANY($1::uuid[]) AND retired_at IS NOT NULL', [[p.primary_id, p.backup_id, p.escalation_id].filter(Boolean)])).rowCount) why.push('a contact on the path has been retired since it was proposed');
    if (why.length) await ctx.refuse('directory.decide', agg('SupportPath', code), why);
    let superseded: string | null = null;
    if (body.decision === 'APPROVED') {
      const old = (await q.query<{ id: string; code: string }>("SELECT id, code FROM app.support_path WHERE site_id = $1 AND domain = $2 AND state = 'APPROVED' FOR UPDATE", [p.site_id, p.domain])).rows[0];
      if (old) { await q.query("UPDATE app.support_path SET state = 'SUPERSEDED', superseded_by = $2 WHERE id = $1", [old.id, p.id]); superseded = old.code; }
    }
    await q.query('UPDATE app.support_path SET state = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1', [p.id, body.decision, ctx.p.personId, String(body.note ?? '').trim() || null]);
    await ctx.audit(q, 'directory.decide', 'ALLOWED', agg('SupportPath', code), { decision: body.decision, superseded });
    return { code, state: body.decision, superseded };
  });
}

/** Who to call: the approved support paths of a site (or of a room's site), optionally for one domain. */
export async function whoToCall(ctx: RequestContext, scope: { site?: string; room?: string }, domain?: string) {
  if (domain && !DOMAINS.includes(domain)) throw invalid(`domain is one of ${DOMAINS.join(', ')}`);
  return ctx.tx(async (q) => {
    let siteId: string | undefined; let siteCode = scope.site;
    if (scope.room) { const room = await findRoom(ctx, q, scope.room); const s = (await q.query<{ id: string; code: string }>('SELECT s.id, s.code FROM app.building b JOIN app.site s ON s.id = b.site_id WHERE b.id = $1', [room.building_id])).rows[0]!; siteId = s.id; siteCode = s.code; }
    else { const s = (await q.query<{ id: string }>('SELECT id FROM app.site WHERE code = $1', [scope.site])).rows[0]; if (!s) throw notFound(`site ${scope.site}`); siteId = s.id; }
    const byId = await contactsById(q);
    const paths = (await q.query<PathRow>(`${PATHS} WHERE p.site_id = $1 AND p.state = 'APPROVED' ${domain ? 'AND p.domain = $2' : ''} ORDER BY p.domain`, domain ? [siteId, domain] : [siteId])).rows.map((p) => pathView(p, byId));
    const covered = new Set(paths.map((p) => p.domain));
    return { site: siteCode, domain: domain || null, paths, uncovered: (domain ? [domain] : DOMAINS).filter((d) => !covered.has(d)),
      words: paths.length ? paths.map((p) => `${p.domain}: ${p.primary?.name} (${p.primary?.role}), backup ${p.backup?.name}${p.escalation ? `, escalation ${p.escalation.name}` : ''}; ${p.hours}`).join(' · ') : `No approved support path${domain ? ` for ${domain}` : ''} at ${siteCode}.` };
  });
}
