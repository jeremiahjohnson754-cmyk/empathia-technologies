/**
 * The firmware baseline of a model (migration 0045; source reconciliation item 6): the version approved for a model, proposed by
 * someone who verifies tests, approved by a systems engineer who did not propose it; one approved per model, a new approval
 * superseding it. The device register then says, per unit, whether its recorded firmware matches (installations.ts firmwareStatus).
 */
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';

export const PROPOSE = ['test.verify', 'tests.verify.all'];
export const DECIDE = ['baseline.approve'];
const agg = (id: string) => ({ type: 'FirmwareBaseline', id });

export async function list(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const rows = (await q.query<{ id: string; model: string; version: string; note: string | null; state: string; proposed_at: string; decided_at: string | null }>(
      'SELECT id, model, version, note, state, proposed_at, decided_at FROM app.firmware_baseline ORDER BY lower(model), proposed_at')).rows;
    return { items: rows.map((r) => ({ id: r.id, model: r.model, version: r.version, note: r.note, state: r.state, proposedAt: r.proposed_at, decidedAt: r.decided_at })), may: { propose: ctx.can(PROPOSE), decide: ctx.can(DECIDE) } };
  });
}

export async function propose(ctx: RequestContext, body: { model?: string; version?: string; note?: string }) {
  await ctx.require(PROPOSE, 'propose a firmware baseline');
  return ctx.tx(async (q) => {
    const model = String(body.model ?? '').trim(); const version = String(body.version ?? '').trim(); const why: string[] = [];
    if (!model) why.push('name the model'); if (!/^[A-Za-z0-9][A-Za-z0-9._ -]{0,39}$/.test(version)) why.push('a firmware version is up to 40 letters, digits, dots, dashes or spaces');
    if (model && !(await q.query('SELECT 1 FROM app.physical_asset WHERE lower(model) = lower($1)', [model])).rowCount) why.push(`no unit of model ${model} is on record in this organization`);
    if ((await q.query("SELECT 1 FROM app.firmware_baseline WHERE lower(model) = lower($1) AND state = 'PROPOSED'", [model])).rowCount) why.push(`a baseline for ${model} is already awaiting a decision`);
    if (why.length) await ctx.refuse('firmware.propose', undefined, why);
    const id = (await q.query<{ id: string }>('INSERT INTO app.firmware_baseline (tenant_id, model, version, note, proposed_by) VALUES ($1,$2,$3,$4,$5) RETURNING id', [ctx.p.tenantId, model, version, String(body.note ?? '').trim() || null, ctx.p.personId])).rows[0]!.id;
    await ctx.audit(q, 'firmware.propose', 'ALLOWED', agg(id), { model, version });
    return { id, model, version, state: 'PROPOSED' };
  });
}

export async function decide(ctx: RequestContext, id: string, body: { decision?: string }) {
  await ctx.require(DECIDE, 'decide a firmware baseline', agg(id));
  if (!['APPROVED', 'REJECTED'].includes(String(body.decision))) throw invalid('decision is APPROVED or REJECTED');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw notFound(`firmware baseline ${id}`);
  return ctx.tx(async (q) => {
    const b = (await q.query<{ id: string; model: string; state: string; proposed_by: string }>('SELECT id, model, state, proposed_by FROM app.firmware_baseline WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!b) throw notFound(`firmware baseline ${id}`);
    await ctx.separate('firmware.decide', agg(id), [b.proposed_by], 'a firmware baseline');
    if (b.state !== 'PROPOSED') await ctx.refuse('firmware.decide', agg(id), [`the baseline was decided already (${b.state})`]);
    let superseded: string | null = null;
    if (body.decision === 'APPROVED') {
      const old = (await q.query<{ id: string; version: string }>("SELECT id, version FROM app.firmware_baseline WHERE lower(model) = lower($1) AND state = 'APPROVED' FOR UPDATE", [b.model])).rows[0];
      if (old) { await q.query("UPDATE app.firmware_baseline SET state = 'SUPERSEDED' WHERE id = $1", [old.id]); superseded = old.version; }
    }
    await q.query('UPDATE app.firmware_baseline SET state = $2, decided_by = $3, decided_at = now() WHERE id = $1', [b.id, body.decision, ctx.p.personId]);
    await ctx.audit(q, 'firmware.decide', 'ALLOWED', agg(id), { decision: body.decision, model: b.model, superseded });
    return { id, model: b.model, state: body.decision, superseded };
  });
}
