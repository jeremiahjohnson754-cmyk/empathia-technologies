// The demo's connection to the enterprise API (apps/demo/src/connected; ADR-0013). The client and the journey without a server:
// a scripted fetch and an in-memory storage. The behaviour against a real API is tests/browser/demo-connected.test.mjs.
//   CC-01  a resume code is a sandbox id, a dot and a 43-character key; anything else is not one
//   CC-02  a build that names no server offers no connection and makes no request
//   CC-03  opening a sandbox keeps its id and key in storage and its session token in memory only; a token is reused until
//          shortly before it runs out, then a new session is asked for with the key
//   CC-04  a refusal is returned with the server's words, never thrown; a 401 is retried once on a new session; a second 401
//          means the sandbox is gone: it is forgotten and SandboxGone is thrown
//   CC-05  resuming: a malformed code makes no request; a good one asks for a session, reads the sandbox's room and stores it
//   CC-06  the journey: nineteen steps in order, each with a person the page can name; the next step is the first whose record
//          is not on the server; a state with every record has none
//   node --test tests/unit/connected-client.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'connected-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as C from './connected/client.ts'; export * as J from './connected/journey.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_API_URL': '""' } });
const { C, J } = await import(pathToFileURL(out).href);

const ID = '3f2a1c9e-7b4d-4e6a-9c1f-0a2b3c4d5e6f'; const KEY = 'A'.repeat(43); const BASE = 'https://api.example.invalid';
const res = (status, body) => ({ status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
/** a scripted server: `script` maps "METHOD path" to a function of the request; every request is recorded */
function world(script) {
  const mem = new Map(); const calls = []; let now = 1_000_000;
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const fetch = async (url, init = {}) => { const key = `${init.method || 'GET'} ${url.slice(BASE.length)}`; calls.push({ key, headers: init.headers || {}, body: init.body }); const f = script[key]; if (!f) throw new Error(`unscripted ${key}`); return f({ headers: init.headers || {}, body: init.body ? (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : undefined }); };
  return { c: new C.Connected({ base: BASE, fetch, storage, now: () => now }), mem, calls, tick: (ms) => { now += ms; }, storage };
}
const opened = (n = 1) => res(201, { sandbox: { id: ID, key: KEY, tenant: 'sbx-0123456789abcdef', expiresAt: '2026-11-20T00:00:00Z' }, scenario: { room: 'R-ATL-0001' }, session: { accessToken: `tok-installer-${n}`, expiresIn: 1800, role: 'installer' }, personas: [] });

test('CC-01 a resume code is a sandbox id, a dot and a 43-character key', () => {
  assert.deepEqual(C.parseCode(`${ID}.${KEY}`), { id: ID, key: KEY }); assert.deepEqual(C.parseCode(`  ${ID.toUpperCase()}.${KEY} `), { id: ID, key: KEY });
  for (const bad of ['', 'not-a-code', ID, `${ID}.short`, `${ID}.${KEY}x`, `${ID} ${KEY}`, `${KEY}.${ID}`, `${ID}.${KEY}.${KEY}`, null, undefined]) assert.equal(C.parseCode(bad), null, String(bad));
});

test('CC-02 a build that names no server offers no connection and makes no request', async () => {
  assert.equal(C.API_URL, ''); let asked = 0;
  const c = new C.Connected({ base: '', fetch: async () => { asked += 1; throw new Error('no'); }, storage: null });
  const a = await c.availability(); assert.deepEqual([a.configured, a.enabled, c.configured, asked], [false, false, false, 0]); assert.match(a.reason, /not connected to a server/);
  const w = world({ 'GET /v1/demo': () => { throw new Error('ECONNREFUSED'); } }); const b = await w.c.availability(); assert.deepEqual([b.configured, b.reachable, b.enabled], [true, false, false]); assert.match(b.reason, /did not answer/);
  const off = world({ 'GET /v1/demo': () => res(200, { enabled: false, reason: 'demonstration sandboxes are not enabled for this database' }) }); assert.deepEqual([(await off.c.availability()).enabled, (await off.c.availability()).reachable], [false, true]);
});

test('CC-03 the id and key are stored, the token is not; a token is reused, then renewed with the key', async () => {
  let sessions = 0;
  const w = world({ 'POST /v1/demo/sandboxes': () => opened(), 'GET /v1/me': ({ headers }) => res(200, { token: headers.authorization }),
    'POST /v1/demo/sessions': ({ body }) => { sessions += 1; assert.deepEqual([body.sandboxId, body.key], [ID, KEY]); return res(200, { accessToken: `tok-${body.role}-${sessions}`, expiresIn: 1800, role: body.role }); } });
  const a = await w.c.open(); assert.equal(a.ok, true); assert.deepEqual(a.body, { id: ID, key: KEY, tenant: 'sbx-0123456789abcdef', expiresAt: '2026-11-20T00:00:00Z', room: 'R-ATL-0001' });
  assert.deepEqual([...w.mem.keys()], [C.STORE_KEY]); assert.deepEqual(Object.keys(JSON.parse(w.mem.get(C.STORE_KEY))).sort(), ['expiresAt', 'id', 'key', 'room', 'tenant']);
  assert.ok(![...w.mem.values()].some((v) => /tok-/.test(v)), 'no session token is stored'); assert.equal(w.c.code(), `${ID}.${KEY}`);
  assert.equal((await w.c.call('installer', 'GET', '/v1/me')).body.token, 'Bearer tok-installer-1'); assert.equal(sessions, 0, 'the session that came with the sandbox is used');
  assert.equal((await w.c.call('syseng', 'GET', '/v1/me')).body.token, 'Bearer tok-syseng-1'); assert.equal((await w.c.call('syseng', 'GET', '/v1/me')).body.token, 'Bearer tok-syseng-1'); assert.equal(sessions, 1, 'one session per person, reused');
  w.tick(1771 * 1000); assert.equal((await w.c.call('syseng', 'GET', '/v1/me')).body.token, 'Bearer tok-syseng-2', 'renewed thirty seconds before it runs out'); assert.equal(sessions, 2);
  // a note is sent as text with its file name; JSON is sent as JSON; nothing carries cookies
  const up = world({ 'POST /v1/demo/sandboxes': () => opened(), 'POST /v1/evidence': ({ headers, body }) => res(201, { headers, body }) }); await up.c.open();
  const n = await up.c.call('installer', 'POST', '/v1/evidence', undefined, { text: 'synthetic observation', fileName: 'note.txt' }); assert.deepEqual([n.body.headers['content-type'], n.body.headers['x-file-name'], n.body.body], ['text/plain', 'note.txt', 'synthetic observation']);
  // what is stored is validated on the way back in: a damaged entry is not a sandbox
  w.mem.set(C.STORE_KEY, '{"id":"x","key":"y"}'); assert.equal(w.c.sandbox(), null); w.mem.set(C.STORE_KEY, 'not json'); assert.equal(w.c.sandbox(), null);
});

test('CC-04 a refusal is returned in the server’s words; a 401 is retried once; a second 401 means the sandbox is gone', async () => {
  const problem = { type: 'https://errors.empathia.invalid/forbidden', status: 403, detail: 'designer may not record a field move (needs work.evidence or field.scan)', reasons: ['a', 'b'] };
  let me = 0; let sessions = 0;
  const w = world({ 'POST /v1/demo/sandboxes': () => opened(), 'POST /v1/rooms/R/field-record/moves': () => res(403, problem),
    'GET /v1/me': () => { me += 1; return me === 1 ? res(401, { detail: 'token expired' }) : res(200, { ok: true }); },
    'POST /v1/demo/sessions': () => { sessions += 1; return res(200, { accessToken: `tok-${sessions}`, expiresIn: 1800, role: 'installer' }); } });
  await w.c.open();
  const no = await w.c.call('installer', 'POST', '/v1/rooms/R/field-record/moves', { device: 'PA-0001' }); assert.deepEqual([no.ok, no.status, no.detail, no.reasons], [false, 403, problem.detail, ['a', 'b']]);
  const again = await w.c.call('installer', 'GET', '/v1/me'); assert.deepEqual([again.ok, me, sessions], [true, 2, 1], 'one 401, one new session, one retry');
  const dead = world({ 'POST /v1/demo/sandboxes': () => opened(), 'GET /v1/me': () => res(401, { detail: 'the sandbox behind this demonstration session is closed or has expired: open a new one' }),
    'POST /v1/demo/sessions': () => res(401, { detail: 'the sandbox is unknown, closed or expired, or the key is not right' }) });
  await dead.c.open(); await assert.rejects(dead.c.call('installer', 'GET', '/v1/me'), (e) => e instanceof C.SandboxGone && /unknown, closed or expired/.test(e.message)); assert.equal(dead.c.sandbox(), null, 'forgotten in this browser');
  await assert.rejects(dead.c.call('installer', 'GET', '/v1/me'), C.SandboxGone);
  const r = world({ 'POST /v1/demo/sandboxes': () => opened(), 'POST /v1/demo/sandboxes/reset': () => res(401, { detail: 'the sandbox is unknown, closed or expired, or the key is not right' }) }); await r.c.open();
  await assert.rejects(r.c.reset(), C.SandboxGone); assert.equal(r.c.sandbox(), null);
  const capped = world({ 'POST /v1/demo/sandboxes': () => opened(), 'POST /v1/demo/sandboxes/reset': () => res(429, { detail: 'this address has opened its share of sandboxes for the hour' }) }); await capped.c.open();
  const c2 = await capped.c.reset(); assert.deepEqual([c2.ok, c2.status], [false, 429]); assert.ok(capped.c.sandbox(), 'a refused reset keeps the sandbox');
  capped.c.forget(); assert.equal(capped.c.sandbox(), null); assert.equal(capped.c.code(), '');
});

test('CC-05 resuming from a code', async () => {
  const w = world({ 'POST /v1/demo/sessions': ({ body }) => (body.key === KEY ? res(200, { accessToken: 'tok-r', expiresIn: 1800, role: 'installer', sandbox: { id: ID, tenant: 'sbx-0123456789abcdef', expiresAt: '2026-11-20T00:00:00Z' } }) : res(401, { detail: 'the sandbox is unknown, closed or expired, or the key is not right' })),
    'GET /v1/demo/sandbox': ({ headers }) => { assert.equal(headers.authorization, 'Bearer tok-r'); return res(200, { rooms: [{ code: 'R-ATL-0001', lifecycle: 'ACCEPTED' }], personas: [] }); } });
  const bad = await w.c.resume('nonsense'); assert.equal(bad.ok, false); assert.match(bad.detail, /not a resume code/); assert.equal(w.calls.length, 0, 'a malformed code is not sent anywhere');
  const wrong = await w.c.resume(`${ID}.${'B'.repeat(43)}`); assert.deepEqual([wrong.ok, wrong.status], [false, 401]); assert.equal(w.c.sandbox(), null);
  const ok = await w.c.resume(`${ID}.${KEY}`); assert.equal(ok.ok, true); assert.deepEqual(w.c.sandbox(), { id: ID, key: KEY, tenant: 'sbx-0123456789abcdef', expiresAt: '2026-11-20T00:00:00Z', room: 'R-ATL-0001' });
});

test('CC-06 the journey: nineteen steps in order, each with a person; the next step is the first whose record is not on the server', () => {
  assert.equal(J.STEPS.length, 19); assert.equal(new Set(J.STEPS.map((s) => s.id)).size, 19); for (const s of J.STEPS) { assert.ok(J.ROLE_LABEL[s.role], `${s.id}: ${s.role}`); assert.ok(s.title && s.what.length > 30); }
  assert.deepEqual(J.STEPS.map((s) => s.id), ['mount', 'move', 'approve-move', 'register', 'commission', 'fail', 'handoff', 'work', 'verify-work', 'close-work', 'def-start', 'def-fixed', 'retest', 'def-verify', 'pass-all', 'verify-all', 'lend-acceptance', 'accept', 'apex']);
  const st = (o = {}) => ({ acceptanceLent: false, people: [], register: [], rows: [{ test_id: 't1', label: 'T1', applicable: true, evidence: ['photo'], result: 'NOT_TESTED' }],
    field: { writable: true, devices: [{ asset: 'PA-0001', designed: { x: 1, y: 1 }, asBuilt: { x: 1, y: 1, moved: null }, mounting: null, hookups: [] }], moves: [], hookups: [], markups: [], room: { bounds: { w: 4, l: 5 } }, stats: {} },
    thread: { room: { code: 'R', name: 'Room', lifecycle: 'INSTALLED_UNVERIFIED', revision: 1 }, links: [], missing: [], complete: false, audit: { latest: [], byAggregate: [], aggregates: 1 }, stages: [
      { key: 'lite', records: { positions: 1, fieldRecord: { devices: 1, mounted: 0, hookups: 0, notInDesign: 0, moves: { proposed: 0, approved: 0, rejected: 0 }, notes: { open: 0, total: 0 } } } },
      { key: 'engineering', records: { revisions: [], register: { devices: 1, complete: 0 } } }, { key: 'commissioning', records: { issues: [] } }, { key: 'service', records: { workOrders: [] } }, { key: 'assurance', records: { baselines: [], current: null } }, { key: 'apex', records: { cases: [] } }] }, ...o });
  const s0 = st(); assert.equal(J.nextStep(s0).id, 'mount'); assert.deepEqual(J.progress(s0), { done: 0, total: 19 });
  const s1 = st(); s1.thread.stages[0].records.fieldRecord.mounted = 1; assert.equal(J.nextStep(s1).id, 'move');
  // an order the server could be in after a partial visit: the register filled before the field record was touched
  const s2 = st(); s2.thread.stages[1].records.register.complete = 1; assert.equal(J.nextStep(s2).id, 'mount'); assert.equal(J.STEPS.find((x) => x.id === 'register').done(s2), true);
  assert.match(J.STEPS.find((x) => x.id === 'commission').ready(st({ thread: { ...st().thread, room: { ...st().thread.room, lifecycle: 'COMMISSIONING' } } })), /COMMISSIONING/);
  assert.match(J.STEPS.find((x) => x.id === 'accept').ready({ ...st(), rows: [{ test_id: 't1', applicable: true, evidence: [], result: 'PASS_VERIFIED' }] }), /has not been lent/);
  const all = st({ acceptanceLent: true, rows: [{ test_id: 't1', label: 'T1', applicable: true, evidence: ['photo'], result: 'PASS_VERIFIED' }] });
  all.thread.room.lifecycle = 'ACCEPTED'; all.thread.stages[0].records.fieldRecord = { devices: 1, mounted: 1, hookups: 0, notInDesign: 0, moves: { proposed: 0, approved: 1, rejected: 0 }, notes: { open: 0, total: 0 } };
  all.thread.stages[1].records.register.complete = 1; all.thread.stages[2].records.issues = [{ code: 'ISS-1', state: 'RESOLVED', workflow: 'CLOSED', retest: { result: 'PASS', evidence: 'E' }, fixedBy: 'x', workOrders: ['WO-1'], cases: ['APX-1'] }];
  all.thread.stages[3].records.workOrders = [{ code: 'WO-1', issue: 'ISS-1', state: 'CLOSED', assigned: true, evidence: 1, verification: { outcome: 'pass' } }]; all.thread.stages[4].records = { baselines: [{ version: 1 }], current: 1 }; all.thread.stages[5].records.cases = [{ code: 'APX-1' }];
  assert.equal(J.nextStep(all), null); assert.deepEqual(J.progress(all), { done: 19, total: 19 });
});
