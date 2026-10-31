import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Telemetry, MemoryTransport, SentryTransport, FileTransport, NullTransport, parseDsn, authHeader, envelope, serialize, parse, scrub, releaseString, frames, telemetryFromEnv, type Envelope } from '../src/index.js';

const release = { name: 'empathia-enterprise-api', version: '0.1.0', sha: '1351dec0123456789abc', environment: 'test' };
const fixed = () => new Date('2026-10-31T12:00:00.000Z');

test('release naming: name@version+sha12 — what a Sentry release is grouped by', () => {
  assert.equal(releaseString(release), 'empathia-enterprise-api@0.1.0+1351dec01234');
});

test('DSN parsing follows the published form and the secret is optional; the envelope URL and auth header are derived, never typed', () => {
  const d = parseDsn('https://abc123@o4509.ingest.us.sentry.io/4510');
  assert.equal(d.publicKey, 'abc123'); assert.equal(d.projectId, '4510'); assert.equal(d.envelopeUrl, 'https://o4509.ingest.us.sentry.io/api/4510/envelope/');
  assert.equal(parseDsn('https://k:s@sentry.example.com/base/1').envelopeUrl, 'https://sentry.example.com/base/api/1/envelope/');
  assert.match(authHeader(d), /^Sentry sentry_version=7, sentry_client=empathia\.observability\/0\.1\.0, sentry_key=abc123$/);
  assert.throws(() => parseDsn('not a dsn'), /scheme:\/\/publicKey@host\/projectId/);
  assert.throws(() => parseDsn('https://k@host/notanumber'));
});

test('envelope serialization conforms to the wire grammar (header line, item header with declared length, payload, newline) and round-trips, including non-ASCII payloads', () => {
  const t = new Telemetry({ release, transport: new MemoryTransport(), now: fixed });
  const ev = { ...(JSON.parse(JSON.stringify({ event_id: 'a'.repeat(32), timestamp: fixed().toISOString(), platform: 'node', level: 'error', release: t.release, environment: 'test', tags: { route: '/v1/rooms/:id' }, sdk: { name: 'x', version: '1' }, message: { formatted: 'façade — ümlaut' } })) as Parameters<typeof envelope>[0]) };
  const e = envelope(ev); const wire = serialize(e);
  const lines = wire.split('\n'); assert.equal(lines.length, 4, 'header, item header, payload, trailing newline'); assert.equal(lines[3], '');
  const h = JSON.parse(lines[0]!); assert.equal(h.event_id, ev.event_id); assert.ok(h.sent_at); assert.equal(h.sdk.name, 'empathia.observability');
  const ih = JSON.parse(lines[1]!); assert.equal(ih.type, 'event'); assert.equal(ih.length, Buffer.byteLength(lines[2]!), 'length is bytes, not characters');
  const back: Envelope = parse(wire); assert.deepEqual(JSON.parse(back.items[0]!.payload), ev);
  assert.throws(() => parse(wire.replace(/\n$/, 'x')), /malformed/);
});

test('scrubbing: tokens, cookies, bodies, e-mails and person ids never leave the process; nested objects and arrays are bounded', () => {
  const s = scrub({ authorization: 'Bearer abc', Cookie: 'x', body: { secret: 1 }, email: 'a@b.co', personId: 'p1', note: 'contact ops@example.com with Bearer eyJhbGciOi.xx', deep: { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } }, list: new Array(100).fill('x') });
  assert.equal(s.authorization, '[redacted]'); assert.equal(s.Cookie, '[redacted]'); assert.equal(s.body, '[redacted]'); assert.equal(s.email, '[redacted]'); assert.equal(s.personId, '[redacted]');
  assert.equal(s.note, 'contact [email] with Bearer [redacted]'); assert.equal(s.list.length, 50);
  assert.equal(JSON.stringify(s.deep).includes('[depth]'), true);
});

test('captureException: the event carries correlation, route, role, tenant and release; frames are files and functions only; extras are scrubbed; the call never throws even when the transport fails', async () => {
  const m = new MemoryTransport(); const t = new Telemetry({ release, transport: m, now: fixed, logger: 'enterprise-api' });
  const err = new Error('boom for a@b.co'); err.name = 'TypeError';
  await t.captureException(err, { correlationId: 'c-1', route: '/v1/rooms/:id', method: 'POST', status: 500, role: 'syseng', tenantId: 't-1', extra: { body: 'never', hint: 'ok' } });
  const ev = m.events[0]!;
  assert.equal(ev.level, 'error'); assert.equal(ev.release, 'empathia-enterprise-api@0.1.0+1351dec01234'); assert.equal(ev.environment, 'test'); assert.equal(ev.logger, 'enterprise-api');
  assert.deepEqual(ev.tags, { correlation_id: 'c-1', route: '/v1/rooms/:id', method: 'POST', status: '500', role: 'syseng', tenant_id: 't-1' });
  assert.equal(ev.transaction, 'POST /v1/rooms/:id');
  assert.equal(ev.exception!.values[0]!.type, 'TypeError'); assert.equal(ev.exception!.values[0]!.value, 'boom for [email]');
  assert.ok(ev.exception!.values[0]!.stacktrace!.frames.length > 0); assert.ok(ev.exception!.values[0]!.stacktrace!.frames.every((f) => typeof f.filename === 'string' && typeof f.function === 'string'));
  assert.deepEqual(ev.extra, { body: '[redacted]', hint: 'ok' });
  const bad = { kind: 'memory' as const, send: async () => { throw new Error('transport down'); }, flush: async () => {} };
  const t2 = new Telemetry({ release, transport: bad }); await t2.captureException(new Error('x')); assert.equal(t2.captured, 1, 'a failing transport is not the application’s problem');
  await t2.captureException('a string, not an Error');
});

test('transactions: route templates (never query strings), sampled by rate, errors always admitted, op/status mapped', async () => {
  const m = new MemoryTransport(); const seq = [0.05, 0.5, 0.95, 0.01]; let i = 0;
  const t = new Telemetry({ release, transport: m, tracesSampleRate: 0.1, random: () => seq[i++ % seq.length]!, now: fixed });
  const base = { route: '/v1/rooms/:id', method: 'GET' as const, startedAt: 1_700_000_000_000, endedAt: 1_700_000_000_120, correlationId: 'c-2' };
  await t.transaction({ ...base, status: 200 }); await t.transaction({ ...base, status: 200 }); await t.transaction({ ...base, status: 200 }); await t.transaction({ ...base, status: 503 });
  assert.equal(t.sampledIn, 2); assert.equal(t.sampledOut, 2);
  const [a, b] = m.events; assert.equal(a!.type, 'transaction'); assert.equal(a!.transaction, 'GET /v1/rooms/:id'); assert.equal(a!.contexts!.trace.op, 'http.server'); assert.equal(a!.contexts!.trace.status, 'ok');
  assert.equal(a!.start_timestamp, '2023-11-14T22:13:20.000Z'); assert.equal(a!.timestamp, '2023-11-14T22:13:20.120Z');
  assert.equal(b!.tags['status'], '503'); assert.equal(b!.contexts!.trace.status, 'internal_error');
  assert.equal(m.envelopes[0]!.items[0]!.headers.type, 'transaction');
  assert.throws(() => new Telemetry({ release, transport: m, tracesSampleRate: 2 }));
});

test('the Sentry transport posts the envelope to the derived endpoint with the auth header, honors 429 Retry-After by dropping, never retries, and reports delivery for /health', async () => {
  const calls: { url: string; init: RequestInit }[] = []; let status = 200; let retryAfter = '';
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => { calls.push({ url: String(url), init: init! }); return new Response('{"id":"x"}', { status, headers: retryAfter ? { 'retry-after': retryAfter } : {} }); }) as typeof fetch;
  const tr = new SentryTransport('https://pk@o1.ingest.sentry.io/77', fetchFn); const t = new Telemetry({ release, transport: tr, now: fixed });
  await t.captureException(new Error('one'));
  assert.equal(calls[0]!.url, 'https://o1.ingest.sentry.io/api/77/envelope/'); const h = calls[0]!.init.headers as Record<string, string>;
  assert.equal(h['content-type'], 'application/x-sentry-envelope'); assert.match(h['x-sentry-auth']!, /sentry_key=pk/); assert.ok(parse(String(calls[0]!.init.body)).items.length === 1);
  assert.equal(tr.sent, 1);
  status = 429; retryAfter = '60'; await t.captureException(new Error('two')); assert.equal(tr.dropped, 1); assert.equal(tr.lastStatus, 429);
  status = 200; retryAfter = ''; await t.captureException(new Error('three')); assert.equal(calls.length, 2, 'paused: nothing is sent until Retry-After passes'); assert.equal(tr.dropped, 2);
  const failing = new SentryTransport('https://pk@o1.ingest.sentry.io/77', (async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch);
  const t3 = new Telemetry({ release, transport: failing }); await t3.captureException(new Error('x')); assert.equal(failing.dropped, 1); assert.equal(failing.lastError, 'ECONNREFUSED');
  assert.deepEqual(Object.keys(t.status()), ['transport', 'release', 'environment', 'tracesSampleRate', 'captured', 'sampledIn', 'sampledOut', 'delivery']);
  assert.equal(JSON.stringify(t.status()).includes('pk'), false, 'the status never exposes the key');
});

test('file transport appends serialized envelopes in order and swallows write failures; the null transport is inert', async () => {
  const written: string[] = []; const f = new FileTransport('/tmp/x.ndjson', async (_f, text) => { written.push(text); });
  const t = new Telemetry({ release, transport: f, now: fixed }); await t.captureMessage('hello'); await t.captureMessage('world'); await t.flush();
  assert.equal(written.length, 2); assert.equal(parse(written[1]!).items[0]!.payload.includes('"formatted":"world"'), true);
  const broken = new FileTransport('/nope', async () => { throw new Error('EACCES'); }); const t2 = new Telemetry({ release, transport: broken }); await t2.captureMessage('x'); await t2.flush();
  const n = new Telemetry({ release, transport: new NullTransport() }); await n.captureException(new Error('x')); assert.equal(n.status().transport, 'none');
});

test('telemetryFromEnv: none by default, sentry when a DSN is set, file needs a path and an appender; bad modes are refused', () => {
  assert.equal(telemetryFromEnv({}, release).status().transport, 'none');
  assert.equal(telemetryFromEnv({ SENTRY_DSN: 'https://pk@o1.ingest.sentry.io/1', TELEMETRY_TRACES_SAMPLE_RATE: '0.25' }, release).status().tracesSampleRate, 0.25);
  assert.equal(telemetryFromEnv({ SENTRY_DSN: 'https://pk@o1.ingest.sentry.io/1' }, release).status().transport, 'sentry');
  assert.throws(() => telemetryFromEnv({ TELEMETRY: 'sentry' }, release), /requires SENTRY_DSN/);
  assert.throws(() => telemetryFromEnv({ TELEMETRY: 'file' }, release), /TELEMETRY_FILE/);
  assert.equal(telemetryFromEnv({ TELEMETRY: 'file', TELEMETRY_FILE: '/tmp/t.ndjson' }, release, { append: async () => {} }).status().transport, 'file');
  assert.throws(() => telemetryFromEnv({ TELEMETRY: 'datadog' }, release), /none, file or sentry/);
});

test('frames: V8 stacks become filename/function/line/col frames, innermost last, node internals marked out of app', () => {
  const fr = frames('Error: x\n    at handler (file:///repo/services/api/dist/src/http/server.js:106:12)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)');
  assert.equal(fr.length, 2); assert.equal(fr[1]!.function, 'handler'); assert.equal(fr[1]!.filename, '/repo/services/api/dist/src/http/server.js'); assert.equal(fr[1]!.lineno, 106); assert.equal(fr[1]!.in_app, true); assert.equal(fr[0]!.in_app, false);
  assert.deepEqual(frames(undefined), []);
});
