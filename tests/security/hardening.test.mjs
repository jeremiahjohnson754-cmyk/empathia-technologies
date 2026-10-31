/**
 * P5 hardening scenarios with executable evidence (KV-09, KV-17): evidence content must match its declared type (no mislabelled file
 * reaches another user under a type it is not), and every runtime database connection carries a server-side statement timeout.
 * Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setup, client } from '../integration/harness.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let h, c; const T = {};
const up = (bytes, type, name = 'f') => c.call('POST', '/v1/evidence', { token: T.cxeng, raw: Buffer.from(bytes), headers: { 'content-type': type, 'x-file-name': name } });
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

before(async () => { h = await setup({ db: 'empathia_hardening', port: 4176, env: { RATE_LIMIT_PER_MINUTE: '40' } }); c = client(h.base); T.cxeng = await c.login('cxeng'); });
after(async () => { await h?.app.stop(); });

test('HRD-1 upload content sniffing: a file whose bytes do not match its declared type is refused (415) and audited; matching files are accepted', async () => {
  const cases = [['<html><script>alert(1)</script></html>', 'image/png', /no PNG signature/], ['GIF89a....', 'image/jpeg', /no JPEG signature/], ['<html>not a pdf</html>', 'application/pdf', /no PDF header/],
    [Buffer.from([0x68, 0x69, 0x00, 0x01]), 'text/plain', /NUL bytes/], [Buffer.from([0xc3, 0x28]), 'text/csv', /UTF-8/], ['{"a":', 'application/json', /not valid JSON/]];
  for (const [bytes, type, why] of cases) { const r = await up(bytes, type); assert.equal(r.status, 415, `${type}: ${JSON.stringify(r.body)}`); assert.match(r.body.detail, why); }
  assert.equal(Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE action = 'evidence.upload' AND outcome = 'DENIED'")), cases.length, 'each refusal is audited');
  assert.equal(Number(h.asSuper('SELECT count(*) FROM app.evidence_object')), 0, 'nothing mislabelled was stored');
  for (const [bytes, type] of [[PNG, 'image/png'], [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), 'image/jpeg'], ['%PDF-1.7\n%synthetic', 'application/pdf'], ['metric,value\nx,1\n', 'text/csv'], ['{"ok":true}', 'application/json'], ['synthetic note é', 'text/plain']]) {
    const r = await up(bytes, type); assert.equal(r.status, 201, `${type}: ${JSON.stringify(r.body)}`);
  }
});

test('HRD-2 statement timeout: every runtime connection carries one (KV-09), and a statement that runs past it is cancelled by the server', async () => {
  const shown = await h.app.pool.tx({}, (q) => q.query('SHOW statement_timeout'));
  assert.equal(shown.rows[0].statement_timeout, '15s', 'the API pool');
  const w = await h.app.workerPool.tx({}, (q) => q.query('SHOW statement_timeout')); assert.equal(w.rows[0].statement_timeout, '1min', 'the worker pool');
  const { PgPool, configFromUrl } = await import(path.join(repo, 'services/enterprise-api/dist/src/db/pg.js'));
  const p = new PgPool({ ...configFromUrl(h.urls.APP_DATABASE_URL), statementTimeoutMs: 200 }, 1);
  try { await assert.rejects(p.tx({}, (q) => q.query('SELECT pg_sleep(2)')), (e) => e.code === '57014', 'query_canceled by statement_timeout'); } finally { await p.end(); }
});

test('HRD-3 rate limiting under a burst: a caller past the per-minute budget gets 429 with a problem body, and the refusal is per caller (another person is unaffected)', async () => {
  const burst = await c.login('requestor'); const other = await c.login('designer');
  const codes = await Promise.all(Array.from({ length: 60 }, () => c.call('GET', '/v1/me', { token: burst }).then((r) => r.status)));
  const ok = codes.filter((x) => x === 200).length; const limited = codes.filter((x) => x === 429).length;
  assert.ok(ok >= 1 && ok <= 40, `${ok} served within the budget`); assert.equal(ok + limited, 60, `only 200 or 429: ${[...new Set(codes)]}`); assert.ok(limited >= 20, `${limited} limited`);
  const r = await c.call('GET', '/v1/me', { token: burst }); assert.equal(r.status, 429); assert.equal(r.body.code, 'rate_limited');
  assert.equal((await c.call('GET', '/v1/me', { token: other })).status, 200, 'the budget is per caller');
});

test('HRD-4 resilience: with the database unreachable the API stays up (no crash loop) and /health answers degraded with the reason', async () => {
  const bad = 'postgres://nobody:x@127.0.0.1:1/none';
  const p = spawn(process.execPath, [path.join(repo, 'services/enterprise-api/dist/src/main.js')], { env: { PATH: process.env.PATH, NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '4172', DATABASE_URL: bad, APP_DATABASE_URL: bad, WORKER_DATABASE_URL: bad, JWT_SECRET: 'x'.repeat(48), WORKER_INTERVAL_MS: '100', LOG_LEVEL: 'error' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let exited = null; p.on('exit', (code) => { exited = code; });
  try {
    let h = null; for (let i = 0; i < 40 && !h; i++) { await new Promise((r) => setTimeout(r, 100)); try { h = await (await fetch('http://127.0.0.1:4172/health')).json(); } catch { /* starting */ } }
    assert.ok(h, 'the API answered'); assert.equal(h.status, 'degraded'); assert.equal(h.database.reachable, false);
    await new Promise((r) => setTimeout(r, 1500));   // ~15 failing worker ticks
    assert.equal(exited, null, 'the process is still running after repeated failing worker ticks');
    const again = await (await fetch('http://127.0.0.1:4172/health')).json(); assert.ok(again.worker.lastError, 'the worker’s failure is reported, not hidden');
  } finally { p.kill(); }
});

test('HRD-5 behind a trusted proxy the anonymous rate-limit key is the address the proxy appended (rightmost X-Forwarded-For); client-supplied entries to its left are never believed; without TRUSTED_PROXY the header is ignored', async () => {
  const { clientAddress } = await import(path.join(repo, 'services/enterprise-api/dist/src/http/server.js'));
  assert.equal(clientAddress('6.6.6.6, 203.0.113.9', '10.0.0.2', true), '203.0.113.9', 'a forged leftmost entry is ignored');
  assert.equal(clientAddress('203.0.113.9', '10.0.0.2', true), '203.0.113.9');
  assert.equal(clientAddress(undefined, '10.0.0.2', true), '10.0.0.2', 'no header: the socket');
  assert.equal(clientAddress('6.6.6.6', '10.0.0.2', false), '10.0.0.2', 'not behind a trusted proxy: the header is ignored');
});

test('HRD-6 database connection settings: runtime URLs derived from the owner URL and generated passwords (any characters) keep host, port, database and options; PGSSLMODE applies when a URL names no sslmode; a URL’s own sslmode wins', async () => {
  const { derivedUrl, runtimeUrls, configFromUrl } = await import(path.join(repo, 'services/enterprise-api/dist/src/db/pg.js'));
  const owner = 'postgres://empathia_owner:o%2Bw@dpg-abc-a:5432/empathia';
  const pw = 'aB+/c=d%e@f:g?h#i';   // the characters a generated base64 secret (and worse) can contain
  const c = configFromUrl(derivedUrl(owner, 'empathia_app', pw));
  assert.deepEqual([c.user, c.password, c.host, c.port, c.database], ['empathia_app', pw, 'dpg-abc-a', 5432, 'empathia']);
  const r = runtimeUrls({ DATABASE_URL: owner, EMPATHIA_APP_PASSWORD: pw, EMPATHIA_WORKER_PASSWORD: 'w' });
  assert.equal(configFromUrl(r.worker).user, 'empathia_worker');
  assert.equal(runtimeUrls({ DATABASE_URL: owner, APP_DATABASE_URL: 'postgres://x:y@h/d', EMPATHIA_APP_PASSWORD: pw }).app, 'postgres://x:y@h/d', 'an explicit URL wins');
  const before = process.env.PGSSLMODE;
  try {
    process.env.PGSSLMODE = 'require';
    assert.deepEqual(configFromUrl(owner).ssl, { rejectUnauthorized: false }, 'PGSSLMODE=require → TLS');
    assert.equal(configFromUrl(owner + '?sslmode=disable').ssl, false, 'the URL’s own sslmode wins');
    delete process.env.PGSSLMODE; assert.equal(configFromUrl(owner).ssl, false, 'no sslmode anywhere → no TLS (local development)');
  } finally { if (before === undefined) delete process.env.PGSSLMODE; else process.env.PGSSLMODE = before; }
});
