#!/usr/bin/env node
/**
 * The demonstration API as the internet sees it (founder, 17 Nov 2026: "verify the API through its external address, with correct
 * TLS, CORS, authentication, and failure handling"). demo-smoke.mjs checks what the API grants and refuses; this checks the edge
 * around it. HTTP and curl only; it opens no sandbox and writes nothing.
 *   NODE_USE_ENV_PROXY=1 node scripts/staging/demo-edge.mjs <api-base-url> --origin=<demo site origin> [--json=<file>]
 *   EG-01  TLS: the certificate names this host, is issued by a public authority, is in date with at least 14 days left; TLS 1.2 or later
 *   EG-02  plain http is not served: it is redirected to https
 *   EG-03  every answer carries the transport and framing headers: HSTS, nosniff, no framing, a correlation id
 *   EG-04  CORS on a real request: the demo site's origin is named exactly (never *), without credentials; another origin is not named
 *   EG-05  authentication: no token, a made-up token, a token of the right shape with a wrong signature, and an expired-looking one get 401, each with a reason and no detail of the server
 *   EG-06  failure handling: a body that is not JSON, an unknown path and a wrong method are answered in JSON with a status, a reason and a correlation id; nothing in them names a file, a stack or the database
 *   EG-07  (information) how long /health took: a free instance that was asleep takes about a minute
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const base = String(process.argv[2] || '').replace(/\/$/, '');
const origin = (process.argv.find((a) => a.startsWith('--origin=')) || '').slice(9).replace(/\/$/, '');
const jsonOut = (process.argv.find((a) => a.startsWith('--json=')) || '').slice(7);
if (!/^https:\/\//.test(base) || !origin) { console.error('usage: demo-edge.mjs <https api-base-url> --origin=<demo site origin> [--json=<file>]'); process.exit(2); }
const host = new URL(base).host;
// pass: true, false, or null for a check this machine cannot make (reported NOT_RUN with the reason: never as a pass)
const results = []; const ok = (id, title, pass, detail = '') => { const result = pass === null ? 'NOT_RUN' : pass ? 'PASS' : 'FAIL'; results.push({ id, title, result, detail: String(detail).slice(0, 400) }); console.log(`${result} ${id} ${title}${detail ? ` — ${String(detail).slice(0, 300)}` : ''}`); };
const call = async (method, path, { headers = {}, body } = {}) => { const r = await fetch(base + path, { method, headers, body, redirect: 'manual' }); const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ } return { status: r.status, h: r.headers, text, json }; };
const leak = (s) => /\/app\/|node_modules|\.ts:\d|\.js:\d|\bat [A-Za-z.]+ \(|postgres|pg_|SELECT |stack/i.test(s);

try {
  const t0 = Date.now(); const v = spawnSync('curl', ['-sS', '-m', '120', '-v', '-o', '/dev/null', `${base}/health`], { encoding: 'utf8' }); const took = Date.now() - t0; const log = v.stderr || '';
  const subject = (log.match(/subject: (.*)/) || [])[1] || ''; const issuer = (log.match(/issuer: (.*)/) || [])[1] || ''; const expire = (log.match(/expire date: (.*)/) || [])[1] || ''; const tls = (log.match(/SSL connection using (TLSv[\d.]+)/) || [])[1] || '';
  const names = (log.match(/subjectAltName: host "[^"]+" matched cert's "([^"]+)"/) || [])[1] || ''; const days = expire ? Math.floor((Date.parse(expire) - Date.now()) / 86400000) : -1;
  ok('EG-01', 'TLS: the certificate names this host, comes from a public authority, is in date with at least 14 days left; TLS 1.2 or later',
    v.status === 0 && !!names && !!issuer && !/agent|proxy|anthropic/i.test(issuer) && days >= 14 && /TLSv1\.[23]/.test(tls) && /SSL certificate verify ok/.test(log), `${tls} · ${subject} · matched "${names}" · issuer ${issuer} · ${days} days left`);

  const plain = spawnSync('curl', ['-sS', '-m', '60', '-o', '/dev/null', '-w', '%{http_code} %{redirect_url}', `http://${host}/health`], { encoding: 'utf8' }); const [code, to] = (plain.stdout || '').split(' ');
  // curl exit 5, 6, 7: no route for plain http from this machine (a workstation whose only way out is an HTTPS proxy). That is not an answer from the service.
  ok('EG-02', 'plain http is not served: it is redirected to https', [5, 6, 7].includes(plain.status) ? null : /^30[1278]$/.test(code || '') && /^https:\/\//.test(to || ''), [5, 6, 7].includes(plain.status) ? `this machine has no route for plain http (${(plain.stderr || '').trim().slice(0, 80)}); HSTS is checked in EG-03` : `${code} → ${to}`);

  const h = await call('GET', '/health'); const hd = (k) => h.h.get(k) || '';
  ok('EG-03', 'answers carry HSTS, nosniff, no framing, and a correlation id', h.status === 200 && /max-age=\d{7,}/.test(hd('strict-transport-security')) && hd('x-content-type-options') === 'nosniff' && (/DENY/i.test(hd('x-frame-options')) || /frame-ancestors 'none'/.test(hd('content-security-policy'))) && /^[0-9a-f-]{36}$/.test(hd('x-correlation-id')),
    `hsts ${hd('strict-transport-security')} · ${hd('x-content-type-options')} · ${hd('x-frame-options')} · csp ${hd('content-security-policy')}`);

  const mine = await call('GET', '/v1/demo', { headers: { origin } }); const other = await call('GET', '/v1/demo', { headers: { origin: 'https://example.invalid' } });
  ok('EG-04', 'CORS on a real request: the demo site’s origin is named exactly, without credentials; another origin is not named', mine.status === 200 && mine.h.get('access-control-allow-origin') === origin && mine.h.get('access-control-allow-credentials') !== 'true' && /origin/i.test(mine.h.get('vary') || '') && !other.h.get('access-control-allow-origin'),
    `site: ${mine.h.get('access-control-allow-origin')} · credentials ${mine.h.get('access-control-allow-credentials')} · vary ${mine.h.get('vary')} · other: ${other.h.get('access-control-allow-origin') || 'not named'}`);

  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const shaped = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iss: 'empathia-demo-sessions', aud: 'empathia-demo-session', sub: '00000000-0000-4000-8000-000000000000', exp: Math.floor(Date.now() / 1000) + 600 })}.${Buffer.alloc(32, 7).toString('base64url')}`;
  const old = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iss: 'empathia-demo-sessions', aud: 'empathia-demo-session', sub: '00000000-0000-4000-8000-000000000000', exp: 1 })}.${Buffer.alloc(32, 9).toString('base64url')}`;
  const tries = [['no token', {}], ['made-up', { authorization: 'Bearer not-a-token' }], ['wrong signature', { authorization: `Bearer ${shaped}` }], ['expired-looking', { authorization: `Bearer ${old}` }], ['not Bearer', { authorization: 'Basic dXNlcjpwYXNz' }]];
  const au = []; for (const [name, headers] of tries) { const r = await call('GET', '/v1/demo/sandbox', { headers }); au.push({ name, status: r.status, detail: String(r.json?.detail || ''), leak: leak(r.text) }); }
  ok('EG-05', 'authentication: no token, a made-up token, a wrong signature, an expired-looking token and another scheme get 401 with a reason and nothing about the server', au.every((x) => x.status === 401 && x.detail && !x.leak), au.map((x) => `${x.name} ${x.status} ${x.detail.slice(0, 40)}`).join(' · '));

  const bad = await call('POST', '/v1/demo/sessions', { headers: { 'content-type': 'application/json' }, body: '{not json' }); const none = await call('GET', '/v1/nothing-here'); const wrong = await call('DELETE', '/v1/demo');
  const shape = (r) => r.json && typeof r.json === 'object' && r.json.detail && /^[0-9a-f-]{36}$/.test(r.h.get('x-correlation-id') || '') && /json/.test(r.h.get('content-type') || '') && !leak(r.text);
  ok('EG-06', 'failure handling: a body that is not JSON, an unknown path and a wrong method are answered in JSON with a status, a reason and a correlation id, and name nothing of the server', [400, 422].includes(bad.status) && none.status === 404 && [404, 405].includes(wrong.status) && [bad, none, wrong].every(shape),
    `not JSON ${bad.status} ${String(bad.json?.detail).slice(0, 50)} · unknown ${none.status} ${String(none.json?.detail).slice(0, 40)} · wrong method ${wrong.status}`);

  ok('EG-07', '(information) /health answered', v.status === 0, `${(took / 1000).toFixed(1)} s for the first request of this run`);
} catch (e) { ok('EG-XX', 'the check could not be completed', false, (e && e.message) || String(e)); }

const pass = results.filter((r) => r.result === 'PASS').length; const fail = results.filter((r) => r.result === 'FAIL').length; const notRun = results.length - pass - fail;
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ at: new Date().toISOString(), base, origin, passed: pass, failed: fail, notRun, results }, null, 1) + '\n');
console.log(`demo-edge ${base}: ${pass} passed, ${fail} failed, ${notRun} not run`); process.exit(fail ? 1 : 0);
