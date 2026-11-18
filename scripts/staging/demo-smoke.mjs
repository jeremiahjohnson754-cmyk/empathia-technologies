#!/usr/bin/env node
/**
 * Deployment check of a demonstration API (ADR-0013), over HTTP only — the same requests a browser makes, no database access.
 * Founder, 17 Nov 2026: "validate cross-browser persistence, and test both correct permissions and attempted unauthorized access."
 *   node scripts/staging/demo-smoke.mjs <api-base-url> [--origin=https://the-demo-site] [--json=<file>]
 * It opens two sandboxes (and resets one), so it uses three of the address's hourly openings. Everything it writes is synthetic.
 * Exit code 0 only when every check passes. A check that could not run is reported NOT RUN and fails the run: nothing is assumed.
 *
 *   SM-01  /health: the service is up in demonstration mode, on a named release, with its database reachable
 *   SM-02  sandboxes are on offer
 *   SM-03  nothing but the demonstration is served: no development sign-in, no public forms; no token and a made-up token get 401
 *   SM-04  a sandbox opens with a key, sixteen synthetic people and two installed rooms (the scenario room and the flagship lecture
 *          theatre, UNI-SCI-110); its first session is the installer's
 *   SM-05  correct permissions: the installer records a mounting and a field move; the systems engineer approves the move
 *   SM-06  attempted unauthorized access by role: the designer cannot record a mounting, the installer cannot approve their own move
 *          or start commissioning, the requestor cannot create a room, nobody lists people; each refusal is a 403 with a reason
 *   SM-07  attempted unauthorized access by identity: a wrong key, an unknown sandbox, another sandbox's key and a privileged role
 *          get no session
 *   SM-08  isolation: one sandbox's session cannot read or write the other's room, by its code's twin or by its id
 *   SM-09  persistence: a new session made from the key alone, as a different person, reads the same field record and thread
 *   SM-10  not a file store: a binary upload and an oversized note are refused
 *   SM-11  cross-origin: the demo site's origin is allowed, with PUT; any other origin is not (only with --origin)
 *   SM-12  reset: the old session and the old key stop at once; the new sandbox has nothing recorded
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const base = String(process.argv[2] || '').replace(/\/$/, '');
const origin = (process.argv.find((a) => a.startsWith('--origin=')) || '').slice(9).replace(/\/$/, '');
const jsonOut = (process.argv.find((a) => a.startsWith('--json=')) || '').slice(7);
if (!/^https?:\/\//.test(base)) { console.error('usage: demo-smoke.mjs <api-base-url> [--origin=<demo site origin>] [--json=<file>]'); process.exit(2); }

const results = []; let step = 'start';
const ok = (id, title, pass, detail = '') => { results.push({ id, title, result: pass ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 300) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${title}${detail ? ` — ${String(detail).slice(0, 300)}` : ''}`); };
const call = async (method, path, { token, body, raw, headers } = {}) => {
  const r = await fetch(base + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(origin ? { origin } : {}), ...headers }, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000) });
  const text = await r.text(); let b = null; try { b = text ? JSON.parse(text) : null; } catch { b = text; }
  return { status: r.status, body: b, headers: r.headers };
};
const open = async () => { const r = await call('POST', '/v1/demo/sandboxes', { body: {} }); if (r.status !== 201) throw new Error(`a sandbox did not open: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`); return { id: r.body.sandbox.id, key: r.body.sandbox.key, tenant: r.body.sandbox.tenant, room: r.body.scenario.room, first: r.body.session.accessToken, personas: r.body.personas }; };
const as = async (sb, role) => { const r = await call('POST', '/v1/demo/sessions', { body: { sandboxId: sb.id, key: sb.key, role } }); if (r.status !== 200) throw new Error(`no session as ${role}: ${r.status}`); return r.body.accessToken; };
const why = (r) => `${r.status} ${typeof r.body === 'object' && r.body ? r.body.detail || '' : ''}`;

try {
  step = 'SM-01'; const h = await call('GET', '/health');
  ok('SM-01', 'the service is up in demonstration mode, on a named release, with its database reachable', h.status === 200 && h.body.status === 'ok' && h.body.authMode === 'demo' && h.body.demoSessions === true && h.body.database?.reachable === true && typeof h.body.release?.sha === 'string' && h.body.release.sha.length > 0 && h.body.release.sha !== 'unknown',
    `status ${h.body?.status} · authMode ${h.body?.authMode} · release ${String(h.body?.release?.sha || 'unnamed').slice(0, 12)} (${h.body?.release?.environment || 'no environment'}) · migrations ${h.body?.database?.migrationsApplied}`);

  step = 'SM-02'; const d = await call('GET', '/v1/demo');
  ok('SM-02', 'sandboxes are on offer', d.status === 200 && d.body.enabled === true, d.body?.enabled ? `${d.body.live} of ${d.body.maxLive} live · ${d.body.ttlHours} h` : `${d.status} ${d.body?.reason || ''}`);

  step = 'SM-03'; const dev = await call('POST', '/v1/auth/token', { body: { email: 'designer@empathia-demo.empathia.invalid', password: 'not-a-real-password' } }); const leads = await call('POST', '/v1/public/leads', { body: { kind: 'contact' } });
  const none = await call('GET', '/v1/rooms'); const junk = await call('GET', '/v1/rooms', { token: `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ aud: 'empathia-demo-session', sub: crypto.randomUUID(), tid: crypto.randomUUID(), role: 'syseng', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.${crypto.randomBytes(32).toString('base64url')}` });
  ok('SM-03', 'nothing but the demonstration is served; no token and a made-up token get 401', dev.status === 404 && leads.status === 404 && none.status === 401 && junk.status === 401, `sign-in ${dev.status} · public form ${leads.status} · no token ${none.status} · made-up token ${why(junk)}`);

  step = 'SM-04'; const A = await open(); const me = await call('GET', '/v1/me', { token: A.first }); const cur = await call('GET', '/v1/demo/sandbox', { token: A.first });
  // 18 Nov 2026 (migration 0041): sixteen people, not fifteen — one for each of the fifteen roles and a second service technician, so
  // that the dispatch gates and the assignment have somebody to refuse. A deployment still on 0040 or earlier opens fifteen and fails here.
  // 17 Nov 2026 (50/10 flagship): a sandbox opens with two rooms, the scenario room and the lecture theatre UNI-SCI-110, which is reached by that identifier
  const hall = await call('GET', '/v1/rooms/UNI-SCI-110', { token: A.first });
  ok('SM-04', 'a sandbox opens with a key, sixteen synthetic people and two installed rooms, one of them the flagship lecture theatre by its canonical identifier; its first session is the installer’s', /^[A-Za-z0-9_-]{43}$/.test(A.key) && /^sbx-[0-9a-f]{16}$/.test(A.tenant) && A.personas.length === 16 && A.personas.filter((x) => x.role === 'service').length === 2 && me.body?.role === 'installer' && me.body?.tenant === A.tenant
    && cur.body?.rooms?.length === 2 && cur.body.rooms.every((r) => r.lifecycle === 'INSTALLED_UNVERIFIED') && hall.body?.room?.canonicalRef === 'UNI-SCI-110' && hall.body.room.code === cur.body.rooms[1].code, `${A.tenant} · ${A.personas.length} people · ${(cur.body?.rooms || []).map((r) => `${r.code} ${r.lifecycle}`).join(', ')} · UNI-SCI-110 is ${hall.body?.room?.code}`);

  step = 'SM-05'; const T = {}; for (const r of ['installer', 'syseng', 'designer', 'requestor', 'cxeng', 'exec']) T[r] = await as(A, r);
  const fr = `/v1/rooms/${A.room}/field-record`; const f0 = (await call('GET', fr, { token: T.installer })).body; const dev0 = f0.devices[0]; const x = Math.round((dev0.designed.x + 0.5 <= f0.room.bounds.w ? dev0.designed.x + 0.5 : dev0.designed.x - 0.5) * 100) / 100;
  const mount = await call('PUT', `${fr}/mounting/${dev0.asset}`, { token: T.installer, body: { method: 'wall-bracket', heightM: 1.4, fixing: 'bracket and four anchors (synthetic)' } });
  const move = await call('POST', `${fr}/moves`, { token: T.installer, body: { device: dev0.asset, x, y: dev0.designed.y, reason: 'sprinkler head', note: 'deployment check (synthetic)' } });
  const own = await call('POST', `${fr}/moves/${move.body?.move}/decide`, { token: T.installer, body: { approve: true } });
  const approve = await call('POST', `${fr}/moves/${move.body?.move}/decide`, { token: T.syseng, body: { approve: true, decision: 'deployment check (synthetic)' } });
  ok('SM-05', 'correct permissions: the installer records a mounting and a field move; the systems engineer approves the move', mount.status === 200 && mount.body.version === 1 && move.status === 201 && approve.status === 200 && approve.body.state === 'APPROVED', `mounting ${mount.status} · move ${move.status} ${move.body?.move || ''} · approval ${why(approve)}`);

  step = 'SM-06'; const d1 = await call('PUT', `${fr}/mounting/${dev0.asset}`, { token: T.designer, body: { method: 'floor' } }); const d2 = await call('POST', `/v1/rooms/${A.room}/lifecycle`, { token: T.installer, body: { to: 'COMMISSIONING' } });
  const d3 = await call('POST', '/v1/rooms', { token: T.requestor, body: { name: 'Mine (synthetic)', template: 'huddle' } }); const d4 = await call('GET', '/v1/people', { token: T.cxeng });
  const gate = await call('POST', `/v1/rooms/${A.room}/lifecycle`, { token: T.syseng, body: { to: 'COMMISSIONING' } });
  ok('SM-06', 'attempted unauthorized access by role is refused with a reason: the designer, the installer on their own move and on commissioning, the requestor, the commissioning engineer on people; and the register gate holds for the systems engineer',
    [d1, own, d2, d3, d4].every((r) => r.status === 403 && typeof r.body?.detail === 'string' && r.body.detail.length > 10) && gate.status === 422 && /device register is not complete/.test(JSON.stringify(gate.body)), `${why(d1)} | own move ${own.status} | ${why(d2)} | ${d3.status} | ${d4.status} | gate ${gate.status}`);

  step = 'SM-07'; const B = await open(); const post = (body) => call('POST', '/v1/demo/sessions', { body });
  const w1 = await post({ sandboxId: A.id, key: crypto.randomBytes(32).toString('base64url'), role: 'installer' }); const w2 = await post({ sandboxId: crypto.randomUUID(), key: A.key, role: 'installer' }); const w3 = await post({ sandboxId: A.id, key: B.key, role: 'installer' });
  const priv = []; for (const role of ['architect', 'founder', 'secadmin']) priv.push((await post({ sandboxId: A.id, key: A.key, role })).status);
  ok('SM-07', 'a wrong key, an unknown sandbox, another sandbox’s key and a privileged role get no session', w1.status === 401 && w2.status === 401 && w3.status === 401 && priv.every((s) => s === 400), `wrong key ${w1.status} · unknown ${w2.status} · B’s key ${w3.status} · architect/founder/secadmin ${priv.join('/')}`);

  step = 'SM-08'; const bTok = await as(B, 'syseng'); const bInst = await as(B, 'installer'); const idOf = async (tok, code) => (await call('GET', `/v1/rooms/${code}`, { token: tok })).body?.room?.id; const aId = await idOf(T.syseng, A.room); const bId = await idOf(bTok, B.room);
  const bField = (await call('GET', `/v1/rooms/${B.room}/field-record`, { token: bTok })).body; const r1 = await call('GET', `/v1/rooms/${aId}/thread`, { token: bTok }); const r2 = await call('GET', `/v1/rooms/${bId}/thread`, { token: T.syseng });
  const r3 = await call('PUT', `/v1/rooms/${aId}/field-record/mounting/${dev0.asset}`, { token: bInst, body: { method: 'floor' } }); const aAfter = (await call('GET', fr, { token: T.installer })).body;
  ok('SM-08', 'one sandbox’s session cannot read or write the other’s room', !!aId && !!bId && aId !== bId && bField.stats.mounted === 0 && bField.moves.length === 0 && r1.status === 404 && r2.status === 404 && r3.status === 404 && aAfter.devices[0].mounting.version === 1,
    `same code, two rooms: ${A.room === B.room} · B sees its own (mounted ${bField.stats.mounted}) · B→A read ${r1.status} · A→B read ${r2.status} · B→A write ${r3.status}`);

  step = 'SM-09'; const later = await as(A, 'exec'); const t1 = (await call('GET', `/v1/rooms/${A.room}/thread`, { token: T.syseng })).body; const t2 = (await call('GET', `/v1/rooms/${A.room}/thread`, { token: later })).body; const f2 = (await call('GET', fr, { token: later })).body;
  const fld = t2.stages.find((s) => s.key === 'lite').records.fieldRecord;
  ok('SM-09', 'a new session made from the key alone, as a different person, reads the same field record and thread', JSON.stringify(t1.stages) === JSON.stringify(t2.stages) && fld.mounted === 1 && fld.moves.approved === 1 && f2.devices[0].asBuilt.moved === move.body.move && t2.audit.latest.some((e) => e.outcome === 'DENIED'),
    `mounted ${fld.mounted} · approved moves ${fld.moves.approved} · as built ${f2.devices[0].asBuilt.moved} · refusals on the record ${t2.audit.latest.filter((e) => e.outcome === 'DENIED').length}`);

  step = 'SM-10'; const up = (rawBody, type) => call('POST', '/v1/evidence', { token: T.cxeng, raw: rawBody, headers: { 'content-type': type, 'x-file-name': 'check.txt' } });
  const u1 = await up(Buffer.alloc(512, 1), 'application/octet-stream'); const u2 = await up(Buffer.alloc(20 * 1024, 0x61), 'text/plain'); const u3 = await up(Buffer.from('synthetic deployment check note'), 'text/plain');
  ok('SM-10', 'a binary upload and an oversized note are refused; a short text note is kept', u1.status === 415 && u2.status === 413 && u3.status === 201, `binary ${u1.status} · 20 KiB ${u2.status} · note ${u3.status}`);

  step = 'SM-11';
  if (origin) {
    const pre = (o) => fetch(`${base}/v1/rooms/${A.room}/field-record/mounting/${dev0.asset}`, { method: 'OPTIONS', headers: { origin: o, 'access-control-request-method': 'PUT', 'access-control-request-headers': 'authorization, content-type' }, signal: AbortSignal.timeout(60000) });
    const good = await pre(origin); const bad = await pre('https://not-the-demo.example.invalid');
    ok('SM-11', 'the demo site’s origin is allowed, with PUT; any other origin is not', good.headers.get('access-control-allow-origin') === origin && /PUT/.test(good.headers.get('access-control-allow-methods') || '') && !bad.headers.get('access-control-allow-origin'),
      `${origin}: ${good.headers.get('access-control-allow-origin')} [${good.headers.get('access-control-allow-methods')}] · other origin: ${bad.headers.get('access-control-allow-origin') || 'not allowed'}`);
  } else ok('SM-11', 'cross-origin (NOT RUN: pass --origin=<the demo site>)', false, 'not run');

  step = 'SM-12'; const rs = await call('POST', '/v1/demo/sandboxes/reset', { body: { sandboxId: A.id, key: A.key } }); const dead = await call('GET', '/v1/me', { token: T.syseng }); const deadKey = await post({ sandboxId: A.id, key: A.key, role: 'syseng' });
  const N = rs.status === 201 ? { id: rs.body.sandbox.id, key: rs.body.sandbox.key, room: rs.body.scenario.room } : null; const fresh = N ? (await call('GET', `/v1/rooms/${N.room}/field-record`, { token: await as(N, 'syseng') })).body : null;
  ok('SM-12', 'reset: the old session and the old key stop at once; the new sandbox has nothing recorded', rs.status === 201 && dead.status === 401 && deadKey.status === 401 && fresh?.stats.mounted === 0 && fresh.moves.length === 0 && rs.body.sandbox.id !== A.id, `reset ${rs.status} · old session ${dead.status} · old key ${deadKey.status} · new sandbox mounted ${fresh?.stats.mounted}`);
} catch (e) { ok(step, 'the check could not be completed', false, (e && e.message) || String(e)); }

const want = ['SM-01', 'SM-02', 'SM-03', 'SM-04', 'SM-05', 'SM-06', 'SM-07', 'SM-08', 'SM-09', 'SM-10', 'SM-11', 'SM-12'];
for (const id of want) if (!results.some((r) => r.id === id)) ok(id, 'NOT RUN', false, 'an earlier check stopped the run');
const pass = results.filter((r) => r.result === 'PASS').length; const fail = results.length - pass;
console.log(`demo-smoke ${base}: ${pass} passed, ${fail} failed`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ base, origin: origin || null, at: new Date().toISOString(), passed: pass, failed: fail, results }, null, 1));
process.exit(fail ? 1 : 0);
