/**
 * The authority matrix, generated from the route table × the seeded roles and executed over real HTTP (red-team RT-03): for every
 * route whose authority is a set of keys, every seeded role that holds none of them is refused with 403 before the body is read, and
 * every role that holds one is not refused by the authority check (it may get 400/404/422 from validation, scope or rules — never 403
 * from this layer). Routes whose authority is a handler rule (prose) are listed as NOT covered by this matrix.
 *   node --test tests/security/authority-matrix.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { setup, client, repo } from '../integration/harness.mjs';

const ROLES = ['requestor', 'opslead', 'syseng', 'exec', 'finance', 'designer', 'dsp_eng', 'video_eng', 'control_eng', 'svcmgr', 'service', 'installer', 'cxeng', 'qa_reviewer', 'steward', 'secadmin'];
const FILL = { room: 'R-PLN-0001', asset: 'A-0001', connection: '00000000-0000-0000-0000-000000000000', kind: 'floorplan', test: 'T-1', issue: 'ISS-0001', workOrder: 'WO-0001', evidence: '00000000-0000-0000-0000-000000000000', type: 'Room', id: '00000000-0000-0000-0000-000000000000', key: 'mock-dsp', event: '00000000-0000-0000-0000-000000000000' };
let h, c, routes, authorities, tokens = {}, founder;
before(async () => {
  h = await setup({ db: 'empathia_test_matrix', port: 4192 }); c = client(h.base);
  const { buildRoutes } = await import(path.join(repo, 'services/enterprise-api/dist/src/modules/routes.js'));
  const { enforcedAuthorities } = await import(path.join(repo, 'services/enterprise-api/dist/src/http/router.js'));
  routes = buildRoutes({ pool: null, tokens: null, store: null, health: async () => ({}) }).routes.filter((r) => r.auth).map((r) => ({ ...r, keys: enforcedAuthorities(r) }));
  for (const r of ROLES) tokens[r] = await c.login(r);
  founder = await c.login('founder', 'empathia-founder'); tokens.founder = founder;
  const roles = (await c.call('GET', '/v1/roles', { token: tokens.secadmin })).body;
  authorities = Object.fromEntries((roles.items || roles.roles || roles).map((x) => [x.key, x.authorities]));
  authorities.founder = ['founder.workspace'];
});
after(async () => { await h?.app.stop(); });

test('every authority-keyed route refuses every role without the key (403) and never refuses a role with it at the authority layer', async () => {
  const keyed = routes.filter((r) => r.keys.length); const prose = routes.filter((r) => !r.keys.length && r.authority);
  assert.ok(keyed.length >= 25, `${keyed.length} keyed routes`);
  const failures = []; let checks = 0;
  for (const r of keyed) {
    const p = r.path.replace(/:([a-zA-Z]+)/g, (_, k) => FILL[k] || 'x');
    for (const role of [...ROLES, 'founder']) {
      const holds = (authorities[role] || []).includes('*') || r.keys.some((k) => (authorities[role] || []).includes(k));
      const res = await c.call(r.method, p, { token: tokens[role], body: ['POST', 'PATCH', 'PUT'].includes(r.method) ? {} : undefined }); checks += 1;
      if (!holds && res.status !== 403) failures.push(`${role} ${r.method} ${p} → ${res.status} (expected 403)`);
      if (holds && res.status === 403 && !/founder organization/.test(JSON.stringify(res.body))) failures.push(`${role} ${r.method} ${p} → 403 although it holds ${r.keys.join('|')}`);
    }
  }
  console.log(`# ${checks} role×route checks over ${keyed.length} keyed routes; handler-rule routes not covered by this matrix: ${prose.map((r) => `${r.method} ${r.path}`).join(', ') || 'none'}`);
  assert.deepEqual(failures, []);
});
test('a refusal at the authority layer is audited with the role and the need', async () => {
  assert.equal((await c.call('GET', '/v1/people', { token: tokens.requestor })).status, 403);
  const latest = (await c.call('GET', '/v1/audit?limit=20', { token: tokens.secadmin })).body.items;
  const hit = latest.find((e) => e.outcome === 'DENIED' && e.actor_role === 'requestor' && /policy\.configure/.test(JSON.stringify(e.detail)));
  assert.ok(hit, JSON.stringify(latest.slice(0, 3)));
});
