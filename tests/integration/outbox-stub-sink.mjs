/**
 * LOCAL STUB SINK — a test-only stand-in for an effect outside the database (a Microsoft Teams / Outlook message, a connector event).
 *
 * No real Teams, Outlook or connector adapter exists in this repository, and nothing here calls one. This module proves only that the
 * outbox worker hands an external consumer what it needs to deduplicate (an idempotency key derived from the event id) and never
 * calls it inside a database transaction. Idempotency of a real connector is NOT RUN until a real adapter exists and is tested
 * against the vendor's sandbox.
 *
 *   startLocalStubSink({ port, inspect })   the receiving side: an HTTP server on 127.0.0.1 that applies one effect per
 *                                           Idempotency-Key and records every call (duplicates included)
 *   localStubSinkAdapter({ url, ... })      the sending side: an ExternalSink (services/enterprise-api/src/worker/outbox.ts)
 */
import http from 'node:http';

export const STUB_LABEL = 'local stub sink';

export async function startLocalStubSink({ port, inspect } = {}) {
  const calls = []; const effects = new Map();
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      void (async () => {
        const key = req.headers['idempotency-key'] ? String(req.headers['idempotency-key']) : null;
        let body = null; try { body = JSON.parse(raw); } catch { /* recorded as null */ }
        const call = { n: calls.length + 1, key, workerApplication: String(req.headers['x-worker-application'] || ''), body };
        if (inspect) Object.assign(call, await inspect(call));
        calls.push(call);
        if (!key) { res.writeHead(400, { 'content-type': 'text/plain' }).end('Idempotency-Key is required'); return; }
        const duplicate = effects.has(key);
        if (!duplicate) effects.set(key, body);                  // the effect: applied once per key, whatever the number of calls
        res.writeHead(duplicate ? 200 : 201, { 'content-type': 'application/json' }).end(JSON.stringify({ label: STUB_LABEL, duplicate }));
      })().catch((e) => { res.writeHead(500, { 'content-type': 'text/plain' }).end(String(e?.message || e)); });
    });
  });
  await new Promise((ok, bad) => { server.once('error', bad); server.listen(port, '127.0.0.1', ok); });
  return {
    label: STUB_LABEL, url: `http://127.0.0.1:${port}/deliver`, calls, effects,
    reset() { calls.length = 0; effects.clear(); },
    close: () => new Promise((ok) => { server.closeAllConnections?.(); server.close(() => ok()); }),
  };
}

/** An ExternalSink that POSTs one event to the local stub sink with the worker's idempotency key. */
export function localStubSinkAdapter({ url, workerApplication, name = 'local-stub-sink', accepts } = {}) {
  return {
    name,
    ...(accepts ? { accepts } : {}),
    async deliver(e, idempotencyKey, signal) {
      const r = await fetch(url, {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey, 'x-worker-application': workerApplication },
        body: JSON.stringify({ label: STUB_LABEL, eventId: e.id, tenantId: e.tenant_id, type: e.type, aggregate: { type: e.aggregate_type, id: e.aggregate_id, rev: e.aggregate_rev }, payload: e.payload }),
      });
      await r.text();
      if (r.status >= 300) throw new Error(`${STUB_LABEL} answered ${r.status}`);
    },
  };
}
