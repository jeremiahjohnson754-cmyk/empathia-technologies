/**
 * Public leads: the website's forms (demonstration request, pilot partnership, contact) persisted for a person to answer.
 *
 * Inbound is unauthenticated, so the controls are: schema validation (route), a honeypot field that must be absent, consent that must be
 * true, a stricter per-address budget than the API's general one (LEAD_BURST per hour per source address), a size cap, and a row-level
 * policy that lets the runtime role insert only inside a transaction flagged as public inbound. Reading and handling a lead requires
 * policy.configure (security administrator) and is audited. Notification: an email adapter is not configured in this build — the lead
 * records `notified = false` with the reason, and the admin inbox shows it; nothing pretends a message went out.
 */
import crypto from 'node:crypto';
import type { PgPool, Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound } from '../http/errors.js';

export const CONSENT_TEXT = 'I agree that Empathia stores this message to answer it (see the privacy notice).';
const LEAD_BURST = Number(process.env.LEAD_BURST_PER_HOUR || 5);
const recent = new Map<string, number[]>();   // source address hash → submission times within the last hour (process-local)
export const emailAdapter = { configured: false, reason: 'email adapter not configured (set SMTP_URL and LEAD_NOTIFY_TO, then the adapter sends a copy of each lead to that address)' };

export interface LeadInput { kind: 'demo' | 'pilot' | 'contact'; name: string; organization: string; email: string; audience?: string; scope?: string; message: string; consent: boolean; website?: string; }

function ipHash(ip: string): string { return crypto.createHmac('sha256', process.env.LEAD_IP_PEPPER || 'development-pepper').update(ip).digest('hex').slice(0, 32); }

export async function createLead(pool: PgPool, input: LeadInput, meta: { ip: string; userAgent: string; correlationId: string }) {
  if (input.website) throw new ApiError('validation', 'the form was not accepted');   // honeypot: a hidden field only a bot fills
  if (input.consent !== true) throw invalid('consent is required to store the message');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw invalid('email must be an address');
  const h = ipHash(meta.ip); const now = Date.now(); const times = (recent.get(h) || []).filter((t) => now - t < 3600000);
  if (times.length >= LEAD_BURST) throw new ApiError('rate_limited', 'too many messages from this address in the last hour; please try again later');
  times.push(now); recent.set(h, times);
  return pool.tx({}, async (q: Queryable) => {
    await q.query("SELECT set_config('app.public_inbound', 'on', true)");
    const id = crypto.randomUUID(); const receivedAt = new Date().toISOString();   // no RETURNING: the inbound policy allows insert only, never a read
    await q.query(
      `INSERT INTO app.public_lead (id, kind, name, organization, email, audience, scope, message, consent, consent_text, source_ip_hash, user_agent, correlation_id, notified, notify_note, created_at)
       VALUES ($13,$1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11,false,$12,$14)`,
      [input.kind, input.name.trim(), input.organization.trim(), input.email.trim().toLowerCase(), input.audience || null, input.scope || null, input.message.trim(), CONSENT_TEXT, h, meta.userAgent.slice(0, 300) || null, meta.correlationId, emailAdapter.configured ? null : emailAdapter.reason, id, receivedAt]);
    return { id, receivedAt, notification: emailAdapter.configured ? 'sent' : 'not configured: the message is stored and will be read from the admin inbox' };
  });
}

export async function listLeads(ctx: RequestContext, status: string | null, limit: number) {
  await ctx.require('policy.configure', 'read the lead inbox');
  if (status && !['NEW', 'ANSWERED', 'SPAM'].includes(status)) throw invalid('status is NEW, ANSWERED or SPAM');
  return ctx.tx(async (q) => {
    await q.query("SELECT set_config('app.lead_admin', 'on', true)");
    const args: unknown[] = [Math.min(Math.max(limit || 100, 1), 500)]; let where = 'true'; if (status) { args.push(status); where = `status = $2`; }
    const r = await q.query(`SELECT id, kind, name, organization, email, audience, scope, message, status, notified, notify_note, handled_by, handled_at, notes, created_at FROM app.public_lead WHERE ${where} ORDER BY created_at DESC LIMIT $1`, args);
    await ctx.audit(q, 'lead.inbox_read', 'ALLOWED', undefined, { status: status || 'all', count: r.rowCount });
    return { items: r.rows, emailAdapter };
  });
}

export async function handleLead(ctx: RequestContext, id: string, patch: { status?: string; notes?: string }) {
  await ctx.require('policy.configure', 'handle a lead', { type: 'PublicLead', id });
  if (patch.status && !['NEW', 'ANSWERED', 'SPAM'].includes(patch.status)) throw invalid('status is NEW, ANSWERED or SPAM');
  return ctx.tx(async (q) => {
    await q.query("SELECT set_config('app.lead_admin', 'on', true)");
    const r = await q.query(`UPDATE app.public_lead SET status = COALESCE($2, status), notes = COALESCE($3, notes), handled_by = $4, handled_at = now() WHERE id = $1 RETURNING id, status, notes, handled_at`, [id, patch.status || null, patch.notes ?? null, ctx.p.personId]);
    if (!r.rowCount) throw notFound(`lead ${id}`);
    await ctx.audit(q, 'lead.handled', 'ALLOWED', { type: 'PublicLead', id }, { status: patch.status || null, notesChanged: patch.notes != null });
    return r.rows[0];
  });
}
