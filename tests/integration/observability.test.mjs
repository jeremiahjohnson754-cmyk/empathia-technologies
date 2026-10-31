/**
 * Observability through the real API: errors and request transactions leave the process as Sentry-format envelopes with the
 * correlation id, the route template, the role and the release — and nothing from the request (no body, no token, no e-mail).
 * The file transport is used so the proof is local and offline; the Sentry transport shares the same envelope code (unit-tested).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setup, client, repo } from './harness.mjs';

const file = path.join(repo, '.local/telemetry-test.ndjson');
let h, api, token;
before(async () => {
  fs.rmSync(file, { force: true });
  h = await setup({ db: 'empathia_obs', port: 4191, env: { TELEMETRY: 'file', TELEMETRY_FILE: file, TELEMETRY_TRACES_SAMPLE_RATE: '1' } });
  api = client(h.base); token = await api.login('syseng');
  // a throwing route, registered only on this in-process instance: the product has no such endpoint
  h.app.router.add({ method: 'GET', path: '/v1/__test/boom', tag: 'test', summary: 'throws', auth: true, responses: { 200: { description: 'never' } }, handler: async () => { throw new TypeError('synthetic failure for owner@empathia.invalid'); } });
});
after(async () => { await h?.app.stop(); });

const events = async () => { await h.app.telemetry.flush(); const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean); const out = []; for (let i = 0; i + 2 < lines.length + 1; i += 3) out.push({ header: JSON.parse(lines[i]), item: JSON.parse(lines[i + 1]), event: JSON.parse(lines[i + 2]) }); return out; };

test('OBS-1 /health reports the telemetry transport and the release (name@version+sha) without any key', async () => {
  const r = await api.call('GET', '/health');
  assert.equal(r.status, 200); assert.equal(r.body.telemetry.transport, 'file'); assert.match(r.body.telemetry.release, /^empathia-enterprise-api@0\.1\.0\+([0-9a-f]{12}|unknown)$/); assert.equal(r.body.telemetry.environment, 'test');
  assert.equal(JSON.stringify(r.body).includes('dsn'), false); assert.equal(r.body.liveHealth, 'NOT_MONITORED');
});

test('OBS-2 an internal error produces one exception event whose correlation id is the one in the problem document; the stack is frames only, the message is scrubbed, no body or token travels with it', async () => {
  const r = await api.call('GET', '/v1/__test/boom', { token, headers: { 'x-correlation-id': 'obs-corr-00000001' } });
  assert.equal(r.status, 500); assert.equal(r.body.correlationId, 'obs-corr-00000001'); assert.equal(r.headers['x-correlation-id'], 'obs-corr-00000001');
  const ev = (await events()).map((x) => x.event).find((e) => e.exception);
  assert.ok(ev, 'an exception event was written');
  assert.equal(ev.tags.correlation_id, 'obs-corr-00000001'); assert.equal(ev.tags.route, '/v1/__test/boom'); assert.equal(ev.tags.role, 'syseng'); assert.equal(ev.tags.status, '500'); assert.ok(ev.tags.tenant_id);
  assert.equal(ev.exception.values[0].type, 'TypeError'); assert.equal(ev.exception.values[0].value, 'synthetic failure for [email]');
  assert.ok(ev.exception.values[0].stacktrace.frames.length > 0); assert.equal(ev.logger, 'enterprise-api'); assert.match(ev.release, /^empathia-enterprise-api@/);
  const raw = fs.readFileSync(file, 'utf8');
  assert.equal(raw.includes(token), false, 'the bearer token never leaves the process'); assert.equal(raw.includes('authorization'), false); assert.equal(raw.includes('owner@empathia.invalid'), false);
});

test('OBS-3 every request is a transaction (rate 1): route templates, never the concrete path or the query string; a 500 maps to internal_error, a 404 to not_found, 401 to permission_denied', async () => {
  await api.call('GET', '/v1/rooms?limit=5', { token }); await api.call('GET', '/v1/no-such-thing'); await api.call('GET', '/v1/rooms');
  const tx = (await events()).map((x) => x.event).filter((e) => e.type === 'transaction');
  const boom = tx.find((e) => e.transaction === 'GET /v1/__test/boom'); assert.ok(boom); assert.equal(boom.contexts.trace.status, 'internal_error'); assert.equal(boom.contexts.trace.op, 'http.server'); assert.ok(Date.parse(boom.timestamp) >= Date.parse(boom.start_timestamp));
  const rooms = tx.find((e) => e.transaction === 'GET /v1/rooms' && e.tags.status === '200'); assert.ok(rooms, 'the listing transaction'); assert.equal(JSON.stringify(rooms).includes('limit=5'), false, 'no query string');
  const nf = tx.find((e) => e.tags.status === '404'); assert.ok(nf); assert.equal(nf.contexts.trace.status, 'not_found'); assert.equal(nf.transaction, 'GET (unmatched)');
  const un = tx.find((e) => e.tags.status === '401' && e.transaction === 'GET /v1/rooms'); assert.ok(un); assert.equal(un.contexts.trace.status, 'permission_denied'); assert.equal(un.tags.role, '-');
  const r = await api.call('GET', '/health'); assert.equal(r.body.telemetry.sampledIn, r.body.telemetry.sampledIn | 0); assert.ok(r.body.telemetry.sampledIn >= 4); assert.equal(r.body.telemetry.captured, 1);
});

test('OBS-4 envelopes conform to the wire grammar: a header line with event_id/sent_at/sdk, an item header with the byte length, the payload exactly that long', async () => {
  const all = await events(); assert.ok(all.length >= 4);
  for (const { header, item, event } of all) {
    assert.match(header.event_id, /^[0-9a-f]{32}$/); assert.ok(Date.parse(header.sent_at)); assert.equal(header.sdk.name, 'empathia.observability');
    assert.ok(['event', 'transaction'].includes(item.type)); assert.equal(item.content_type, 'application/json'); assert.equal(item.length, Buffer.byteLength(JSON.stringify(event)));
    assert.equal(event.event_id, header.event_id); assert.equal(event.platform, 'node');
  }
});

test('OBS-5 configuration refuses the unsafe combinations: sentry without a DSN, an http DSN in production, a sampling rate outside 0..1, an unknown mode', async () => {
  const { loadConfig } = await import(path.join(repo, 'services/enterprise-api/dist/src/config.js'));
  const base = { JWT_SECRET: 'x'.repeat(40), APP_DATABASE_URL: 'postgres://a', DATABASE_URL: 'postgres://b', WORKER_DATABASE_URL: 'postgres://c' };
  assert.throws(() => loadConfig(repo, { ...base, TELEMETRY: 'sentry' }), /requires SENTRY_DSN/);
  assert.throws(() => loadConfig(repo, { ...base, NODE_ENV: 'production', AUTH_MODE: 'oidc', OIDC_ISSUER: 'i', OIDC_AUDIENCE: 'a', OIDC_JWKS_URL: 'https://x', TELEMETRY: 'sentry', SENTRY_DSN: 'http://pk@host/1' }), /must be https in production/);
  assert.throws(() => loadConfig(repo, { ...base, TELEMETRY_TRACES_SAMPLE_RATE: '5' }), /between 0 and 1/);
  assert.throws(() => loadConfig(repo, { ...base, TELEMETRY: 'datadog' }), /none, file or sentry/);
  const ok = loadConfig(repo, { ...base, TELEMETRY: 'sentry', SENTRY_DSN: 'https://pk@o1.ingest.sentry.io/1', RELEASE_SHA: 'abcdef1234567890', TELEMETRY_TRACES_SAMPLE_RATE: '0.2' });
  assert.equal(ok.telemetry.mode, 'sentry'); assert.equal(ok.release.sha, 'abcdef1234567890'); assert.equal(ok.telemetry.tracesSampleRate, 0.2);
});
