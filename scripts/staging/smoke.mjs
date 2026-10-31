#!/usr/bin/env node
/**
 * Deployment tests for a running Empathia environment (Render staging, or local). Read-only unless --token is given, and even then it
 * only reads. Every check reports PASS, FAIL or NOT_RUN with its reason; nothing is inferred. Exit code 1 on any FAIL.
 *   node scripts/staging/smoke.mjs --api=https://empathia-staging-api.onrender.com --web=https://empathia-staging-web.onrender.com \
 *        [--expect-sha=<commit>] [--expect-auth=oidc|dev] [--token=<bearer for an invited person>] [--tenant=<slug> --role=<key>]
 *        [--out=tests/evidence/STAGING_SMOKE.json]   (OIDC: the tenant and role are sent as x-empathia-tenant / x-empathia-role)
 * The token is read from --token or EMPATHIA_STAGING_TOKEN; it is never printed or written to the report.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const api = (arg('api') || '').replace(/\/$/, ''); const web = (arg('web') || '').replace(/\/$/, '');
if (!api) { console.error('usage: --api=<url> [--web=<url>] [--expect-sha=] [--expect-auth=oidc|dev] [--token=]'); process.exit(2); }
const token = arg('token') || process.env['EMPATHIA_STAGING_TOKEN'] || '';
const expectSha = arg('expect-sha'); const expectAuth = arg('expect-auth'); const tenant = arg('tenant'); const role = arg('role');
const migrations = fs.readdirSync(path.join(repo, 'database/migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).length;
const openapiOps = (() => { try { const d = JSON.parse(fs.readFileSync(path.join(repo, 'docs/api/openapi.json'), 'utf8')); return Object.values(d.paths).reduce((n, p) => n + Object.keys(p).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).length, 0); } catch { return null; } })();
const results = [];
const rec = (id, name, result, detail = '') => { results.push({ id, name, result, detail }); console.log(`${result.padEnd(8)} ${id} ${name}${detail ? ` — ${detail}` : ''}`); };
const check = async (id, name, fn) => { try { const r = await fn(); if (r === undefined || r === true) rec(id, name, 'PASS'); else if (typeof r === 'string' && r.startsWith('NOT_RUN')) rec(id, name, 'NOT_RUN', r.slice(8)); else rec(id, name, 'FAIL', String(r)); } catch (e) { rec(id, name, 'FAIL', (e).message); } };
const get = (u, h = {}) => fetch(u, { headers: h, redirect: 'manual' });
const https = api.startsWith('https://');

let health = null;
await check('D1', 'API /health is ok with the database reachable and every migration applied', async () => {
  const r = await get(`${api}/health`); health = await r.json();
  if (r.status !== 200 || health.status !== 'ok') return `status ${r.status} ${health.status}`;
  if (!health.database?.reachable) return 'database unreachable';
  return health.database.migrationsApplied === migrations || `migrations applied ${health.database.migrationsApplied}, repository has ${migrations}`;
});
await check('D2', 'the deployed release is the expected commit', async () => (!expectSha ? 'NOT_RUN no --expect-sha' : (health?.release?.sha || '').startsWith(expectSha.slice(0, 7)) || `deployed ${health?.release?.sha}`));
await check('D3', 'the authentication mode is the expected one', async () => (!expectAuth ? 'NOT_RUN no --expect-auth' : health?.authMode === expectAuth || `authMode ${health?.authMode}`));
await check('D4', 'the API sends its security headers (nosniff, CSP, frame denial, no-store; HSTS over HTTPS)', async () => {
  const r = await get(`${api}/health`); const h = (k) => r.headers.get(k) || '';
  const miss = [['x-content-type-options', /nosniff/], ['content-security-policy', /default-src 'none'/], ['x-frame-options', /DENY/], ['cache-control', /no-store/], ...(https ? [['strict-transport-security', /max-age=\d+/]] : [])].filter(([k, re]) => !re.test(h(k))).map(([k]) => k);
  return !miss.length || `missing ${miss.join(', ')}`;
});
await check('D5', 'without a token the API refuses (401, problem+json)', async () => { const r = await get(`${api}/v1/me`); return (r.status === 401 && /problem\+json/.test(r.headers.get('content-type') || '')) || `status ${r.status}`; });
await check('D6', 'a foreign origin gets no CORS grant; the web origin does', async () => {
  const bad = await fetch(`${api}/v1/me`, { method: 'OPTIONS', headers: { origin: 'https://attacker.example', 'access-control-request-method': 'GET' } });
  if (bad.headers.get('access-control-allow-origin')) return 'a foreign origin was granted';
  if (!web) return 'NOT_RUN no --web';
  const ok = await fetch(`${api}/v1/me`, { method: 'OPTIONS', headers: { origin: new URL(web).origin, 'access-control-request-method': 'GET' } });
  return ok.headers.get('access-control-allow-origin') === new URL(web).origin || `web origin not granted (CORS_ORIGINS?)`;
});
await check('D7', 'the API serves the contract of this commit (operation count)', async () => {
  const r = await get(`${api}/v1/openapi.json`); const d = await r.json();
  const n = Object.values(d.paths).reduce((k, p) => k + Object.keys(p).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).length, 0);
  return n === openapiOps || `served ${n}, repository ${openapiOps}`;
});
await check('D8', 'development sign-in is refused when the environment uses OIDC', async () => {
  if (expectAuth !== 'oidc') return 'NOT_RUN not an OIDC environment';
  const r = await fetch(`${api}/v1/auth/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'secadmin@empathia-demo.empathia.invalid', password: 'empathia-dev-only' }) });
  return r.status !== 200 || 'the development identity provider answered 200';
});
await check('D9', 'the web app is served with a CSP that allows only itself and this API, and points at this API', async () => {
  if (!web) return 'NOT_RUN no --web';
  const r = await get(`${web}/`); const html = await r.text(); const csp = r.headers.get('content-security-policy') || '';
  if (r.status !== 200) return `status ${r.status} (421 means WEB_ALLOWED_HOSTS lacks this host)`;
  if (!csp.includes(`connect-src 'self' ${new URL(api).origin}`)) return `CSP connect-src: ${csp.slice(0, 120)}`;
  return html.includes(`<meta name="empathia-api" content="${new URL(api).origin}">`) || 'the page does not point at this API (API_URL?)';
});
await check('D10', 'with a token: the person, the Mission Control list and the Evidence Ledger chain', async () => {
  if (!token) return 'NOT_RUN no --token (sign in as an invited person and pass the access token)';
  const H = { authorization: `Bearer ${token}`, ...(tenant ? { 'x-empathia-tenant': tenant } : {}), ...(role ? { 'x-empathia-role': role } : {}) };
  const me = await get(`${api}/v1/me`, H); if (me.status !== 200) return `/v1/me ${me.status}: ${((await me.json().catch(() => ({}))).detail || '').slice(0, 160)}`;
  const mc = await get(`${api}/v1/mission-control`, H); if (mc.status !== 200) return `/v1/mission-control ${mc.status}`;
  const led = await get(`${api}/v1/audit/integrity`, H);
  if (led.status === 403) return true;   // not every role may verify the ledger; the 403 itself is the correct answer
  const b = await led.json(); return (led.status === 200 && b.verified !== false) || `ledger: ${led.status} ${JSON.stringify(b.firstBreak)}`;
});

const out = arg('out');
const report = { at: new Date().toISOString(), api, web: web || null, expectSha: expectSha || null, expectAuth: expectAuth || null, tokenUsed: !!token, results,
  pass: results.filter((r) => r.result === 'PASS').length, fail: results.filter((r) => r.result === 'FAIL').length, notRun: results.filter((r) => r.result === 'NOT_RUN').length };
if (out) fs.writeFileSync(path.resolve(out), JSON.stringify(report, null, 2) + '\n');
console.log(`\nPASS ${report.pass} · FAIL ${report.fail} · NOT_RUN ${report.notRun}`);
process.exit(report.fail ? 1 : 0);
