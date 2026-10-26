/**
 * Organization module: sites and buildings, people and memberships, the role catalogue, and projects.
 * Reads run in tenant-scoped transactions (row-level security); site scope narrows sites, buildings and project room lists.
 */
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound, refused } from '../http/errors.js';

export async function sites(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const scope = ctx.p.siteScope;
    const rows = (await q.query<{ site: string; site_name: string; building: string | null; building_name: string | null; floors: number | null; rooms: number }>(
      `SELECT s.code AS site, s.name AS site_name, b.code AS building, b.name AS building_name, b.floors, (SELECT count(*)::int FROM app.room r WHERE r.building_id = b.id) AS rooms
         FROM app.site s LEFT JOIN app.building b ON b.site_id = s.id AND b.tenant_id = s.tenant_id
        WHERE ${scope?.length ? 's.id = ANY($1::uuid[])' : 'true'} ORDER BY s.code, b.code`, scope?.length ? [scope] : [])).rows;
    const out = new Map<string, { code: string; name: string; buildings: Array<{ code: string; name: string; floors: number | null; rooms: number }> }>();
    for (const r of rows) {
      if (!out.has(r.site)) out.set(r.site, { code: r.site, name: r.site_name, buildings: [] });
      if (r.building) out.get(r.site)!.buildings.push({ code: r.building, name: r.building_name!, floors: r.floors, rooms: r.rooms });
    }
    return { items: [...out.values()] };
  });
}

export async function roles(ctx: RequestContext) {
  return ctx.tx(async (q) => ({ items: (await q.query('SELECT key, label, authorities, description FROM app.role ORDER BY key')).rows }));
}

/** The tenant's people and memberships. Security administration only: membership is identity data. */
export async function people(ctx: RequestContext) {
  await ctx.require('policy.configure', 'list the people of the tenant');
  return ctx.tx(async (q) => {
    const rows = (await q.query(`SELECT p.id, p.display_name AS name, p.email, p.disabled, m.role_key AS role,
        (SELECT coalesce(array_agg(s.code ORDER BY s.code), '{}') FROM app.site s WHERE s.id = ANY(m.site_scope)) AS "siteScope"
        FROM app.membership m JOIN app.person p ON p.id = m.person_id WHERE m.tenant_id = $1 ORDER BY m.role_key, p.display_name`, [ctx.p.tenantId])).rows;
    await ctx.audit(q, 'people.list', 'ALLOWED', { type: 'Tenant', id: ctx.p.tenantSlug }, { count: rows.length });
    return { items: rows };
  });
}

export async function projects(ctx: RequestContext) {
  return ctx.tx(async (q) => {
    const scope = ctx.p.siteScope;
    const ps = (await q.query<{ id: string; code: string; name: string; state: string; created_at: string }>('SELECT id, code, name, state, created_at FROM app.project ORDER BY code')).rows;
    const rooms = (await q.query<{ project_id: string; code: string; name: string; lifecycle: string }>(
      `SELECT r.project_id, r.code, r.name, r.lifecycle FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE r.project_id IS NOT NULL${scope?.length ? ' AND b.site_id = ANY($1::uuid[])' : ''} ORDER BY r.code`, scope?.length ? [scope] : [])).rows;
    return { items: ps.map((p) => ({ code: p.code, name: p.name, state: p.state, createdAt: p.created_at, rooms: rooms.filter((r) => r.project_id === p.id).map(({ project_id: _, ...r }) => r) })) };
  });
}

export async function createProject(ctx: RequestContext, body: { code: string; name: string }) {
  await ctx.require('project.decide', 'create a project');
  if (!/^PRJ-[A-Z0-9-]{2,32}$/.test(body.code)) throw invalid('a project code looks like PRJ-ATLAS-AV');
  return ctx.tx(async (q) => {
    const r = (await q.query<{ id: string }>('INSERT INTO app.project (tenant_id, code, name, created_by) VALUES ($1,$2,$3,$4) RETURNING id', [ctx.p.tenantId, body.code, String(body.name).slice(0, 120), ctx.p.personId])).rows[0]!;
    await ctx.audit(q, 'project.create', 'ALLOWED', { type: 'Project', id: body.code }, { name: body.name });
    return { code: body.code, id: r.id, state: 'OPEN' };
  });
}

/** Put a room into a project (or take it out with projectCode = null). The executive who decides projects decides their scope. */
export async function assignRoomToProject(ctx: RequestContext, roomCode: string, projectCode: string | null) {
  await ctx.require('project.decide', 'change a project’s rooms', { type: 'Room', id: roomCode });
  return ctx.tx(async (q) => {
    const scope = ctx.p.siteScope;
    const room = (await q.query<{ id: string; project_id: string | null }>(`SELECT r.id, r.project_id FROM app.room r JOIN app.building b ON b.id = r.building_id WHERE r.code = $1${scope?.length ? ' AND b.site_id = ANY($2::uuid[])' : ''} FOR UPDATE OF r`, scope?.length ? [roomCode, scope] : [roomCode])).rows[0];
    if (!room) throw notFound(`room ${roomCode}`);
    let pid: string | null = null;
    if (projectCode) {
      const p = (await q.query<{ id: string; state: string }>('SELECT id, state FROM app.project WHERE code = $1', [projectCode])).rows[0];
      if (!p) throw notFound(`project ${projectCode}`);
      if (p.state !== 'OPEN') throw refused([`project ${projectCode} is closed`]);
      pid = p.id;
    }
    await q.query('UPDATE app.room SET project_id = $2 WHERE id = $1', [room.id, pid]);
    await ctx.audit(q, 'project.room', 'ALLOWED', { type: 'Room', id: roomCode }, { projectCode });
    return { room: roomCode, project: projectCode };
  });
}
