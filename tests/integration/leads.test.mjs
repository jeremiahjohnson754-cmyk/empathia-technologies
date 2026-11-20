/**
 * Public leads (the website's forms) over real HTTP against a real database: a message is stored; the honeypot, missing consent and a
 * bad address are refused; nobody but a security administrator reads the inbox (a technician and an anonymous caller are denied);
 * handling is recorded and audited; the per-address budget stops a burst; the notification status says plainly that no email adapter
 * is configured. Synthetic data only.
 *   node --test tests/integration/leads.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from './harness.mjs';

let h, c, admin, tech, id;
const lead = (over = {}) => ({ kind: 'demo', name: 'Synthetic Person', organization: 'Example Org (synthetic)', email: 'person@example.com', audience: 'CIO / CTO / IT leadership', message: 'We would like to see the commissioning scenario.', elapsedMs: 9000, consent: true, ...over });

before(async () => { h = await setup({ db: 'empathia_test_leads', port: 4198, env: { LEAD_BURST_PER_HOUR: '4' } }); c = client(h.base); admin = await c.login('secadmin'); tech = await c.login('service'); });
after(async () => { await h?.app.stop(); });

test('a message from the website is stored and answered with a receipt that states the notification status', async () => {
  const r = await c.call('POST', '/v1/public/leads', { body: lead() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.id, /^[0-9a-f-]{36}$/); id = r.body.id;
  assert.match(r.body.notification, /not configured/);
});
test('the honeypot, missing consent, a malformed address and a too-fast or untimed submission are refused and nothing is stored', async () => {
  assert.equal((await c.call('POST', '/v1/public/leads', { body: lead({ website: 'http://spam.example' }) })).status, 400);
  assert.equal((await c.call('POST', '/v1/public/leads', { body: lead({ consent: false }) })).status, 400);
  assert.equal((await c.call('POST', '/v1/public/leads', { body: lead({ email: 'not-an-address' }) })).status, 400);
  assert.equal((await c.call('POST', '/v1/public/leads', { body: lead({ kind: 'founder' }) })).status, 400);
  // the minimum fill time: posted faster than a person can type, or without the timing at all, is refused
  const fast = await c.call('POST', '/v1/public/leads', { body: lead({ elapsedMs: 800 }) }); assert.equal(fast.status, 400); assert.match(JSON.stringify(fast.body), /too quickly/);
  const { elapsedMs, ...untimed } = lead(); assert.equal((await c.call('POST', '/v1/public/leads', { body: untimed })).status, 400);
  const inbox = await c.call('GET', '/v1/admin/leads', { token: admin });
  assert.equal(inbox.body.items.length, 1);
});
test('the inbox is read only by a security administrator, and the read is audited', async () => {
  assert.equal((await c.call('GET', '/v1/admin/leads')).status, 401);
  assert.equal((await c.call('GET', '/v1/admin/leads', { token: tech })).status, 403);
  const r = await c.call('GET', '/v1/admin/leads', { token: admin });
  assert.equal(r.status, 200);
  assert.equal(r.body.items[0].id, id); assert.equal(r.body.items[0].status, 'NEW'); assert.equal(r.body.items[0].notified, false); assert.match(r.body.items[0].notify_note, /not configured/);
  assert.equal(r.body.emailAdapter.configured, false);
  const audit = await c.call('GET', '/v1/audit?aggregateType=PublicLead', { token: admin });
  const read = (await c.call('GET', '/v1/audit', { token: admin })).body.items.find((e) => e.action === 'lead.inbox_read');
  assert.ok(read, 'inbox read is audited'); assert.equal(audit.status, 200);
});
test('handling a lead records who, when and what, and is audited; a technician cannot', async () => {
  assert.equal((await c.call('PATCH', `/v1/admin/leads/${id}`, { token: tech, body: { status: 'ANSWERED' } })).status, 403);
  const r = await c.call('PATCH', `/v1/admin/leads/${id}`, { token: admin, body: { status: 'ANSWERED', notes: 'Replied by email (synthetic).' } });
  assert.equal(r.status, 200); assert.equal(r.body.status, 'ANSWERED'); assert.ok(r.body.handled_at);
  const e = (await c.call('GET', '/v1/audit?aggregateType=PublicLead', { token: admin })).body.items.find((x) => x.action === 'lead.handled' && x.aggregate_id === id);
  assert.ok(e, 'handling is audited'); assert.equal(e.outcome, 'ALLOWED');
  assert.equal((await c.call('PATCH', `/v1/admin/leads/00000000-0000-0000-0000-000000000000`, { token: admin, body: { status: 'SPAM' } })).status, 404);
});
test('a burst from one address is stopped by the per-address budget (429), without touching stored messages', async () => {
  const codes = []; for (let i = 0; i < 6; i += 1) codes.push((await c.call('POST', '/v1/public/leads', { body: lead({ message: `burst ${i}` }) })).status);
  assert.ok(codes.includes(429), codes.join(','));
  assert.ok(codes.filter((s) => s === 201).length <= 3, codes.join(','));
  const inbox = await c.call('GET', '/v1/admin/leads?status=NEW', { token: admin });
  assert.ok(inbox.body.items.every((l) => l.status === 'NEW'));
});
