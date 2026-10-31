/**
 * P5 hardening scenarios with executable evidence (KV-09, KV-17): evidence content must match its declared type (no mislabelled file
 * reaches another user under a type it is not), and every runtime database connection carries a server-side statement timeout.
 * Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
